// Hero mock-overlay demo -- a genuinely interactive illustration of
// all three real unlock methods (content.js's setupCode/setupReflect/
// setupWait in the extension itself), not just static mockup art. No
// analytics call here on purpose: nothing typed into this demo (a
// reflection answer especially) should ever be tracked, matching the
// real extension's own "never reads what you type" claim.
(function () {
  var overlay = document.getElementById("mock-overlay");
  if (!overlay) return;

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

  var codeDisplay = document.getElementById("mock-code-display");
  var codeInput = document.getElementById("mock-code-input");
  var promptInput = document.getElementById("mock-prompt-input");
  var timerDisplay = document.getElementById("mock-timer-display");
  var timerFill = document.getElementById("mock-timer-fill");
  var continueBtn = document.getElementById("mock-continue");
  var currentCode = randomCode();
  var timerInterval = null;

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
    setContinueReady(false);
  }

  if (codeInput && codeDisplay) {
    renderCode("");
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
        setTimeout(resetCodeDemo, 1400);
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

  // ---- Tabs ----
  var tabs = overlay.querySelectorAll(".mock-tab");
  var panels = overlay.querySelectorAll(".mock-panel");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.getAttribute("data-mock-tab");
      tabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute("data-mock-panel") !== target;
      });

      stopTimer();
      if (target === "timer") {
        startTimer();
      } else if (target === "code") {
        setContinueReady(codeInput ? codeInput.value === currentCode : false);
      } else {
        setContinueReady(false);
      }
    });
  });
})();
