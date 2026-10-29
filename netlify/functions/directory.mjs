// Provider directory pages, built from public.directory_listings (Supabase).
// Listings are researched and approved in the CRM, then copied there by
// `php artisan directory:publish`. _redirects sends /directory and
// /directory/* here.
//
//   /directory                      directory home: search by state + service
//   /directory?state=OH&service=x   search results (noindex)
//   /directory/<state-name>         providers serving that state
//   /directory/<state-name>/<slug>  one listing

const SB_URL = "https://blmnnmsrztxuwawmgkkf.supabase.co";
// Public anon key (read-only; row-level security allows reading listings only).
const SB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbW5ubXNyenR4dXdhd21na2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjMwNjUsImV4cCI6MjA5MTc5OTA2NX0.OuCQgZQAinZDi3XHKZqrNBh3XplTuSEo7AsFCrhPZjk";
const SITE = "https://www.hrcompliancecompass.com";

const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const STATE_BY_SLUG = Object.fromEntries(Object.entries(STATES).map(([code, name]) => [slugify(name), code]));
const stateSlug = (code) => slugify(STATES[code] || code);

// Mirrors hrcc-crm app/Support/BusinessOptions.php.
const CATEGORIES = {
  hr_consulting: "HR consulting & fractional HR", payroll: "Payroll services", peo: "PEO & HR outsourcing",
  recruiting: "Recruiting & staffing", benefits: "Employee benefits", compliance: "HR compliance & employee relations",
  investigations: "Workplace investigations", training: "Training & leadership development",
  compensation: "Compensation & total rewards", hr_technology: "HR technology & HRIS", employment_law: "Employment law services",
};
const SERVICES = {
  fractional_hr: "Fractional HR", handbooks: "Handbooks & policies", employee_relations: "Employee relations",
  leave: "Leave administration", payroll: "Payroll processing", benefits: "Benefits administration",
  recruiting: "Recruiting", onboarding: "Onboarding", investigations: "Workplace investigations",
  training: "Workplace training", leadership: "Leadership development", compensation: "Compensation planning",
  compliance: "Compliance reviews", hris: "HRIS implementation",
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function query(params) {
  const res = await fetch(`${SB_URL}/rest/v1/directory_listings?${params}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const COLS = "slug,name,website_url,description,phone,public_email,city,state_code,primary_category,categories,services,service_areas,nationwide,remote_available,tier,google_maps_url,is_claimed,is_sponsor,industries_served,company_sizes,logo_url,social_links";

function servingState(code) {
  return `or=(state_code.eq.${code},service_areas.cs.{${code}},nationwide.is.true)`;
}

// Office in the state first, then firms covering the state, then nationwide.
// Top rated first inside each group.
function sortForState(rows, code) {
  const group = (r) => (r.state_code === code ? 0 : r.nationwide ? 2 : 1);
  return rows.sort((a, b) =>
    group(a) - group(b) || (a.tier === "top_rated" ? -1 : 0) - (b.tier === "top_rated" ? -1 : 0) || a.name.localeCompare(b.name));
}

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/directory\/?/, "").split("/").filter(Boolean);
  try {
    if (parts.length === 0) return await homePage(url);
    const code = STATE_BY_SLUG[parts[0]];
    if (!code) return notFound();
    if (parts.length === 1) return await statePage(code);
    if (parts.length === 2) return await listingPage(code, parts[1]);
    return notFound();
  } catch (err) {
    console.error("directory failed:", err);
    return html(page({
      title: "Provider Directory | HR Compliance Compass",
      description: "Find vetted HR providers by state.",
      canonical: `${SITE}/directory`,
      body: `<h1>Provider Directory</h1><p>The directory is temporarily unavailable. Please try again in a few minutes.</p>`,
      noindex: true,
    }), 503);
  }
};

async function homePage(url) {
  const state = (url.searchParams.get("state") || "").toUpperCase();
  const service = url.searchParams.get("service") || "";
  const isSearch = Boolean(state || service);

  let params = `select=${COLS}`;
  if (STATES[state]) params += `&${servingState(state)}`;
  if (SERVICES[service]) params += `&services=cs.{${service}}`;
  const rows = await query(params);
  const list = STATES[state] ? sortForState(rows, state) : rows.sort((a, b) => a.name.localeCompare(b.name));

  const counts = {};
  if (!isSearch) {
    for (const r of rows) {
      if (r.nationwide) continue;
      for (const c of new Set([r.state_code, ...(r.service_areas || [])].filter(Boolean))) counts[c] = (counts[c] || 0) + 1;
    }
  }

  const stateOptions = Object.entries(STATES)
    .map(([c, n]) => `<option value="${c}"${c === state ? " selected" : ""}>${n}</option>`).join("");
  const serviceOptions = Object.entries(SERVICES)
    .map(([k, l]) => `<option value="${k}"${k === service ? " selected" : ""}>${esc(l)}</option>`).join("");

  const heading = isSearch
    ? `${SERVICES[service] || "HR providers"}${STATES[state] ? ` serving ${STATES[state]}` : ""}`
    : "Find HR help you can trust";

  const body = `
    <div class="eyebrow">Provider Directory</div>
    <h1>${esc(heading)}</h1>
    <p class="lede">HR consultants, payroll, benefits, training and other HR providers, researched and reviewed by HR Compliance Compass before they're listed. Listings are not endorsements.</p>
    <form class="search" method="get" action="/directory">
      <label>State<select name="state"><option value="">Any state</option>${stateOptions}</select></label>
      <label>Service<select name="service"><option value="">Any service</option>${serviceOptions}</select></label>
      <button type="submit">Search</button>
    </form>
    ${list.length ? `<div class="results">${list.map((r) => card(r)).join("")}</div>` : emptyState()}
    ${!isSearch && Object.keys(counts).length ? `<h2>Browse by state</h2><ul class="states">${Object.keys(counts).sort((a, b) => STATES[a].localeCompare(STATES[b]))
      .map((c) => `<li><a href="/directory/${stateSlug(c)}">${STATES[c]}</a> <span>${counts[c]}</span></li>`).join("")}</ul>` : ""}
  `;
  return html(page({
    title: isSearch ? `${heading} | HR Compliance Compass` : "HR Provider Directory: Find Vetted HR Help by State | HR Compliance Compass",
    description: "Find researched, reviewed HR consultants, payroll, benefits and training providers by state and service.",
    canonical: `${SITE}/directory`,
    body,
    noindex: isSearch,
  }));
}

async function statePage(code) {
  const name = STATES[code];
  const rows = sortForState(await query(`select=${COLS}&${servingState(code)}`), code);
  const local = rows.filter((r) => !r.nationwide);
  const body = `
    <p class="crumbs"><a href="/directory">Directory</a> / ${name}</p>
    <div class="eyebrow">${name}</div>
    <h1>HR providers serving ${name}</h1>
    <p class="lede">HR consultants and service providers that work with ${name} employers, researched and reviewed before listing. Firms with an office in ${name} come first, then firms that cover the state, then nationwide providers.</p>
    ${rows.length ? `<div class="results">${rows.map((r) => card(r, code)).join("")}</div>` : emptyState(name)}
  `;
  return html(page({
    title: `HR Consultants & Providers in ${name} | HR Compliance Compass`,
    description: `Find reviewed HR consultants, payroll, benefits and training providers serving ${name} employers.`,
    canonical: `${SITE}/directory/${stateSlug(code)}`,
    body,
    // Thin pages stay out of search results until they have a few local listings.
    noindex: local.length < 3,
  }));
}

async function listingPage(code, slug) {
  const rows = await query(`select=${COLS}&slug=eq.${encodeURIComponent(slug)}`);
  const r = rows[0];
  if (!r) return notFound();
  const home = r.state_code || code;
  if (stateSlug(home) !== stateSlug(code)) {
    return new Response(null, { status: 301, headers: { Location: `/directory/${stateSlug(home)}/${r.slug}` } });
  }
  const rel = r.is_sponsor ? "sponsored noopener" : r.is_claimed ? "noopener" : "nofollow noopener";
  const areas = r.nationwide ? "Nationwide" : (r.service_areas || []).map((c) => STATES[c] || c).join(", ");
  const place = [r.city, STATES[r.state_code]].filter(Boolean).join(", ");
  const social = Object.entries(r.social_links || {}).filter(([, v]) => v)
    .map(([k, v]) => `<a href="${esc(v)}" rel="nofollow noopener" target="_blank">${esc(k[0].toUpperCase() + k.slice(1))}</a>`).join(" · ");
  const jsonLd = {
    "@context": "https://schema.org", "@type": "ProfessionalService", name: r.name, url: r.website_url,
    description: r.description || undefined, telephone: r.phone || undefined, email: r.public_email || undefined,
    address: r.city || r.state_code ? { "@type": "PostalAddress", addressLocality: r.city || undefined, addressRegion: r.state_code || undefined, addressCountry: "US" } : undefined,
    areaServed: r.nationwide ? "US" : (r.service_areas || []).map((c) => STATES[c] || c),
    logo: r.logo_url || undefined,
  };
  const body = `
    <p class="crumbs"><a href="/directory">Directory</a> / <a href="/directory/${stateSlug(home)}">${STATES[home] || home}</a> / ${esc(r.name)}</p>
    <div class="listing">
      ${r.logo_url ? `<img class="logo" src="${esc(r.logo_url)}" alt="${esc(r.name)} logo" width="72" height="72">` : ""}
      <div>
        ${badges(r)}
        <h1>${esc(r.name)}</h1>
        <p class="meta">${esc(CATEGORIES[r.primary_category] || "")}${place ? ` · ${esc(place)}` : ""}</p>
      </div>
    </div>
    ${r.description ? `<p class="lede">${esc(r.description)}</p>` : ""}
    <dl class="facts">
      ${(r.services || []).length ? `<dt>Services</dt><dd>${r.services.map((s) => esc(SERVICES[s] || s)).join(", ")}</dd>` : ""}
      ${areas ? `<dt>Serves</dt><dd>${esc(areas)}${r.remote_available ? " (remote work available)" : ""}</dd>` : ""}
      ${(r.industries_served || []).length ? `<dt>Industries</dt><dd>${r.industries_served.map(esc).join(", ")}</dd>` : ""}
      ${(r.company_sizes || []).length ? `<dt>Company sizes</dt><dd>${r.company_sizes.map(esc).join(", ")} employees</dd>` : ""}
      ${r.phone ? `<dt>Phone</dt><dd><a href="tel:${esc(r.phone)}">${esc(r.phone)}</a></dd>` : ""}
      ${r.public_email ? `<dt>Email</dt><dd><a href="mailto:${esc(r.public_email)}">${esc(r.public_email)}</a></dd>` : ""}
      ${social ? `<dt>Social</dt><dd>${social}</dd>` : ""}
    </dl>
    <p class="actions">
      <a class="btn" href="${esc(r.website_url)}" rel="${rel}" target="_blank">Visit website</a>
      ${r.google_maps_url ? `<a class="btn ghost" href="${esc(r.google_maps_url)}" rel="nofollow noopener" target="_blank">Google reviews</a>` : ""}
    </p>
    <p class="note">Listed after research and review by HR Compliance Compass. A listing is not an endorsement; check any provider before you hire them.
    ${r.is_claimed ? "" : `Is this your business? <a href="/contact.html">Contact us</a> to claim or update this listing.`}</p>
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>
  `;
  return html(page({
    title: `${r.name}${place ? `, ${CATEGORIES[r.primary_category] || "HR provider"} in ${place}` : ""} | HR Compliance Compass`,
    description: (r.description || `${r.name}: HR provider${place ? ` in ${place}` : ""}.`).slice(0, 155),
    canonical: `${SITE}/directory/${stateSlug(home)}/${r.slug}`,
    body,
  }));
}

function badges(r) {
  const out = [];
  if (r.is_sponsor) out.push(`<span class="badge sponsor">Sponsored</span>`);
  if (r.tier === "top_rated") out.push(`<span class="badge top">Top rated</span>`);
  if (r.is_claimed) out.push(`<span class="badge">Claimed</span>`);
  if (r.nationwide) out.push(`<span class="badge">Nationwide</span>`);
  return out.length ? `<div class="badges">${out.join("")}</div>` : "";
}

function card(r, forState) {
  const href = `/directory/${stateSlug(r.state_code || forState || "US")}/${r.slug}`;
  const place = [r.city, r.state_code].filter(Boolean).join(", ");
  const covers = forState && r.state_code !== forState && !r.nationwide ? `Covers ${STATES[forState]}` : "";
  return `<a class="card" href="${href}">
    ${badges(r)}
    <strong>${esc(r.name)}</strong>
    <span class="meta">${esc(CATEGORIES[r.primary_category] || "")}${place ? ` · ${esc(place)}` : ""}${covers ? ` · ${covers}` : ""}</span>
    ${r.description ? `<span class="desc">${esc(r.description.length > 160 ? r.description.slice(0, 157) + "..." : r.description)}</span>` : ""}
  </a>`;
}

function emptyState(stateName) {
  return `<div class="empty"><p><strong>We're still adding providers${stateName ? ` for ${stateName}` : ""}.</strong> Every listing is researched and reviewed before it goes live, so the directory grows a little at a time.</p>
  <p>Are you an HR provider? <a href="/contact.html">Ask to be considered.</a></p></div>`;
}

function notFound() {
  return html(page({
    title: "Not found | HR Compliance Compass", description: "", canonical: `${SITE}/directory`, noindex: true,
    body: `<h1>We couldn't find that page</h1><p><a href="/directory">Back to the provider directory</a></p>`,
  }), 404);
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      // Netlify's CDN keeps pages for 10 minutes, so new listings appear within 10 minutes.
      "Netlify-CDN-Cache-Control": status === 200 ? "public, s-maxage=600, stale-while-revalidate=3600" : "no-store",
    },
  });
}

