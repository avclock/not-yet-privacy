// Hero mock store demo -- a genuinely interactive illustration of the
// real mechanism, ported from the extension's own "See it in action"
// demo (onboarding.js's wireCheckoutDemo()): a fake store page, a real
// Not Yet on/off toggle, and a store/paused/success view swap. The
// paused view's three tabs mirror the three real unlock methods
// (content.js's setupCode/setupReflect/setupWait). No analytics call
// anywhere in here on purpose: nothing typed into this demo (a
// reflection answer especially) should ever be tracked, matching the
// real extension's own "never reads what you type" claim.
(function () {
  var frame = document.getElementById("mock-frame");
  if (!frame) return;

  var CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, same reasoning as the real code generator: avoid ambiguous characters
  var CODE_LENGTH = 8;
  var TIMER_SECONDS = 10; // shortened for a marketing demo -- the real default is 30s, set in Settings

  function randomCode() {
    var out = "";
    for (var i = 0; i < CODE_LENGTH; i++) {
      out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return out;
  }

  var storePage = document.getElementById("mock-store-page");
  var pauseView = document.getElementById("mock-pause-view");
  var successView = document.getElementById("mock-success-view");
  var successMethod = document.getElementById("mock-success-method");
  var storeBuyBtn = document.getElementById("mock-store-buy");
  var walletRow = document.getElementById("mock-wallet-row");
  var walletShield = document.getElementById("mock-wallet-shield");
  var storeResetBtn = document.getElementById("mock-store-reset");
  var calmBtn = document.getElementById("mock-calm");

  var codeDisplay = document.getElementById("mock-code-display");
  var codeInput = document.getElementById("mock-code-input");
  var promptInput = document.getElementById("mock-prompt-input");
  var timerDisplay = document.getElementById("mock-timer-display");
  var timerFill = document.getElementById("mock-timer-fill");
  var continueBtn = document.getElementById("mock-continue");
  var currentCode = randomCode();
  var timerInterval = null;
  var blocked = false; // matches the real demo's default: "Not Yet: off" is selected first
  var pendingMethod = "";

  // ---- Code tab: bolds the matched-so-far PREFIX as you type, exactly
  // like the real block screen -- one wrong character stops the
  // bolding right there, it doesn't just skip that one character. ----
  function renderCode(typed) {
    var html = "";
    var stillMatching = true;
    for (var i = 0; i < currentCode.length; i++) {
      if (stillMatching && i < typed.length && typed[i] === currentCode[i]) {
        html += '<span class="matched">' + currentCode[i] + "</span>";
      } else {
        stillMatching = false;
        html += '<span class="pending">' + currentCode[i] + "</span>";
      }
    }
    codeDisplay.innerHTML = html;
  }

  function resetCodeDemo() {
    currentCode = randomCode();
    if (codeInput) codeInput.value = "";
    if (codeDisplay) codeDisplay.classList.remove("mock-code-complete");
    renderCode("");
  }

  if (codeInput && codeDisplay) {
    codeInput.addEventListener("input", function () {
      var typed = codeInput.value.toUpperCase().slice(0, currentCode.length);
      codeInput.value = typed;
      renderCode(typed);
      var complete = typed === currentCode;
      codeDisplay.classList.toggle("mock-code-complete", complete);
      setContinueReady(complete);
      if (complete) {
        // Nothing is cached or reused -- reload the real block screen
        // and you get a brand new code. Loops here so a visitor can
        // see that claim more than once without reloading the page.
        setTimeout(function () {
          resetCodeDemo();
          setContinueReady(false);
        }, 1400);
      }
    });
  }

  // ---- Prompt tab: "ready" once there's a real answer, not just any
  // keystroke -- mirrors the real reflect mode requiring an actual
  // written response, not a rubber-stamp click. ----
  if (promptInput) {
    promptInput.addEventListener("input", function () {
      setContinueReady(promptInput.value.trim().length >= 8);
    });
  }

  // ---- Timer tab: a real countdown with a shrinking progress bar. ----
  function formatTime(s) {
    return "0:" + (s < 10 ? "0" : "") + s;
  }

  function startTimer() {
    stopTimer();
    var remaining = TIMER_SECONDS;
    if (timerDisplay) timerDisplay.textContent = formatTime(remaining);
    if (timerFill) timerFill.style.transform = "scaleX(1)";
    setContinueReady(false);
    timerInterval = setInterval(function () {
      remaining -= 1;
      if (timerDisplay) timerDisplay.textContent = formatTime(Math.max(0, remaining));
      if (timerFill) timerFill.style.transform = "scaleX(" + Math.max(0, remaining / TIMER_SECONDS) + ")";
      if (remaining <= 0) {
        stopTimer();
        setContinueReady(true);
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function setContinueReady(ready) {
    if (continueBtn) continueBtn.classList.toggle("mock-btn-ready", ready);
  }

  // ---- Pause-view tabs ----
  var tabs = frame.querySelectorAll(".mock-tab");
  var panels = frame.querySelectorAll(".mock-panel");

  function selectTab(name) {
    tabs.forEach(function (t) {
      var active = t.getAttribute("data-mock-tab") === name;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    panels.forEach(function (p) {
      p.hidden = p.getAttribute("data-mock-panel") !== name;
    });
    stopTimer();
    if (name === "timer") {
      startTimer();
    } else if (name === "code") {
      setContinueReady(codeInput ? codeInput.value === currentCode : false);
    } else {
      setContinueReady(false);
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      selectTab(tab.getAttribute("data-mock-tab"));
    });
  });

  // Fresh state every time the pause view is entered, so re-triggering
  // the demo never picks up a stale typed code, a leftover reflection
  // answer, or a timer stuck mid-countdown from a previous try.
  function resetPauseDemo() {
    resetCodeDemo();
    if (promptInput) promptInput.value = "";
    selectTab("code");
  }

  // ---- The three top-level views: store / paused / success. Only one
  // is ever visible at a time -- no layered overlay to get z-index
  // wrong, just a plain [hidden] swap. ----
  function setView(view) {
    frame.dataset.demoView = view;
    storePage.hidden = view !== "store";
    pauseView.hidden = view !== "paused";
    successView.hidden = view !== "success";
    if (view === "paused") resetPauseDemo();
    if (view !== "timer" && view !== "paused") stopTimer();
  }

  function setBlocked(next) {
    blocked = next;
    frame.querySelectorAll(".mock-toggle-btn").forEach(function (btn) {
      var on = btn.getAttribute("data-demo-toggle") === (next ? "on" : "off");
      btn.classList.toggle("active", on);
    });
    if (walletRow) walletRow.hidden = blocked;
    if (walletShield) walletShield.hidden = !blocked;
    setView("store");
  }

  function showSuccess(method) {
    if (successMethod) successMethod.textContent = method ? "Paid with " + method + "." : "";
    setView("success");
  }

  // The one real decision point: blocked means clicking a checkout
  // button brings up the pause screen instead of completing anything,
  // exactly like a real checkout page (findBlockReason/buildOverlay)
  // or a shielded buy button (nycActiveShields' click handler) in the
  // real content.js.
  function attemptCheckout(method) {
    pendingMethod = method || "";
    if (blocked) {
      setView("paused");
    } else {
      showSuccess(pendingMethod);
    }
  }

  frame.querySelectorAll(".mock-toggle-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setBlocked(btn.getAttribute("data-demo-toggle") === "on");
    });
  });

  if (storeBuyBtn) storeBuyBtn.addEventListener("click", function () { attemptCheckout(""); });
  frame.querySelectorAll(".mock-wallet-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      attemptCheckout(btn.getAttribute("data-demo-wallet") || btn.textContent.trim());
    });
  });
  // Only reachable at all while blocked (walletRow is hidden then --
  // see setBlocked), same as the real shield only ever sitting on top
  // of a button while protection is active.
  if (walletShield) walletShield.addEventListener("click", function () { attemptCheckout(""); });

  // Continue only completes once the current method is actually done
  // (the code fully retyped, a real reflection answer, or the timer
  // run out) -- stricter than the extension's own onboarding demo,
  // which lets this button through immediately since its input is
  // readonly. Here typing genuinely matters, so skipping ahead isn't
  // possible, which is more honest to what the real block screen does.
  if (continueBtn) {
    continueBtn.addEventListener("click", function () {
      if (continueBtn.classList.contains("mock-btn-ready")) showSuccess(pendingMethod);
    });
  }
  // "Take me somewhere calmer instead" resets the demo AND scrolls to
  // the real Quiet Place showcase further down the page -- a richer
  // version of the plain "back to store" the onboarding demo does,
  // since this page actually has somewhere to send you.
  if (calmBtn) {
    calmBtn.addEventListener("click", function () {
      setView("store");
      var quietPlace = document.getElementById("quiet-place");
      if (quietPlace) quietPlace.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (storeResetBtn) storeResetBtn.addEventListener("click", function () { setView("store"); });

  renderCode("");
  setBlocked(false);
})();
