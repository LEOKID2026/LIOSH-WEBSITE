/**
 * Build site-wide Hebrew decision-copy inventory (read-only scan).
 * Run: node scripts/site-decision-hebrew-copy-inventory-build.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const HEBREW_RE = /[\u0590-\u05FF]/;

const SCAN_ROOTS = [
  "utils/parent-copilot",
  "utils/parent-report-ai",
  "components/parent-copilot",
  "lib/parent-copilot",
  "pages/api/parent",
  "utils/fast-diagnostic-engine",
  "utils/diagnostic-labels-he.js",
  "utils/diagnostic-mistake-metadata.js",
  "utils/diagnostic-question-contract.js",
  "utils/topic-next-step-engine.js",
  "utils/topic-next-step-phase2.js",
  "utils/learning-patterns-analysis.js",
  "lib/classroom-activities",
  "lib/guardian-server",
  "lib/teacher-server/teacher-activities.server.js",
  "lib/teacher-server/teacher-guidance-v2.server.js",
  "lib/teacher-server/teacher-recommendations.server.js",
  "lib/teacher-server/student-activity.server.js",
  "lib/teacher-server/student-activity-play.server.js",
  "lib/platform-ui/hebrew-display-labels.js",
  "pages/teacher/class",
  "pages/teacher/students",
  "pages/api/teacher/activities",
  "pages/api/teacher/students",
  "pages/api/school",
  "pages/api/guardian",
  "pages/student/activity",
  "pages/student/home.js",
  "pages/student/worksheet",
  "pages/learning/math-master.js",
  "pages/learning/geometry-master.js",
  "pages/learning/english-master.js",
  "pages/learning/hebrew-master.js",
  "pages/learning/science-master.js",
  "pages/learning/moledet-geography-master.js",
  "pages/learning/index.js",
  "pages/learning/curriculum.js",
  "components/teacher-portal/TeacherDiscussionQuestionPicker.jsx",
  "components/teacher-portal/TeacherStudentIndividualActivitiesPanel.jsx",
  "components/teacher-portal/TeacherActivityStudentAnswersModal.jsx",
  "utils/contracts/narrative-contract-v1.js",
  "utils/parent-report-language/forbidden-terms.js",
];

const SKIP_DIR_PARTS = new Set([
  "review-packages",
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "_qa-transfer",
  "games",
]);

const EXCLUDE_PATH_RE = [
  /parent-report-detailed/i,
  /pages\/learning\/parent-report/i,
  /components\/parent-report/i,
  /components\/parent\//,
  /utils\/detailed-parent-report/i,
  /utils\/detailed-report-parent-letter/i,
  /utils\/parent-report-v2\.js$/,
  /utils\/parent-report-ui-explain-he/i,
  /utils\/parent-report-row-diagnostics/i,
  /utils\/parent-data-presence/i,
  /utils\/parent-report-language\/(?!forbidden)/,
  /lib\/parent-server\/parent-report/i,
  /TeacherClassReportModal/i,
  /SchoolReportModal/i,
  /TeacherDashboardClient/i,
  /teacher-class-report\.server/i,
  /teacher-report\.server/i,
  /school-reports\.server/i,
  /school-report-view-model/i,
  /school-physical-class-report/i,
  /teacher-ui\.he\.js$/,
  /school-ui\.he\.js$/,
  /teacher-activity-report-export/i,
  /teacher-live-classroom/i,
  /live.?audio/i,
  /pages\/student\/games/i,
  /pages\/student\/arcade/i,
  /\.cursor\//,
  /docs\//,
  /scripts\//,
  /tests\//,
  /selftest/i,
  /smoke\.mjs$/,
];

const FORCED_DECISION_PATH_RE =
  /parent-copilot|parent-report-ai|fast-diagnostic|topic-next-step|copilot-turn|guardrail|fallback-templates|llm-orchestrator|probe-map-he|student-activity-(error|result)-labels|classroom-activities-labels/i;

const NEUTRAL_EXACT = new Set([
  "חזור",
  "שמירה",
  "כניסה",
  "סגירה",
  "אישור",
  "ביטול",
  "הבא",
  "הקודם",
  "כן",
  "לא",
  "סגור",
  "רענון",
  "טוען…",
  "טוען...",
  "שם",
  "סיסמה",
  "אימייל",
]);

const DECISION_SIGNAL_RE =
  /אין מספיק|לא ניתן|אסור|הרשא|מומלץ|כדאי|המלצ|המשך|נסה|עבור ל|התקדם|רמה|קידום|ירידה|הצלח|טעות|דיוק|נתונים|אבחון|מנוע|סיכון|התערבות|ביטחון|confidence|severity|tier|insufficient|no_data|RI\d|מגמה|פער|נושא הבא|תרגול|חיזוק|חלש|חזק|דורש|כוונה|פעילות|דל|חלקי|מצומצם|לא היו|UUID|PIN|עזרה|מסייע|copilot|AI|בדוק|אמת|המשך|נסו|שגיאה|חסום|לא פעיל|לא זמין|validation|off.?topic|thin|partial|permission|denied|progress|level|topic|diagnostic|recommend|intervention|monitor|critical|on_track|reinforcement|weak|strong|feedback|הסבר|למה|איך|מה לעשות|צעד הבא|שאלה/i;

const RISKY_TERMS = [
  ["מנוע", "engine_reference", "no", "no", "no", "yes", "תאר מה המערכת אומרת בלי 'מנוע'"],
  ["אבחון", "diagnostic", "yes_if_explained", "yes_if_explained", "yes_if_explained", "yes_if_raw", "מותר אם ברור למשתמש"],
  ["סף", "threshold", "no", "no", "no", "yes", "החלף בניסוח על כמות נתונים"],
  ["מגמה", "trend", "yes", "yes", "no", "yes_if_unexplained", "לא מפתח trend"],
  ["פער ידע", "engine_jargon", "no", "no", "no", "yes", "החלף בנושאים לחיזוק"],
  ["ביטחון", "confidence", "no", "no", "no", "yes", "לא confidence גולמי"],
  ["confidence", "english_key", "no", "no", "no", "yes", "תרגום חובה"],
  ["severity", "english_key", "no", "no", "no", "yes", "תרגום חובה"],
  ["tier", "english_key", "no", "no", "no", "yes", "תרגום חובה"],
  ["insufficient_data", "english_key", "no", "no", "no", "yes", "תרגום חובה"],
  ["no_data", "english_key", "no", "no", "no", "yes", "תרגום חובה"],
  ["RI0", "progression_code", "no", "no", "no", "yes", "קוד פנימי"],
  ["RI1", "progression_code", "no", "no", "no", "yes", "קוד פנימי"],
  ["RI2", "progression_code", "no", "no", "no", "yes", "קוד פנימי"],
  ["קידום", "progression", "careful", "yes", "yes", "yes_if_unexplained", "רק עם הקשר והוכחה"],
  ["עלייה ברמה", "progression", "careful", "yes", "yes", "yes_if_unexplained", "רק עם הקשר"],
  ["ירידה", "progression", "careful", "yes", "no", "yes_if_unexplained", "הקשר נדרש"],
  ["מוכנות לשלב הבא", "progression", "no", "careful", "no", "yes", "ניסוח פנימי"],
  ["מסקנה חזקה", "engine_jargon", "no", "no", "no", "yes", "החלף בניסוח זהיר"],
  ["מסקנה חדה", "engine_jargon", "no", "no", "no", "yes", "החלף בניסוח זהיר"],
  ["אין מספיק נתונים", "thin_data", "yes", "yes", "yes", "no", "מותר אם ברור"],
  ["דל נתון", "thin_data", "yes", "yes", "no", "yes", "העדף ניסוח מפורש"],
  ["UUID", "technical", "no", "no", "no", "yes", "לא למשתמש"],
  ["PIN", "technical", "no", "no", "no", "yes", "לא למשתמש"],
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
    if (!/\.(js|jsx|mjs|ts|tsx)$/i.test(relPath)) return [];
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

function isCommentOrJSDoc(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("*/");
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

