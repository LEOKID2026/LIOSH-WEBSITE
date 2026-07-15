/**
 * Adaptive Learning Planner — deterministic next-step recommendation from engine-shaped input.
 * Does not call the diagnostic engine, does not mutate banks, does not change live routing.
 */
import { REASON_CODES } from "./adaptive-planner-contract.js";
import {
  canUsePrerequisite,
  hasGuessingOrInconsistency,
  isStrongAdvanceSignal,
  isStrongMaintainSignal,
  isThinOrCautioned,
  lowerDifficulty,
  normalizeDifficulty,
  normalizeDoNotConclude,
  normalizeRiskFlags,
  raiseDifficulty,
} from "./adaptive-planner-rules.js";

const MUST_NOT_SAY_DEFAULT = [
  "Do not infer medical or learning-disability diagnoses.",
  "Do not use permanent-ability labels.",
  "Do not override the diagnostic engine decision; planner only recommends pacing and sequencing.",
];

/**
 * @param {unknown} c
 * @returns {number}
 */
export function confidenceToNumeric(c) {
  if (typeof c === "number" && Number.isFinite(c)) return Math.min(1, Math.max(0, c));
  const s = String(c || "").toLowerCase();
  if (s === "high") return 0.85;
  if (s === "medium") return 0.55;
  if (s === "low") return 0.35;
  if (s === "very_low" || s === "very low") return 0.15;
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.45;
}

/**
 * @param {unknown} m
 * @returns {number}
 */
export function masteryToNumeric(m) {
  if (typeof m === "number" && Number.isFinite(m)) return Math.min(1, Math.max(0, m));
  return 0;
}

/**
 * @typedef {object} PlannerInput
 * @property {string} [studentId]
 * @property {string} subject
 * @property {string} [currentSkillId]
 * @property {string} [currentSubskillId]
 * @property {string} engineDecision
 * @property {number} [mastery]
 * @property {number|string} [confidence]
 * @property {string} dataQuality
 * @property {string[]} [riskFlags]
 * @property {string[]} [doNotConclude]
 * @property {string[]} [detectedErrorTypes]
 * @property {string[]} [prerequisiteSkillIds]
 * @property {object[]} [recentAttempts]
 * @property {object[]} [availableQuestionMetadata]
 * @property {boolean} [skillTaggingIncomplete] — e.g. English exempt rows without skillId
 * @property {string} [currentDifficultyHint] — current tier hint (intro…challenge)
 */

/**
 * @param {PlannerInput} raw
 */
