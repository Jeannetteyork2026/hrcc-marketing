/* ============================================================
   HR Compliance Compass — Lead Source Tracker
   ------------------------------------------------------------
   Remembers WHERE a visitor first came from and WHICH page they
   first landed on, then keeps that memory as they move around
   the site. When they later fill out the contact form, that
   memory is attached to their submission.

   "First-touch": we only record the very first arrival. If the
   same person comes back later, we keep the original source.
   ============================================================ */
(function () {
  var KEY = "hrcc_first_touch";

  // If we've already recorded this visitor's first arrival, stop here.
  try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }

  var params = new URLSearchParams(window.location.search);
  var referrer = document.referrer || "";
  var thisHost = location.hostname.replace(/^www\./, "");

  // --- Work out the channel from the referring website ---
  function channelFromReferrer(r) {
    if (!r) return "Direct / typed URL";
    var host;
    try { host = new URL(r).hostname.replace(/^www\./, ""); }
    catch (e) { return "Other / unknown"; }
    if (host.indexOf(thisHost) !== -1) return "Direct / typed URL"; // came from our own page
    if (/(^|\.)google\./.test(host)) return "Google Search";
    if (/(^|\.)(bing|duckduckgo|yahoo|ecosia)\./.test(host)) return "Google Search";
    if (/linkedin\./.test(host)) return "LinkedIn (organic)";
    if (/(facebook|fb)\./.test(host)) return "Facebook (organic)";
    if (/instagram\./.test(host)) return "Instagram";
    return "Referral"; // some other website (e.g. a blog) linked to us
  }

  // --- If the link was tagged with UTM labels, trust those first ---
  var utmSource = params.get("utm_source") || "";
  var utmMedium = params.get("utm_medium") || "";
  var channel;

  if (utmSource) {
    var s = utmSource.toLowerCase();
    var paid = /(cpc|ppc|paid|ad|ads|adwords|display|social-paid)/i.test(utmMedium);
    if (s.indexOf("google") !== -1) channel = paid ? "Google Ads" : "Google Search";
    else if (s.indexOf("linkedin") !== -1) channel = paid ? "LinkedIn Ads" : "LinkedIn (organic)";
    else if (s.indexOf("facebook") !== -1 || s.indexOf("fb") !== -1 || s.indexOf("meta") !== -1) channel = paid ? "Facebook Ads" : "Facebook (organic)";
    else if (s.indexOf("instagram") !== -1 || s.indexOf("ig") !== -1) channel = "Instagram";
    else if (/email|newsletter|klaviyo/.test(s)) channel = "Email";
    else if (/webinar|event/.test(s)) channel = "Webinar / event";
    else channel = "Other / unknown";
  } else {
    channel = channelFromReferrer(referrer);
  }

  // --- Was their first page the blog or the main site? ---
  var path = location.pathname || "/";
  var section = /\/blog/i.test(path) ? "Blog" : "Main site";

  var record = {
    channel: channel,
    landingPage: path,
    landingSection: section,
    referrer: referrer,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: params.get("utm_campaign") || "",
    firstSeen: new Date().toISOString()
  };

  try { localStorage.setItem(KEY, JSON.stringify(record)); } catch (e) {}
})();

/* ------------------------------------------------------------
   FORM HELPER
   Call hrccFillLeadSource() on the page that has your contact
   form. It copies the remembered source into the hidden fields
   so it gets submitted along with the form.
   ------------------------------------------------------------ */
function hrccFillLeadSource() {
  var data = {};
  try { data = JSON.parse(localStorage.getItem("hrcc_first_touch") || "{}"); } catch (e) {}
  function set(id, val) { var el = document.getElementById(id); if (el) el.value = val || ""; }
  set("leadChannel", data.channel || "Direct / typed URL");
  set("leadLandingPage", data.landingPage || location.pathname);
  set("leadLandingSection", data.landingSection || "Main site");
  set("leadReferrer", data.referrer || "");
  set("leadCampaign", data.utm_campaign || "");
}
document.addEventListener("DOMContentLoaded", hrccFillLeadSource);
