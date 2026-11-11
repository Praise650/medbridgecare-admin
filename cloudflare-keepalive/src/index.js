// Pings Supabase's REST API on a cron schedule so the Free project isn't auto-paused.
// Requires secrets: SUPABASE_URL, SUPABASE_ANON_KEY (set with `wrangler secret put`).

async function ping(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/jobs?select=id&limit=1`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase ping failed: ${res.status} ${await res.text()}`);
  }
  return res.status;
}

export default {
  async scheduled(_event, env, _ctx) {
    const status = await ping(env);
    console.log(`Supabase ping ok: ${status}`);
  },

  // Manual check: open the deployed worker URL in a browser.
  async fetch(_request, env) {
    try {
      return new Response(`ok ${await ping(env)}`);
    } catch (e) {
      return new Response(String(e.message), { status: 502 });
    }
  },
};
