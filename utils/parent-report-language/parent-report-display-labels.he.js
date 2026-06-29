/**
 * SSOT — Hebrew labels for parent report UI (screen + PDF).
 * Internal enum keys stay English; never show raw keys to parents.
 */

import { subjectLabelHe as platformSubjectLabelHe } from "../../lib/platform-ui/hebrew-display-labels.js";
import { formatParentReportGradeLabel } from "../math-report-generator.js";
import { normalizeParentFacingHe } from "./parent-facing-normalize-he.js";

/** @type {Record<string, string>} */
export const PARENT_REPORT_SUBJECT_LABELS_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  hebrew: "עברית",
  science: "מדעים",
  moledet: "מולדת",
  geography: "גאוגרפיה",
  moledet_geography: "מולדת וגאוגרפיה",
  "moledet-geography": "מולדת וגאוגרפיה",
};

/** @type {Record<string, string>} */
export const PARENT_REPORT_MODE_LABELS_HE = {
  learning: "למידה",
  practice: "תרגול",
  challenge: "אתגר",
  speed: "מהירות",
  marathon: "תרגול ארוך",
  review: "חזרה",
  drill: "תרגול ממוקד",
  graded: "מדורג",
  normal: "רגיל",
  mistakes: "טעויות",
  practice_mistakes: "חזרה על טעויות",
  quiz: "בוחן",
  homework: "שיעורי בית",
  guided_practice: "תרגול מודרך",
  guided: "תרגול מודרך",
  live_lesson: "שיעור חי",
  discussion: "דיון",
  worksheet: "דף עבודה",
  learning_book: "ספר לימוד",
  diagnostic: "אבחון",
  independent: "תרגול עצמאי",
  self_practice: "תרגול עצמאי",
  parent_assigned_activity: "פעילות אישית",
  classroom_assigned_activity: "פעילות מהכיתה",
  unknown: "לא ידוע",
};

/** @type {Record<string, string>} */
export const PARENT_REPORT_SOURCE_LABELS_HE = {
  self_practice: "תרגול עצמי",
  parent_assigned_activity: "פעילות אישית",
  learning_book: "ספר לימוד",
  worksheet: "דף עבודה",
  classroom_assigned_activity: "פעילות מהכיתה",
  report: "דוח",
  activity: "פעילות",
  unknown: "לא ידוע",
  unavailable: "לא זמין",
  partial: "חלקי",
  available: "זמין",
  not_tracked: "לא נמדד",
  requires_events: "דורש איסוף נתונים",
};

/** @type {Record<string, string>} */
export const PARENT_REPORT_STATUS_LABELS_HE = {
  completed: "הושלם",
  active: "פעיל",
  inactive: "לא פעיל",
  submitted: "הוגש",
  in_progress: "בתהליך",
  not_started: "טרם התחיל",
  sufficient: "מספיק",
  insufficient: "לא מספיק",
  unavailable: "לא זמין",
  partial: "חלקי",
  empty: "אין נתונים",
  unknown: "לא ידוע",
  not_tracked: "לא נמדד",
  requires_events: "דורש איסוף נתונים",
  available: "זמין",
  true: "כן",
  false: "לא",
};

/** @type {Record<string, string>} */
export const PARENT_REPORT_LEVEL_LABELS_HE = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
  low: "נמוך",
  high: "גבוה",
  moderate: "בינוני",
  strong: "חזק",
  weak: "חלש",
};

/** @type {Record<string, string>} */
export const PARENT_REPORT_EVIDENCE_LABELS_HE = {
  low: "מוגבל",
  medium: "בינוני",
  strong: "טוב",
  high: "גבוה",
  moderate: "בינוני",
  contradictory: "לא אחיד",
  insufficient: "לא מספיק",
  sufficient: "מספיק",
  unknown: "לא ידוע",
  partial: "חלקי",
  no_data: "אין נתונים",
  nodata: "אין נתונים",
};

const HEBREW_CHAR = /[\u0590-\u05FF]/;

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mapFromTable(value, table, fallback = "—") {
  const key = normalizeKey(value);
  if (!key) return fallback;
  if (table[key]) return table[key];
  if (key.includes(":")) {
    return key
      .split(":")
      .map((part) => mapFromTable(part, table, part.replace(/_/g, " ")))
      .join(" · ");
  }
  if (HEBREW_CHAR.test(String(value || ""))) return String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  return fallback;
}

