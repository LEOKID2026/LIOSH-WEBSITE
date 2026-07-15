/**
 * Phase 14 — סדר עבודה: יסוד לפני הרחבה מול טיפול מקומי (מבוסס תלות + שערים).
 */

import {
  FOUNDATION_DECISION_LABEL_HE,
  INTERVENTION_ORDERING_LABEL_HE,
  NEXT_CYCLE_SUPPORT_LEVEL_LABEL_HE,
} from "./parent-report-ui-explain-he.js";

/**
 * @param {Record<string, unknown>} p merged dependency + gates + targets
 *
 * Phase 15 — קדימות פנימית (ללא מנוע חדש):
 * 1) `insufficient_dependency_evidence` או mixed עם conf נמוך → תמיד evidence-first לפני foundation_first.
 * 2) `likely_foundational_block` + shouldTreat + conf moderate|high → foundation_first; אחרת gather או local.
 * 3) שערי advance/release ב-forming רק מחזקים foundationBeforeExpansion — לא דורסים החלטת dependency.
 */
export function buildFoundationOrderingPhase14(p) {
  const dep = String(p?.dependencyState || "");
  const conf = String(p?.dependencyConfidence || "low");
  const shouldF = !!p?.shouldTreatAsFoundationFirst;
  const adv = String(p?.advanceGate || "");
  const rel = String(p?.releaseGate || "");
  const nextFocus = String(p?.nextCycleDecisionFocus || "");

  let foundationDecision = "treat_locally";
  let interventionOrdering = "local_support_first";
  let nextCycleSupportLevel = "narrow_local";
  let foundationBeforeExpansion = false;

  if (dep === "insufficient_dependency_evidence" || (dep === "mixed_dependency_signal" && conf === "low")) {
    foundationDecision = "collect_dependency_evidence_first";
    interventionOrdering = "gather_dependency_evidence_first";
    nextCycleSupportLevel = "evidence_first";
  } else if (dep === "mixed_dependency_signal") {
    foundationDecision = "run_parallel_light_support";
    interventionOrdering = "parallel_light_support";
    nextCycleSupportLevel = "blended_light";
    foundationBeforeExpansion = true;
  } else if (dep === "likely_foundational_block" && shouldF && (conf === "moderate" || conf === "high")) {
    foundationDecision = "stabilize_foundation_first";
    interventionOrdering = "foundation_first";
    nextCycleSupportLevel = "foundation_targeted";
    foundationBeforeExpansion = true;
  } else if (dep === "likely_foundational_block") {
    foundationDecision = "collect_dependency_evidence_first";
    interventionOrdering = "gather_dependency_evidence_first";
    nextCycleSupportLevel = "evidence_first";
    foundationBeforeExpansion = nextFocus.includes("refresh") || nextFocus.includes("prove");
  } else {
    foundationDecision = "treat_locally";
    interventionOrdering = "local_support_first";
    nextCycleSupportLevel = "narrow_local";
  }

  if (dep === "likely_foundational_block" && (adv === "forming" || rel === "forming")) {
    foundationBeforeExpansion = true;
  }

  let foundationBeforeExpansionHe = "";
  if (foundationBeforeExpansion && dep === "likely_foundational_block") {
    foundationBeforeExpansionHe =
      "לפני שמרחיבים את הדרישה בנושא הזה, כדאי לחזק קודם את היסוד שעליו הוא נשען - ואז לחדד.";
  } else if (foundationBeforeExpansion && dep === "mixed_dependency_signal") {
    foundationBeforeExpansionHe = "כדאי לא לפתוח הרחבה כפולה בבת אחת - צעד קל על בסיס וצעד ממוקד בנושא.";
  } else if (foundationBeforeExpansion && (adv === "forming" || rel === "forming")) {
    foundationBeforeExpansionHe =
      "בזמן שיש חשד לפער יסוד - עדיף לרכך שחרור/קידום עד שיש יותר יציבות בסיס.";
  }

  return {
    foundationDecision,
    foundationDecisionLabelHe:
      FOUNDATION_DECISION_LABEL_HE[foundationDecision] || FOUNDATION_DECISION_LABEL_HE.treat_locally,
    nextCycleSupportLevel,
    nextCycleSupportLevelHe:
      NEXT_CYCLE_SUPPORT_LEVEL_LABEL_HE[nextCycleSupportLevel] || NEXT_CYCLE_SUPPORT_LEVEL_LABEL_HE.narrow_local,
    foundationBeforeExpansion,
    foundationBeforeExpansionHe,
    interventionOrdering,
    interventionOrderingHe:
      INTERVENTION_ORDERING_LABEL_HE[interventionOrdering] || INTERVENTION_ORDERING_LABEL_HE.local_support_first,
  };
}

