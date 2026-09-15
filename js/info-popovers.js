// Info-button popovers -- ported from the extension's own
// nycWireInfoButtons() (onboarding.js/options.js). Click toggles a
// popover open, closing any other one already open; clicking anywhere
// else on the page closes it too.
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".info-wrap").forEach(function (wrap) {
    var btn = wrap.querySelector(".info-btn");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      var isOpen = wrap.classList.contains("info-open");
      document.querySelectorAll(".info-wrap.info-open").forEach(function (w) {
        w.classList.remove("info-open");
      });
      if (!isOpen) wrap.classList.add("info-open");
    });
  });
  document.addEventListener("click", function () {
    document.querySelectorAll(".info-wrap.info-open").forEach(function (w) {
      w.classList.remove("info-open");
    });
  });
});
