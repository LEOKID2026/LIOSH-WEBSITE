/**
 * Global subject evidence tiers for parent reports (all six subjects).
 * - none: 0 questions — no diagnostic conclusions
 * - thin: 1..VALID_MIN-1 — cautious wording only
 * - valid: VALID_MIN+ — may appear in insights/recommendations
 */

export const SUBJECT_VALID_MIN_QUESTIONS = 8;

export const SUBJECT_EVIDENCE_TIER = Object.freeze({
  none: "none",
  thin: "thin",
  valid: "valid",
});

/** Wording that must never accompany zero-question subjects. */
export const ZERO_EVIDENCE_FORBIDDEN_RE =
  /כיוון ראשוני|אפשר לקבל כיוון|תחום לחיזוק|נושא למעקב|מגמה|כדאי לתרגל עוד כדי לחזק|דורש חיזוק|דורש תשומת לב|מעט מדי לסיכום עשיר/u;

/**
 * @param {number} questionCount
 * @returns {typeof SUBJECT_EVIDENCE_TIER[keyof typeof SUBJECT_EVIDENCE_TIER]}
 */
export function classifySubjectEvidenceTier(questionCount) {
  const q = Math.max(0, Math.floor(Number(questionCount) || 0));
  if (q === 0) return SUBJECT_EVIDENCE_TIER.none;
  if (q < SUBJECT_VALID_MIN_QUESTIONS) return SUBJECT_EVIDENCE_TIER.thin;
  return SUBJECT_EVIDENCE_TIER.valid;
}

/**
 * @param {string} subjectLabel
 */
export function zeroEvidenceSubjectLineHe(subjectLabel) {
  return `${subjectLabel}: לא תורגל בתקופה שנבחרה`;
}

/**
 * @param {string} subjectLabel
 * @param {number} q
 */
export function thinEvidenceSubjectLineHe(subjectLabel, q) {
  const n = Math.max(0, Math.floor(Number(q) || 0));
  return `${subjectLabel}: ${n} שאלות בתקופה שנבחרה — עדיין מעט נתון; כדאי להמשיך לתרגל ולבדוק שוב`;
}

/**
 * @param {string} subjectLabel
 * @param {number} q
 */
export function insufficientSubjectQuestionsLineHe(subjectLabel, q) {
  const tier = classifySubjectEvidenceTier(q);
  if (tier === SUBJECT_EVIDENCE_TIER.none) return zeroEvidenceSubjectLineHe(subjectLabel);
  if (tier === SUBJECT_EVIDENCE_TIER.thin) return thinEvidenceSubjectLineHe(subjectLabel, q);
  return null;
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} subjectLabelById
 */
export function buildSubjectEvidenceCoverageLines(subjectQuestionCounts, subjectLabelById) {
  /** @type {string[]} */
  const notPracticedSubjectsHe = [];
  /** @type {string[]} */
  const thinEvidenceSubjectsHe = [];
  for (const [sid, label] of Object.entries(subjectLabelById)) {
    const q = Math.max(0, Math.floor(Number(subjectQuestionCounts[sid]) || 0));
    const tier = classifySubjectEvidenceTier(q);
    if (tier === SUBJECT_EVIDENCE_TIER.none) {
      notPracticedSubjectsHe.push(zeroEvidenceSubjectLineHe(label));
    } else if (tier === SUBJECT_EVIDENCE_TIER.thin) {
      thinEvidenceSubjectsHe.push(thinEvidenceSubjectLineHe(label, q));
    }
  }
  return {
    /** Per-subject lines — for dedicated coverage tooling only; omit from diagnostic overview UI */
    notPracticedSubjectsHe,
    thinEvidenceSubjectsHe,
    /** @deprecated use thinEvidenceSubjectsHe — never includes zero-q subjects */
    insufficientDataSubjectsHe: thinEvidenceSubjectsHe,
    notPracticedSubjectsSummaryHe: notPracticedSubjectsSummaryLineHe(
      subjectQuestionCounts,
      subjectLabelById,
    ),
  };
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 */
export function practicedSubjectIds(subjectQuestionCounts) {
  return Object.keys(subjectQuestionCounts || {}).filter(
    (sid) => classifySubjectEvidenceTier(subjectQuestionCounts[sid]) === SUBJECT_EVIDENCE_TIER.valid,
  );
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} subjectLabelById
 */
export function practicedSubjectsSummaryLineHe(subjectQuestionCounts, subjectLabelById) {
  const practiced = Object.entries(subjectLabelById)
    .filter(([sid]) => classifySubjectEvidenceTier(subjectQuestionCounts[sid]) !== SUBJECT_EVIDENCE_TIER.none)
    .map(([, label]) => label);
  if (practiced.length === 0) return "בתקופה שנבחרה לא תועד תרגול במקצועות שבדוח.";
  if (practiced.length === 1) return `המקצוע שתורגל בתקופה: ${practiced[0]}.`;
  return `המקצועות שתורגלו בתקופה: ${practiced.join(", ")}.`;
}

/**
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} subjectLabelById
 */
export function notPracticedSubjectsSummaryLineHe(subjectQuestionCounts, subjectLabelById) {
  const labels = Object.entries(subjectLabelById)
    .filter(([sid]) => classifySubjectEvidenceTier(subjectQuestionCounts[sid]) === SUBJECT_EVIDENCE_TIER.none)
    .map(([, label]) => label);
  if (!labels.length) return null;
  return `מקצועות שלא תורגלו בתקופה: ${labels.join(", ")}.`;
}

/**
 * @param {string} subjectLabel
 */
export function zeroEvidenceSubjectCopilotHe(subjectLabel) {
  return `בתקופה הזו אין נתוני תרגול ב${subjectLabel}, לכן אי אפשר להסיק מסקנה מהדוח הנוכחי.`;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function textViolatesZeroEvidencePolicy(text) {
  return ZERO_EVIDENCE_FORBIDDEN_RE.test(String(text || ""));
}

/**
 * @param {string[]} lines
 * @param {Record<string, number>} subjectQuestionCounts
 * @param {Record<string, string>} subjectLabelById
 */
export function filterInsightLinesForUnpracticedSubjects(lines, subjectQuestionCounts, subjectLabelById) {
  const zeroLabels = new Set(
    Object.entries(subjectLabelById)
      .filter(([sid]) => classifySubjectEvidenceTier(subjectQuestionCounts[sid]) === SUBJECT_EVIDENCE_TIER.none)
      .map(([, label]) => label),
  );
  return (lines || []).filter((line) => {
    const t = String(line || "");
    if (!t) return false;
    for (const label of zeroLabels) {
      if (t.startsWith(`${label}:`) || t.startsWith(`${label} —`) || t.includes(`${label}:`)) {
        return false;
      }
    }
    return true;
  });
}

export default {
  SUBJECT_VALID_MIN_QUESTIONS,
  SUBJECT_EVIDENCE_TIER,
  ZERO_EVIDENCE_FORBIDDEN_RE,
  classifySubjectEvidenceTier,
  zeroEvidenceSubjectLineHe,
  thinEvidenceSubjectLineHe,
  insufficientSubjectQuestionsLineHe,
  buildSubjectEvidenceCoverageLines,
  practicedSubjectIds,
  practicedSubjectsSummaryLineHe,
  notPracticedSubjectsSummaryLineHe,
  zeroEvidenceSubjectCopilotHe,
  textViolatesZeroEvidencePolicy,
  filterInsightLinesForUnpracticedSubjects,
};
