document.addEventListener("DOMContentLoaded", function () {
  var nav = document.querySelector(".site-nav");
  var toggle = nav && nav.querySelector(".nav-toggle");
  if (!nav || !toggle) return;

  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("nav-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  nav.querySelectorAll(".nav-links a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
});
