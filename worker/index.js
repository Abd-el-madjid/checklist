// Worker entry point for a plain `wrangler deploy` (not Pages).
//
// This is what actually matches a *.workers.dev deployment: one script,
// bound to a KV namespace (STATE_KV) for the shared checklist state and to
// the built `dist/` folder (ASSETS) for the static React app. Every
// request either hits /api/state (handled here directly) or falls through
// to env.ASSETS.fetch(request), which serves index.html / JS / CSS exactly
// like a static host would.
//
// If you deploy through Cloudflare Pages instead (wrangler pages deploy /
// dashboard Git integration), this file isn't used at all — Pages picks up
// functions/api/state.js automatically instead. Keep whichever one matches
// how you actually deploy; the other is just unused dead weight, not a
// conflict.

const STATE_KEY = "checklist-state-v1";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

async function handleState(request, env) {
  if (!env.STATE_KV) {
    return json(
      { error: "STATE_KV binding is not configured" },
      { status: 500 },
    );
  }

  if (request.method === "GET") {
    const raw = await env.STATE_KV.get(STATE_KEY);
    return new Response(raw ?? "null", {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  if (request.method === "PUT") {
    const body = await request.text();
    try {
      JSON.parse(body);
    } catch {
      return json({ error: "invalid JSON body" }, { status: 400 });
    }
    await env.STATE_KV.put(STATE_KEY, body);
    return json({ ok: true });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  return json({ error: "method not allowed" }, { status: 405 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/state") {
      return handleState(request, env);
    }

    // Everything else: the built React app's static files.
    return env.ASSETS.fetch(request);
  },
};