/**
 * @param {Record<string, unknown>} p
 */
export function buildPhase14RecommendationOverlay(p) {
  const ord = buildFoundationOrderingPhase14(p);
  const dep = String(p?.dependencyState || "");
  const blk = String(p?.likelyFoundationalBlockerLabelHe || "").trim();

  let whyThisMayBeSymptomNotCoreHe = "";
  if (dep === "likely_foundational_block") {
    whyThisMayBeSymptomNotCoreHe =
      "כאן ייתכן שהקושי הנראה הוא לא רק נקודתי, אלא קשור לבסיס שעדיין לא התייצב - לכן לא לסגור רק על ליטוש נושאי.";
  } else if (dep === "mixed_dependency_signal") {
    whyThisMayBeSymptomNotCoreHe =
      "התמונה מעורבת: ייתכן שיש גם רכיב מקומי וגם רכיב שמחייב יותר יציבות ביסוד - לא מחמירים בכיוון אחד בלבד.";
  }

  let whyFoundationFirstHe = "";
  let whyLocalSupportFirstHe = "";
  let whatCanWaitUntilFoundationStabilizesHe = "";

  if (ord.interventionOrdering === "foundation_first" || ord.foundationDecision === "stabilize_foundation_first") {
    whyFoundationFirstHe = blk
      ? `כדאי לפתוח מיקוד קצר ב${blk} לפני שמנסים «להספיק הכל» בנושא הזה.`
      : "כדאי לייצב קודם בסיס קטן וברור - ואז לחדד בנושא.";
    whatCanWaitUntilFoundationStabilizesHe =
      "אפשר להמתין עם הרחבת עומס, עם קפיצת רמה, ועם ליטוש עמוק של פרטים - עד שיש שני מפגשים קצרים עם אות עקבי.";
  } else if (ord.interventionOrdering === "local_support_first") {
    whyLocalSupportFirstHe =
      "בשלב הזה נראה שהקושי נשאר מקומי יותר, ולכן נכון לטפל בו באופן ממוקד בלי להרחיב לסיפור רחב מיותר.";
    whatCanWaitUntilFoundationStabilizesHe = "אין צורך לדחות הכל ל«בסיס גדול» אם הנתון כאן עדיין נקודתי.";
  } else if (ord.interventionOrdering === "parallel_light_support") {
    whyFoundationFirstHe = "שורה קלה על בסיס - בלי להחליף את כל התוכנית.";
    whyLocalSupportFirstHe = "במקביל נשארים עם מטרה צרה בנושא - לא שני עומסים כבדים.";
    whatCanWaitUntilFoundationStabilizesHe = "להימנע מלהכפיל תרגול כבד על שני צירים באותו ערב.";
  } else {
    whyLocalSupportFirstHe = "כרגע עדיף לאסוף עוד אות לפני שמחליטים אם לפתוח טיפול רחב בבסיס.";
    whatCanWaitUntilFoundationStabilizesHe = "שינוי אגרסיבי ברצף או ברמה - ימתין לסבב תצפית קצר.";
  }

  return {
    ...ord,
    whyThisMayBeSymptomNotCoreHe,
    whyFoundationFirstHe,
    whyLocalSupportFirstHe,
    whatCanWaitUntilFoundationStabilizesHe,
  };
}
