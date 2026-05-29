/**
 * Build teacher/school report Hebrew copy inventory (read-only scan).
 * Run: node scripts/teacher-school-report-hebrew-copy-inventory-build.mjs
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
  "pages/teacher",
  "pages/school",
  "components/teacher-portal",
  "components/school-portal",
  "components/reporting",
  "components/classroom-activities",
  "lib/teacher-portal",
  "lib/school-portal",
  "lib/teacher-server",
  "lib/school-server",
  "lib/classroom-activities",
  "lib/platform-ui/hebrew-display-labels.js",
  "utils/diagnostic-labels-he.js",
  "utils/diagnostic-mistake-metadata.js",
  "utils/fast-diagnostic-engine",
  "pages/api/teacher/activities",
  "pages/api/teacher/students",
  "pages/api/teacher/classes",
  "pages/api/teacher/dashboard.js",
  "pages/api/school",
];

const SKIP_DIR_PARTS = new Set([
  "review-packages",
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "_qa-transfer",
]);

const PROFESSIONAL_TERMS = [
  ["מנוע", "engine_reference", "no", "no", "yes", "הימנע מהפניה למנוע; תאר מה הדוח אומר"],
  ["אבחון", "diagnostic", "yes_if_explained", "yes_if_explained", "yes_if_raw", "מותר למורה אם ברור; לא כתווית פנימית"],
  ["סף", "threshold_jargon", "no", "no", "yes", "החלף בניסוח על כמות נתונים"],
  ["מגמה", "trend", "yes", "yes", "yes_if_unexplained", "מותר אם מוסבר; לא מפתח trend"],
  ["אות / אותות", "signal", "no", "no", "yes", "החלף ב'סימנים' או 'נתונים'"],
  ["פער ידע", "engine_jargon", "no", "no", "yes", "החלף ב'נושאים לחיזוק'"],
  ["מדד", "metric", "yes_if_explained", "yes", "yes_if_raw", "מותר אם מוגדר למורה"],
  ["ביטחון", "confidence", "no", "no", "yes", "לא confidence סטטיסטי גולמי"],
  ["confidence", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["severity", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["tier", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["filterKey", "english_key", "no", "no", "yes", "לא להציג מפתח"],
  ["low_activity", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["insufficient_data", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["class_monitor", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["no_data", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["raw score", "english_key", "no", "no", "yes", "הצג אחוז/ציון מוסבר"],
  ["delta", "english_key", "no", "no", "yes", "החלף ב'שינוי'"],
  ["trend", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["engine", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["signal", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["intervention", "english_key", "yes", "yes", "yes_if_raw", "מותר 'התערבות' בעברית"],
  ["recommendation code", "english_key", "no", "no", "yes", "לא להציג קוד"],
  ["root cause", "english_key", "no", "no", "yes", "החלף ב'מקור הקושי'"],
  ["diagnostic event", "english_key", "no", "no", "yes", "תרגום חובה"],
  ["needs_reinforcement", "status_key", "no", "no", "yes", "תרגום חובה"],
  ["critical_class", "status_key", "no", "no", "yes", "תרגום חובה"],
  ["on_track", "status_key", "no", "no", "yes", "תרגום חובה"],
  ["RI0", "progression_code", "no", "no", "yes", "קוד פנימי — לא בדוח"],
  ["RI1", "progression_code", "no", "no", "yes", "קוד פנימי — לא בדוח"],
  ["RI2", "progression_code", "no", "no", "yes", "קוד פנימי — לא בדוח"],
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

function enclosingFunction(lines, lineIdx) {
  for (let i = lineIdx; i >= 0 && i >= lineIdx - 80; i--) {
    const m =
      lines[i].match(/^\s*export\s+(?:async\s+)?function\s+(\w+)/) ||
      lines[i].match(/^\s*function\s+(\w+)/) ||
      lines[i].match(/^\s*export\s+const\s+(\w+)\s*=/) ||
      lines[i].match(/^\s*const\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (m) return m[1];
  }
  return "";
}

function inferAudience(rel) {
  if (rel.includes("pages/school") || rel.includes("school-portal") || rel.includes("school-server")) {
    if (/manager|dashboard|teachers\/index|classes|students/.test(rel)) return "school_manager";
    if (/school-request|admin/.test(rel)) return "school_admin";
    return "school_manager";
  }
  if (rel.includes("pages/teacher") || rel.includes("teacher-portal") || rel.includes("teacher-server")) {
    if (rel.includes("school-messages") || rel.includes("TEACHER_SCHOOL")) return "school_teacher";
    return "teacher";
  }
  if (rel.includes("platform-ui") || rel.includes("reporting/")) return "mixed_or_unclear";
  if (rel.includes("classroom-activities")) return "teacher";
  if (rel.includes("diagnostic")) return "mixed_or_unclear";
  return "mixed_or_unclear";
}

function inferSurface(rel, lineText) {
  const t = `${rel} ${lineText}`;
  if (/export|activity-report-export|report-export|xlsx|csv|pdf-he/i.test(t)) return "activity_export";
  if (/activity.*report|activities\/\[activityId\]\/report/i.test(rel)) return "activity_report";
  if (/class.*report|TeacherClassReport|class-report|physical-class-report/i.test(t)) return "class_report";
  if (/student.*report|TeacherReport|student\/\[studentId\]/i.test(t)) return "student_report";
  if (/dashboard/i.test(t)) return "teacher_dashboard";
  if (/guidance|recommendation|diagnostic|riskSignal|severity|intervention/i.test(t))
    return "guidance_diagnostic";
  if (/subject.*permission|permitted.*subject|SUBJECT/i.test(t)) return "subject_permission";
  if (/pages\/api\//i.test(rel)) return "api_layer";
  if (/school-ui|school-portal/i.test(rel)) return "school_admin_ui";
  return "report_general";
}

function inferSection(rel, lineText, keyHint = "") {
  const t = `${keyHint} ${lineText} ${rel}`;
  if (/empty|zero|thin|insufficient|אין מספיק|לא היו|no_data|no_classes|EMPTY/i.test(t)) return "data_health";
  if (/guidance|recommend|המלצ|כיוון|intervention|severity|tier/i.test(t)) return "guidance_recommendation";
  if (/export|sheet|column|header|xlsx|csv/i.test(t)) return "export_labels";
  if (/status|badge|health|monitor|critical|on_track/i.test(t)) return "status_labels";
  if (/subject|מקצוע|permission|הרשא/i.test(t)) return "subject_scope";
  if (/activity|פעילות/i.test(t)) return "activity";
  if (/collapsed|details|פירוט/i.test(t)) return "collapsed_details";
  if (/class|כיתה/i.test(t)) return "class_summary";
  if (/student|תלמיד/i.test(t)) return "student_summary";
  return "general";
}

function isCommentOrJSDoc(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("*/");
}

