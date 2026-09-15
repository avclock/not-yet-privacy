// "Report a site that isn't working right" -- ported from the
// extension's own wireReportSite() (options.js). Deliberately just a
// pre-filled email draft, not an auto-submitted form: this site has
// no server behind the extension it describes, and adding one here,
// even just to relay a report, would be the first exception to that.
// A mailto: link needs neither -- it hands off to the visitor's own
// mail app, which they review and send (or don't) like any other
// email, so nothing leaves the device without their own final click.
(function () {
  var REPORT_EMAIL = "avclock@protonmail.com";
  var TYPE_LABELS = {
    "not-blocking": "Should have blocked, didn't",
    "over-blocking": "Blocked when it shouldn't have",
    "wrong-price": "Auto-filled amount was wrong",
    shield: "Buy-button shield on the wrong spot",
    other: "Something else"
  };

  document.addEventListener("DOMContentLoaded", function () {
    var urlInput = document.getElementById("report-site-url");
    var typeSelect = document.getElementById("report-site-type");
    var notesInput = document.getElementById("report-site-notes");
    var sendBtn = document.getElementById("report-site-send");
    var errorEl = document.getElementById("report-site-error");
    if (!sendBtn) return;

    sendBtn.addEventListener("click", function () {
      var site = urlInput.value.trim();
      if (!site) {
        errorEl.hidden = false;
        urlInput.focus();
        return;
      }
      errorEl.hidden = true;

      var typeLabel = TYPE_LABELS[typeSelect.value] || typeSelect.value;
      var notes = notesInput.value.trim();
      var subject = "Not Yet report: " + typeLabel;
      var bodyLines = [
        "Site: " + site,
        "Issue: " + typeLabel,
        "",
        notes || "(no extra notes)"
      ];
      window.location.href = "mailto:" + REPORT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(bodyLines.join("\n"));
    });
  });
})();
