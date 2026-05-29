/**
 * Build machine-readable context map from learning-content Hebrew inventory.
 * Run: node scripts/learning-content-hebrew-context-map-build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INVENTORY_PATH = join(ROOT, "reports", "learning-content-hebrew-inventory.xlsx");
const OUT_CSV = join(ROOT, "reports", "learning-content-hebrew-context-map.csv");
const OUT_SUMMARY = join(ROOT, "reports", "learning-content-hebrew-context-map-summary.txt");

const PLACEHOLDER_SUBS = [
  [/\$\{lab\}/g, "חשבון"],
  [/\$\{side\}/g, "5"],
  [/\$\{angle\}/g, "90"],
  [/\$\{a\}/g, "3"],
  [/\$\{b\}/g, "4"],
  [/\$\{c\}/g, "7"],
  [/\$\{correctAnswer\}/g, "12"],
  [/\$\{[^}]+\}/g, "[ערך]"],
];

function substitutePlaceholders(text) {
  let out = String(text || "");
  for (const [re, val] of PLACEHOLDER_SUBS) out = out.replace(re, val);
  return out.replace(/\s+/g, " ").trim();
}

function csvCell(value) {
  const s = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function loadInventoryRows() {
  if (!existsSync(INVENTORY_PATH)) return [];
  const wb = XLSX.readFile(INVENTORY_PATH);
  const preferred = ["Owner Review Candidates", "Learning Content Strings", "Question Stems"];
  const rows = [];
  const seen = new Set();
  for (const sheetName of preferred) {
    const sh = wb.Sheets[sheetName];
    if (!sh) continue;
    for (const row of XLSX.utils.sheet_to_json(sh, { defval: "" })) {
      const id = String(row.id || "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({ ...row, inventory_sheet: sheetName });
    }
  }
  return rows;
}

function loadScenarioIndex() {
  const map = new Map();
  if (!existsSync(INVENTORY_PATH)) return map;
  const wb = XLSX.readFile(INVENTORY_PATH);
  const sh = wb.Sheets["Rendered Scenario Samples"];
  if (!sh) return map;
  for (const row of XLSX.utils.sheet_to_json(sh, { defval: "" })) {
    const subj = String(row.subject || "");
    const grade = String(row.grade || "");
    const topic = String(row.topic || "");
    map.set(`${subj}:${grade}:${topic}`, row);
  }
  return map;
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

function nearbyContext(lines, idx, text) {
  if (!lines || idx < 0) return "";
  const start = Math.max(0, idx - 3);
  const end = Math.min(lines.length, idx + 4);
  const chunk = lines.slice(start, end).join("\n");
  const core = substitutePlaceholders(text).slice(0, 60);
  if (core && chunk.includes(core.slice(0, Math.min(30, core.length)))) {
    return chunk.slice(0, 600);
  }
  return lines.slice(start, end).join("\n").slice(0, 600);
}

function findLine(file, text) {
  const lines = readLines(file);
  if (!lines) return 0;
  const core = substitutePlaceholders(text).slice(0, 80);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(core.slice(0, Math.min(40, core.length)))) return i + 1;
  }
  return 0;
}

function inferMeaningPlainHe(row) {
  const ct = String(row.content_type || "");
  const subj = String(row.subject || "");
  if (ct === "question_stem") return `גזע שאלת ${subj || "למידה"} שמוצגת לתלמיד`;
  if (ct === "answer_option") return `אפשרות תשובה לשאלת ${subj || "למידה"}`;
  if (ct === "hint") return "רמז שמוצג לתלמיד בזמן פתרון";
  if (ct === "explanation") return "הסבר לאחר תשובה או בחלון פתרון";
  if (ct === "feedback_correct") return "משוב חיובי לאחר תשובה נכונה";
  if (ct === "feedback_wrong") return "משוב לאחר תשובה שגויה";
  if (ct === "fallback_question") return "הודעת גיבוי כשאין שאלה זמינה";
  if (ct === "topic_label") return "שם נושא שמוצג בתפריט/מסך למידה";
  if (ct === "skill_label") return "תווית מיומנות בתוכנית הלימודים";
  if (ct === "level_label") return "תווית רמת קושי";
  if (ct === "activity_instruction") return "הוראות פעילות כיתתית לתלמיד";
  if (ct === "generator_template") return "תבנית דינמית ליצירת שאלה";
  return "טקסט למידה";
}

function buildBeforeInContext(row, scenarioIndex) {
  const text = substitutePlaceholders(row.current_hebrew || row.displayed_hebrew || "");
  const subj = row.subject || "";
  const grade = row.grade || "";
  const topic = row.topic || "";
  const ct = row.content_type || "";

  const scenario = scenarioIndex.get(`${subj}:${grade}:${topic}`);
  if (scenario && ct === "question_stem") {
    const parts = [
      `שאלה: ${scenario.question_stem || text}`,
      scenario.options ? `אפשרויות: ${scenario.options}` : "",
      scenario.hint ? `רמז: ${scenario.hint}` : "",
      scenario.explanation ? `הסבר: ${scenario.explanation}` : "",
      scenario.notes ? `[${scenario.notes}]` : "",
    ].filter(Boolean);
    return parts.join("\n").slice(0, 1200);
  }

  const file = String(row.file || row.source?.split(":")[0] || "");
  const line = Number(row.line) || findLine(file, text);
  const lines = readLines(file);
  if (lines && line > 0) {
    const ctx = nearbyContext(lines, line - 1, text);
    if (ctx) return ctx;
  }

  if (ct === "answer_option") {
    return `אפשרות תשובה בנושא ${topic || "לא ידוע"}, מקצוע ${subj || "לא ידוע"}, כיתה ${grade || "?"}`;
  }
  if (ct === "hint" || ct === "explanation") {
    return `טקסט ${ct === "hint" ? "רמז" : "הסבר"} עבור נושא ${topic || "לא ידוע"} (${subj || "?"})`;
  }
  if (["topic_label", "skill_label", "level_label"].includes(ct)) {
    return `תווית תוכנית: ${text} | מקצוע ${subj || "?"} כיתה ${grade || "?"}`;
  }
  return text.slice(0, 400);
}

function contextConfidence(row, before) {
  if (before.includes("שאלה:") && before.includes("אפשרויות:")) return "high";
  if (before.length > 120 && before.includes(substitutePlaceholders(row.current_hebrew || "").slice(0, 20))) return "high";
  if (Number(row.line) > 0 && before.length > 80) return "medium";
  if (row.inventory_sheet === "Owner Review Candidates") return "medium";
  if (row.visibility === "internal_only") return "low";
  return "low";
}

function main() {
  mkdirSync(join(ROOT, "reports"), { recursive: true });
  const inventoryRows = loadInventoryRows();
  const scenarioIndex = loadScenarioIndex();

  const outRows = [];
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  let rowNum = 0;

  for (const row of inventoryRows) {
    const text = row.current_hebrew || row.displayed_hebrew || row.option_text || "";
    if (!text) continue;
    const before = buildBeforeInContext(row, scenarioIndex);
    const conf = contextConfidence(row, before);
    confidenceCounts[conf] = (confidenceCounts[conf] || 0) + 1;

    const file = String(row.file || row.source?.split(":")[0] || "");
    const line = Number(row.line) || findLine(file, text);

    outRows.push({
      row_number: ++rowNum,
      id: row.id,
      subject: row.subject || "",
      grade: row.grade || "",
      level: row.level || "",
      topic: row.topic || "",
      source_file: file,
      source_line: line,
      content_type: row.content_type || "",
      meaning_plain_he: inferMeaningPlainHe(row),
      before_in_context: before.slice(0, 1500),
      context_confidence: conf,
      notes: row.notes || row.risk || "",
    });
  }

  const header = [
    "row_number",
    "id",
    "subject",
    "grade",
    "level",
    "topic",
    "source_file",
    "source_line",
    "content_type",
    "meaning_plain_he",
    "before_in_context",
    "context_confidence",
    "notes",
  ];
  const csv = [header.join(","), ...outRows.map((r) => header.map((h) => csvCell(r[h])).join(","))].join("\n");
  writeFileSync(OUT_CSV, csv, "utf8");

  const summary = `Learning Content Hebrew Context Map Summary
Generated: ${new Date().toISOString()}

Source inventory: ${INVENTORY_PATH}
Output CSV: ${OUT_CSV}

Total context rows: ${outRows.length}
Context confidence:
  high: ${confidenceCounts.high || 0}
  medium: ${confidenceCounts.medium || 0}
  low: ${confidenceCounts.low || 0}

Content types:
${Object.entries(
  outRows.reduce((acc, r) => {
    const k = r.content_type || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}

Subjects:
${Object.entries(
  outRows.reduce((acc, r) => {
    const k = r.subject || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}

Notes:
- No product code changed.
- suggested_replacement left empty in inventory; context map is read-only.
- Owner Review Candidates prioritized for context rows.
- Correct answers in scenario notes marked internal review only.
`;
  writeFileSync(OUT_SUMMARY, summary, "utf8");

  console.log(
    JSON.stringify(
      {
        csvPath: "reports/learning-content-hebrew-context-map.csv",
        summaryPath: "reports/learning-content-hebrew-context-map-summary.txt",
        contextRows: outRows.length,
        confidenceCounts,
      },
      null,
      2
    )
  );
}

main();
