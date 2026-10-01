-- 1. Public job policy: anon only. Signed-in non-admins must not read jobs
--    (application_email is only column-hidden from anon). Admins keep full
--    access through the "Admins read all jobs" policy.
drop policy if exists "Public reads open jobs" on public.jobs;
create policy "Public reads open jobs"
on public.jobs for select
to anon
using (
  status = 'open'
  and (closing_date is null or closing_date >= current_date)
);

-- 6. Explicit revokes (defense in depth on top of RLS)
revoke all on public.applications      from anon;
revoke all on public.admin_users       from anon;
revoke all on public.admin_job_overview from anon;
revoke insert, update, delete on public.applications from authenticated;
revoke insert, update, delete on public.admin_users  from authenticated;

-- 8. Validate custom_questions shape server-side (mirrors the zod schema)
create or replace function public.valid_custom_questions(q jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(q) = 'array'
    and jsonb_array_length(q) <= 15
    and not exists (
      select 1 from jsonb_array_elements(q) e
      where jsonb_typeof(e) <> 'object'
         or jsonb_typeof(e->'id') is distinct from 'string'
         or (e->>'id') !~ '^[a-z0-9_-]{1,40}$'
         or jsonb_typeof(e->'label') is distinct from 'string'
         or char_length(e->>'label') not between 1 and 200
         or (e->>'type') is null
         or (e->>'type') not in ('text', 'textarea', 'select', 'url')
         or jsonb_typeof(e->'required') is distinct from 'boolean'
         or (e ? 'options' and (
              jsonb_typeof(e->'options') <> 'array'
              or jsonb_array_length(e->'options') > 20))
         or ((e->>'type') = 'select' and (
              jsonb_typeof(e->'options') is distinct from 'array'
              or jsonb_array_length(e->'options') < 1))
    )
    and (
      select count(distinct e->>'id') = count(*) from jsonb_array_elements(q) e
    );
$$;

alter table public.jobs
  add constraint jobs_custom_questions_shape
  check (public.valid_custom_questions(custom_questions));

-- 5. Admin audit log (also backs rate limiting of the test-email function)
create table public.admin_audit_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  action     text not null check (char_length(action) <= 100),
  target_id  uuid,
  created_at timestamptz not null default now()
);
create index admin_audit_log_user_action_idx on public.admin_audit_log (user_id, action, created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon;

create policy "Admins read audit log"
on public.admin_audit_log for select to authenticated
using ((select public.is_admin()));

create policy "Admins write own audit rows"
on public.admin_audit_log for insert to authenticated
with check ((select public.is_admin()) and user_id = (select auth.uid()));
