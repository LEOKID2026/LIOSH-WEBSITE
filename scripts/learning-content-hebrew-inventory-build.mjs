/**
 * Build Hebrew learning-content inventory workbook (read-only scan).
 * Run: node scripts/learning-content-hebrew-inventory-build.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const HEBREW_RE = /[\u0590-\u05FF]/;

const SCAN_ROOTS = [
  "pages/learning/hebrew-master.js",
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/english-master.js",
  "pages/learning/science-master.js",
  "pages/learning/moledet-geography-master.js",
  "pages/learning/curriculum.js",
  "pages/learning/geometry-curriculum.js",
  "pages/learning/index.js",
  "pages/student/activity",
  "components/learning",
  "components/student",
  "lib/classroom-activities",
  "lib/learning",
  "utils/hebrew-question-generator.js",
  "utils/hebrew-rich-question-bank.js",
  "utils/hebrew-constants.js",
  "utils/hebrew-explanations.js",
  "utils/hebrew-legacy-metadata.js",
  "utils/hebrew-g1-subtopic.js",
  "utils/hebrew-g2-subtopic.js",
  "utils/hebrew-g3456-subtopic.js",
  "utils/math-question-generator.js",
  "utils/math-constants.js",
  "utils/math-explanations.js",
  "utils/math-animations.js",
  "utils/geometry-question-generator.js",
  "utils/geometry-constants.js",
  "utils/geometry-explanations.js",
  "utils/geometry-conceptual-bank.js",
  "utils/geometry-probe-bank.js",
  "utils/geometry-activity-question-stem.js",
  "utils/english-question-generator.js",
  "utils/moledet-geography-question-generator.js",
  "utils/moledet-geography-constants.js",
  "utils/moledet-geography-explanations.js",
  "utils/science-curriculum-helpers.js",
  "utils/student-question-display.js",
  "utils/student-question-stem-sanitizer.js",
  "utils/learning-ui-classes.js",
  "utils/learning-question-font.js",
  "utils/diagnostic-labels-he.js",
  "utils/curriculum-audit/israeli-primary-curriculum-map.js",
  "data/hebrew-curriculum.js",
  "data/hebrew-g1-content-map.js",
  "data/hebrew-g2-content-map.js",
  "data/hebrew-g3-content-map.js",
  "data/hebrew-g4-content-map.js",
  "data/hebrew-g5-content-map.js",
  "data/hebrew-g6-content-map.js",
  "data/hebrew-g3-reading-bank.js",
  "data/hebrew-questions",
  "data/science-questions.js",
  "data/science-questions-phase3.js",
  "data/science-questions-phase4b1.js",
  "data/science-questions-closure-fill.js",
  "data/science-questions-production-batch1.js",
  "data/science-questions-p0-g123-fill.js",
  "data/science-questions-p1-g456-fill.js",
  "data/science-questions-needs-more-volume.js",
  "data/science-questions-g3-body-bank.js",
  "data/science-curriculum.js",
  "data/english-curriculum.js",
  "data/english-questions",
  "data/geography-questions",
  "data/moledet-geography-curriculum.js",
  "data/curriculum-spine/v1/skills.json",
];

const SKIP_DIR_PARTS = new Set([
  "review-packages",
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "games",
  "arcade",
]);

const EXCLUDE_PATH_RE = [
  /parent-report/i,
  /pages\/learning\/dev/i,
  /pages\/student\/games/i,
  /pages\/student\/arcade/i,
  /live.?audio/i,
  /teacher-live-classroom/i,
  /help-center/i,
  /data\/legal/i,
  /data\/reward-options/i,
  /topic-next-step/i,
  /learning-patterns-analysis/i,
  /parent-copilot/i,
  /parent-report-language/i,
  /\.cursor\//,
  /docs\//,
];

const SUBJECT_FROM_PATH = [
  [/hebrew/i, "hebrew"],
  [/math/i, "math"],
  [/geometry/i, "geometry"],
  [/english/i, "english"],
  [/science/i, "science"],
  [/moledet|geography/i, "moledet-geography"],
  [/classroom-activit/i, "classroom-activity"],
];

const GRADE_FROM_PATH = [
  [/g([1-6])\b/i, (m) => Number(m[1])],
  [/grade[_-]?([1-6])/i, (m) => Number(m[1])],
  [/כיתה\s*([א-ו])/u, (m) => ({ א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6 }[m[1]] || "")],
];

function collectFiles(relPath) {
  const abs = join(ROOT, relPath);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return [];
  }
  if (st.isFile()) {
    if (!/\.(js|jsx|mjs|json)$/i.test(relPath)) return [];
    return [relPath.replace(/\\/g, "/")];
  }
  if (!st.isDirectory()) return [];
  const out = [];
  for (const name of readdirSync(abs)) {
    if (name.startsWith(".") || SKIP_DIR_PARTS.has(name)) continue;
    out.push(...collectFiles(join(relPath, name).replace(/\\/g, "/")));
  }
  return out;
}

function shouldExclude(rel) {
  return EXCLUDE_PATH_RE.some((re) => re.test(rel));
}

function inferSubject(rel, line = "", topic = "") {
  for (const [re, subj] of SUBJECT_FROM_PATH) {
    if (re.test(rel) || re.test(line) || re.test(topic)) return subj;
  }
  if (/curriculum-spine/.test(rel)) return "cross-subject";
  return "";
}

function inferGrade(rel, line = "") {
  for (const [re, fn] of GRADE_FROM_PATH) {
    const m = rel.match(re) || line.match(re);
    if (m) {
      const v = typeof fn === "function" ? fn(m) : fn;
      if (v) return v;
    }
  }
  const gMatch = line.match(/grades?\s*:\s*\[?\s*"?g?([1-6])/i);
  if (gMatch) return Number(gMatch[1]);
  return "";
}

function inferLevel(line, text) {
  const t = `${line} ${text}`.toLowerCase();
  if (/\bhard\b|קשה/.test(t)) return "hard";
  if (/\bmedium\b|בינוני/.test(t)) return "medium";
  if (/\beasy\b|קל/.test(t)) return "easy";
  return "";
}

function inferTopic(rel, line) {
  const topicMatch =
    line.match(/topic\s*[:=]\s*["']([^"']+)["']/) ||
    line.match(/subtopic\s*[:=]\s*["']([^"']+)["']/) ||
    rel.match(/\/(reading|comprehension|writing|grammar|vocabulary|speaking|body|plants|water|fractions|geometry)\b/i);
  return topicMatch ? topicMatch[1] || topicMatch[0] : "";
}

function isCommentOrJSDoc(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("*/");
}

