import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { JobForm, emptyJob } from "@/components/admin/JobForm";
import { SendTestEmailButton } from "@/components/admin/SendTestEmailButton";
import { useCreateJob, useJob, useUpdateJob } from "@/hooks/useAdminJobs";
import { friendlyDbError } from "@/lib/labels";
import type { JobFormInput, JobFormValues } from "@/lib/schemas/job";

export default function AdminJobEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(id);
  const create = useCreateJob();
  const update = useUpdateJob(id ?? "");

  const defaults = useMemo<JobFormInput>(
    () =>
      job
        ? {
            title: job.title,
            department: job.department,
            location: job.location,
            employment_type: job.employment_type,
            work_mode: job.work_mode,
            summary: job.summary,
            description: job.description,
            requirements: job.requirements,
            salary_range: job.salary_range ?? "",
            application_email: job.application_email ?? "",
            custom_questions: job.custom_questions ?? [],
            status: job.status,
            closing_date: job.closing_date ?? "",
          }
        : emptyJob,
    [job],
  );

  const onSubmit = async (v: JobFormValues) => {
    try {
      if (id) await update.mutateAsync(v);
      else await create.mutateAsync(v);
      toast.success("Job saved");
      return true;
    } catch (e) {
      toast.error(friendlyDbError(e as never));
      return false;
    }
  };
  const onSaved = useCallback(() => navigate("/admin"), [navigate]);

  if (id && isLoading) return <p role="status">Loading…</p>;
  if (id && (error || !job)) return <p role="alert" className="text-destructive">Job not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{id ? "Edit job" : "New job"}</h1>
      <JobForm
        defaultValues={defaults}
        slug={job?.slug}
        saving={create.isPending || update.isPending}
        onSubmit={onSubmit}
        onSaved={onSaved}
        extraActions={id ? <SendTestEmailButton jobId={id} /> : null}
      />
    </div>
  );
}
