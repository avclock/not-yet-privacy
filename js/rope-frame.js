// Rope border -- ported from the extension's own scripts/rope-frame.js
// (fully parameterized there already, no extension globals besides the
// DOM ids, renamed here to drop the nyc- prefix). One real difference
// from that version, not just a rename: it measured against the
// viewport/document, correct for the extension since its own page IS
// the full viewport width. This site's content is a narrower centered
// column inside a wider page, so measuring against the viewport framed
// the whole browser window instead of the actual content (caught on
// first real render, not assumed) -- this version measures against the
// SVG's own parent element (.rope-frame-wrap) instead, sized to fit
// just that column.
function ropeFramePath(w, h) {
  var m = Math.max(22, Math.min(w, h) * 0.035);
  var r = Math.min(46, Math.min(w, h) * 0.11);
  var x1 = m, y1 = m, x2 = w - m, y2 = h - m;
  var cx = (x1 + x2) / 2;
  return [
    "M " + cx + " " + y1,
    "H " + (x2 - r), "A " + r + " " + r + " 0 0 1 " + x2 + " " + (y1 + r),
    "V " + (y2 - r), "A " + r + " " + r + " 0 0 1 " + (x2 - r) + " " + y2,
    "H " + (x1 + r), "A " + r + " " + r + " 0 0 1 " + x1 + " " + (y2 - r),
    "V " + (y1 + r), "A " + r + " " + r + " 0 0 1 " + (x1 + r) + " " + y1,
    "H " + cx
  ].join(" ");
}

function initRopeFrame() {
  var svg = document.getElementById("rope-frame");
  var visiblePath = document.getElementById("rope-path");
  var maskPath = document.getElementById("rope-mask-path");
  if (!svg || !visiblePath || !maskPath) return;

  var wrap = svg.parentElement;

  function measure() {
    var w = wrap.clientWidth;
    var h = wrap.scrollHeight;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("height", h);
    var d = ropeFramePath(w, h);
    visiblePath.setAttribute("d", d);
    maskPath.setAttribute("d", d);
  }

  function prefersReducedMotion() {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function showStatic() {
    maskPath.getAnimations().forEach(function (a) { a.cancel(); });
    maskPath.style.strokeDasharray = "100 0";
    maskPath.style.strokeDashoffset = "-50";
  }

  function playDraw() {
    maskPath.getAnimations().forEach(function (a) { a.cancel(); });
    if (prefersReducedMotion()) {
      showStatic();
      return;
    }
    maskPath.animate(
      [
        { strokeDasharray: "0 100", strokeDashoffset: "0" },
        { strokeDasharray: "100 0", strokeDashoffset: "-50" }
      ],
      { duration: 2800, easing: "cubic-bezier(0.33, 0, 0.2, 1)", fill: "forwards" }
    );
  }

  measure();
  requestAnimationFrame(measure);
  window.addEventListener("resize", measure);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", measure);
  // Watches the wrapper itself, not document.body -- catches both a
  // window resize AND content growing/shrinking inside it (an opened
  // <details> FAQ entry, the report form's error text appearing).
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(measure).observe(wrap);

  playDraw();
}

document.addEventListener("DOMContentLoaded", initRopeFrame);
