// Public state law pages, built live from the published law cards (Supabase).
// _redirects sends /state-laws and /state-laws/* here.
//
//   /state-laws                      all states
//   /state-laws/<state-name>         one state: the quick answer for each topic
//   /state-laws/<state-name>/<topic> one topic: quick answer, source, last reviewed
//   /state-laws/sitemap.xml          sitemap of every page above
//
// A topic gets a page only when its card is "ready": published, active,
// reviewed (last_reviewed set), has a Quick Reference answer and at least one
// source link. Everything else is left out, so no page shows an unreviewed
// answer. The full card (requirements, exceptions, talk track) stays in the app.
import { SB_URL, SB_ANON, SITE, STATES, slugify, esc, html, page } from "./directory.mjs";

const APP = "https://app.hrcompliancecompass.com/login.html";

// key: laws.category_key. slug and names are what people search for.
const TOPICS = [
  { key: "minimum_wage", slug: "minimum-wage", name: "Minimum wage", title: "minimum wage" },
  { key: "overtime_rules", slug: "overtime", name: "Overtime", title: "overtime rules" },
  { key: "final_pay_termination", slug: "final-pay", name: "Final pay", title: "final pay rules" },
  { key: "paid_sick_leave", slug: "paid-sick-leave", name: "Paid sick leave", title: "paid sick leave" },
  { key: "family_medical_leave", slug: "family-medical-leave", name: "Family and medical leave", title: "family and medical leave" },
  { key: "pay_transparency", slug: "pay-transparency", name: "Pay transparency", title: "pay transparency rules" },
];
const TOPIC_BY_SLUG = Object.fromEntries(TOPICS.map((t) => [t.slug, t]));
const STATE_BY_SLUG = Object.fromEntries(Object.entries(STATES).map(([code, name]) => [slugify(name), code]));
const stateSlug = (code) => slugify(STATES[code]);