function enclosingFunction(lines, lineIdx) {
  for (let i = lineIdx; i >= Math.max(0, lineIdx - 80); i--) {
    const m =
      lines[i].match(/^\s*export\s+(?:async\s+)?function\s+(\w+)/) ||
      lines[i].match(/^\s*function\s+(\w+)/) ||
      lines[i].match(/^\s*export\s+const\s+(\w+)\s*=/) ||
      lines[i].match(/^\s*const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (m) return m[1];
  }
  return "";
}

function classifyContentType(rel, line, text, fn) {
  const ctx = `${line} ${fn}`.toLowerCase();
  const t = text.trim();
  if (/gethint|hint\s*[:=]|רמז/.test(ctx) && !/hintused|hintcount/i.test(ctx)) return "hint";
  if (/getsolutionsteps|solutionsteps|full_solution|פתרון צעד/.test(ctx)) return "full_solution";
  if (/workedexample|דוגמה/.test(ctx)) return "worked_example";
  if (/feedbacktext|feedback\.includes|לא נכון|נכון!|כל הכבוד/.test(ctx)) {
    return /לא נכון|wrong|❌/.test(t) || /לא נכון/.test(line) ? "feedback_wrong" : "feedback_correct";
  }
  if (/explanationhe|explanation\s*[:=]|theorylines|geterrorexplanation/.test(ctx)) return "explanation";
  if (/answers\s*:|options\s*:|option_text/.test(ctx)) return "answer_option";
  if (/question\s*:|stem\s*:|exercisetext\s*:/.test(ctx) || fn === "generateQuestion") {
    if (/שגיאה|אין שאלות|אין נושאים|נסה שוב|לא תקין/.test(t)) return "fallback_question";
    return "question_stem";
  }
  if (/instruction|הוראות|activity_instruction|formatstudentactivity/.test(ctx)) return "activity_instruction";
  if (/TOPICS|LEVELS|GRADE_LEVELS|name\s*:|description\s*:/.test(line) && /name|description|label/.test(ctx)) {
    if (/קל|בינוני|קשה|level/.test(ctx)) return "level_label";
    if (/skill|grammar|vocabulary|focus|skills/.test(ctx)) return "skill_label";
    return "topic_label";
  }
  if (/\$\{/.test(t)) return "generator_template";
  if (/נסה שוב|שגיאה ביצירת|אין שאלות|אין נושאים/.test(t)) return "fallback_question";
  if (/נסה|כל הכבוד|המשיכו|סיימת|ענית נכון/.test(t)) return "feedback_correct";
  return "other";
}

function classifyVisibility(rel, line, text, fn, contentType) {
  if (isCommentOrJSDoc(line)) {
    return { visibility: "internal_only", reason: "Comment/JSDoc — not rendered" };
  }
  if (/data\/hebrew-questions\//.test(rel)) {
    return { visibility: "internal_only", reason: "Hebrew archive bank — not wired to runtime generateQuestion" };
  }
  if (/curriculum-spine\/v1\/skills\.json/.test(rel) && !/displayName|labelHe/.test(line)) {
    return { visibility: "needs_review", reason: "Spine metadata — may feed labels indirectly" };
  }
  if (/hebrew-g[1-6]-content-map/.test(rel)) {
    return { visibility: "internal_only", reason: "Content map weights/IDs — English keys, not student-facing copy" };
  }
  if (/teacher-preview|TeacherGrading|teacher-portal/.test(rel)) {
    return { visibility: "teacher_preview_visible", reason: "Teacher review surface" };
  }
  if (/classroom-activit|student\/activity/.test(rel)) {
    return { visibility: "student_visible", reason: "Classroom activity student flow" };
  }
  if (
    /-master\.js$/.test(rel) ||
    /-question-generator/.test(rel) ||
    /-explanations/.test(rel) ||
    /data\/(science|geography|english|hebrew)-/.test(rel) ||
    /hebrew-rich-question-bank/.test(rel) ||
    /geometry-conceptual-bank/.test(rel) ||
    contentType.startsWith("question_") ||
    ["question_stem", "answer_option", "hint", "explanation", "feedback_correct", "feedback_wrong", "full_solution"].includes(
      contentType
    )
  ) {
    return { visibility: "student_visible", reason: "Learning question/feedback render path" };
  }
  if (/curriculum\.js$/.test(rel) || /-constants\.js$/.test(rel)) {
    return { visibility: "student_visible", reason: "Curriculum/topic labels shown in learning UI" };
  }
  if (fn && /export|report|audit|guard|normalize/i.test(fn)) {
    return { visibility: "needs_review", reason: `Function ${fn} — verify render path` };
  }
  return { visibility: "needs_review", reason: "Source may feed learning UI — confirm render path" };
}

function detectRisks(text, contentType, subject) {
  const risks = [];
  const t = String(text || "");
  if (/__[A-Z_]+__|\$\{[a-zA-Z_]+\}|TODO|FIXME|\[נושא\]|\[ערך\]/.test(t)) {
    risks.push({ category: "raw_key_or_placeholder", why: "Contains placeholder or template variable", severity: "high" });
  }
  if (/[a-zA-Z]{4,}/.test(t) && !/^(mcq|g[1-6]|xp|badges?)$/i.test(t) && HEBREW_RE.test(t)) {
    if (!/×|÷|cm|mm|km|°|PDF|XP|Badges/i.test(t)) {
      risks.push({ category: "mixed_hebrew_english", why: "Mixed Hebrew and Latin script in student copy", severity: "medium" });
    }
  }
  if (/שגיאה ביצירת|אין שאלות זמינות|אין נושאים זמינים/.test(t)) {
    risks.push({ category: "unclear_instruction", why: "Error/fallback message shown to students", severity: "medium" });
  }
  if (contentType === "question_stem" && /^(חשבו|פתרו|השלם|מצאו|בחרו)\.?$/u.test(t.trim())) {
    risks.push({ category: "duplicate_or_repetitive", why: "Generic meta stem without exercise body", severity: "medium" });
  }
  if (contentType === "answer_option") {
    const opts = t.split("|");
    if (opts.length > 1) {
      const lens = opts.map((o) => o.length);
      if (Math.max(...lens) > Math.min(...lens) * 2.5) {
        risks.push({ category: "answer_length_cue", why: "Answer options vary greatly in length", severity: "low" });
      }
    }
  }
  if (/😔|❌|טיפש|מגוחך|כישלון/.test(t)) {
    risks.push({
      category: "potentially_sensitive_or_discouraging_feedback",
      why: "Harsh or discouraging feedback tone",
      severity: "high",
    });
  }
  if (subject === "english" && contentType === "question_stem" && !HEBREW_RE.test(t)) {
    risks.push({ category: "english_learning_term_issue", why: "English stem — verify Hebrew explanation pairing", severity: "low" });
  }
  if (/חציבסיס|בסיס×|אורך×/.test(t)) {
    risks.push({ category: "confusing_ltr_rtl_mix", why: "Formula tokens may render poorly in RTL", severity: "medium" });
  }
  if (/\?\s*\(רמז:|רמז:\s*\d/.test(t)) {
    risks.push({ category: "gives_answer_away", why: "Stem may include hint that reveals answer", severity: "high" });
  }
  if (t.length > 220 && ["question_stem", "instruction", "activity_instruction"].includes(contentType)) {
    risks.push({ category: "too_long_for_student", why: "Very long instructional text for student UI", severity: "low" });
  }
  return risks;
}

function problemTypeFromRisks(risks) {
  return risks[0]?.category || "";
}

function severityFromRisks(risks) {
  const rank = { high: 0, medium: 1, low: 2 };
  const sorted = [...risks].sort((a, b) => (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9));
  return sorted[0]?.severity || "";
}

function extractStringsFromLine(line) {
  const results = [];
  for (const re of [/"([^"\\]*(?:\\.[^"\\]*)*)"/g, /'([^'\\]*(?:\\.[^'\\]*)*)'/g, /`([^`\\]*(?:\\.[^`\\]*)*)`/g]) {
    let m;
    while ((m = re.exec(line))) {
      if (HEBREW_RE.test(m[1])) results.push({ text: m[1] });
    }
  }
  const jsxRe = />([^<>{}]*[\u0590-\u05FF][^<>{}]*)</g;
  let jm;
  while ((jm = jsxRe.exec(line))) {
    const raw = jm[1].trim();
    if (raw && HEBREW_RE.test(raw)) results.push({ text: raw });
  }
  return results;
}

function substitutePlaceholders(text) {
  return String(text || "")
    .replace(/\$\{[^}]+\}/g, "…")
    .replace(/__+/g, "…")
    .trim();
}

function dedupeKey(file, line, text, contentType) {
  return `${file}:${line}:${contentType}:${text.slice(0, 120)}`;
}

function sheetFromObjects(rows, columns) {
  return [columns, ...rows.map((row) => columns.map((c) => row[c] ?? ""))];
}

function appendSheet(wb, name, rows, columns) {
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetFromObjects(rows, columns)), name);
}

// --- Scan source files ---
const files = [...new Set(SCAN_ROOTS.flatMap(collectFiles))].filter((f) => !shouldExclude(f)).sort();
const allEntries = [];
const seen = new Set();
let idSeq = 0;

for (const rel of files) {
  const content = readFileSync(join(ROOT, rel), "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fn = enclosingFunction(lines, i);
    for (const hit of extractStringsFromLine(line)) {
      if (!HEBREW_RE.test(hit.text)) continue;
      const contentType = classifyContentType(rel, line, hit.text, fn);
      const key = dedupeKey(rel, i + 1, hit.text, contentType);
      if (seen.has(key)) continue;
      seen.add(key);
      const subject = inferSubject(rel, line);
      const grade = inferGrade(rel, line);
      const level = inferLevel(line, hit.text);
      const topic = inferTopic(rel, line);
      const { visibility, reason } = classifyVisibility(rel, line, hit.text, fn, contentType);
      const risks = detectRisks(hit.text, contentType, subject);
      const isTemplate = /\$\{/.test(hit.text);
      allEntries.push({
        id: `LC-HE-${String(++idSeq).padStart(5, "0")}`,
        file: rel,
        function: fn,
        line: i + 1,
        subject,
        grade,
        level,
        topic,
        content_type: contentType,
        current_hebrew: hit.text,
        example_output: substitutePlaceholders(hit.text),
        visibility,
        problem_type: problemTypeFromRisks(risks),
        severity: severityFromRisks(risks),
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        notes: reason,
        is_template: isTemplate,
        risks,
      });
    }
  }
}

// --- Structured question bank rows ---
let bankRows = [];
try {
  const { buildRowsForCurriculumInventory } = await import(u("scripts/audit-question-banks.mjs"));
  bankRows = buildRowsForCurriculumInventory();
} catch (e) {
  console.warn("Could not load audit question banks:", e.message);
}

for (const row of bankRows) {
  const subject = row.subject === "geography" ? "moledet-geography" : row.subject || "";
  const stem = String(row.stemText || "").trim();
  if (stem && HEBREW_RE.test(stem)) {
    const contentType = "question_stem";
    const key = `bank:${row.sourceFile}:${row.poolKey}:${stem.slice(0, 80)}`;
    if (!seen.has(key)) {
      seen.add(key);
      const risks = detectRisks(stem, contentType, subject);
      allEntries.push({
        id: `LC-HE-${String(++idSeq).padStart(5, "0")}`,
        file: row.sourceFile || "",
        function: row.rowKind || "bank_item",
        line: "",
        subject,
        grade: row.minGrade || "",
        level: row.difficulty || "",
        topic: row.topic || "",
        subtopic: row.subtopic || row.subtype || "",
        content_type: contentType,
        current_hebrew: stem,
        example_output: substitutePlaceholders(stem),
        visibility: "student_visible",
        problem_type: problemTypeFromRisks(risks),
        severity: severityFromRisks(risks),
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        notes: `Bank item (${row.rowKind})`,
        is_template: false,
        risks,
      });
    }
  }
}

// --- Science questions direct import for explanations/options ---
try {
  const { SCIENCE_QUESTIONS } = await import(u("data/science-questions.js"));
  for (const q of SCIENCE_QUESTIONS || []) {
    const stem = String(q.stem || q.question || "").trim();
    const grade = Array.isArray(q.grades) ? Number(String(q.grades[0]).replace(/\D/g, "")) || "" : "";
    const topic = q.topic || "";
    const fields = [
      ["question_stem", stem],
      ["explanation", String(q.explanation || "").trim()],
      ...(Array.isArray(q.theoryLines) ? q.theoryLines.map((l) => ["explanation", String(l).trim()]) : []),
      ...(Array.isArray(q.options) ? q.options.map((o) => ["answer_option", String(o).trim()]) : []),
    ];
    for (const [contentType, text] of fields) {
      if (!text || !HEBREW_RE.test(text)) continue;
      const key = `science:${q.id}:${contentType}:${text.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const risks = detectRisks(text, contentType, "science");
      allEntries.push({
        id: `LC-HE-${String(++idSeq).padStart(5, "0")}`,
        file: "data/science-questions.js",
        function: q.id || "SCIENCE_QUESTIONS",
        line: "",
        subject: "science",
        grade,
        level: q.minLevel || q.maxLevel || "",
        topic,
        content_type: contentType,
        current_hebrew: text,
        example_output: substitutePlaceholders(text),
        visibility: "student_visible",
        problem_type: problemTypeFromRisks(risks),
        severity: severityFromRisks(risks),
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        notes: `Science bank item ${q.id || ""}`,
        is_template: false,
        risks,
      });
    }
  }
} catch (e) {
  console.warn("Could not import science questions:", e.message);
}

// --- Partition sheets ---
const questionStems = allEntries.filter((e) => e.content_type === "question_stem" || e.content_type === "fallback_question");
const answerOptions = allEntries.filter((e) => e.content_type === "answer_option");
const hintsExplanations = allEntries.filter((e) =>
  ["hint", "explanation", "full_solution", "worked_example", "feedback_correct", "feedback_wrong"].includes(e.content_type)
);
const studentFeedback = allEntries.filter(
  (e) =>
    ["feedback_correct", "feedback_wrong", "other"].includes(e.content_type) &&
    /נסה|כל הכבוד|לא נכון|נכון|המשיכו|סיימת|ענית|רצף|הגעת|אתגר/.test(e.current_hebrew)
);
const curriculumLabels = allEntries.filter((e) =>
  ["topic_label", "skill_label", "level_label"].includes(e.content_type)
);
const dynamicTemplates = allEntries.filter((e) => e.is_template || e.content_type === "generator_template");
const studentVisible = allEntries.filter((e) => e.visibility === "student_visible");
const teacherPreview = allEntries.filter((e) => e.visibility === "teacher_preview_visible");
const needsReview = allEntries.filter((e) => e.visibility === "needs_review");

const riskFlags = [];
for (const e of allEntries) {
  for (const r of e.risks || []) {
    riskFlags.push({
      id: e.id,
      file: e.file,
      line: e.line,
      subject: e.subject,
      grade: e.grade,
      topic: e.topic,
      current_hebrew: e.current_hebrew,
      risk_category: r.category,
      why_flagged: r.why,
      severity: r.severity,
      suggested_replacement: "",
      status: "pending_owner_review",
    });
  }
}

// --- Scenario samples ---
const scenarioRows = [];
let scenarioSeq = 0;

function addScenario(subject, grade, level, topic, route, q) {
  if (!q) return;
  const stem = String(q.question || q.stem || q.exerciseText || "").trim();
  const options = (q.answers || q.options || []).join(" | ");
  const correctIdx = q.correct ?? q.correctIndex ?? "";
  const correct =
    correctIdx !== "" && Array.isArray(q.answers || q.options)
      ? (q.answers || q.options)[correctIdx] || ""
      : q.correctAnswer || "";
  scenarioRows.push({
    scenario_id: `SC-${String(++scenarioSeq).padStart(4, "0")}`,
    subject,
    grade,
    level,
    topic,
    route_or_generator: route,
    question_stem: stem.slice(0, 500),
    options: options.slice(0, 500),
    hint: String(q.hint || "").slice(0, 300),
    explanation: String(q.explanation || q.explanationHe || "").slice(0, 500),
    feedback_correct: "",
    feedback_wrong: "",
    flagged_terms: detectRisks(stem, "question_stem", subject)
      .map((r) => r.category)
      .join(", "),
    notes: correct ? `correct_answer_internal: ${String(correct).slice(0, 80)}` : "",
  });
}

const subjects = [
  ["hebrew", "utils/hebrew-question-generator.js", "generateQuestion"],
  ["math", "utils/math-question-generator.js", "generateQuestion"],
  ["geometry", "utils/geometry-question-generator.js", "generateQuestion"],
  ["english", "utils/english-question-generator.js", "generateQuestion"],
  ["moledet-geography", "utils/moledet-geography-question-generator.js", "generateQuestion"],
];

const levelKeys = ["easy", "medium", "hard"];
const gradeKeys = ["g1", "g2", "g3", "g4", "g5", "g6"];

for (const [subject, modPath, fnName] of subjects) {
  try {
    const mod = await import(u(modPath));
    const gen = mod[fnName];
    if (typeof gen !== "function") continue;
    const topicsBySubject = {
      hebrew: ["reading", "comprehension", "grammar", "vocabulary", "writing"],
      math: ["addition", "subtraction", "multiplication", "fractions", "word_problems"],
      geometry: ["shapes", "area", "perimeter", "angles", "volume"],
      english: ["grammar", "translation", "sentence"],
      "moledet-geography": ["israel", "map", "climate", "settlements"],
    };
    const topics = topicsBySubject[subject] || ["mixed"];
    for (const gk of gradeKeys) {
      for (const lk of levelKeys) {
        const topic = topics[Number(gk.replace(/\D/g, "")) % topics.length] || topics[0];
        try {
          let q;
          if (subject === "hebrew") {
            q = gen(lk, topic, gk);
          } else if (subject === "math") {
            const { getLevelConfig } = await import(u("utils/math-storage.js"));
            q = gen(getLevelConfig(lk), topic, gk);
          } else if (subject === "geometry") {
            const { LEVELS } = await import(u("utils/geometry-constants.js"));
            q = gen(LEVELS[lk], topic, gk);
          } else if (subject === "english") {
            q = gen(lk, topic, gk);
          } else {
            const { LEVELS } = await import(u("utils/moledet-geography-constants.js"));
            q = gen(LEVELS[lk], topic, gk);
          }
          addScenario(subject, Number(gk.replace(/\D/g, "")), lk, topic, `${modPath}#${fnName}`, q);
        } catch {
          /* skip combo */
        }
      }
    }
  } catch (e) {
    console.warn(`Scenario sampling failed for ${subject}:`, e.message);
  }
}

// Science static sample
try {
  const { SCIENCE_QUESTIONS } = await import(u("data/science-questions.js"));
  const byGradeTopic = {};
  for (const q of SCIENCE_QUESTIONS || []) {
    const g = Array.isArray(q.grades) ? Number(String(q.grades[0]).replace(/\D/g, "")) : 1;
    const key = `${g}:${q.topic}`;
    if (!byGradeTopic[key]) byGradeTopic[key] = q;
  }
  for (const [key, q] of Object.entries(byGradeTopic)) {
    const [g, topic] = key.split(":");
    addScenario("science", Number(g), q.minLevel || "easy", topic, "data/science-questions.js", {
      question: q.stem,
      answers: q.options,
      correct: q.correctIndex,
      explanation: q.explanation,
    });
  }
} catch {
  /* skip */
}

// Owner review candidates — focused high-risk subset
const ownerCandidates = [...allEntries]
  .filter((e) => {
    if (e.severity === "high") return true;
    if (e.content_type === "fallback_question") return true;
    if (e.problem_type === "duplicate_or_repetitive") return true;
    if (e.problem_type === "gives_answer_away") return true;
    if (e.problem_type === "potentially_sensitive_or_discouraging_feedback") return true;
    if (e.problem_type === "raw_key_or_placeholder") return true;
    if (e.content_type === "activity_instruction" && e.severity) return true;
    return false;
  })
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  })
  .slice(0, 120)
  .map((e) => ({
    id: e.id,
    subject: e.subject,
    grade: e.grade,
    level: e.level,
    topic: e.topic,
    content_type: e.content_type,
    current_hebrew: e.current_hebrew,
    meaning_plain_he: "",
    example_before: e.example_output,
    risk: e.problem_type || e.severity,
    suggested_replacement: "",
    owner_approved_replacement: "",
    status: "pending_owner_review",
    source: `${e.file}:${e.line}`,
  }));

