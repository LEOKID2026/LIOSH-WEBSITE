/**
 * @param {object} state
 */
export function buildLeoGiftsMetrics(state) {
  const successfulQuestions = Math.max(0, Math.floor(Number(state.successfulQuestions) || 0));
  const questionsReached = Math.max(
    successfulQuestions,
    Math.floor(Number(state.questionsReached) || successfulQuestions),
  );
  const failedAttempts = Math.max(0, Math.floor(Number(state.failedAttempts) || 0));
  const mistakes = Math.max(0, Math.floor(Number(state.mistakes) || failedAttempts));
  const bestStreak = Math.max(0, Math.floor(Number(state.bestStreak) || 0));
  const highestStage = Math.max(1, Math.floor(Number(state.highestStage) || 1));
  const durationSec = Math.max(1, Math.floor(Number(state.durationSec) || 1));
  const avgAnswerSec = Math.max(0, Number(state.avgAnswerSec) || 0);
  const accuracy = successfulQuestions / Math.max(1, questionsReached);

  return {
    gameKey: state.gameKey || "leo-gifts",
    category: state.category || "educational",
    score: Math.max(0, Math.floor(Number(state.score) || 0)),
    didWin: state.didWin === true,
    difficulty: state.difficulty,
    successfulQuestions,
    questionsReached,
    failedAttempts,
    mistakes,
    bestStreak,
    highestStage,
    durationSec,
    avgAnswerSec,
    accuracy,
    positiveProgress: successfulQuestions,
  };
}