async function cards(filter = "") {
  const keys = TOPICS.map((t) => t.key).join(",");
  const res = await fetch(
    `${SB_URL}/rest/v1/laws?select=state_code,category_key,quick_ref_display_value,formal_name,sources,last_reviewed` +
      `&is_published=is.true&law_status=eq.active&last_reviewed=not.is.null&category_key=in.(${keys})${filter}`,
    { headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` } },
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return (await res.json()).filter(ready);
}

const sourcesOf = (c) =>
  (Array.isArray(c.sources) ? c.sources : []).filter((s) => s && /^https?:\/\//.test(s.url || ""));
const ready = (c) => STATES[c.state_code] && (c.quick_ref_display_value || "").trim() && sourcesOf(c).length > 0;

const fmtDate = (d) =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(d));

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").slice(1); // drop "state-laws"
  try {
    if (parts.length === 0) return html(await indexPage());
    if (parts.length === 1 && parts[0] === "sitemap.xml") return sitemap();
    const code = STATE_BY_SLUG[parts[0]];
    if (!code) return notFound();
    if (parts.length === 1) return html(await statePage(code));
    const topic = TOPIC_BY_SLUG[parts[1]];
    if (parts.length === 2 && topic) {
      const body = await topicPage(code, topic);
      return body ? html(body) : notFound();
    }
    return notFound();
  } catch (err) {
    console.error("state-laws failed:", err);
    return html(page({ title: "State laws | HR Compliance Compass", description: "", canonical: `${SITE}/state-laws`, noindex: true,
      body: `<h1>We could not load this page</h1><p>Please try again in a minute.</p>` }), 503);
  }
};

const STYLE = `<style>
.qa{background:white;border:1px solid rgba(11,14,20,.1);border-left:4px solid var(--gold);padding:18px 20px;margin:1.5rem 0}
.qa .label{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:#a16207}
.qa .answer{font-size:1.35rem;font-family:var(--serif);margin:.3rem 0 0}
.rows{width:100%;border-collapse:collapse;background:white;border:1px solid rgba(11,14,20,.1)}
.rows th,.rows td{text-align:left;padding:10px 14px;border-bottom:1px solid rgba(11,14,20,.08);vertical-align:top}
.rows th{font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
.cta{background:var(--ink);color:var(--cream);padding:22px;margin:2rem 0}
.cta p{margin:0 0 12px}.cta .btn{background:var(--gold);color:var(--ink)}
.src li{margin:.3rem 0}
</style>`;

const cta = (stateName) => `<div class="cta">
  <p><strong>Want the full ${esc(stateName)} card?</strong> The app has the employer requirements, exceptions, plain-English examples and what to say to employees. A free account covers your home state and federal law.</p>
  <a class="btn" href="${APP}">Create a free account</a>
</div>`;

const disclaimer = `<p class="note">This is HR reference information based on publicly available law, not legal advice. See <a href="/how-we-verify.html">how we verify</a>.</p>`;

async function indexPage() {
  const rows = await cards();
  const count = {};
  for (const c of rows) count[c.state_code] = (count[c.state_code] || 0) + 1;
  const items = Object.keys(STATES).filter((code) => count[code]).sort((a, b) => STATES[a].localeCompare(STATES[b]))
    .map((code) => `<li><a href="/state-laws/${stateSlug(code)}">${esc(STATES[code])}</a> <span>${count[code]} topic${count[code] === 1 ? "" : "s"}</span></li>`).join("");
  return page({
    title: "State employment laws at a glance | HR Compliance Compass",
    description: "Quick answers on minimum wage, overtime, final pay, paid sick leave, family leave and pay transparency for each state, with the official source and the date we last reviewed it.",
    canonical: `${SITE}/state-laws`,
    body: `${STYLE}<div class="eyebrow">State laws</div>
<h1>State employment laws at a glance</h1>
<p class="lede">Pick a state for quick answers on ${TOPICS.map((t) => t.name.toLowerCase()).join(", ")}. Each answer links to the official source and shows the date we last reviewed it.</p>
<ul class="states">${items}</ul>
${cta("state")}${disclaimer}`,
  });
}

async function statePage(code) {
  const name = STATES[code];
  const rows = await cards(`&state_code=eq.${code}`);
  const byKey = Object.fromEntries(rows.map((c) => [c.category_key, c]));
  const trs = TOPICS.filter((t) => byKey[t.key]).map((t) => {
    const c = byKey[t.key];
    return `<tr><td><a href="/state-laws/${stateSlug(code)}/${t.slug}">${esc(t.name)}</a></td><td>${esc(c.quick_ref_display_value.trim())}</td><td>${esc(fmtDate(c.last_reviewed))}</td></tr>`;
  }).join("");
  const table = trs
    ? `<table class="rows"><thead><tr><th>Topic</th><th>Quick answer</th><th>Last reviewed</th></tr></thead><tbody>${trs}</tbody></table>`
    : `<div class="empty">We are still reviewing ${esc(name)}. The app has the current cards.</div>`;
  return page({
    title: `${name} employment laws at a glance | HR Compliance Compass`,
    description: `Quick answers on ${name} minimum wage, overtime, final pay, paid sick leave and more, each with the official source and the date we last reviewed it.`,
    canonical: `${SITE}/state-laws/${stateSlug(code)}`,
    noindex: !trs,
    body: `${STYLE}<p class="crumbs"><a href="/state-laws">State laws</a> &rsaquo; ${esc(name)}</p>
<div class="eyebrow">${esc(name)}</div>
<h1>${esc(name)} employment laws at a glance</h1>
<p class="lede">The quick answer for each topic, with the date we last reviewed it. Open a topic for the official source.</p>
${table}${cta(name)}${disclaimer}`,
  });
}

async function topicPage(code, topic) {
  const name = STATES[code];
  const [c] = await cards(`&state_code=eq.${code}&category_key=eq.${topic.key}`);
  if (!c) return null;
  const answer = c.quick_ref_display_value.trim();
  const src = sourcesOf(c).map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.name || s.url)}</a></li>`).join("");
  const canonical = `${SITE}/state-laws/${stateSlug(code)}/${topic.slug}`;
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question",
    name: `What are the ${name} ${topic.title}?`, acceptedAnswer: { "@type": "Answer", text: answer } }] };
  return page({
    title: `${name} ${topic.title} | HR Compliance Compass`,
    description: `${name} ${topic.title}: ${answer}. Official source and last reviewed date included.`.slice(0, 300),
    canonical,
    body: `${STYLE}<script type="application/ld+json">${JSON.stringify(faq).replace(/</g, "\\u003c")}</script>
<p class="crumbs"><a href="/state-laws">State laws</a> &rsaquo; <a href="/state-laws/${stateSlug(code)}">${esc(name)}</a> &rsaquo; ${esc(topic.name)}</p>
<div class="eyebrow">${esc(name)}</div>
<h1>${esc(name)} ${esc(topic.title)}</h1>
<div class="qa"><div class="label">Quick answer</div><p class="answer">${esc(answer)}</p></div>
<p class="meta">Last reviewed ${esc(fmtDate(c.last_reviewed))}${c.formal_name ? ` &middot; ${esc(c.formal_name)}` : ""}</p>
<h2>Official source</h2>
<ul class="src">${src}</ul>
${cta(name)}
<p><a href="/state-laws/${stateSlug(code)}">More ${esc(name)} topics</a></p>${disclaimer}`,
  });
}

async function sitemap() {
  const rows = await cards();
  const states = [...new Set(rows.map((c) => c.state_code))];
  const topicSlug = Object.fromEntries(TOPICS.map((t) => [t.key, t.slug]));
  const urls = [`${SITE}/state-laws`, ...states.map((s) => `${SITE}/state-laws/${stateSlug(s)}`),
    ...rows.map((c) => `${SITE}/state-laws/${stateSlug(c.state_code)}/${topicSlug[c.category_key]}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`;
  return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8",
    "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}

function notFound() {
  return html(page({ title: "Page not found | HR Compliance Compass", description: "", canonical: `${SITE}/state-laws`, noindex: true,
    body: `<h1>We do not have that page yet</h1><p>We only publish a state topic after it has been reviewed. <a href="/state-laws">See all states</a>.</p>` }), 404);
}
