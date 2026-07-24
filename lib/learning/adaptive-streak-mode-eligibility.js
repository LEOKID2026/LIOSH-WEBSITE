/**
 * Mode-eligibility gate for the legacy internal adaptive streak counters
 * (regular-internal-adaptive.js / science-internal-adaptive.js).
 *
 * This does NOT define a new allowlist. It reuses the single existing,
 * authoritative allowlist already shared by DE2/V3/LPD/subskill-safety
 * (lib/learning/activity-classification.js via
 * utils/diagnostic-evidence-eligibility.js) so guided practice, learning
 * mode, book reading, and step-by-step walkthroughs are excluded from the
 * streak counters using the exact same rule as the diagnostic engine —
 * never a bespoke, looser list.
 */
import { isIndependentRecurrenceEvidence } from "../../utils/diagnostic-evidence-eligibility.js";

/**
 * @param {{ gameMode?: string|null, afterStepByStep?: boolean }} [input]
 * @returns {boolean}
 */
export function isEligibleAdaptiveStreakEvent({ gameMode, afterStepByStep = false } = {}) {
  return isIndependentRecurrenceEvidence({
    mode: gameMode,
    activitySource: "free_practice",
    afterStepByStep: afterStepByStep === true,
    hintsUsed: 0,
  });
}