export function planAdaptiveLearning(raw) {
  const subject = String(raw?.subject || "").trim();
  const engineDecision = String(raw?.engineDecision || "insufficient_data").toLowerCase();
  const dataQuality = String(raw?.dataQuality || "moderate").toLowerCase();
  const riskFlags = normalizeRiskFlags(raw?.riskFlags);
  const doNotConclude = normalizeDoNotConclude(raw?.doNotConclude);
  const mastery = masteryToNumeric(raw?.mastery);
  const confN = confidenceToNumeric(raw?.confidence);
  const prereq = Array.isArray(raw?.prerequisiteSkillIds)
    ? raw.prerequisiteSkillIds.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const errTypes = Array.isArray(raw?.detectedErrorTypes)
    ? raw.detectedErrorTypes.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const meta = Array.isArray(raw?.availableQuestionMetadata) ? raw.availableQuestionMetadata : [];
  const skillId = String(raw?.currentSkillId || "").trim();
  const subskillId = String(raw?.currentSubskillId || "").trim();
  const englishIncomplete =
    raw?.skillTaggingIncomplete === true ||
    (subject.toLowerCase() === "english" && !skillId);

  /** @type {string[]} */
  const reasonCodes = [];
  /** @type {string[]} */
  const internalNotes = [];
  /** @type {string[]} */
  const mustNotSay = [...MUST_NOT_SAY_DEFAULT];

  const baseOut = () => ({
    plannerStatus: /** @type {"ready"|"caution"|"insufficient_data"|"needs_human_review"} */ ("ready"),
    nextAction: /** @type {"practice_current"|"review_prerequisite"|"probe_skill"|"advance_skill"|"maintain_skill"|"pause_collect_more_data"} */ (
      "maintain_skill"
    ),
    subject,
    targetSkillId: skillId || "",
    targetSubskillId: subskillId || "",
    targetDifficulty: normalizeDifficulty(raw?.currentDifficultyHint),
    questionCount: 3,
    reasonCodes,
    studentSafeSummary: "",
    parentSafeSummary: "",
    internalNotes,
    mustNotSay,
    requiresHumanReview: false,
  });

  if (!subject) {
    const o = baseOut();
    o.plannerStatus = "insufficient_data";
    o.nextAction = "pause_collect_more_data";
    o.reasonCodes.push(REASON_CODES.MISSING_METADATA);
    o.studentSafeSummary = "Not enough context to plan (missing subject).";
    o.parentSafeSummary = "More learning activity is needed before suggesting a next focus.";
    o.internalNotes.push("Missing subject on planner input.");
    return o;
  }

  if (engineDecision === "insufficient_data") {
    const o = baseOut();
    o.plannerStatus = "insufficient_data";
    o.nextAction = "pause_collect_more_data";
    o.questionCount = 3;
    o.reasonCodes.push(REASON_CODES.ENGINE_INSUFFICIENT_DATA);
    o.studentSafeSummary = "The learning system needs a bit more practice data before suggesting the next step.";
    o.parentSafeSummary = "Collect a few more practice items; conclusions are deferred.";
    return o;
  }

  if (englishIncomplete) {
    const o = baseOut();
    o.plannerStatus = "needs_human_review";
    o.nextAction = "pause_collect_more_data";
    o.questionCount = 3;
    o.requiresHumanReview = true;
    o.reasonCodes.push(REASON_CODES.ENGLISH_SKILL_TAGGING_INCOMPLETE);
    o.studentSafeSummary = "English practice can continue, but skill routing should be confirmed by a teacher.";
    o.parentSafeSummary = "English tagging is incomplete in the content bank; planner will not auto-route fine-grained skills.";
    o.internalNotes.push("English exempt / missing skillId - no confident adaptive routing.");
    return o;
  }

  if (meta.length === 0 && (engineDecision === "advance" || engineDecision === "review")) {
    const o = baseOut();
    o.plannerStatus = "needs_human_review";
    o.nextAction = "pause_collect_more_data";
    o.questionCount = 3;
    o.requiresHumanReview = true;
    o.reasonCodes.push(REASON_CODES.MISSING_METADATA);
    o.studentSafeSummary = "Waiting on verified question metadata before suggesting an advanced path.";
    o.parentSafeSummary = "Skill metadata for the next step is not confirmed; hold automatic advancement.";
    return o;
  }

  if (isThinOrCautioned(dataQuality, doNotConclude)) {
    const probe = hasGuessingOrInconsistency(riskFlags);
    const o = baseOut();
    o.plannerStatus = "caution";
    o.nextAction = probe ? "probe_skill" : "pause_collect_more_data";
    o.questionCount = 3;
    o.targetDifficulty = lowerDifficulty(raw?.currentDifficultyHint || "standard");
    if (dataQuality === "thin") reasonCodes.push(REASON_CODES.THIN_DATA);
    if (doNotConclude.length) reasonCodes.push(REASON_CODES.DO_NOT_CONCLUDE);
    if (probe) reasonCodes.push(REASON_CODES.PROBE_INCONSISTENCY);
    o.studentSafeSummary = probe
      ? "Short check-in practice to clarify response patterns."
      : "A few more practice items before changing level.";
    o.parentSafeSummary = probe
      ? "Light probe set recommended; avoid strong conclusions."
      : "Thin evidence - collect a small batch of practice before advancing.";
    return o;
  }

  if (hasGuessingOrInconsistency(riskFlags)) {
    const o = baseOut();
    o.plannerStatus = "caution";
    o.nextAction = "probe_skill";
    o.questionCount = 3;
    o.targetDifficulty = normalizeDifficulty(raw?.currentDifficultyHint || "standard");
    o.reasonCodes.push(REASON_CODES.PROBE_GUESSING);
    o.studentSafeSummary = "Short probe to verify understanding versus guessing.";
    o.parentSafeSummary = "Inconsistent or guess-heavy signals - use a small diagnostic set.";
    return o;
  }

  if (engineDecision === "remediate") {
    const o = baseOut();
    o.plannerStatus = "ready";
    o.nextAction = "practice_current";
    o.questionCount = 5;
    o.targetSkillId = skillId;
    o.targetSubskillId = subskillId;
    o.targetDifficulty = lowerDifficulty(raw?.currentDifficultyHint || "standard");
    o.reasonCodes.push(REASON_CODES.REMEDIATE);
    if (errTypes.length) o.reasonCodes.push(REASON_CODES.ERROR_TYPES_TARGETED_PRACTICE);
    o.studentSafeSummary = "Extra practice on the current skill at a supportive difficulty.";
    o.parentSafeSummary = "Targeted practice on the same skill; difficulty held or lowered slightly.";
    return o;
  }

  if (canUsePrerequisite(confN, prereq) && engineDecision !== "advance") {
    const o = baseOut();
    o.plannerStatus = "ready";
    o.nextAction = "review_prerequisite";
    o.targetSkillId = prereq[0];
    o.targetSubskillId = String(raw?.prerequisiteSubskillIdHint || "").trim() || "general";
    o.targetDifficulty = "basic";
    o.questionCount = 4;
    o.reasonCodes.push(REASON_CODES.PREREQUISITE_REVIEW);
    o.studentSafeSummary = "Brief review of a foundation skill that supports the current topic.";
    o.parentSafeSummary = "Strengthen a prerequisite skill before pushing the main skill harder.";
    return o;
  }

  if (engineDecision === "advance" && isStrongAdvanceSignal(mastery, confN)) {
    const o = baseOut();
    o.plannerStatus = "ready";
    o.nextAction = "advance_skill";
    o.targetSkillId = skillId;
    o.targetSubskillId = subskillId;
    o.targetDifficulty = raiseDifficulty(raw?.currentDifficultyHint || "standard");
    o.questionCount = 4;
    o.reasonCodes.push(REASON_CODES.ADVANCE_STRONG_SIGNAL);
    o.studentSafeSummary = "Ready for slightly more challenging practice on the same skill line.";
    o.parentSafeSummary = "Signals support cautious difficulty increase with monitoring.";
    return o;
  }

  if (engineDecision === "maintain" && isStrongMaintainSignal(mastery, confN)) {
    const o = baseOut();
    o.plannerStatus = "ready";
    o.nextAction = "maintain_skill";
    o.questionCount = 4;
    o.targetDifficulty = normalizeDifficulty(raw?.currentDifficultyHint || "standard");
    o.reasonCodes.push(REASON_CODES.MAINTAIN_STRONG_SIGNAL);
    o.studentSafeSummary = "Continue solid practice at the current level.";
    o.parentSafeSummary = "Maintain current difficulty while consolidating mastery.";
    return o;
  }

  if (engineDecision === "review") {
    const o = baseOut();
    o.plannerStatus = "ready";
    o.nextAction = "practice_current";
    o.questionCount = 4;
    o.targetDifficulty = lowerDifficulty(raw?.currentDifficultyHint || "standard");
    o.reasonCodes.push(REASON_CODES.DEFAULT_MAINTAIN);
    o.studentSafeSummary = "Review-style practice on the current skill.";
    o.parentSafeSummary = "Engine suggests review; planner aligns with same-skill practice.";
    return o;
  }

  {
    const o = baseOut();
    o.plannerStatus = "ready";
    o.nextAction = "practice_current";
    o.questionCount = 4;
    o.targetDifficulty = normalizeDifficulty(raw?.currentDifficultyHint || "standard");
    o.reasonCodes.push(REASON_CODES.DEFAULT_MAINTAIN);
    o.studentSafeSummary = "Steady practice on the current focus.";
    o.parentSafeSummary = "Default safe path: continue practice without advancing difficulty.";
    return o;
  }
}