function classifyVisibility(rel, lineText, text, fn) {
  if (isCommentOrJSDoc(lineText)) {
    return { visibility: "internal_only", reason: "Comment/JSDoc — not rendered" };
  }
  if (/selftest|\.test\.|__tests__|visual-verify/i.test(rel)) {
    return { visibility: "internal_only", reason: "Test/verify script — not user UI" };
  }
  if (/export-labels|report-export|report-pdf-he|activity-report-export/i.test(rel)) {
    return { visibility: "export_visible", reason: "Export sheet/column/PDF label layer" };
  }
  if (/pages\/api\//.test(rel) && /error|message|status.*json|res\.status/i.test(lineText)) {
    return { visibility: "api_message_visible", reason: "API error/validation message to UI" };
  }
  if (/collapsed|details|phase3|_internal|trace|blockers\.push/i.test(`${lineText} ${fn}`)) {
    return { visibility: "collapsed_visible", reason: "Collapsed/professional details — verify when expanded" };
  }
  if (rel.includes(".he.js") || rel.includes("teacher-ui") || rel.includes("school-ui")) {
    return { visibility: "default_visible", reason: "Centralized Hebrew UI label module" };
  }
  if (rel.startsWith("pages/") || rel.startsWith("components/")) {
    return { visibility: "default_visible", reason: "Page/component render layer" };
  }
  if (/LabelHe|StatusHe|MessageHe|_HE\s*=|He\s*[:=]/.test(lineText)) {
    return { visibility: "default_visible", reason: "Hebrew label/map definition" };
  }
  if (fn && /He$|He\b|Label|Guidance|Report|Export|Diagnostic/i.test(fn)) {
    return { visibility: "default_visible", reason: `Label/helper function: ${fn}` };
  }
  return { visibility: "needs_review", reason: "May feed teacher/school UI — confirm render path" };
}

