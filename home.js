/* Homepage scripts (moved out of index.html so browsers can cache them). */

// ── INFINITE MOUSE CAROUSEL ──────────────────────────────
(function() {
  const viewport = document.getElementById('carousel-viewport');
  const track    = document.getElementById('carousel-track');
  if (!viewport || !track) return;

  // Clone all cards so the loop is seamless
  const origCards = Array.from(track.querySelectorAll('.tk-card'));
  origCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.dataset.clone = 'true';
    track.appendChild(clone);
  });

  let offset      = 0;
  let setWidth    = 0;
  let velocity    = 0.55;   // default auto-scroll speed (px/frame)
  let targetVel   = 0.55;
  let isOver      = false;

  function measureSet() {
    const gap = 24; // 1.5rem in px
    setWidth = origCards.reduce((sum, c) => sum + c.offsetWidth + gap, 0);
  }
  measureSet();
  window.addEventListener('resize', measureSet);

  // Mouse position maps to velocity
  viewport.addEventListener('mouseenter', () => { isOver = true; });
  viewport.addEventListener('mouseleave', () => {
    isOver = false;
    targetVel = 0.55; // drift back to default
  });
  viewport.addEventListener('mousemove', e => {
    if (!isOver) return;
    const rect   = viewport.getBoundingClientRect();
    const relX   = e.clientX - rect.left;
    const norm   = (relX / rect.width) * 2 - 1; // -1 (far left) → +1 (far right)
    // Center = slow drift, edges = fast in that direction
    targetVel = norm * 3.5; // -3.5 to +3.5 px/frame
  });

  function animate() {
    // Smoothly lerp current velocity toward target
    velocity += (targetVel - velocity) * 0.06;

    offset += velocity;

    // Seamless loop — when we've scrolled one full set, reset
    if (offset >= setWidth) offset -= setWidth;
    if (offset < 0)         offset += setWidth;

    track.style.transform = `translateX(${-offset}px)`;
    requestAnimationFrame(animate);
  }
  animate();
})();

// ── CARD CLICK (handles originals + clones) ──────────────
document.addEventListener('click', e => {
  const card = e.target.closest('.tk-card');
  if (!card || !card.dataset.tool) return;

  const idx   = parseInt(card.dataset.tool);
  const panel = document.getElementById('tk-panel');

  // Deactivate all
  document.querySelectorAll('.tk-card').forEach(c => c.classList.remove('active'));

  // If this card was already open, close it
  if (panel._openIdx === idx && panel.style.maxHeight !== '0px') {
    panel.style.maxHeight = '0';
    panel.style.opacity   = '0';
    panel._openIdx = -1;
    return;
  }

  // Activate the clicked card AND its clone
  document.querySelectorAll(`.tk-card[data-tool="${idx}"]`).forEach(c => c.classList.add('active'));

  panel._openIdx = idx;
  const t = toolData[idx];
  if (!t) return;

  document.getElementById('pk-icon').textContent     = t.icon;
  document.getElementById('pk-name').textContent     = t.name;
  document.getElementById('pk-tag').textContent      = t.tag;
  document.getElementById('pk-headline').textContent = t.headline;
  document.getElementById('pk-body').textContent     = t.body;

  document.getElementById('pk-bullets').innerHTML = t.bullets.map(b =>
    `<div class="pk-bullet"><div class="pk-bullet-dot"></div><div class="pk-bullet-text">${b}</div></div>`
  ).join('');

  document.getElementById('pk-status').innerHTML = t.soon
    ? `<div style="display:inline-block;background:var(--gold);color:var(--ink);font-size:0.68rem;letter-spacing:0.15em;text-transform:uppercase;padding:0.3rem 0.8rem;font-weight:500;">Coming Soon — Founding Partners Get Early Access</div>`
    : `<div style="display:inline-flex;align-items:center;gap:0.5rem;font-size:0.75rem;color:rgba(255,255,255,0.5);"><span style="width:7px;height:7px;background:#4ade80;border-radius:50%;display:inline-block;"></span>Available Now</div>`;

  panel.style.maxHeight = '900px';
  panel.style.opacity   = '1';
  setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
});

