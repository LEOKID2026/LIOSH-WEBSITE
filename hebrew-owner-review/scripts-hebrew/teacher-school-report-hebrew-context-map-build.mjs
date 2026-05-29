/**
 * Build machine-readable context map from teacher/school Owner Review Candidates.
 * Run: node scripts/teacher-school-report-hebrew-context-map-build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INVENTORY_PATH = join(ROOT, "reports", "teacher-school-report-hebrew-copy-inventory.xlsx");
const OUT_CSV = join(ROOT, "reports", "teacher-school-report-hebrew-context-map.csv");
const NEEDS_FULL = "צריך לבדוק בדוח מלא";
const AFTER_PLACEHOLDER = "ימולא לאחר אישור נוסח";

const PLACEHOLDER_SUBS = [
  [/\$\{body\.data\.loginUsername\}/g, "danileo"],
  [/\$\{displayName\}/g, "[תלמיד]"],
  [/\$\{studentName\}/g, "[תלמיד]"],
  [/\$\{classCard\?\.name[^}]*\}/g, "כיתה ה׳"],
  [/\$\{classLabel[^}]*\}/g, "כיתה ה׳"],
  [/\$\{subjectLabel[^}]*\}/g, "חשבון"],
  [/\$\{activeSubject\.subjectLabel\}/g, "חשבון"],
  [/\$\{topicName\}/g, "שברים"],
  [/\$\{subjHe\}/g, "חשבון"],
  [/\$\{acc\}/g, "51%"],
  [/\$\{answers\}/g, "146"],
  [/\$\{sessions\}/g, "12"],
  [/\$\{correct\}/g, "38"],
  [/\$\{total\}/g, "146"],
  [/\$\{count\}/g, "24"],
  [/\$\{days\}/g, "3"],
  [/\$\{level\}/g, "ה׳"],
  [/\$\{gradeLevel[^}]*\}/g, "כיתה ה׳"],
  [/\$\{item\.count\}/g, "28"],
  [/\$\{cls\.memberCount[^}]*\}/g, "28"],
  [/\$\{cls\.activityCount\}/g, "4"],
  [/\$\{cls\.teacherName[^}]*\}/g, "[מורה]"],
  [/\$\{w\}/g, "5"],
  [/\$\{tagLab[^}]*\}/g, ""],
  [/\$\{tagLab\s*\?[^`]*`?/g, ""],
  [/\$\{[^}]+\}/g, "[ערך]"],
  [/\?\s*["'`]/g, ""],
  [/\s+\./g, "."],
];

function substitutePlaceholders(text) {
  let out = String(text || "").replace(/\\n/g, "\n");
  for (const [re, val] of PLACEHOLDER_SUBS) out = out.replace(re, val);
  return out.replace(/\s+/g, " ").replace(/ \./g, ".").trim();
}

function normalizeCore(text) {
  return substitutePlaceholders(String(text || "")).trim();
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
  return { file: s.replace(/:$/, ""), line: 0 };
}

function loadInventoryById() {
  const map = new Map();
  if (!existsSync(INVENTORY_PATH)) return map;
  const wb = XLSX.readFile(INVENTORY_PATH);
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "Summary" || sheetName === "Professional Terms") continue;
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
    for (const row of rows) {
      if (row.id) map.set(String(row.id), { ...row, inventory_sheet: sheetName });
    }
  }
  return map;
}

function loadScenarios() {
  if (!existsSync(INVENTORY_PATH)) return [];
  const wb = XLSX.readFile(INVENTORY_PATH);
  const sh = wb.Sheets["Rendered Scenario Samples"];
  if (!sh) return [];
  return XLSX.utils.sheet_to_json(sh, { defval: "" });
}

function loadOwnerCandidates() {
  const wb = XLSX.readFile(INVENTORY_PATH);
  const sh = wb.Sheets["Owner Review Candidates"];
  if (!sh) throw new Error("Owner Review Candidates sheet not found");
  return XLSX.utils.sheet_to_json(sh, { defval: "" });
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

function resolveLine(file, line, text, inventory) {
  if (line > 0) return line;
  if (inventory?.line) return Number(inventory.line) || 0;
  const lines = readLines(file);
  const core = normalizeCore(text).slice(0, 40);
  if (!lines || !core) return 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(core.slice(0, 20))) return i + 1;
  }
  return 0;
}

function nearestHeading(lines, idx) {
  for (let i = idx; i >= Math.max(0, idx - 50); i--) {
    const h = lines[i].match(/<h[1-6][^>]*>([^<]+)</);
    if (h && /[\u0590-\u05FF]/.test(h[1])) return h[1].trim();
    const title = lines[i].match(/(TITLE|LABEL|HEADING|_TITLE)\s*=\s*["'`]([^"'`]+)["'`]/);
    if (title && /[\u0590-\u05FF]/.test(title[2])) return title[2].trim();
  }
  return "";
}

function nearestJsxLabel(lines, idx) {
  for (let i = idx; i >= Math.max(0, idx - 15); i--) {
    const m = lines[i].match(/font-bold[^>]*>([^<:]+):/);
    if (m) return m[1].trim();
  }
  return "";
}

function mapKeyLabel(line) {
  const keyM = line.match(/^\s*([A-Z0-9_]+)\s*[:=]/);
  if (keyM) return keyM[1].replace(/_/g, " ").toLowerCase();
  const constM = line.match(/export const ([A-Z0-9_]+)/);
  if (constM) return constM[1].replace(/_/g, " ").toLowerCase();
  return "";
}

function surfaceLocationLabel(surface, audience) {
  const map = {
    teacher_dashboard: "בלוח בקרה של המורה",
    student_report: "בדוח תלמיד",
    class_report: "בדוח כיתה",
    activity_report: "בדוח פעילות כיתתית",
    activity_export: "בייצוא דוח פעילות (Excel/PDF)",
    guidance_diagnostic: "בבלוק הכוונה/אבחון",
    school_admin_ui: "בממשק ניהול בית הספר",
    subject_permission: "בהרשאות מקצוע / סינון מקצועות",
    api_layer: "בהודעת מערכת למורה/מנהל",
    report_general: audience === "school_manager" ? "בממשק בית הספר" : "בממשק המורה",
  };
  return map[surface] || "בדוח/ממשק מורה או בית ספר";
}

function sectionLocationLabel(section) {
  const map = {
    data_health: "מצב נתונים",
    guidance_recommendation: "המלצות והכוונה",
    status_labels: "תוויות סטטוס",
    export_labels: "תוויות ייצוא",
    student_summary: "סיכום תלמיד",
    class_summary: "סיכום כיתה",
    activity: "פעילות",
    subject_scope: "היקף מקצועות",
    collapsed_details: "פירוט מקצועי (מורחב)",
    general: "אזור כללי",
  };
  return map[section] || section || "כללי";
}

function inferSubject(surface, section, text, inventory) {
  if (/מקצוע|subject|חשבון|עברית|גאומטריה|אנגלית/i.test(`${text} ${inventory?.condition || ""}`)) {
    if (/עברית/.test(text)) return "עברית";
    if (/גאומטריה/.test(text)) return "גאומטריה";
    if (/אנגלית/.test(text)) return "אנגלית";
    return "חשבון";
  }
  if (section === "subject_scope" || surface === "subject_permission") return "חשבון (לדוגמה)";
  if (/student_report|class_report|activity/.test(surface)) return "חשבון";
  return "";
}

function inferGrade(surface, scenarios, text) {
  if (/כיתה|שכבה|grade/i.test(text)) {
    const m = text.match(/כיתה\s*([א-ת״'׳]+)/);
    if (m) return `כיתה ${m[1]}`;
  }
  const sc = scenarios.find((s) => s.grade);
  if (sc?.grade) return sc.grade;
  if (/class_report|student_report|teacher_dashboard|activity/.test(surface)) return "כיתה ה׳";
  return "";
}

function inferClassOrStudentContext(surface, audience, text) {
  if (surface === "student_report" || /תלמיד/.test(text)) return "תלמיד בודד — [תלמיד]";
  if (surface === "class_report" || /כיתה/.test(text)) return "כיתה — כיתה ה׳ (28 תלמידים)";
  if (surface === "teacher_dashboard") return "רשימת כיתות/תלמידים בלוח בקרה";
  if (surface === "activity_report" || surface === "activity_export")
    return "פעילות כיתתית — תרגול מודרך בחשבון";
  if (audience === "school_manager") return "מנהל/ת בית ספר — סקירת בית ספר";
  if (audience === "school_teacher") return "מורה בבית ספר — כיתה משויכת";
  return "";
}

function inferDataState(section, risk, text) {
  const t = `${section} ${risk} ${text}`;
  if (/no_data|אין כיתות|אין תלמידים|אין פעילות|לא הייתה פעילות|never_active/i.test(t)) return "no_data";
  if (/thin|מצומצם|עדיין מעט|insufficient|אין מספיק נתונים/i.test(t)) return "thin_data";
  if (/weak|קושי|critical|התערבות|reinforcement/i.test(t)) return "weak_result";
  if (/strong|בקצב תקין|on_track/i.test(t)) return "normal_or_strong";
  if (/partial|date_range|בתקופה/i.test(t)) return "partial_date_range";
  return "normal_data";
}

function engineMeaningPlain(candidate, inventory, codeCtx) {
  const existing = String(candidate.meaning_plain_he || "").trim();
  if (existing && !/^תווית בקובץ ייצוא/.test(existing)) return existing;

  const text = normalizeCore(candidate.current_hebrew);
  const risk = String(candidate.risk || inventory?.problem_type || "");

  if (/דורש התערבות מיידית|critical/i.test(text)) {
    return "הדוח מסמן שהמורה צריך לפעול במהירות — הנתונים מצביעים על קושי משמעותי שדורש טיפול.";
  }
  if (/דורש חיזוק|needs_reinforcement/i.test(text)) {
    return "הדוח ממליץ על חיזוק ממוקד לפני המשך התקדמות.";
  }
  if (/כדאי לעקוב|monitor/i.test(text)) {
    return "הדוח מבקש מהמורה לעקוב אחרי התלמיד/הכיתה — עדיין אין צורך בהתערבות חזקה.";
  }
  if (/בקצב תקין|on_track/i.test(text)) {
    return "הדוח מציג שהכיתה/התלמיד מתקדמים בקצב סביר.";
  }
  if (/אין מספיק נתונים|no_data|לא היו מפגש|לא הייתה פעילות/i.test(text)) {
    return "המערכת מודיעה שאין מספיק נתוני תרגול בתקופה — לא ניתן להסיק מסקנה חזקה.";
  }
  if (/מנוע האבחון|engine_jargon/.test(`${text} ${risk}`)) {
    return "הטקסט מסביר למורה שדוח זה נפרד ממסלול האבחון האוטומטי — יש לנסח מחדש בלי אזכור 'מנוע'.";
  }
  if (/אבחון|diagnostic|guidance_wording/.test(`${text} ${risk}`)) {
    return "הדוח מנסה להסביר למורה את מקור הקושי או את כיוון הפעולה המקצועית.";
  }
  if (/UUID|PIN|untranslated_english/i.test(`${text} ${risk}`)) {
    return "הטקסט מיועד למורה/מנהל אך מכיל מונח טכני באנגלית שעלול לבלבל.";
  }
  if (/המלצ|כיוון|תרגול|פעולה/i.test(text)) {
    return "הדוח נותן למורה המלצת פעולה מקצועית על בסיס הנתונים.";
  }
  if (codeCtx?.mapLabel) {
    return `תווית/משפט במפתח ${codeCtx.mapLabel} — מוצג למורה/מנהל בהקשר ${sectionLocationLabel(candidate.section)}.`;
  }
  if (existing) return existing;
  return "הטקסט מוצג למורה או למנהל/ת בית ספר כחלק מדוח או ממשק ניהול.";
}

function extractCodeContext(file, line, text, inventory) {
  const lines = readLines(file);
  if (!lines || !line || line < 1 || line > lines.length) {
    return { ok: false, reason: "source file or line not found" };
  }
  const idx = line - 1;
  const lineText = lines[idx];
  const heading = nearestHeading(lines, idx);
  const inlineLabel = nearestJsxLabel(lines, idx);
  const mapLabel = mapKeyLabel(lineText) || mapKeyLabel(lines[Math.max(0, idx - 1)] || "");
  const usageKind = /\$\{/.test(lineText)
    ? "template"
    : /window\.alert|toast|message/i.test(lineText)
      ? "notification"
      : /export|xlsx|csv|pdf/i.test(file)
        ? "export"
        : /LabelHe|_HE\s*=/.test(lineText)
          ? "label_map"
          : "inline";

  let snippet = substitutePlaceholders(text || lineText.trim().slice(0, 200));
  if (inlineLabel) snippet = `${inlineLabel}: ${snippet}`;
  else if (mapLabel && usageKind === "label_map") snippet = `${mapLabel}: ${snippet}`;

  return {
    ok: true,
    lineText,
    heading,
    inlineLabel,
    mapLabel,
    usageKind,
    snippet,
    condition: inventory?.condition || lineText.trim().slice(0, 180),
  };
}

function buildBeforeContext(candidate, inventory, codeCtx, subject, grade, classCtx, dataState) {
  if (!codeCtx?.ok && !inventory && !candidate.example_before) {
    return { text: NEEDS_FULL, notes: ["source and inventory context not found"] };
  }

  const notes = [];
  const loc = surfaceLocationLabel(candidate.surface, candidate.audience);
  const sec = sectionLocationLabel(candidate.section);
  const blocks = [
    `${loc} | ${sec}`,
  ];
  if (subject) blocks.push(`מקצוע לדוגמה: ${subject}`);
  if (grade) blocks.push(`שכבה לדוגמה: ${grade}`);
  if (classCtx) blocks.push(`הקשר: ${classCtx}`);
  if (dataState) blocks.push(`מצב נתונים: ${dataState}`);

  if (codeCtx?.heading) blocks.push(`כותרת במסך: ${codeCtx.heading}`);

  let body = "";
  const invExample = substitutePlaceholders(inventory?.example_output || "");
  if (candidate.example_before && !/^ב[^:]*:\s*$/.test(candidate.example_before)) {
    body = substitutePlaceholders(candidate.example_before.replace(/^ב[^:]*:\s*/, ""));
  } else if (invExample && invExample.length > 3) {
    body = invExample;
  } else if (codeCtx?.snippet) {
    body = codeCtx.snippet;
  } else {
    body = substitutePlaceholders(candidate.current_hebrew);
  }

  if (!body) {
    return { text: NEEDS_FULL, notes: ["cannot anchor phrase in report context"] };
  }

  if (!codeCtx?.ok) notes.push("exact source line not verified; used inventory example_before");
  if (/\$\{|\\n/.test(candidate.current_hebrew)) notes.push("template placeholders substituted with examples");

  blocks.push(`כפי שמופיע היום: ${body}`);
  return { text: blocks.join("\n"), notes };
}

