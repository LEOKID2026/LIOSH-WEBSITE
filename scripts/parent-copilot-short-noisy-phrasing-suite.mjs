import assert from "node:assert/strict";
import parentCopilot from "../utils/parent-copilot/index.js";

const { resolveIntentWithConfidence } = await import("../utils/parent-copilot/intent-resolver.js");
const { resolveScope } = await import("../utils/parent-copilot/scope-resolver.js");
import { syntheticPayload } from "./parent-copilot-test-fixtures.mjs";
import { pct, writeArtifact } from "./rollout-artifacts-lib.mjs";

const payload = syntheticPayload();

const classificationCases = [
  { utterance: "מהזה אומר", expectedIntent: "clarify_term", expectedScopeStatus: "resolved" },
  { utterance: "מחר?", expectedIntent: "what_to_do_this_week", expectedScopeStatus: "resolved" },
  { utterance: "חשבון", expectedIntent: "unclear", expectedScopeStatus: "resolved" },
  { utterance: "שברים?", expectedIntent: "unclear", expectedScopeStatus: "resolved" },
  { utterance: "לא ברור", expectedIntent: "is_intervention_needed", expectedScopeStatus: "resolved" },
  { utterance: "מה המקצוע החזק", expectedIntent: "what_is_going_well", expectedScopeStatus: "resolved" },
];

let pass = 0;
let falseClarification = 0;
let ambiguousConfident = 0;
for (const tc of classificationCases) {
  const intent = resolveIntentWithConfidence(tc.utterance);
  const scope = resolveScope({ payload, utterance: tc.utterance, selectedContextRef: null });
  const ok = intent.intent === tc.expectedIntent && scope.resolutionStatus === tc.expectedScopeStatus;
  if (ok) pass += 1;
  if (tc.expectedScopeStatus === "resolved" && scope.resolutionStatus === "clarification_required") falseClarification += 1;
  if (tc.expectedScopeStatus === "clarification_required" && scope.resolutionStatus === "resolved" && scope.scopeConfidence >= 0.7) {
    ambiguousConfident += 1;
  }
}

const accuracy = pct(pass, classificationCases.length);
const falseClarificationRate = pct(falseClarification, classificationCases.length);
const falseConfidentRate = pct(ambiguousConfident, classificationCases.length);

writeArtifact("short-noisy-phrasing", {
  shortNoisyAccuracy: accuracy,
  falseClarificationRate,
  falseConfidentRate,
  sampleSize: classificationCases.length,
  pass: accuracy >= 93 && falseClarificationRate <= 8 && falseConfidentRate <= 3,
});

assert.ok(classificationCases.length >= 6, "short/noisy sample size too small");
assert.ok(accuracy >= 93, `short/noisy accuracy below threshold: ${accuracy.toFixed(2)}%`);
assert.ok(falseClarificationRate <= 8, `false clarification rate too high: ${falseClarificationRate.toFixed(2)}%`);
assert.ok(falseConfidentRate <= 3, `false confident classification too high: ${falseConfidentRate.toFixed(2)}%`);

console.log("parent-copilot-short-noisy-phrasing-suite: OK");
