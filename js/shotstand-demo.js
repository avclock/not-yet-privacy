// The Shotstand page's live demo: a small App Store set drawn by the
// app's own engine (js/shotstand-engine.js), so every frame, shadow,
// gradient, and headline here is what the app itself draws. Pick a
// device, a look, a palette, or type a headline; drag a device to move
// it. Until the visitor touches anything, the palette changes now and
// then on its own while the demo is on screen.
(function () {
  "use strict";
  var root = document.getElementById("ss-demo");
  if (!root || typeof drawScene !== "function") return;
  var canvas = root.querySelector(".ss-canvas");
  var hint = root.querySelector(".ss-hint");
  var input = root.querySelector("#ss-head");
  var IMG = root.getAttribute("data-images") || "";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var SETS = {
    iphone: { target: "iphone-69", n: 3, label: "iPhone", shots: ["phone-edit", "phone-bg", "phone-export", "phone-device"] },
    ipad: { target: "ipad-13", n: 3, label: "iPad", shots: ["ipad-edit", "ipad-bg", "ipad-export"] },
    mac: { target: "mac", n: 2, label: "Mac", shots: ["mac-edit", "mac-bg", "mac-export"] },
    watch: { target: "watch-ultra", n: 3, label: "Apple Watch", shots: ["watch-rings", "watch-timer", "watch-list"] }
  };
  // Each look is a row of [layout, which screenshots] per slide.
  var LOOKS = {
    rising: [["hero", [0]], ["hero", [1]], ["hero", [2]]],
    turned: [["turn-right", [0]], ["float", [1]], ["turn-left", [2]]],
    across: [["spread", [0]], ["partner", []], ["duo", [1, 2]]],
    pair: [["duo", [0, 1]], ["duo", [2, 0]], ["duo", [1, 2]]]
  };
  var HEADS = [null, "Drag, pinch, *done*.", "Every size, *one tap*."];
  var SUBS = ["Device frames, headlines, and backgrounds.", "Everything snaps into place.", "iPhone, iPad, Mac, and Apple Watch."];
  var DEMO_PALETTES = ["sky", "calm", "violet", "mint", "peach", "lagoon", "dusk", "night"];

  var state = { device: "iphone", look: "rising", palette: "sky", grain: false };
  var ids = {}, ready = false, raf = 0, touched = false, visible = false, risen = false;

  function palette(id) { return PALETTES.filter(function (p) { return p.id === id; })[0] || PALETTES[0]; }
  function headline() { return (input && input.value.trim()) || "Screenshots that *sell* your app."; }
  function ease(p) { return 1 - Math.pow(1 - p, 3); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function loadShots() {
    var names = [];
    Object.keys(SETS).forEach(function (k) { names = names.concat(SETS[k].shots); });
    return Promise.all(names.map(function (n) {
      return addShot(IMG + n + ".jpg", n, true).then(function (id) { ids[n] = id; });
    }));
  }

  function build() {
    var set = SETS[state.device], pal = palette(state.palette);
    project = blankProject();
    project.target = set.target;
    project.bg.colors = pal.colors.slice(); project.bg.palette = pal.id;
    project.style.accent = pal.accent;
    if (state.grain) project.bg.texture = "grain";
    var rows = LOOKS[state.look].slice(0, set.n);
    // A partner slide needs the slide before it to span; on the Mac's
    // two slides the last row may be cut, so it falls back to Rising.
    if (rows[rows.length - 1][0] === "spread") rows[rows.length - 1] = ["hero", [2]];
    rows.forEach(function (r) {
      project.slots.push(newSlot(r[0], r[1].map(function (k) { return ids[set.shots[k % set.shots.length]] || null; })));
    });
    rows.forEach(function (r, i) {
      var slot = project.slots[i];
      if (r[0] === "partner") placeCaption(slot);
      else applyLayout(slot, r[0], r[0] !== "spread");
      var cap = ensureCaption(slot);
      cap.head.text = i === 0 ? headline() : HEADS[i];
      cap.sub.text = SUBS[i];
    });
    describe();
  }

  function describe() {
    canvas.setAttribute("aria-label", "A live preview of " + SETS[state.device].n + " App Store screenshots on " + SETS[state.device].label +
      ", " + palette(state.palette).label + " background. Headline: " + headline().replace(/\*/g, ""));
  }

  var dpr = 1;
  function size() {
    var set = SETS[state.device], t = TARGETS[set.target];
    var cssW = canvas.parentNode.clientWidth - parseFloat(getComputedStyle(canvas.parentNode).paddingLeft) * 2;
    var cssH = Math.round(cssW * t.h / (t.w * set.n));
    // Wide Mac slides would make a thin strip; keep a usable height.
    cssH = Math.max(cssH, Math.min(320, cssW * 0.6));
    canvas.style.height = cssH + "px";
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  function draw() {
    if (!ready) return;
    var t = target(), n = project.slots.length, g = canvas.getContext("2d");
    var k = Math.min(canvas.height / t.h, canvas.width / (t.w * n));
    var ox = (canvas.width - t.w * n * k) / 2, oy = (canvas.height - t.h * k) / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(k, 0, 0, k, ox, oy);
    drawScene(g, k, [0, n * t.w]);
    view2scene.k = k; view2scene.ox = ox; view2scene.oy = oy;
  }
  var view2scene = { k: 1, ox: 0, oy: 0 };

  // Devices rise into place, one after another.
  function rise() {
    cancelAnimationFrame(raf);
    if (reduce) { draw(); return; }
    var devs = project.items.filter(function (d) { return d.type === "device"; });
    var to = devs.map(function (d) { return d.cy; });
    var t0 = performance.now(), dur = 720, step = 90;
    (function frame(now) {
      var done = true;
      devs.forEach(function (d, i) {
        var p = clamp01((now - t0 - i * step) / dur);
        if (p < 1) done = false;
        d.cy = to[i] + (1 - ease(p)) * 0.5;
      });
      draw();
      if (!done) raf = requestAnimationFrame(frame);
    })(t0);
  }
  // The background slides from one palette to the next.
  function blendTo(id) {
    var from = project.bg.colors.slice(), pal = palette(id);
    state.palette = id;
    project.bg.palette = id; project.style.accent = pal.accent;
    describe(); syncButtons();
    cancelAnimationFrame(raf);
    if (reduce) { project.bg.colors = pal.colors.slice(); draw(); return; }
    var t0 = performance.now(), dur = 520;
    (function frame(now) {
      var p = ease(clamp01((now - t0) / dur));
      project.bg.colors = p < 1 ? [mixHex(from[0], pal.colors[0], p), mixHex(from[1], pal.colors[1], p)] : pal.colors.slice();
      draw();
      if (p < 1) raf = requestAnimationFrame(frame);
    })(t0);
  }

  function syncButtons() {
    root.querySelectorAll("[data-device]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-device") === state.device)); });
    root.querySelectorAll("[data-look]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-look") === state.look)); });
    root.querySelectorAll("[data-pal]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-pal") === state.palette)); });
  }
  function interacted() {
    if (touched) return;
    touched = true;
    if (hint) hint.classList.add("gone");
  }

  // Palette swatches come from the engine's own list.
  var sw = root.querySelector(".ss-swatches");
  DEMO_PALETTES.forEach(function (id) {
    var p = palette(id), b = document.createElement("button");
    b.type = "button"; b.className = "ss-swatch"; b.setAttribute("data-pal", id);
    b.setAttribute("aria-label", p.label); b.title = p.label;
    b.style.background = "linear-gradient(135deg," + p.colors[0] + "," + p.colors[1] + ")";
    sw.appendChild(b);
  });

  root.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !ready) return;
    if (b.hasAttribute("data-device")) { interacted(); state.device = b.getAttribute("data-device"); syncButtons(); build(); size(); rise(); }
    else if (b.hasAttribute("data-look")) { interacted(); state.look = b.getAttribute("data-look"); syncButtons(); build(); rise(); }
    else if (b.hasAttribute("data-pal")) { interacted(); blendTo(b.getAttribute("data-pal")); }
  });
  var grain = root.querySelector("#ss-grain");
  if (grain) grain.addEventListener("change", function () {
    interacted(); state.grain = grain.checked;
    if (state.grain) project.bg.texture = "grain"; else delete project.bg.texture;
    draw();
  });
  if (input) input.addEventListener("input", function () {
    interacted();
    var cap = roleText(project.slots[0].id, "head");
    if (cap) { cap.text = headline(); describe(); draw(); }
  });

  // Drag a device around its slide.
  var drag = null;
  function scenePoint(e) {
    var r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) * dpr - view2scene.ox) / view2scene.k, ((e.clientY - r.top) * dpr - view2scene.oy) / view2scene.k];
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (!ready) return;
    var p = scenePoint(e), t = target(), hit = null;
    for (var k = project.items.length - 1; k >= 0; k--) {
      var it = project.items[k];
      if (it.type === "device" && inPoly(p, deviceQuad(it, t.w, t.h))) { hit = it; break; }
    }
    if (!hit) return;
    interacted();
    cancelAnimationFrame(raf);
    drag = { dev: hit, x: p[0], y: p[1], dx: hit.dx, cy: hit.cy, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var p = scenePoint(e), t = target();
    drag.dev.dx = drag.dx + (p[0] - drag.x) / t.w;
    drag.dev.cy = Math.max(0.05, Math.min(1.3, drag.cy + (p[1] - drag.y) / t.h));
    draw();
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null; canvas.classList.remove("dragging");
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  // Now and then, a new palette, until the visitor takes over.
  setInterval(function () {
    if (touched || !visible || reduce || drag || document.hidden) return;
    var i = DEMO_PALETTES.indexOf(state.palette);
    blendTo(DEMO_PALETTES[(i + 1) % DEMO_PALETTES.length]);
  }, 4200);

  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { size(); draw(); }, 120);
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && ready && !risen) { risen = true; rise(); }
    }, { threshold: 0.25 }).observe(canvas);
  } else visible = true;

  loadShots().then(function () {
    ready = true;
    build(); size(); syncButtons();
    root.classList.add("ss-ready");
    if (visible) { risen = true; rise(); } else draw();
  });
})();
