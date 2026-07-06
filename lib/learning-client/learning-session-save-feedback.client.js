export const LEARNING_SESSION_SAVE_FAILED_HE =
  "לא הצלחנו לשמור את ההתקדמות. נסו שוב.";

/**
 * @param {((value: string | null) => void) | null | undefined} setFeedback
 * @param {string} [tag]
 */
export function notifyLearningSessionSaveFailure(setFeedback, tag = "learning") {
  console.warn(`[${tag}] finish session save failed`);
  if (typeof setFeedback !== "function") return;
  setFeedback(LEARNING_SESSION_SAVE_FAILED_HE);
  window.setTimeout(() => setFeedback(null), 6000);
}