function assessConfidence(codeCtx, inventory, before, notes, candidate) {
  if (before === NEEDS_FULL) return "low";
  if (!codeCtx?.ok && !inventory?.example_output) return "low";
  if (!codeCtx?.ok) return "medium";
  if (notes.some((n) => n.includes("placeholders substituted"))) return "medium";
  if (codeCtx.usageKind === "unknown") return "medium";
  if (candidate.example_before && codeCtx.ok) return "high";
  if (inventory && codeCtx.ok) return "high";
  return "medium";
}

function matchScenario(scenarios, text, audience) {
  const core = normalizeCore(text).slice(0, 24);
  for (const sc of scenarios) {
    if (audience && sc.audience && sc.audience !== audience && sc.audience !== "mixed_or_unclear") continue;
    if (core && String(sc.generated_text || "").includes(core.slice(0, 12))) {
      return sc.scenario_id || "";
    }
  }
  return "";
}

function main() {
  mkdirSync(join(ROOT, "reports"), { recursive: true });
  const candidates = loadOwnerCandidates();
  const inventoryById = loadInventoryById();
  const scenarios = loadScenarios();

  const outRows = [];
  const unclear = [];
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  let needsFullCount = 0;

  candidates.forEach((candidate, idx) => {
    const row_number = idx + 1;
    const parsed = parseSource(candidate.source);
    const inventory = inventoryById.get(candidate.id) || null;
    const file = parsed.file || inventory?.file || "";
    const line = resolveLine(file, parsed.line, candidate.current_hebrew, inventory);

    const codeCtx = file
      ? extractCodeContext(file, line, candidate.current_hebrew, inventory)
      : { ok: false, reason: "missing source file" };

    const subject_if_known = inferSubject(candidate.surface, candidate.section, candidate.current_hebrew, inventory);
    const grade_if_known = inferGrade(candidate.surface, scenarios, candidate.current_hebrew);
    const class_or_student_context_if_known = inferClassOrStudentContext(
      candidate.surface,
      candidate.audience,
      candidate.current_hebrew
    );
    const data_state_if_known = inferDataState(
      candidate.section,
      candidate.risk,
      candidate.current_hebrew
    );

    const beforeResult = buildBeforeContext(
      candidate,
      inventory,
      codeCtx,
      subject_if_known,
      grade_if_known,
      class_or_student_context_if_known,
      data_state_if_known
    );

    const notes = [...beforeResult.notes];
    const scenarioMatch = matchScenario(scenarios, candidate.current_hebrew, candidate.audience);
    if (scenarioMatch) notes.push(`matched scenario: ${scenarioMatch}`);

    const context_confidence = assessConfidence(
      codeCtx,
      inventory,
      beforeResult.text,
      notes,
      candidate
    );
    confidenceCounts[context_confidence]++;

    if (beforeResult.text === NEEDS_FULL) {
      needsFullCount++;
      unclear.push({
        row_number,
        id: candidate.id,
        phrase: normalizeCore(candidate.current_hebrew).slice(0, 60),
        reason: notes.join("; ") || "context not inferred",
      });
    } else if (context_confidence === "low" || context_confidence === "medium") {
      unclear.push({
        row_number,
        id: candidate.id,
        phrase: normalizeCore(candidate.current_hebrew).slice(0, 60),
        confidence: context_confidence,
        reason: notes.join("; ") || "inferred context may need manual report review",
      });
    }

    outRows.push({
      row_number,
      id: candidate.id,
      audience: candidate.audience,
      source_file: file,
      source_line: line,
      report_surface: candidate.surface || inventory?.surface || "",
      report_section: candidate.section || inventory?.section || "",
      subject_if_known,
      grade_if_known,
      class_or_student_context_if_known,
      data_state_if_known,
      engine_meaning_plain_he: engineMeaningPlain(candidate, inventory, codeCtx),
      before_in_report_context: beforeResult.text,
      suggested_replacement_placeholder: "",
      after_in_report_context_placeholder: AFTER_PLACEHOLDER,
      context_confidence,
      notes: notes.join(" | ") || inventory?.notes || codeCtx.reason || "",
    });
  });

  const columns = [
    "row_number",
    "id",
    "audience",
    "source_file",
    "source_line",
    "report_surface",
    "report_section",
    "subject_if_known",
    "grade_if_known",
    "class_or_student_context_if_known",
    "data_state_if_known",
    "engine_meaning_plain_he",
    "before_in_report_context",
    "suggested_replacement_placeholder",
    "after_in_report_context_placeholder",
    "context_confidence",
    "notes",
  ];

  const csv = [columns.join(","), ...outRows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join(
    "\n"
  );
  writeFileSync(OUT_CSV, `\uFEFF${csv}`, "utf8");

  const summaryPath = join(ROOT, "reports", "teacher-school-report-hebrew-context-map-summary.txt");
  writeFileSync(
    summaryPath,
    [
      `Generated: ${new Date().toISOString()}`,
      `CSV: reports/teacher-school-report-hebrew-context-map.csv`,
      `Rows processed: ${outRows.length}`,
      `Confidence high: ${confidenceCounts.high}`,
      `Confidence medium: ${confidenceCounts.medium}`,
      `Confidence low: ${confidenceCounts.low}`,
      `Needs full report (צריך לבדוק בדוח מלא): ${needsFullCount}`,
      "",
      "Top unclear / medium-confidence rows:",
      ...unclear.slice(0, 20).map(
        (u) => `- row ${u.row_number} ${u.id} [${u.confidence}]: «${u.phrase}» (${u.reason})`
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
        unclearTop20: unclear.slice(0, 20),
      },
      null,
      2
    )
  );
}

main();
