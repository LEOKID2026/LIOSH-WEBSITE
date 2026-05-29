/**
 * Build Wave 1 owner-review workbook from full inventory.
 * Run: node scripts/parent-report-hebrew-copy-wave1-build.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PRIORITY_TERMS = [
  "רצף תמיכה",
  "זיכרון המלצה",
  "תלות יסוד",
  "יסוד מול מקומי",
  "פער ידע",
  "מגמת דיוק",
  "מסקנה חדה",
  "מסקנה חזקה",
  "יעד קידום",
  "עלייה ברמה",
  "מוכנות לשלב הבא",
  "ירידה מבוססת",
  "בירידה",
  "ביטחון סטטיסטי",
  "שורות דוח",
  "לא מדרגים",
  "לא מסכמים",
  "חיכוך הוראה",
  "אגרסיבית",
];

const EXCLUDE_FILES = new Set([
  "utils/parent-report-language/forbidden-terms.js",
  "scripts/parent-report-hebrew-copy-guard.mjs",
]);

const WAVE1_SECTIONS = new Set([
  "data_health",
  "home_recommendations",
  "insights",
  "topic_card",
  "subject_card",
  "executive_summary",
  "subject_letter",
  "general",
  "parent_dashboard_sections",
  "server_parent_facing",
  "ai_explainer",
  "language_layer",
  "short_report",
  "detailed_report",
]);

function sheetRows(wb, name) {
  const sh = wb.Sheets[name];
  if (!sh) return [];
  return XLSX.utils.sheet_to_json(sh, { defval: "" });
}

function hasPriorityTerm(text) {
  const t = String(text || "");
  return PRIORITY_TERMS.some((term) => t.includes(term));
}

function isArithmeticCarryingContext(file, text) {
  const f = String(file || "");
  const t = String(text || "");
  if (!t.includes("העברה")) return false;
  if (f.includes("pedagogy-glossary-he.js")) return true;
  if (
    /חיבור|עשרונית|בלי העברה|בלי בסיס להעברה|נכון כשאין העברה|ספרות הקיצון|העברה עשרונית|עם העברה ובלי/.test(
      t
    )
  ) {
    return true;
  }
  if (/קידום|עלייה ברמה|מוכנות לשלב|העברה לרמה|ירידה ברמה/.test(t)) return false;
  if (f.includes("parent-facing-normalize-he.js") && /בחיבור|עשרונית/.test(t)) return true;
  return false;
}

function isInternalOnlyRow(row) {
  if (String(row.visibility || "").toLowerCase() === "internal-only") return true;
  const notes = String(row.notes || "");
  if (/not rendered|denylist|guard infrastructure|normalization regex/i.test(notes)) return true;
  if (EXCLUDE_FILES.has(row.file)) return true;
  if (/\.replace\s*\(/.test(String(row.condition || ""))) return true;
  return false;
}

function inferSeverity(row) {
  const s = String(row.severity || "").toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  const risk = String(row.risk || row.problem_type || row.why_problematic || "");
  if (/jargon|progression/.test(risk)) return "high";
  if (/thin_data|awkward/.test(risk)) return "medium";
  if (hasPriorityTerm(row.current_hebrew)) return "high";
  if (String(row.visibility || "") === "needs_review") return "medium";
  return "low";
}

function whyThisMatters(row) {
  const text = String(row.current_hebrew || "");
  const hits = PRIORITY_TERMS.filter((t) => text.includes(t));
  if (hits.length) {
    return `מכיל מונחים פנימיים/מקצועיים שאינם ברורים להורה: ${hits.join(", ")}`;
  }
  if (row.problem_type === "jargon") return "ז'רגון מנוע/אבחון עלול להופיע בדוח הורה";
  if (row.problem_type === "progression_risk") return "ניסוח עלול לרמוז על קידום/ירידת רמה בלי הסבר פשוט";
  if (row.problem_type === "thin_data_tone") return "הודעת מעט נתונים — חשוב שנשמעת ברורה ולא טכנית";
  if (row.problem_type === "awkward_phrasing") return "ניסוח לא טבעי או מבלבל להורה";
  if (row.state_type) return `מצב ${row.state_type} — טקסט שמופיע כשיש מעט/אין תרגול`;
  if (row.does_it_suggest_progression === "yes") return "המלצה שעשויה להיתפרש כשינוי רמה או קצב";
  if (String(row.visibility || "") === "needs_review") return "לא ברור אם מגיע לטקסט גלוי להורה — דורש אימות";
  if (row.section === "topic_card") return "כרטיס נושא — טקסט שמופיע בהמלצה לנושא";
  if (row.section === "data_health") return "הודעת מצב נתונים — גלויה להורה";
  return "טקסט גלוי להורה בדוח — דורש ניסוח סופי מאושר";
}

function conservativeSuggestion(row) {
  const text = String(row.current_hebrew || "");
  // Only ultra-safe empty-state directions; never invent full sentences.
  if (text.includes("שורות דוח") && !text.includes("${")) {
    return "";
  }
  if (hasPriorityTerm(text)) return "";
  if (row.problem_type === "thin_data_tone" && text.length < 80) {
    return "";
  }
  return "";
}

function normalizeRow(raw, sourceSheet) {
  const file = raw.file || "";
  const current_hebrew = raw.current_hebrew || raw.template || "";
  const row = {
    id: raw.id || "",
    file,
    function: raw.function || raw.function_or_prompt || "",
    line: raw.line || "",
    surface: raw.surface || inferSurfaceFromFile(file),
    section: raw.section || inferSectionFromSheet(sourceSheet, raw),
    condition: raw.condition || "",
    current_hebrew,
    example_output: raw.example_output || raw.example_output_low_data || current_hebrew,
    problem_type: raw.problem_type || raw.risk || raw.why_problematic || "",
    severity: inferSeverity(raw),
    visibility: raw.visibility || "parent-visible",
    suggested_replacement: raw.suggested_replacement || "",
    owner_approved_replacement: raw.owner_approved_replacement || "",
    status: raw.status || "pending_owner_review",
    notes: raw.notes || "",
    does_it_suggest_progression: raw.does_it_suggest_progression || "",
    _source: sourceSheet,
  };
  row.why_this_matters = whyThisMatters(row);
  if (!row.suggested_replacement) {
    row.suggested_replacement = conservativeSuggestion(row);
  }
  if (!row.suggested_replacement && (hasPriorityTerm(current_hebrew) || row.problem_type || row.severity === "high")) {
    row.status = "needs_owner_wording";
  }
  return row;
}

function inferSurfaceFromFile(file) {
  if (file.includes("parent-report-detailed")) return "detailed_report";
  if (file.includes("parent-report.js")) return "short_report";
  if (file.includes("parent-facing.server")) return "server_parent_facing";
  if (file.includes("parent-report-ai")) return "ai_explainer";
  return "report_builder";
}

function inferSectionFromSheet(sheet, raw) {
  if (sheet === "Empty And Thin Data States") return "data_health";
  if (sheet === "Reco And Progression Copy") return "home_recommendations";
  if (sheet === "AI Parent Report Copy") return "ai_explainer";
  if (sheet === "Dynamic Templates") return "topic_card";
  return raw.section || "general";
}

function inWave1Scope(row, sourceSheet) {
  if (isInternalOnlyRow(row)) return false;
  if (isArithmeticCarryingContext(row.file, row.current_hebrew)) return false;

  const alwaysSheets = new Set(["Empty And Thin Data States", "AI Parent Report Copy"]);
  if (alwaysSheets.has(sourceSheet)) return true;

  if (sourceSheet === "Reco And Progression Copy") {
    return (
      row.does_it_suggest_progression === "yes" ||
      hasPriorityTerm(row.current_hebrew) ||
      /jargon|progression/.test(String(row.problem_type || "")) ||
      row.severity === "high"
    );
  }

  if (sourceSheet === "Dynamic Templates") {
    return (
      /topic-next-step|topic.explain|topic_card|נושא/i.test(`${row.file} ${row.function}`) ||
      hasPriorityTerm(row.current_hebrew)
    );
  }

  if (sourceSheet === "Parent Visible Strings") {
    const vis = String(row.visibility || "");
    if (vis === "internal-only") return false;
    if (vis === "needs_review") return true;
    if (hasPriorityTerm(row.current_hebrew)) return true;
    if (row.severity === "high") return true;
    if (["jargon", "progression_risk", "awkward_phrasing", "thin_data_tone"].includes(row.problem_type)) {
      return true;
    }
    if (
      ["data_health", "home_recommendations", "topic_card", "subject_card", "insights"].includes(row.section) &&
      row.severity === "medium"
    ) {
      return true;
    }
    return false;
  }

  return false;
}

const invPath = join(ROOT, "reports/parent-report-hebrew-copy-inventory.xlsx");
const wb = XLSX.readFile(invPath);

const sourceSheets = [
  "Parent Visible Strings",
  "Empty And Thin Data States",
  "Reco And Progression Copy",
  "Dynamic Templates",
  "AI Parent Report Copy",
];

const merged = [];
const seen = new Set();

for (const sheetName of sourceSheets) {
  for (const raw of sheetRows(wb, sheetName)) {
    const row = normalizeRow(raw, sheetName);
    const key = `${row.file}:${row.line}:${row.current_hebrew.slice(0, 100)}`;
    if (seen.has(key)) continue;
    if (!inWave1Scope(row, sheetName)) continue;
    seen.add(key);
    merged.push(row);
  }
}

// Ensure priority-term parent-visible rows from any sheet are included
for (const raw of sheetRows(wb, "Parent Visible Strings")) {
  const row = normalizeRow(raw, "Parent Visible Strings");
  if (!hasPriorityTerm(row.current_hebrew)) continue;
  if (isInternalOnlyRow(row) || isArithmeticCarryingContext(row.file, row.current_hebrew)) continue;
  const key = `${row.file}:${row.line}:${row.current_hebrew.slice(0, 100)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  merged.push(row);
}

merged.sort((a, b) => {
  const rank = { high: 0, medium: 1, low: 2 };
  const dr = (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  if (dr !== 0) return dr;
  return String(a.id).localeCompare(String(b.id));
});

const columns = [
  "id",
  "file",
  "function",
  "line",
  "surface",
  "section",
  "condition",
  "current_hebrew",
  "example_output",
  "problem_type",
  "severity",
  "why_this_matters",
  "suggested_replacement",
  "owner_approved_replacement",
  "status",
  "notes",
];

const outRows = merged.map((r) => {
  const o = {};
  for (const c of columns) o[c] = r[c] ?? "";
  return o;
});

const outWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(
  outWb,
  XLSX.utils.json_to_sheet([
    { metric: "wave", value: "1", notes: "Owner review — default-visible parent report copy" },
    { metric: "source", value: "parent-report-hebrew-copy-inventory.xlsx", notes: "" },
    { metric: "row_count", value: outRows.length, notes: "" },
    { metric: "generated_at", value: new Date().toISOString(), notes: "" },
  ]),
  "Summary"
);
XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(outRows), "Wave1 Owner Review");

const outDir = join(ROOT, "reports");
mkdirSync(outDir, { recursive: true });
const xlsxOut = join(outDir, "parent-report-hebrew-copy-wave1-owner-review.xlsx");
XLSX.writeFile(outWb, xlsxOut);

const bySeverity = { high: 0, medium: 0, low: 0, "": 0 };
for (const r of outRows) {
  const s = r.severity || "";
  bySeverity[s] = (bySeverity[s] || 0) + 1;
}

const top30 = outRows
  .filter((r) => r.status === "needs_owner_wording" || r.severity === "high" || hasPriorityTerm(r.current_hebrew))
  .slice(0, 30);

const md = `# Parent Report Hebrew Copy — Wave 1 Owner Review

Generated: ${new Date().toISOString()}

Source: \`reports/parent-report-hebrew-copy-inventory.xlsx\`

Output: \`reports/parent-report-hebrew-copy-wave1-owner-review.xlsx\`

## Wave 1 scope

- Parent-visible / default-visible report copy
- Empty and thin-data states
- Recommendation and progression copy
- Topic recommendation templates
- AI parent report copy
- High-risk and needs_review rows
- Excludes internal-only, guard/denylist sources, and arithmetic "העברה" glossary entries

## Counts

| Metric | Value |
|--------|------:|
| **Total rows** | **${outRows.length}** |
| High severity | ${bySeverity.high || 0} |
| Medium severity | ${bySeverity.medium || 0} |
| Low severity | ${bySeverity.low || 0} |
| needs_owner_wording status | ${outRows.filter((r) => r.status === "needs_owner_wording").length} |

## Top 30 rows requiring owner wording

${top30
  .map(
    (r, i) =>
      `${i + 1}. **${r.severity}** | \`${r.id}\` | ${r.file}:${r.line}\n   - ${String(r.current_hebrew).slice(0, 120)}${r.current_hebrew.length > 120 ? "…" : ""}\n   - ${r.why_this_matters}`
  )
  .join("\n\n")}

## Notes

- No product source code modified.
- \`suggested_replacement\` left empty unless a conservative hint was safe; owner fills \`owner_approved_replacement\`.
- Priority jargon terms flagged for review even when severity heuristic missed them.
`;

const mdOut = join(outDir, "parent-report-hebrew-copy-wave1-owner-review-summary.md");
writeFileSync(mdOut, md, "utf8");

console.log(
  JSON.stringify(
    {
      xlsxOut: "reports/parent-report-hebrew-copy-wave1-owner-review.xlsx",
      mdOut: "reports/parent-report-hebrew-copy-wave1-owner-review-summary.md",
      rowCount: outRows.length,
      bySeverity,
      needsOwnerWording: outRows.filter((r) => r.status === "needs_owner_wording").length,
      top30Count: top30.length,
    },
    null,
    2
  )
);
