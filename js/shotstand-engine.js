// Shotstand's drawing engine, copied unchanged from the app:
// not-yet-checkout-blocker/Shotstand/web/editor-core.js (2026-10-07).
// The Shotstand page's live demo (js/shotstand-demo.js) draws with it, so
// what visitors see is exactly what the app draws. Copy it again when the
// app's drawing changes; never edit it here.

// ============================================================
// Shotstand editor: data model, geometry, drawing.
// Shared by the iOS app (Shotstand/Shotstand/Editor/index.html) and
// the web build. build.py inlines this file, editor-ui.js, and the
// sample data into editor.html.
// ============================================================
"use strict";

// ---------------------------------------------------------------
// App Store Connect's accepted sizes. The 6.9" iPhone and 13" iPad
// sizes are the ones Apple scales down for every smaller device.
// ---------------------------------------------------------------
var TARGETS = {
  "iphone-69": { label: 'iPhone 6.9" (1320 × 2868)', w: 1320, h: 2868, device: "iphone", family: "iPhone 6.9-inch display" },
  "iphone-65": { label: 'iPhone 6.5" (1284 × 2778)', w: 1284, h: 2778, device: "iphone", family: "iPhone 6.5-inch display" },
  "iphone-65b": { label: 'iPhone 6.5" (1242 × 2688)', w: 1242, h: 2688, device: "iphone", family: "iPhone 6.5-inch display" },
  "ipad-13": { label: 'iPad 13" (2064 × 2752)', w: 2064, h: 2752, device: "ipad", family: "iPad 13-inch display" },
  "mac": { label: "Mac (2880 × 1800)", w: 2880, h: 1800, device: "mac", family: "Mac" },
  "mac-1440": { label: "Mac (1440 × 900)", w: 1440, h: 900, device: "mac", family: "Mac" },
  // iPhone Duo's two displays (App Store Connect asks for these from
  // April 2027 for apps that run on it). Premium.
  "iphone-duo-outer": { label: "iPhone Duo outer (1398 × 2034)", w: 1398, h: 2034, device: "iphone", family: "iPhone Duo outer display", duo: true },
  "iphone-duo-inner": { label: "iPhone Duo inner (2007 × 2853)", w: 2007, h: 2853, device: "iphone", family: "iPhone Duo inner display", duo: true },
  // iOS 27's App Store art: the product page header, the search result
  // image, and one 16:9 image Apple crops to both (21:9 and 3:2, so
  // `safe` keeps words inside both crops). iPhones on a wide canvas.
  // Saved as PNG with no alpha, which is what App Store Connect takes.
  // `text` scales headlines up for the short, wide header. Premium.
  "store-header": { label: "App Store header (3840 × 1646)", w: 3840, h: 1646, device: "iphone", family: "product page header", art: "header", text: 1.3 },
  "store-search": { label: "App Store search image (3840 × 2560)", w: 3840, h: 2560, device: "iphone", family: "search result image", art: "search" },
  "store-universal": { label: "Header and search in one (5244 × 2950)", w: 5244, h: 2950, device: "iphone", family: "universal header and search image", art: "universal", safe: { x: 0.08, y: 0.12 } },
  // Apple Watch: App Store Connect takes one size and scales it.
  "watch-ultra": { label: "Apple Watch Ultra 3 (422 × 514)", w: 422, h: 514, device: "watch", family: "Apple Watch" },
  "watch-46": { label: "Apple Watch Series 11 (416 × 496)", w: 416, h: 496, device: "watch", family: "Apple Watch" },
  "watch-45": { label: "Apple Watch Series 9 (396 × 484)", w: 396, h: 484, device: "watch", family: "Apple Watch" }
};

// Device geometry in units of the device's own height.
var DEVICES = {
  iphone: {
    label: "iPhone", w: 0.476, h: 1, r: 0.08, screen: { x: 0.018, y: 0.018, w: 0.44, h: 0.964, r: 0.062 },
    colors: {
      black: { label: "Black", frame: "#2B2B2E", rim: "#56565B" },
      natural: { label: "Natural", frame: "#B9B2A6", rim: "#DDD7CC" },
      white: { label: "White", frame: "#DEDCD6", rim: "#F7F6F2" },
      desert: { label: "Desert", frame: "#C4A987", rim: "#E3D0B6" }
    }, defaultColor: "black"
  },
  ipad: {
    label: "iPad", w: 0.765, h: 1, r: 0.05, screen: { x: 0.0325, y: 0.0325, w: 0.7, h: 0.935, r: 0.022 },
    colors: {
      spaceblack: { label: "Space Black", frame: "#2E2E31", rim: "#58585D" },
      silver: { label: "Silver", frame: "#CFD1D3", rim: "#EEEFF0" }
    }, defaultColor: "spaceblack"
  },
  mac: {
    label: "Mac", w: 1.58, h: 0.96, r: 0.03, screen: { x: 0.1045, y: 0.028, w: 1.371, h: 0.857, r: 0.006 },
    colors: {
      silver: { label: "Silver", frame: "#D5D7D9", rim: "#EDEEEF" },
      spaceblack: { label: "Space Black", frame: "#2F2F32", rim: "#4A4A4E" }
    }, defaultColor: "silver"
  },
  // The whole frame is the case plus a short piece of band above and
  // below it that fades out, so it reads as a watch without a wrist.
  watch: {
    label: "Watch", w: 0.64, h: 1, r: 0.15, screen: { x: 0.08, y: 0.2077, w: 0.48, h: 0.5846, r: 0.1 },
    colors: {
      jetblack: { label: "Jet Black", frame: "#1E1E21", rim: "#4C4C52", band: "#29292D" },
      silver: { label: "Silver", frame: "#D3D5D8", rim: "#F3F4F5", band: "#C3C7CD" },
      rosegold: { label: "Rose Gold", frame: "#E2C2B3", rim: "#F6E4DB", band: "#E8CFC4" },
      titanium: { label: "Natural Titanium", frame: "#B8B2A7", rim: "#DED9D0", band: "#3A3D42" }
    }, defaultColor: "jetblack"
  }
};
// A Mac with its base showing: the same lid on a taller frame, so the
// keyboard deck fits below it. Everything that sizes or places a
// device asks deviceSpec(), never DEVICES directly.
var MAC_WITH_BASE = Object.assign({}, DEVICES.mac, { h: 1.23 });
function deviceSpec(dev) { return dev.kind === "mac" && dev.base ? MAC_WITH_BASE : DEVICES[dev.kind] || DEVICES.iphone; }

