/**
 * topicStatus + findingType resolution — subject-agnostic.
 */
import { resolveEvidenceStrength, evidenceStrengthRank } from "./resolve-evidence-strength.js";
import { resolveRepeatedMistakePatterns } from "./resolve-repeated-mistake-patterns.js";

/**
 * @param {object} p
 * @param {number} p.questionCount
 * @param {number} p.correctCount
 * @param {number} p.wrongCount
 * @param {number} p.accuracy
 * @param {import("../mistake-event.js").MistakeEventV1[]} [p.wrongEvents]
 * @param {boolean} [p.recommendedFocus]
 */
export function resolveTopicFinding({
  questionCount,
  correctCount,
  wrongCount,
  accuracy,
  wrongEvents = [],
  recommendedFocus = false,
}) {
  const q = Math.max(0, Number(questionCount) || 0);
  const c = Math.max(0, Number(correctCount) || 0);
  const w = Math.max(0, Number(wrongCount) || 0);
  const acc = Number.isFinite(Number(accuracy)) ? Number(accuracy) : q > 0 ? (c / q) * 100 : 0;
  const strength = resolveEvidenceStrength(q);

  if (q === 0) {
    return {
      topicStatus: "not_practiced",
      findingType: "none",
      repeatedMistakePatterns: [],
      hasMixed: false,
      hasPositiveDominance: false,
      canUseRepeatedWording: false,
    };
  }

  const repeatedMistakePatterns = resolveRepeatedMistakePatterns(wrongEvents);
  const patternsCoverWrongAttempts =
    wrongEvents.length >= 2 &&
    w > 0 &&
    (wrongEvents.length >= w || wrongEvents.length >= Math.ceil(w * 0.5));
  const canUseRepeatedWording =
    q >= 5 || evidenceStrengthRank(strength) >= evidenceStrengthRank("emerging");

  if (q <= 2) {
    return {
      topicStatus: "initial_data",
      findingType: "initial_topic_data",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: false,
      canUseRepeatedWording: false,
    };
  }

  const hasRepeated = repeatedMistakePatterns.length > 0 && patternsCoverWrongAttempts;

  const hasPositiveDominance = q >= 5 && acc >= 80 && c >= Math.ceil(q * 0.8);
  const hasPositiveObserved = q >= 5 && w === 0 && acc >= 95;
  const hasPositiveRepeated = q >= 8 && acc >= 80 && !hasRepeated;
  const hasDifficulty = w >= 2 && acc < 70;
  const hasMixed = hasPositiveDominance && hasRepeated && w >= 1;

  if (hasMixed) {
    return {
      topicStatus: "mixed",
      findingType: "mixed_pattern",
      repeatedMistakePatterns,
      hasMixed: true,
      hasPositiveDominance,
      canUseRepeatedWording,
    };
  }

  if (hasPositiveRepeated && !hasRepeated) {
    return {
      topicStatus: "positive_repeated",
      findingType: "success_pattern",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: true,
      canUseRepeatedWording,
    };
  }

  if (hasPositiveObserved || (q >= 5 && acc >= 95 && w === 0)) {
    return {
      topicStatus: "positive_observed",
      findingType: "success_pattern",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: true,
      canUseRepeatedWording,
    };
  }

  if (hasRepeated && hasDifficulty) {
    const topicStatus =
      canUseRepeatedWording && q >= 5 ? "difficulty_repeated" : "difficulty_observed";
    return {
      topicStatus,
      findingType: "difficulty_pattern",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: false,
      canUseRepeatedWording,
    };
  }

  if (hasDifficulty) {
    if (recommendedFocus) {
      return {
        topicStatus: "practice_focus",
        findingType: "practice_focus",
        repeatedMistakePatterns,
        hasMixed: false,
        hasPositiveDominance: false,
        canUseRepeatedWording,
      };
    }
    return {
      topicStatus: "difficulty_observed",
      findingType: hasRepeated ? "difficulty_pattern" : "practice_focus",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: false,
      canUseRepeatedWording,
    };
  }

  if (q >= 5 && acc >= 70) {
    return {
      topicStatus: "positive_observed",
      findingType: "success_pattern",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: acc >= 80,
      canUseRepeatedWording,
    };
  }

  if (q >= 5 && w >= 2 && acc < 70) {
    return {
      topicStatus: acc < 55 || w >= Math.ceil(q * 0.4) ? "practice_focus" : "difficulty_observed",
      findingType: "practice_focus",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: false,
      canUseRepeatedWording,
    };
  }

  if (q >= 3 && q <= 4 && w >= 1 && acc < 70) {
    return {
      topicStatus: "difficulty_observed",
      findingType: "practice_focus",
      repeatedMistakePatterns,
      hasMixed: false,
      hasPositiveDominance: false,
      canUseRepeatedWording: false,
    };
  }

  return {
    topicStatus: "no_clear_pattern",
    findingType: "none",
    repeatedMistakePatterns,
    hasMixed: false,
    hasPositiveDominance: false,
    canUseRepeatedWording,
  };
}