/** @param {string|null|undefined} subjectId */
export function formatParentReportSubjectHe(subjectId) {
  const key = normalizeKey(subjectId);
  if (!key || key === "unknown") return "לא ידוע";
  if (PARENT_REPORT_SUBJECT_LABELS_HE[key]) return PARENT_REPORT_SUBJECT_LABELS_HE[key];
  const platform = platformSubjectLabelHe(key);
  if (platform && platform !== "—") return platform;
  return "לא ידוע";
}

/** @param {string|null|undefined} topic */
export function formatParentReportTopicHe(topic) {
  const raw = String(topic || "").trim();
  if (!raw) return "נושא";
  if (HEBREW_CHAR.test(raw)) return normalizeParentFacingHe(raw);
  return normalizeParentFacingHe(mapFromTable(raw, PARENT_REPORT_MODE_LABELS_HE, raw.replace(/_/g, " ")));
}

/** @param {string|null|undefined} mode */
export function formatParentReportModeHe(mode) {
  return mapFromTable(mode, PARENT_REPORT_MODE_LABELS_HE, "לא זמין");
}

/** @param {string|null|undefined} source */
export function formatParentReportSourceHe(source) {
  return mapFromTable(source, PARENT_REPORT_SOURCE_LABELS_HE, "לא ידוע");
}

/** @param {string|null|undefined} status */
export function formatParentReportStatusHe(status) {
  return mapFromTable(status, PARENT_REPORT_STATUS_LABELS_HE, "—");
}

/** @param {string|null|undefined} level */
export function formatParentReportLevelHe(level) {
  return mapFromTable(level, PARENT_REPORT_LEVEL_LABELS_HE, "לא זמין");
}

/** @param {string|null|undefined} grade */
export function formatParentReportGradeHe(grade) {
  const label = formatParentReportGradeLabel(grade);
  if (label && label !== "לא זמין") return label;
  return mapFromTable(grade, PARENT_REPORT_LEVEL_LABELS_HE, "לא זמין");
}

/** @param {string|null|undefined} evidence */
export function formatParentReportEvidenceHe(evidence) {
  return mapFromTable(evidence, PARENT_REPORT_EVIDENCE_LABELS_HE, "—");
}

/** @param {string|null|undefined} label */
export function formatParentReportLabelHe(label) {
  const raw = String(label || "").trim();
  if (!raw) return "—";
  if (HEBREW_CHAR.test(raw)) return normalizeParentFacingHe(raw);

  const key = normalizeKey(raw);
  if (PARENT_REPORT_SUBJECT_LABELS_HE[key]) return PARENT_REPORT_SUBJECT_LABELS_HE[key];
  if (PARENT_REPORT_MODE_LABELS_HE[key]) return PARENT_REPORT_MODE_LABELS_HE[key];
  if (PARENT_REPORT_SOURCE_LABELS_HE[key]) return PARENT_REPORT_SOURCE_LABELS_HE[key];
  if (PARENT_REPORT_STATUS_LABELS_HE[key]) return PARENT_REPORT_STATUS_LABELS_HE[key];
  if (PARENT_REPORT_LEVEL_LABELS_HE[key]) return PARENT_REPORT_LEVEL_LABELS_HE[key];
  if (PARENT_REPORT_EVIDENCE_LABELS_HE[key]) return PARENT_REPORT_EVIDENCE_LABELS_HE[key];

  if (raw.includes(" · ")) {
    return raw
      .split(" · ")
      .map((part) => formatParentReportLabelHe(part.trim()))
      .join(" · ");
  }

  return normalizeParentFacingHe(raw.replace(/_/g, " "));
}

/** English enum tokens that must never appear in parent-visible report copy. */
export const PARENT_REPORT_FORBIDDEN_ENGLISH_ENUMS = Object.freeze([
  "self_practice",
  "parent_assigned_activity",
  "learning_book",
  "guided_practice",
  "classroom_assigned_activity",
  "practice_mistakes",
  "learning_book",
  "requires_events",
  "not_tracked",
  "diagnosticenginev2",
  "unknown_scope",
  "registered_grade_primary",
  "enrichment_stretch",
  "prerequisite_foundation",
]);

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findParentReportEnglishEnumLeaks(text) {
  const lower = String(text || "").toLowerCase();
  const hits = [];
  for (const token of PARENT_REPORT_FORBIDDEN_ENGLISH_ENUMS) {
    const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) hits.push(token);
  }
  for (const token of ["math", "english", "hebrew", "science", "geometry", "moledet"]) {
    const re = new RegExp(`\\b${token}\\b`, "i");
    if (re.test(lower) && !HEBREW_CHAR.test(text)) hits.push(token);
  }
  return hits;
}