function page({ title, description, canonical, body, noindex = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
${noindex ? '<meta name="robots" content="noindex, follow">' : ""}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/compass-share.jpg">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/hrcc-icon-64.png">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-9CXFF6HMVN"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-9CXFF6HMVN');</script>
<style>
:root{--ink:#0b0e14;--cream:#f3ede1;--cream-soft:#e8dfcf;--gold:#d4a154;--gold-light:#e6b86d;--serif:'Cormorant Garamond',Georgia,serif;--sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:var(--sans);background:var(--cream);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:#a16207}
.site-nav{background:var(--ink);padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
.nav-logo{display:flex;align-items:center;gap:.6rem;color:var(--cream);font-family:var(--serif);font-size:1.15rem;text-decoration:none}
.nav-logo img{width:28px;height:28px}.nav-logo span{color:var(--gold-light);font-style:italic}
.nav-links{display:flex;gap:1.4rem;list-style:none;padding:0;margin:0;flex-wrap:wrap}
.nav-links a{color:rgba(243,237,225,.8);font-size:.92rem;text-decoration:none}
.nav-cta{background:var(--gold);color:var(--ink)!important;padding:.45rem .9rem;border-radius:2px;font-weight:600}
main{max-width:920px;margin:0 auto;padding:3rem 1.25rem 4rem}
.eyebrow{font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:#a16207;margin-bottom:.6rem}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(2rem,5vw,3rem);line-height:1.1;margin:0 0 1rem}
h2{font-family:var(--serif);font-weight:400;font-size:1.7rem;margin:2.5rem 0 1rem}
.lede{font-size:1.05rem;color:rgba(11,14,20,.8);max-width:720px}
.crumbs{font-size:.85rem;color:#64748b;margin:0 0 1.5rem}
.search{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;background:white;border:1px solid rgba(11,14,20,.1);padding:16px;margin:1.5rem 0 2rem}
.search label{display:grid;gap:4px;font-size:.8rem;font-weight:600;flex:1 1 200px}
.search select{padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:.95rem;background:white}
.search button,.btn{background:var(--ink);color:var(--cream);border:0;padding:11px 20px;font-weight:600;font-size:.95rem;cursor:pointer;text-decoration:none;display:inline-block}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink);margin-left:8px}
.results{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
.card{display:grid;gap:6px;align-content:start;background:white;border:1px solid rgba(11,14,20,.1);padding:16px;text-decoration:none;color:inherit}
.card:hover{border-color:var(--gold)}.card strong{font-size:1.05rem}
.meta{font-size:.82rem;color:#64748b}.desc{font-size:.88rem;color:#334155}
.badges{display:flex;gap:6px;flex-wrap:wrap}
.badge{font-size:.7rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:var(--cream-soft);padding:2px 8px;border-radius:999px}
.badge.top{background:#dcfce7;color:#166534}.badge.sponsor{background:#fef3c7;color:#92400e}
.states{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.states span{color:#64748b;font-size:.85rem}
.listing{display:flex;gap:16px;align-items:center}.logo{border-radius:8px;background:white;object-fit:contain}
.facts{display:grid;grid-template-columns:140px 1fr;gap:8px 16px;background:white;border:1px solid rgba(11,14,20,.1);padding:16px;margin:1.5rem 0}
.facts dt{font-weight:600}.facts dd{margin:0}
.actions{margin:1.5rem 0}.note{font-size:.85rem;color:#64748b;margin-top:2rem}
.empty{background:white;border:1px dashed rgba(11,14,20,.2);padding:20px}
footer{background:var(--ink);color:rgba(243,237,225,.55);padding:2rem;text-align:center;font-size:.85rem}
footer a{color:var(--gold-light);margin:0 .6rem}
@media(max-width:600px){.facts{grid-template-columns:1fr}.btn.ghost{margin:8px 0 0}}
</style>
</head>
<body>
<nav class="site-nav">
  <a class="nav-logo" href="/"><img src="/hrcc-icon-64.png" alt="">HR Compliance <span>Compass</span></a>
  <ul class="nav-links">
    <li><a href="/directory">Directory</a></li>
    <li><a href="/insights.html">Insights</a></li>
    <li><a href="/faqs.html">FAQs</a></li>
    <li><a href="/contact.html">Contact</a></li>
    <li><a href="https://app.hrcompliancecompass.com/login.html" class="nav-cta">Create Free Account</a></li>
  </ul>
</nav>
<main>${body}</main>
<footer>&copy; ${new Date().getFullYear()} CompassLine LLC. <a href="/">Home</a><a href="/how-we-verify.html">How We Verify</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a></footer>
<script src="/analytics.js"></script>
</body>
</html>`;
}