const topRisk = [...riskFlags]
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  })
  .slice(0, 30);

const summaryRows = [
  { metric: "generated_at", value: new Date().toISOString(), notes: "Read-only learning content inventory" },
  { metric: "files_scanned", value: files.length, notes: "" },
  { metric: "hebrew_learning_strings_templates", value: allEntries.length, notes: "Unique entries incl. bank rows" },
  { metric: "student_visible", value: studentVisible.length, notes: "" },
  { metric: "teacher_preview_visible", value: teacherPreview.length, notes: "" },
  { metric: "needs_review", value: needsReview.length, notes: "" },
  { metric: "question_stems", value: questionStems.length, notes: "incl. fallback_question" },
  { metric: "answer_options", value: answerOptions.length, notes: "" },
  { metric: "hints_explanations_solutions", value: hintsExplanations.length, notes: "" },
  { metric: "student_feedback_strings", value: studentFeedback.length, notes: "" },
  { metric: "curriculum_topic_skill_labels", value: curriculumLabels.length, notes: "" },
  { metric: "dynamic_templates", value: dynamicTemplates.length, notes: "" },
  { metric: "rendered_scenario_samples", value: scenarioRows.length, notes: "" },
  { metric: "owner_review_candidates", value: ownerCandidates.length, notes: "Focused first-pass subset" },
  { metric: "risk_flags", value: riskFlags.length, notes: "" },
  { metric: "code_changed", value: "no", notes: "Inventory generator only" },
];

