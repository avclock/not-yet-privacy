// App previews: device tabs and a closer look at any screenshot.
// Without JavaScript every device's screenshots show stacked under
// their own heading, and each one links straight to its full-size
// image, so nothing here is required to see them.
(function () {
  var section = document.getElementById("previews");
  if (!section) return;

  // ---- Device tabs ----
  var tabs = Array.prototype.slice.call(section.querySelectorAll(".preview-tab"));
  var groups = Array.prototype.slice.call(section.querySelectorAll(".preview-group"));
  var tabList = section.querySelector(".preview-tabs");
  if (tabList && tabs.length) {
    tabList.hidden = false;
    section.classList.add("previews-tabbed");
    function show(device, focus) {
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-device") === device;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      groups.forEach(function (g) { g.hidden = g.getAttribute("data-device") !== device; });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { show(t.getAttribute("data-device")); });
      t.addEventListener("keydown", function (e) {
        var step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        var next = tabs[(i + step + tabs.length) % tabs.length];
        show(next.getAttribute("data-device"), true);
      });
    });
    show(tabs[0].getAttribute("data-device"));
  }

  // ---- Strip arrows ----
  groups.forEach(function (g) {
    var strip = g.querySelector(".preview-strip");
    g.querySelectorAll(".preview-nav").forEach(function (b) {
      b.hidden = false;
      b.addEventListener("click", function () {
        var dir = b.classList.contains("next") ? 1 : -1;
        strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: "smooth" });
      });
    });
  });

  // ---- A closer look ----
  var dialog = document.getElementById("preview-lightbox");
  if (!dialog || typeof dialog.showModal !== "function") return;
  var img = dialog.querySelector("img");
  var caption = dialog.querySelector(".preview-lightbox-caption");
  var count = dialog.querySelector(".preview-lightbox-count");
  var current = [], index = 0;

  function render() {
    var a = current[index];
    var thumb = a.querySelector("img");
    img.src = a.getAttribute("href");
    img.alt = thumb.alt;
    dialog.setAttribute("data-device", a.closest(".preview-group").getAttribute("data-device"));
    caption.textContent = thumb.alt;
    count.textContent = (index + 1) + " of " + current.length;
  }
  function step(d) { index = (index + d + current.length) % current.length; render(); }

  section.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".preview-shot");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    current = Array.prototype.slice.call(a.closest(".preview-strip").querySelectorAll(".preview-shot"));
    index = current.indexOf(a);
    render();
    dialog.showModal();
  });
  dialog.querySelector(".preview-lightbox-close").addEventListener("click", function () { dialog.close(); });
  dialog.querySelector(".preview-lightbox-prev").addEventListener("click", function () { step(-1); });
  dialog.querySelector(".preview-lightbox-next").addEventListener("click", function () { step(1); });
  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });
  // A click on the dimmed backdrop (the dialog itself, not its contents) closes it.
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
})();
