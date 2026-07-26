/**
 * Parent-facing enrichment: surface factualObservations regardless of taxonomy /
 * positive accuracy. Does not change engineDecision, ADC, detectedPattern, or
 * blockPatternClaim.
 *
 * Kept as the historical module path; implementation lives in compose-*.
 */

export {
  composeParentFindingWithFactualObservations,
  topicStateFindingBaseHe,
  enrichParentFindingWithConsistentStrongTag,
} from "./compose-parent-finding-with-factual-observations.js";

export { resolveFactualParentPatternLabel } from "./enrich-parent-finding-legacy-label.js";
