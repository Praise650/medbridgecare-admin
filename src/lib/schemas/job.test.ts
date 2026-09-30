import { describe, expect, it } from "vitest";
import { jobFormSchema, toJobRow } from "./job";

const valid = {
  title: "Nurse Practitioner",
  department: "Clinical",
  location: "Lagos",
  employment_type: "full_time",
  work_mode: "onsite",
  summary: "Care for patients.",
  description: "## About",
  requirements: "",
  salary_range: "",
  application_email: "",
  custom_questions: [],
  status: "draft",
  closing_date: "",
};

describe("jobFormSchema", () => {
  it("accepts a valid job", () => expect(jobFormSchema.safeParse(valid).success).toBe(true));
  it("rejects a bad email", () =>
    expect(jobFormSchema.safeParse({ ...valid, application_email: "nope" }).success).toBe(false));
  it("rejects a long summary", () =>
    expect(jobFormSchema.safeParse({ ...valid, summary: "x".repeat(301) }).success).toBe(false));
  it("rejects duplicate question ids", () => {
    const q = { id: "a", label: "A", type: "text", required: false };
    expect(jobFormSchema.safeParse({ ...valid, custom_questions: [q, q] }).success).toBe(false);
  });
  it("rejects select without options", () => {
    const q = { id: "a", label: "A", type: "select", required: false };
    expect(jobFormSchema.safeParse({ ...valid, custom_questions: [q] }).success).toBe(false);
  });
});

describe("toJobRow", () => {
  it("turns empty strings into null", () => {
    const row = toJobRow(jobFormSchema.parse(valid));
    expect(row.salary_range).toBeNull();
    expect(row.application_email).toBeNull();
    expect(row.closing_date).toBeNull();
  });
});