const wb = XLSX.utils.book_new();
appendSheet(wb, "Summary", summaryRows, ["metric", "value", "notes"]);
appendSheet(
  wb,
  "Learning Content Strings",
  allEntries,
  [
    "id",
    "file",
    "function",
    "line",
    "subject",
    "grade",
    "level",
    "topic",
    "subtopic",
    "content_type",
    "current_hebrew",
    "example_output",
    "visibility",
    "problem_type",
    "severity",
    "suggested_replacement",
    "owner_approved_replacement",
    "status",
    "notes",
  ]
);
appendSheet(
  wb,
  "Question Stems",
  questionStems.map((e) => ({
    ...e,
    question_type: e.content_type === "fallback_question" ? "fallback" : "mcq_or_generated",
    risk: e.problem_type,
  })),
  [
    "id",
    "file",
    "function",
    "line",
    "subject",
    "grade",
    "level",
    "topic",
    "current_hebrew",
    "example_output",
    "question_type",
    "risk",
    "suggested_replacement",
    "status",
  ]
);
appendSheet(wb, "Answer Options", answerOptions, [
  "id",
  "file",
  "function",
  "line",
  "subject",
  "grade",
  "level",
  "topic",
  "option_text",
  "example_output",
  "risk",
  "suggested_replacement",
  "status",
].map((c) => (c === "option_text" ? c : c)).reduce((cols, c) => {
  if (c === "option_text") return [...cols, c];
  return cols.includes(c) ? cols : [...cols, c];
}, []));
// Fix answer options mapping
const answerOptionRows = answerOptions.map((e) => ({
  id: e.id,
  file: e.file,
  function: e.function,
  line: e.line,
  subject: e.subject,
  grade: e.grade,
  level: e.level,
  topic: e.topic,
  option_text: e.current_hebrew,
  example_output: e.example_output,
  risk: e.problem_type,
  suggested_replacement: "",
  status: e.status,
}));
wb.Sheets["Answer Options"] = XLSX.utils.aoa_to_sheet(
  sheetFromObjects(answerOptionRows, [
    "id",
    "file",
    "function",
    "line",
    "subject",
    "grade",
    "level",
    "topic",
    "option_text",
    "example_output",
    "risk",
    "suggested_replacement",
    "status",
  ])
);

