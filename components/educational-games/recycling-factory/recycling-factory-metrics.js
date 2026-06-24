/**
 * Future-ready metrics shape for finish API.
 * @param {object} state
 */
export function buildRecyclingFactoryMetrics(state) {
  const correctItems = Number(state.correctItems) || 0;
  const wrongItems = Number(state.wrongItems) || 0;
  const missedItems = Number(state.missedItems) || 0;
  const accuracy = correctItems / Math.max(1, correctItems + wrongItems + missedItems);
  const mistakes = wrongItems + missedItems;

  return {
    gameKey: state.gameKey || "recycling-factory",
    category: state.category || "educational",
    score: Math.max(0, Math.floor(Number(state.score) || 0)),
    didWin: state.didWin === true,
    difficulty: state.difficulty,
    sortedItems: Math.floor(Number(state.sortedItems) || 0),
    correctItems,
    wrongItems,
    missedItems,
    mistakes,
    streaks: Math.floor(Number(state.streak) || 0),
    bestStreak: Math.floor(Number(state.bestStreak) || 0),
    durationSec: Math.max(1, Math.floor(Number(state.durationSec) || 1)),
    accuracy,
  };
}
