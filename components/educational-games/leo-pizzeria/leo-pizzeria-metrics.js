/**
 * @param {object} state
 */
export function buildLeoPizzeriaMetrics(state) {
  const customersTotal = Math.floor(Number(state.customersTotal) || 20);
  const customersReached = Math.max(
    0,
    Math.min(customersTotal, Math.floor(Number(state.customersReached) || 0)),
  );
  const successfulCustomers = Math.max(
    0,
    Math.min(customersTotal, Math.floor(Number(state.successfulCustomers) || 0)),
  );
  const failedAttempts = Math.max(0, Math.floor(Number(state.failedAttempts) || 0));
  const mistakes = Math.max(0, Math.floor(Number(state.mistakes) || failedAttempts));
  const bestStreak = Math.max(0, Math.floor(Number(state.bestStreak) || 0));
  const durationSec = Math.max(1, Math.floor(Number(state.durationSec) || 1));
  const accuracy = successfulCustomers / Math.max(1, customersReached);
  const completedAllCustomers = successfulCustomers >= customersTotal;

  return {
    gameKey: state.gameKey || "leo-pizzeria",
    category: state.category || "educational",
    score: Math.max(0, Math.floor(Number(state.score) || 0)),
    didWin: state.didWin === true,
    difficulty: state.difficulty,
    customersTotal,
    customersReached,
    successfulCustomers,
    failedAttempts,
    mistakes,
    bestStreak,
    durationSec,
    accuracy,
    completedAllCustomers,
    positiveProgress: successfulCustomers,
    statsLines: [
      { label: "לקוחות שהגעתם אליהם", value: String(customersReached) },
      { label: "פיצות שהוגשו נכון", value: String(successfulCustomers) },
      { label: "טעויות", value: String(mistakes) },
      { label: "דיוק", value: `${Math.round(accuracy * 100)}%` },
      { label: "רצף הכי טוב", value: String(bestStreak) },
    ],
  };
}