// Fonts built into Apple devices work offline in the app; the web
// fonts load when there's a connection and fall back otherwise.
var FONTS = [
  { id: "system", label: "SF Pro (system)", css: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif', weights: [500, 700, 800], group: "apple" },
  { id: "newyork", label: "New York", css: 'ui-serif, "New York", Georgia, serif', weights: [400, 600, 700], group: "apple" },
  { id: "avenir", label: "Avenir Next", css: '"Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif', weights: [500, 700, 800], group: "apple" },
  { id: "futura", label: "Futura", css: 'Futura, "Century Gothic", "Trebuchet MS", sans-serif', weights: [500, 700], group: "apple" },
  { id: "didot", label: "Didot", css: 'Didot, "Bodoni 72", "Times New Roman", serif', weights: [400, 700], group: "apple" },
  { id: "georgia", label: "Georgia", css: 'Georgia, "Times New Roman", serif', weights: [400, 700], group: "apple" },
  { id: "rockwell", label: "Rockwell", css: 'Rockwell, "Courier New", serif', weights: [400, 700], group: "apple" },
  { id: "snell", label: "Snell Roundhand (script)", css: '"Snell Roundhand", "Apple Chancery", cursive', weights: [400, 700], group: "apple" },
  { id: "optima", label: "Optima", css: 'Optima, Candara, "Segoe UI", sans-serif', weights: [400, 700], group: "apple" },
  { id: "gillsans", label: "Gill Sans", css: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif', weights: [400, 600], group: "apple" },
  { id: "baskerville", label: "Baskerville", css: 'Baskerville, "Baskerville Old Face", Georgia, serif', weights: [400, 600, 700], group: "apple" },
  { id: "bodoni", label: "Bodoni 72", css: '"Bodoni 72", "Bodoni MT", Didot, serif', weights: [400, 700], group: "apple" },
  { id: "palatino", label: "Palatino", css: 'Palatino, "Palatino Linotype", Georgia, serif', weights: [400, 700], group: "apple" },
  { id: "typewriter", label: "American Typewriter", css: '"American Typewriter", "Courier New", monospace', weights: [400, 600], group: "apple" },
  { id: "chalkboard", label: "Chalkboard (hand drawn)", css: '"Chalkboard SE", "Comic Sans MS", cursive', weights: [400, 700], group: "apple" },
  { id: "noteworthy", label: "Noteworthy (handwritten)", css: 'Noteworthy, "Segoe Print", cursive', weights: [400, 700], group: "apple" },
  { id: "mono", label: "SF Mono", css: 'ui-monospace, "SF Mono", Menlo, monospace', weights: [500, 700], group: "apple" },
  { id: "fraunces", label: "Fraunces", css: '"Fraunces", Georgia, serif', weights: [400, 600, 700], group: "web" },
  { id: "instrument", label: "Instrument Serif", css: '"Instrument Serif", Georgia, serif', weights: [400], group: "web" },
  { id: "dmserif", label: "DM Serif Display", css: '"DM Serif Display", Georgia, serif', weights: [400], group: "web" },
  { id: "manrope", label: "Manrope", css: '"Manrope", Arial, sans-serif', weights: [500, 700, 800], group: "web" },
  { id: "bricolage", label: "Bricolage Grotesque", css: '"Bricolage Grotesque", Arial, sans-serif', weights: [500, 700, 800], group: "web" },
  { id: "outfit", label: "Outfit", css: '"Outfit", Arial, sans-serif', weights: [500, 700, 800], group: "web" },
  { id: "yellowtail", label: "Yellowtail (script)", css: '"Yellowtail", cursive', weights: [400], group: "web" }
];
function fontById(id) { for (var i = 0; i < FONTS.length; i++) if (FONTS[i].id === id) return FONTS[i]; return FONTS[0]; }
function weightFor(font, w) { return font.weights.indexOf(w) >= 0 ? w : font.weights.reduce(function (best, x) { return Math.abs(x - w) < Math.abs(best - w) ? x : best; }, font.weights[0]); }

var PALETTES = [
  { id: "calm", label: "Calm", colors: ["#EFE8DC", "#CCD6DB"], accent: "#5467A8" },
  { id: "sand", label: "Sand", colors: ["#F4EBDC", "#DDBF98"], accent: "#9A5B2E" },
  { id: "mint", label: "Mint", colors: ["#E3F4EC", "#9CCFBF"], accent: "#1F7A64" },
  { id: "blush", label: "Blush", colors: ["#FBE6E6", "#E4AFC0"], accent: "#B23E62" },
  { id: "sky", label: "Sky", colors: ["#7FB2FF", "#3558E8"], accent: "#FFE08A" },
  { id: "violet", label: "Violet", colors: ["#B69CFF", "#5B3BD6"], accent: "#FFD4F0" },
  { id: "dusk", label: "Dusk", colors: ["#2A2E4B", "#9A6E8F"], accent: "#FFC7A1" },
  { id: "night", label: "Night", colors: ["#15171C", "#343B4A"], accent: "#9FB6FF" },
  { id: "peach", label: "Peach", colors: ["#FFE6D6", "#F5A88A"], accent: "#A8432A" },
  { id: "citrus", label: "Citrus", colors: ["#FFF7CF", "#FFC85A"], accent: "#9A4E14" },
  { id: "lagoon", label: "Lagoon", colors: ["#CDF3F0", "#56A8CC"], accent: "#0F4C75" },
  { id: "mist", label: "Mist", colors: ["#F5F5F3", "#D8DADB"], accent: "#2E2C28" },
  { id: "forest", label: "Forest", colors: ["#1E3A2C", "#557F60"], accent: "#F2D58A" },
  { id: "ocean", label: "Ocean", colors: ["#0B1E3F", "#2F70B8"], accent: "#9FE3FF" },
  { id: "plum", label: "Plum", colors: ["#341C3A", "#9A4E7C"], accent: "#FFD1E8" },
  { id: "ember", label: "Ember", colors: ["#2A1414", "#B5532F"], accent: "#FFD7A1" }
];

// Layouts. Sizes are fractions of the screen's height; the device
// families' shapes work out so the same numbers fit all of them. dx is
// the device center in screen widths from this screen's left edge
// (1.0 is the edge shared with the next screen).
var LAYOUTS = [
  { id: "hero", label: "Rising", caption: "top", devices: [{ dx: 0.5, cy: 0.74, size: 0.84 }] },
  { id: "float", label: "Floating", caption: "top", devices: [{ dx: 0.5, cy: 0.645, size: 0.64 }] },
  { id: "drop", label: "From top", caption: "bottom", devices: [{ dx: 0.5, cy: 0.27, size: 0.84 }] },
  { id: "turn-left", label: "Turn left", caption: "top", devices: [{ dx: 0.5, cy: 0.66, size: 0.7, yaw: 28, pitch: 6 }] },
  { id: "turn-right", label: "Turn right", caption: "top", devices: [{ dx: 0.5, cy: 0.66, size: 0.7, yaw: -28, pitch: 6 }] },
  { id: "duo", label: "Pair", caption: "top", devices: [{ dx: 0.34, cy: 0.69, size: 0.6, roll: -7, shot: 1 }, { dx: 0.64, cy: 0.73, size: 0.64, roll: 5, shot: 0 }] },
  { id: "spread", label: "Across two", caption: "top", spansNext: true, devices: [{ dx: 1.0, cy: 0.69, size: 0.78, roll: -9 }] },
  { id: "lying", label: "Lying across", caption: "top", spansNext: true, devices: [{ dx: 1.0, cy: 0.67, size: 0.9, roll: -82 }] },
  // App Store art only (headers and search images): three phones, the
  // middle one in front. `spread` places the side phones by the slide's
  // height, so they sit the same on 21:9, 16:9, and 3:2.
  { id: "trio", label: "Three phones", caption: "top", art: true, devices: [{ dx: 0.5, cy: 0.8, size: 0.72, roll: -8, shot: 1, spread: -1 }, { dx: 0.5, cy: 0.8, size: 0.72, roll: 8, shot: 2, spread: 1 }, { dx: 0.5, cy: 0.76, size: 0.8, shot: 0 }] },
  { id: "text", label: "Title card", caption: "center", devices: [], icon: true },
  { id: "full", label: "Full screen", caption: "none", devices: [] },
  { id: "blank", label: "Blank", caption: "none", devices: [] }
];
var LAYOUT_PARTNER = { id: "partner", label: "Continued", caption: "top", devices: [] };
function layoutById(id) {
  if (id === "partner") return LAYOUT_PARTNER;
  for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === id) return LAYOUTS[i];
  return LAYOUTS[0];
}

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
var uid = (function () { var n = Date.now() % 1000000; return function (p) { n += 1; return (p || "i") + n.toString(36); }; })();
var shots = {};          // id -> { src, img, w, h, name, sample }
var project = null;      // serializable, no images
var sel = { slot: null, item: null };

function blankProject() {
  return {
    v: 3,
    target: "iphone-69",
    bg: { mode: "gradient", colors: PALETTES[0].colors.slice(), angle: 115, span: true, image: null, glow: true, palette: "calm" },
    style: { font: "system", weight: 800, headSize: 8.6, subSize: 4.0, auto: true, color: "#2E2C28", accent: "#5467A8", align: "center" },
    slots: [],
    items: []
  };
}

function addShot(src, name, sample) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var id = uid("s");
      shots[id] = { src: src, img: img, w: img.naturalWidth, h: img.naturalHeight, name: name || "Image", sample: !!sample };
      resolve(id);
    };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

// ---------------------------------------------------------------
// Color helpers: OKLab mixing keeps gradients bright instead of
// passing through gray; contrast picks readable text.
// ---------------------------------------------------------------
function hexToRgb(hex) {
  var h = String(hex || "#000").replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function fromLin(c) { c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(c * 255))); }