appendSheet(
  wb,
  "Hints Explanations Solutions",
  hintsExplanations.map((e) => ({
    ...e,
    explanation_type:
      e.content_type === "hint"
        ? "hint"
        : e.content_type === "full_solution"
          ? "solution_steps"
          : e.content_type === "worked_example"
            ? "worked_example"
            : e.content_type.startsWith("feedback")
              ? "feedback"
              : "short_explanation",
    risk: e.problem_type,
  })),
  [
    "id",
    "file",
    "function",
    "line",
    "subject",
    "grade",
    "level",
    "topic",
    "explanation_type",
    "current_hebrew",
    "example_output",
    "risk",
    "suggested_replacement",
    "status",
  ]
);
appendSheet(
  wb,
  "Student Feedback Encouragement",
  studentFeedback.map((e) => ({
    ...e,
    feedback_type: /לא נכון|wrong/i.test(e.current_hebrew)
      ? "wrong"
      : /נסה שוב|נסו שוב/i.test(e.current_hebrew)
        ? "retry"
        : /כל הכבוד|רצף/i.test(e.current_hebrew)
          ? "encouragement"
          : /סיימת|הושלם|הגעת/i.test(e.current_hebrew)
            ? "completion"
            : /המשיכו|הבא/i.test(e.current_hebrew)
              ? "next_step"
              : /נכון/i.test(e.current_hebrew)
                ? "correct"
                : "progress",
    tone_risk: e.problem_type,
  })),
  [
    "id",
    "file",
    "function",
    "line",
    "subject",
    "grade",
    "level",
    "current_hebrew",
    "example_output",
    "feedback_type",
    "tone_risk",
    "suggested_replacement",
    "status",
  ]
);
appendSheet(
  wb,
  "Curriculum Topic Skill Labels",
  curriculumLabels.map((e) => ({
    id: e.id,
    file: e.file,
    line: e.line,
    subject: e.subject,
    grade: e.grade,
    topic: e.topic,
    subtopic: e.subtopic || "",
    skill_key: "",
    displayed_hebrew: e.current_hebrew,
    raw_key_if_any: "",
    risk: e.problem_type,
    suggested_replacement: "",
    status: e.status,
  })),
  [
    "id",
    "file",
    "line",
    "subject",
    "grade",
    "topic",
    "subtopic",
    "skill_key",
    "displayed_hebrew",
    "raw_key_if_any",
    "risk",
    "suggested_replacement",
    "status",
  ]
);
appendSheet(
  wb,
  "Dynamic Templates",
  dynamicTemplates.map((e) => ({
    id: e.id,
    file: e.file,
    function: e.function,
    line: e.line,
    subject: e.subject,
    grade: e.grade,
    topic: e.topic,
    template: e.current_hebrew,
    variables: (e.current_hebrew.match(/\$\{[^}]+\}/g) || []).join(", "),
    example_output: e.example_output,
    risk: e.problem_type || "template_variability",
    suggested_replacement: "",
    status: e.status,
  })),
  [
    "id",
    "file",
    "function",
    "line",
    "subject",
    "grade",
    "topic",
    "template",
    "variables",
    "example_output",
    "risk",
    "suggested_replacement",
    "status",
  ]
);
appendSheet(wb, "Quality Risk Flags", riskFlags, [
  "id",
  "file",
  "line",
  "subject",
  "grade",
  "topic",
  "current_hebrew",
  "risk_category",
  "why_flagged",
  "severity",
  "suggested_replacement",
  "status",
]);
appendSheet(wb, "Rendered Scenario Samples", scenarioRows, [
  "scenario_id",
  "subject",
  "grade",
  "level",
  "topic",
  "route_or_generator",
  "question_stem",
  "options",
  "hint",
  "explanation",
  "feedback_correct",
  "feedback_wrong",
  "flagged_terms",
  "notes",
]);
appendSheet(wb, "Owner Review Candidates", ownerCandidates, [
  "id",
  "subject",
  "grade",
  "level",
  "topic",
  "content_type",
  "current_hebrew",
  "meaning_plain_he",
  "example_before",
  "risk",
  "suggested_replacement",
  "owner_approved_replacement",
  "status",
  "source",
]);