function problemType(text, visibility, rel) {
  if (!["default_visible", "export_visible", "api_message_visible", "collapsed_visible"].includes(visibility)) {
    return "";
  }
  const stripped = String(text).replace(/\$\{[^}]+\}/g, "").trim();
  const checks = [
    ["engine_jargon", /מנוע|פער ידע|ביטחון סטטיסטי|טקסונומיה|מאסטרי|שורות דוח|אגרסיב|סף נתונים/],
    ["raw_key_leak", /^[a-z][a-z0-9_]{2,}$/i],
    ["untranslated_english", /[A-Za-z]{4,}/],
    ["thin_data_tone", /אין מספיק|עדיין מעט|דל|חלקי|מצומצם|לא היו|לא הייתה/],
    ["status_label_unclear", /needs_|critical_class|on_track|low_activity|insufficient_/i],
    ["progression_intervention", /העברה|קידום|שחרור|עלייה ברמה|התערבות מיידית|RI\d/i],
    ["ambiguous_professional", /מדד|אות\b|signal|tier|severity|confidence/i],
    ["guidance_wording", /אבחון|אבחוני|ניתוח|מעקב ותרגול/],
  ];
  for (const [type, re] of checks) {
    const target = type === "raw_key_leak" ? String(text).trim() : stripped;
    if (re.test(target)) return type;
  }
  if (rel.includes("export") && /\$\{/.test(text)) return "template_variability";
  return "";
}

function severity(problemType) {
  if (!problemType) return "";
  if (["engine_jargon", "raw_key_leak", "untranslated_english", "status_label_unclear"].includes(problemType))
    return "high";
  if (["thin_data_tone", "progression_intervention", "ambiguous_professional"].includes(problemType)) return "medium";
  return "low";
}

