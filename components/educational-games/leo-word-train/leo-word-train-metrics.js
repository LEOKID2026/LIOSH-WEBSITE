/**
 * @param {object} state
 */
export function buildLeoWordTrainMetrics(state) {
  const tasksTotal = Math.floor(Number(state.tasksTotal) || 20);
  const tasksReached = Math.max(
    0,
    Math.min(tasksTotal, Math.floor(Number(state.tasksReached) || 0)),
  );
  const successfulTasks = Math.max(
    0,
    Math.min(tasksTotal, Math.floor(Number(state.successfulTasks) || 0)),
  );
  const failedAttempts = Math.max(0, Math.floor(Number(state.failedAttempts) || 0));
  const mistakes = Math.max(0, Math.floor(Number(state.mistakes) || failedAttempts));
  const bestStreak = Math.max(0, Math.floor(Number(state.bestStreak) || 0));
  const durationSec = Math.max(1, Math.floor(Number(state.durationSec) || 1));
  const accuracy = successfulTasks / Math.max(1, tasksReached);
  const completedAllTasks = successfulTasks >= tasksTotal;

  return {
    gameKey: state.gameKey || "leo-word-train",
    category: state.category || "educational",
    score: Math.max(0, Math.floor(Number(state.score) || 0)),
    didWin: state.didWin === true,
    difficulty: state.difficulty,
    tasksTotal,
    tasksReached,
    successfulTasks,
    failedAttempts,
    mistakes,
    bestStreak,
    durationSec,
    accuracy,
    completedAllTasks,
    positiveProgress: successfulTasks,
    statsLines: [
      { label: "משימות שהגעתם אליהן", value: String(tasksReached) },
      { label: "תחנות שהושלמו", value: String(successfulTasks) },
      { label: "טעויות", value: String(mistakes) },
      { label: "דיוק", value: `${Math.round(accuracy * 100)}%` },
      { label: "רצף הכי טוב", value: String(bestStreak) },
    ],
  };
}
