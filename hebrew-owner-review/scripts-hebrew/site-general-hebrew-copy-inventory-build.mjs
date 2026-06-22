/**
 * Build site-wide general Hebrew copy inventory (read-only scan).
 * Excludes parent report, teacher/school report, and decision inventories.
 * Run: node scripts/site-general-hebrew-copy-inventory-build.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const HEBREW_RE = /[\u0590-\u05FF]/;

const SCAN_ROOTS = ["pages", "components", "lib", "utils", "data"];

const SKIP_DIR_PARTS = new Set([
  "review-packages",
  "node_modules",
  ".next",
  "test-results",
  "playwright-report",
  "_qa-transfer",
  "games",
  "arcade",
  "__tests__",
  "tests",
]);

const EXCLUDE_PATH_RE = [
  /\.cursor\//,
  /docs\//,
  /scripts\//,
  /selftest/i,
  /smoke\.mjs$/,
  /teacher-live-classroom/i,
  /live.?audio/i,
  /review-packages/,
  // Parent report inventory
  /parent-report-detailed/i,
  /pages\/learning\/parent-report/i,
  /components\/parent-report/i,
  /components\/parent\//,
  /utils\/detailed-parent-report/i,
  /utils\/detailed-report-parent-letter/i,
  /utils\/parent-report/i,
  /utils\/parent-data-presence/i,
  /utils\/diagnostic-engine/i,
  /utils\/contracts\/parent-product-contract/i,
  /utils\/parent-report-language\//,
  /utils\/parent-report-ai/i,
  /lib\/parent-server\/parent-report/i,
  /ParentReportImportantDisclaimer/i,
  // Teacher/school report inventory
  /^pages\/teacher\//,
  /^pages\/school\//,
  /components\/teacher-portal\//,
  /components\/school-portal\//,
  /components\/reporting\//,
  /components\/classroom-activities\//,
  /components\/worksheet-activities\//,
  /lib\/teacher-portal\//,
  /lib\/school-portal\//,
  /lib\/teacher-server\//,
  /lib\/school-server\//,
  /lib\/classroom-activities\//,
  /TeacherClassReportModal/i,
  /SchoolReportModal/i,
  /teacher-class-report\.server/i,
  /teacher-report\.server/i,
  /school-reports\.server/i,
  /school-report-view-model/i,
  /school-physical-class-report/i,
  /teacher-ui\.he\.js$/,
  /school-ui\.he\.js$/,
  /teacher-activity-report-export/i,
  /^pages\/api\/teacher\//,
  /^pages\/api\/school\//,
  // Site decision inventory
  /parent-copilot/i,
  /parent-ai-topic-classifier/i,
  /utils\/contracts\/narrative-contract/i,
  /utils\/fast-diagnostic-engine/i,
  /utils\/diagnostic-labels-he\.js$/,
  /utils\/diagnostic-mistake-metadata\.js$/,
  /utils\/diagnostic-question-contract/i,
  /utils\/topic-next-step-engine/i,
  /utils\/topic-next-step-phase2/i,
  /utils\/learning-patterns-analysis/i,
  /lib\/guardian-server/i,
  /utils\/contracts\/narrative-contract-v1/i,
  /utils\/parent-report-language\/forbidden-terms/i,
  /teacher-guidance-v2\.server/i,
  /teacher-recommendations\.server/i,
  /student-activity\.server/i,
  /student-activity-play\.server/i,
  /TeacherDiscussionQuestionPicker/i,
  /TeacherStudentIndividualActivitiesPanel/i,
  /TeacherActivityStudentAnswersModal/i,
  /^pages\/student\/activity\//,
  /^pages\/student\/worksheet\//,
  /^pages\/api\/parent\//,
  /^pages\/api\/guardian\//,
  // Games / arcade (not main learning product UI)
  /^pages\/student\/games\//,
  /^pages\/student\/arcade\//,
  /^archive\/deprecated-mleo-games\//,
  /^pages\/game\.js$/,
  /reward-options/i,
  // Curriculum / question banks (exercise content, not UI chrome)
  /data\/english-questions/i,
  /data\/hebrew-questions/i,
  /data\/geography-questions/i,
  /data\/science-questions/i,
  /data\/curriculum-spine/i,
  /data\/hebrew-official/i,
  /data\/hebrew-g[0-9]-content-map/i,
  /data\/hebrew-g3-reading-bank/i,
  /data\/hebrew-curriculum\.js$/,
  /data\/science-curriculum\.js$/,
  /data\/english-curriculum\.js$/,
  /data\/moledet-geography-curriculum\.js$/,
  // Help center parent-report article (covered elsewhere)
  /data\/help-center\/content\/parent-report/i,
];

const RISKY_TERMS = [
  ["מנוע", "engine_reference", "no", "תאר מה המערכת עושה בלי 'מנוע'"],
  ["אבחון", "diagnostic", "yes_if_explained", "מותר אם ברור למשתמש"],
  ["סף", "threshold", "no", "החלף בניסוח על כמות נתונים"],
  ["מגמה", "trend", "yes_if_unexplained", "לא מפתח trend"],
  ["פער ידע", "engine_jargon", "no", "החלף בנושאים לחיזוק"],
  ["ביטחון", "confidence", "no", "לא confidence גולמי"],
  ["confidence", "english_key", "no", "תרגום חובה"],
  ["severity", "english_key", "no", "תרגום חובה"],
  ["tier", "english_key", "no", "תרגום חובה"],
  ["insufficient_data", "english_key", "no", "תרגום חובה"],
  ["no_data", "english_key", "no", "תרגום חובה"],
  ["UUID", "technical", "no", "לא למשתמש"],
  ["PIN", "technical", "no", "לא למשתמש"],
  ["dashboard", "mixed_he_en", "no", "העדף עברית אחידה"],
  ["login", "mixed_he_en", "no", "העדף עברית אחידה"],
  ["report", "mixed_he_en", "careful", "בדוק עקביות דוח/דיווח"],
  ["טווח", "period_label", "careful", "בדוק מול 'תקופה'"],
  ["תקופה", "period_label", "careful", "בדוק עקביות"],
  ["מערכת", "system_word", "careful", "עלול להישמע טכני"],
  ["דוח", "report_label", "careful", "בדוק עקביות מונח"],
];

const PRIOR_INVENTORY_PATHS = [
  "reports/parent-report-hebrew-copy-inventory.xlsx",
  "reports/teacher-school-report-hebrew-copy-inventory.xlsx",
  "reports/site-decision-hebrew-copy-inventory.xlsx",
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
    if (!/\.(js|jsx|mjs|ts|tsx|json)$/i.test(relPath)) return [];
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

function loadPriorInventoryKeys() {
  const keys = new Set();
  const textFields = [
    "current_hebrew",
    "current_text",
    "current_copy",
    "phrase",
    "text",
    "label",
    "message",
  ];
  for (const rel of PRIOR_INVENTORY_PATHS) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const wb = XLSX.readFile(abs);
    for (const sheetName of wb.SheetNames) {
      if (sheetName === "Summary" || /Professional|Risky Terms/i.test(sheetName)) continue;
      for (const row of XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" })) {
        const file = String(row.file || row.source_file || "").replace(/\\/g, "/");
        const line = Number(row.line || row.source_line || 0);
        let text = "";
        for (const f of textFields) {
          if (row[f] && HEBREW_RE.test(String(row[f]))) {
            text = String(row[f]);
            break;
          }
        }
        if (!text && row.source) {
          const src = String(row.source);
          const sm = src.match(/^(.+?):(\d+)\s*$/);
          if (sm && !file) {
            // handled below via source parse
          }
        }
        if (!text && row.current_hebrew) text = String(row.current_hebrew);
        if (!text) continue;
        if (file && line) keys.add(`${file}:${line}:${text.slice(0, 120)}`);
        else if (file) keys.add(`${file}::${text.slice(0, 120)}`);
      }
    }
  }
  return keys;
}

function inferAudience(rel) {
  if (/pages\/parent|guardian|parent\//i.test(rel)) return "parent";
  if (/pages\/student|student\//i.test(rel)) return "student";
  if (/private.?teacher|privateTeacher/i.test(rel)) return "private_teacher";
  if (/pages\/school|school-portal|school-server/i.test(rel)) return "school_manager";
  if (/pages\/teacher|teacher-portal|teacher-server/i.test(rel)) return "teacher";
  if (/pages\/admin|components\/admin|admin\//i.test(rel)) return "admin";
  if (/help-center|legal|policy|terms|privacy|accessibility/i.test(rel)) return "mixed_or_unclear";
  if (/pages\/index|pages\/about|pages\/contact/i.test(rel)) return "guest";
  return "mixed_or_unclear";
}

function inferSurface(rel) {
  if (/pages\/index\.js$|pages\/about|pages\/gallery/i.test(rel)) return "homepage";
  if (/nav|header|footer|Hud|AppNav|SiteNav/i.test(rel)) return "navigation";
  if (/login|sign-?in|auth/i.test(rel)) return "login";
  if (/register|sign-?up/i.test(rel)) return "register";
  if (/dashboard/i.test(rel)) return "dashboard";
  if (/help-center|HelpCenter|help\//i.test(rel)) return "help_center";
  if (/onboard|welcome|getting-started/i.test(rel)) return "onboarding";
  if (/legal|policy|terms|privacy|acceptance|disclosure/i.test(rel)) return "policy";
  if (/pages\/admin|components\/admin/i.test(rel)) return "admin_ui";
  if (/school-setup|demo|school-request/i.test(rel)) return "school_setup";
  if (/pages\/learning\/index|curriculum|lobby/i.test(rel)) return "learning_lobby";
  if (/-master\.js$|learning\//i.test(rel)) return "learning_screen";
  if (/pages\/api\//i.test(rel)) return "api_message";
  if (rel.startsWith("components/") || rel.startsWith("lib/")) return "general_component";
  return "mixed_or_unclear";
}

function inferSection(rel, lineText) {
  const t = `${rel} ${lineText}`;
  if (/empty|אין |לא נמצא|עדיין אין/i.test(t)) return "empty_state";
  if (/error|שגיאה|נכשל/i.test(t)) return "error";
  if (/success|הצלח|נשמר/i.test(t)) return "success";
  if (/warning|אזהרה|שים לב/i.test(t)) return "warning";
  if (/help|עזרה|הסבר/i.test(t)) return "help";
  if (/policy|תנאים|פרטיות/i.test(t)) return "policy";
  if (/onboard|ברוכים|התחלה/i.test(t)) return "onboarding";
  if (/nav|menu|תפריט/i.test(t)) return "navigation";
  if (/modal|dialog/i.test(t)) return "modal";
  if (/form|input|label/i.test(t)) return "form";
  return "general";
}

function classifyCopyType(rel, text, lineText) {
  const trimmed = String(text).trim();
  if (/button|btn|Button|onClick|type=["']submit["']|<Link/i.test(lineText) && trimmed.length <= 45) return "button";
  if (/nav|Nav|menu|Menu|breadcrumb|href=/i.test(lineText) && trimmed.length <= 40) return "navigation";
  if (/<h[1-6]|className=.*title|heading/i.test(lineText) || (trimmed.length > 40 && /[.:]$/.test(trimmed))) return "heading";
  if (/tooltip|title=\{|aria-label/i.test(lineText)) return "tooltip";
  const t = `${text} ${lineText}`;
  if (/modal|dialog|Dialog/i.test(lineText) || /modal/i.test(rel)) return "modal";
  if (/placeholder=/i.test(lineText)) return "form_label";
  if (/label|Label/i.test(lineText)) return "label";
  if (/empty|אין |לא נמצא/i.test(t)) return "empty_state";
  if (/error|שגיאה|נכשל/i.test(t)) return "error_message";
  if (/success|הצלח|נשמר/i.test(t)) return "success_message";
  if (/warning|אזהרה/i.test(t)) return "warning";
  if (/disclaimer|הבהרה|שים לב/i.test(t)) return "disclaimer";
  if (/nav|menu|href/i.test(lineText)) return "navigation";
  if (/instruction|הוראות|כיצד|איך/i.test(t)) return "instruction";
  if (/info|מידע|שימו לב/i.test(t)) return "info";
  if (text.length > 60) return "explanation";
  return "other";
}

function classifyVisibility(rel, lineText, text, fn) {
  if (isCommentOrJSDoc(lineText)) {
    return { visibility: "internal_only", reason: "Comment/JSDoc — not rendered" };
  }
  if (/console\.(log|warn|error)|debug|_internal|trace/i.test(lineText)) {
    return { visibility: "internal_only", reason: "Debug/internal log" };
  }
  if (/pages\/api\//.test(rel) && /error|message|status|res\.json/i.test(lineText)) {
    return { visibility: "api_message_visible", reason: "API message to UI" };
  }
  if (/tooltip|title=\{|aria-label/i.test(lineText)) {
    return { visibility: "tooltip_visible", reason: "Tooltip/aria" };
  }
  if (/collapsed|accordion|details/i.test(lineText)) {
    return { visibility: "collapsed_visible", reason: "Collapsed section — verify" };
  }
  if (/modal|dialog|Dialog/i.test(lineText)) {
    return { visibility: "modal_visible", reason: "Modal/dialog layer" };
  }
  if (rel.startsWith("pages/") || rel.startsWith("components/") || /help-center|legal/i.test(rel)) {
    return { visibility: "default_visible", reason: "Page/component render layer" };
  }
  if (/LabelHe|_HE\s*=|He\s*[:=]|\.he\./i.test(lineText)) {
    return { visibility: "default_visible", reason: "Hebrew label map" };
  }
  if (fn && /He$|He\b|Label|Message|Title/i.test(fn)) {
    return { visibility: "default_visible", reason: `UI helper: ${fn}` };
  }
  return { visibility: "needs_review", reason: "Confirm user-visible render path" };
}

function problemType(text, visibility, copyType, rel) {
  if (!["default_visible", "api_message_visible", "modal_visible", "tooltip_visible", "collapsed_visible"].includes(visibility)) {
    return "";
  }
  const checks = [
    ["mixed_he_en", /[A-Za-z]{4,}/],
    ["engine_jargon", /מנוע|פער ידע|מסקנה חזקה/],
    ["technical_leak", /UUID|PIN\b|filterKey|localhost/],
    ["raw_key_leak", /^[a-z][a-z0-9_]{2,}$/i],
    ["placeholder_leak", /\$\{[^}]+\}|TODO|FIXME|undefined/],
    ["inconsistent_period", /טווח|תקופה/],
    ["unclear_cta", /^(המשך|הבא|אישור|שלח|בצע)$/],
    ["overly_formal", /בהתאם ל|על פי הוראות|לפיכך/],
    ["overly_childish", /וואו|יאי|מגניב/],
  ];
  const stripped = text.replace(/\$\{[^}]+\}/g, "");
  for (const [type, re] of checks) {
    const target = type === "raw_key_leak" ? text.trim() : stripped;
    if (re.test(target)) return type;
  }
  if (copyType === "error_message" && text.length < 8) return "vague_error";
  if (/help-center|policy|legal/i.test(rel) && text.length > 200) return "long_policy_block";
  return "";
}

function severityFor(problemType) {
  if (!problemType) return "";
  if (["technical_leak", "raw_key_leak", "placeholder_leak", "engine_jargon"].includes(problemType)) return "high";
  if (["mixed_he_en", "vague_error", "unclear_cta", "inconsistent_period"].includes(problemType)) return "medium";
  return "low";
}

function inferStateType(text) {
  const t = String(text);
  if (/error|שגיאה|נכשל/i.test(t)) return "error";
  if (/success|הצלח|נשמר|בוצע/i.test(t)) return "success";
  if (/warning|אזהרה|שים לב/i.test(t)) return "warning";
  if (/info|מידע|שימו לב/i.test(t)) return "info";
  if (/empty|אין |לא נמצא|עדיין אין/i.test(t)) return "empty";
  return "other";
}

function inferSubject(rel) {
  if (/math/i.test(rel)) return "math";
  if (/geometry/i.test(rel)) return "geometry";
  if (/english/i.test(rel)) return "english";
  if (/hebrew/i.test(rel)) return "hebrew";
  if (/science/i.test(rel)) return "science";
  if (/geography|moledet/i.test(rel)) return "geography";
  return "";
}

function inferGrade(rel, text) {
  const m = rel.match(/g([1-6])/i) || text.match(/כיתה\s*([א-ו1-6])/);
  return m ? m[1] : "";
}

function isHelpOnboardingPolicy(rel, surface, section, copyType) {
  return (
    ["help_center", "onboarding", "policy"].includes(surface) ||
    ["policy", "onboarding", "help"].includes(section) ||
    /help-center|legal|policy|terms|privacy|acceptance|disclosure|accessibility/i.test(rel) ||
    ["instruction", "explanation", "disclaimer"].includes(copyType)
  );
}

function isNavCtaButton(copyType, lineText, surface, section) {
  if (["button", "navigation"].includes(copyType)) return true;
  if (surface === "navigation" || section === "navigation") return true;
  return /button|btn|onClick|href=|<Link/i.test(lineText);
}

function isStateMessage(copyType, stateType) {
  return ["empty_state", "error_message", "success_message", "warning", "info"].includes(copyType) || ["empty", "error", "success", "warning", "info"].includes(stateType);
}

function isLearningUI(rel, surface) {
  return ["learning_lobby", "learning_screen"].includes(surface) || /pages\/learning|master\.js|curriculum/i.test(rel);
}

function meaningPlainHe(entry) {
  const ct = entry.copy_type;
  const surf = entry.surface;
  if (ct === "button") return "כפתור פעולה — הטקסט מגדיר מה קורה בלחיצה.";
  if (ct === "empty_state") return "הודעה כשאין תוכן להצגה.";
  if (ct === "error_message") return "הודעת שגיאה למשתמש.";
  if (ct === "instruction") return "הוראות שימוש או הסבר תהליך.";
  if (surf === "help_center") return "טקסט במרכז העזרה.";
  if (surf === "policy") return "טקסט מדיניות/הסכמה משפטי.";
  if (surf === "homepage") return "טקסט בדף הבית הציבורי.";
  if (surf === "learning_lobby" || surf === "learning_screen") return "טקסט בממשק הלמידה.";
  return "טקסט ממשק כללי שרואה המשתמש.";
}

function exampleBefore(entry) {
  const surf = entry.surface;
  const txt = entry.example_output || entry.current_hebrew;
  const map = {
    homepage: `בדף הבית: ${txt}`,
    navigation: `בניווט: ${txt}`,
    login: `במסך כניסה: ${txt}`,
    register: `בהרשמה: ${txt}`,
    dashboard: `בלוח בקרה: ${txt}`,
    help_center: `במרכז העזרה: ${txt}`,
    onboarding: `בהדרכה: ${txt}`,
    policy: `במדיניות/הסכמה: ${txt}`,
    learning_lobby: `בלובי למידה: ${txt}`,
    learning_screen: `במסך תרגול: ${txt}`,
    admin_ui: `בממשק ניהול: ${txt}`,
    api_message: `בהודעת מערכת: ${txt}`,
  };
  return map[surf] || txt;
}

function inferActionTriggered(copyType, text, lineText) {
  if (copyType !== "button" && !/onClick/i.test(lineText)) return "";
  if (/navigate|router\.push|href=/i.test(lineText)) return "navigation";
  if (/submit|save|שמירה/i.test(lineText + text)) return "submit_or_save";
  if (/close|סגירה|ביטול/i.test(text)) return "dismiss";
  if (/delete|מחיק/i.test(text)) return "destructive";
  return "generic_action";
}

function isOwnerCandidate(entry) {
  if (entry.visibility === "internal_only") return false;
  if (entry.severity === "high") return true;
  if (["policy", "help_center", "onboarding"].includes(entry.surface)) return true;
  if (entry.problem_type) return true;
  if (entry.copy_type === "empty_state" && entry.visibility !== "needs_review") return true;
  if (entry.copy_type === "error_message" && entry.text_length < 25) return true;
  if (/מנוע|UUID|PIN\b|TODO|undefined|\$\{/.test(entry.current_hebrew)) return true;
  if (/[A-Za-z]{5,}/.test(entry.current_hebrew) && !/LEO|KIDS|API/i.test(entry.current_hebrew)) return true;
  if (entry.surface === "homepage" && entry.copy_type === "heading") return true;
  return false;
}

function sheetFromObjects(rows, columns) {
  return [columns, ...rows.map((row) => columns.map((c) => row[c] ?? ""))];
}

function isPriorDuplicate(priorKeys, rel, line, text) {
  const k1 = `${rel}:${line}:${text.slice(0, 120)}`;
  const k2 = `${rel}::${text.slice(0, 120)}`;
  return priorKeys.has(k1) || priorKeys.has(k2);
}

// --- Main ---
const priorKeys = loadPriorInventoryKeys();
const files = [...new Set(SCAN_ROOTS.flatMap(collectFiles))].filter((f) => !shouldExclude(f)).sort();
const allEntries = [];
const seen = new Set();
let idSeq = 0;

for (const rel of files) {
  let content;
  try {
    content = readFileSync(join(ROOT, rel), "utf8");
  } catch {
    continue;
  }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentOrJSDoc(line)) continue;
    for (const hit of extractStringsFromLine(line)) {
      const key = `${rel}:${i + 1}:${hit.text.slice(0, 120)}`;
      if (seen.has(key)) continue;
      if (isPriorDuplicate(priorKeys, rel, i + 1, hit.text)) continue;
      seen.add(key);

      const fn = enclosingFunction(lines, i);
      const audience = inferAudience(rel);
      const surface = inferSurface(rel);
      const section = inferSection(rel, line);
      const copy_type = classifyCopyType(rel, hit.text, line);
      const { visibility, reason } = classifyVisibility(rel, line, hit.text, fn);
      const isTemplate = /\$\{/.test(hit.text);
      const pt = problemType(hit.text, visibility, copy_type, rel);
      const entry = {
        id: `SG-HE-${String(++idSeq).padStart(5, "0")}`,
        file: rel,
        function: fn,
        line: i + 1,
        audience,
        surface,
        section,
        current_hebrew: hit.text,
        example_output: isTemplate ? hit.text.replace(/\$\{[^}]+\}/g, "…") : hit.text,
        visibility,
        copy_type,
        problem_type: pt,
        severity: severityFor(pt),
        suggested_replacement: "",
        owner_approved_replacement: "",
        status: "pending_owner_review",
        notes: reason,
        line_context: line.trim().slice(0, 180),
        text_length: hit.text.length,
        state_type: inferStateType(hit.text),
        subject_if_known: inferSubject(rel),
        grade_if_known: inferGrade(rel, hit.text),
        purpose: section === "policy" ? "policy_legal" : section === "help" ? "user_guidance" : section === "onboarding" ? "onboarding" : "general_ui",
        action_triggered: inferActionTriggered(copy_type, hit.text, line.trim()),
        risk: pt || "",
      };
      allEntries.push(entry);
    }
  }
}

const generalVisible = allEntries.filter((e) =>
  ["default_visible", "api_message_visible", "modal_visible", "tooltip_visible", "collapsed_visible"].includes(e.visibility)
);
const needsReview = allEntries.filter((e) => e.visibility === "needs_review");
const internalOnly = allEntries.filter((e) => e.visibility === "internal_only");

const helpOnboardingPolicy = allEntries.filter((e) => isHelpOnboardingPolicy(e.file, e.surface, e.section, e.copy_type));
const navCtaButton = allEntries.filter((e) => isNavCtaButton(e.copy_type, e.line_context || "", e.surface, e.section));
const emptyErrorSuccess = allEntries.filter((e) => isStateMessage(e.copy_type, e.state_type));
const learningUI = allEntries.filter((e) => isLearningUI(e.file, e.surface));

const professionalRows = RISKY_TERMS.map(([term, category, allowed, replacementDirection]) => {
  const found = files.filter((f) => readFileSync(join(ROOT, f), "utf8").includes(term));
  return {
    term,
    category,
    allowed,
    replacement_direction: replacementDirection,
    files_found: found.slice(0, 12).join("; ") + (found.length > 12 ? ` (+${found.length - 12})` : ""),
    count: found.length,
    notes: "",
  };
});

const ownerCandidates = allEntries
  .filter(isOwnerCandidate)
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9) || b.text_length - a.text_length;
  })
  .slice(0, 350);

const topRisk = [...generalVisible]
  .filter((e) => e.problem_type || e.severity)
  .sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2, "": 3 };
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
  })
  .slice(0, 30);

const summaryRows = [
  { metric: "generated_at", value: new Date().toISOString(), notes: "Site general Hebrew copy inventory (read-only)" },
  { metric: "files_scanned", value: files.length, notes: "" },
  { metric: "prior_inventory_keys_loaded", value: priorKeys.size, notes: "Deduped against 3 prior inventories" },
  { metric: "hebrew_strings_templates_found", value: allEntries.length, notes: "After exclusions and dedup" },
  { metric: "general_visible", value: generalVisible.length, notes: "" },
  { metric: "help_onboarding_policy", value: helpOnboardingPolicy.length, notes: "" },
  { metric: "navigation_cta_button", value: navCtaButton.length, notes: "" },
  { metric: "empty_error_success_info", value: emptyErrorSuccess.length, notes: "" },
  { metric: "general_learning_ui", value: learningUI.length, notes: "" },
  { metric: "needs_review", value: needsReview.length, notes: "" },
  { metric: "internal_only", value: internalOnly.length, notes: "" },
  { metric: "owner_review_candidates", value: ownerCandidates.length, notes: "Focused first-pass list" },
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
    sheetFromObjects(generalVisible.concat(needsReview), [
      "id",
      "file",
      "function",
      "line",
      "audience",
      "surface",
      "section",
      "current_hebrew",
      "example_output",
      "visibility",
      "copy_type",
      "problem_type",
      "severity",
      "suggested_replacement",
      "owner_approved_replacement",
      "status",
      "notes",
    ])
  ),
  "General Visible Strings"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      helpOnboardingPolicy.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        audience: e.audience,
        surface: e.surface,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        purpose: e.purpose,
        risk: e.problem_type || e.risk,
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
        "purpose",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Help Onboarding Policy Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      navCtaButton.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        audience: e.audience,
        surface: e.surface,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        action_triggered: e.action_triggered,
        risk: e.problem_type || "",
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
        "action_triggered",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Navigation CTA Button Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      emptyErrorSuccess.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        audience: e.audience,
        surface: e.surface,
        state_type: e.state_type,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        risk: e.problem_type || "",
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
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "Empty Error Success Info"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      learningUI.map((e) => ({
        id: e.id,
        file: e.file,
        function: e.function,
        line: e.line,
        subject_if_known: e.subject_if_known,
        grade_if_known: e.grade_if_known,
        current_hebrew: e.current_hebrew,
        example_output: e.example_output,
        copy_type: e.copy_type,
        risk: e.problem_type || "",
        suggested_replacement: "",
        status: "pending_owner_review",
      })),
      [
        "id",
        "file",
        "function",
        "line",
        "subject_if_known",
        "grade_if_known",
        "current_hebrew",
        "example_output",
        "copy_type",
        "risk",
        "suggested_replacement",
        "status",
      ]
    )
  ),
  "General Learning UI Copy"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(professionalRows, [
      "term",
      "category",
      "allowed",
      "replacement_direction",
      "files_found",
      "count",
      "notes",
    ])
  ),
  "Risky Inconsistent Terms"
);

XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.aoa_to_sheet(
    sheetFromObjects(
      ownerCandidates.map((e) => ({
        id: e.id,
        audience: e.audience,
        surface: e.surface,
        section: e.section,
        copy_type: e.copy_type,
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
        "copy_type",
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
const xlsxPath = join(outDir, "site-general-hebrew-copy-inventory.xlsx");
XLSX.writeFile(wb, xlsxPath);

const md = `# Site General Hebrew Copy Inventory — Summary

Generated: ${new Date().toISOString()}

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | ${files.length} |
| Prior inventory keys (dedup) | ${priorKeys.size} |
| Hebrew strings/templates found | ${allEntries.length} |
| General-visible | ${generalVisible.length} |
| Help / onboarding / policy | ${helpOnboardingPolicy.length} |
| Navigation / CTA / button | ${navCtaButton.length} |
| Empty / error / success / info | ${emptyErrorSuccess.length} |
| General learning UI | ${learningUI.length} |
| Needs review | ${needsReview.length} |
| Internal-only | ${internalOnly.length} |
| Owner review candidates | ${ownerCandidates.length} |

## Top 30 highest-risk general Hebrew phrases

${topRisk.map((e, i) => `${i + 1}. **${e.severity || "n/a"}** [${e.audience}/${e.surface}/${e.copy_type}] — \`${e.current_hebrew.slice(0, 100)}${e.current_hebrew.length > 100 ? "…" : ""}\` (${e.file}:${e.line})`).join("\n")}

## Excluded from this scan

Parent report inventory, teacher/school report inventory, site decision-impacting inventory, student games/arcade/coins, live classroom docs, review-packages, curriculum question banks, test-only scripts.

## Notes

- No product source code modified.
- Excel: \`reports/site-general-hebrew-copy-inventory.xlsx\`
`;

writeFileSync(join(outDir, "site-general-hebrew-copy-inventory-summary.md"), md, "utf8");

console.log(
  JSON.stringify(
    {
      xlsxPath: relative(ROOT, xlsxPath),
      filesScanned: files.length,
      totalEntries: allEntries.length,
      generalVisible: generalVisible.length,
      helpOnboardingPolicy: helpOnboardingPolicy.length,
      navCtaButton: navCtaButton.length,
      emptyErrorSuccess: emptyErrorSuccess.length,
      learningUI: learningUI.length,
      needsReview: needsReview.length,
      ownerCandidates: ownerCandidates.length,
      topRiskCount: topRisk.length,
    },
    null,
    2
  )
);
