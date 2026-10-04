import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { sendEmail } from "../_shared/email.ts";
import { buildApplicationEmail, oneLine, type Question } from "../_shared/application-email.ts";

// Admin-only: re-sends the HR notification for a stored application.

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN");
if (!allowedOrigin) console.warn("ALLOWED_ORIGIN is not set: browser calls will be blocked by CORS");

const RATE_LIMIT = 10; // resends per admin per minute
const ACTION = "resend_application";
const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const cors = {
  "Access-Control-Allow-Origin": allowedOrigin ?? "",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Caller-scoped client => RLS + is_admin() apply to every read below
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || !isAdmin) return json({ error: "Unauthorized" }, 401);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("admin_audit_log").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("action", ACTION).gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT) return json({ error: "Too many resends, try again in a minute" }, 429);

  const { applicationId } = await req.json().catch(() => ({}));
  if (typeof applicationId !== "string") return json({ error: "applicationId required" }, 400);

  const { data: app } = await supabase.from("applications").select("*").eq("id", applicationId).maybeSingle();
  if (!app) return json({ error: "Application not found" }, 404);
  if (!app.payload_stored) return json({ error: "This application's details were not stored, so it can't be resent" }, 409);

  const { data: job } = app.job_id
    ? await supabase.from("jobs").select("application_email, custom_questions").eq("id", app.job_id).maybeSingle()
    : { data: null };

  const { error: auditErr } = await supabase
    .from("admin_audit_log").insert({ user_id: userId, action: ACTION, target_id: app.id });
  if (auditErr) { console.error(auditErr); return json({ error: "Audit log unavailable" }, 500); }

  // CV (admin read policy on the private bucket)
  let attachments: { filename: string; content: string }[] | undefined;
  if (app.resume_path) {
    const { data: blob, error: dlErr } = await supabase.storage.from("resumes").download(app.resume_path);
    if (dlErr || !blob) { console.error(dlErr); return json({ error: "Could not load the CV from storage" }, 502); }
    const ext = EXT[blob.type] ?? app.resume_path.split(".").pop() ?? "pdf";
    attachments = [{
      filename: oneLine(`${app.applicant_name} - CV.${ext}`),
      content: encodeBase64(new Uint8Array(await blob.arrayBuffer())),
    }];
  }

  const to = job?.application_email || Deno.env.get("DEFAULT_APPLICATION_EMAIL")!;
  const { subject, html, text } = buildApplicationEmail({
    jobTitle: app.job_title,
    name: app.applicant_name,
    email: app.applicant_email,
    phone: app.phone,
    coverLetter: app.cover_letter,
    answers: app.answers ?? {},
    questions: (job?.custom_questions ?? []) as Question[],
    hasResume: !!attachments,
    resent: true,
  });

  // applications has no client UPDATE grant, so the status change uses the service role
  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    await sendEmail({ to, subject, html, text, replyTo: app.applicant_email, attachments });
  } catch (e) {
    console.error(e);
    await service.from("applications")
      .update({ email_status: "failed", email_error: e instanceof Error ? e.message.slice(0, 500) : "Unknown error" })
      .eq("id", app.id);
    return json({ error: "Email failed to send" }, 502);
  }

  await service.from("applications").update({ email_status: "sent", email_error: null }).eq("id", app.id);
  return json({ ok: true, sentTo: to });
});
