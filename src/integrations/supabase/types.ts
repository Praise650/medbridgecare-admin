// Hand-written to match supabase/migrations. Regenerate with `supabase gen types typescript` when possible.
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";
export type WorkMode = "onsite" | "remote" | "hybrid";
export type JobStatus = "draft" | "open" | "closed";

export type CustomQuestion = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "url";
  required: boolean;
  options?: string[];
};

export type Job = {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  work_mode: WorkMode;
  summary: string;
  description: string;
  requirements: string;
  salary_range: string | null;
  application_email: string | null;
  custom_questions: CustomQuestion[];
  status: JobStatus;
  closing_date: string | null;
  created_at: string;
  updated_at: string;
};

export type JobOverview = {
  id: string;
  slug: string;
  title: string;
  status: JobStatus;
  application_email: string | null;
  closing_date: string | null;
  updated_at: string;
  application_count: number;
  failed_count: number;
};