function isNeutralUILabel(text) {
  const t = String(text || "").trim();
  if (NEUTRAL_EXACT.has(t)) return true;
  if (t.length <= 3) return true;
  if (/^(כיתה|שכבה)\s+[א-ת״'׳0-9]+$/i.test(t)) return true;
  return false;
}

function isDecisionRelevant(rel, text, line) {
  if (FORCED_DECISION_PATH_RE.test(rel)) return !isNeutralUILabel(text);
  if (isNeutralUILabel(text)) return false;
  if (DECISION_SIGNAL_RE.test(text)) return true;
  if (DECISION_SIGNAL_RE.test(line)) return true;
  if (/pages\/api\//.test(rel) && /error|message|status|res\.json|validation/i.test(line)) {
    return DECISION_SIGNAL_RE.test(text) || text.length > 12;
  }
  return false;
}

function inferAudience(rel) {
  if (/parent-copilot|pages\/api\/parent|guardian/i.test(rel)) return "parent";
  if (/pages\/student|student-activity|learning\/.*-master/i.test(rel)) return "student";
  if (/pages\/school|school-server/i.test(rel)) return "school_manager";
  if (/pages\/teacher|teacher-server|classroom-activities/i.test(rel)) return "teacher";
  if (/admin/i.test(rel)) return "admin";
  return "mixed_or_unclear";
}

function inferSurface(rel) {
  if (/copilot|parent-copilot/i.test(rel)) return "parent_copilot";
  if (/parent-report-ai|ai-explainer/i.test(rel)) return "parent_ai";
  if (/fast-diagnostic|diagnostic/i.test(rel)) return "diagnostic_engine";
  if (/topic-next-step|learning-patterns/i.test(rel)) return "recommendation_engine";
  if (/classroom-activities|activities/i.test(rel)) return "classroom_activity";
  if (/pages\/api\//i.test(rel)) return "api_layer";
  if (/-master\.js$/.test(rel)) return "student_learning";
  if (/guardian/i.test(rel)) return "guardian_access";
  return "decision_general";
}

function inferSection(rel, lineText) {
  const t = `${rel} ${lineText}`;
  if (/prompt|system|instruction|orchestrator|llm/i.test(t)) return "ai_prompt";
  if (/fallback|guardrail|safety|off.?topic/i.test(t)) return "ai_safety";
  if (/thin|insufficient|no_data|אין מספיק/i.test(t)) return "data_sufficiency";
  if (/permission|הרשא|denied|not allowed/i.test(t)) return "permission_scope";
  if (/recommend|המלצ|next.?step|topic-next/i.test(t)) return "recommendation";
  if (/progress|קידום|רמה|level/i.test(t)) return "progression";
  if (/feedback|טעות|הצלח|correct/i.test(t)) return "student_feedback";
  if (/validation|error|שגיאה/i.test(t)) return "validation_error";
  if (/status|severity|tier|badge/i.test(t)) return "status_label";
  return "general";
}

function classifyDecisionType(rel, text, lineText, section) {
  const t = `${rel} ${text} ${lineText} ${section}`;
  if (/copilot-turn|llm-orchestrator|prompt|systemInstruction|SYSTEM/i.test(t)) return "ai_prompt";
  if (/copilot|answer-composer|fallback-templates|guardrail/i.test(t) && /parent|copilot/i.test(rel)) {
    if (/prompt|system/i.test(lineText)) return "ai_prompt";
    return "ai_answer";
  }
  if (/parent-report-ai/i.test(rel)) return "ai_answer";
  if (/off.?topic|safety|guardrail/i.test(t)) return "safety_guard";
  if (/thin|insufficient|no_data|אין מספיק|דל|מצומצם/i.test(t)) return "data_sufficiency";
  if (/permission|הרשא|denied|not allowed|UUID/i.test(t)) return "permission_scope";
  if (/validation|שגיאה|errorTitle|errorMessage/i.test(t)) return "validation_error";
  if (/activity|יצירת פעילות|generate-activity/i.test(t)) return "activity_creation";
  if (/feedback|טעות|הצלח|נסה|המשך|topic/i.test(t) && /student|master/i.test(rel)) return "student_feedback";
  if (/next.?step|topic-next|המשך ל|נושא הבא/i.test(t)) return "next_step";
  if (/recommend|המלצ|כדאי|מומלץ/i.test(t)) return "recommendation";
  if (/קידום|רמה|progress|RI\d|עלייה|ירידה/i.test(t)) return "progression";
  if (/severity|tier|status|critical|monitor|on_track/i.test(t)) return "diagnostic_status";
  if (/diagnostic|אבחון|probe-map/i.test(t)) return "diagnostic_status";
  return "other";
}

function classifyVisibility(rel, lineText, text, fn) {
  if (isCommentOrJSDoc(lineText)) {
    return { visibility: "internal_only", reason: "Comment/JSDoc — not rendered" };
  }
  if (/prompt|systemInstruction|SYSTEM_PROMPT|buildPrompt|messages:\s*\[/i.test(lineText)) {
    return { visibility: "prompt_internal", reason: "LLM prompt/system instruction" };
  }
  if (/pages\/api\//.test(rel) && /error|message|status/i.test(lineText)) {
    return { visibility: "api_message_visible", reason: "API error/validation to UI" };
  }
  if (/copilot|fallback-templates|answer-composer|ai-explainer/i.test(rel)) {
    return { visibility: "ai_generated_visible", reason: "AI/copilot user-facing output path" };
  }
  if (/collapsed|_internal|trace/i.test(lineText)) {
    return { visibility: "collapsed_visible", reason: "Collapsed/trace — verify render" };
  }
  if (rel.startsWith("pages/") || rel.startsWith("components/")) {
    return { visibility: "default_visible", reason: "Page/component render layer" };
  }
  if (/LabelHe|MessageHe|_HE\s*=|He\s*[:=]/.test(lineText)) {
    return { visibility: "default_visible", reason: "Hebrew label/map" };
  }
  if (fn && /He$|He\b|Copilot|Diagnostic|Recommend|Fallback|Guard/i.test(fn)) {
    return { visibility: "default_visible", reason: `Decision helper: ${fn}` };
  }
  return { visibility: "needs_review", reason: "Confirm user-visible decision path" };
}

function problemType(text, visibility, decisionType) {
  if (!["default_visible", "api_message_visible", "ai_generated_visible", "collapsed_visible"].includes(visibility)) {
    return "";
  }
  const checks = [
    ["engine_jargon", /מנוע|פער ידע|מסקנה חזקה|מסקנה חדה|מוכנות לשלב הבא|ביטחון סטטיסטי/],
    ["raw_key_leak", /^[a-z][a-z0-9_]{2,}$/i],
    ["untranslated_english", /[A-Za-z]{4,}/],
    ["thin_data_tone", /אין מספיק|דל נתון|מצומצם|חלקי/],
    ["progression_risk", /קידום|עלייה ברמה|ירידה|RI\d|העברה/],
    ["ai_safety_risk", /off.?topic|hallucin|לא בטוח/i],
    ["technical_leak", /UUID|PIN\b|filterKey|low_activity/],
    ["ambiguous_professional", /מדד|אות\b|signal|tier|severity|confidence/i],
  ];
  const stripped = text.replace(/\$\{[^}]+\}/g, "");
  for (const [type, re] of checks) {
    const target = type === "raw_key_leak" ? text.trim() : stripped;
    if (re.test(target)) return type;
  }
  if (decisionType === "ai_prompt") return "prompt_governance";
  return "";
}

function severityFor(problemType) {
  if (!problemType) return "";
  if (["engine_jargon", "raw_key_leak", "technical_leak", "progression_risk"].includes(problemType)) return "high";
  if (["untranslated_english", "thin_data_tone", "ambiguous_professional", "ai_safety_risk"].includes(problemType))
    return "medium";
  return "low";
}

function inferStateType(text) {
  const t = String(text);
  if (/no_data|אין נתונים|אין פעילות|לא היו/i.test(t)) return "no_data";
  if (/thin|מצומצם|עדיין מעט|דל/i.test(t)) return "thin_data";
  if (/partial|חלקי|בתקופה/i.test(t)) return "partial_data";
  if (/insufficient|אין מספיק/i.test(t)) return "insufficient_data";
  return "other";
}

function meaningPlainHe(entry) {
  const dt = entry.decision_type;
  const t = entry.current_hebrew;
  if (dt === "ai_answer") return "תשובת AI/עוזר שמנחה את ההורה מה לעשות או איך להבין את הנתונים.";
  if (dt === "ai_prompt") return "הנחיית מערכת ל-AI — משפיעה על סוג התשובה (לא תמיד גלוי למשתמש).";
  if (dt === "data_sufficiency") return "הודעה שהנתונים אינם מספיקים לקבלת החלטה.";
  if (dt === "permission_scope") return "הודעה על מגבלת הרשאה או היקף מקצועות.";
  if (dt === "validation_error") return "הודעת חסימה/שגיאה שמונעת פעולה.";
  if (dt === "recommendation") return "המלצת פעולה על בסיס ניתוח למידה.";
  if (dt === "progression") return "ניסוח שמציע שינוי רמה או המשך התקדמות.";
  if (dt === "diagnostic_status") return "תווית סטטוס/אבחון שמסבירה מצב תלמיד/נושא.";
  if (dt === "student_feedback") return "משוב לתלמיד שעשוי להשפיע על המשך תרגול.";
  if (dt === "next_step") return "הכוונה לצעד הבא בתרגול או בנושא.";
  if (dt === "safety_guard") return "הגנת AI מפני תשובה לא בטוחה או מחוץ לנושא.";
  if (/מנוע/.test(t)) return "ניסוח שמפנה למנוע פנימי — יש להחליף בהסבר למשתמש.";
  return "טקסט שעשוי להשפיע על החלטת משתמש במערכת.";
}

function exampleBefore(entry) {
  const surf = entry.surface;
  const txt = entry.example_output || entry.current_hebrew;
  const map = {
    parent_copilot: `בעוזר ההורים: ${txt}`,
    parent_ai: `בהסבר AI בדוח: ${txt}`,
    diagnostic_engine: `באבחון/ניתוח: ${txt}`,
    recommendation_engine: `בהמלצת מערכת: ${txt}`,
    classroom_activity: `בפעילות כיתתית: ${txt}`,
    student_learning: `במסך תרגול תלמיד: ${txt}`,
    api_layer: `בהודעת מערכת: ${txt}`,
  };
  return map[surf] || txt;
}

function isOwnerCandidate(entry) {
  if (entry.visibility === "internal_only" || entry.visibility === "prompt_internal") return false;
  if (entry.severity === "high") return true;
  if (["data_sufficiency", "permission_scope", "validation_error", "progression", "recommendation"].includes(entry.decision_type))
    return true;
  if (entry.problem_type) return true;
  if (/מנוע|UUID|PIN\b|RI\d|confidence|severity|tier|insufficient_/i.test(entry.current_hebrew)) return true;
  return false;
}

function sheetFromObjects(rows, columns) {
  return [columns, ...rows.map((row) => columns.map((c) => row[c] ?? ""))];
}

// --- Scan ---
const files = [...new Set(SCAN_ROOTS.flatMap(collectFiles))].filter((f) => !shouldExclude(f)).sort();
const allEntries = [];
const seen = new Set();
let idSeq = 0;

for (const rel of files) {
  const content = readFileSync(join(ROOT, rel), "utf8");
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const hit of extractStringsFromLine(line)) {
      if (!isDecisionRelevant(rel, hit.text, line)) continue;
      const key = `${rel}:${i + 1}:${hit.text.slice(0, 120)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const fn = enclosingFunction(lines, i);
      const audience = inferAudience(rel);
      const surface = inferSurface(rel);
      const section = inferSection(rel, line);
      const decision_type = classifyDecisionType(rel, hit.text, line, section);
      const { visibility, reason } = classifyVisibility(rel, line, hit.text, fn);
      const isTemplate = /\$\{/.test(hit.text);
      const pt = problemType(hit.text, visibility, decision_type);
      const entry = {
        id: `SD-HE-${String(++idSeq).padStart(5, "0")}`,
        file: rel,
        function: fn,
        line: i + 1,
        audience,
        surface,
        section,
        condition: line.trim().slice(0, 180),
        current_hebrew: hit.text,
        example_output: isTemplate ? hit.text.replace(/\$\{[^}]+\}/g, "…") : hit.text,
        visibility,
        decision_type,
        problem_type: pt,
        severity: severityFor(pt),
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        notes: reason,
      };
      allEntries.push(entry);
    }
  }
}

const decisionVisible = allEntries.filter((e) =>
  ["default_visible", "api_message_visible", "ai_generated_visible", "collapsed_visible"].includes(e.visibility)
);
const internalOnly = allEntries.filter((e) => e.visibility === "internal_only");
const needsReview = allEntries.filter((e) => e.visibility === "needs_review");
const promptInternal = allEntries.filter((e) => e.visibility === "prompt_internal");

const aiCopy = allEntries.filter((e) =>
  /ai_answer|ai_prompt|safety_guard/.test(e.decision_type) || /copilot|parent-report-ai/i.test(e.file)
);
const diagnosticCopy = allEntries.filter((e) =>
  /diagnostic_status|diagnostic_engine/.test(e.decision_type + e.surface) || /fast-diagnostic|diagnostic-labels/i.test(e.file)
);
const recommendationCopy = allEntries.filter((e) =>
  /recommendation|progression|next_step/.test(e.decision_type)
);
const studentFeedback = allEntries.filter((e) => e.decision_type === "student_feedback" || e.surface === "student_learning");
const permissionValidation = allEntries.filter((e) =>
  /permission_scope|validation_error/.test(e.decision_type)
);
const emptyThin = allEntries.filter((e) => e.decision_type === "data_sufficiency" || /thin|insufficient|no_data/i.test(e.current_hebrew));

const professionalRows = RISKY_TERMS.map(
  ([term, category, okParent, okTeacher, okStudent, forbiddenRaw, replacementDirection]) => {
    const found = files.filter((f) => readFileSync(join(ROOT, f), "utf8").includes(term));
    return {
      term,
      category,
      allowed_for_parent: okParent,
      allowed_for_teacher: okTeacher,
      allowed_for_student: okStudent,
      forbidden_if_raw_engine: forbiddenRaw,
      replacement_direction: replacementDirection,
      files_found: found.slice(0, 10).join("; ") + (found.length > 10 ? ` (+${found.length - 10})` : ""),
      count: found.length,
      notes: "",
    };
  }
);

const ownerCandidates = allEntries
  .filter(isOwnerCandidate)
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });

const topRisk = [...decisionVisible]
  .filter((e) => e.problem_type)
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  })
  .slice(0, 30);

const summaryRows = [
  { metric: "generated_at", value: new Date().toISOString(), notes: "Site decision-copy inventory (read-only)" },
  { metric: "files_scanned", value: files.length, notes: "" },
  { metric: "hebrew_strings_templates_found", value: allEntries.length, notes: "Decision-relevant only" },
  { metric: "decision_visible", value: decisionVisible.length, notes: "" },
  { metric: "internal_only", value: internalOnly.length, notes: "" },
  { metric: "prompt_internal", value: promptInternal.length, notes: "AI system prompts" },
  { metric: "needs_review", value: needsReview.length, notes: "" },
  { metric: "ai_prompt_related", value: aiCopy.length, notes: "" },
  { metric: "diagnostic_recommendation_related", value: diagnosticCopy.length + recommendationCopy.length, notes: "" },
  { metric: "student_feedback_related", value: studentFeedback.length, notes: "" },
  { metric: "permission_validation_related", value: permissionValidation.length, notes: "" },
  { metric: "owner_review_candidates", value: ownerCandidates.length, notes: "" },
  { metric: "code_changed", value: "no", notes: "" },
];

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(sheetFromObjects(summaryRows, ["metric", "value", "notes"])),
  "Summary"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(decisionVisible.concat(needsReview), [
      "id",
      "file",
      "function",
      "line",
      "audience",
      "surface",
      "section",
      "condition",
      "current_hebrew",
      "example_output",
      "visibility",
      "decision_type",
      "problem_type",
      "severity",
      "suggested_replacement",
      "owner_approved_replacement",
      "status",
      "notes",
    ])
  ),
  "Decision Visible Strings"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      aiCopy.map((e) => ({
        id: e.id,
        file: e.file,
        function_or_prompt: e.function,
        line: e.line,
        audience: e.audience,
        prompt_or_output: e.decision_type === "ai_prompt" ? "prompt" : "output",
        current_text: e.current_hebrew,
        visible_to_user: e.visibility === "prompt_internal" ? "internal_prompt" : "yes_or_generated",
        decision_effect: e.decision_type,
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function_or_prompt",
        "line",
        "audience",
        "prompt_or_output",
        "current_text",
        "visible_to_user",
        "decision_effect",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "AI Prompt Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      diagnosticCopy.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        decision_key_if_any: (e.condition.match(/[a-z_]+:\s*["'`]/) || [""])[0].slice(0, 40),
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        where_used: `${e.surface}/${e.section}`,
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "decision_key_if_any",
        "current_hebrew",
        "example_output",
        "where_used",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Diagnostic Decision Labels"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      recommendationCopy.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        audience: e.audience,
        surface: e.surface,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        does_it_suggest_progression: /progression|קידום|רמה|RI/i.test(e.current_hebrew) ? "yes" : "no",
        evidence_or_condition: e.condition.slice(0, 120),
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "audience",
        "surface",
        "current_hebrew",
        "example_output",
        "does_it_suggest_progression",
        "evidence_or_condition",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Recommendation Progression"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      emptyThin.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        audience: e.audience,
        surface: e.surface,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        state_type: inferStateType(e.current_hebrew),
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "audience",
        "surface",
        "current_hebrew",
        "example_output",
        "state_type",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Empty Thin Data Messages"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      permissionValidation.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        audience: e.audience,
        surface: e.surface,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        blocked_action: e.decision_type,
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "audience",
        "surface",
        "current_hebrew",
        "example_output",
        "blocked_action",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Permission Blocking Messages"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      studentFeedback.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        learning_decision_effect: e.decision_type,
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "current_hebrew",
        "example_output",
        "learning_decision_effect",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Student Learning Feedback"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(professionalRows, [
      "term",
      "category",
      "allowed_for_parent",
      "allowed_for_teacher",
      "allowed_for_student",
      "forbidden_if_raw_engine",
      "replacement_direction",
      "files_found",
      "count",
      "notes",
    ])
  ),
  "Professional Risky Terms"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      ownerCandidates.slice(0, 600).map((e) => ({
        id: e.id,
        audience: e.audience,
        surface: e.surface,
        section: e.section,
        decision_type: e.decision_type,
        current_hebrew: e.current_hebrew,
        meaning_plain_he: meaningPlainHe(e),
        example_before: exampleBefore(e),
        risk: e.problem_type || e.severity,
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        source: `${e.file}:${e.line}`,
      })),
      [
        "id",
        "audience",
        "surface",
        "section",
        "decision_type",
        "current_hebrew",
        "meaning_plain_he",
        "example_before",
        "risk",
        "suggested_replacement",
        "owner_approved_replacement",
        "status",
        "source",
      ]
    )
  ),
  "Owner Review Candidates"
);

