import test from "node:test";
import assert from "node:assert/strict";

import {
  isAuthoritativeRecommendationOverride,
  normalizeRecommendationContract,
  recommendationEligibilityInvariantHolds,
} from "../../utils/contracts/recommendation-contract-normalizer.js";

test("P0: RI0 and eligible=false cannot be promoted by remediation step", () => {
  const out = normalizeRecommendationContract(
    {
      intensity: "RI0",
      eligible: false,
      family: null,
      forbiddenBecause: ["cannot_conclude_yet", "readiness_insufficient"],
    },
    "remediate_same_level",
  );
  assert.equal(out.intensity, "RI0");
  assert.equal(out.eligible, false);
  assert.equal(out.family, null);
  assert.equal(recommendationEligibilityInvariantHolds(out), true);
});

test("P0: normalization can lower but never raise intensity", () => {
  const lowered = normalizeRecommendationContract(
    { intensity: "RI3", eligible: true, family: "general_practice", forbiddenBecause: [] },
    "maintain_and_strengthen",
  );
  assert.equal(lowered.intensity, "RI1");
  assert.equal(lowered.eligible, true);

  const preserved = normalizeRecommendationContract(
    { intensity: "RI1", eligible: true, family: "general_practice", forbiddenBecause: [] },
    "advance_level",
  );
  assert.equal(preserved.intensity, "RI1");
  assert.equal(preserved.eligible, true);
});

test("P0: forbiddenBecause and eligible=true are clamped without authority", () => {
  const out = normalizeRecommendationContract(
    {
      intensity: "RI2",
      eligible: true,
      family: "accuracy_focus",
      forbiddenBecause: ["confidence_low"],
    },
    "remediate_same_level",
  );
  assert.equal(out.intensity, "RI0");
  assert.equal(out.eligible, false);
  assert.equal(out.family, null);
  assert.equal(recommendationEligibilityInvariantHolds(out), true);
});

test("P0: only documented canonical override may coexist with forbidden reasons", () => {
  const override = {
    source: "canonicalState",
    allowed: true,
    intensityCap: "RI2",
    reasonCode: "canonical:explicit_action_override",
  };
  assert.equal(isAuthoritativeRecommendationOverride(override), true);

  const out = normalizeRecommendationContract(
    {
      intensity: "RI0",
      eligible: false,
      family: null,
      forbiddenBecause: ["legacy_confidence_low"],
    },
    "remediate_same_level",
    { authoritativeOverride: override },
  );
  assert.equal(out.intensity, "RI2");
  assert.equal(out.eligible, true);
  assert.equal(out.authorityOverride.reasonCode, "canonical:explicit_action_override");
  assert.equal(recommendationEligibilityInvariantHolds(out), true);
});

test("P0: an invalid override cannot promote eligibility", () => {
  const out = normalizeRecommendationContract(
    {
      intensity: "RI0",
      eligible: false,
      family: null,
      forbiddenBecause: ["confidence_low"],
    },
    "remediate_same_level",
    {
      authoritativeOverride: {
        source: "topic_metrics",
        allowed: true,
        intensityCap: "RI2",
        reasonCode: "",
      },
    },
  );
  assert.equal(out.intensity, "RI0");
  assert.equal(out.eligible, false);
  assert.equal(out.authorityOverride, undefined);
});
