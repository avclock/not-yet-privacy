// Lightweight first-party analytics beacon -- no cookies, no third
// party, sends to this site's own /api/track (a Cloudflare Pages
// Function, see functions/api/track.js). Silently does nothing if
// that endpoint isn't there (e.g. running the plain local dev server
// instead of deployed on Cloudflare Pages) -- sendBeacon/fetch just
// fail quietly, never blocks the page.
(function () {
  var ENDPOINT = "/api/track";

  function send(type, detail) {
    var payload = JSON.stringify({
      type: type,
      path: location.pathname,
      detail: detail != null ? String(detail) : null
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      } else {
        fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } }).catch(function () {});
      }
    } catch (e) { /* analytics should never break the page */ }
  }

  send("view");

  // Scroll-depth milestones, each fired at most once per page load.
  // Trimmed from [25, 50, 75, 100] to just 100 (2026-09-04, real KV
  // write-quota pressure): four milestones meant up to four extra
  // tracked events per pageview on top of the initial "view", each one
  // a KV get-then-put -- by far the largest share of daily writes
  // against Cloudflare's KV quota. Whether someone scrolled to the
  // bottom is the one milestone actually worth a counter; 25/50/75
  // were graph detail this blog never used anywhere.
  var milestones = [100];
  var fired = {};
  function checkScroll() {
    var doc = document.documentElement;
    var height = doc.scrollHeight - doc.clientHeight;
    if (height <= 0) return;
    var pct = Math.round(((window.scrollY || doc.scrollTop) / height) * 100);
    milestones.forEach(function (m) {
      if (pct >= m && !fired[m]) {
        fired[m] = true;
        send("scroll", m);
      }
    });
  }
  window.addEventListener("scroll", checkScroll, { passive: true });

  // Backlink / outbound clicks -- any link leaving this site.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    try {
      var url = new URL(a.getAttribute("href"), location.href);
      if (url.origin !== location.origin) send("outbound", url.hostname);
    } catch (err) { /* relative/invalid href, ignore */ }
  });

  // Share/repost button clicks -- any element marked data-track="share".
  // Handles the actual share action too (native share sheet where
  // available, clipboard-copy fallback elsewhere), not just the log.
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest('[data-track="share"]');
    if (!el) return;
    send("share", location.pathname);

    var url = location.href;
    var title = document.title;
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () { /* user cancelled, ignore */ });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        var original = el.textContent;
        el.textContent = "Link copied!";
        setTimeout(function () { el.textContent = original; }, 1800);
      }).catch(function () {});
    }
  });
})();
