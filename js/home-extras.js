// ============================================================
// Homepage extras:
//   - The comparison: a countdown you can wait out, a snooze you
//     can tap through, and Not Yet's retyped code, side by side and
//     working.
//   - The recap mock counts up and its bars grow when scrolled to.
// Nothing here is required to read the page: without JavaScript the
// comparison cards show their text and the recap shows its numbers.
// All motion is skipped under prefers-reduced-motion.
// ============================================================
(function () {
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var track = window.nyTrack || function () {};
  var used = false;
  function trackOnce() { if (!used) { used = true; track("demo", "compare"); } }

  // ---- Countdown card: drains, unlocks, starts again --------------
  (function countdown() {
    var card = document.getElementById("cmp-countdown");
    if (!card) return;
    var fill = card.querySelector(".cmp-bar-fill"), label = card.querySelector(".cmp-count"), btn = card.querySelector(".cmp-btn");
    var total = 10, left = total, timer = null;
    function render() {
      fill.style.transform = "scaleX(" + (left / total) + ")";
      label.textContent = left > 0 ? left + "s" : "0s";
      btn.disabled = left > 0;
      btn.textContent = left > 0 ? "Continue to checkout" : "Continue to checkout";
    }
    function start() {
      clearInterval(timer);
      left = total;
      render();
      if (reduceMotion) return;
      timer = setInterval(function () {
        left -= 1;
        render();
        if (left <= 0) { clearInterval(timer); setTimeout(start, 2400); }
      }, 1000);
    }
    btn.addEventListener("click", function () { trackOnce(); start(); });
    // Only run while it's on screen.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) start(); else clearInterval(timer); });
      }).observe(card);
    } else {
      start();
    }
  })();

  // ---- Snooze card: one tap and it's gone --------------------------
  (function snooze() {
    var card = document.getElementById("cmp-snooze");
    if (!card) return;
    var btn = card.querySelector(".cmp-btn"), out = card.querySelector(".cmp-out");
    btn.addEventListener("click", function () {
      trackOnce();
      out.textContent = "Snoozed. You're back at checkout.";
      btn.disabled = true;
      setTimeout(function () { out.textContent = ""; btn.disabled = false; }, 2600);
    });
  })();

  // ---- Not Yet card: retype a fresh code ---------------------------
  (function code() {
    var card = document.getElementById("cmp-code");
    if (!card) return;
    var codeEl = card.querySelector(".cmp-code"), input = card.querySelector("input"), btn = card.querySelector(".cmp-btn"), out = card.querySelector(".cmp-out");
    // The extension's own character set (crypto-utils.js): mixed
    // case, no look-alikes, case-sensitive. The app's default code is
    // 40 characters; the demo uses 8 so it fits.
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    var current = "";
    function fresh() {
      var s = "";
      var buf = new Uint32Array(8);
      (window.crypto || window.msCrypto).getRandomValues(buf);
      for (var i = 0; i < 8; i++) s += chars[buf[i] % chars.length];
      current = s;
      codeEl.textContent = s.slice(0, 4) + " " + s.slice(4);
      input.value = "";
      btn.disabled = true;
    }
    input.addEventListener("input", function () {
      trackOnce();
      var typed = input.value.replace(/\s+/g, "");
      btn.disabled = typed !== current;
      out.textContent = typed.length >= 8 && typed !== current ? "Not quite. Check each character." : "";
    });
    btn.addEventListener("click", function () {
      out.textContent = "That took a moment of real attention. That's the point.";
      setTimeout(function () { out.textContent = ""; fresh(); }, 2600);
    });
    card.querySelector(".cmp-new").addEventListener("click", fresh);
    fresh();
  })();

  // ---- Recap mock: count up and grow when scrolled to -------------
  (function recap() {
    var mock = document.querySelector(".mock-recap");
    if (!mock || reduceMotion || !("IntersectionObserver" in window)) return;
    var nums = mock.querySelectorAll(".num[data-count]");
    mock.classList.add("recap-armed");
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      mock.classList.add("recap-play");
      nums.forEach(function (n) {
        var target = +n.getAttribute("data-count"), prefix = n.getAttribute("data-prefix") || "";
        var startT = null, dur = 1100;
        function step(t) {
          if (startT === null) startT = t;
          var p = Math.min(1, (t - startT) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          n.textContent = prefix + Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
        }
        n.textContent = prefix + "0";
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    io.observe(mock);
  })();
})();
