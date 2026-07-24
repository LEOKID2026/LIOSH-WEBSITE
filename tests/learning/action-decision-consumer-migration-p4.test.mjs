import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { plannerCompatibilityPayloadFromActionDecisionV2 } from "../../lib/learning-client/scheduleAdaptivePlannerRecommendation.js";
import {
  DECISION_CONSUMER_REGISTRY_V1,
  validateDecisionConsumerRegistryV1,
} from "../../utils/action-decision-contract/decision-consumer-registry-v1.js";

const MASTER_FILES = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "history",
  "moledet-geography",
].map((subject) => `pages/learning/${subject}-master.js`);

function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("P4 every subject master consumes the authoritative ADC V2 runtime hook", () => {
  for (const path of MASTER_FILES) {
    const text = source(path);
    assert.match(text, /useStudentActionDecision/, path);
    assert.match(text, /recordActionDecisionActivity\(\)/, path);
    assert.match(text, /readingPresentation/, path);
    assert.match(text, /timerEnabled/, path);
    assert.match(text, /allowEscalation/, path);
  }
});

test("P4 API returns only validated projected ADC V2 decisions", () => {
  const api = source("pages/api/student/action-decisions.js");
  const projection = source(
    "utils/action-decision-contract/public-action-decision-v2.js",
  );
  assert.match(api, /collectActionDecisionContractsV2\(detailed \|\| enriched\)/);
  assert.match(projection, /validateActionDecisionContractV2/);
  assert.doesNotMatch(projection, /blockedAlternatives:\s/);
  assert.doesNotMatch(projection, /evidenceSnapshot:\s/);
});

test("P4 parent report maps ADC V2 once and renders only parent-safe translation fields", () => {
  const apply = source(
    "utils/learning-pattern-decision/apply-learning-pattern-decision.js",
  );
  const renderable = source("pages/learning/parent-report-detailed.renderable.jsx");
  const shortReport = source("pages/learning/parent-report.js");
  const translations = source(
    "utils/action-decision-contract/parent-action-decision-translations-he.js",
  );
  assert.match(apply, /buildParentSafeActionDecisionV1/);
  assert.match(renderable, /tr\.parentActionDecision\.recommendation/);
  assert.match(shortReport, /row\.parentActionDecision\.recommendation/);
  assert.doesNotMatch(renderable, /actionDecisionContract\.(reasonCodes|intensity)/);
  assert.doesNotMatch(translations, /confidence/);
  assert.doesNotMatch(translations, /taxonomyId/);
});

test("P4 migrated LPD rollups do not fall back to legacy recommendation authority", () => {
  const subjectRollup = source(
    "utils/learning-pattern-decision/build-subject-engine-decision-contract.js",
  );
  const copy = source(
    "utils/learning-pattern-decision/lpd-parent-facing-copy.js",
  );
  assert.doesNotMatch(subjectRollup, /REMEDIATE_ACTIONS/);
  assert.doesNotMatch(
    subjectRollup,
    /topic\.recommendedAction|t\.recommendedAction/,
  );
  assert.doesNotMatch(copy, /contract\.recommendedAction/);
});

test("P4 legacy planner UI is a one-way ADC V2 mirror with no parallel endpoint or flag", () => {
  const scheduler = source(
    "lib/learning-client/scheduleAdaptivePlannerRecommendation.js",
  );
  assert.doesNotMatch(
    scheduler,
    /NEXT_PUBLIC_ENABLE_ADAPTIVE_PLANNER_RECOMMENDATION/,
  );
  assert.doesNotMatch(scheduler, /\/api\/learning\/planner-recommendation/);
  const retiredEndpoint = source(
    "pages/api/learning/planner-recommendation.js",
  );
  assert.match(retiredEndpoint, /status\(410\)/);
  assert.doesNotMatch(retiredEndpoint, /buildRuntimePlannerRecommendation/);
  const payload = plannerCompatibilityPayloadFromActionDecisionV2(
    {
      action: "advance_cautiously",
      expiry: { afterActivities: 4 },
    },
    { level: "medium", clientRequestId: 7 },
  );
  assert.equal(payload.recommendation.nextAction, "advance_skill");
  assert.equal(payload.recommendation.targetDifficulty, "hard");
  assert.equal(payload.diagnostics.authority, "action_decision_contract_v2");
});

test("P4 every inventoried decision consumer has an explicit final status", () => {
  assert.deepEqual(validateDecisionConsumerRegistryV1(), {
    ok: true,
    errors: [],
  });
  for (const consumer of DECISION_CONSUMER_REGISTRY_V1) {
    for (const path of consumer.paths) {
      assert.doesNotThrow(() => source(path), `${consumer.id}:${path}`);
    }
  }
  assert.equal(
    DECISION_CONSUMER_REGISTRY_V1.some(
      (entry) => entry.status === "one_way_compatibility_mirror",
    ),
    true,
  );
  assert.equal(
    DECISION_CONSUMER_REGISTRY_V1.some(
      (entry) => entry.status === "adc_v2",
    ),
    true,
  );
});
