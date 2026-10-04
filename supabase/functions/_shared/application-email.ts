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

  const html = `<p>${i.resent ? "<strong>[Resent]</strong> " : ""}New application for <strong>${escapeHtml(i.jobTitle)}</strong>.</p>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      ${rows.map(([k, v]) => `<tr><th align="left">${escapeHtml(k)}</th><td>${br(v)}</td></tr>`).join("")}
    </table>
    ${i.coverLetter ? `<h4>Cover letter</h4><p>${br(i.coverLetter)}</p>` : ""}
    ${i.hasResume ? "<p>CV attached.</p>" : "<p>No CV attached.</p>"}`;
  const text =
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (i.coverLetter ? `\n\nCover letter:\n${i.coverLetter}` : "");

  return {
    subject: oneLine(`${i.resent ? "[RESENT] " : ""}New application: ${i.jobTitle} – ${i.name}`),
    html,
    text,
  };
}
