/**
 * Build machine-readable context map from owner-review Excel chunks.
 * Run: node scripts/parent-report-hebrew-context-map-build.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REVIEW_FOLDER = join(ROOT, "parent-report-hebrew-owner-review-chunks-with-meaning");
const INVENTORY_PATH = join(ROOT, "reports", "parent-report-hebrew-copy-inventory.xlsx");
const OUT_CSV = join(ROOT, "reports", "parent-report-hebrew-context-map.csv");
const SHEET_NAME = "לאישור";
const NEEDS_FULL = "צריך לבדוק בדוח מלא";

const PLACEHOLDER_SUBS = [
  [/\$\{lab\}/g, "חשבון"],
  [/\$\{core\}/g, "חשבון"],
  [/\$\{label\}/g, "חשבון"],
  [/\$\{subjectLabel\}/g, "חשבון"],
  [/\$\{displayName\}/g, "שברים"],
  [/\$\{displayTopicPhraseHe\([^)]*\)\}/g, "שברים"],
  [/\$\{statsLine\}/g, "לפי 146 שאלות, דיוק כ־51%"],
  [/\$\{domRc\}/g, "טעויות בקריאת המשימה"],
  [/\$\{opening\}/g, "בחשבון"],
  [/\$\{acc\}/g, "51%"],
  [/\$\{q\}/g, "146 שאלות"],
  [/\$\{gradeHe\}/g, "כיתה ה׳"],
  [/\$\{childName\}/g, "דני"],
  [/\$\{[^}]+\}/g, "[ערך]"],
  [/\[נושא\]/g, "שברים"],
  [/\[מקצוע\]/g, "חשבון"],
  [/\[שם הילד\]/g, "דני"],
];

function substitutePlaceholders(text) {
  let out = String(text || "");
  for (const [re, val] of PLACEHOLDER_SUBS) out = out.replace(re, val);
  return out.replace(/\s+/g, " ").trim();
}

function normalizeCore(text) {
  return substitutePlaceholders(String(text || ""))
    .replace(/^·\s*/, "")
    .replace(/…$/g, "")
    .trim();
}

function csvCell(value) {
  const s = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function loadInventoryIndex() {
  const map = new Map();
  if (!existsSync(INVENTORY_PATH)) return map;
  const wb = XLSX.readFile(INVENTORY_PATH);
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "Summary" || sheetName === "Forbidden Terms") continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
    for (const row of rows) {
      if (row.id) map.set(String(row.id), { ...row, inventory_sheet: sheetName });
    }
  }
  return map;
}

function loadScenarioHints() {
  const hints = [];
  if (!existsSync(INVENTORY_PATH)) return hints;
  const wb = XLSX.readFile(INVENTORY_PATH);
  const sh = wb.Sheets["Rendered Scenario Samples"];
  if (!sh) return hints;
  return XLSX.utils.sheet_to_json(sh, { defval: "" });
}

function parseTechnicalSource(raw) {
  const s = String(raw || "").trim();
  let m = s.match(/^(PR-HE-\d+)\s*\|\s*(.+?):(\d+)\s*$/);
  if (m) return { id: m[1], file: m[2].trim(), line: Number(m[3]) };
  m = s.match(/^(PR-HE-\d+)\s*\|\s*(.+?):?\s*$/);
  if (m) return { id: m[1], file: m[2].replace(/:$/, "").trim(), line: 0 };
  return { id: s.match(/PR-HE-\d+/)?.[0] || "", file: "", line: 0 };
}

function resolveSourceLine(file, line, problematic, inventory) {
  if (line > 0) return line;
  if (inventory?.line) return Number(inventory.line) || 0;
  const lines = readLines(file);
  const core = normalizeCore(problematic);
  if (!lines || !core) return 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(core)) return i + 1;
  }
  return 0;
}

function mapWhereToSurface(where) {
  const w = String(where || "");
  if (w.includes("דוח מפורט")) return "detailed_report";
  if (w.includes("דוח קצר")) return "short_report";
  if (w.includes("AI") || w.includes("מסביר")) return "ai_explainer";
  if (w.includes("שכבת ניסוח")) return "language_layer";
  if (w.includes("דשבורד")) return "parent_dashboard";
  if (w.includes("בונה דוח")) return "report_builder";
  return "report_general";
}