function rgbToOklab(rgb) {
  var r = toLin(rgb[0]), g = toLin(rgb[1]), b = toLin(rgb[2]);
  var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToRgb(lab) {
  var l = Math.pow(lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2], 3);
  var m = Math.pow(lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2], 3);
  var s = Math.pow(lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2], 3);
  return [fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
}
function mixHex(a, b, t) {
  var A = rgbToOklab(hexToRgb(a)), B = rgbToOklab(hexToRgb(b));
  var ca = Math.hypot(A[1], A[2]), cb = Math.hypot(B[1], B[2]);
  var ha = Math.atan2(A[2], A[1]), hb = Math.atan2(B[2], B[1]);
  // A near-gray end (a cream, a stone) has no real hue to travel
  // along, so mix straight in OKLab. Borrowing the other end's hue
  // instead tinted the cream end blue.
  if (ca < 0.04 || cb < 0.04) {
    var mixed = oklabToRgb([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
    return "rgb(" + mixed[0] + "," + mixed[1] + "," + mixed[2] + ")";
  }
  var dh = hb - ha; if (dh > Math.PI) dh -= 2 * Math.PI; if (dh < -Math.PI) dh += 2 * Math.PI;
  var L = A[0] + (B[0] - A[0]) * t, C = ca + (cb - ca) * t, H = ha + dh * t;
  var rgb = oklabToRgb([L, C * Math.cos(H), C * Math.sin(H)]);
  return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
}
function luminance(hex) { var c = hexToRgb(hex); return 0.2126 * toLin(c[0]) + 0.7152 * toLin(c[1]) + 0.0722 * toLin(c[2]); }
function contrast(a, b) { var la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
function autoInk() {
  var bg = project.bg;
  if (bg.mode === "image") return "#FFFFFF";
  var cols = bg.mode === "solid" ? [bg.colors[0]] : bg.colors;
  var dark = "#23211D", light = "#FFFFFF", wd = Infinity, wl = Infinity;
  cols.forEach(function (c) { wd = Math.min(wd, contrast(dark, c)); wl = Math.min(wl, contrast(light, c)); });
  return wd >= wl ? dark : light;
}
function hexWithAlpha(hex, a) { var c = hexToRgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
function shade(hex, amt) {
  var c = hexToRgb(hex);
  var f = function (v) { return Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))); };
  return "rgb(" + f(c[0]) + "," + f(c[1]) + "," + f(c[2]) + ")";
}

// ---------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------
function target() { return TARGETS[project.target] || TARGETS["iphone-69"]; }
function slotIndex(id) { for (var i = 0; i < project.slots.length; i++) if (project.slots[i].id === id) return i; return -1; }
function slotById(id) { var i = slotIndex(id); return i < 0 ? null : project.slots[i]; }
function itemById(id) { for (var i = 0; i < project.items.length; i++) if (project.items[i].id === id) return project.items[i]; return null; }
function itemsOf(slotId, type) { return project.items.filter(function (it) { return it.home === slotId && (!type || it.type === type); }); }
function roleText(slotId, role) { for (var i = 0; i < project.items.length; i++) { var it = project.items[i]; if (it.type === "text" && it.home === slotId && it.role === role) return it; } return null; }

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawCover(ctx, img, x, y, w, h) {
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  var s = Math.max(w / iw, h / ih);
  ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
}

// ---------------------------------------------------------------
// Devices, drawn flat at a pixel height and cached.
// ---------------------------------------------------------------
var flatCache = new Map();
// Cached device pictures are held to a pixel budget (about 130 MB),
// least recently used out first. A count alone let a few zoomed-in
// devices, each tens of megabytes, pile up: phones run out of canvas
// memory and the app gets killed.
var CACHE_BUDGET = 32e6, cachePx = 0;
function cacheAdd(entry, px) {
  entry.px += px; cachePx += px;
  var it = flatCache.keys();
  while (cachePx > CACHE_BUDGET && flatCache.size > 1) {
    var k = it.next().value, old = flatCache.get(k);
    if (old === entry) continue;
    flatCache.delete(k); cachePx -= old.px;
  }
}
function shotKey(dev) {
  return [dev.shot || "-", dev.fit || "cover", Math.round((dev.zoom || 1) * 1000), Math.round((dev.sx || 0) * 1000), Math.round((dev.sy || 0) * 1000), dev.fill || "#000000", dev.cleanBar ? 1 : 0].join(",");
}
function flatDevice(dev, H) {
  var spec = deviceSpec(dev);
  var bucket = Math.max(64, Math.min(4200, Math.ceil(H / 64) * 64));
  var key = [dev.kind, dev.color, shotKey(dev), dev.island === false ? 0 : 1, dev.base ? 1 : 0, bucket].join("|");
  var hit = flatCache.get(key);
  if (hit) { flatCache.delete(key); flatCache.set(key, hit); return hit; }
  var pad = Math.ceil(bucket * 0.01);
  var c = document.createElement("canvas");
  c.width = Math.ceil(spec.w * bucket) + pad * 2;
  c.height = Math.ceil(spec.h * bucket) + pad * 2;
  var ctx = c.getContext("2d");
  ctx.translate(pad, pad);
  drawDeviceFrame(ctx, dev, bucket);
  var entry = { canvas: c, pad: pad, H: bucket, warps: new Map(), px: 0 };
  flatCache.set(key, entry);
  cacheAdd(entry, c.width * c.height);
  return entry;
}

// The screenshot inside the screen: Fill (cover) or Fit (contain),
// then zoom and an offset in screen widths/heights. The gaps a Fit or
// zoomed-out shot leaves show the device's fill color.
function drawScreen(ctx, dev, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  var shot = dev.shot && shots[dev.shot];
  if (shot) {
    ctx.fillStyle = dev.fill || "#000000";
    ctx.fillRect(x, y, w, h);
    var iw = shot.w, ih = shot.h;
    var base = dev.fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih);
    var s = base * (dev.zoom || 1);
    var dw = iw * s, dh = ih * s;
    var cx = x + w / 2 + (dev.sx || 0) * w, cy = y + h / 2 + (dev.sy || 0) * h;
    ctx.drawImage(shot.img, cx - dw / 2, cy - dh / 2, dw, dh);
    if (dev.cleanBar && (dev.kind === "iphone" || dev.kind === "ipad")) drawStatusBar(ctx, dev, shot, x, y, w, h);
  } else {
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#3A3F52"); g.addColorStop(1, "#1C1E27");
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "600 " + Math.round(w * 0.07) + "px " + fontById("system").css;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Add a screenshot", x + w / 2, y + h / 2);
  }
  ctx.restore();
}

// A tidy status bar over the screenshot's own: 9:41, full signal, full
// Wi-Fi, a full battery, on the color the screenshot already has up
// there, so it blends in. iPhone and iPad only.
function shotTopColor(shot) {
  if (shot.top) return shot.top;
  var c = document.createElement("canvas"); c.width = 24; c.height = 3;
  var x = c.getContext("2d");
  x.drawImage(shot.img, 0, 0, shot.w, Math.max(1, shot.h * 0.035), 0, 0, 24, 3);
  var d = x.getImageData(0, 0, 24, 3).data, r = 0, g = 0, b = 0, n = d.length / 4;
  for (var k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; b += d[k + 2]; }
  var hex = function (v) { return ("0" + Math.round(v / n).toString(16)).slice(-2); };
  shot.top = "#" + hex(r) + hex(g) + hex(b);
  return shot.top;
}
function drawStatusBar(ctx, dev, shot, x, y, w, h) {
  var phone = dev.kind === "iphone", bg = shotTopColor(shot);
  var barH = h * (phone ? 0.06 : 0.022), mid = y + (phone ? h * 0.03 : h * 0.011);
  var ink = contrast(bg, "#000000") >= contrast(bg, "#FFFFFF") ? "#000000" : "#FFFFFF";
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, barH);
  var fs = h * (phone ? 0.0185 : 0.0105);
  ctx.fillStyle = ink; ctx.textBaseline = "middle";
  ctx.font = "600 " + fs + "px " + fontById("system").css;
  if (phone) { ctx.textAlign = "center"; ctx.fillText("9:41", x + w * 0.2, mid); }
  else { ctx.textAlign = "left"; ctx.fillText("9:41", x + w * 0.03, mid); }
  // Right side, drawn from the right edge inward: battery, Wi-Fi, signal.
  var u = fs / 17, right = x + w * (phone ? 0.875 : 0.97);
  var bw = 25 * u, bh = 12 * u;
  ctx.globalAlpha = 0.4; roundRect(ctx, right - bw, mid - bh / 2, bw, bh, 3.6 * u); ctx.lineWidth = 1.1 * u; ctx.strokeStyle = ink; ctx.stroke();
  roundRect(ctx, right + 1.2 * u, mid - 2 * u, 1.6 * u, 4 * u, 0.8 * u); ctx.fill();
  ctx.globalAlpha = 1; roundRect(ctx, right - bw + 2 * u, mid - bh / 2 + 2 * u, bw - 4 * u, bh - 4 * u, 2 * u); ctx.fill();
  var wx = right - bw - 6 * u - 8 * u, wy = mid + 4.6 * u;
  ctx.lineCap = "round"; ctx.lineWidth = 2.1 * u; ctx.strokeStyle = ink;
  [3.2, 6.4, 9.6].forEach(function (r) { ctx.beginPath(); ctx.arc(wx, wy, r * u, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke(); });
  ctx.beginPath(); ctx.arc(wx, wy - 0.4 * u, 1.1 * u, 0, Math.PI * 2); ctx.fill();
  var sx = wx - 10 * u - 18 * u;
  for (var k = 0; k < 4; k++) { var bhk = (4 + k * 2.4) * u; roundRect(ctx, sx + k * 4.6 * u, mid + 5.6 * u - bhk, 3.2 * u, bhk, 1 * u); ctx.fill(); }
}

