// Homepage "Quiet Place" pinboard demo -- a genuinely interactive
// mock of the real premium pinboard feature (pinboard.js in the
// extension: drag-to-reposition via Pointer Events, backup/restore).
// This is a marketing-site illustration, not the real feature: state
// lives in this browser's localStorage only, per visitor, and never
// touches the extension or any server.
(function () {
  "use strict";

  var surface = document.getElementById("pinboard-surface");
  if (!surface) return;

  var POS_KEY = "notyet-pinboard-positions-v1";
  var BORDER_KEY = "notyet-pinboard-border-v1";
  var pins = Array.prototype.slice.call(surface.querySelectorAll(".pin-photo"));

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private browsing, etc -- fine to no-op */ }
  }

  // Snapshot each pin's original HTML-authored position BEFORE
  // restoring any saved one, so "Reset layout" has the true default
  // to go back to rather than whatever was last saved.
  var defaults = {};
  pins.forEach(function (pin) {
    defaults[pin.getAttribute("data-pin")] = { left: pin.style.left, top: pin.style.top };
  });

  // ---- Restore saved positions (if any) ----
  var positions = readJSON(POS_KEY, {});
  pins.forEach(function (pin) {
    var id = pin.getAttribute("data-pin");
    var saved = positions[id];
    if (saved) {
      pin.style.left = saved.x + "%";
      pin.style.top = saved.y + "%";
    }
  });

  // ---- Drag to reposition (Pointer Events cover mouse, touch, pen) ----
  var active = null;
  var grabDX = 0, grabDY = 0;

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function positionFromPointer(clientX, clientY) {
    var rect = surface.getBoundingClientRect();
    var pinRect = active.getBoundingClientRect();
    var x = ((clientX - grabDX - rect.left) / rect.width) * 100;
    var y = ((clientY - grabDY - rect.top) / rect.height) * 100;
    var maxX = 100 - (pinRect.width / rect.width) * 100;
    var maxY = 100 - (pinRect.height / rect.height) * 100;
    return { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) };
  }

  function savePosition(pin) {
    var id = pin.getAttribute("data-pin");
    positions[id] = {
      x: parseFloat(pin.style.left) || 0,
      y: parseFloat(pin.style.top) || 0
    };
    writeJSON(POS_KEY, positions);
  }

  pins.forEach(function (pin) {
    pin.addEventListener("pointerdown", function (e) {
      active = pin;
      pin.classList.add("dragging");
      var rect = pin.getBoundingClientRect();
      grabDX = e.clientX - rect.left;
      grabDY = e.clientY - rect.top;
      try { pin.setPointerCapture(e.pointerId); } catch (err) { /* older browsers -- drag still works via move/up on the element */ }
      e.preventDefault();
    });

    pin.addEventListener("pointermove", function (e) {
      if (active !== pin) return;
      var p = positionFromPointer(e.clientX, e.clientY);
      pin.style.left = p.x + "%";
      pin.style.top = p.y + "%";
    });

    function endDrag() {
      if (active !== pin) return;
      pin.classList.remove("dragging");
      savePosition(pin);
      active = null;
    }
    pin.addEventListener("pointerup", endDrag);
    pin.addEventListener("pointercancel", endDrag);

    // Keyboard nudge, for anyone not using a mouse/touch -- arrow keys
    // move the pin in 4% steps, same clamped bounds as a drag.
    pin.addEventListener("keydown", function (e) {
      var step = 4;
      var dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else return;
      e.preventDefault();
      var rect = surface.getBoundingClientRect();
      var pinRect = pin.getBoundingClientRect();
      var maxX = 100 - (pinRect.width / rect.width) * 100;
      var maxY = 100 - (pinRect.height / rect.height) * 100;
      var curX = parseFloat(pin.style.left) || 0;
      var curY = parseFloat(pin.style.top) || 0;
      pin.style.left = clamp(curX + dx, 0, maxX) + "%";
      pin.style.top = clamp(curY + dy, 0, maxY) + "%";
      savePosition(pin);
    });
  });

  // ---- Reset layout: clear saved positions, restore the snapshot
  // taken above. ----
  var resetBtn = document.getElementById("pinboard-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      positions = {};
      writeJSON(POS_KEY, positions);
      pins.forEach(function (pin) {
        var d = defaults[pin.getAttribute("data-pin")];
        if (d) { pin.style.left = d.left; pin.style.top = d.top; }
      });
    });
  }

  // ---- Border style picker ----
  var swatches = Array.prototype.slice.call(document.querySelectorAll(".border-swatch"));
  function applyBorder(style) {
    surface.classList.remove("style-polaroid", "style-rounded", "style-torn");
    if (style !== "polaroid") surface.classList.add("style-" + style);
    swatches.forEach(function (btn) {
      var isActive = btn.getAttribute("data-border") === style;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }
  var savedBorder = localStorage.getItem(BORDER_KEY);
  if (savedBorder) applyBorder(savedBorder);
  swatches.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var style = btn.getAttribute("data-border");
      applyBorder(style);
      try { localStorage.setItem(BORDER_KEY, style); } catch (e) {}
    });
  });

  // ---- Mood chips: demo-only toggle, no persistence needed -- this
  // just keeps the widget from looking clickable while doing nothing. ----
  var moodChips = document.querySelectorAll(".mock-mood-chip");
  moodChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      moodChips.forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
    });
  });
})();
