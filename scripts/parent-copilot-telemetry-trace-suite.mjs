import assert from "node:assert/strict";
import parentCopilot from "../utils/parent-copilot/index.js";
import telemetryStore from "../utils/parent-copilot/telemetry-store.js";

function makePayload({ forceFallback = false } = {}) {
  const observation = forceFallback
    ? "בשברים נצפו 12 שאלות, עם דיוק של כ־75%."
    : "נכון לעכשיו בשברים נצפו 12 שאלות, עם דיוק של כ־75%.";
  const interpretation = forceFallback
    ? "יש כיוון עבודה סביר, ועדיין נדרש אישור נוסף לפני כיוון ברור."
    : "נכון לעכשיו יש כיוון עבודה סביר, ועדיין נדרש אישור נוסף לפני כיוון ברור.";
  const action = forceFallback
    ? "מומלץ חיזוק ממוקד ובדיקת עצמאות קצרה לפני קידום."
    : "נכון לעכשיו מומלץ חיזוק ממוקד ובדיקת עצמאות קצרה לפני קידום.";
  const uncertainty = forceFallback
    ? "כדאי להמשיך לעקוב ולאמת את הכיוון בסבב הקרוב."
    : "נכון לעכשיו כדאי להמשיך לעקוב ולאמת את הכיוון בסבב הקרוב.";

  return {
    version: 2,
    subjectProfiles: [
      {
        subject: "math",
        topicRecommendations: [
          {
            topicRowKey: "t1",
            displayName: "שברים",
            questions: 12,
            accuracy: 75,
            contractsV1: {
              evidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math" },
              decision: { contractVersion: "v1", topicKey: "t1", subjectId: "math", decisionTier: 2, cannotConcludeYet: false },
              readiness: { contractVersion: "v1", topicKey: "t1", subjectId: "math", readiness: "emerging" },
              confidence: { contractVersion: "v1", topicKey: "t1", subjectId: "math", confidenceBand: "medium" },
              recommendation: {
                contractVersion: "v1",
                topicKey: "t1",
                subjectId: "math",
                eligible: true,
                intensity: "RI2",
                family: "general_practice",
                anchorEvidenceIds: ["ev1"],
                forbiddenBecause: [],
              },
              narrative: {
                contractVersion: "v1",
                topicKey: "t1",
                subjectId: "math",
                wordingEnvelope: "WE2",
                hedgeLevel: "light",
                allowedTone: "parent_professional_warm",
                forbiddenPhrases: ["בטוח לחלוטין"],
                requiredHedges: ["נכון לעכשיו"],
                allowedSections: ["summary", "finding", "recommendation", "limitations"],
                recommendationIntensityCap: "RI2",
                textSlots: { observation, interpretation, action, uncertainty },
              },
            },
          },
        ],
      },
    ],
    executiveSummary: { majorTrendsHe: ["קו ראשון לתקופה"] },
  };
}

telemetryStore.resetTurnTelemetryTraceStoreForTests();

const resolved = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: makePayload({ forceFallback: false }),
  utterance: "מה המשמעות בנושא השברים?",
  sessionId: "telemetry-resolved",
});
assert.equal(resolved.resolutionStatus, "resolved");
assert.ok(resolved.telemetry?.traceId);

const clarification = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: null,
  utterance: "מה קורה כאן?",
  sessionId: "telemetry-clarification",
});
assert.equal(clarification.resolutionStatus, "clarification_required");
assert.ok(clarification.telemetry?.traceId);

const fallback = parentCopilot.runParentCopilotTurn({
  audience: "parent",
  payload: makePayload({ forceFallback: true }),
  utterance: "מה המשמעות בנושא השברים?",
  sessionId: "telemetry-fallback",
});
assert.equal(fallback.resolutionStatus, "resolved");
assert.equal(fallback.fallbackUsed, true);

const snapshot = telemetryStore.readTurnTelemetryTraceStore();
assert.equal(snapshot.schemaVersion, "v1");
assert.ok(Array.isArray(snapshot.events));
assert.ok(snapshot.events.length >= 3);

const fallbackEvent = snapshot.events.find((e) => e.sessionId === "telemetry-fallback");
assert.ok(fallbackEvent);
assert.equal(typeof fallbackEvent.scopeReason, "string");
assert.equal(typeof fallbackEvent.generationPath, "string");
assert.equal(fallbackEvent.fallbackUsed, true);
assert.ok(Array.isArray(fallbackEvent.fallbackReasonCodes));
assert.ok(fallbackEvent.fallbackReasonCodes.length >= 1);

const clarificationEvent = snapshot.events.find((e) => e.sessionId === "telemetry-clarification");
assert.ok(clarificationEvent);
assert.equal(clarificationEvent.resolutionStatus, "clarification_required");
assert.equal(clarificationEvent.scopeReason, "missing_payload");

telemetryStore.resetTurnTelemetryTraceStoreForTests();
for (let i = 1; i <= 11; i++) {
  telemetryStore.appendTurnTelemetryTrace(
    {
      schemaVersion: "v1",
      traceId: `trace-b${i}`,
      sessionId: `b${i}`,
      resolutionStatus: "resolved",
      intent: "understand_meaning",
      intentReason: "test_fixture",
      scopeReason: "test_fixture",
      generationPath: "deterministic",
      fallbackUsed: false,
      validatorStatus: "pass",
      timestampMs: Date.now() + i,
    },
    { maxEntries: 10 },
  );
}
const bounded = telemetryStore.readTurnTelemetryTraceStore();
assert.equal(bounded.events.length, 10);
assert.deepEqual(
  bounded.events.map((e) => e.sessionId),
  ["b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11"],
);

console.log("parent-copilot-telemetry-trace-suite: OK");