function metal(ctx, x0, x1, col) {
  var g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, col.rim); g.addColorStop(0.08, col.frame); g.addColorStop(0.92, col.frame); g.addColorStop(1, col.rim);
  return g;
}

function drawDeviceFrame(ctx, dev, H) {
  var spec = deviceSpec(dev);
  var col = spec.colors[dev.color] || spec.colors[spec.defaultColor];
  var W = spec.w * H, s = spec.screen;
  if (dev.kind === "iphone") {
    ctx.fillStyle = col.frame;
    [[0.175, 0.034], [0.235, 0.062], [0.31, 0.062]].forEach(function (b) { roundRect(ctx, -0.0045 * H, b[0] * H, 0.008 * H, b[1] * H, 0.003 * H); ctx.fill(); });
    roundRect(ctx, W - 0.0035 * H, 0.255 * H, 0.008 * H, 0.1 * H, 0.003 * H); ctx.fill();
    roundRect(ctx, 0, 0, W, H, spec.r * H); ctx.fillStyle = metal(ctx, 0, W, col); ctx.fill();
    roundRect(ctx, 0.0055 * H, 0.0055 * H, W - 0.011 * H, H - 0.011 * H, (spec.r - 0.0055) * H); ctx.fillStyle = "#050506"; ctx.fill();
    drawScreen(ctx, dev, s.x * H, s.y * H, s.w * H, s.h * H, s.r * H);
    if (dev.island !== false) {
      var iw = s.w * H * 0.29, ih = s.h * H * 0.036;
      roundRect(ctx, W / 2 - iw / 2, s.y * H + s.h * H * 0.012, iw, ih, ih / 2); ctx.fillStyle = "#000"; ctx.fill();
    }
  } else if (dev.kind === "ipad") {
    roundRect(ctx, 0, 0, W, H, spec.r * H); ctx.fillStyle = metal(ctx, 0, W, col); ctx.fill();
    roundRect(ctx, 0.005 * H, 0.005 * H, W - 0.01 * H, H - 0.01 * H, (spec.r - 0.005) * H); ctx.fillStyle = "#060607"; ctx.fill();
    drawScreen(ctx, dev, s.x * H, s.y * H, s.w * H, s.h * H, s.r * H);
    ctx.beginPath(); ctx.arc(W - 0.017 * H, H / 2, 0.0045 * H, 0, Math.PI * 2); ctx.fillStyle = "#1A1B22"; ctx.fill();
  } else if (dev.kind === "watch") {
    drawWatch(ctx, dev, spec, col, W, H);
  } else {
    var lidX = (spec.w - 1.371 - 0.056) / 2 * H, lidW = (1.371 + 0.056) * H, lidH = 0.915 * H;
    var rTop = 0.028 * H, rBot = 0.006 * H;
    ctx.beginPath();
    ctx.moveTo(lidX + rTop, 0); ctx.lineTo(lidX + lidW - rTop, 0); ctx.quadraticCurveTo(lidX + lidW, 0, lidX + lidW, rTop);
    ctx.lineTo(lidX + lidW, lidH - rBot); ctx.quadraticCurveTo(lidX + lidW, lidH, lidX + lidW - rBot, lidH);
    ctx.lineTo(lidX + rBot, lidH); ctx.quadraticCurveTo(lidX, lidH, lidX, lidH - rBot);
    ctx.lineTo(lidX, rTop); ctx.quadraticCurveTo(lidX, 0, lidX + rTop, 0); ctx.closePath();
    ctx.fillStyle = col.frame; ctx.fill();
    roundRect(ctx, lidX + 0.005 * H, 0.005 * H, lidW - 0.01 * H, lidH - 0.008 * H, 0.024 * H); ctx.fillStyle = "#050506"; ctx.fill();
    drawScreen(ctx, dev, s.x * H, s.y * H, s.w * H, s.h * H, s.r * H);
    var nw = 0.11 * H, nh = 0.021 * H, nx = spec.w * H / 2 - nw / 2;
    ctx.beginPath(); ctx.moveTo(nx, s.y * H); ctx.lineTo(nx + nw, s.y * H); ctx.lineTo(nx + nw, s.y * H + nh - 0.008 * H);
    ctx.quadraticCurveTo(nx + nw, s.y * H + nh, nx + nw - 0.008 * H, s.y * H + nh); ctx.lineTo(nx + 0.008 * H, s.y * H + nh);
    ctx.quadraticCurveTo(nx, s.y * H + nh, nx, s.y * H + nh - 0.008 * H); ctx.closePath(); ctx.fillStyle = "#050506"; ctx.fill();
    if (dev.base) { drawMacDeck(ctx, col, W, H, lidX, lidW, lidH); return; }
    var by = lidH, bh = 0.045 * H;
    var g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, col.rim); g.addColorStop(0.45, col.frame); g.addColorStop(1, shade(col.frame, -0.25));
    ctx.beginPath();
    ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.lineTo(W, by + bh * 0.55);
    ctx.quadraticCurveTo(W, by + bh, W - 0.05 * H, by + bh); ctx.lineTo(0.05 * H, by + bh);
    ctx.quadraticCurveTo(0, by + bh, 0, by + bh * 0.55); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    roundRect(ctx, W / 2 - 0.1 * H, by, 0.2 * H, 0.011 * H, 0.005 * H); ctx.fillStyle = shade(col.frame, -0.18); ctx.fill();
  }
}

// The Mac's keyboard deck seen from a little above: a plain base that
// widens toward the front, a trackpad, and the front edge. No keys.
function drawMacDeck(ctx, col, W, H, lidX, lidW, lidH) {
  var top = lidH, depth = 0.25 * H, front = top + depth, edge = 0.04 * H;
  var hingeL = lidX - 0.012 * H, hingeR = lidX + lidW + 0.012 * H;
  function xAt(t, side) { return side < 0 ? hingeL + (0 - hingeL) * t : hingeR + (W - hingeR) * t; }
  var g = ctx.createLinearGradient(0, top, 0, front);
  g.addColorStop(0, shade(col.frame, -0.16)); g.addColorStop(0.18, col.frame); g.addColorStop(1, col.rim);
  ctx.beginPath();
  ctx.moveTo(hingeL, top); ctx.lineTo(hingeR, top); ctx.lineTo(W, front); ctx.lineTo(0, front); ctx.closePath();
  ctx.fillStyle = g; ctx.fill();
  // The hinge's shadow under the lid.
  var hs = ctx.createLinearGradient(0, top, 0, top + 0.03 * H);
  hs.addColorStop(0, "rgba(0,0,0,0.28)"); hs.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hs; ctx.fillRect(hingeL, top, hingeR - hingeL, 0.03 * H);
  // Trackpad.
  var t0 = 0.5, t1 = 0.93, k = 0.27;
  var y0 = top + depth * t0, y1 = top + depth * t1, cx = W / 2;
  var hw0 = (xAt(t0, 1) - xAt(t0, -1)) / 2 * k, hw1 = (xAt(t1, 1) - xAt(t1, -1)) / 2 * k;
  ctx.beginPath();
  ctx.moveTo(cx - hw0, y0); ctx.lineTo(cx + hw0, y0); ctx.lineTo(cx + hw1, y1); ctx.lineTo(cx - hw1, y1); ctx.closePath();
  ctx.fillStyle = shade(col.frame, -0.035); ctx.fill();
  ctx.lineWidth = Math.max(1, 0.0025 * H); ctx.strokeStyle = shade(col.frame, -0.14); ctx.stroke();
  // Front edge, rounded at the bottom corners, with the opening notch.
  var r = 0.03 * H;
  var eg = ctx.createLinearGradient(0, front, 0, front + edge);
  eg.addColorStop(0, col.rim); eg.addColorStop(0.35, col.frame); eg.addColorStop(1, shade(col.frame, -0.3));
  ctx.beginPath();
  ctx.moveTo(0, front); ctx.lineTo(W, front); ctx.lineTo(W, front + edge - r);
  ctx.quadraticCurveTo(W, front + edge, W - r * 2, front + edge); ctx.lineTo(r * 2, front + edge);
  ctx.quadraticCurveTo(0, front + edge, 0, front + edge - r); ctx.closePath();
  ctx.fillStyle = eg; ctx.fill();
  roundRect(ctx, W / 2 - 0.1 * H, front, 0.2 * H, 0.011 * H, 0.005 * H); ctx.fillStyle = shade(col.frame, -0.18); ctx.fill();
}

