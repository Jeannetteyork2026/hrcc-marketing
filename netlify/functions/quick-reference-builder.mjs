// Builds the 50-State HR Quick Reference workbook from the PUBLISHED law cards
// in Supabase, so the download always matches what the site shows.
// Used by quick-reference.mjs (live download) and scripts/build-quick-reference.mjs
// (refreshes the static backup copy).
import ExcelJS from "exceljs";

// Public read-only key (same one the site already uses); row-level security
// only lets it read published cards.
const SB_URL = "https://blmnnmsrztxuwawmgkkf.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbW5ubXNyenR4dXdhd21na2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMjMwNjUsImV4cCI6MjA5MTc5OTA2NX0.OuCQgZQAinZDi3XHKZqrNBh3XplTuSEo7AsFCrhPZjk";
const SITE = "https://www.hrcompliancecompass.com";

const TOPICS = [
  { key: "minimum_wage", label: "Minimum Wage" },
  { key: "overtime_rules", label: "Overtime" },
  { key: "family_medical_leave", label: "State Paid FMLA" },
  { key: "paid_sick_leave", label: "Paid Sick Leave" },
  { key: "pay_transparency", label: "Pay Transparency" },
  { key: "final_pay_termination", label: "Final Pay" },
];

const STATUS = {
  rule: "State-Specific Rule",
  federal: "Follow Federal Law",
  none: "No State Law",
  soon: "Coming Soon",
};

