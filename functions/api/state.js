// Cloudflare Pages Function: GET/PUT the whole app state as one JSON blob
// in a KV namespace, so every device hitting this deployment shares the
// same data instead of each browser keeping its own localStorage copy.
//
// Setup (see README.md for the full walkthrough):
//   1. Create a KV namespace, e.g.  wrangler kv namespace create STATE_KV
//   2. Bind it to this Pages project as `STATE_KV`
//      (dashboard: Settings → Functions → KV namespace bindings,
//       or in wrangler.toml — see the one included in this project).
//
// Route: /api/state
//   GET  -> returns the stored JSON blob, or `null` if nothing saved yet
//   PUT  -> body is the full JSON blob to store (overwrites previous value)

const STATE_KEY = "checklist-state-v1";

export async function onRequestGet({ env }) {
  if (!env.STATE_KV) {
    return new Response(
      JSON.stringify({ error: "STATE_KV binding is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const raw = await env.STATE_KV.get(STATE_KEY);
  return new Response(raw ?? "null", {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequestPut({ request, env }) {
  if (!env.STATE_KV) {
    return new Response(
      JSON.stringify({ error: "STATE_KV binding is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  const body = await request.text();
  try {
    JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  await env.STATE_KV.put(STATE_KEY, body);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