// Apple Watch: case, Digital Crown and side button on the right, a
// black glass face, and band pieces that fade out above and below.
function drawWatch(ctx, dev, spec, col, W, H) {
  var cx0 = 0.04 * H, cw = 0.56 * H, cy0 = 0.17 * H, ch = 0.66 * H;
  var bw = 0.4 * H, bx = cx0 + cw / 2 - bw / 2;
  [[0, cy0 + ch * 0.2, true], [cy0 + ch * 0.8, H, false]].forEach(function (b) {
    var g = ctx.createLinearGradient(0, b[0], 0, b[1]);
    var c = col.band, clear = "rgba(0,0,0,0)";
    if (b[2]) { g.addColorStop(0, clear); g.addColorStop(0.55, c); g.addColorStop(1, c); }
    else { g.addColorStop(0, c); g.addColorStop(0.45, c); g.addColorStop(1, clear); }
    ctx.save(); ctx.globalAlpha = 1;
    roundRect(ctx, bx, b[0], bw, b[1] - b[0], 0.02 * H); ctx.fillStyle = g; ctx.fill();
    // A soft crease where the band meets the case.
    var y = b[2] ? cy0 + 0.004 * H : cy0 + ch - 0.016 * H;
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(bx, y, bw, 0.012 * H);
    ctx.restore();
  });
  // Crown and side button.
  ctx.fillStyle = metal(ctx, cx0 + cw - 0.01 * H, cx0 + cw + 0.04 * H, col);
  roundRect(ctx, cx0 + cw - 0.01 * H, cy0 + ch * 0.24, 0.043 * H, 0.11 * H, 0.014 * H); ctx.fill();
  ctx.fillStyle = col.frame;
  roundRect(ctx, cx0 + cw - 0.01 * H, cy0 + ch * 0.53, 0.024 * H, 0.15 * H, 0.008 * H); ctx.fill();
  // Ridges on the crown.
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  for (var k = 0; k < 6; k++) ctx.fillRect(cx0 + cw + 0.012 * H, cy0 + ch * 0.24 + 0.012 * H + k * 0.016 * H, 0.02 * H, 0.005 * H);
  // Case, then the black glass.
  roundRect(ctx, cx0, cy0, cw, ch, spec.r * H); ctx.fillStyle = metal(ctx, cx0, cx0 + cw, col); ctx.fill();
  roundRect(ctx, cx0 + 0.012 * H, cy0 + 0.012 * H, cw - 0.024 * H, ch - 0.024 * H, (spec.r - 0.012) * H); ctx.fillStyle = "#050506"; ctx.fill();
  var s = spec.screen;
  drawScreen(ctx, dev, s.x * H, s.y * H, s.w * H, s.h * H, s.r * H);
}

// ---------------------------------------------------------------
// Placing a device: a real 3D turn, projected with perspective and
// drawn as a warped mesh.
// ---------------------------------------------------------------
function devicePlacement(dev, W, H) {
  var spec = deviceSpec(dev);
  var i = Math.max(0, slotIndex(dev.home));
  var h = dev.size * H;
  return { cx: (i + dev.dx) * W, cy: dev.cy * H, H: h, W: spec.w * h, spec: spec };
}
function projector(dev, pl) {
  var d2r = Math.PI / 180;
  var roll = (dev.roll || 0) * d2r, yaw = (dev.yaw || 0) * d2r, pitch = (dev.pitch || 0) * d2r;
  var cr = Math.cos(roll), sr = Math.sin(roll), cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  var dist = pl.H * 2.6;
  return function (u, v) {
    var x = (u - 0.5) * pl.W, y = (v - 0.5) * pl.H * pl.spec.h;
    var x1 = x * cyw, z1 = -x * syw;
    var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    var k = dist / (dist + z2);
    var px = x1 * k, py = y2 * k;
    return [pl.cx + px * cr - py * sr, pl.cy + px * sr + py * cr];
  };
}
function deviceQuad(dev, W, H) {
  var P = projector(dev, devicePlacement(dev, W, H));
  return [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
}
// Where the screen itself lands, for dragging the screenshot inside it.
function screenQuad(dev, W, H) {
  var pl = devicePlacement(dev, W, H), P = projector(dev, pl), s = pl.spec.screen;
  var u0 = s.x / pl.spec.w, u1 = (s.x + s.w) / pl.spec.w, v0 = s.y / pl.spec.h, v1 = (s.y + s.h) / pl.spec.h;
  return [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
}

// A point on the screen: (a, b) from its top left (0, 0) to its bottom
// right (1, 1), through the device's real turn.
function screenPoint(dev, W, H, a, b) {
  var pl = devicePlacement(dev, W, H), P = projector(dev, pl), s = pl.spec.screen;
  return P((s.x + s.w * a) / pl.spec.w, (s.y + s.h * b) / pl.spec.h);
}
// How far each triangle reaches past its edges so neighbors overlap
// and no seam shows: 0.6 output pixels, set per warp by renderWarp. It
// was 0.6 scene pixels, a third of a pixel on the zoomed-out canvas,
// which left a faint grid over turned devices there.
var triGrow = 0.6;
function drawTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  var mx = (d0[0] + d1[0] + d2[0]) / 3, my = (d0[1] + d1[1] + d2[1]) / 3;
  function grow(p) { var dx = p[0] - mx, dy = p[1] - my, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * triGrow, p[1] + dy / l * triGrow]; }
  var e0 = grow(d0), e1 = grow(d1), e2 = grow(d2);
  var den = s0[0] * (s2[1] - s1[1]) - s1[0] * s2[1] + s2[0] * s1[1] + (s1[0] - s2[0]) * s0[1];
  if (Math.abs(den) < 1e-9) return;
  var a = -(s0[1] * (d2[0] - d1[0]) - s1[1] * d2[0] + s2[1] * d1[0] + (s1[1] - s2[1]) * d0[0]) / den;
  var b = (s1[1] * d2[1] + s0[1] * (d1[1] - d2[1]) - s2[1] * d1[1] + (s2[1] - s1[1]) * d0[1]) / den;
  var c = (s0[0] * (d2[0] - d1[0]) - s1[0] * d2[0] + s2[0] * d1[0] + (s1[0] - s2[0]) * d0[0]) / den;
  var d = -(s1[0] * d2[1] + s0[0] * (d1[1] - d2[1]) - s2[0] * d1[1] + (s2[0] - s1[0]) * d0[1]) / den;
  var e = (s0[0] * (s2[1] * d1[0] - s1[1] * d2[0]) + s0[1] * (s1[0] * d2[0] - s2[0] * d1[0]) + (s2[0] * s1[1] - s1[0] * s2[1]) * d0[0]) / den;
  var f = (s0[0] * (s2[1] * d1[1] - s1[1] * d2[1]) + s0[1] * (s1[0] * d2[1] - s2[0] * d1[1]) + (s2[0] * s1[1] - s1[0] * s2[1]) * d0[1]) / den;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(e0[0], e0[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function inRange(quad, range, slack) {
  if (!range) return true;
  var lo = Infinity, hi = -Infinity;
  quad.forEach(function (p) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); });
  return !(hi + slack < range[0] || lo - slack > range[1]);
}

// The editor's quick redraw right after a zoom: each device is drawn
// from the picture made at the last zoom, stretched, and the editor
// draws it sharp a moment later (renderNow in editor-ui.js). Making
// every device again at the new size took a beat with the fingers
// already lifted.
var lastWarps = new Map(), warpDraw = { quick: false, record: false, stale: false };
// ctx maps panorama pixels; pxScale = output pixels per panorama pixel.
function drawDevice(ctx, dev, W, H, pxScale, range) {
  var pl = devicePlacement(dev, W, H);
  if (!inRange(deviceQuad(dev, W, H), range, pl.H * 0.15)) return;
  var sig = null;
  if (warpDraw.record) {
    sig = [dev.kind, dev.color, shotKey(dev), dev.island, dev.base ? 1 : 0, dev.shadow, dev.roll, dev.yaw, dev.pitch, dev.size, dev.dx, dev.cy, dev.home, W, H].join("|");
    var lw = warpDraw.quick && lastWarps.get(dev.id);
    if (lw && lw.sig === sig && lw.px !== pxScale) {
      drawWarp(ctx, lw.off, lw.sh, lw.minX, lw.minY, lw.px);
      warpDraw.stale = true;
      return;
    }
  }
  var flat = flatDevice(dev, Math.min(4200, pl.H * pxScale * 1.15));
  var fs = flat.H / pl.H;
  var turned = Math.abs(dev.yaw || 0) > 0.05 || Math.abs(dev.pitch || 0) > 0.05;
  var P = projector(dev, pl);
  var padU = flat.pad / (deviceSpec(dev).w * flat.H), padV = flat.pad / (deviceSpec(dev).h * flat.H);
  var pts = [P(-padU, -padV), P(1 + padU, -padV), P(1 + padU, 1 + padV), P(-padU, 1 + padV)];
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  pts.forEach(function (p) { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); });
  var ow = Math.ceil((maxX - minX) * pxScale) + 4, oh = Math.ceil((maxY - minY) * pxScale) + 4;
  if (ow < 2 || oh < 2 || ow > 16000 || oh > 16000) return;
  // The warped device only depends on the flat frame, the turn, its
  // size, and the zoom; moving it just moves where it's drawn. Reuse it
  // while dragging instead of re-warping ~390 triangles every frame.
  // Full-size export renders (big) aren't kept.
  var warpKey = [(dev.roll || 0).toFixed(2), (dev.yaw || 0).toFixed(2), (dev.pitch || 0).toFixed(2), pl.H.toFixed(2), pxScale.toFixed(5)].join("|");
  var off = flat.warps.get(warpKey);
  if (!off) {
    off = renderWarp(dev, pl, P, flat, fs, turned, padU, padV, pxScale, minX, minY, ow, oh);
    if (ow * oh <= 12e6) {
      if (flat.warps.size >= 6) { var k0 = flat.warps.keys().next().value; flat.px -= flat.warps.get(k0).width * flat.warps.get(k0).height; cachePx -= flat.warps.get(k0).width * flat.warps.get(k0).height; flat.warps.delete(k0); }
      flat.warps.set(warpKey, off);
      cacheAdd(flat, ow * oh);
    }
  }
  var sh = null;
  if (dev.shadow !== false) sh = off.shadow || (off.shadow = shadowOf(off, pl, pxScale));
  drawWarp(ctx, off, sh, minX, minY, pxScale);
  if (sig && ow * oh <= 12e6) lastWarps.set(dev.id, { sig: sig, off: off, sh: sh, minX: minX, minY: minY, px: pxScale });
}
function renderWarp(dev, pl, P, flat, fs, turned, padU, padV, pxScale, minX, minY, ow, oh) {
  var off = document.createElement("canvas");
  off.width = ow; off.height = oh;
  var octx = off.getContext("2d");
  octx.imageSmoothingQuality = "high";
  octx.setTransform(pxScale, 0, 0, pxScale, 2 - minX * pxScale, 2 - minY * pxScale);
  triGrow = 0.6 / Math.min(1, pxScale);
  var cw = flat.canvas.width, ch = flat.canvas.height;
  if (!turned) {
    octx.translate(pl.cx, pl.cy);
    octx.rotate((dev.roll || 0) * Math.PI / 180);
    octx.drawImage(flat.canvas, -cw / fs / 2, -ch / fs / 2, cw / fs, ch / fs);
  } else {
    var N = 14, grid = [], i, j;
    for (j = 0; j <= N; j++) {
      grid[j] = [];
      for (i = 0; i <= N; i++) {
        var u = -padU + (1 + 2 * padU) * i / N, v = -padV + (1 + 2 * padV) * j / N;
        grid[j][i] = { s: [cw * i / N, ch * j / N], d: P(u, v) };
      }
    }
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var p00 = grid[j][i], p10 = grid[j][i + 1], p01 = grid[j + 1][i], p11 = grid[j + 1][i + 1];
      drawTriangle(octx, flat.canvas, p00.s, p10.s, p11.s, p00.d, p10.d, p11.d);
      drawTriangle(octx, flat.canvas, p00.s, p11.s, p01.s, p00.d, p11.d, p01.d);
    }
  }
  return off;
}
// The device's soft shadow, blurred once at a small size and kept with
// the warped device. The blur is wide, so drawing it scaled up looks
// the same, and it costs a fraction of blurring at full size on every
// frame of every scroll and drag, which it used to.
function shadowOf(off, pl, pxScale) {
  var blur = pl.H * 0.07 * pxScale, dy = pl.H * 0.035 * pxScale;
  var sf = Math.min(1, 12 / Math.max(1, blur));
  var pad = Math.ceil((blur * 1.5 + dy) * sf) + 2;
  var w = Math.max(1, Math.round(off.width * sf)), h = Math.max(1, Math.round(off.height * sf));
  var c = document.createElement("canvas");
  c.width = w + pad * 2; c.height = h + pad * 2;
  var cx = c.getContext("2d");
  cx.shadowColor = "rgba(20, 16, 10, 0.34)"; cx.shadowBlur = blur * sf; cx.shadowOffsetY = dy * sf;
  // Draw the device off the canvas and its shadow onto it.
  cx.shadowOffsetX = c.width + 10;
  cx.drawImage(off, pad - c.width - 10, pad, w, h);
  return { canvas: c, pad: pad, sx: off.width / w, sy: off.height / h };
}
function drawWarp(ctx, off, sh, minX, minY, pxScale) {
  // A cached warp can be a pixel off the size computed this frame; draw it at its own size.
  var x = minX - 2 / pxScale, y = minY - 2 / pxScale;
  if (sh) ctx.drawImage(sh.canvas, x - sh.pad * sh.sx / pxScale, y - sh.pad * sh.sy / pxScale, sh.canvas.width * sh.sx / pxScale, sh.canvas.height * sh.sy / pxScale);
  ctx.drawImage(off, x, y, off.width / pxScale, off.height / pxScale);
}

