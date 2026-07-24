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

/**
 * Production-safe wrapper around assertContractMatchesStep
 * (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md, Part 8).
 * Previously this consistency check ran only when
 * `process.env.NODE_ENV !== "production"`, so a legacy/ADC authority
 * mismatch could reach production silently. It now always runs. In
 * production a mismatch is reported (not thrown) so it can never crash a
 * render path that legitimately has no ADC coverage yet — "fail safe by
 * consumer type", not "recommendation-affecting throw everywhere". In every
 * other environment (dev/test/CI) it still throws so regressions keep
 * failing the test suite exactly as before.
 * @param {object|null|undefined} contract
 * @param {string} step
 */
export function assertContractStepAuthority(contract, step) {
  try {
    assertContractMatchesStep(contract, step);
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      // eslint-disable-next-line no-console
      console.error("[assertContractStepAuthority] contract/step mismatch", {
        message: error?.message || String(error),
      });
      return;
    }
    throw error;
  }
}
