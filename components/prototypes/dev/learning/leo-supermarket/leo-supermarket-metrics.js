/**
 * Future-ready metrics shape — local only, not sent to API in prototype.
 * @param {object} state
 */
export function buildLeoSupermarketMetrics(state) {
  const customersServed = Math.floor(Number(state.customersServed) || 0);
  const correctCustomers = Math.floor(Number(state.correctCustomers) || 0);
  const wrongProducts = Math.floor(Number(state.wrongProducts) || 0);
  const wrongChange = Math.floor(Number(state.wrongChange) || 0);
  const timeoutMistakes = Math.floor(Number(state.timeoutMistakes) || 0);
  const mistakes = wrongProducts + wrongChange + timeoutMistakes;
  const accuracy = correctCustomers / Math.max(1, customersServed);

  return {
    score: Math.max(0, Math.floor(Number(state.score) || 0)),
    didWin: state.didWin === true,
    difficulty: state.difficulty,
    customersServed,
    correctCustomers,
    wrongProducts,
    wrongChange,
    timeoutMistakes,
    mistakes,
    bestStreak: Math.floor(Number(state.bestStreak) || 0),
    durationSec: Math.max(1, Math.floor(Number(state.durationSec) || 1)),
    accuracy,
  };
}
