/**
 * Full-school active daily simulation — constants and rules.
 * QA tooling only; does not modify product code.
 */

export const QUESTION_COUNT = 10;
export const START_DATE = "2025-09-01";
export const DEMO_STUDENT_COUNT = 398;
export const MAX_LEARNING_SESSIONS_RESET = 50_000;
export const MAX_ANSWERS_RESET = 500_000;

/** 6-type persona distribution (must sum to 1.0). */
export const PERSONA_SHARES = {
  struggling: 0.15,
  average: 0.45,
  good: 0.25,
  excellent: 0.05,
  inconsistent: 0.05,
  improving: 0.05,
};

export const ATTENDANCE_BY_PERSONA = {
  excellent: 0.95,
  good: 0.9,
  average: 0.8,
  improving: 0.75,
  struggling: 0.65,
  inconsistent: 0.4,
};

export const SCORE_RANGES = {
  struggling: [20, 50],
  average: [50, 70],
  good: [65, 85],
  excellent: [82, 100],
  inconsistent: [10, 90],
  improving: [35, 55],
};

export const WEAK_SUBJECT_ASSIGN_RATE = 0.3;
export const WEAK_SUBJECT_PENALTY = 18;

/** Subject available by grade (plan section 6). */
export function isSubjectAvailableForGrade(subject, grade) {
  const g = Number(grade) || 0;
  if (subject === "geometry") return g >= 2;
  if (subject === "moledet_geography") return g >= 3;
  return g >= 1 && g <= 6;
}

/** Replace moledet slot for grades 1-2 with extra hebrew/science. */
export function resolveSlotSubject(subject, grade, hourIndex) {
  if (!isSubjectAvailableForGrade(subject, grade)) {
    if (subject === "moledet_geography") return hourIndex % 2 === 0 ? "hebrew" : "science";
    if (subject === "geometry") return "math";
  }
  return subject;
}

/**
 * Activity mode by hour (1-based) and day index 0=Sun..4=Thu.
 */
export function activityModeForSlot({ subject, hour, weekdayIndex }) {
  if (weekdayIndex === 4 && hour === 6 && (subject === "math" || subject === "english")) {
    return "test";
  }
  if (hour <= 2) return "guided_practice";
  if (hour <= 4) {
    if (subject === "english" || subject === "hebrew") {
      return hour % 2 === 0 ? "guided_practice" : "homework";
    }
    if (subject === "geometry" || subject === "science") {
      return hour >= 4 ? "quiz" : "guided_practice";
    }
    return hour % 2 === 0 ? "guided_practice" : "homework";
  }
  if (subject === "geometry" || subject === "science") return "quiz";
  if (subject === "english" || subject === "hebrew") return "homework";
  return "guided_practice";
}

export const UI_SAMPLE_SIZE = 15;
export const UI_SAMPLE_MIN_PER_GRADE = 1;
export const R3_BROWSER_SAMPLE_COUNT = 3;

export const TEACHER_EMAILS = {
  dan: "dan@leo-k.com",
  vered: "vered@leo-k.com",
  noam: "noam@leo-k.com",
  sara: "sara@leo-k.com",
  michal: "michal@leo-k.com",
  alon: "alon@leo-k.com",
  rachel: "rachel@leo-k.com",
  yael: "yael@leo-k.com",
  david: "david@leo-k.com",
  liron: "liron@leo-k.com",
  tamar: "tamar@leo-k.com",
};

export const TEACHER_SUBJECTS = {
  dan: ["math", "geometry"],
  vered: ["math", "geometry"],
  noam: ["math", "geometry"],
  sara: ["english"],
  michal: ["english"],
  alon: ["english"],
  rachel: ["hebrew", "moledet_geography"],
  yael: ["hebrew", "moledet_geography"],
  david: ["hebrew", "moledet_geography"],
  liron: ["science"],
  tamar: ["science"],
};

export const SCHOOL_MANAGER_EMAIL = "school@leo-k.com";
export const DEMO_PARENT_EMAIL = "demofamily@leo-k.com";

export function defaultBaseUrl() {
  return (
    process.env.SCHOOL_SIM_BASE_URL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.VIRTUAL_STUDENT_BASE_URL ||
    "https://liosh-website.vercel.app"
  );
}
