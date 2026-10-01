import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail, escapeHtml } from "../_shared/email.ts";

const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN");
if (!allowedOrigin) console.warn("ALLOWED_ORIGIN is not set: browser calls will be blocked by CORS");

const RATE_LIMIT = 5; // test emails per admin per minute
const ACTION = "send_test_email";

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

  // Client scoped to the caller's JWT => RLS + is_admin() apply
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin");
  if (adminErr || !isAdmin) return json({ error: "Unauthorized" }, 401);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("admin_audit_log").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("action", ACTION).gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT) return json({ error: "Too many test emails, try again in a minute" }, 429);

  const { jobId } = await req.json().catch(() => ({}));
  if (typeof jobId !== "string") return json({ error: "jobId required" }, 400);

  const { data: job, error } = await supabase
    .from("jobs").select("id, title, application_email").eq("id", jobId).single();
  if (error || !job) return json({ error: "Job not found" }, 404);

  const { error: auditErr } = await supabase
    .from("admin_audit_log").insert({ user_id: userId, action: ACTION, target_id: job.id });
  if (auditErr) { console.error(auditErr); return json({ error: "Audit log unavailable" }, 500); }

  const to = job.application_email || Deno.env.get("DEFAULT_APPLICATION_EMAIL")!;
  const title = escapeHtml(job.title);

  try {
    await sendEmail({
      to,
      subject: `[TEST] New application: ${job.title} – Jane Doe`,
      text: `This is a test application for "${job.title}". If you received this, delivery works.`,
      html: `<p>This is a <strong>test</strong> application for <strong>${title}</strong>.</p>
             <table border="1" cellpadding="6" style="border-collapse:collapse">
               <tr><th align="left">Name</th><td>Jane Doe</td></tr>
               <tr><th align="left">Email</th><td>jane@example.com</td></tr>
             </table>`,
      replyTo: "jane@example.com",
    });
    return json({ ok: true, sentTo: to });
  } catch (e) {
    console.error(e);
    return json({ error: "Email failed to send" }, 502);
  }
});
