/**
 * Build context map from site general Owner Review Candidates.
 * Run: node scripts/site-general-hebrew-context-map-build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INVENTORY_PATH = join(ROOT, "reports", "site-general-hebrew-copy-inventory.xlsx");
const OUT_CSV = join(ROOT, "reports", "site-general-hebrew-context-map.csv");
const NEEDS_FULL = "צריך לבדוק בהקשר מלא";

const PLACEHOLDER_SUBS = [
  [/\$\{[^}]+\}/g, "[ערך]"],
  [/\[תלמיד\]/g, "דני"],
  [/\[מקצוע\]/g, "חשבון"],
  [/\[נושא\]/g, "שברים"],
];

function substitutePlaceholders(text) {
  let out = String(text || "").replace(/\\n/g, "\n");
  for (const [re, val] of PLACEHOLDER_SUBS) out = out.replace(re, val);
  return out.replace(/\s+/g, " ").trim();
}

function csvCell(value) {
  const s = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseSource(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^(.+?):(\d+)\s*$/);
  if (m) return { file: m[1].trim(), line: Number(m[2]) };
  return { file: s, line: 0 };
}

function loadInventoryById() {
  const map = new Map();
  const wb = XLSX.readFile(INVENTORY_PATH);
  for (const name of wb.SheetNames) {
    if (name === "Summary" || name === "Risky Inconsistent Terms") continue;
    for (const row of XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" })) {
      if (row.id) map.set(String(row.id), row);
    }
  }
  return map;
}

const fileCache = new Map();
function readLines(rel) {
  const key = rel.replace(/\\/g, "/");
  if (fileCache.has(key)) return fileCache.get(key);
  const abs = join(ROOT, key);
  if (!existsSync(abs)) return null;
  const lines = readFileSync(abs, "utf8").split("\n");
  fileCache.set(key, lines);
  return lines;
}

function resolveLine(file, line, text, inv) {
  if (line > 0) return line;
  if (inv?.line) return Number(inv.line) || 0;
  const lines = readLines(file);
  const core = substitutePlaceholders(text).slice(0, 30);
  if (!lines || !core) return 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(core.slice(0, 15))) return i + 1;
  }
  return 0;
}

function surfaceLabel(surface) {
  const m = {
    homepage: "בדף הבית",
    navigation: "בניווט",
    login: "במסך כניסה",
    register: "בהרשמה",
    dashboard: "בלוח בקרה",
    learning_lobby: "בלובי למידה",
    learning_screen: "במסך תרגול",
    help_center: "במרכז העזרה",
    onboarding: "בהדרכה/התחלה",
    policy: "במדיניות/הסכמה",
    admin_ui: "בממשק ניהול",
    school_setup: "בהגדרת בית ספר",
    general_component: "ברכיב ממשק כללי",
    api_message: "בהודעת API למשתמש",
    mixed_or_unclear: "בממשק כללי",
  };
  return m[surface] || surface;
}

function extractCodeContext(file, line, text) {
  const lines = readLines(file);
  if (!lines || !line || line < 1 || line > lines.length) return { ok: false };
  const idx = line - 1;
  const lineText = lines[idx];
  let heading = "";
  for (let i = idx; i >= Math.max(0, idx - 40); i--) {
    const h = lines[i].match(/<h[1-6][^>]*>([^<]+)</);
    if (h && /[\u0590-\u05FF]/.test(h[1])) {
      heading = h[1].trim();
      break;
    }
  }
  return {
    ok: true,
    lineText: lineText.trim().slice(0, 200),
    heading,
    snippet: substitutePlaceholders(text || lineText),
  };
}

function buildBefore(candidate, inv, codeCtx) {
  if (!candidate.example_before && !codeCtx?.ok && !inv) {
    return { text: NEEDS_FULL, notes: ["no context anchor"] };
  }
  const notes = [];
  const blocks = [
    surfaceLabel(candidate.surface || inv?.surface || ""),
    candidate.section ? `אזור: ${candidate.section}` : "",
    candidate.copy_type ? `סוג: ${candidate.copy_type}` : "",
  ].filter(Boolean);

  if (codeCtx?.heading) blocks.push(`כותרת: ${codeCtx.heading}`);

  let body = substitutePlaceholders(candidate.example_before || codeCtx?.snippet || candidate.current_hebrew);
  if (/^בדף|^במסך|^בניווט|^במרכז/.test(body)) {
    body = body.replace(/^ב[^:]*:\s*/, "");
  }
  if (!body) return { text: NEEDS_FULL, notes: ["empty excerpt"] };
  if (!codeCtx?.ok) notes.push("source line not verified");
  if (/\[ערך\]|…/.test(body)) notes.push("placeholders substituted");

  blocks.push(`כפי שמופיע: ${body}`);
  return { text: blocks.join("\n"), notes };
}

