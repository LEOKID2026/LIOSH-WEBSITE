/**
 * Phase 11 — אזהרת חזרה על אותו סוג עצה / צורך בסיבוב ניסוח.
 */

import {
  ADVICE_NOVELTY_LABEL_HE,
  ADVICE_SIMILARITY_LEVEL_LABEL_HE,
  RECOMMENDATION_ROTATION_NEED_LABEL_HE,
} from "./parent-report-ui-explain-he.js";

/**
 * @param {object} ctx — פלט מ buildSupportSequencingPhase11 + שדות התערבות
 */
export function buildAdviceDriftPhase11(ctx) {
  const rp = String(ctx?.priorSupportPattern || "unknown");
  const intv = String(ctx?.recommendedInterventionType || "");
  const rpm = String(ctx?.recommendedPracticeMode || "");
  const rep = String(ctx?.strategyRepetitionRisk || "unknown");
  const seq = String(ctx?.supportSequenceState || "");

  const sameGuidedBand =
    rpm === "slow_guided_accuracy" ||
    rpm === "error_reduction_loop" ||
    rpm === "guided_release" ||
    intv === "guided_to_independent_transition" ||
    intv === "stabilize_accuracy";

  let adviceSimilarityLevel = "unknown";
  if (rp === "unknown" || rep === "unknown") {
    adviceSimilarityLevel = "unknown";
  } else if (rp === "guided_repeat" && sameGuidedBand) {
    adviceSimilarityLevel = "mostly_repeated";
  } else if (rp === "review_hold_repeat" && rpm === "review_and_hold") {
    adviceSimilarityLevel = "mostly_repeated";
  } else if (rp === "guided_repeat" || rp === "review_hold_repeat") {
    adviceSimilarityLevel = "partly_repeated";
  } else {
    adviceSimilarityLevel = "clearly_new";
  }

  let adviceNovelty = "unknown";
  if (adviceSimilarityLevel === "mostly_repeated") adviceNovelty = "low";
  else if (adviceSimilarityLevel === "partly_repeated") adviceNovelty = "medium";
  else if (adviceSimilarityLevel === "clearly_new") adviceNovelty = "high";
  else adviceNovelty = "unknown";

  let recommendationRotationNeed = "none";
  if (seq === "insufficient_sequence_evidence") {
    recommendationRotationNeed = "do_not_repeat_yet";
  } else if (adviceSimilarityLevel === "mostly_repeated" && rep !== "unknown") {
    recommendationRotationNeed = "meaningful_rotation";
  } else if (adviceSimilarityLevel === "partly_repeated" || rep === "moderate") {
    recommendationRotationNeed = "light_variation";
  }

  const repeatAdviceWarning =
    adviceSimilarityLevel === "mostly_repeated" && rep !== "unknown" && rep !== "low";

  const adviceSimilarityLevelHe =
    ADVICE_SIMILARITY_LEVEL_LABEL_HE[adviceSimilarityLevel] || ADVICE_SIMILARITY_LEVEL_LABEL_HE.unknown;
  const adviceNoveltyHe = ADVICE_NOVELTY_LABEL_HE[adviceNovelty] || ADVICE_NOVELTY_LABEL_HE.unknown;
  const recommendationRotationNeedHe =
    RECOMMENDATION_ROTATION_NEED_LABEL_HE[recommendationRotationNeed] ||
    RECOMMENDATION_ROTATION_NEED_LABEL_HE.none;

  const repeatAdviceWarningHe = repeatAdviceWarning
    ? "יש סימנים לכך שאותו סוג עזרה חוזר שוב בלי שינוי מספק בעצמאות - כדאי לדייק או לשנות מעט את הדרך."
    : "";

  const adviceDrift = {
    version: 1,
    adviceSimilarityLevel,
    adviceNovelty,
    recommendationRotationNeed,
    repeatAdviceWarning,
  };

  return {
    adviceDrift,
    adviceSimilarityLevel,
    adviceSimilarityLevelHe,
    adviceNovelty,
    adviceNoveltyHe,
    repeatAdviceWarning,
    repeatAdviceWarningHe,
    recommendationRotationNeed,
    recommendationRotationNeedHe,
  };
}
