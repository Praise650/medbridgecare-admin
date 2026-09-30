# Medbridge Admin

Admin panel for managing job postings (Vite + React + TS, Supabase). The public job board and application
submission live in the separate `medbridge` project and read from the same Supabase database.
See `admin-supabase-plan.md` and `applications-logic-plan.md` for the spec.

## Setup
1. `cp .env.example .env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   (optionally `VITE_PUBLIC_SITE_URL` for the "View" link to the public site).
2. In Supabase: disable public sign-ups, create the admin user (auto-confirmed), apply
   `supabase/migrations/*.sql`, optionally run `supabase/seed.sql`, then grant admin:
   ```sql
   insert into public.admin_users (user_id) select id from auth.users where email = 'admin@yourdomain.com';
   ```
3. Deploy the function: `supabase functions deploy send-test-email`
4. `npm install && npm run dev`

## Edge Function secrets (Supabase dashboard, never in the repo)
`RESEND_API_KEY`, `EMAIL_FROM`, `DEFAULT_APPLICATION_EMAIL`, `ALLOWED_ORIGIN`
(plus `SEND_APPLICANT_CONFIRMATION`, `STORE_APPLICATIONS` for the future submission function).
Set SPF, DKIM and DMARC on the sending domain so mail doesn't land in spam.

## Scripts
`npm run dev` · `npm run build` · `npm test`
