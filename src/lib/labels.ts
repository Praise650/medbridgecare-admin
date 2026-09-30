import type { EmploymentType, JobStatus, WorkMode } from "@/integrations/supabase/types";

export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};
export const workModeLabels: Record<WorkMode, string> = { onsite: "On-site", remote: "Remote", hybrid: "Hybrid" };
export const statusLabels: Record<JobStatus, string> = { draft: "Draft", open: "Open", closed: "Closed" };

export const isPast = (date: string | null) => !!date && date < new Date().toISOString().slice(0, 10);

export const friendlyDbError = (e: { code?: string; message?: string } | null) => {
  if (!e) return "Something went wrong";
  if (e.code === "23514") return "One of the fields is out of the allowed range. Please check your inputs.";
  if (e.code === "23505") return "A job with that slug already exists.";
  if (e.code === "42501") return "You don't have permission to do that.";
  return "Something went wrong. Please try again.";
};