// ---------------------------------------------------------------
// Images (logos, badges, anything uploaded). size = height as a
// fraction of the screen's height; keeps the image's own shape.
// ---------------------------------------------------------------
function imagePlacement(it, W, H) {
  var s = shots[it.src];
  var aspect = s ? s.w / s.h : 1;
  var h = it.size * H;
  var i = Math.max(0, slotIndex(it.home));
  return { cx: (i + it.dx) * W, cy: it.cy * H, w: h * aspect, h: h };
}
function imageQuad(it, W, H) {
  var p = imagePlacement(it, W, H), a = (it.roll || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (k) {
    var x = k[0] * p.w / 2, y = k[1] * p.h / 2;
    return [p.cx + x * c - y * s, p.cy + x * s + y * c];
  });
}
function drawImageItem(ctx, it, W, H, range) {
  var p = imagePlacement(it, W, H);
  if (!inRange(imageQuad(it, W, H), range, 10)) return;
  var s = shots[it.src];
  ctx.save();
  ctx.translate(p.cx, p.cy);
  ctx.rotate((it.roll || 0) * Math.PI / 180);
  ctx.globalAlpha = it.opacity == null ? 1 : it.opacity;
  var r = (it.radius || 0) * Math.min(p.w, p.h);
  if (it.shadow) {
    var m = ctx.getTransform(), sc = Math.hypot(m.a, m.b);
    ctx.shadowColor = "rgba(20,16,10,0.3)"; ctx.shadowBlur = p.h * 0.08 * sc; ctx.shadowOffsetY = p.h * 0.03 * sc;
  }
  if (s) {
    if (r > 0) {
      roundRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, r);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.clip();
    }
    ctx.drawImage(s.img, -p.w / 2, -p.h / 2, p.w, p.h);
  } else {
    // Placeholder until an image is chosen (the title card's icon).
    roundRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, p.h * 0.225);
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.setLineDash([p.h * 0.05, p.h * 0.04]); ctx.lineWidth = p.h * 0.02; ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = "600 " + Math.round(p.h * 0.13) + "px " + fontById("system").css;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Your icon", 0, 0);
  }
  ctx.restore();
}

