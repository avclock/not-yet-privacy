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
      return handleStats(env, request, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};

// KV writes wrapped in try/catch (2026-09-16) -- once the free tier's
// daily KV write quota (1,000/day) is used up for the day, a kv.put()
// call throws instead of failing quietly. js/track.js's own beacon call
// already treats any non-2xx/error response as a silent no-op (see its
// header comment: "analytics should never break the page"), so this
// was never visitor-facing -- but an uncaught throw here still surfaces
// as a Worker exception in the dashboard's Observability/Analytics
// tab, which reads like the SITE broke rather than "the analytics
// counter quietly skipped one write for the day." Catching it here
// keeps that distinction clear and lets the request still return its
// normal 204 either way. Same quota resets daily at 00:00 UTC -- no
// action needed, it just starts counting again.
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
  try {
    const current = parseInt((await kv.get(counterKey)) || "0", 10);
    await kv.put(counterKey, String(current + 1));

    const recentRaw = await kv.get(RECENT_KEY);
    const recent = recentRaw ? JSON.parse(recentRaw) : [];
    recent.unshift({ type, path, detail, t: Date.now() });
    await kv.put(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_LIMIT)));
  } catch (e) {
    // Quota exceeded or a transient KV error -- this one event just
    // doesn't get counted. Never surface that as a broken response.
  }

  return new Response(null, { status: 204 });
}

// Edge-cached for 8 seconds (2026-09-16, real KV read-quota headroom
// concern) -- analytics.html polls this endpoint every 10s, and every
// poll used to re-walk EVERY count:* key ever written (kv.list() plus
// one kv.get() per key), from the very first day this went live, every
// single time. That cost is small today but only ever grows: more
// distinct pages/event-type/day combinations pile up as keys over
// months of daily operation, and a dashboard tab left open for hours
// multiplies it further. An 8s Cache API entry (shorter than the 10s
// poll interval, so the dashboard never reads stale-by-more-than-a-
// poll data) means repeat polls within that window are served from
// cache instead of re-reading the entire KV namespace from scratch --
// this is the actual lever against the free tier's 100,000 KV
// reads/day limit, which (unlike the 1,000 writes/day limit) scales
// with total history, not just today's traffic. request.cf.cacheKey
// isn't used here on purpose: this response has no per-visitor
// variation to worry about, a plain URL-keyed cache entry is correct.
async function handleStats(env, request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

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

  const response = json({ totals, recent }, 8);
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function json(obj, maxAgeSeconds) {
  return new Response(JSON.stringify(obj), {
    headers: {
      "content-type": "application/json",
      // no-store (the default) keeps the KV-unbound error response and
      // the client's own always-fresh poll intent honest; the real
      // stats response overrides this with a short max-age specifically
      // so the Cache API write above actually takes -- cache.put()
      // silently declines to store a response marked no-store.
      "cache-control": maxAgeSeconds ? `public, max-age=${maxAgeSeconds}` : "no-store"
    }
  });
}
