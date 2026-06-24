/**
 * Future-ready metrics shape — not sent to API in prototype.
 * @param {{
 *   score: number,
 *   didWin: boolean,
 *   difficulty: import('./recycling-factory-data.js').DifficultyId,
 *   sortedItems: number,
 *   correctItems: number,
 *   wrongItems: number,
 *   missedItems: number,
 *   mistakes: number,
 *   streak: number,
 *   bestStreak: number,
 *   durationSec: number,
 * }} state
 */
export function buildRecyclingFactoryMetrics(state) {
  const { correctItems, wrongItems, missedItems } = state;
  const accuracy = correctItems / Math.max(1, correctItems + wrongItems + missedItems);
  const mistakes = wrongItems + missedItems;

  return {
    score: state.score,
    didWin: state.didWin,
    difficulty: state.difficulty,
    sortedItems: state.sortedItems,
    correctItems,
    wrongItems,
    missedItems,
    mistakes,
    streaks: state.streak,
    bestStreak: state.bestStreak,
    durationSec: state.durationSec,
    accuracy,
  };
}
