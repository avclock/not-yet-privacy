// Worker entry point. This project deploys as a Worker with static
// assets (not classic Cloudflare Pages Functions) -- see wrangler.jsonc.
// Everything not matched below falls through to env.ASSETS, which
// serves the static site (functions/api/*.js is dead code kept only
// for reference; this file supersedes it). Static files are served by
// the assets layer without running this Worker at all, so only
// /api/track and /api/stats count as Worker requests.
//
// SAME FILE in avclock-website and not-yet-privacy -- change both.
//
// Free-plan budget (2026-10-02 rewrite). Workers KV free tier, per day:
// 1,000 writes, 1,000 lists, 1,000 deletes, 100,000 reads. The old
// version spent 2 reads + 2 writes per tracked event (a per-day counter
// key plus one shared "recent" key), so about 500 events a day used up
// every write, and /api/stats re-read every counter key ever written
// (one kv.get() per key, keys piling up per page per day forever) on
// each 10-second dashboard poll. Now:
//   - One counter key per type/path/detail (no day in the key, the
//     dashboard only ever showed all-time totals), holding the count
//     and the last-seen time in KV metadata. An event costs 1 read +
//     1 write. The "recent" feed is rebuilt from that metadata (latest
//     activity per page/event), so it no longer costs a write.
//   - /api/stats is one kv.list() (metadata comes back with the list,
//     no per-key reads) and is cached at the edge for 5 minutes. The
//     old per-day "count:" keys are summed once into "legacy:totals"
//     on the first stats call after deploy and never read again.
//   - Obvious bots are skipped, and any KV error (quota reached for
//     the day, or the 1-write-per-second-per-key limit during a burst)
//     just drops that one count with a normal 204.

const ALLOWED_TYPES = new Set(["view", "scroll", "outbound", "share", "demo"]);
const RECENT_LIMIT = 50;
const STATS_CACHE_SECONDS = 300;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|monitor/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/track" && request.method === "POST") {
      return handleTrack(request, env);
    }
    if (url.pathname === "/api/stats" && request.method === "GET") {
      return handleStats(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleTrack(request, env) {
  const kv = env.ANALYTICS_KV;
  if (!kv) return new Response(null, { status: 204 });
  if (BOT_UA.test(request.headers.get("user-agent") || "")) return new Response(null, { status: 204 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(null, { status: 204 });
  }

  const type = String(body.type || "").slice(0, 20);
  if (!ALLOWED_TYPES.has(type)) return new Response(null, { status: 204 });
  const path = String(body.path || "/").slice(0, 200);
  const detail = body.detail != null ? String(body.detail).slice(0, 200) : "";

  const key = `total:${type}|${path}|${detail}`;
  try {
    const { metadata } = await kv.getWithMetadata(key);
    const count = ((metadata && metadata.c) || 0) + 1;
    await kv.put(key, String(count), {
      metadata: { c: count, t: Date.now(), ty: type, p: path, d: detail }
    });
  } catch (e) {
    // Daily quota reached, or a same-key burst: this one event just
    // isn't counted. Never surface that as a broken response.
  }
  return new Response(null, { status: 204 });
}

async function handleStats(request, env, ctx) {
  const kv = env.ANALYTICS_KV;
  if (!kv) return json({ totals: {}, recent: [], error: "ANALYTICS_KV not bound" });

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const totals = Object.assign({}, await legacyTotals(kv));
  const recent = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: "total:", cursor });
    for (const k of page.keys) {
      const m = k.metadata;
      if (!m) continue;
      const groupKey = m.d ? `${m.ty}|${m.p}|${m.d}` : `${m.ty}|${m.p}`;
      totals[groupKey] = (totals[groupKey] || 0) + (m.c || 0);
      recent.push({ type: m.ty, path: m.p, detail: m.d || null, t: m.t, count: m.c });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  recent.sort((a, b) => b.t - a.t);
  const response = json({ totals, recent: recent.slice(0, RECENT_LIMIT), cachedFor: STATS_CACHE_SECONDS }, STATS_CACHE_SECONDS);
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

// All-time totals from the old per-day "count:type:path[:detail]:day"
// keys, summed once and stored. Those keys are never written again.
async function legacyTotals(kv) {
  const saved = await kv.get("legacy:totals", "json");
  if (saved) return saved;
  const totals = {};
  let cursor;
  do {
    const page = await kv.list({ prefix: "count:", cursor });
    for (const k of page.keys) {
      const parts = k.name.split(":");
      const type = parts[1];
      const path = parts[2];
      // Detail (a referrer host or an outbound URL) can itself contain
      // ":", so it's everything between the path and the trailing day.
      const detail = parts.length > 4 ? parts.slice(3, -1).join(":") : null;
      const groupKey = detail ? `${type}|${path}|${detail}` : `${type}|${path}`;
      const val = parseInt((await kv.get(k.name)) || "0", 10);
      totals[groupKey] = (totals[groupKey] || 0) + val;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  try {
    await kv.put("legacy:totals", JSON.stringify(totals));
  } catch (e) {
    // Out of writes today: it's summed again next time, still correct.
  }
  return totals;
}

function json(obj, maxAgeSeconds) {
  return new Response(JSON.stringify(obj), {
    headers: {
      "content-type": "application/json",
      // cache.put() won't store a no-store response, so the real stats
      // response carries a max-age; error responses stay no-store.
      "cache-control": maxAgeSeconds ? `public, max-age=${maxAgeSeconds}` : "no-store"
    }
  });
}
