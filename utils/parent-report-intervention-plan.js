/**
 * Phase 8 — תוכנית התערבות מיקרומבנית לשורת נושא (מבוססת Phase 7).
 * טהור לוגית; לא תלוי React.
 */

/**
 * @typedef {"very_short"|"short"|"moderate"} InterventionDurationBand
 * @typedef {"light"|"focused"|"targeted"} InterventionIntensity
 * @typedef {"guided_practice"|"independent_practice"|"mixed"|"observation_block"} InterventionFormat
 * @typedef {"low"|"medium"|"high"} InterventionParentEffort
 */

/**
 * @param {object} ctx
 * @param {string} ctx.rootCause
 * @param {string} [ctx.rootCauseLabelHe]
 * @param {string} ctx.conclusionStrength
 * @param {boolean} ctx.shouldAvoidStrongConclusion
 * @param {string} ctx.recommendedInterventionType
 * @param {string} ctx.finalStep
 * @param {number} ctx.q
 * @param {number} ctx.accuracy
 * @param {string} [ctx.dataSufficiencyLevel]
 * @param {string} [ctx.evidenceStrength]
 * @param {string} [ctx.displayName]
 * @param {{ dominantMistakePattern?: string, learningStage?: string, retentionRisk?: string }|null} [ctx.phase9]
 */
