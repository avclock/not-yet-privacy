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

`js/track.js` on every page logs pageviews, scroll-to-bottom,
outbound/backlink clicks, and post shares to `/api/track`, handled by
`src/index.js`. `analytics.html` reads `/api/stats` (edge-cached for
8 seconds — see the "Staying inside the free tier" section below) and
renders a live dashboard, polling every 10 seconds. **This only works
once deployed on Cloudflare** — a plain local `python3 -m http.server`
preview has no Worker runtime, so `analytics.html` will just show
"couldn't reach /api/stats" locally. That's expected, not a bug.

### 1. The KV namespace (automatic)

KV is Cloudflare's key-value store, where every pageview, click, and
share count lives. `wrangler.jsonc` declares it as `ANALYTICS_KV`
without an ID, and Wrangler handles the rest on deploy:

- If the Worker already has a KV namespace bound as `ANALYTICS_KV`,
  the deploy keeps using it.
- Otherwise the deploy creates one, named
  `not-yet-website-analytics-kv`, and binds it.

**Don't add or change this binding in the dashboard.** Every deploy
sets the Worker's bindings to exactly what `wrangler.jsonc` declares,
so a binding added by hand under Settings → Bindings is dropped by the
next push to `main`. That's what kept `analytics.html` stuck on "Not
connected yet" until this was moved into the config (2026-09-24).

To pin a specific namespace instead (say, one you created by hand
called `not-yet-analytics`): Workers & Pages → KV → copy its ID, then
set `"id": "<that ID>"` on the `ANALYTICS_KV` entry in
`wrangler.jsonc`.

### 2. Check it's live

After the next deploy, open `/analytics.html`: the "Not connected
yet" notice is gone and the tiles show real `0`s, then real numbers as
soon as anyone visits a page. If the notice stays, open the Worker's
**Deployments** tab and read the latest build log: a permissions error
there means the build token can't create KV namespaces, and the
one-time fix is creating the namespace by hand and pinning its ID as
above.

### 3. Gate the dashboard to just your own email

Cloudflare Access (part of Cloudflare Zero Trust, free for up to 50
users) sits in front of a URL and requires a login before Cloudflare
even forwards the request to the Worker — this is what makes
`analytics.html` actually private, since the page itself has no
password of its own.

1. Cloudflare dashboard → left sidebar **Zero Trust** (if this is the
   first time opening it, it'll ask you to pick a free plan and a
   team name — any team name works, it's just an internal label).
2. **Access** → **Applications** → **Add an application** →
   **Self-hosted**.
3. **Application name**: `Not Yet Analytics` (just a label).
   **Session duration**: how long a login lasts before it asks again —
   `24 hours` is a reasonable default; pick longer if re-entering a
   code every day is annoying.
4. **Application domain**: `notyetcb.com`, **Path**: `/analytics.html`.
   Click **Add public hostname** again and add a second one — same
   domain, path `/api/stats*` (the asterisk matters: this covers the
   endpoint the dashboard's own polling calls, which is a separate URL
   from the page itself).
5. Continue to **Policies**. **Add a policy**:
   - **Policy name**: `Just me`.
   - **Action**: `Allow`.
   - **Rule type**: `Emails`. **Value**: your email
     (`brysonjohansson@gmail.com`) — type it in and hit enter/return so
     it becomes a chip, not just typed text.
   - Nothing else needs changing. Save.
6. **Don't** create a third public hostname for `/api/track` — that
   one has to stay reachable by every visitor's browser with no login,
   or every pageview silently stops logging the moment this is set up.
   It was never included above; just don't add it.

**What this looks like when you actually visit the page**: going to
`notyetcb.com/analytics.html` redirects to a Cloudflare login screen
asking for an email. Enter `brysonjohansson@gmail.com`, Cloudflare
emails a one-time 6-digit code to that address, you type it in, and
you land on the real dashboard. Anyone else's email gets an "Access
Denied" page instead — they never even reach the Worker, so there's
nothing there for them to try to guess a URL around. The session then
holds for whatever duration you picked in step 3, so this isn't a
some-time-consuming, every-single-visit thing.

## Staying inside the free tier

Two different daily quotas apply here, and they reset independently
every day at 00:00 UTC — nothing needs "renewing" or configuring, they
just refill:

| Quota | Free limit/day | What uses it here |
| --- | --- | --- |
| Worker requests | 100,000 | Every page load, asset file, and `/api/*` call |
| KV reads | 100,000 | `/api/stats` — now edge-cached 8s, see below |
| KV writes | 1,000 | `/api/track` — 2 writes per pageview/outbound/share event, 1 per scroll event |
| KV deletes / lists | 1,000 each | `/api/stats`'s `kv.list()` call counts as 1 list per page of up to 1,000 keys, regardless of visitor traffic |

**Requests (100,000/day) and KV reads (100,000/day) are generous
enough that a marketing site this size won't come close.** The one
worth actually understanding is **KV writes (1,000/day)**: each
tracked pageview/outbound-click/share costs 2 writes (a per-day
counter, plus the "recent activity" feed entry); a scroll-to-bottom
event costs 1 (the feed entry is skipped for scroll on purpose — see
`js/track.js`'s own comment). Worst case, roughly **500 real visits/day**
before that quota is a concern — comfortable headroom for where this
site is now, and something worth glancing at again if traffic ever
takes off.

**To check actual usage** (no guessing needed): Cloudflare dashboard →
**Workers & Pages** → **KV** → your namespace → **Metrics** tab shows
real daily read/write counts, and the Worker project's own
**Analytics** tab shows request volume. Both are free to check anytime.

**What already protects the quotas, built into the code:**
- Scroll milestones were already trimmed to just the 100%-reached
  event (was 4 milestones, now 1) — see `js/track.js`.
- `/api/stats` is edge-cached for 8 seconds (`src/index.js`,
  2026-09-16). Before this, every 10-second dashboard poll re-read
  *every* counter key ever written, from day one — a cost that only
  grows over months as more distinct page/event/day combinations pile
  up, and multiplies further if the dashboard tab is left open for
  hours. Now, repeat polls within that 8-second window are served from
  a cached copy instead of re-querying KV, without the dashboard ever
  showing data staler than one extra poll cycle.
- Every KV write in `/api/track` is wrapped in a try/catch
  (2026-09-16): if the daily write quota ever does run out, that one
  event just quietly isn't counted — normal page serving is
  completely unaffected either way (analytics has never been able to
  break the site, per `js/track.js`'s own design), and this specifically
  keeps a quota hit from showing up as a Worker exception in the
  dashboard's logs, which used to read like something was actually
  broken.

**If this site's traffic ever genuinely outgrows the free tier**: the
$5/month Workers Paid plan removes the hard daily KV caps above
entirely, replacing them with a much larger bundled monthly allowance
plus metered pay-as-you-go beyond that — a straightforward dashboard
upgrade (Workers & Pages → your account → **Plans**), no code changes
needed. This sandbox couldn't reach Cloudflare's own pricing page to
confirm the exact current bundled numbers while writing this, so
check developers.cloudflare.com/kv/platform/pricing/ for the real
current figures before deciding, rather than trusting a number here
that could be stale by the time you read it.

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