function mapWhereToSection(where) {
  const w = String(where || "");
  if (w.includes("כרטיס מקצוע")) return "subject_card";
  if (w.includes("כרטיס נושא")) return "topic_card";
  if (w.includes("מצב נתונים") || w.includes("נתונים דלים")) return "data_health";
  if (w.includes("המלצות") || w.includes("בית")) return "home_recommendations";
  if (w.includes("תובנות") || w.includes("מה חשוב")) return "insights";
  if (w.includes("סיכום")) return "executive_summary";
  return "general";
}

function inferSubject(where, inventory) {
  const w = String(where || "");
  if (w.includes("כרטיס מקצוע") || w.includes("מקצוע —")) return "חשבון";
  if (inventory?.section === "subject_card" || inventory?.section === "subject_letter") return "חשבון";
  return "";
}

function inferTopic(where, inventory) {
  const w = String(where || "");
  if (w.includes("כרטיס נושא") || w.includes("נושא —")) return "שברים";
  if (inventory?.section === "topic_card") return "שברים";
  return "";
}

const fileCache = new Map();
function readLines(relFile) {
  const key = relFile.replace(/\\/g, "/");
  if (fileCache.has(key)) return fileCache.get(key);
  const abs = join(ROOT, key);
  if (!existsSync(abs)) return null;
  const lines = readFileSync(abs, "utf8").split("\n");
  fileCache.set(key, lines);
  return lines;
}

function nearestHeading(lines, idx) {
  for (let i = idx; i >= Math.max(0, idx - 50); i--) {
    const h4 = lines[i].match(/pr-detailed-subheading[^>]*>([^<]+)</);
    if (h4) return h4[1].trim();
    const h = lines[i].match(/<h[1-6][^>]*>([^<]+)</);
    if (h && /[\u0590-\u05FF]/.test(h[1])) return h[1].trim();
  }
  return "";
}

