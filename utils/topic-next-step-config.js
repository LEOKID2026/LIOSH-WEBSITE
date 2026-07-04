/**
 * ספים ופרמטרים למנוע topic-next-step — נקודת כיוון אחת.
 * ניתן לייבא ולהרחיב בעתיד (merge חלקי) בלי לשנות את לוגיקת ההחלטה.
 */

import { PARENT_EVIDENCE_VOLUME } from "./parent-report-language/parent-evidence-matrix.js";

export const DEFAULT_TOPIC_NEXT_STEP_CONFIG = {
  /** מקסימום נושאים עם המלצה למקצוע בדוח מקיף — לא מסתיר נושאים מ-topicOverviewRows / טבלת הדוח */
  maxTopicRecommendationsPerSubject: 15,

  /** מתחת לכך — לא משנים כיתה/רמת קושי; רק "לבסס באותה רמה" + הסבר דגימה */
  minQuestionsLowConfidence: PARENT_EVIDENCE_VOLUME.PRELIMINARY_MAX,
  /** מינימום שאלות לשינוי רמה/כיתה אגרסיבי (ירידה / מאבק חוזר) */
  minQuestionsStepChange: 14,
  minQuestionsAdvanceLevel: 18,
  minQuestionsAdvanceGrade: 22,
  minQuestionsRemediate: 10,

  /** יציבות: נפח עד 1 */
  stabilityVolumeDivisor: 28,
  /** משקל wrongRatio בתוך mistakePressure */
  stabilityWrongPenaltyCoef: 0.35,
  /** תקרת לחץ טעויות ביציבות */
  stabilityMistakePressureMax: 0.45,
  /** מכנה ב mistakePressure ליחס m/q */
  stabilityMistakeQDivisor: 8,

  /** ביטחון: 1 - exp(-q/div) */
  confidenceExpDivisor: 20,
  /** אם m > q * ratioHigh — הורדת ביטחון */
  confidenceMistakeRatioHigh: 1.8,
  confidenceMistakeRatioMid: 1,
  confidenceNoiseHigh: 0.75,
  confidenceNoiseMid: 0.88,

  /** מאבק חוזר */
  repeatedStruggleAccMax: 52,
  repeatedStruggleMistakesMin: 4,
  repeatedStruggleWrongRatio: 0.42,

  /** העלאת רמה */
  advanceLevelAccMin: 86,
  advanceLevelStabilityMin: 0.52,
  advanceLevelConfidenceMin: 0.48,

  /** העלאת רמה → מתקדם (Phase 6) */
  minQuestionsAdvanceToAdvanced: 20,
  advanceToAdvancedAccMin: 75,
  advanceToAdvancedMediumShareMin: 0.6,

  /** "משיכה" בגלל הרבה טעויות — חוסם העלאות */
  mistakeDragMistakesMin: 4,
  mistakeDragAccMax: 90,

  /** תחום בינוני אל remediate */
  remediateAccLo: 54,
  remediateAccHi: 68,

  /** העלאת כיתה בנושא */
  advanceGradeAccMin: 84,
  advanceGradeStabilityMin: 0.55,
  advanceGradeConfidenceMin: 0.55,

  /** ירידת רמה */
  dropLevelAccMax: 55,
  dropGradeAccMax: 52,

  /** פס remediate רחב */
  remediateBandAccLo: 48,
  remediateBandAccHi: 62,

  /** בניסוח: מתי להזכיר אירועי טעות במפורש */
  copyMentionMistakesMin: 3,
};