async function get(path) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} on ${path.split("?")[0]}`);
  return res.json();
}

function statusFor(card, text) {
  const t = (text || "").toLowerCase();
  if (t.includes("(federal)") || t.startsWith("follows federal")) return STATUS.federal;
  if (t.startsWith("no ")) return STATUS.none;
  if (t.includes("coming")) return STATUS.soon;
  switch (card?.law_status) {
    case "follows_federal": return STATUS.federal;
    case "not_regulated": return STATUS.none;
    case "pending": return STATUS.soon;
    default: return STATUS.rule;
  }
}

function displayFor(topic, card) {
  if (card?.quick_ref_display_value) return card.quick_ref_display_value.trim();
  if (topic === "minimum_wage" && card?.min_wage_rate) return `$${Number(card.min_wage_rate).toFixed(2)}`;
  switch (card?.law_status) {
    case "follows_federal": return "Follows federal law";
    case "not_regulated": return "No state law";
    case "pending": return "New law coming (see HRCC)";
    case "active": return "State rule applies (see HRCC)";
    default: return "See HRCC for the current rule";
  }
}

export async function loadData() {
  const keys = TOPICS.map((t) => t.key).join(",");
  const [states, laws] = await Promise.all([
    get("states?select=state_code,state_name,workers_comp_required,workers_comp_notes,at_will_state&state_code=neq.US&order=state_name"),
    get(`laws?select=state_code,category_key,law_status,quick_ref_display_value,min_wage_rate,last_reviewed&category_key=in.(${keys})`),
  ]);
  if (states.length < 50 || laws.length < 200) throw new Error(`Too little data (${states.length} states, ${laws.length} cards)`);
  const byKey = new Map(laws.map((l) => [`${l.state_code}|${l.category_key}`, l]));
  const latest = laws.map((l) => l.last_reviewed).filter(Boolean).sort().pop() || null;

  const rows = states.map((s) => {
    const cells = TOPICS.map((t) => {
      const card = byKey.get(`${s.state_code}|${t.key}`);
      const text = displayFor(t.key, card);
      return { topic: t.label, text, status: statusFor(card, text) };
    });
    const notes = s.workers_comp_notes || "";
    const firstSentence = notes.split(/(?<=\.)\s/)[0];
    const wc = s.workers_comp_required
      ? { topic: "Workers' Comp", text: /monopoly fund|state fund/i.test(notes) ? "Required (state fund only)" : "Required", status: STATUS.rule }
      : { topic: "Workers' Comp", text: firstSentence ? `Not required. ${firstSentence}` : "Not required", status: STATUS.none };
    return { name: s.state_name, cells: [...cells, wc], atWill: s.at_will_state ? "At-Will" : "Not At-Will" };
  });
  return { rows, latest };
}

const NAVY = "FF1F3A5F";
const longDate = (d) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });

function headerRow(ws, values) {
  const row = ws.addRow(values);
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.alignment = { vertical: "middle", wrapText: true };
  });
  row.height = 30;
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: values.length } };
}

export async function buildWorkbook(now = new Date()) {
  const { rows } = await loadData();
  const year = Number(now.toLocaleDateString("en-US", { year: "numeric", timeZone: "America/New_York" }));
  const wb = new ExcelJS.Workbook();
  wb.creator = "HR Compliance Compass";
  wb.created = now;

  // Read Me
  const rm = wb.addWorksheet("Read Me");
  rm.getColumn(1).width = 100;
  const lines = [
    [`The ${year} 50-State HR Quick Reference`, { size: 18, bold: true, color: { argb: NAVY } }],
    ["How every state compares on the employment laws that matter most.", { italic: true }],
    [""],
    [`Compiled by HR Compliance Compass  ·  This copy was generated ${longDate(now)} from HRCC's live law database.`],
    ["Educational guidance only. Not legal advice."],
    [""],
    ["Laws change often. Get the newest version any time:", { bold: true }],
    [{ text: `${SITE}/hr-compliance-compass.html`, hyperlink: `${SITE}/hr-compliance-compass.html` }, { color: { argb: "FF1155CC" }, underline: true }],
    [""],
    ["What's inside", { bold: true, size: 13 }],
    ["• Quick Reference: the current rate or rule for all 51 jurisdictions across 7 topics"],
    ["• Details: the same data in a one-row-per-topic layout with a status label"],
    ["• Remote Workers: Yes/No for the laws that follow a remote employee"],
    [""],
    ["What the status labels mean", { bold: true, size: 13 }],
    [`• ${STATUS.rule}: the state sets its own rule, stricter than or different from federal law`],
    [`• ${STATUS.federal}: no separate state rule; the federal standard applies`],
    [`• ${STATUS.none}: the state does not regulate this topic`],
    [`• ${STATUS.soon}: a law is enacted but not yet in effect`],
    [""],
    ["Always confirm the current rule for a specific employee's work location before acting. Full details, effective dates and official sources for every state are in HR Compliance Compass."],
  ];
  for (const [value, font] of lines) {
    const row = rm.addRow([value]);
    row.getCell(1).alignment = { wrapText: true, vertical: "top" };
    if (font) row.getCell(1).font = font;
  }

  // Quick Reference
  const qr = wb.addWorksheet("Quick Reference");
  headerRow(qr, ["State / Jurisdiction", ...rows[0].cells.map((c) => c.topic)]);
  qr.getColumn(1).width = 22;
  for (let i = 2; i <= 8; i++) qr.getColumn(i).width = 30;
  for (const r of rows) {
    const row = qr.addRow([r.name, ...r.cells.map((c) => c.text)]);
    row.getCell(1).font = { bold: true };
    row.eachCell((c) => { c.alignment = { wrapText: true, vertical: "top" }; });
  }

  // Details
  const dt = wb.addWorksheet("Details");
  headerRow(dt, ["State / Jurisdiction", "Topic", "Detail", "Status"]);
  [22, 18, 70, 20].forEach((w, i) => { dt.getColumn(i + 1).width = w; });
  const badge = { [STATUS.rule]: "FFFFF4D6", [STATUS.federal]: "FFE8EEF6", [STATUS.none]: "FFF2F2F2", [STATUS.soon]: "FFE6F4EA" };
  for (const r of rows) {
    for (const c of r.cells) {
      const row = dt.addRow([r.name, c.topic, c.text, c.status]);
      row.eachCell((cell) => { cell.alignment = { wrapText: true, vertical: "top" }; });
      row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: badge[c.status] || "FFFFFFFF" } };
    }
  }

  // Remote Workers
  const rw = wb.addWorksheet("Remote Workers");
  headerRow(rw, ["State / Jurisdiction", "Paid Sick Leave?", "Pay Transparency Law?", "Family Leave Beyond Federal?", "At-Will Status"]);
  [22, 18, 22, 28, 16].forEach((w, i) => { rw.getColumn(i + 1).width = w; });
  const yes = (r, topic) => {
    const status = r.cells.find((c) => c.topic === topic)?.status;
    return status === STATUS.rule ? "Yes" : status === STATUS.soon ? "Coming soon" : "No";
  };
  for (const r of rows) {
    rw.addRow([r.name, yes(r, "Paid Sick Leave"), yes(r, "Pay Transparency"), yes(r, "State Paid FMLA"), r.atWill]).getCell(1).font = { bold: true };
  }

  // Footer link on the data sheets: the reason to come back.
  for (const ws of [qr, dt, rw]) {
    ws.addRow([]);
    const row = ws.addRow([`Generated ${longDate(now)}. Laws change often; get the newest version at ${SITE}`]);
    row.getCell(1).font = { italic: true, color: { argb: "FF1155CC" } };
    row.getCell(1).value = { text: row.getCell(1).value, hyperlink: `${SITE}/hr-compliance-compass.html` };
  }

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), year };
}