// ---------------------------------------------------------------
// Text boxes. *Stars* around words paint them in the highlight color.
// y is the anchor: the top edge ("top"), bottom edge ("bottom"), or
// middle ("middle") of the box, as a fraction of the screen height.
// A detail line with attached: true sits right under its headline and
// moves with it.
// ---------------------------------------------------------------
// sp: whether a space came before the word, so "*best*." stays "best."
function tokens(text) {
  var out = [], emph = false, sp = false;
  String(text || "").split(/(\*|\n)/).forEach(function (part) {
    if (part === "*") { emph = !emph; return; }
    if (part === "\n") { out.push({ br: true }); sp = false; return; }
    part.split(/(\s+)/).forEach(function (w) {
      if (!w) return;
      if (/^\s+$/.test(w)) { sp = true; return; }
      out.push({ w: w, e: emph, sp: sp }); sp = false;
    });
  });
  return out;
}
function textUnit(W, H) { return Math.min(W, H * 0.6) * (target().text || 1); }
function textFont(it) {
  var f = fontById(it.font || project.style.font);
  var w = weightFor(f, it.weight || project.style.weight);
  return { css: f.css, weight: w };
}
function textColor(it) { return it.color || (project.style.auto ? autoInk() : project.style.color); }
var measureCtx = null;
// Text is laid out (word by word measureText) for every draw and every
// hit test, so the result is kept until any input to it changes, or
// fonts finish loading (clearDrawCaches).
var textCache = new Map();
function clearDrawCaches() { flatCache.clear(); cachePx = 0; textCache.clear(); lastWarps.clear(); }
if (typeof document !== "undefined" && document.fonts && document.fonts.addEventListener) {
  document.fonts.addEventListener("loadingdone", function () { textCache.clear(); });
}
function layoutText(it, W, H) {
  var f = textFont(it);
  var size = (it.size || 6) / 100 * textUnit(W, H);
  var maxW = Math.max(size * 2, (it.w || 0.84) * W);
  var fit = (it.role === "head" || it.role === "sub") && project.style.fit !== false;
  var key = [it.text, f.css, f.weight, size, maxW, it.box ? 1 : 0, it.role === "sub" ? 1 : 0, fit ? 1 : 0].join("\u0001");
  var hit = textCache.get(key);
  if (hit) return hit;
  var out = layoutTextNow(it, f, size, maxW);
  // A headline or detail line that runs past its width (one long word)
  // or past three lines gets smaller, down to 55% of its size.
  if (fit) {
    var floor = size * 0.55, maxLines = 3;
    while (out.size > floor && (out.lines.length > maxLines || Math.max.apply(null, out.widths) > out.inner + 0.5)) {
      out = layoutTextNow(it, f, Math.max(floor, out.size * 0.93), maxW);
    }
  }
  if (textCache.size > 400) textCache.clear();
  textCache.set(key, out);
  return out;
}
function layoutTextNow(it, f, size, maxW) {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  var ctx = measureCtx;
  ctx.font = f.weight + " " + size + "px " + f.css;
  var pad = it.box ? size * 0.42 : 0;
  var inner = maxW - pad * 2;
  var lines = [[]], widths = [0], space = ctx.measureText(" ").width;
  tokens(it.text).forEach(function (t) {
    if (t.br) { lines.push([]); widths.push(0); return; }
    var w = ctx.measureText(t.w).width, li = lines.length - 1;
    var need = widths[li] + (lines[li].length && t.sp ? space : 0) + w;
    // Only break where there was a space.
    if (lines[li].length && t.sp && need > inner) { lines.push([]); widths.push(0); li++; need = w; }
    lines[li].push({ w: t.w, e: t.e, sp: t.sp, width: w });
    widths[li] = need;
  });
  var lh = size * (it.role === "sub" ? 1.36 : 1.12);
  var textW = it.box ? Math.max.apply(null, widths.concat([size])) : inner;
  var boxW = it.box ? textW + pad * 2 : maxW;
  var boxH = lines.length * lh + pad * 2 - (it.box ? size * 0.12 : 0);
  return { lines: lines, widths: widths, space: space, size: size, lh: lh, pad: pad, boxW: boxW, boxH: boxH, inner: it.box ? textW : inner, font: f };
}
// Box in panorama pixels: { x, y, w, h, lay }
function textBox(it, W, H) {
  var lay = layoutText(it, W, H);
  var i = Math.max(0, slotIndex(it.home));
  var cx = (i + (it.dx == null ? 0.5 : it.dx)) * W;
  var y;
  if (it.attached) {
    var head = roleText(it.home, "head");
    if (head && head !== it && !head.hidden) {
      var hb = textBox(head, W, H);
      cx = hb.x + hb.w / 2;
      return { x: cx - lay.boxW / 2, y: hb.y + hb.h + lay.size * 0.55, w: lay.boxW, h: lay.boxH, lay: lay, attachedTo: head.id };
    }
  }
  var x = cx - lay.boxW / 2;
  var anchorY = it.y * H;
  var blockH = lay.boxH;
  if (it.role === "head") {
    var sub = roleText(it.home, "sub");
    if (sub && sub.attached && textVisible(sub)) {
      var sl = layoutText(sub, W, H);
      blockH += sl.size * 0.55 + sl.boxH;
    }
  }
  if (it.valign === "bottom") y = anchorY - blockH;
  else if (it.valign === "middle") y = anchorY - blockH / 2;
  else y = anchorY;
  return { x: x, y: y, w: lay.boxW, h: lay.boxH, lay: lay };
}
function textVisible(it) { return !it.hidden && !!String(it.text || "").trim(); }
function drawText(ctx, it, W, H, range) {
  if (!textVisible(it)) return;
  var b = textBox(it, W, H), lay = b.lay;
  if (range && (b.x + b.w < range[0] || b.x > range[1])) return;
  var ink = textColor(it);
  var align = it.align || project.style.align || "center";
  ctx.save();
  if (it.box) {
    roundRect(ctx, b.x, b.y, b.w, b.h, Math.min(b.h / 2, lay.size * 0.9));
    ctx.fillStyle = it.box; ctx.fill();
  }
  ctx.textBaseline = "alphabetic";
  ctx.font = lay.font.weight + " " + lay.size + "px " + lay.font.css;
  var subInk = it.role === "sub" && !it.color ? (ink === "#FFFFFF" ? "rgba(255,255,255,0.84)" : hexWithAlpha(ink, 0.74)) : ink;
  lay.lines.forEach(function (line, li) {
    var lw = lay.widths[li];
    var left = b.x + lay.pad;
    var x = align === "left" ? left : align === "right" ? left + lay.inner - lw : left + (lay.inner - lw) / 2;
    line.forEach(function (t, k) {
      if (k && t.sp) x += lay.space;
      ctx.fillStyle = t.e ? (it.accent || project.style.accent) : subInk;
      ctx.fillText(t.w, x, b.y + lay.pad + li * lay.lh + lay.size * 0.88);
      x += t.width;
    });
  });
  ctx.restore();
}

