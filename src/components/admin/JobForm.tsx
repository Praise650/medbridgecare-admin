import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBlocker } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { jobFormSchema, type JobFormInput, type JobFormValues } from "@/lib/schemas/job";
import { employmentTypeLabels, statusLabels, workModeLabels } from "@/lib/labels";
import { CustomQuestionsBuilder } from "./CustomQuestionsBuilder";
import { MarkdownField } from "./MarkdownField";

export const emptyJob: JobFormInput = {
  title: "",
  department: "",
  location: "",
  employment_type: "full_time",
  work_mode: "onsite",
  summary: "",
  description: "",
  requirements: "",
  salary_range: "",
  application_email: "",
  custom_questions: [],
  status: "draft",
  closing_date: "",
};

const Field = ({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-sm text-destructive">{error}</p>}
  </div>
);

export function JobForm({
  defaultValues,
  slug,
  saving,
  onSubmit,
  onSaved,
  extraActions,
}: {
  defaultValues: JobFormInput;
  slug?: string;
  saving: boolean;
  onSubmit: (v: JobFormValues) => Promise<boolean>;
  onSaved: () => void;
  extraActions?: React.ReactNode;
}) {
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<JobFormInput, unknown, JobFormValues>({ resolver: zodResolver(jobFormSchema), defaultValues });

  const [saved, setSaved] = useState(false);
  useEffect(() => reset(defaultValues), [defaultValues, reset]);
  useEffect(() => {
    if (saved) onSaved();
  }, [saved, onSaved]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => isDirty && !saved && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state === "blocked" && !window.confirm("You have unsaved changes. Leave without saving?")) blocker.reset();
    else if (blocker.state === "blocked") blocker.proceed();
  }, [blocker]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => isDirty && !saved && e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [isDirty, saved]);

  const summary = watch("summary") ?? "";
  const qErr = errors.custom_questions as { message?: string; root?: { message?: string } } | undefined;

  return (
    <form onSubmit={handleSubmit(async (v) => setSaved(await onSubmit(v)))} className="space-y-6" noValidate>
      {slug && (
        <p className="text-sm text-muted-foreground">
          Slug: <code>{slug}</code>
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" {...register("title")} />
        </Field>
        <Field label="Department" htmlFor="department" error={errors.department?.message}>
          <Input id="department" {...register("department")} />
        </Field>
        <Field label="Location" htmlFor="location" error={errors.location?.message}>
          <Input id="location" {...register("location")} />
        </Field>
        <Field label="Salary range" htmlFor="salary_range" error={errors.salary_range?.message}>
          <Input id="salary_range" {...register("salary_range")} />
        </Field>
        <Field label="Employment type" htmlFor="employment_type">
          <Select id="employment_type" {...register("employment_type")}>
            {Object.entries(employmentTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Work mode" htmlFor="work_mode">
          <Select id="work_mode" {...register("work_mode")}>
            {Object.entries(workModeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={`Summary (${summary.length}/300)`} htmlFor="summary" error={errors.summary?.message}>
        <Textarea id="summary" rows={3} maxLength={300} {...register("summary")} />
      </Field>

      <MarkdownField label="Description" error={errors.description?.message} {...register("description")} value={watch("description")} />
      <MarkdownField label="Requirements" error={errors.requirements?.message} {...register("requirements")} value={watch("requirements")} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Application email" htmlFor="application_email" error={errors.application_email?.message} hint="Leave blank to use the default inbox">
          <Input id="application_email" type="email" {...register("application_email")} />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" {...register("status")}>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Closing date" htmlFor="closing_date" error={errors.closing_date?.message}>
          <Input id="closing_date" type="date" {...register("closing_date")} />
        </Field>
      </div>

      <CustomQuestionsBuilder control={control} register={register} watch={watch} setValue={setValue} error={qErr?.message ?? qErr?.root?.message} />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save job"}</Button>
        {extraActions}
      </div>
    </form>
  );
}
