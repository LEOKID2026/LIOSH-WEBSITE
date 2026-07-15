/**
 * V2 detailed-report — parent-facing Hebrew only (params in, strings out).
 * No business rules: callers pass counts/flags already computed.
 */

import { confidenceLevelParentSummaryHe } from "./confidence-parent-he.js";

/**
 * @param {string[]} topFocusAreasHe
 */
export function executiveV2HomeFocusHe(topFocusAreasHe) {
  const areas = Array.isArray(topFocusAreasHe) ? topFocusAreasHe.filter(Boolean) : [];
  if (!areas.length) {
    return "עדיין אין מוקד ברור - השבוע כדאי לתרגל מעט בכמה נושאים ולראות מה נשאר יציב.";
  }
  return `להתמקד קודם ב: ${areas.slice(0, 2).join(" · ")}`;
}

/**
 * @param {{ units: number, diagnosed: number, uncertain: number, stable: number }} p
 * @returns {string[]}
 */
export function executiveV2MajorTrendsLinesHe(p) {
  const units = Math.max(0, Number(p.units) || 0);
  const diagnosed = Math.max(0, Number(p.diagnosed) || 0);
  const uncertain = Math.max(0, Number(p.uncertain) || 0);
  const stable = Math.max(0, Number(p.stable) || 0);
  const actionable = Math.max(diagnosed, stable);
  if (units === 0) {
    return [
      "בתקופה שנבחרה טרם נאספו מספיק נושאים כדי להשוות ביניהם.",
      "תרגול קצר ועקבי יוסיף תמונה שאפשר לסמוך עליה.",
    ];
  }
  if (units === 1 && stable > 0 && diagnosed === 0) {
    return [
      "בתקופה שנבחרה נבדק נושא אחד.",
      "הכיוון שם חיובי ועקבי; לפני הרחבה לנושאים נוספים עדיף לייצב עוד קצת תרגול באותו נושא.",
    ];
  }
  const line2 =
    stable === 0 && units >= 4
      ? `כשנבדקים יחסית הרבה נושאים במקביל, לא תמיד נראית מיד יציבות חזקה באותה משמעות בכולם - זה נורמלי; כדאי להמשיך בתרגול כדי לייצב מה שנראה חוזר.`
      : `נושאים שנשמרים טוב: ${stable} מתוך מה שנבדק. ב ${actionable} נושאים יש בסיס לשיחה ממוקדת בבית. ב ${uncertain} נושאים עדיין אין תמונה ברורה.`;
  return [`בתקופה שנבחרה נבדקו ${units} נושאים.`, line2];
}

/** @param {boolean} hasUncertain */
export function executiveV2MixedSignalNoticeHe(hasUncertain) {
  if (!hasUncertain) return "";
  return "בכמה נושאים התוצאות עדיין לא יציבות - עוד קצת תרגול יעזור לפני שקובעים כיוון ברור.";
}

/**
 * @param {number} diagnosed
 * @param {number} units
 * @param {number} stable
 */
export function executiveV2OverallConfidenceHe(diagnosed, units, stable = 0) {
  const d = Math.max(0, Number(diagnosed) || 0);
  const u = Math.max(0, Number(units) || 0);
  const s = Math.max(0, Number(stable) || 0);
  const actionable = Math.max(d, s);
  if (u === 0) {
    return "מבט כולל: עדיין אין מספיק נושאים בתקופה שנבחרה כדי לבנות תמונה ביתית ברורה.";
  }
  if (u === 1 && actionable === 0) {
    return "מבט כולל: בתקופה שנבחרה נבדק כרגע נושא אחד בלבד - נשארים עם ניסוח זהיר וממשיכים לאסוף עוד תרגול.";
  }
  return `מבט כולל: ב ${actionable} מתוך ${u} נושאים שנבדקו יש בסיס ראשוני לשיחה בבית על כיוון ממוקד.`;
}

/**
 * @param {number} stable
 * @param {number} diagnosed
 */
export function executiveV2EvidenceBalanceHe(stable, diagnosed) {
  const s = Math.max(0, Number(stable) || 0);
  const diag = Math.max(0, Number(diagnosed) || 0);
  const rest = Math.max(0, diag - s);
  return `נקודות שממשיכות להישמר בצורה טובה: ${s}; נושאים שכדאי לחזק או ללמוד עליהם עוד לפני שקובעים כיוון ברור: ${rest}.`;
}

