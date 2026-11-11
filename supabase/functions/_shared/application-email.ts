import { escapeHtml } from "./email.ts";

export type Question = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "url";
  required: boolean;
  options?: string[];
};

type Input = {
  jobTitle: string;
  name: string;
  email: string;
  phone: string | null;
  coverLetter: string | null;
  answers: Record<string, string>;
  questions: Question[];
  hasResume: boolean;
  resent?: boolean;
  test?: boolean;
};

export const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ");

// Builds the HR notification. Shared by submit-application and resend-application.
export function buildApplicationEmail(i: Input) {
  const labels = new Map(i.questions.map((q) => [q.id, q.label]));
  const rows: [string, string][] = [
    ["Name", i.name],
    ["Email", i.email],
    ...(i.phone ? ([["Phone", i.phone]] as [string, string][]) : []),
    // Answers whose question was later removed from the job fall back to the raw id
    ...Object.entries(i.answers).map(([id, v]): [string, string] => [labels.get(id) ?? id, v]),
  ];
  const br = (s: string) => escapeHtml(s).replace(/\n/g, "<br>");
  const font = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const brand = "#0f766e";

  const value = (k: string, v: string) => {
    const safe = br(v);
    if (k === "Email") return `<a href="mailto:${escapeHtml(v)}" style="color:${brand};text-decoration:none">${safe}</a>`;
    if (k === "Phone") return `<a href="tel:${escapeHtml(v.replace(/[^\d+]/g, ""))}" style="color:${brand};text-decoration:none">${safe}</a>`;
    return safe;
  };

  const tag = i.resent ? "Resent" : i.test ? "Test" : "";
  const detailRows = rows
    .map(
      ([k, v], idx) => `<tr>
        <td style="padding:12px 16px;width:35%;vertical-align:top;font:600 13px ${font};color:#64748b;background:#f8fafc;${idx ? "border-top:1px solid #e2e8f0;" : ""}">${escapeHtml(k)}</td>
        <td style="padding:12px 16px;vertical-align:top;font:14px/1.5 ${font};color:#0f172a;${idx ? "border-top:1px solid #e2e8f0;" : ""}">${value(k, v)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f1f5f9">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">New application from ${escapeHtml(i.name)} for ${escapeHtml(i.jobTitle)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:${brand};padding:24px 32px">
          <span style="font:700 20px ${font};color:#ffffff;letter-spacing:.3px">MedBridge</span>
          ${tag ? `<span style="float:right;font:600 11px ${font};color:${brand};background:#ccfbf1;border-radius:999px;padding:4px 10px;text-transform:uppercase;letter-spacing:.6px">${tag}</span>` : ""}
        </td></tr>
        <tr><td style="padding:32px 32px 8px">
          <p style="margin:0 0 6px;font:600 12px ${font};color:${brand};text-transform:uppercase;letter-spacing:1px">New application</p>
          <h1 style="margin:0 0 8px;font:700 22px/1.3 ${font};color:#0f172a">${escapeHtml(i.jobTitle)}</h1>
          <p style="margin:0;font:14px/1.6 ${font};color:#475569"><strong style="color:#0f172a">${escapeHtml(i.name)}</strong> has applied for this position. Details are below.</p>
        </td></tr>
        <tr><td style="padding:20px 32px 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;border-collapse:separate;overflow:hidden">
            ${detailRows}
          </table>
        </td></tr>
        ${
          i.coverLetter
            ? `<tr><td style="padding:20px 32px 8px">
          <p style="margin:0 0 8px;font:600 13px ${font};color:#64748b;text-transform:uppercase;letter-spacing:.6px">Cover letter</p>
          <div style="border-left:3px solid ${brand};background:#f8fafc;padding:14px 18px;font:14px/1.7 ${font};color:#1e293b">${br(i.coverLetter)}</div>
        </td></tr>`
            : ""
        }
        <tr><td style="padding:20px 32px 32px">
          <div style="border-radius:8px;padding:12px 16px;font:600 13px ${font};${i.hasResume ? "background:#ecfdf5;color:#047857" : "background:#fef2f2;color:#b91c1c"}">
            ${i.hasResume ? "&#128206; CV attached to this email" : "No CV attached"}
          </div>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;font:12px/1.6 ${font};color:#94a3b8">
          Reply to this email to contact the applicant directly.<br>Sent automatically by MedBridge careers.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text =
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (i.coverLetter ? `\n\nCover letter:\n${i.coverLetter}` : "");

  return {
    subject: oneLine(`${i.resent ? "[RESENT] " : ""}New application: ${i.jobTitle} – ${i.name}`),
    html,
    text,
  };
}
