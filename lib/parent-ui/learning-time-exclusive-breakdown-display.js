/**
 * Shared display helpers for learningTimeExclusiveBreakdown (add-only UI).
 * Uses exclusive post-union categories only — never raw overlapping source sums.
 */

const SUBJECT_LABEL_HE = Object.freeze({
  math: "מתמטיקה",
  geometry: "גאומטריה",
  english: "אנגלית",
  science: "מדעים",
  history: "היסטוריה",
  hebrew: "עברית",
  moledet: "מולדת",
  geography: "גאוגרפיה",
  moledet_geography: "מולדת וגאוגרפיה",
});

/**
 * @param {unknown} breakdown
 * @returns {null | {
 *   totalMinutes: number,
 *   questionPracticeMinutes: number,
 *   bookReadingMinutes: number,
 *   otherActiveLearningMinutes: number,
 *   analyzedQuestionCount: number,
 *   bySubject: Array<{ subjectKey: string, subjectLabelHe: string, questionPracticeMinutes: number, bookReadingMinutes: number }>
 * }}
 */
export function normalizeLearningTimeExclusiveBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== "object") return null;
  const totalMinutes = Number(breakdown.totalMinutes);
  const questionPracticeMinutes = Number(breakdown.questionPracticeMinutes);
  const bookReadingMinutes = Number(breakdown.bookReadingMinutes);
  const otherActiveLearningMinutes = Number(breakdown.otherActiveLearningMinutes);
  if (
    !Number.isFinite(totalMinutes) ||
    !Number.isFinite(questionPracticeMinutes) ||
    !Number.isFinite(bookReadingMinutes) ||
    !Number.isFinite(otherActiveLearningMinutes)
  ) {
    return null;
  }
  const analyzedQuestionCount = Math.max(
    0,
    Math.floor(Number(breakdown.analyzedQuestionCount) || 0)
  );
  const bySubjectRaw = Array.isArray(breakdown.bySubject) ? breakdown.bySubject : [];
  const bySubject = [];
  for (const row of bySubjectRaw) {
    if (!row || typeof row !== "object") continue;
    const subjectKey = String(row.subjectKey || "").trim();
    if (!subjectKey) continue;
    const q = Number(row.questionPracticeMinutes) || 0;
    const b = Number(row.bookReadingMinutes) || 0;
    if (q <= 0 && b <= 0) continue;
    bySubject.push({
      subjectKey,
      subjectLabelHe: SUBJECT_LABEL_HE[subjectKey] || subjectKey,
      questionPracticeMinutes: q,
      bookReadingMinutes: b,
    });
  }
  return {
    totalMinutes,
    questionPracticeMinutes,
    bookReadingMinutes,
    otherActiveLearningMinutes,
    analyzedQuestionCount,
    bySubject,
  };
}

/**
 * Same formatter for all surfaces — avoids display delta between rows and total.
 * @param {number} minutes
 */
export function formatExclusiveLearningMinutesHe(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

/**
 * Approved one-line summary for «מה עשינו בתקופה הזאת».
 * @param {ReturnType<typeof normalizeLearningTimeExclusiveBreakdown>} b
 */
export function formatLearningTimeDivisionLineHe(b) {
  if (!b) return "";
  const x = formatExclusiveLearningMinutesHe(b.questionPracticeMinutes);
  const y = formatExclusiveLearningMinutesHe(b.bookReadingMinutes);
  const z = formatExclusiveLearningMinutesHe(b.otherActiveLearningMinutes);
  return `חלוקת זמן הלמידה: תרגול עם שאלות: ${x} דק׳ · קריאת ספרים: ${y} דק׳ · למידה פעילה נוספת: ${z} דק׳`;
}
