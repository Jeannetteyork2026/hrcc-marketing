/* eslint-env browser */
/*
  HRCC lead capture — logs two moments into Supabase so the admin Lead Funnel
  can show them:
    1. Someone requests the 50-State Quick Reference (the guide-download popup).
    2. Someone clicks "Start Free Trial" (a Stripe checkout link).

  How to use: load the Supabase client, then this file, on any page that has
  the guide popup and/or the trial buttons (your landing page and insight posts):

    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="/lead-capture.js"></script>

  It listens for the events without touching your existing popup or button code.
*/
(function () {
  // ===== CONFIG: paste your Supabase values (anon key is public/safe) =====
  var SB_URL  = "https://blmnnmsrztxuwawmgkkf.supabase.co";
  var SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbW5ubXNyenR4dXdhd21na2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjMwNjUsImV4cCI6MjA5MTc5OTA2NX0.OuCQgZQAinZDi3XHKZqrNBh3XplTuSEo7AsFCrhPZjk";
  // ========================================================================

  if (SB_URL.indexOf("PASTE_") === 0 || !window.supabase) return;
  var client = window.supabase.createClient(SB_URL, SB_ANON);

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
    try { client.rpc("record_lead_event", args).then(function () {}, function () {}); } catch (e) {}
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

  // 2) Trial click — clicking any Start Free Trial link (Stripe checkout)
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href*="buy.stripe.com"]') : null;
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
