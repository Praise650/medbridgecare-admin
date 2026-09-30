-- ============================================================
-- Enums
-- ============================================================
create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'internship');
create type public.work_mode       as enum ('onsite', 'remote', 'hybrid');
create type public.job_status      as enum ('draft', 'open', 'closed');
create type public.email_status    as enum ('sent', 'failed');

-- ============================================================
-- Admin allowlist
-- ============================================================
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so RLS policies can call it without recursion
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================
-- Jobs
-- ============================================================
create table public.jobs (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null check (char_length(title) between 3 and 150),
  department        text not null check (char_length(department) between 1 and 100),
  location          text not null check (char_length(location) between 1 and 100),
  employment_type   public.employment_type not null,
  work_mode         public.work_mode not null,
  summary           text not null check (char_length(summary) between 1 and 300),
  description       text not null check (char_length(description) <= 20000),
  requirements      text not null default '' check (char_length(requirements) <= 20000),
  salary_range      text check (salary_range is null or char_length(salary_range) <= 100),
  application_email text check (
    application_email is null
    or application_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  custom_questions  jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(custom_questions) = 'array'),
  status            public.job_status not null default 'draft',
  closing_date      date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index jobs_status_closing_idx on public.jobs (status, closing_date);

-- ---------- slug generation (on insert only, so public links stay stable) ----------
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')
  );
$$;

create or replace function public.jobs_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base      text;
  candidate text;
  n         int := 1;
begin
  if new.slug is null or new.slug = '' then
    base := public.slugify(new.title);
    if base = '' then base := 'job'; end if;
  else
    base := public.slugify(new.slug);
  end if;

  candidate := base;
  while exists (select 1 from public.jobs where slug = candidate and id <> new.id) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

create trigger jobs_set_slug
before insert on public.jobs
for each row execute function public.jobs_set_slug();

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

-- ============================================================
-- Application log (written by a future submission Edge Function)
-- ============================================================
create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references public.jobs(id) on delete set null,
  job_title       text not null,          -- snapshot, survives job deletion
  applicant_name  text not null,
  applicant_email text not null,
  submitted_at    timestamptz not null default now(),
  email_status    public.email_status not null
);

create index applications_job_id_idx on public.applications (job_id);

-- ============================================================
-- Dashboard view: jobs + application counts
-- security_invoker => the view respects the caller's RLS
-- ============================================================
create view public.admin_job_overview
with (security_invoker = true) as
select
  j.id, j.slug, j.title, j.status, j.application_email,
  j.closing_date, j.updated_at,
  count(a.id)                                         as application_count,
  count(a.id) filter (where a.email_status = 'failed') as failed_count
from public.jobs j
left join public.applications a on a.job_id = j.id
group by j.id;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.jobs         enable row level security;
alter table public.applications enable row level security;
alter table public.admin_users  enable row level security;

-- jobs: public can read open, non-expired jobs
create policy "Public reads open jobs"
on public.jobs for select
to anon, authenticated
using (
  status = 'open'
  and (closing_date is null or closing_date >= current_date)
);

-- jobs: admins full access
create policy "Admins read all jobs"
on public.jobs for select to authenticated
using ((select public.is_admin()));

create policy "Admins insert jobs"
on public.jobs for insert to authenticated
with check ((select public.is_admin()));

create policy "Admins update jobs"
on public.jobs for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins delete jobs"
on public.jobs for delete to authenticated
using ((select public.is_admin()));

-- Hide application_email from anonymous visitors (anti-scraping).
-- Public pages must select explicit columns, never select('*').
revoke select on public.jobs from anon;
grant select (
  id, slug, title, department, location, employment_type, work_mode,
  summary, description, requirements, salary_range, custom_questions,
  status, closing_date, created_at, updated_at
) on public.jobs to anon;

-- applications: admins read/delete; NO client insert (service role only)
create policy "Admins read applications"
on public.applications for select to authenticated
using ((select public.is_admin()));

create policy "Admins delete applications"
on public.applications for delete to authenticated
using ((select public.is_admin()));

-- admin_users: a user may see only their own row (used by the UI guard).
-- No insert/update/delete policies => only SQL editor / service role can grant admin.
create policy "Users read own admin row"
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));
