# Not Yet: Checkout Blocker — Website

Plain static site (no build step) — homepage, blog, support, privacy,
and terms. Same layout and CSS class structure as `avclock-website`
(the AvClock site), recolored and rewritten for a completely different
product: Not Yet's own real default "Calm" theme (soft warm stone,
large soft radii, serif headlines) instead of AvClock's dark
instrument-panel look. Built to deploy free on Cloudflare.

## What's in here

```
index.html                        Homepage
blog/index.html                   Blog listing
blog/why-a-typed-code-beats-a-timer.html   Post (live)
blog/what-guard-mode-protects.html          Post (live)
privacy/index.html                Privacy Policy
terms/index.html                  Terms of Use
support/index.html                Support / FAQ
css/style.css                     Shared styles (the "Calm" palette)
images/app-icon.png               Real app icon (from Assets.xcassets)
js/nav.js                         Mobile nav toggle
js/track.js                       First-party analytics beacon (every page)
src/index.js                      Cloudflare Worker entry (serves static assets + /api/track, /api/stats)
functions/api/track.js            Old Pages-Functions version, kept for reference only -- src/index.js is what actually runs
functions/api/stats.js            Same -- reference only
analytics.html                    Private live-stats dashboard (should be gated, see below)
wrangler.jsonc                    Cloudflare Worker config
```

## Why the URLs moved

This repo used to be legal-pages-only: `/` was the Privacy Policy,
`/support/` and `/terms/` were the other two pages, nothing else. This
build turns it into the real marketing site the extension didn't have
yet, so `/` is now the homepage and the Privacy Policy moved to
`/privacy/`. `/support/` and `/terms/` kept their exact same paths, so
only one URL actually changed.

**If the old bare-root Privacy Policy URL
(`https://avclock.github.io/not-yet-privacy/`) is referenced anywhere
outside this repo** (App Store Connect's Privacy Policy URL field, a
paywall screen's disclosure link, anything already submitted), update
it to point at `/privacy/` once this site is live at its real domain.
The extension's own source (`legal-content.js`, `paywall-content.js`
in `not-yet-checkout-blocker`) and its docs (`CLAUDE.md`,
`POST_LAUNCH.md`, `APP_STORE_CONNECT.md`, `PRIVACY_POLICY.md`) were
updated in the same pass as this site to point at the new `/privacy/`
path — see that repo's own history for the exact commit.

## A placeholder domain is baked into the meta tags

Every `<link rel="canonical">` and Open Graph tag currently says
`notyetapp.com` — a placeholder, not a purchased domain. Once you pick
a real domain, find-and-replace `notyetapp.com` across every `.html`
file (same simple step avclock-website's own README describes for
`avclockapp.com`).

## Deploying to Cloudflare (free)

This deploys as a **Cloudflare Worker with static assets** (not
classic Pages), matching how avclock-website itself is actually
configured today — `wrangler.jsonc`'s `assets` block serves every
`.html`/`.css`/`.js`/image file directly, and `src/index.js` only
intercepts the two `/api/*` analytics routes.

### Option A — Wrangler CLI (fastest)
```
npm install -g wrangler
wrangler login
wrangler deploy
```
This reads `wrangler.jsonc` and deploys everything in this folder as a
Worker. You'll get a live URL like `not-yet-website.<your-subdomain>.workers.dev`.

### Option B — Connect the GitHub repo (recommended long-term)
1. Push this folder to `avclock/not-yet-privacy` (already this repo's
   remote):
   ```
   git add .
   git commit -m "Full marketing site + blog"
   git push -u origin main
   ```
2. Cloudflare dashboard → **Workers & Pages** → **Create** → connect to
   this GitHub repo → it detects `wrangler.jsonc` automatically.
3. Every future `git push` auto-deploys.

## Live analytics — private stats dashboard

Same setup avclock-website uses. `js/track.js` on every page logs
pageviews, scroll-to-bottom, outbound/backlink clicks, and post shares
to `/api/track`, handled by `src/index.js`. `analytics.html` reads
`/api/stats` and renders a live dashboard, polling every 10 seconds.
**This only works once deployed on Cloudflare** — a plain local
`python3 -m http.server` preview has no Worker runtime, so
`analytics.html` will just show "couldn't reach /api/stats" locally.
That's expected, not a bug.

### 1. Connect a KV namespace (required)
1. Cloudflare dashboard → **Workers & Pages** → **KV** → **Create a
   namespace** (e.g. `not-yet-analytics`).
2. Your Worker project → **Settings → Bindings** → add a KV namespace
   binding named exactly `ANALYTICS_KV` → bind it to the namespace you
   just created.
3. Redeploy. `analytics.html` starts showing real numbers as people
   visit the site.

### 2. Gate the dashboard (strongly recommended)
Cloudflare Access (part of Cloudflare Zero Trust, free for individual
use) — same walkthrough as avclock-website's own README:
- Zero Trust → Access → Applications → Add an application →
  Self-hosted.
- Application domain/path: `notyetapp.com/analytics.html`.
- Also gate `notyetapp.com/api/stats*` (the read endpoint).
- **Don't** gate `/api/track` — that one has to stay public or every
  visitor's pageviews silently stop logging.

## Adding future blog posts

1. Copy `blog/why-a-typed-code-beats-a-timer.html` as a starting
   template.
2. Write the post, update `<title>`, meta description, canonical URL,
   and the JSON-LD block's `datePublished`.
3. In `blog/index.html`, add a real `<a class="blog-row" href="...">`
   entry (same pattern as the two live posts), or flip an existing
   `.blog-row.stub` into a real link once that topic is written.

## After it's live

Submit the site to
[Google Search Console](https://search.google.com/search-console)
(free) so it actually gets indexed. Also worth double-checking that
the extension's Setup & Help links, the paywall's Terms/Privacy links,
and the App Store Connect listing all point at this site's real final
URLs once the domain is decided.
