/**
 * @param {object} state
 */
export function buildLeoSupermarketMetrics(state) {
  const customersTotal = Math.floor(Number(state.customersTotal) || 20);
  const customersReached = Math.max(0, Math.min(customersTotal, Math.floor(Number(state.customersReached) || 0)));
  const customersCompleted = Math.max(
    0,
    Math.min(customersTotal, Math.floor(Number(state.customersCompleted) || 0)),
  );
  const correctCustomers = Math.max(
    0,
    Math.min(customersTotal, Math.floor(Number(state.correctCustomers) || 0)),
  );
  const wrongProducts = Math.max(0, Math.floor(Number(state.wrongProducts) || 0));
  const wrongChange = Math.max(0, Math.floor(Number(state.wrongChange) || 0));
  const timeoutMistakes = Math.max(0, Math.floor(Number(state.timeoutMistakes) || 0));
  const mistakes = wrongProducts + wrongChange + timeoutMistakes;
  const accuracy = correctCustomers / Math.max(1, customersReached);
  const completedAllCustomers = customersCompleted >= customersTotal;

  return {
    gameKey: "leo-supermarket",
    category: "educational",
    score: Math.max(0, Math.floor(Number(state.score) || 0)),
    didWin: state.didWin === true,
    difficulty: state.difficulty,
    customersTotal,
    customersReached,
    customersCompleted,
    correctCustomers,
    wrongProducts,
    wrongChange,
    timeoutMistakes,
    mistakes,
    bestStreak: Math.max(0, Math.floor(Number(state.bestStreak) || 0)),
    durationSec: Math.max(1, Math.floor(Number(state.durationSec) || 1)),
    accuracy: Math.max(0, Math.min(1, accuracy)),
    completedAllCustomers,
  };
}
