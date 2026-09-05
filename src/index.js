// Worker entry point. This project deploys as a Worker with static
// assets (not classic Cloudflare Pages Functions) -- see wrangler.jsonc.
// Everything not matched below falls through to env.ASSETS, which
// serves the static site (functions/api/*.js is dead code kept only
// for reference; this file supersedes it). Mirrors the working setup
// in avclock-website -- see that repo's own src/index.js.

const ALLOWED_TYPES = new Set(["view", "scroll", "outbound", "share"]);
const RECENT_KEY = "recent";
const RECENT_LIMIT = 50;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/track" && request.method === "POST") {
      return handleTrack(request, env);
    }
    if (url.pathname === "/api/stats" && request.method === "GET") {
      return handleStats(env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleTrack(request, env) {
  if (!env.ANALYTICS_KV) return new Response(null, { status: 204 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(null, { status: 204 });
  }

  const type = String(body.type || "").slice(0, 20);
  if (!ALLOWED_TYPES.has(type)) return new Response(null, { status: 204 });

  const path = String(body.path || "/").slice(0, 200);
  const detail = body.detail != null ? String(body.detail).slice(0, 200) : null;
  const day = new Date().toISOString().slice(0, 10);

  const counterKey = detail
    ? `count:${type}:${path}:${detail}:${day}`
    : `count:${type}:${path}:${day}`;

  const kv = env.ANALYTICS_KV;
  const current = parseInt((await kv.get(counterKey)) || "0", 10);
  await kv.put(counterKey, String(current + 1));

  const recentRaw = await kv.get(RECENT_KEY);
  const recent = recentRaw ? JSON.parse(recentRaw) : [];
  recent.unshift({ type, path, detail, t: Date.now() });
  await kv.put(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_LIMIT)));

  return new Response(null, { status: 204 });
}

async function handleStats(env) {
  if (!env.ANALYTICS_KV) {
    return json({ totals: {}, recent: [], error: "ANALYTICS_KV not bound" });
  }
  const kv = env.ANALYTICS_KV;

  // KV .list() is paginated at 1000 keys/call -- walk all pages so
  // totals stay correct even after this has been live a while.
  const totals = {};
  let cursor;
  do {
    const page = await kv.list({ prefix: "count:", cursor });
    for (const key of page.keys) {
      const parts = key.name.split(":");
      // count:type:path:day  OR  count:type:path:detail:day
      const type = parts[1];
      const path = parts[2];
      const detail = parts.length > 4 ? parts[3] : null;
      const groupKey = detail ? `${type}|${path}|${detail}` : `${type}|${path}`;
      const val = parseInt((await kv.get(key.name)) || "0", 10);
      totals[groupKey] = (totals[groupKey] || 0) + val;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const recentRaw = await kv.get("recent");
  const recent = recentRaw ? JSON.parse(recentRaw) : [];

  return json({ totals, recent });
}

function json(obj) {
  return new Response(JSON.stringify(obj), {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