function nearestLabel(lines, idx) {
  for (let i = idx; i >= Math.max(0, idx - 12); i--) {
    const m = lines[i].match(/font-bold">([^<:]+):\s*</);
    if (m) return m[1].trim();
  }
  return "";
}

function mapKeyLabel(line) {
  const exportM = line.match(/export const ([A-Z0-9_]+)/);
  if (exportM) {
    const name = exportM[1];
    if (/HOME|RECOMMEND/i.test(name)) return "המלצות לבית";
    if (/SUPPORT|SEQUENCE/i.test(name)) return "כיוון תמיכה";
    if (/TREND|EXECUTIVE/i.test(name)) return "מגמות / סיכום";
    if (/NARRATIVE|CONTRACT/i.test(name)) return "ניסוח חוזה נרטיב";
    return "תווית מנוע";
  }
  const keyM = line.match(/^\s*([a-zA-Z_][\w]*)\s*:/);
  if (keyM) return keyM[1].replace(/_/g, " ");
  return "";
}

function detectUsageKind(line, lines, idx, problematic) {
  const core = normalizeCore(problematic);
  if (/strongTrendWords|removeStrongTrendWords/.test(lines.slice(Math.max(0, idx - 8), idx + 8).join("\n"))) {
    return "trend_filter_vocabulary";
  }
  if (/^\s*[\["']/.test(line.trim()) && line.includes(`"${core}"`)) {
    const prev = lines.slice(Math.max(0, idx - 3), idx + 1).join(" ");
    if (/pickVariant|return \[|Bullets|items=/.test(prev)) return "variant_or_bullet";
  }
  if (/:\s*[`'"]/.test(line) || /[`'"].*[`'"]\s*[,}]/.test(line)) return "labeled_string";
  if (/>\s*[\u0590-\u05FF]/.test(line) || /font-bold/.test(line)) return "jsx_render";
  if (/\$\{/.test(line)) return "template";
  return "unknown";
}

function extractCodeContext(file, line, problematic, inventory) {
  const lines = readLines(file);
  if (!lines || !line || line < 1 || line > lines.length) {
    return { ok: false, reason: "source file or line not found" };
  }
  const idx = line - 1;
  const lineText = lines[idx];
  const core = normalizeCore(problematic);
  const usageKind = detectUsageKind(lineText, lines, idx, problematic);
  const heading = nearestHeading(lines, idx);
  const inlineLabel = nearestLabel(lines, idx);
  const mapLabel = mapKeyLabel(lineText) || mapKeyLabel(lines[Math.max(0, idx - 1)] || "");
  const mentionsSubject = /מקצוע|subject|Subject/.test(
    lines.slice(Math.max(0, idx - 20), idx + 5).join("\n")
  );
  const mentionsTopic = /נושא|topic|Topic|displayName/.test(
    lines.slice(Math.max(0, idx - 20), idx + 5).join("\n")
  );

  let hostSnippet = substitutePlaceholders(lineText.trim().slice(0, 220));
  if (usageKind === "jsx_render" && inlineLabel) {
    hostSnippet = `${inlineLabel}: ${core || substitutePlaceholders(lineText)}`;
  } else if (usageKind === "labeled_string" && mapLabel) {
    hostSnippet = `${mapLabel}: ${core}`;
  } else if (usageKind === "variant_or_bullet") {
    hostSnippet = `• ${core}`;
  } else if (usageKind === "trend_filter_vocabulary") {
    hostSnippet = `מילת מגמה שעשויה להופיע בסיכום: ${core}`;
  } else if (inventory?.example_output) {
    hostSnippet = substitutePlaceholders(inventory.example_output);
  }

  return {
    ok: true,
    lineText,
    heading,
    inlineLabel,
    mapLabel,
    usageKind,
    hostSnippet,
    mentionsSubject,
    mentionsTopic,
    condition: inventory?.condition || lineText.trim().slice(0, 180),
  };
}

function reportLocationLine(where, subject, topic) {
  const parts = [String(where || "").trim()];
  if (subject) parts.push(`מקצוע לדוגמה: ${subject}`);
  if (topic) parts.push(`נושא לדוגמה: ${topic}`);
  return parts.filter(Boolean).join(" | ");
}

function buildBeforeInReportContext(where, problematic, suggested, inventory, codeCtx, subject, topic) {
  if (!codeCtx?.ok && !inventory) {
    return { text: NEEDS_FULL, notes: ["source context not found"] };
  }

  const core = normalizeCore(problematic) || normalizeCore(inventory?.current_hebrew || "");
  const loc = reportLocationLine(where, subject, topic);
  const notes = [];

  if (!core && !inventory?.current_hebrew) {
    return { text: NEEDS_FULL, notes: ["no problematic text to anchor context"] };
  }

  if (!codeCtx?.ok && inventory) {
    notes.push("exact source line not resolved; using inventory metadata and string text");
  }

  const blocks = [loc];
  if (codeCtx?.heading) blocks.push(`כותרת בדוח: ${codeCtx.heading}`);
  else if (inventory?.section && inventory.section !== "general") {
    blocks.push(`אזור בדוח: ${inventory.section}`);
  }

  let body = "";
  const displayPhrase = substitutePlaceholders(problematic) || core;
  if (codeCtx?.usageKind === "trend_filter_vocabulary") {
    body = `בסיכום המנהלים (מגמות מרכזיות), שורת מגמה עלולה להציג: «${core}».`;
    notes.push("המחרוזת מופיעה גם ברשימת מילות מגמה שמסוננות/מנורמלות לפני תצוגה");
  } else if (codeCtx?.usageKind === "variant_or_bullet") {
    const section = codeCtx.heading || "רשימת נקודות בדוח";
    body = `ב${section}: «${displayPhrase}».`;
  } else if (codeCtx?.usageKind === "template" || codeCtx?.usageKind === "jsx_render") {
    const prefix = codeCtx.inlineLabel ? `${codeCtx.inlineLabel}: ` : "";
    body = `${prefix}${displayPhrase}`;
  } else if (codeCtx?.hostSnippet) {
    body = codeCtx.hostSnippet.includes(core)
      ? codeCtx.hostSnippet
      : `${codeCtx.inlineLabel ? `${codeCtx.inlineLabel}: ` : ""}${displayPhrase}`;
  } else {
    body = displayPhrase;
  }

  body = substitutePlaceholders(body);
  blocks.push(`לפני החלפה: ${body}`);
  return { text: blocks.join("\n"), notes };
}

function buildAfterInReportContext(before, problematic, suggested) {
  const sugg = String(suggested || "").trim();
  const prob = normalizeCore(problematic);
  if (!sugg) {
    return { text: before, notes: ["no suggested replacement in owner-review row"] };
  }
  if (!before || before === NEEDS_FULL) {
    return { text: NEEDS_FULL, notes: ["cannot apply replacement without before context"] };
  }
  if (normalizeCore(sugg) === prob) {
    return { text: before.replace("לפני החלפה:", "אחרי החלפה (ללא שינוי מוצע):"), notes: [] };
  }

  const beforeBody = before.includes("לפני החלפה:")
    ? before.split("לפני החלפה:").slice(1).join("לפני החלפה:").trim()
    : before;

  let afterBody = beforeBody;
  const candidates = [prob, problematic.trim(), prob.replace(/^\[|\]$/g, "")].filter(Boolean);
  let replaced = false;
  for (const c of candidates) {
    if (c && afterBody.includes(c)) {
      afterBody = afterBody.replace(c, sugg.replace(/^·\s*/, ""));
      replaced = true;
      break;
    }
  }
  if (!replaced) {
    afterBody = `${beforeBody} → ${substitutePlaceholders(sugg)}`;
    return {
      text: before.replace("לפני החלפה:", "אחרי החלפה:").replace(beforeBody, afterBody),
      notes: ["suggested replacement does not embed cleanly in the excerpt; appended after arrow"],
    };
  }

  const afterText = before.replace("לפני החלפה:", "אחרי החלפה:").replace(beforeBody, substitutePlaceholders(afterBody));
  const notes = [];
  if (prob.length <= 12 && sugg.length > prob.length * 2) {
    notes.push("suggested replacement is much longer than the original phrase slot");
  }
  return { text: afterText, notes };
}

function assessConfidence(codeCtx, inventory, before, afterNotes, where) {
  if (before === NEEDS_FULL || afterNotes.includes("cannot apply replacement without before context")) {
    return "low";
  }
  if (!codeCtx?.ok && !inventory) return "low";
  if (!codeCtx?.ok && inventory) return "medium";
  if (codeCtx.usageKind === "trend_filter_vocabulary" || codeCtx.usageKind === "unknown") {
    return "medium";
  }
  if (afterNotes.some((n) => n.includes("does not embed cleanly"))) return "medium";
  if (afterNotes.some((n) => n.includes("exact source line not resolved"))) return "medium";
  if (inventory && codeCtx.ok && substitutePlaceholders(inventory.current_hebrew || "")) {
    return /חשבון|שברים|146|51%/.test(before) ? "medium" : "high";
  }
  if (where) return "medium";
  return "low";
}

function matchScenario(scenarios, problematic, inventory) {
  const core = normalizeCore(problematic);
  for (const sc of scenarios) {
    const txt = String(sc.generated_text || "");
    if (core && txt.includes(core.slice(0, Math.min(20, core.length)))) {
      return sc.scenario_id || sc.scenario_description || "";
    }
  }
  if (inventory?.condition && /q=|acc=|zero|thin/i.test(inventory.condition)) {
    return inventory.condition.slice(0, 80);
  }
  return "";
}

function collectReviewRows() {
  if (!existsSync(REVIEW_FOLDER)) return [];
  const files = readdirSync(REVIEW_FOLDER)
    .filter((f) => /^parent-report-hebrew-owner-review-\d+-rows-.*\.xlsx$/i.test(f))
    .sort();
  const rows = [];
  for (const file of files) {
    const wb = XLSX.readFile(join(REVIEW_FOLDER, file));
    const sh = wb.Sheets[SHEET_NAME];
    if (!sh) continue;
    const aoa = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "" });
    for (let r = 1; r < aoa.length; r++) {
      const row = aoa[r];
      if (!row?.length) continue;
      rows.push({
        row_number: row[0] || r,
        review_file: file,
        where: row[1],
        problematic: row[2],
        engine_meaning: row[3],
        suggested: row[4],
        technical: row[9],
      });
    }
  }
  return rows;
}

function main() {
  mkdirSync(join(ROOT, "reports"), { recursive: true });
  const inventoryById = loadInventoryIndex();
  const scenarios = loadScenarioHints();
  const reviewRows = collectReviewRows();

  const outRows = [];
  const misfits = [];
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  let needsFullCount = 0;

  for (const row of reviewRows) {
    const parsed = parseTechnicalSource(row.technical);
    const inventory = inventoryById.get(parsed.id) || null;
    const file = parsed.file || inventory?.file || "";
    const line = resolveSourceLine(file, parsed.line || 0, row.problematic, inventory);

    const report_surface = inventory?.surface || mapWhereToSurface(row.where);
    const report_section = inventory?.section || mapWhereToSection(row.where);

    const codeCtx = file
      ? extractCodeContext(file, line, row.problematic, inventory)
      : { ok: false, reason: "missing source file" };

    const subject_if_known = inferSubject(row.where, inventory);
    const topic_if_known = inferTopic(row.where, inventory);
    const scenario_if_known = matchScenario(scenarios, row.problematic, inventory);

    const beforeResult = buildBeforeInReportContext(
      row.where,
      row.problematic,
      row.suggested,
      inventory,
      codeCtx,
      subject_if_known,
      topic_if_known
    );
    const afterResult = buildAfterInReportContext(
      beforeResult.text,
      row.problematic,
      row.suggested
    );

    const allNotes = [...beforeResult.notes, ...afterResult.notes];
    const context_confidence = assessConfidence(
      codeCtx,
      inventory,
      beforeResult.text,
      allNotes,
      row.where
    );
    confidenceCounts[context_confidence]++;

    if (beforeResult.text === NEEDS_FULL || afterResult.text === NEEDS_FULL) needsFullCount++;

    if (allNotes.some((n) => n.includes("does not embed cleanly") || n.includes("much longer"))) {
      misfits.push({
        row_number: row.row_number,
        id: parsed.id,
        problematic: normalizeCore(row.problematic).slice(0, 60),
        suggested: String(row.suggested || "").slice(0, 60),
        note: allNotes.join("; "),
      });
    }

    outRows.push({
      row_number: row.row_number,
      review_file: row.review_file,
      id: parsed.id,
      source_file: file,
      source_line: line,
      report_surface,
      report_section,
      subject_if_known,
      topic_if_known,
      scenario_if_known,
      engine_meaning_plain_he: String(row.engine_meaning || "").trim(),
      before_in_report_context: beforeResult.text,
      after_in_report_context: afterResult.text,
      context_confidence,
      notes: allNotes.join(" | ") || (inventory?.notes || codeCtx.reason || ""),
    });
  }

  const columns = [
    "row_number",
    "review_file",
    "id",
    "source_file",
    "source_line",
    "report_surface",
    "report_section",
    "subject_if_known",
    "topic_if_known",
    "scenario_if_known",
    "engine_meaning_plain_he",
    "before_in_report_context",
    "after_in_report_context",
    "context_confidence",
    "notes",
  ];

  const csv = [
    columns.join(","),
    ...outRows.map((r) => columns.map((c) => csvCell(r[c])).join(",")),
  ].join("\n");

  writeFileSync(OUT_CSV, `\uFEFF${csv}`, "utf8");

  const summaryPath = join(ROOT, "reports", "parent-report-hebrew-context-map-summary.txt");
  writeFileSync(
    summaryPath,
    [
      `Generated: ${new Date().toISOString()}`,
      `CSV: reports/parent-report-hebrew-context-map.csv`,
      `Rows processed: ${outRows.length}`,
      `Confidence high: ${confidenceCounts.high}`,
      `Confidence medium: ${confidenceCounts.medium}`,
      `Confidence low: ${confidenceCounts.low}`,
      `Needs full report (צריך לבדוק בדוח מלא): ${needsFullCount}`,
      `Misfit candidates: ${misfits.length}`,
      "",
      "Top misfit rows:",
      ...misfits.slice(0, 15).map(
        (m) =>
          `- row ${m.row_number} ${m.id}: «${m.problematic}» → «${m.suggested}» (${m.note})`
      ),
      "",
      "No product source code changed.",
      "No commit, push, or deploy.",
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        csv: OUT_CSV,
        rows: outRows.length,
        confidence: confidenceCounts,
        needsFull: needsFullCount,
        misfits: misfits.length,
        topMisfits: misfits.slice(0, 10),
      },
      null,
      2
    )
  );
}

main();
