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
press/index.html                  Press release + media contact -- fill in the [CITY], [STATE] placeholder in the dateline before publishing
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

## The real domain

`notyetcb.com`, purchased 2026-09-15. Every `<link rel="canonical">`
and Open Graph tag across the site already points there. The Cloudflare
Worker deploy below still needs the actual domain connected in the
Cloudflare dashboard (Workers & Pages → your project → Settings →
Domains & Routes → Add → `notyetcb.com`) before it resolves for real
visitors — deploying the Worker alone only gets you the
`*.workers.dev` URL.

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
2. **Create this under the "Workers" tab, not "Pages."** Cloudflare
   dashboard → **Workers & Pages** → **Workers** → **Import a
   repository** → connect this GitHub repo. Picking **Pages** instead
   is a real, easy-to-hit mistake here: Pages has its own build
   pipeline that never reads `wrangler.jsonc`'s `main`/`assets` config
   at all, and instead guesses a build output directory by name
   (`dist`, `public`, `build`...). Since this repo's static files sit
   at the true repo root, none of those guesses match, and Pages fails
   with "Could not detect a directory containing static files" before
   ever running a real deploy -- confirmed 2026-09-15 by reproducing
   the exact same `wrangler deploy` locally with the exact CI-reported
   Wrangler version and watching it read all 271 files from the
   assets directory and build clean. If a Pages project already exists
   for this repo and hit that error, delete it and recreate under
   Workers instead of debugging Pages' build settings further.
3. Once created as a Workers project, it detects `wrangler.jsonc`
   automatically; the default **Deploy command** (`npx wrangler
   deploy`) is correct as-is. Confirm **Root directory** is blank or
   `/`, not a subfolder.
4. Every future `git push` auto-deploys.

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
- Application domain/path: `notyetcb.com/analytics.html`.
- Also gate `notyetcb.com/api/stats*` (the read endpoint).
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
