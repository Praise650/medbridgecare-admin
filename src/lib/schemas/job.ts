import { z } from "zod";

export const customQuestionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,40}$/, "Use lowercase letters, numbers, - or _"),
    label: z.string().trim().min(1, "Label is required").max(200),
    type: z.enum(["text", "textarea", "select", "url"]),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "select" && (!q.options || q.options.length < 1)) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least one option" });
    }
  });

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    department: z.string().trim().min(1).max(100),
    location: z.string().trim().min(1).max(100),
    employment_type: z.enum(["full_time", "part_time", "contract", "internship"]),
    work_mode: z.enum(["onsite", "remote", "hybrid"]),
    summary: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(20000),
    requirements: z.string().trim().max(20000).default(""),
    salary_range: z.string().trim().max(100).optional().or(z.literal("")),
    application_email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    custom_questions: z.array(customQuestionSchema).max(15),
    status: z.enum(["draft", "open", "closed"]),
    closing_date: z.string().date().optional().or(z.literal("")),
  })
  .superRefine((job, ctx) => {
    const ids = job.custom_questions.map((q) => q.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", path: ["custom_questions"], message: "Question IDs must be unique" });
    }
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

// Convert empty strings to null before sending to Supabase
export const toJobRow = (v: JobFormValues) => ({
  ...v,
  salary_range: v.salary_range || null,
  application_email: v.application_email || null,
  closing_date: v.closing_date || null,
});

// Form input type (before defaults/transforms are applied)
export type JobFormInput = z.input<typeof jobFormSchema>;
