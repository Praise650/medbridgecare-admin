import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobOverview } from "@/integrations/supabase/types";
import { useDeleteJob, useToggleStatus } from "@/hooks/useAdminJobs";
import { friendlyDbError, isPast, statusLabels } from "@/lib/labels";
import { DeleteJobDialog } from "./DeleteJobDialog";

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_SITE_URL ?? "";
const statusTone = { open: "success", draft: "neutral", closed: "warning" } as const;

export function JobsTable({ jobs }: { jobs: JobOverview[] }) {
  const toggle = useToggleStatus();
  const del = useDeleteJob();
  const [toDelete, setToDelete] = useState<JobOverview | null>(null);

  const onToggle = (job: JobOverview) => {
    const next = job.status === "open" ? "closed" : "open";
    if (next === "open" && isPast(job.closing_date)) {
      toast.error("Closing date has passed. Edit the job to change the date before opening it.");
      return;
    }
    toggle.mutate(
      { id: job.id, status: next },
      {
        onSuccess: () => toast.success(`Job ${next === "open" ? "opened" : "closed"}`),
        onError: (e) => toast.error(friendlyDbError(e as never)),
      },
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {["Title", "Status", "Application email", "Closing date", "Applications", "Updated"].map((h) => (
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
            {jobs.map((j) => (
              <tr key={j.id} className="border-b last:border-0">
                <th scope="row" className="px-4 py-3 font-medium">
                  {j.title}
                </th>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[j.status]}>{statusLabels[j.status]}</Badge>
                </td>
                <td className="px-4 py-3">{j.application_email ?? <span className="text-muted-foreground">Default</span>}</td>
                <td className="px-4 py-3">
                  {j.closing_date ?? "—"}
                  {isPast(j.closing_date) && (
                    <Badge tone="danger" className="ml-2">
                      Expired
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/admin/applications?job=${j.id}`} className="underline-offset-2 hover:underline">
                    {j.application_count}
                  </Link>
                  {j.failed_count > 0 && <span className="ml-2 text-destructive">({j.failed_count} failed)</span>}
                </td>
                <td className="px-4 py-3">{new Date(j.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label={`Edit ${j.title}`}>
                      <Link to={`/admin/jobs/${j.id}/edit`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onToggle(j)} disabled={toggle.isPending}>
                      {j.status === "open" ? "Close" : "Open"}
                    </Button>
                    {j.status === "open" && (
                      <Button asChild variant="ghost" size="icon" aria-label={`View ${j.title} (opens in new tab)`}>
                        <a href={`${PUBLIC_BASE}/jobs/${j.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={`Delete ${j.title}`} onClick={() => setToDelete(j)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteJobDialog
        title={toDelete?.title ?? ""}
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        onConfirm={() =>
          toDelete &&
          del.mutate(toDelete.id, {
            onSuccess: () => toast.success("Job deleted"),
            onError: (e) => toast.error(friendlyDbError(e as never)),
          })
        }
      />
    </>
  );
}