document.getElementById('tk-close').addEventListener('click', () => {
  document.querySelectorAll('.tk-card').forEach(c => c.classList.remove('active'));
  const panel = document.getElementById('tk-panel');
  panel.style.maxHeight = '0';
  panel.style.opacity   = '0';
  panel._openIdx = -1;
});


const toolData = [
  {
    name: 'Tough Conversations',
    tag: 'Manager Talk Tracks',
    headline: 'Your managers shouldn\'t have to improvise the hardest conversations they\'ll ever have. Now they don\'t have to.',
    body: 'Terminations. PIPs. Attendance warnings. Discrimination complaints. Sensitive personal disclosures. These are the conversations managers dread — and the ones most likely to create legal exposure when handled poorly. Tough Conversations gives managers a structured, people-first framework for navigating each one with clarity, fairness, and documentation.\n\nEvery talk track is built to protect both the employee and the organization — because done right, hard conversations build trust, not resentment. Done wrong, they become the centerpiece of a lawsuit.',
    bullets: [
      'Scenario-specific talk tracks for terminations, warnings, PIPs, attendance, conduct, and more',
      'Structured conversation flow: what to say, in what order, and what never to say',
      'Built-in documentation language so managers leave every conversation with a defensible record',
      'People-first framing that maintains dignity without sacrificing clarity or legal protection',
      'Manager coaching notes included — ideal for HR to share with supervisors before a difficult meeting'
    ]
  },
  {
    icon: '⚡',
    name: 'Decision Helper',
    tag: 'Step-by-Step HR Decision Workflows',
    headline: 'The right HR decision isn\'t always obvious. This tool walks you through it — step by step, law by law.',
    body: 'HR decisions are rarely black and white. Can I terminate this employee? Do I have to offer COBRA? What counts as a reasonable accommodation? Is this situation FMLA-qualifying? The Decision Helper breaks down the most common and most consequential HR decisions into structured, guided workflows — asking you the right questions to surface the right answer for your specific situation.\n\nEach workflow accounts for federal law, state-specific variations, company size thresholds, and situational factors that change the outcome. You don\'t need to know the law to use it — the tool knows it for you.',
    bullets: [
      'Covers terminations, leave decisions, accommodations, hiring, compensation, discipline, and more',
      'Guides you through the decision logic question by question — no prior legal knowledge required',
      'Flags when state law changes the answer from the federal default',
      'Identifies risk factors and documentation requirements before you act',
      'Produces a decision summary you can save and file as part of your HR record'
    ]
  },
  {
    icon: '🔍',
    name: 'Complaint Investigation Guide',
    tag: 'Investigation Templates & Checklists',
    headline: 'When a complaint comes in, you have minutes to decide how to handle it — and months of exposure if you get it wrong.',
    body: 'Workplace complaints — harassment, discrimination, retaliation, hostile work environment — are among the highest-stakes situations an HR professional or business owner will face. The Complaint Investigation Guide walks you through every stage: intake, triage, legal risk assessment, witness interviews, documentation, resolution, and follow-up.\n\nThe tool helps you determine whether a situation can be resolved informally or requires a formal investigation, and gives you the templates, checklists, and process documentation you need to run a defensible, thorough, and fair investigation either way.',
    bullets: [
      'Intake checklist captures all critical details from the initial report — nothing falls through the cracks',
      'Legal risk triage helps you assess severity, required response timelines, and mandatory reporting obligations',
      'Witness interview templates and investigation question frameworks included',
      'Formal investigation process roadmap from complaint to conclusion, with decision documentation',
      'Resolution and corrective action templates with language designed to close the loop without creating new liability'
    ]
  },
  {
    icon: '📋',
    name: 'Handbook Builder',
    tag: 'Policy Language That Actually Holds Up',
    headline: 'Your employee handbook is either your strongest compliance asset or your biggest liability. This tool makes it the former.',
    body: 'Generic handbook templates downloaded from the internet are not compliant. They\'re written for no state in particular, no company size in particular, and no workforce in particular. The Handbook Builder generates policy language based on the states you operate in, your headcount, and your specific policies — producing language that meets current legal requirements in your jurisdictions.\n\nEvery policy section is written in clear, professional language your employees will actually understand — and that will hold up if it\'s ever challenged.',
    bullets: [
      'Select your states and applicable policies — get jurisdiction-specific language for each',
      'Covers at-will employment, anti-harassment, leave, PTO, remote work, social media, conduct, and more',
      'Flags where state law mandates specific handbook language vs. where you have discretion',
      'Highlights policy sections that differ between your operating states — critical for multi-state employers',
      'Built-in review prompts tell you which sections to revisit when laws change'
    ]
  },
  {
    icon: '🎯',
    name: 'Interview Guides',
    tag: 'Structured Hiring & Legal Compliance',
    headline: 'Stronger hiring decisions start before the candidate walks in the door. These guides make sure your process is consistent, legal, and effective.',
    body: 'Unstructured interviews produce inconsistent hires and legal exposure. The wrong question — even asked casually — can create discrimination claims. The right structure, consistently applied, builds a defensible process and a stronger team.\n\nInterview Guides provides question sets and interview structures organized by role type and competency. Every question is vetted for legal compliance. Every guide includes rating frameworks so interviewers evaluate candidates against the same criteria, not gut instinct.',
    bullets: [
      'Question banks organized by role function — HR, operations, sales, management, customer service, and more',
      'Legally reviewed questions with clear guidance on what\'s off-limits and why',
      'Structured scoring frameworks that create consistency across interviewers and reduce bias',
      'Behavioral and situational question formats that predict job performance more accurately',
      'Debrief templates and offer/decline documentation for a complete, defensible hiring record'
    ]
  },
  {
    icon: '📈',
    name: 'Performance Guidance',
    tag: 'Manager-Ready Documentation Support',
    headline: 'Performance management done right protects the employee, supports the manager, and protects the organization — all at the same time.',
    body: 'Most performance problems get worse because managers wait too long, say the wrong things, or skip documentation. Performance Guidance gives managers and HR the tools to address performance concerns early, clearly, and fairly — with conversation frameworks, documentation templates, and escalation guidance at every stage.\n\nFrom the first informal coaching conversation through a formal Performance Improvement Plan, every step is structured to give the employee a genuine opportunity to succeed while building the organizational record needed if separation ultimately becomes necessary.',
    bullets: [
      'Coaching conversation guides for early-stage performance concerns — before they become formal issues',
      'Performance Improvement Plan templates with SMART goal frameworks and progress check-in schedules',
      'Documentation language that is specific, objective, and legally defensible',
      'Manager coaching notes for delivering feedback in a way that motivates rather than demoralizes',
      'Escalation decision tree — when to move from coaching to formal PIP to separation, and how to do each step'
    ]
  },
  {
    icon: '⚖️',
    name: 'FLSA Exempt Status & Duties Test',
    tag: 'Overtime Classification Compliance',
    headline: 'Misclassifying one employee as exempt can cost more than their annual salary in back wages and penalties. This tool gets it right.',
    body: 'The Fair Labor Standards Act\'s overtime exemptions are some of the most commonly misunderstood — and most expensive to get wrong. An employee isn\'t exempt just because they have a title or receive a salary. They must meet both a salary threshold AND a specific duties test under the executive, administrative, professional, computer, or outside sales exemption categories.\n\nThe FLSA Exempt Status & Duties Test walks you through each test systematically, asks the right questions about the employee\'s actual job duties and compensation, and tells you clearly whether the exemption applies — with the reasoning documented.',
    bullets: [
      'Covers all five FLSA exemption categories: executive, administrative, professional, computer, and outside sales',
      'Applies current federal salary thresholds plus any higher state-specific thresholds that apply',
      'Guides you through the duties test question by question based on what the employee actually does — not their job title',
      'Produces a classification summary documenting the basis for your determination',
      'Flags borderline cases and recommends documentation steps to protect the classification if challenged'
    ]
  },
  {
    icon: '✅',
    name: 'Compliance Checklists',
    tag: 'State-Aware HR Process Checklists',
    headline: 'Every hire, every leave, every separation — handled consistently and completely, every single time.',
    body: 'The details that get skipped during an onboarding, a leave of absence, or an employee\'s final day are exactly the details that create legal exposure later. Compliance Checklists gives you state-aware, process-specific checklists for every major HR lifecycle event — built to account for the federal requirements and any additional requirements in the states you operate in.\n\nThese aren\'t generic to-do lists. Each checklist reflects what is legally required in your selected states, what is HR best practice, and what documentation needs to exist for your records.',
    bullets: [
      'Onboarding checklists: new hire paperwork, required notices, I-9 compliance, state-specific forms',
      'Leave administration checklists: FMLA, state leave laws, notice requirements, return-to-work procedures',
      'Offboarding checklists: final pay requirements, COBRA notices, reference policy, equipment return, benefits separation',
      'State-aware filtering — each checklist automatically reflects requirements for the states you\'ve selected',
      'Printable and savable formats for your HR files and manager guides'
    ]
  },
  {
    icon: '🤖',
    name: 'Future of Work & AI',
    tag: 'AI Workforce Readiness for HR',
    headline: 'AI is already changing job descriptions, performance expectations, and what your workforce looks like. HR needs to be ahead of it — not reacting to it.',
    body: 'Artificial intelligence is transforming work faster than most organizations are prepared for. The Future of Work & AI tool helps HR professionals and small business owners understand what AI adoption means for their specific roles, workforce, and compliance environment — before those changes become crises.\n\nAnalyze existing job descriptions for AI displacement risk. Explore responsible AI adoption frameworks. Navigate the emerging legal and policy landscape around AI in the workplace. Position your organization to lead through workforce transformation rather than scramble through it.',
    bullets: [
      'Job description AI impact analysis — identify which tasks in a role are automatable and what skills to prioritize instead',
      'Workforce transformation planning frameworks for communicating change and managing employee concerns',
      'Responsible AI adoption guidance including bias risk, transparency obligations, and employee disclosure considerations',
      'Overview of emerging AI-in-the-workplace regulations and what employers need to know now',
      'Practical HR applications for AI tools: what to use, how to govern it, and how to document your approach'
    ]
  },
  {
    icon: '🧭',
    name: 'Compliance Wizard',
    tag: 'Federal & State Law Guidance with Sources',
    headline: 'Federal and state employment law, explained in plain English — with the source citations to back every answer.',
    body: 'The Compliance Wizard is your on-demand employment law research tool. Ask about any employment law topic — wages, leave, hiring, termination, accommodation, non-competes, background checks, drug testing — and get a clear, source-backed answer that covers both the federal baseline and the state-specific rules that apply to your situation.\n\nEvery answer includes citations to the actual statute, regulation, or agency guidance it comes from. You\'re not just getting an answer — you\'re getting documentation you can stand behind if your decision is ever questioned.',
    bullets: [
      'Covers 200+ employment law topics across all 50 states and federal law',
      'Plain-English explanations with no legal jargon — written for HR professionals and business owners, not attorneys',
      'Every answer cites the source statute or regulation so you can verify and document your research',
      'State-specific results — answers reflect the law in your state, not a generic national average',
      'Frequently updated as laws change so you\'re always reading current guidance, not outdated summaries'
    ]
  },
  {
    icon: '📚',
    name: 'FAQs / Knowledge Base',
    tag: 'HR Term Intelligence & Reference Library',
    headline: 'The HR terms, concepts, and definitions you\'ve been Googling — organized, accurate, and written for the way you actually work.',
    body: 'HR has a language of its own — and the stakes for misunderstanding a term can be significant. The FAQs and Knowledge Base is a searchable, continuously growing reference library covering HR terminology, legal concepts, process definitions, and common questions that come up in day-to-day HR work.\n\nWhether you need a quick definition of "constructive discharge," want to understand the difference between an independent contractor and an employee under IRS rules, or need to explain what ERISA covers to a skeptical manager — the Knowledge Base gives you a clear, accurate answer with context.',
    bullets: [
      'Searchable glossary of HR and employment law terms — hundreds of entries with plain-English definitions',
      'FAQ library covering the most common questions HR professionals and small business owners ask',
      'Concept explainers that go deeper than a definition — understanding the why behind the rule',
      'Cross-references between related terms and tools within the Compass platform',
      'New entries added regularly based on user questions and emerging HR topics'
    ]
  }
];

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  document.querySelectorAll('.priv-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.priv-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.priv-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Nav scroll behavior
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });

  // Floating state tags in hero
  const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  const field = document.getElementById('states-field');
  states.forEach((s) => {
    const el = document.createElement('div');
    el.className = 'state-tag';
    el.textContent = s;
    el.style.left = (Math.random() * 90 + 5) + '%';
    el.style.top = (Math.random() * 80 + 10) + '%';
    el.style.animationDelay = (Math.random() * 16) + 's';
    el.style.animationDuration = (14 + Math.random() * 8) + 's';
    field.appendChild(el);
  });

  // High legislative activity states
  const highActivityStates = new Set(['California','New York','Illinois','Washington','Colorado','Massachusetts','New Jersey','Connecticut','Oregon','Minnesota','Maryland','Nevada','Arizona','Vermont','Delaware','Rhode Island','Hawaii','Maine','Pennsylvania','North Carolina','Michigan','New Mexico']);

  const stateNames = {
    '01':'Alabama','02':'Alaska','04':'Arizona','05':'Arkansas','06':'California',
    '08':'Colorado','09':'Connecticut','10':'Delaware','11':'District of Columbia',
    '12':'Florida','13':'Georgia','15':'Hawaii','16':'Idaho','17':'Illinois',
    '18':'Indiana','19':'Iowa','20':'Kansas','21':'Kentucky','22':'Louisiana',
    '23':'Maine','24':'Maryland','25':'Massachusetts','26':'Michigan','27':'Minnesota',
    '28':'Mississippi','29':'Missouri','30':'Montana','31':'Nebraska','32':'Nevada',
    '33':'New Hampshire','34':'New Jersey','35':'New Mexico','36':'New York',
    '37':'North Carolina','38':'North Dakota','39':'Ohio','40':'Oklahoma',
    '41':'Oregon','42':'Pennsylvania','44':'Rhode Island','45':'South Carolina',
    '46':'South Dakota','47':'Tennessee','48':'Texas','49':'Utah','50':'Vermont',
    '51':'Virginia','53':'Washington','54':'West Virginia','55':'Wisconsin','56':'Wyoming'
  };

  const tooltip = document.getElementById('map-tooltip');
  const mapSvg = document.getElementById('us-map');

  fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
    .then(r => r.json())
    .then(us => {
      const d3Script = document.createElement('script');
      d3Script.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
      d3Script.onload = () => {
        const topoScript = document.createElement('script');
        topoScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js';
        topoScript.onload = () => {
          const projection = d3.geoAlbersUsa().scale(1280).translate([487, 305]);
          const path = d3.geoPath().projection(projection);
          const svg = d3.select('#us-map');
          const features = topojson.feature(us, us.objects.states).features;
          svg.selectAll('path')
            .data(features)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', d => {
              const name = stateNames[d.id.toString().padStart(2,'0')];
              return highActivityStates.has(name) ? '#2c9faf' : '#1a4a7c';
            })
            .on('mousemove', function(event, d) {
              const name = stateNames[d.id.toString().padStart(2,'0')] || 'Unknown';
              const isHot = highActivityStates.has(name);
              const rect = mapSvg.getBoundingClientRect();
              tooltip.style.left = ((event.clientX - rect.left) + 10) + 'px';
              tooltip.style.top = ((event.clientY - rect.top) - 30) + 'px';
              tooltip.textContent = isHot ? name + ' — High Activity' : name + ' — Covered';
              tooltip.style.opacity = '1';
            })
            .on('mouseleave', function() {
              tooltip.style.opacity = '0';
            });
        };
        document.head.appendChild(topoScript);
      };
      document.head.appendChild(d3Script);
    })
    .catch(() => {
      if (mapSvg) mapSvg.innerHTML = '<text x="480" y="300" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#1a4a7c">All 50 States Covered</text>';
    });

  // Intersection Observer for reveals
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal, .pain-item, .step-card, .feature-card').forEach(el => {
    observer.observe(el);
  });

  document.querySelectorAll('.pain-item').forEach((el, i) => {
    el.style.transitionDelay = (i * 0.12) + 's';
  });