function extractStringsFromLine(line) {
  const results = [];
  const patterns = [
    /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
    /'([^'\\]*(?:\\.[^'\\]*)*)'/g,
    /`([^`\\]*(?:\\.[^`\\]*)*)`/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(line))) {
      const raw = m[1];
      if (!HEBREW_RE.test(raw)) continue;
      results.push({ text: raw });
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

function dedupeKey(file, line, text) {
  return `${file}:${line}:${text.slice(0, 120)}`;
}

function inferStateType(text, section, lineText) {
  const t = `${text} ${section} ${lineText}`;
  if (/never_active|no_activity|no_classes|אין כיתות|אין פעילות|אין תלמידים|אין מורים/i.test(t)) return "no_data";
  if (/thin|מצומצם|עדיין מעט|חלקי/i.test(t)) return "thin_data";
  if (/insufficient_answers|אין מספיק נתונים/i.test(t)) return "insufficient_answers";
  if (/insufficient_students|מעט תלמידים/i.test(t)) return "insufficient_students";
  if (/insufficient_sessions|לא היו מפגש/i.test(t)) return "insufficient_sessions";
  if (/no_activity|אין פעילות/i.test(t)) return "no_activity";
  if (/partial_scope|הרשאה|permission|מקצוע מוגבל/i.test(t)) return "subject_permission_limited";
  if (/date_range|בתקופה|no_sessions_in_range/i.test(t)) return "date_range_empty";
  if (/class_empty|כיתה ריקה/i.test(t)) return "class_empty";
  if (/not_completed|לא הושלם/i.test(t)) return "activity_not_completed";
  if (/insufficient/i.test(t)) return "insufficient_answers";
  return "thin_data";
}

function diagnosticMeaningPlain(text) {
  const t = String(text || "");
  if (/דורש התערבות|critical/i.test(t)) return "המערכת מסמנת שיש צורך בפעולה מיידית של המורה.";
  if (/דורש חיזוק|reinforcement/i.test(t)) return "המערכת ממליצה על חיזוק לפני המשך.";
  if (/כדאי לעקוב|monitor/i.test(t)) return "המערכת מבקשת מעקב — עדיין אין צורך בהתערבות חזקה.";
  if (/בקצב תקין|on_track/i.test(t)) return "המערכת מציגה שהכיתה/תלמיד בקצב תקין.";
  if (/אין מספיק נתונים|no_data/i.test(t)) return "אין מספיק נתונים לקביעת מסקנה.";
  if (/טעויות|mistakes/i.test(t)) return "המערכת מדגישה טעויות חוזרות שדורשות תשומת לב.";
  return "";
}

function meaningPlainHe(entry) {
  const dm = diagnosticMeaningPlain(entry.current_hebrew);
  if (dm) return dm;
  if (entry.section === "data_health") return "הודעה על מצב נתונים דל או חסר בדוח.";
  if (entry.section === "export_labels") return "תווית בקובץ ייצוא שמורה/מנהל רואים.";
  if (entry.section === "guidance_recommendation") return "המלצת פעולה או כיוון תמיכה למורה.";
  return "";
}

function exampleBefore(entry) {
  const surf = entry.surface;
  const txt = entry.example_output || entry.current_hebrew;
  if (surf === "student_report") return `בדוח תלמיד: ${txt}`;
  if (surf === "class_report") return `בדוח כיתה: ${txt}`;
  if (surf === "activity_report") return `בדוח פעילות: ${txt}`;
  if (surf === "activity_export") return `בייצוא Excel: ${txt}`;
  if (surf === "teacher_dashboard") return `בלוח בקרה: ${txt}`;
  if (surf === "school_admin_ui") return `בממשק בית ספר: ${txt}`;
  return txt;
}

function flagProfessionalTerms(text) {
  const found = [];
  for (const [term] of PROFESSIONAL_TERMS) {
    if (text.includes(term) || new RegExp(term, "i").test(text)) found.push(term);
  }
  return found.join(", ");
}

function templateExamples(template) {
  const base = template.replace(/\$\{[^}]+\}/g, "…");
  return {
    low: base.replace(/…/g, "מעט"),
    normal: base,
    weak: base.replace(/…/g, "חלש"),
    strong: base.replace(/…/g, "חזק"),
  };
}

function isOwnerReviewCandidate(entry) {
  if (entry.visibility === "internal_only") return false;
  if (entry.severity === "high") return true;
  if (entry.section === "data_health") return true;
  if (entry.section === "guidance_recommendation" || entry.section === "status_labels") return true;
  if (entry.problem_type) return true;
  if (/אבחון|מנוע|סף|פער|מדד|RI\d|needs_|critical_|on_track|insufficient_/i.test(entry.current_hebrew))
    return true;
  return false;
}

// --- Scan ---
const files = [...new Set(SCAN_ROOTS.flatMap(collectFiles))].sort();
const allEntries = [];
const seen = new Set();
let idSeq = 0;

for (const rel of files) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hits = extractStringsFromLine(line);
    const fn = enclosingFunction(lines, i);
    const keyHint = line.match(/(\w+He)\s*[:=]/)?.[1] || "";
    for (const hit of hits) {
      const key = dedupeKey(rel, i + 1, hit.text);
      if (seen.has(key)) continue;
      seen.add(key);
      const audience = inferAudience(rel);
      const surface = inferSurface(rel, line);
      const section = inferSection(rel, line, keyHint);
      const { visibility, reason } = classifyVisibility(rel, line, hit.text, fn);
      const isTemplate = /\$\{/.test(hit.text);
      const pt = problemType(hit.text, visibility, rel);
      const entry = {
        id: `TS-HE-${String(++idSeq).padStart(5, "0")}`,
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
        visibility_reason: reason,
        problem_type: pt,
        severity: severity(pt),
        is_template: isTemplate,
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        notes: reason,
      };
      allEntries.push(entry);
    }
  }
}

// --- Professional terms sheet ---
const professionalRows = PROFESSIONAL_TERMS.map(
  ([term, category, okTeacher, okManager, forbiddenRaw, replacementDirection]) => {
    const found = files.filter((rel) => readFileSync(join(ROOT, rel), "utf8").includes(term));
    return {
      term,
      category,
      acceptable_for_teacher: okTeacher,
      acceptable_for_school_manager: okManager,
      forbidden_if_raw_engine: forbiddenRaw,
      replacement_direction: replacementDirection,
      files_found: found.slice(0, 12).join("; ") + (found.length > 12 ? ` (+${found.length - 12} more)` : ""),
      count: found.length,
      notes: found.length ? "" : "not found in scan scope",
    };
  }
);

// --- Scenario samples ---
const teacherUi = await import(u("lib/teacher-portal/teacher-ui.he.js"));
const schoolUi = await import(u("lib/school-portal/school-ui.he.js"));
const exportLabels = await import(u("lib/teacher-portal/teacher-activity-report-export-labels.js"));

const scenarioRows = [];

function addScenario(id, desc, audience, route, subject, grade, classSize, dataState, texts) {
  for (const txt of texts.filter(Boolean)) {
    scenarioRows.push({
      scenario_id: id,
      scenario_description: desc,
      audience,
      route_or_builder: route,
      subject: subject || "",
      grade: grade || "",
      class_size: classSize ?? "",
      data_state: dataState || "",
      generated_text: String(txt).slice(0, 600),
      flagged_terms: flagProfessionalTerms(String(txt)),
      notes: String(txt).length > 600 ? "truncated" : "",
    });
  }
}

addScenario(
  "teacher_dashboard_no_data",
  "Teacher dashboard with no active classes",
  "teacher",
  "teacher-ui.he.js / DASHBOARD_NO_CLASSES",
  "",
  "",
  0,
  "no_data",
  [teacherUi.DASHBOARD_NO_CLASSES_TITLE, teacherUi.DASHBOARD_NO_CLASSES_HINT]
);

addScenario(
  "teacher_dashboard_active",
  "Teacher dashboard with active class health",
  "teacher",
  "classHealthHe",
  "math",
  "ה׳",
  28,
  "normal_data",
  ["strong", "monitor", "needs_reinforcement", "critical_class", "no_data"].map((s) => teacherUi.classHealthHe(s))
);

addScenario(
  "teacher_student_thin",
  "Teacher student report thin data",
  "teacher",
  "riskSignalHe / formatStudentSubjectFallback",
  "חשבון",
  "ה׳",
  1,
  "thin_data",
  [
    teacherUi.riskSignalHe("insufficient_answers"),
    teacherUi.formatStudentSubjectFallbackHeadlineHe("חשבון"),
    teacherUi.formatStudentSubjectFallbackEvidenceHe(42, 6),
    teacherUi.formatStudentSubjectFallbackActionHe(),
  ]
);

addScenario(
  "teacher_student_normal",
  "Teacher student report normal data",
  "teacher",
  "guidanceSeverityTierHe / studentGuidanceHeadlineHe",
  "חשבון",
  "ה׳",
  1,
  "normal_data",
  [
    teacherUi.guidanceSeverityTierHe("monitor"),
    teacherUi.guidanceSeverityTierHe("needs_reinforcement"),
    teacherUi.STUDENT_FOCUS_CALM_MESSAGE,
  ]
);

addScenario(
  "teacher_class_report",
  "Teacher class report guidance",
  "teacher",
  "classGuidanceSeverityTierHe / CLASS_WEAK_TOPICS",
  "חשבון",
  "ה׳",
  28,
  "normal_data",
  [
    teacherUi.classGuidanceSeverityTierHe("class_monitor"),
    teacherUi.CLASS_WEAK_TOPICS_FALLBACK_BANNER,
    teacherUi.HUB_CLASS_WEAK_TOPICS_CALM_MESSAGE,
  ]
);

addScenario(
  "teacher_activity_report",
  "Teacher activity report labels",
  "teacher",
  "activityExportTitleHe",
  "math",
  "ה׳",
  28,
  "normal_data",
  [exportLabels.activityExportTitleHe("תרגול שברים", "math", { gradeLevel: 5 })]
);

addScenario(
  "school_manager_student",
  "School manager student report",
  "school_manager",
  "school-ui.he.js",
  "חשבון",
  "ה׳",
  1,
  "normal_data",
  [schoolUi.SCHOOL_STUDENT_REPORT_TITLE, schoolUi.SCHOOL_REPORT_SUMMARY, schoolUi.SCHOOL_REPORT_LOADING]
);

addScenario(
  "school_class_report",
  "School class report",
  "school_manager",
  "school-ui.he.js",
  "",
  "ה׳",
  28,
  "normal_data",
  [
    schoolUi.SCHOOL_CLASS_REPORT_TITLE,
    schoolUi.SCHOOL_PHYSICAL_CLASS_REPORT_TITLE,
    schoolUi.SCHOOL_PHYSICAL_CLASS_SUBJECT_BREAKDOWN,
  ]
);

addScenario(
  "private_teacher_limited_subjects",
  "Private teacher limited subject permission",
  "teacher",
  "subjectLabelHe",
  "math",
  "",
  0,
  "partial_scope",
  [teacherUi.subjectLabelHe("math"), "מקצועות מותרים: חשבון בלבד"]
);

addScenario(
  "school_teacher_limited_subjects",
  "School teacher with limited permitted subjects",
  "school_teacher",
  "school-ui.he.js",
  "math",
  "",
  0,
  "subject_permission_limited",
  [schoolUi.SCHOOL_ALL_SUBJECTS, schoolUi.SCHOOL_MANAGER_ALL_SUBJECTS, schoolUi.SCHOOL_MANAGE_SUBJECTS]
);

addScenario(
  "activity_export_skipped",
  "Activity export with skipped questions",
  "teacher",
  "teacher-activity-report-export-labels",
  "math",
  "ה׳",
  28,
  "partial_data",
  [
    exportLabels.activityExportModeLabelHe("guided_practice"),
    exportLabels.activityExportDifficultyLabelHe("mixed"),
    exportLabels.activityExportSkillLabelHe("angles_skill", { subject: "geometry" }),
  ]
);

addScenario(
  "activity_export_weak_class",
  "Activity export weak class result",
  "teacher",
  "classHealthHe + export labels",
  "math",
  "ה׳",
  28,
  "weak_result",
  [teacherUi.classHealthHe("needs_reinforcement"), teacherUi.riskSignalHe("low_overall_accuracy")]
);

addScenario(
  "mixed_date_range",
  "Mixed/partial data date range",
  "teacher",
  "riskSignalHe",
  "",
  "",
  28,
  "partial_data",
  [
    teacherUi.riskSignalHe("no_sessions_in_range"),
    teacherUi.attentionReasonHe("no_activity_in_range"),
    schoolUi.SCHOOL_EMPTY_ACTIVITIES,
  ]
);

// --- Partitions ---
const teacherSchoolVisible = allEntries.filter((e) =>
  ["default_visible", "export_visible", "api_message_visible", "collapsed_visible"].includes(e.visibility)
);
const internalOnly = allEntries.filter((e) => e.visibility === "internal_only");
const needsReview = allEntries.filter((e) => e.visibility === "needs_review");
const dynamicTemplates = allEntries.filter((e) => e.is_template);
const emptyThin = allEntries.filter((e) =>
  /data_health|אין מספיק|לא היו|לא הייתה|no_data|insufficient|EMPTY|thin|מצומצם/i.test(
    `${e.section} ${e.current_hebrew} ${e.condition}`
  )
);
const diagnosticGuidance = allEntries.filter((e) =>
  /guidance_recommendation|status_labels|guidance_diagnostic|recommend|severity|intervention|health|monitor|critical|risk/i.test(
    `${e.section} ${e.surface} ${e.current_hebrew} ${e.file}`
  )
);
const exportCopy = allEntries.filter(
  (e) => e.visibility === "export_visible" || e.section === "export_labels" || /export/i.test(e.file)
);

const ownerCandidates = allEntries
  .filter(isOwnerReviewCandidate)
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  });