// ---------------------------------------------------------------
// Background
// ---------------------------------------------------------------
var bgImage = null;
function paintBackground(ctx, x, y, w, h) {
  var bg = project.bg;
  if (bg.mode === "image" && bgImage) {
    ctx.fillStyle = "#000"; ctx.fillRect(x, y, w, h);
    drawCover(ctx, bgImage, x, y, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fillRect(x, y, w, h);
    return;
  }
  if (bg.mode === "solid") { ctx.fillStyle = bg.colors[0]; ctx.fillRect(x, y, w, h); paintTexture(ctx, x, y, w, h); return; }
  var ang = (bg.angle || 0) * Math.PI / 180;
  var cx = x + w / 2, cy = y + h / 2, len = Math.abs(w * Math.cos(ang)) / 2 + Math.abs(h * Math.sin(ang)) / 2;
  var g = ctx.createLinearGradient(cx - Math.cos(ang) * len, cy - Math.sin(ang) * len, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
  for (var k = 0; k <= 8; k++) g.addColorStop(k / 8, mixHex(bg.colors[0], bg.colors[1], k / 8));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  paintTexture(ctx, x, y, w, h);
}
// Soft noise or film grain over a gradient or solid background. The
// tile is the same random pattern every time (a fixed seed), and its
// scale follows the slide's height, so the canvas and the saved files
// match at any size.
var TEXTURES = { soft: { tile: 128, per: 900, alpha: 0.13, op: "soft-light" }, grain: { tile: 256, per: 2200, alpha: 0.2, op: "overlay" } };
var textureTiles = {}, texturePats = {};
function textureTile(kind) {
  if (textureTiles[kind]) return textureTiles[kind];
  var n = TEXTURES[kind].tile, c = document.createElement("canvas"); c.width = c.height = n;
  var x = c.getContext("2d"), img = x.createImageData(n, n), seed = kind === "soft" ? 7 : 13;
  for (var k = 0; k < img.data.length; k += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    var v = seed >>> 24;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  textureTiles[kind] = c;
  return c;
}
function paintTexture(ctx, x, y, w, h) {
  var t = TEXTURES[project.bg.texture];
  if (!t) return;
  var s = target().h / t.per, key = project.bg.texture + "@" + s, pat = texturePats[key];
  if (!pat) {
    pat = texturePats[key] = ctx.createPattern(textureTile(project.bg.texture), "repeat");
    if (pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix().scale(s));
  }
  ctx.save();
  ctx.globalAlpha = t.alpha; ctx.globalCompositeOperation = t.op;
  ctx.fillStyle = pat; ctx.fillRect(x, y, w, h);
  ctx.restore();
}
function paintGlow(ctx, W, H, range) {
  if (!project.bg.glow) return;
  project.items.forEach(function (it) {
    if (it.type !== "device") return;
    var pl = devicePlacement(it, W, H);
    var r = Math.max(pl.W, pl.H) * 0.62;
    if (range && (pl.cx + r < range[0] || pl.cx - r > range[1])) return;
    var g = ctx.createRadialGradient(pl.cx, pl.cy, 0, pl.cx, pl.cy, r);
    g.addColorStop(0, "rgba(255,255,255,0.36)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(pl.cx - r, pl.cy - r, r * 2, r * 2);
  });
}

// The whole set as one panorama. Anything crossing a boundary is cut
// in two when each screen is exported.
function drawScene(ctx, pxScale, range) {
  var t = target(), n = project.slots.length, W = t.w, H = t.h;
  if (project.bg.span) paintBackground(ctx, 0, 0, W * n, H);
  else for (var i = 0; i < n; i++) paintBackground(ctx, i * W, 0, W, H);
  project.slots.forEach(function (slot, i) {
    if (slot.layout === "full" && slot.shots[0] && shots[slot.shots[0]]) {
      if (range && ((i + 1) * W < range[0] || i * W > range[1])) return;
      ctx.save(); ctx.beginPath(); ctx.rect(i * W, 0, W, H); ctx.clip();
      drawCover(ctx, shots[slot.shots[0]].img, i * W, 0, W, H);
      ctx.restore();
    }
  });
  paintGlow(ctx, W, H, range);
  project.items.forEach(function (it) {
    if (it.type === "device") drawDevice(ctx, it, W, H, pxScale, range);
    else if (it.type === "image") drawImageItem(ctx, it, W, H, range);
    else if (it.type === "text") drawText(ctx, it, W, H, range);
  });
}

// Hit-test outline for any item, in panorama pixels.
function itemQuad(it) {
  var t = target();
  if (it.type === "device") return deviceQuad(it, t.w, t.h);
  if (it.type === "image") return imageQuad(it, t.w, t.h);
  var b = textBox(it, t.w, t.h);
  var h = b.h, y = b.y;
  // A headline's box includes its attached detail line, so the pair
  // selects and drags as one.
  if (it.role === "head") {
    var sub = roleText(it.home, "sub");
    if (sub && sub.attached && textVisible(sub)) { var sb = textBox(sub, t.w, t.h); h = sb.y + sb.h - y; }
  }
  var pad = Math.max(12, b.lay.size * 0.2);
  return [[b.x - pad, y - pad], [b.x + b.w + pad, y - pad], [b.x + b.w + pad, y + h + pad], [b.x - pad, y + h + pad]];
}
function inPoly(p, poly) {
  var inside = false;
  for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------
// Layouts and screens
// ---------------------------------------------------------------
function newSlot(layout, shotIds) { return { id: uid("slot"), layout: layout || "hero", shots: shotIds || [] }; }
function newText(slotId, role, text) {
  var st = project.style;
  return { id: uid("t"), type: "text", home: slotId, role: role || null, text: text || "", dx: 0.5, y: 0.065, valign: "top", w: 0.84,
    size: role === "sub" ? st.subSize : role === "head" ? st.headSize : 6, font: null, weight: role === "sub" ? 500 : null, color: null, align: null, box: null, attached: role === "sub" };
}
function ensureCaption(slot) {
  var head = roleText(slot.id, "head"), sub = roleText(slot.id, "sub");
  if (!head) { head = newText(slot.id, "head", ""); project.items.push(head); }
  if (!sub) { sub = newText(slot.id, "sub", ""); project.items.push(sub); }
  return { head: head, sub: sub };
}
function placeCaption(slot) {
  var lay = layoutById(slot.layout), cap = ensureCaption(slot), safe = target().safe || { x: 0, y: 0 };
  cap.head.dx = 0.5;
  cap.sub.attached = true;
  if (safe.x) cap.head.w = Math.min(cap.head.w || 0.84, 1 - safe.x * 2 - 0.04);
  if (lay.caption === "bottom") { cap.head.y = Math.min(0.935, 0.97 - safe.y); cap.head.valign = "bottom"; }
  else if (lay.caption === "center") { cap.head.y = lay.icon ? 0.6 : 0.5; cap.head.valign = "middle"; }
  else { cap.head.y = Math.max(0.065, safe.y + 0.03); cap.head.valign = "top"; }
  cap.head.size = lay.caption === "center" ? project.style.headSize * 1.2 : project.style.headSize;
  cap.head.hidden = lay.caption === "none";
  cap.sub.hidden = lay.caption === "none";
}
function applyLayout(slot, layoutId, keepPartner) {
  var i = slotIndex(slot.id), old = layoutById(slot.layout);
  if (old.spansNext && layoutId !== slot.layout && project.slots[i + 1] && project.slots[i + 1].layout === "partner") {
    project.slots[i + 1].layout = "float";
    applyLayout(project.slots[i + 1], "float", true);
  }
  // The art-only layout anywhere else becomes a pair, and comes back
  // when the set returns to an App Store art size.
  if (layoutById(layoutId).art && !target().art) { slot.artLayout = layoutId; layoutId = "duo"; }
  else if (slot.artLayout && target().art && layoutId === "duo") layoutId = slot.artLayout;
  slot.layout = layoutId;
  project.items = project.items.filter(function (it) { return !(it.home === slot.id && (it.type === "device" || it.layoutIcon)); });
  var lay = layoutById(layoutId), kind = target().device;
  lay.devices.forEach(function (spec) {
    var k = spec.shot || 0;
    var dev = newDevice(slot.id, kind, slot.shots[k] || slot.shots[0] || null);
    dev.dx = spec.dx; dev.cy = spec.cy; dev.size = spec.size; dev.roll = spec.roll || 0; dev.yaw = spec.yaw || 0; dev.pitch = spec.pitch || 0; dev.shotIdx = k;
    if (spec.spread) dev.dx = 0.5 + spec.spread * 0.31 * target().h / target().w;
    if (kind === "mac" && lay.id === "lying") { dev.roll = -4; dev.size = 0.7; dev.cy = 0.64; }
    // Devices go under the text.
    project.items.splice(firstTextIndex(), 0, dev);
  });
  if (lay.icon) {
    var icon = { id: uid("m"), type: "image", home: slot.id, src: project.iconShot || null, dx: 0.5, cy: 0.36, size: 0.12, roll: 0, radius: 0.225, shadow: true, opacity: 1, layoutIcon: true };
    project.items.splice(firstTextIndex(), 0, icon);
  }
  placeCaption(slot);
  if (lay.spansNext && !keepPartner) {
    if (!project.slots[i + 1]) {
      if (project.slots.length >= 10) return;
      var partner = newSlot("partner", []);
      project.slots.splice(i + 1, 0, partner);
    }
    var next = project.slots[i + 1];
    project.items = project.items.filter(function (it) { return !(it.home === next.id && it.type === "device"); });
    next.layout = "partner";
    placeCaption(next);
  }
}
function firstTextIndex() {
  for (var i = 0; i < project.items.length; i++) if (project.items[i].type === "text") return i;
  return project.items.length;
}
function newDevice(slotId, kind, shotId) {
  return { id: uid("d"), type: "device", home: slotId, kind: kind, color: DEVICES[kind].defaultColor, dx: 0.5, cy: 0.62, size: 0.6, roll: 0, yaw: 0, pitch: 0,
    shotIdx: 0, shot: shotId || null, shadow: true, island: true, fit: "cover", zoom: 1, sx: 0, sy: 0, fill: "#000000" };
}
function assignShot(slot, idx, shotId) {
  slot.shots[idx] = shotId;
  itemsOf(slot.id, "device").forEach(function (d) { if ((d.shotIdx || 0) === idx) d.shot = shotId; });
}

// Projects saved before text boxes existed (v2) kept captions on the
// screen itself; they become text boxes here.
function migrate(p) {
  if (p.v === 3) return p;
  var np = blankProject();
  np.target = p.target || np.target;
  if (p.bg) np.bg = p.bg;
  if (p.caption) {
    np.style.font = p.caption.font || np.style.font;
    np.style.weight = p.caption.weight || np.style.weight;
    np.style.headSize = p.caption.size || np.style.headSize;
    np.style.subSize = np.style.headSize * 0.46;
    np.style.auto = p.caption.auto !== false;
    np.style.color = p.caption.color || np.style.color;
    np.style.accent = p.caption.accent || np.style.accent;
    np.style.align = p.caption.align || "center";
  }
  project = np;
  (p.slots || []).forEach(function (s) {
    var slot = { id: s.id, layout: s.layout, shots: s.shots || [] };
    np.slots.push(slot);
  });
  (p.devices || []).forEach(function (d) {
    var dev = newDevice(d.home, d.kind, d.shot);
    Object.keys(d).forEach(function (k) { dev[k] = d[k]; });
    dev.type = "device";
    np.items.push(dev);
  });
  (p.slots || []).forEach(function (s) {
    var slot = slotById(s.id);
    var cap = ensureCaption(slot);
    cap.head.text = s.head || ""; cap.sub.text = s.sub || "";
    placeCaption(slot);
  });
  return np;
}
