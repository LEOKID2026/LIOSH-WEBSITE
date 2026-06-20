/**
 * Achievement evaluator — delegates to unified card acquisition engine.
 */

export {
  evaluateAndGrantAchievementCards,
  evaluateAndGrantAcquisitionCards,
  evaluateRuleProgress,
  cardRulesAllMatch,
  loadRulesGroupedByCardId,
  cardPassesGradeBands,
  getIsraelMonthBounds,
} from "./card-acquisition-engine.server.js";
