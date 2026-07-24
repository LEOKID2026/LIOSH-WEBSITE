import { legacyRecommendedActionFromContractV2 } from "../action-decision-contract/action-decision-contract-v2.js";

/**
 * Dev-time guard: recommendation intensity must match decision.step map.
 * @param {object|null|undefined} contract
 * @param {string} step
 */
export function assertContractMatchesStep(contract, step) {
  if (!contract) return;

  if (contract.version === "2.0.0") {
    const expectedStep = legacyRecommendedActionFromContractV2(contract);
    if (step !== expectedStep) {
      throw new Error(
        "ADC V2 action mismatch with legacy step: " +
          String(contract.action || "none") +
          " -> " +
          step +
          " (expected " +
          expectedStep +
          ")"
      );
    }
    return;
  }

  const map = {
    maintain_current_path: "RI0",
    watch: "RI0",
    maintain_and_strengthen: "RI1",
    remediate_same_level: "RI2",
    advance_level: "RI3",
    advance_grade_topic_only: "RI3",
    drop_one_level_topic_only: "RI2",
    drop_one_grade_topic_only: "RI2",
  };

  const expected = map[step];

  if (expected && contract.intensity !== expected) {
    throw new Error(
      "Contract intensity mismatch with step: " + step + " vs " + contract.intensity
    );
  }
}