const outDir = join(ROOT, "reports");
mkdirSync(outDir, { recursive: true });
const xlsxPath = join(outDir, "site-decision-hebrew-copy-inventory.xlsx");
XLSX.writeFile(wb, xlsxPath);

const md = `# Site Decision Hebrew Copy Inventory — Summary

Generated: ${new Date().toISOString()}

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | ${files.length} |
| Hebrew strings/templates (decision-relevant) | ${allEntries.length} |
| Decision-visible | ${decisionVisible.length} |
| Internal-only | ${internalOnly.length} |
| Prompt-internal (AI) | ${promptInternal.length} |
| Needs review | ${needsReview.length} |
| AI/prompt related | ${aiCopy.length} |
| Diagnostic + recommendation related | ${diagnosticCopy.length + recommendationCopy.length} |
| Student feedback related | ${studentFeedback.length} |
| Permission/validation related | ${permissionValidation.length} |
| Owner review candidates | ${ownerCandidates.length} |

## Top 30 highest-risk decision-impacting phrases

${topRisk.map((e, i) => `${i + 1}. **${e.severity || "n/a"}** [${e.audience}/${e.decision_type}] — \`${e.current_hebrew.slice(0, 100)}${e.current_hebrew.length > 100 ? "…" : ""}\` (${e.file}:${e.line})`).join("\n")}

## Excluded from this scan

Regular parent report copy, teacher/school report copy (prior inventories), live classroom docs, student games/coins, review-packages, test-only scripts.

## Notes

- No product source code modified.
- Excel: \`reports/site-decision-hebrew-copy-inventory.xlsx\`
`;

writeFileSync(join(outDir, "site-decision-hebrew-copy-inventory-summary.md"), md, "utf8");

console.log(
  JSON.stringify(
    {
      xlsxPath: relative(ROOT, xlsxPath),
      filesScanned: files.length,
      totalEntries: allEntries.length,
      decisionVisible: decisionVisible.length,
      aiRelated: aiCopy.length,
      diagnosticReco: diagnosticCopy.length + recommendationCopy.length,
      studentFeedback: studentFeedback.length,
      permissionValidation: permissionValidation.length,
      needsReview: needsReview.length,
      ownerCandidates: ownerCandidates.length,
      topRiskCount: topRisk.length,
    },
    null,
    2
  )
);
