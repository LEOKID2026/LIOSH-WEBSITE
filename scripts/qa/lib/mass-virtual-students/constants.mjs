/** Mass virtual-student QA simulation — shared constants. */

export const SEED_META_KEY = "massVirtualStudents";

export const LAUNCH_SUBJECTS = ["math", "geometry", "hebrew", "english", "science"];

export const GRADES = [1, 2, 3, 4, 5, 6];

export const GRADE_KEYS = GRADES.map((g) => `g${g}`);

export const QA_EMAIL_DOMAIN = "leo.test";

export const DEFAULT_PARENT_PASSWORD = "747975";

/** 4-digit student PIN derived from QA password (product requires 4 digits). */
export const DEFAULT_STUDENT_PIN = "7975";

export const ACTIVITY_SOURCES = ["self_practice", "parent_assigned_activity"];

export const ENGINE_DECISIONS = [
  "mastery_stable",
  "partial_stable",
  "topic_needs_strengthening",
  "clear_topic_gap",
  "early_direction_only",
  "insufficient_data",
  "speed_pressure_pattern",
];

/**
 * Planned behavior profiles — not random; each student gets one fixed profile.
 * @type {Array<{ id: string, labelHe: string, correctRate: number, attendance: number, evolution: 'flat'|'improving'|'declining'|'inconsistent', activityMix: { self: number, parent: number }, sparse?: boolean, speedPressure?: boolean }>}
 */
export const BEHAVIOR_PROFILES = [
  { id: "strong", labelHe: "חזק", correctRate: 0.92, attendance: 0.95, evolution: "flat", activityMix: { self: 0.85, parent: 0.15 } },
  { id: "weak", labelHe: "חלש", correctRate: 0.42, attendance: 0.7, evolution: "flat", activityMix: { self: 0.9, parent: 0.1 } },
  { id: "average", labelHe: "בינוני", correctRate: 0.72, attendance: 0.85, evolution: "flat", activityMix: { self: 0.8, parent: 0.2 } },
  { id: "single_topic_gap", labelHe: "פער בנושא אחד", correctRate: 0.68, attendance: 0.8, evolution: "flat", activityMix: { self: 0.75, parent: 0.25 }, weaknessTopics: 1 },
  { id: "multi_topic_gap", labelHe: "פערים בכמה נושאים", correctRate: 0.55, attendance: 0.75, evolution: "flat", activityMix: { self: 0.7, parent: 0.3 }, weaknessTopics: 3 },
  { id: "slow_accurate", labelHe: "איטי מדויק", correctRate: 0.88, attendance: 0.6, evolution: "flat", activityMix: { self: 1, parent: 0 }, speedPressure: false },
  { id: "fast_errors", labelHe: "מהיר טועה", correctRate: 0.48, attendance: 0.85, evolution: "flat", activityMix: { self: 1, parent: 0 }, speedPressure: true },
  { id: "improving", labelHe: "משתפר", correctRate: 0.55, attendance: 0.8, evolution: "improving", activityMix: { self: 0.85, parent: 0.15 } },
  { id: "declining", labelHe: "מידרדר", correctRate: 0.78, attendance: 0.75, evolution: "declining", activityMix: { self: 0.85, parent: 0.15 } },
  { id: "unstable", labelHe: "לא יציב", correctRate: 0.65, attendance: 0.45, evolution: "inconsistent", activityMix: { self: 0.9, parent: 0.1 } },
  { id: "sparse_data", labelHe: "מעט נתונים", correctRate: 0.7, attendance: 0.25, evolution: "flat", activityMix: { self: 1, parent: 0 }, sparse: true },
  { id: "self_practice_only", labelHe: "תרגול עצמי בלבד", correctRate: 0.75, attendance: 0.8, evolution: "flat", activityMix: { self: 1, parent: 0 } },
  { id: "parent_assigned_only", labelHe: "פעילות מהורה בלבד", correctRate: 0.7, attendance: 0.7, evolution: "flat", activityMix: { self: 0, parent: 1 } },
  { id: "mixed_sources", labelHe: "שילוב מקורות", correctRate: 0.73, attendance: 0.82, evolution: "flat", activityMix: { self: 0.55, parent: 0.45 } },
];

export const SUBJECT_LABELS_HE = {
  math: "מתמטיקה",
  geometry: "גאומטריה",
  hebrew: "עברית",
  english: "אנגלית",
  science: "מדעים",
};

export const GRADE_LABELS_HE = {
  1: "א",
  2: "ב",
  3: "ג",
  4: "ד",
  5: "ה",
  6: "ו",
};

/** Forbidden English patterns in parent-facing report text (basic guard). */
export const FORBIDDEN_ENGLISH_PATTERNS = [
  /\b(undefined|null|NaN|object Object)\b/i,
  /\b(error|exception|stack trace)\b/i,
  /\bAPI\b/,
  /\bHTTP\b/,
  /\bJSON\b/,
  /\bself_practice\b/,
  /\bparent_assigned\b/,
];

/** Technical tokens that must not appear in parent report copy. */
export const FORBIDDEN_TECHNICAL_PATTERNS = [
  /engineDecision/i,
  /metadataConfidence/i,
  /subSkill/i,
  /questionFingerprint/i,
  /T[0-4]_/,
];
