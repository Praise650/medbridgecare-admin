import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { sendEmail, escapeHtml } from "../_shared/email.ts";
import { buildApplicationEmail, oneLine, type Question } from "../_shared/application-email.ts";

// Public endpoint (verify_jwt = false). Called by the public job board with multipart/form-data:
//   jobId, name, email, phone?, coverLetter?, answers (JSON {questionId: value}), resume? (file), website (honeypot)

// Comma-separated list, e.g. "https://example.com,https://www.example.com"
const publicOrigins = (Deno.env.get("PUBLIC_SITE_ORIGIN") ?? "").split(",").map((o) => o.trim()).filter(Boolean);
if (!publicOrigins.length) console.warn("PUBLIC_SITE_ORIGIN is not set: browser calls will be blocked by CORS");

// Stores answers + CV unless explicitly "false". Counts/status are always recorded.
const STORE_PAYLOAD = Deno.env.get("STORE_APPLICATIONS") !== "false";
const SEND_CONFIRMATION = Deno.env.get("SEND_APPLICANT_CONFIRMATION") === "true";

const MAX_BODY = 6 * 1024 * 1024;
const MAX_RESUME = 5 * 1024 * 1024;
const RESUME_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const cors = {
  "Access-Control-Allow-Origin": publicOrigins[0] ?? "",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validateAnswers(questions: Question[], raw: unknown): { answers: Record<string, string>; error?: string } {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const answers: Record<string, string> = {};
  for (const q of questions) {
    const v = typeof input[q.id] === "string" ? (input[q.id] as string).trim() : "";
    if (!v) {
      if (q.required) return { answers, error: `"${q.label}" is required` };
      continue;
    }
    if (v.length > (q.type === "textarea" ? 5000 : 500)) return { answers, error: `"${q.label}" is too long` };
    if (q.type === "select" && !q.options?.includes(v)) return { answers, error: `Invalid choice for "${q.label}"` };
    if (q.type === "url") {
      try {
        const u = new URL(v);
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      } catch {
        return { answers, error: `"${q.label}" must be a valid URL` };
      }
    }
    answers[q.id] = v; // unknown keys from the client are dropped
  }
  return { answers };
}

// Echo back the caller's origin when it is on the allow-list (per response, so concurrent requests can't mix).
Deno.serve(async (req) => {
  const res = await handle(req);
  const origin = req.headers.get("origin");
  if (origin && publicOrigins.includes(origin)) res.headers.set("Access-Control-Allow-Origin", origin);
  return res;
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const len = Number(req.headers.get("content-length") ?? "0");
  if (!len || len > MAX_BODY) return json({ error: "Request too large" }, 413);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: "Invalid form data" }, 400);

  // Honeypot: bots fill the hidden field. Pretend success.
  if (str(form.get("website"))) return json({ ok: true });

  const jobId = str(form.get("jobId"));
  const name = str(form.get("name"));
  const email = str(form.get("email")).toLowerCase();
  const phone = str(form.get("phone")) || null;
  const coverLetter = str(form.get("coverLetter")) || null;

  if (!/^[0-9a-f-]{36}$/i.test(jobId)) return json({ error: "Invalid job" }, 400);
  if (name.length < 2 || name.length > 150) return json({ error: "Name is required" }, 400);
  if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "Valid email is required" }, 400);
  if (phone && phone.length > 40) return json({ error: "Phone is too long" }, 400);
  if (coverLetter && coverLetter.length > 5000) return json({ error: "Cover letter is too long" }, 400);

  let rawAnswers: unknown = {};
  try {
    rawAnswers = JSON.parse(str(form.get("answers")) || "{}");
  } catch {
    return json({ error: "Invalid answers" }, 400);
  }

  const resume = form.get("resume");
  let resumeFile: File | null = null;
  if (resume instanceof File && resume.size > 0) {
    if (resume.size > MAX_RESUME) return json({ error: "Resume must be 5 MB or smaller" }, 400);
    if (!RESUME_TYPES[resume.type]) return json({ error: "Resume must be a PDF or Word document" }, 400);
    resumeFile = resume;
  }

  // Service role: bypasses RLS. Only ever used after the validation above.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .select("id, title, application_email, custom_questions, status, closing_date")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr) {
    console.error("job lookup failed", jobErr);
    return json({ error: "Could not submit your application. Please try again." }, 500);
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!job || job.status !== "open" || (job.closing_date && job.closing_date < today)) {
    return json({ error: "This position is no longer accepting applications", code: "job_closed" }, 404);
  }

  const { answers, error: answerErr } = validateAnswers(job.custom_questions as Question[], rawAnswers);
  if (answerErr) return json({ error: answerErr }, 400);

  // Duplicate / spam guard: one application per email per job per 24h
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("applications").select("id", { count: "exact", head: true })
    .eq("job_id", job.id).ilike("applicant_email", email).gte("submitted_at", since);
  if ((count ?? 0) > 0) return json({ error: "You have already applied for this position" }, 409);

  // 1. Store first, as 'failed', so the application survives any later failure.
  const applicationId = crypto.randomUUID();
  let resumePath: string | null = null;
  const resumeBytes = resumeFile ? new Uint8Array(await resumeFile.arrayBuffer()) : null;

  if (STORE_PAYLOAD && resumeFile && resumeBytes) {
    const path = `${job.id}/${applicationId}.${RESUME_TYPES[resumeFile.type]}`;
    const { error: upErr } = await admin.storage.from("resumes").upload(path, resumeBytes, { contentType: resumeFile.type });
    if (upErr) console.error("resume upload failed", upErr);
    else resumePath = path;
  }

  const { error: insErr } = await admin.from("applications").insert({
    id: applicationId,
    job_id: job.id,
    job_title: job.title,
    applicant_name: name,
    applicant_email: email,
    phone: STORE_PAYLOAD ? phone : null,
    cover_letter: STORE_PAYLOAD ? coverLetter : null,
    answers: STORE_PAYLOAD ? answers : {},
    resume_path: resumePath,
    payload_stored: STORE_PAYLOAD,
    email_status: "failed",
  });
  if (insErr) {
    console.error("insert failed", insErr);
    return json({ error: "Could not submit your application. Please try again." }, 500);
  }

  // 2. Email HR
  const to = job.application_email || Deno.env.get("DEFAULT_APPLICATION_EMAIL")!;
  const { subject, html, text } = buildApplicationEmail({
    jobTitle: job.title,
    name,
    email,
    phone,
    coverLetter,
    answers,
    questions: job.custom_questions as Question[],
    hasResume: !!resumeFile,
  });

  let emailed = false;
  let emailError: string | null = null;
  try {
    await sendEmail({
      to,
      subject,
      html,
      text,
      replyTo: email,
      attachments:
        resumeFile && resumeBytes
          ? [{ filename: oneLine(`${name} - CV.${RESUME_TYPES[resumeFile.type]}`), content: encodeBase64(resumeBytes) }]
          : undefined,
    });
    emailed = true;
  } catch (e) {
    console.error("email failed", e);
    emailError = e instanceof Error ? e.message.slice(0, 500) : "Unknown error";
  }

  // 3. Optional confirmation to the applicant (failure here never fails the submission)
  let confirmed = false;
  if (emailed && SEND_CONFIRMATION) {
    try {
      await sendEmail({
        to: email,
        subject: oneLine(`We received your application for ${job.title}`),
        text: `Hi ${name},\n\nThanks for applying for ${job.title}. We have received your application and will be in touch.`,
        html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for applying for <strong>${escapeHtml(job.title)}</strong>. We have received your application and will be in touch.</p>`,
      });
      confirmed = true;
    } catch (e) {
      console.error("confirmation failed", e);
    }
  }

  await admin
    .from("applications")
    .update({
      email_status: emailed ? "sent" : "failed",
      email_error: emailError,
      confirmation_sent: confirmed,
    })
    .eq("id", applicationId);

  // The applicant sees success whenever the application is stored. HR can retry failed emails.
  if (!emailed && !STORE_PAYLOAD) return json({ error: "Could not submit your application. Please try again." }, 502);
  return json({ ok: true });
}