export function buildInterventionPlanPhase8(ctx) {
  const rootCause = String(ctx?.rootCause || "mixed_signal");
  const conclusionStrength = String(ctx?.conclusionStrength || "moderate");
  const shouldAvoid = !!ctx?.shouldAvoidStrongConclusion;
  const sparse = (Number(ctx?.q) || 0) < 10 || String(ctx?.evidenceStrength || "") === "low";
  const displayName = String(ctx?.displayName || "הנושא").trim();

  let interventionDurationBand /** @type {InterventionDurationBand} */ = "short";
  let interventionIntensity /** @type {InterventionIntensity} */ = "focused";
  let interventionFormat /** @type {InterventionFormat} */ = "mixed";
  let interventionParentEffort /** @type {InterventionParentEffort} */ = "medium";
  let interventionGoal = "stabilize_signal";
  /** @type {string[]} */
  const stepsHe = [];
  let interventionSuccessSignalHe = "עקביות קטנה: אותה רמה עם פחות טעויות חוזרות.";
  let interventionStopSignalHe = "אם נוצר חוסר סבלנות או התנגדות - לעצור ולקצר עוד.";
  let doNowHe = "";
  let avoidNowHe = "";

  const capAggressivePlan = shouldAvoid || conclusionStrength === "withheld" || conclusionStrength === "tentative";

  if (rootCause === "insufficient_evidence" || conclusionStrength === "withheld") {
    interventionDurationBand = "very_short";
    interventionIntensity = "light";
    interventionFormat = "observation_block";
    interventionParentEffort = "low";
    interventionGoal = "collect_evidence";
    stepsHe.push(`לצפות ב 2–3 תרגולים קצרים בנושא ${displayName} באותה רמת קושי - לרשום רק האם הילד קורא את המשימה לפני מענה.`);
    stepsHe.push("לא לשנות כיתה או רמה בבית בשלב זה.");
    interventionSuccessSignalHe = "אחרי 2–3 מפגשים קצרים נראה אם הדפוס חוזר - אז אפשר להחמיר מיקוד.";
    interventionStopSignalHe = "אם כל מפגש הופך למאבק - לצמצם אל 5–7 דקות ולחזור למחר.";
    doNowHe = "תרגול קצר ומדיד: אותה משימה, אותה רמה, דגש על קריאה לפני תשובה.";
    avoidNowHe = "לא לגזור מסקנות עמוקות ולא להחמיר רמה בגלל תוצאה בודדת.";
  } else if (rootCause === "speed_pressure") {
    interventionDurationBand = sparse ? "very_short" : "short";
    interventionIntensity = capAggressivePlan ? "light" : "focused";
    interventionFormat = capAggressivePlan ? "observation_block" : "guided_practice";
    interventionParentEffort = capAggressivePlan ? "low" : "medium";
    interventionGoal = "accuracy_over_speed";
    stepsHe.push(`בנושא ${displayName} לבחור מצב רגוע (לא מרתון) לאותה רמת קושי - דיוק לפני שעון.`);
    stepsHe.push("מטרה: שני ניסיונות זהים ברצף עם בדיקה קצרה לפני שליחה.");
    interventionSuccessSignalHe = "כשהדיוק נשמר בלי לחץ זמן - אפשר לחזור בהדרגה למסלול מהיר יותר.";
    interventionStopSignalHe = "אם הילד מזדרז שוב - לחזור לרגע לתרגול ללא טיימר.";
    doNowHe = "תרגול אחד קצר בלי טיימר, עם עצירה לפני שליחה.";
    avoidNowHe = "לא להפוך חולשה במהירות לירידת רמה בכל המקצוע ולא לדחוף שיאים.";
  } else if (rootCause === "instruction_friction") {
    interventionDurationBand = "very_short";
    interventionIntensity = "light";
    interventionFormat = "guided_practice";
    interventionParentEffort = "medium";
    interventionGoal = "clarity_first";
    stepsHe.push(`משימה אחת בנושא ${displayName}: לקרוא יחד את הניסוח, לנסח במשפט מה מבקשים, ורק אז לפתור.`);
    stepsHe.push("רמז אחד בלבד אחרי ניסיון עצמי קצר - לא שרשרת רמזים.");
    interventionSuccessSignalHe = "כשהילד מתחיל לעצור לבד לפני תשובה - סימן שהעומס יורד.";
    interventionStopSignalHe = "אם נשארים על רמזים - לקצר את המשימה ולחזור למחר.";
    doNowHe = "משימה קצרה, ניסוח ברור, פחות הסברים ארוכים בזמן התרגול.";
    avoidNowHe = "לא להסביר כל פריט במילים רבות כשהקושי הוא בהבנת המשימה.";
  } else if (rootCause === "weak_independence") {
    interventionDurationBand = "short";
    interventionIntensity = capAggressivePlan ? "light" : "focused";
    interventionFormat = "mixed";
    interventionParentEffort = capAggressivePlan ? "low" : "medium";
    interventionGoal = "fade_support";
    stepsHe.push(`בנושא ${displayName}: שלב א׳ עם ליווי קצר, שלב ב׳ ניסיון עצמאי באותה משימה, השוואה בסוף.`);
    stepsHe.push("להגדיל רק מעט את החלק העצמאי כשהצלחה קטנה חוזרת פעמיים.");
    interventionSuccessSignalHe = "כשהילד מסיים שלב ב׳ לבד ברובו - אפשר להרחיב מעט.";
    interventionStopSignalHe = "אם העצמאות יורדת והטעויות עולות - לחזור ליחס הכוונה גבוה יותר לשבוע.";
    doNowHe = "להפריד בבירור בין \"ניסיון לבד\" לבין \"בדיקה יחד בסוף\".";
    avoidNowHe = "לא לעבור למתקדם לפני שני מפגשים עקביים עם עצמאות סבירה.";
  } else if (rootCause === "knowledge_gap" && !capAggressivePlan) {
    interventionDurationBand = sparse ? "short" : "moderate";
    interventionIntensity = sparse ? "focused" : "targeted";
    interventionFormat = "guided_practice";
    interventionParentEffort = sparse ? "medium" : "high";
    interventionGoal = "core_skill_gap";
    stepsHe.push(`בנושא ${displayName} לבחור 2–3 טעויות טיפוסיות ולחזור עליהן באותה רמה - לא להרחיב נושאים.`);
    stepsHe.push("פעמיים בשבוע, 8–12 דקות - מספיק לביסוס אם עקבי.");
    interventionSuccessSignalHe = "כשאותו סוג טעות נעלם בשני מפגשים רצופים - סימן לייצוב.";
    interventionStopSignalHe = "אם אין שיפור אחרי שבועיים של עקביות - לעצור ולבחון רמה או ניסוח.";
    doNowHe = "חזרה ממוקדת על טעויות דומות באותה רמת קושי.";
    avoidNowHe = "לא לדלג על בסיס ולא לפתוח יותר מדי נושאים במקביל.";
  } else if (rootCause === "careless_execution") {
    interventionDurationBand = "very_short";
    interventionIntensity = "light";
    interventionFormat = "independent_practice";
    interventionParentEffort = "low";
    interventionGoal = "execution_habits";
    stepsHe.push(`בנושא ${displayName} לבדוק לפני שליחה: ניסוח → תשובה → בדיקה מהירה (10 שניות).`);
    interventionSuccessSignalHe = "פחות טעויות \"מוכרות\" באותו סוג משימה.";
    interventionStopSignalHe = "אם הטעויות עמוקות יותר מרשלנות - לעבור לחיזוק מושגי.";
    doNowHe = "כל משימה עם עצירת בדיקה קצרה לפני סיום.";
    avoidNowHe = "לא להניח מיד שזה פער ידע עמוק כשיש שליטה חלקית.";
  } else if (rootCause === "mixed_signal" || rootCause === "early_stage_instability") {
    interventionDurationBand = "very_short";
    interventionIntensity = "light";
    interventionFormat = "observation_block";
    interventionParentEffort = "low";
    interventionGoal = "observe_and_stabilize";
    stepsHe.push(`בנושא ${displayName} לשמור על אותה הגדרה ולתעד הצלחות קטנות - לא לשנות משתנים רבים.`);
    interventionSuccessSignalHe = "כששני מפגשים רצופים נראים דומים - אפשר לבחור כיוון אחד.";
    interventionStopSignalHe = "אם התמונה משתנה מאוד בין מפגשים - להישאר עם תרגול קצר ולשים לב, בלי שינוי גדול.";
    doNowHe = "להמשיך באותה רמה ולבדוק את הדיוק אחרי כל מפגש.";
    avoidNowHe = "לא לנעול הסבר יחיד כשיש אותות מנוגדים.";
  } else {
    interventionDurationBand = "short";
    interventionIntensity = capAggressivePlan ? "light" : "focused";
    interventionFormat = capAggressivePlan ? "observation_block" : "mixed";
    interventionParentEffort = capAggressivePlan ? "low" : "medium";
    interventionGoal = "balanced_support";
    stepsHe.push(`בנושא ${displayName} תרגול קצר פעמיים בשבוע - מיקוד אחד לכל מפגש.`);
    interventionSuccessSignalHe = "שיפור קטן ועקבי בדיוק או בפחות טעויות חוזרות.";
    interventionStopSignalHe = "אם אין תנועה אחרי שבועיים - לעדכן את אופן התרגול.";
    doNowHe = "תרגול קצר וקבוע סביב אותה רמה.";
    avoidNowHe = "לא להעמיס יעדים גדולים כשהתמונה עדיין לא בשלה.";
  }

  if (capAggressivePlan && interventionIntensity === "targeted") {
    interventionIntensity = "focused";
  }
  if (capAggressivePlan && interventionFormat === "guided_practice" && rootCause === "knowledge_gap") {
    interventionFormat = "mixed";
    interventionParentEffort = "medium";
  }

  const p9 = ctx?.phase9 && typeof ctx.phase9 === "object" ? ctx.phase9 : null;
  const mp9 = String(p9?.dominantMistakePattern || "");
  const ls9 = String(p9?.learningStage || "");
  const rr9 = String(p9?.retentionRisk || "");
  if (mp9 === "concept_confusion" && stepsHe.length && !capAggressivePlan) {
    stepsHe.push(`התאמה לדפוס: לבודד משפט מפתח אחד בנושא ${displayName} ולחזור עליו לפני הרחבה.`);
  } else if (mp9 === "procedure_break" && stepsHe.length) {
    stepsHe.push(`התאמה לדפוס: לכתוב שלבביניים אחד בכל פעם - לא לדלג לתוצאה סופית מיד.`);
  } else if (mp9 === "speed_driven_error") {
    if (doNowHe && !doNowHe.includes("טיימר")) doNowHe = `${doNowHe} בלי טיימר בשלב זה.`.trim();
  } else if (mp9 === "instruction_misread" && stepsHe.length) {
    stepsHe.push("התאמה לדפוס: לקרוא את המשימה בקול ולנסח במילה אחת מה מבקשים - ואז לפתור.");
  }
  if (ls9 === "fragile_retention" || ls9 === "regression_signal" || rr9 === "high") {
    if (!avoidNowHe.includes("להרחיב") && !avoidNowHe.includes("קידום"))
      avoidNowHe = `${avoidNowHe || "לא להעמיס."} לא להרחיב רמה לפני חיזוק חוזר קצר.`.trim();
  }
  if (ls9 === "transfer_emerging" && doNowHe && !doNowHe.includes("עצמאות")) {
    doNowHe = `${doNowHe} אפשר ניסיון עצמאי קצר ואז בדיקה יחד.`.trim();
  }

  const interventionPlan = {
    version: 1,
    rootCause,
    headlineHe: `תוכנית מיקרו לנושא ${displayName}`,
    stepsHe: [...stepsHe],
    cadenceHe:
      interventionDurationBand === "very_short"
        ? "2–3 מפגשים קצרים בשבוע (5–8 דקות)"
        : interventionDurationBand === "short"
          ? "2 מפגשים בשבוע (כ 8–12 דקות)"
          : "2–3 מפגשים בשבוע (עד ~15 דקות)",
  };

  const interventionPlanHe = [interventionPlan.headlineHe, ...stepsHe, interventionPlan.cadenceHe]
    .filter(Boolean)
    .join(" ");

  return {
    interventionPlan,
    interventionPlanHe,
    interventionDurationBand,
    interventionIntensity,
    interventionFormat,
    interventionGoal,
    interventionSuccessSignalHe,
    interventionStopSignalHe,
    interventionParentEffort,
    doNowHe,
    avoidNowHe,
  };
}
