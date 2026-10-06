// Gentle fade-and-rise as sections scroll into view, whatever the
// device's Reduce Motion setting says. Content is visible without
// JavaScript: the hidden starting state only applies once this script
// has added the "reveal-ready" class to <html>.
(function () {
  if (!("IntersectionObserver" in window)) return;
  var els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  document.documentElement.classList.add("reveal-ready");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("revealed");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  els.forEach(function (el) { io.observe(el); });
})();
