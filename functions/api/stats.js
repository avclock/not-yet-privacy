// Cloudflare Pages Function -- GET /api/stats
// Returns aggregated counts + recent activity as JSON for
// analytics.html to render. This endpoint (and analytics.html itself)
// is what should be gated behind Cloudflare Access -- it's the READ
// side, not the public logging side. See README.md.

export async function onRequestGet({ env }) {
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
