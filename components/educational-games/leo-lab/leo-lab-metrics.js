/**
 * @param {object} state
 */
export function buildLeoLabMetrics(state) {
  const experimentsTotal = Math.floor(Number(state.experimentsTotal) || 20);
  const experimentsReached = Math.max(
    0,
    Math.min(experimentsTotal, Math.floor(Number(state.experimentsReached) || 0)),
  );
  const successfulExperiments = Math.max(
    0,
    Math.min(experimentsTotal, Math.floor(Number(state.successfulExperiments) || 0)),
  );
  const failedAttempts = Math.max(0, Math.floor(Number(state.failedAttempts) || 0));
  const mistakes = Math.max(0, Math.floor(Number(state.mistakes) || failedAttempts));
  const firstTrySuccesses = Math.max(0, Math.floor(Number(state.firstTrySuccesses) || 0));
  const bestStreak = Math.max(0, Math.floor(Number(state.bestStreak) || 0));
  const durationSec = Math.max(1, Math.floor(Number(state.durationSec) || 1));
  const accuracy = successfulExperiments / Math.max(1, experimentsReached);
  const completedAllExperiments = successfulExperiments >= experimentsTotal;

  return {
    gameKey: state.gameKey || "leo-lab",
    category: state.category || "educational",
    score: Math.max(0, Math.floor(Number(state.score) || 0)),
    didWin: state.didWin === true,
    difficulty: state.difficulty,
    experimentsTotal,
    experimentsReached,
    successfulExperiments,
    failedAttempts,
    mistakes,
    firstTrySuccesses,
    bestStreak,
    durationSec,
    accuracy,
    completedAllExperiments,
    positiveProgress: successfulExperiments,
  };
}