const outDir = join(ROOT, "reports");
mkdirSync(outDir, { recursive: true });
const xlsxPath = join(outDir, "learning-content-hebrew-inventory.xlsx");
XLSX.writeFile(wb, xlsxPath);

const md = `# Hebrew Learning Content Inventory — Summary

Generated: ${new Date().toISOString()}

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | ${files.length} |
| Hebrew learning strings/templates | ${allEntries.length} |
| Student-visible | ${studentVisible.length} |
| Teacher-preview-visible | ${teacherPreview.length} |
| Needs review | ${needsReview.length} |
| Question stems | ${questionStems.length} |
| Answer options | ${answerOptions.length} |
| Hints/explanations/solutions | ${hintsExplanations.length} |
| Student feedback strings | ${studentFeedback.length} |
| Curriculum/topic/skill labels | ${curriculumLabels.length} |
| Dynamic templates | ${dynamicTemplates.length} |
| Rendered scenario samples | ${scenarioRows.length} |
| Owner review candidates | ${ownerCandidates.length} |
| Risk flags | ${riskFlags.length} |

## Top 30 highest-risk learning-content phrases

${topRisk.map((e, i) => `${i + 1}. **${e.severity}** [${e.risk_category}] — \`${String(e.current_hebrew).slice(0, 100)}${String(e.current_hebrew).length > 100 ? "…" : ""}\` (${e.file}:${e.line})`).join("\n")}

