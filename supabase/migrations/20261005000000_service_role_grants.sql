-- The submit-application / resend-application Edge Functions use the service role.
-- Grant it explicit table privileges (service_role bypasses RLS but still needs GRANTs).

grant usage on schema public to service_role;

grant select on public.jobs to service_role;
grant select, insert, update on public.applications to service_role;
