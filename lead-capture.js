/* eslint-env browser */
/*
  HRCC lead capture — logs two moments into Supabase so the admin Lead Funnel
  can show them:
    1. Someone requests the 50-State Quick Reference (the guide-download popup).
    2. A known lead clicks "Create Free Account" (any link to the app's sign-up page).

  Sends one small request to the record_lead_event function, so pages don't need
  the Supabase client library. Load it on any page with the guide popup or the
  sign-up buttons:

    <script defer src="/lead-capture.js"></script>

  It listens for the events without touching your existing popup or button code.
*/
(function () {
  // ===== CONFIG: Supabase values (anon key is public/safe) =================
  var SB_URL  = "https://blmnnmsrztxuwawmgkkf.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbW5ubXNyenR4dXdhd21na2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjMwNjUsImV4cCI6MjA5MTc5OTA2NX0.OuCQgZQAinZDi3XHKZqrNBh3XplTuSEo7AsFCrhPZjk";
  // ========================================================================

  function firstTouch() {
    try { return JSON.parse(localStorage.getItem("hrcc_first_touch") || "{}"); } catch (e) { return {}; }
  }
  function rememberEmail(email) {
    try { if (email) localStorage.setItem("hrcc_lead_email", email.trim().toLowerCase()); } catch (e) {}
  }
  function knownEmail() {
    try { return localStorage.getItem("hrcc_lead_email") || null; } catch (e) { return null; }
  }
  function send(args) {
    try {
      // keepalive lets the request finish even if the click navigates away.
      fetch(SB_URL + "/rest/v1/rpc/record_lead_event", {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": SB_ANON,
          "Authorization": "Bearer " + SB_ANON
        },
        body: JSON.stringify(args)
      }).catch(function () {});
    } catch (e) {}
  }

  // 1) Guide request — when the 50-State guide-download form is submitted
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || form.id !== "gdForm") return;
    var emailEl = form.querySelector("#gdEmail");
    var nameEl  = form.querySelector("#gdFirst");
    var email = emailEl ? emailEl.value : "";
    var name  = nameEl ? nameEl.value : "";
    rememberEmail(email);
    var ft = firstTouch();
    send({
      p_event: "guide_request",
      p_email: email,
      p_first_name: name || null,
      p_source: ft.channel || null,
      p_landing: ft.landingPage || location.pathname
    });
  }, true);

  // 2) Sign-up click — clicking any link to the app's sign-up page. Recorded as
  //    "trial_click" so the existing Lead Funnel and database function keep working.
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href*="app.hrcompliancecompass.com"]') : null;
    if (!a) return;
    var email = knownEmail();
    if (!email) return;  // named leads only for now: skip clicks we can't tie to a person
    var ft = firstTouch();
    send({
      p_event: "trial_click",
      p_email: email,
      p_source: ft.channel || null,
      p_landing: location.pathname
    });
  }, true);
})();