/**
 * @param {{ p4Length: number, uncertainLength: number }} p
 */
export function executiveV2CautionNoteHe(p) {
  const p4 = Math.max(0, Number(p.p4Length) || 0);
  const u = Math.max(0, Number(p.uncertainLength) || 0);
  if (p4 > 0) return "יש נושאים שכדאי לשים עליהם לב השבוע - אפשר לשתף את המורה במה שמופיע בדוח ולבחור יחד צעד לימודי קצר לשבוע הקרוב.";
  if (u > 0) return "בחלק מהנושאים עדיין אין כיוון ברור - עוד קצת תרגול יבהיר את התמונה.";
  return "";
}

/** @param {number} unitsLength */
export function executiveV2ReportReadinessHe(unitsLength) {
  const n = Math.max(0, Number(unitsLength) || 0);
  return n >= 8
    ? "בתקופה שנבחרה יש מספיק תרגול כדי לדבר בזהירות על כיוון כללי בבית."
    : "התרגול בתקופה שנבחרה עדיין מצומצם - כדאי לקרוא את הסיכום בעיון ולהמשיך לאסוף תרגול.";
}

export function homePlanV2EmptyFallbackHe() {
  return "אין כרגע פעולה ביתית חד-משמעית - השבוע כדאי תרגול קצר וממוקד כדי להבהיר את הכיוון.";
}

export function nextPeriodGoalsV2EmptyFallbackHe() {
  return "היעד לשבוע הקרוב: יותר תרגול עקבי ורגוע, ואז אפשר לקבוע יעד קידום ברור.";
}

/**
 * @param {{ unitsLength: number, highPriorityCount: number, contradictoryCount: number }} p
 * @returns {string[]}
 */
export function crossSubjectV2BulletsHe(p) {
  const units = Math.max(0, Number(p.unitsLength) || 0);
  const hi = Math.max(0, Number(p.highPriorityCount) || 0);
  const strengthenCount = Math.max(0, Number(p.strengthenTopicCount) || 0);
  const c = Math.max(0, Number(p.contradictoryCount) || 0);
  /** @type {string[]} */
  const bullets = [];
  if (units > 0) {
    bullets.push(`במבט על כל המקצועות יחד: ${units} נושאים בתקופה שנבחרה.`);
  }
  if (hi > 0) {
    bullets.push(`${hi} נושאים שכדאי לעקוב אחריהם השבוע מקרוב.`);
  } else if (strengthenCount > 0) {
    bullets.push("יש כמה נושאים שכדאי לחזק בתקופה הקרובה.");
  }
  if (c > 0) {
    bullets.push(
      `ב ${c} נושאים התוצאות עדיין לא אחידות - עוד תרגול קצר יעזור לראות אם זה נשאר או מתייצב.`
    );
  }
  return bullets;
}

export function crossSubjectV2DataQualityNoteHe(unitsLength) {
  const n = Math.max(0, Number(unitsLength) || 0);
  return n < 8 ? "מספר הנושאים שנבדקו נמוך יחסית - ככל שיצטבר עוד תרגול התמונה תתבהר." : null;
}

export function subjectV2TrendNarrativeHighPriorityHe() {
  return "יש נושאים שכדאי לשים אליהם לב השבוע.";
}

export function subjectV2TrendNarrativeStableHe() {
  return "הדפוסים בתקופה שנבחרה נשמרים יחסית לאורך זמן.";
}

export function subjectV2RecalibrationNeedYesHe() {
  return "לפני שינוי כיוון או רמת קושי - עוד סיבוב תרגול קצר.";
}

/** Canonical “no recalibration” — keep in sync with `SubjectPhase3Insights` visibility filter */
export const SUBJECT_V2_RECALIBRATION_NEED_NO_HE = "אין צורך לשנות כיוון שכדאי להתמקד בו כרגע.";

export function subjectV2RecalibrationNeedNoHe() {
  return SUBJECT_V2_RECALIBRATION_NEED_NO_HE;
}

/** When output gating blocks a firm conclusion */
export function topicRecommendationV2CautionGatedHe() {
  return "בנושא הזה עדיין לא קובעים כיוון חזק - קודם עוד תרגול ממוקד באותו נושא.";
}

/**
 * @param {string|null|undefined} confidenceLevel
 */
export function subjectV2ConfidenceSummaryHe(confidenceLevel) {
  return confidenceLevelParentSummaryHe(confidenceLevel);
}
