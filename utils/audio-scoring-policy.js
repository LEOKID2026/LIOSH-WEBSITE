/**
 * מדיניות ציון אודיו — גבולות בטוח / ביניים / ידני בלבד / אסור (מחזור נוכחי).
 * English-ready: מתאים אל locale packs בלי להפעיל אנגלית.
 */

/** @typedef {"safe_auto"|"borderline_manual_first"|"manual_review_only"|"forbidden_product_autoscore"} AudioScoreTier */

/** @typedef {import("./audio-task-contract.js").AudioTaskMode} AudioTaskMode */

/** @type {ReadonlySet<AudioTaskMode>} */
export const SAFE_AUTO_SCORE_TASK_MODES = new Set([
  "listen_and_choose",
  "oral_comprehension_mcq",
  "phonological_discrimination_he",
  "audio_grammar_choice_he",
]);

/** @type {ReadonlySet<AudioTaskMode>} */
export const MANUAL_FIRST_RECORDING_MODES = new Set([
  "guided_recording",
  "read_aloud_short_he",
  "structured_spoken_response_he",
]);

/** מצבי ציון אסורים כסמכות מוצרית אוטומטית (מחזור זה) */
export const FORBIDDEN_PRODUCT_AUTOSCORE = Object.freeze([
  "pronunciation_final",
  "open_speech_auto_grade",
  "stt_authoritative_speaking_grade",
]);

/**
 * @param {import("./audio-task-contract.js").AudioStem} stem
 * @returns {{ tier: AudioScoreTier, allowAutoScore: boolean, requireManualReview: boolean }}
 */
export function classifyAudioScoringTier(stem) {
  if (!stem || typeof stem !== "object") {
    return { tier: "manual_review_only", allowAutoScore: false, requireManualReview: true };
  }
  if (MANUAL_FIRST_RECORDING_MODES.has(stem.task_mode)) {
    const border = stem.scoring_policy === "borderline_transcript_assist";
    return {
      tier: border ? "borderline_manual_first" : "manual_review_only",
      allowAutoScore: false,
      requireManualReview: true,
    };
  }
  if (SAFE_AUTO_SCORE_TASK_MODES.has(stem.task_mode)) {
    return { tier: "safe_auto", allowAutoScore: true, requireManualReview: false };
  }
  return { tier: "manual_review_only", allowAutoScore: false, requireManualReview: true };
}

/**
 * בדיקת זליגת ציון אוטומטי — לשימוש באימותים / רגרסיה.
 * @param {import("./audio-task-contract.js").AudioStem} stem
 */
export function assertNoUnsafeAutoScoreDrift(stem) {
  const { allowAutoScore } = classifyAudioScoringTier(stem);
  if (!allowAutoScore) {
    if (stem.scoring_policy === "mcq_after_audio_auto") {
      throw new Error(`unsafe_autoscore_drift:${stem.task_mode}`);
    }
  }
  if (allowAutoScore && stem.review_route !== "none") {
    throw new Error("safe_auto_expected_review_none");
  }
}
