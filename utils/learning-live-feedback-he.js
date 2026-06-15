/** Hebrew-only live practice feedback — no answer leak in wrong-state messages. */

export const LIVE_PRACTICE_CORRECT_HE = "מצוין! 🎉";
export const LIVE_PRACTICE_WRONG_HE = "לא נכון, ננסה שוב 😔";
export const LIVE_PRACTICE_GAME_OVER_HE = "המשחק נגמר! 💔";

/** Learning mode only — may show the correct answer after a wrong attempt. */
export function formatLearningWrongFeedbackHe(correctAnswerDisplay) {
  return `לא נכון 😔 התשובה הנכונה: ${correctAnswerDisplay} ✅`;
}