## Scope

Learning content across subjects (math, geometry, Hebrew, English, science, moledet-geography), question banks, generators, hints/explanations, classroom activities, and curriculum labels.

Excluded: parent reports, teacher/school reports, site decision copy, games/arcade, live classroom/audio, review-packages.

## Files scanned (${files.length})

${files.map((f) => `- ${f}`).join("\n")}

## Notes

- No product source code was modified.
- \`suggested_replacement\` and \`owner_approved_replacement\` columns are empty — pending owner review.
- Hebrew archive \`data/hebrew-questions/*\` scanned but marked internal_only (not runtime).
- Excel: \`reports/learning-content-hebrew-inventory.xlsx\`
`;

const mdPath = join(outDir, "learning-content-hebrew-inventory-summary.md");
writeFileSync(mdPath, md, "utf8");

console.log(
  JSON.stringify(
    {
      xlsxPath: relative(ROOT, xlsxPath),
      mdPath: relative(ROOT, mdPath),
      filesScanned: files.length,
      totalEntries: allEntries.length,
      studentVisible: studentVisible.length,
      teacherPreview: teacherPreview.length,
      needsReview: needsReview.length,
      questionStems: questionStems.length,
      answerOptions: answerOptions.length,
      hintsExplanations: hintsExplanations.length,
      studentFeedback: studentFeedback.length,
      curriculumLabels: curriculumLabels.length,
      scenarioSamples: scenarioRows.length,
      ownerCandidates: ownerCandidates.length,
      topRiskCount: topRisk.length,
    },
    null,
    2
  )
);
