// Chrome Premium sale: while a sale is on, swaps the regular price for
// the sale price in every element marked data-sale. The page's own text
// is the regular price, so when the sale ends (at the start of `ends`,
// the visitor's own time) everything reads $39.99 again with no edit.
// End-of-year sale 2026: $4.99 through January 1, 2027. The Payhip
// price itself is changed by hand on Payhip. The Chrome extension has
// the same sale in chrome-only/scripts/license.js (NYC_CHROME_SALE).
(function () {
  "use strict";
  var SALE = { price: "$4.99", regular: "$39.99", through: "January 1", ends: new Date(2027, 0, 2) };
  if (!SALE || Date.now() >= SALE.ends.getTime()) return;
  var nodes = document.querySelectorAll("[data-sale]");
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i], kind = el.getAttribute("data-sale");
    if (kind === "price") {
      // The element's text is the regular price, optionally with more
      // text around it: swap the number only.
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3 && n.nodeValue.indexOf(SALE.regular) !== -1) {
          n.nodeValue = n.nodeValue.replace(SALE.regular, SALE.price);
        }
      }
    } else if (kind === "note") {
      el.textContent = "End-of-year sale: " + SALE.price + " through " + SALE.through + ", then " + SALE.regular + ".";
      el.hidden = false;
    }
  }
})();
