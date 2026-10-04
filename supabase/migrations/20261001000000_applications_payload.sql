-- Store the full application so nothing is lost if email delivery fails.
-- Written only by the submit-application Edge Function (service role).

alter table public.applications
  add column phone          text check (phone is null or char_length(phone) <= 40),
  add column cover_letter   text check (cover_letter is null or char_length(cover_letter) <= 5000),
  add column answers        jsonb not null default '{}'::jsonb
                            check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 50000),
  add column resume_path    text check (resume_path is null or char_length(resume_path) <= 300),
  add column email_error    text check (email_error is null or char_length(email_error) <= 500),
  add column confirmation_sent boolean not null default false,
  -- false when STORE_APPLICATIONS=off: the row is only a log entry and cannot be resent
  add column payload_stored boolean not null default true;

-- Duplicate-submission check (same applicant, same job, recent)
create index applications_dedupe_idx
  on public.applications (job_id, lower(applicant_email), submitted_at desc);

-- Private bucket for CVs. Only admins can read; uploads happen via service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "Admins read resumes"
on storage.objects for select to authenticated
using (bucket_id = 'resumes' and (select public.is_admin()));

create policy "Admins delete resumes"
on storage.objects for delete to authenticated
using (bucket_id = 'resumes' and (select public.is_admin()));