(function () {
  // ---- Config ----
  var SHOW_DELAY_MS = 2500;
  var DISMISS_KEY = "hrcc_guide_dismissed";
  var GUIDE_FILE = "HRCC-50-State-Quick-Reference-2026.xlsx";
  var HS_PORTAL_ID = "";                              // HubSpot disabled — leads go to Supabase + Resend
  var HS_FORM_GUID = "6106dd18-7593-4eb1-8137-a6d9eae562dd";   // HubSpot Form GUID (guide-download)

  try { if (localStorage.getItem(DISMISS_KEY)) return; } catch (e) {}
  var overlay = document.getElementById("gdPopup");
  var form = document.getElementById("gdForm");
  if (!overlay || !form) return;

  function track(name, params) {
    params = params || {};
    if (typeof window.gtag === "function") { try { window.gtag("event", name, params); } catch (e) {} }
    if (typeof window.fbq === "function") {
      try {
        if (name === "generate_lead") fbq("track", "Lead", { content_name: "50-State Quick Reference", source: params.lead_source });
        else if (name === "file_download") fbq("trackCustom", "GuideDownload", { source: params.lead_source });
        else if (name === "popup_view") fbq("trackCustom", "PopupView", { source: params.lead_source });
      } catch (e) {}
    }
  }

  function source() { var d = {}; try { d = JSON.parse(localStorage.getItem("hrcc_first_touch") || "{}"); } catch (e) {} return d; }

  function fillSource() {
    var d = source();
    function set(id, v) { var el = document.getElementById(id); if (el) el.value = v || ""; }
    set("gdLeadChannel", d.channel || "Direct / typed URL");
    set("gdLeadLandingSection", d.landingSection || "Main site");
    set("gdLeadLandingPage", d.landingPage || location.pathname);
    set("gdLeadReferrer", d.referrer || "");
    set("gdLeadCampaign", d.utm_campaign || "");
  }

  // ---- Smart email validation ----
  var DISPOSABLE = ["mailinator.com","tempmail.com","temp-mail.org","guerrillamail.com","10minutemail.com",
    "trashmail.com","yopmail.com","sharklasers.com","getnada.com","throwawaymail.com","fakeinbox.com","maildrop.cc"];
  var TYPO_MAP = { "gmial.com":"gmail.com","gmai.com":"gmail.com","gmal.com":"gmail.com","gmail.con":"gmail.com",
    "gnail.com":"gmail.com","hotnail.com":"hotmail.com","hotmial.com":"hotmail.com","yahooo.com":"yahoo.com",
    "yaho.com":"yahoo.com","outlok.com":"outlook.com","outloo.com":"outlook.com" };

  function showError(htmlMsg) {
    var e = document.getElementById("gdError");
    e.innerHTML = htmlMsg; e.style.display = "block";
  }
  function clearError() { var e = document.getElementById("gdError"); e.style.display = "none"; e.innerHTML = ""; }

  // returns {ok:true} or {ok:false} (after showing message); may auto-suggest a fix
  function validateEmail(raw) {
    var email = (raw || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showError("Please enter a valid email address."); return { ok:false }; }
    var domain = email.split("@")[1];
    if (DISPOSABLE.indexOf(domain) !== -1) { showError("Please use a permanent email address so we can send your guide."); return { ok:false }; }
    if (TYPO_MAP[domain]) {
      var fixed = email.split("@")[0] + "@" + TYPO_MAP[domain];
      showError('Did you mean <a id="gdFix">' + fixed + '</a>?');
      var link = document.getElementById("gdFix");
      if (link) link.addEventListener("click", function () { document.getElementById("gdEmail").value = fixed; clearError(); });
      return { ok:false };
    }
    return { ok:true, email: email };
  }

  function getCookie(name) {
    var m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return m ? m.pop() : "";
  }

  function submitToHubSpot(email, firstName) {
    if (!HS_PORTAL_ID || HS_PORTAL_ID === "YOUR_PORTAL_ID" || !HS_FORM_GUID || HS_FORM_GUID === "YOUR_FORM_GUID") return Promise.resolve(false);
    var url = "https://api.hsforms.com/submissions/v3/integration/submit/" + HS_PORTAL_ID + "/" + HS_FORM_GUID;
    var fields = [{ name: "email", value: email }];
    if (firstName) fields.push({ name: "firstname", value: firstName });
    var payload = { fields: fields, context: { pageUri: location.href, pageName: document.title } };
    var hutk = getCookie("hubspotutk"); if (hutk) payload.context.hutk = hutk;
    // Resolves true only when HubSpot accepted the contact.
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (res) { return res.ok; }, function () { return false; });
  }

  function open() {
    fillSource();
    overlay.classList.add("gd-open"); overlay.setAttribute("aria-hidden", "false");
    track("popup_view", { popup: "guide-download", lead_source: (source().channel || "unknown") });
  }
  function dismiss() {
    overlay.classList.remove("gd-open"); overlay.setAttribute("aria-hidden", "true");
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
  }

  setTimeout(open, SHOW_DELAY_MS);
  document.getElementById("gdClose").addEventListener("click", dismiss);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) dismiss(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && overlay.classList.contains("gd-open")) dismiss(); });
  document.getElementById("gdEmail").addEventListener("input", clearError);

  document.getElementById("gdDownload").addEventListener("click", function () {
    track("file_download", { file_name: GUIDE_FILE, lead_source: (source().channel || "unknown") });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = validateEmail(document.getElementById("gdEmail").value);
    if (!v.ok) return;
    clearError();
    var firstName = (document.getElementById("gdFirst").value || "").trim();
    var btn = form.querySelector(".gd-submit");
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

    // Spam bots fill the hidden field; never count those as leads.
    var hp = form.querySelector('[name="bot-field"]');
    var isBot = !!(hp && hp.value);

    // 1) HubSpot (creates contact + triggers the emailed copy)
    var hubspot = submitToHubSpot(v.email, firstName);

    // 2) Netlify backup capture
    var body = new URLSearchParams(new FormData(form)).toString();
    var netlify = fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body })
      .then(function (res) { return res.ok; }, function () { return false; });

    Promise.all([hubspot, netlify]).then(function (saved) { finish(saved[0] || saved[1]); });

    function finish(saved) {
      if (!saved) {
        // Nothing was stored: say so and let them try again (no lead counted).
        if (btn) { btn.disabled = false; btn.textContent = "Try again"; }
        showError("Something went wrong sending your guide. Please try again.");
        return;
      }
      // Count the lead in Google/Meta only once the email is actually saved.
      if (!isBot) track("generate_lead", { method: "guide_popup", lead_source: (source().channel || "unknown") });
      document.getElementById("gdFormWrap").style.display = "none";
      document.getElementById("gdSuccess").style.display = "block";
      try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
    }
  });
})();
