import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobsTable } from "@/components/admin/JobsTable";
import { useJobList } from "@/hooks/useAdminJobs";

export default function AdminDashboard() {
  const { data, isLoading, error } = useJobList();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Button asChild>
          <Link to="/admin/jobs/new">
            <Plus className="h-4 w-4" aria-hidden /> New job
          </Link>
        </Button>
      </div>
      {isLoading && <p role="status">Loading…</p>}
      {error && <p role="alert" className="text-destructive">Couldn’t load jobs.</p>}
      {data && data.length === 0 && (
        <div className="rounded-lg border bg-background p-10 text-center">
          <p className="mb-4 text-muted-foreground">No jobs yet</p>
          <Button asChild>
            <Link to="/admin/jobs/new">Create your first job</Link>
          </Button>
        </div>
      )}
      {data && data.length > 0 && <JobsTable jobs={data} />}
    </div>
  );
}