const topRisk = [...teacherSchoolVisible]
  .filter((e) => e.problem_type)
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  })
  .slice(0, 30);

const summaryRows = [
  { metric: "generated_at", value: new Date().toISOString(), notes: "Read-only teacher/school inventory build" },
  { metric: "files_scanned", value: files.length, notes: files.join(", ").slice(0, 4000) },
  { metric: "hebrew_strings_templates_found", value: allEntries.length, notes: "Unique file:line:text" },
  { metric: "teacher_school_visible", value: teacherSchoolVisible.length, notes: "default_visible + export + api + collapsed" },
  { metric: "internal_only", value: internalOnly.length, notes: "" },
  { metric: "needs_review", value: needsReview.length, notes: "" },
  { metric: "dynamic_templates", value: dynamicTemplates.length, notes: "" },
  { metric: "empty_thin_states", value: emptyThin.length, notes: "" },
  { metric: "diagnostic_guidance_strings", value: diagnosticGuidance.length, notes: "" },
  { metric: "export_copy_strings", value: exportCopy.length, notes: "" },
  { metric: "professional_terms_tracked", value: professionalRows.length, notes: "" },
  { metric: "scenario_samples", value: scenarioRows.length, notes: "" },
  { metric: "owner_review_candidates", value: ownerCandidates.length, notes: "Focused first-pass subset" },
  { metric: "code_changed", value: "no", notes: "Inventory generator only; product source untouched" },
];

