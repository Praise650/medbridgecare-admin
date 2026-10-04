import { Fragment, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Application, CustomQuestion } from "@/integrations/supabase/types";
import { getResumeUrl, useResendApplication } from "@/hooks/useApplications";

type Props = { applications: Application[]; questionsByJob: Map<string, CustomQuestion[]> };

export function ApplicationsTable({ applications, questionsByJob }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const resend = useResendApplication();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const onResend = (a: Application) => {
    setResendingId(a.id);
    resend.mutate(a.id, {
      onSuccess: (r) => toast.success(`Email sent to ${r.sentTo}`),
      onError: (e) => toast.error(e.message),
      onSettled: () => setResendingId(null),
    });
  };

  const onOpenResume = async (path: string) => {
    try {
      window.open(await getResumeUrl(path), "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't open the CV");
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th scope="col" className="w-10 px-4 py-3">
              <span className="sr-only">Details</span>
            </th>
            {["Applicant", "Job", "Submitted", "Email"].map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => {
            const open = openId === a.id;
            const labels = new Map((a.job_id ? questionsByJob.get(a.job_id) ?? [] : []).map((q) => [q.id, q.label]));
            const answers = Object.entries(a.answers ?? {});
            return (
              <Fragment key={a.id}>
                <tr className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-expanded={open}
                      aria-label={`${open ? "Hide" : "Show"} details for ${a.applicant_name}`}
                      onClick={() => setOpenId(open ? null : a.id)}
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </td>
                  <th scope="row" className="px-4 py-3 font-medium">
                    {a.applicant_name}
                    <div className="font-normal text-muted-foreground">{a.applicant_email}</div>
                  </th>
                  <td className="px-4 py-3">{a.job_title}</td>
                  <td className="px-4 py-3">{new Date(a.submitted_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.email_status === "sent" ? "success" : "danger"}>
                      {a.email_status === "sent" ? "Sent" : "Failed"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {a.resume_path && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Open CV for ${a.applicant_name}`}
                          onClick={() => onOpenResume(a.resume_path!)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant={a.email_status === "failed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => onResend(a)}
                        disabled={!a.payload_stored || resendingId === a.id}
                        title={a.payload_stored ? undefined : "Details were not stored, so this can't be resent"}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden /> {resendingId === a.id ? "Sending…" : "Resend"}
                      </Button>
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="border-b bg-muted/30 last:border-0">
                    <td />
                    <td colSpan={5} className="space-y-3 px-4 py-4">
                      {a.email_status === "failed" && a.email_error && (
                        <p className="text-destructive">Delivery error: {a.email_error}</p>
                      )}
                      {!a.payload_stored ? (
                        <p className="text-muted-foreground">Only the basic details were logged for this application.</p>
                      ) : (
                        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
                          {a.phone && (
                            <>
                              <dt className="font-medium">Phone</dt>
                              <dd>{a.phone}</dd>
                            </>
                          )}
                          {answers.map(([id, v]) => (
                            <Fragment key={id}>
                              <dt className="font-medium">{labels.get(id) ?? id}</dt>
                              <dd className="whitespace-pre-wrap break-words">{v}</dd>
                            </Fragment>
                          ))}
                          {a.cover_letter && (
                            <>
                              <dt className="font-medium">Cover letter</dt>
                              <dd className="whitespace-pre-wrap break-words">{a.cover_letter}</dd>
                            </>
                          )}
                          {!a.phone && !answers.length && !a.cover_letter && (
                            <dd className="text-muted-foreground sm:col-span-2">No additional details.</dd>
                          )}
                        </dl>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
