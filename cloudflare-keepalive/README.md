# Supabase keepalive (Cloudflare Worker)

Cron-triggered Worker that queries `public.jobs` via the Supabase REST API every ~3 days
so the Free-tier project doesn't pause.
## Deploy

```bash
cd cloudflare-keepalive
npx wrangler login
npx wrangler secret put SUPABASE_URL        # e.g. https://xxxx.supabase.co
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler deploy
```

## Test

- Local: `npx wrangler dev --test-scheduled`, then `curl "http://localhost:8787/__scheduled"`
- Deployed: open the worker URL (the `fetch` handler runs the same ping and returns `ok 200`).
- Logs: `npx wrangler tail`

## Notes

- Needs anon `select` on `public.jobs` to be allowed by RLS.
- Don't expose the worker URL publicly if you'd rather not let others trigger pings (harmless, but unnecessary).