function sheetFromObjects(rows, columns) {
  return [columns, ...rows.map((row) => columns.map((c) => row[c] ?? ""))];
}

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(sheetFromObjects(summaryRows, ["metric", "value", "notes"])),
  "Summary"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(teacherSchoolVisible.concat(needsReview), [
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
      "problem_type",
      "severity",
      "suggested_replacement",
      "owner_approved_replacement",
      "status",
      "notes",
    ])
  ),
  "Teacher School Visible"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      dynamicTemplates.map((e) => {
        const ex = templateExamples(e.current_hebrew);
        return {
          id: e.id,
          file: e.file,
          function: e.function,
          line: e.line,
          audience: e.audience,
          surface: e.surface,
          template: e.current_hebrew,
          variables: (e.current_hebrew.match(/\$\{[^}]+\}/g) || []).join(", "),
          example_output_low_data: ex.low,
          example_output_normal_data: ex.normal,
          example_output_weak_result: ex.weak,
          example_output_strong_result: ex.strong,
          risk: e.problem_type || "template_variability",
          suggested_replacement: "",
          status: "pending_owner_review",
        };
      }),
      [
        "id",
        "file",
        "function",
        "line",
        "audience",
        "surface",
        "template",
        "variables",
        "example_output_low_data",
        "example_output_normal_data",
        "example_output_weak_result",
        "example_output_strong_result",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Dynamic Templates"
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
        state_type: inferStateType(e.current_hebrew, e.section, e.condition),
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        why_problematic: e.problem_type || "thin_or_empty_data_wording",
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
        "state_type",
        "current_hebrew",
        "example_output",
        "why_problematic",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Empty Thin Data States"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      diagnosticGuidance.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        audience: e.audience,
        surface: e.surface,
        condition: e.condition,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        diagnostic_meaning_plain_he: diagnosticMeaningPlain(e.current_hebrew),
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
        "condition",
        "current_hebrew",
        "example_output",
        "diagnostic_meaning_plain_he",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Diagnostic Guidance Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(professionalRows, [
      "term",
      "category",
      "acceptable_for_teacher",
      "acceptable_for_school_manager",
      "forbidden_if_raw_engine",
      "replacement_direction",
      "files_found",
      "count",
      "notes",
    ])
  ),
  "Professional Terms"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      exportCopy.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        export_type: /pdf/i.test(e.file) ? "pdf" : /csv/i.test(e.file) ? "csv" : "xlsx",
        sheet_or_column: e.section === "export_labels" ? "header_or_label" : "",
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        risk: e.problem_type,
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "export_type",
        "sheet_or_column",
        "current_hebrew",
        "example_output",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Export Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(scenarioRows, [
      "scenario_id",
      "scenario_description",
      "audience",
      "route_or_builder",
      "subject",
      "grade",
      "class_size",
      "data_state",
      "generated_text",
      "flagged_terms",
      "notes",
    ])
  ),
  "Rendered Scenario Samples"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      ownerCandidates.slice(0, 800).map((e) => ({
        id: e.id,
        audience: e.audience,
        surface: e.surface,
        section: e.section,
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
const xlsxPath = join(outDir, "teacher-school-report-hebrew-copy-inventory.xlsx");
XLSX.writeFile(wb, xlsxPath);

const md = `# Teacher/School Report Hebrew Copy Inventory — Summary

Generated: ${new Date().toISOString()}

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | ${files.length} |
| Hebrew strings/templates | ${allEntries.length} |
| Teacher/school-visible | ${teacherSchoolVisible.length} |
| Internal-only | ${internalOnly.length} |
| Needs review | ${needsReview.length} |
| Dynamic templates | ${dynamicTemplates.length} |
| Empty/thin data strings | ${emptyThin.length} |
| Diagnostic/guidance strings | ${diagnosticGuidance.length} |
| Export copy strings | ${exportCopy.length} |
| Professional terms tracked | ${professionalRows.length} |
| Rendered scenario samples | ${scenarioRows.length} |
| Owner review candidates | ${ownerCandidates.length} |

## Top 30 highest-risk teacher/school phrases

${topRisk.map((e, i) => `${i + 1}. **${e.severity || "n/a"}** [${e.audience}/${e.surface}] — \`${e.current_hebrew.slice(0, 100)}${e.current_hebrew.length > 100 ? "…" : ""}\` (${e.file}:${e.line})`).join("\n")}

## Scan scope

Primary roots: pages/teacher, pages/school, components/teacher-portal, components/school-portal, components/reporting, lib/teacher-portal, lib/school-portal, lib/teacher-server, lib/school-server, classroom-activities, diagnostic Hebrew utils, teacher/school report APIs.

Excluded: regular parent-report copy (except teacher parent-report preview page in pages/teacher), student game copy, live classroom docs, review-packages staging copies.

## Notes

- No product source code was modified.
- \`suggested_replacement\` columns are empty — pending owner review.
- Teachers may receive more professional language than parents; raw engine keys and unexplained jargon are flagged.
- Excel: \`reports/teacher-school-report-hebrew-copy-inventory.xlsx\`
`;

const mdPath = join(outDir, "teacher-school-report-hebrew-copy-inventory-summary.md");
writeFileSync(mdPath, md, "utf8");

console.log(
  JSON.stringify(
    {
      xlsxPath: relative(ROOT, xlsxPath),
      mdPath: relative(ROOT, mdPath),
      filesScanned: files.length,
      totalEntries: allEntries.length,
      teacherSchoolVisible: teacherSchoolVisible.length,
      internalOnly: internalOnly.length,
      needsReview: needsReview.length,
      scenarioSamples: scenarioRows.length,
      ownerCandidates: ownerCandidates.length,
      topRiskCount: topRisk.length,
    },
    null,
    2
  )
);
