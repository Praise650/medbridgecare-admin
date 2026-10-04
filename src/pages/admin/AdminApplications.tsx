import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ApplicationsTable } from "@/components/admin/ApplicationsTable";
import { useApplications } from "@/hooks/useApplications";
import { useJobList } from "@/hooks/useAdminJobs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { CustomQuestion } from "@/integrations/supabase/types";

export default function AdminApplications() {
  const [params, setParams] = useSearchParams();
  const jobId = params.get("job");
  const { data, isLoading, error } = useApplications(jobId);
  const { data: jobs } = useJobList();

  // Question labels for the answers shown in each row's detail panel
  const { data: questions } = useQuery({
    queryKey: ["admin-job-questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("id, custom_questions");
      if (error) throw error;
      return data as { id: string; custom_questions: CustomQuestion[] }[];
    },
  });
  const questionsByJob = useMemo(() => new Map((questions ?? []).map((j) => [j.id, j.custom_questions])), [questions]);

  const failed = data?.filter((a) => a.email_status === "failed").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Job</span>
          <select
            className="h-9 rounded-md border bg-background px-3"
            value={jobId ?? ""}
            onChange={(e) => setParams(e.target.value ? { job: e.target.value } : {})}
          >
            <option value="">All jobs</option>
            {jobs?.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {failed > 0 && (
        <p role="status" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
          {failed} application{failed === 1 ? "" : "s"} failed to email. Use Resend on those rows.
        </p>
      )}
      {isLoading && <p role="status">Loading…</p>}
      {error && <p role="alert" className="text-destructive">Couldn’t load applications.</p>}
      {data && data.length === 0 && (
        <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground">No applications yet</div>
      )}
      {data && data.length > 0 && <ApplicationsTable applications={data} questionsByJob={questionsByJob} />}
      {data && data.length >= 200 && (
        <p className="text-sm text-muted-foreground">Showing the 200 most recent. Filter by job to narrow down.</p>
      )}
    </div>
  );
}