function assessConfidence(before, notes, codeCtx, candidate) {
  if (before === NEEDS_FULL) return "low";
  if (!codeCtx?.ok) return "medium";
  if (notes.some((n) => n.includes("placeholders"))) return "medium";
  if (candidate.meaning_plain_he && codeCtx.ok) return "high";
  return codeCtx.ok ? "high" : "medium";
}

function main() {
  mkdirSync(join(ROOT, "reports"), { recursive: true });
  const wb = XLSX.readFile(INVENTORY_PATH);
  const candidates = XLSX.utils.sheet_to_json(wb.Sheets["Owner Review Candidates"], { defval: "" });
  const inventoryById = loadInventoryById();

  const outRows = [];
  const unclear = [];
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  let needsFull = 0;

  candidates.forEach((candidate, idx) => {
    const row_number = idx + 1;
    const inv = inventoryById.get(candidate.id) || null;
    const parsed = parseSource(candidate.source);
    const file = parsed.file || inv?.file || "";
    const line = resolveLine(file, parsed.line, candidate.current_hebrew, inv);
    const codeCtx = file ? extractCodeContext(file, line, candidate.current_hebrew) : { ok: false };
    const beforeResult = buildBefore(candidate, inv, codeCtx);

    const notes = [...beforeResult.notes];
    const context_confidence = assessConfidence(beforeResult.text, notes, codeCtx, candidate);
    confidenceCounts[context_confidence]++;
    if (beforeResult.text === NEEDS_FULL) needsFull++;
    if (context_confidence !== "high" || beforeResult.text === NEEDS_FULL) {
      unclear.push({
        row_number,
        id: candidate.id,
        phrase: substitutePlaceholders(candidate.current_hebrew).slice(0, 60),
        confidence: context_confidence,
        reason: notes.join("; ") || "needs manual review",
      });
    }

    outRows.push({
      row_number,
      id: candidate.id,
      audience: candidate.audience,
      source_file: file,
      source_line: line,
      surface: candidate.surface || inv?.surface || "",
      section: candidate.section || inv?.section || "",
      copy_type: candidate.copy_type || inv?.copy_type || "",
      meaning_plain_he: candidate.meaning_plain_he || "",
      before_in_context: beforeResult.text,
      context_confidence,
      notes: notes.join(" | ") || inv?.notes || "",
    });
  });

  const columns = [
    "row_number",
    "id",
    "audience",
    "source_file",
    "source_line",
    "surface",
    "section",
    "copy_type",
    "meaning_plain_he",
    "before_in_context",
    "context_confidence",
    "notes",
  ];

  writeFileSync(
    OUT_CSV,
    `\uFEFF${[columns.join(","), ...outRows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n")}`,
    "utf8"
  );

  writeFileSync(
    join(ROOT, "reports", "site-general-hebrew-context-map-summary.txt"),
    [
      `Generated: ${new Date().toISOString()}`,
      `Rows: ${outRows.length}`,
      `High: ${confidenceCounts.high}`,
      `Medium: ${confidenceCounts.medium}`,
      `Low: ${confidenceCounts.low}`,
      `Needs full: ${needsFull}`,
      "",
      "Top unclear:",
      ...unclear.slice(0, 20).map((u) => `- row ${u.row_number} ${u.id} [${u.confidence}]: ${u.phrase}`),
      "",
      "No product code changed. No commit/push/deploy.",
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      { csv: OUT_CSV, rows: outRows.length, confidence: confidenceCounts, needsFull, unclearTop20: unclear.slice(0, 20) },
      null,
      2
    )
  );
}

main();
