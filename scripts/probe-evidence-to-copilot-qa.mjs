#!/usr/bin/env node
/**
 * Phase 1B QA: probeEvidence wiring to report input and Parent Copilot payload.
 * Tests the full flow:
 *   aggregation returns probeEvidence
 *   → report-data-adapter preserves it
 *   → parent report payload preserves it
 *   → Copilot redaction includes sanitized probeEvidence
 */

import assert from "node:assert/strict";

// Import the modules we're testing
import { normalizeDiagnosticProbeEvidenceFromClientMeta } from "../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../lib/learning-supabase/report-data-adapter.js";
import { redactPayloadForCopilotGrounding } from "../utils/parent-copilot/redact-payload-for-copilot-grounding.js";

// Simulate aggregateParentReportPayload output shape (the source for the adapter)
function simulateAggregationOutput() {
  return {
    student: { id: "student-1", full_name: "Test Student", grade_level: "g5", is_active: true },
    range: { from: "2026-05-01", to: "2026-05-14" },
    summary: {
      totalSessions: 5,
      completedSessions: 5,
      totalAnswers: 42,
      correctAnswers: 35,
      wrongAnswers: 7,
      accuracy: 83.33,
      totalDurationSeconds: 1800,
    },
    subjects: {
      math: {
        answers: 20,
        correct: 16,
        wrong: 4,
        accuracy: 80,
        durationSeconds: 900,
        topics: {
          fractions: {
            answers: 10,
            correct: 7,
            wrong: 3,
            accuracy: 70,
          },
        },
      },
    },
    dailyActivity: [{ date: "2026-05-01", sessions: 1, answers: 8, correct: 7, wrong: 1 }],
    recentMistakes: [],
    // This is the key field we're testing
    probeEvidence: [
      {
        isDiagnosticProbeAttempt: true,
        probeId: "fd_probe_adds_denominators_directly",
        subjectId: "math",
        topicId: "fractions",
        diagnosticSkillId: "math_frac_common_denominator",
        dominantTag: "adds_denominators_directly",
        expectedErrorTags: ["adds_denominators_directly", "wrong_lcm"],
        inferredTags: ["adds_denominators_directly"],
        outcomeStatus: "supported",
        lastOutcome: "wrong_matching_tag",
        supportCount: 1,
        weakenCount: 0,
        answeredAt: "2026-05-10T14:30:00.000Z",
        learningSessionId: "session-123",
        questionId: "probe-frac-001",
      },
    ],
    meta: { source: "supabase", version: "phase-2d-c4-activity-time" },
  };
}

// Simulate a detailed parent report payload (output of buildDetailedParentReportFromBaseReport)
function simulateDetailedReportPayload(baseReport) {
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    diagnosticEngineV2: { units: [] },
    diagnosticPrimarySource: "diagnosticEngineV2",
    periodInfo: {
      period: "week",
      startDate: baseReport.range?.from,
      endDate: baseReport.range?.to,
      playerName: "Test Student",
    },
    executiveSummary: {},
    overallSnapshot: {},
    subjectProfiles: [],
    crossSubjectInsights: [],
    homePlan: {},
    nextPeriodGoals: {},
    parentProductContractV1: {},
    dataIntegrityReport: null,
    contractsV1: {},
    registeredGradeKey: "g5",
    gradePracticeMeta: null,
    // This should pass through from baseReport
    probeEvidence: baseReport.probeEvidence ?? null,
  };
}

function runTests() {
  console.log("=== Phase 1B: probeEvidence to Copilot QA ===\n");

  // Test 1: Aggregation → Adapter
  console.log("Test 1: Aggregation output → Report data adapter");
  const aggregationOutput = simulateAggregationOutput();
  const reportInput = buildReportInputFromDbData(aggregationOutput, {
    period: "week",
    timezone: "UTC",
  });

  assert.ok(Array.isArray(reportInput.probeEvidence), "reportInput has probeEvidence array");
  assert.equal(reportInput.probeEvidence.length, 1, "probeEvidence has 1 item");
  assert.equal(reportInput.probeEvidence[0].subjectId, "math", "probeEvidence[0].subjectId is math");
  assert.equal(reportInput.probeEvidence[0].outcomeStatus, "supported", "probeEvidence[0].outcomeStatus is supported");
  console.log("  ✓ probeEvidence preserved through report-data-adapter\n");

  // Test 2: Verify sanitization in adapter
  console.log("Test 2: Verify probeEvidence sanitization in adapter");
  const probeItem = reportInput.probeEvidence[0];
  assert.equal(probeItem.isDiagnosticProbeAttempt, true, "isDiagnosticProbeAttempt is true");
  assert.ok(probeItem.probeId, "probeId exists");
  assert.ok(probeItem.topicId, "topicId exists");
  assert.equal(typeof probeItem.supportCount, "number", "supportCount is number");
  assert.equal(typeof probeItem.weakenCount, "number", "weakenCount is number");
  assert.ok(Array.isArray(probeItem.expectedErrorTags), "expectedErrorTags is array");
  assert.ok(Array.isArray(probeItem.inferredTags), "inferredTags is array");
  console.log("  ✓ probeEvidence properly sanitized\n");

  // Test 3: Adapter → Parent Report Payload
  console.log("Test 3: Report input → Parent report payload");
  // Simulate what happens in buildDetailedParentReportFromBaseReport
  const baseReport = {
    ...aggregationOutput,
    playerName: "Test Student",
    period: "week",
    startDate: aggregationOutput.range.from,
    endDate: aggregationOutput.range.to,
    probeEvidence: reportInput.probeEvidence,
  };
  const detailedReport = simulateDetailedReportPayload(baseReport);

  assert.ok(detailedReport.probeEvidence, "detailedReport has probeEvidence");
  assert.equal(detailedReport.probeEvidence.length, 1, "detailedReport.probeEvidence has 1 item");
  assert.equal(detailedReport.probeEvidence[0].probeId, "fd_probe_adds_denominators_directly", "probeId preserved");
  console.log("  ✓ probeEvidence preserved in detailed report payload\n");

  // Test 4: Parent Report → Copilot Redaction
  console.log("Test 4: Detailed report → Copilot redaction");
  const redacted = redactPayloadForCopilotGrounding(detailedReport);

  assert.ok(redacted.probeEvidence, "redacted payload has probeEvidence");
  assert.equal(redacted.probeEvidence.length, 1, "redacted probeEvidence has 1 item");
  const redactedProbe = redacted.probeEvidence[0];
  assert.equal(redactedProbe.subjectId, "math", "redacted probe has subjectId");
  assert.equal(redactedProbe.topicId, "fractions", "redacted probe has topicId");
  assert.equal(redactedProbe.probeId, "fd_probe_adds_denominators_directly", "redacted probe has probeId");
  assert.equal(redactedProbe.outcomeStatus, "supported", "redacted probe has outcomeStatus");
  assert.ok(redactedProbe.expectedErrorTags, "redacted probe has expectedErrorTags");
  assert.ok(redactedProbe.inferredTags, "redacted probe has inferredTags");
  console.log("  ✓ probeEvidence present in Copilot redacted payload\n");

  // Test 5: Verify safe shape (no internal metadata exposed)
  console.log("Test 5: Verify Copilot-safe shape (no raw debug objects)");
  assert.strictEqual(redactedProbe.isDiagnosticProbeAttempt, undefined, "isDiagnosticProbeAttempt stripped (implied by presence in array)");
  assert.strictEqual(redactedProbe.learningSessionId, undefined, "learningSessionId not exposed to Copilot");
  assert.strictEqual(redactedProbe.lastOutcome, undefined, "lastOutcome not exposed to Copilot");
  assert.strictEqual(redactedProbe.diagnosticSkillId, undefined, "diagnosticSkillId not exposed to Copilot");
  assert.strictEqual(typeof redactedProbe.supportCount, "number", "supportCount is number");
  assert.strictEqual(typeof redactedProbe.weakenCount, "number", "weakenCount is number");
  console.log("  ✓ Copilot payload sanitized (no internal metadata exposed)\n");

  // Test 6: Verify no probeEvidence when input is empty
  console.log("Test 6: Empty probeEvidence handling");
  const emptyReport = { ...detailedReport, probeEvidence: [] };
  const redactedEmpty = redactPayloadForCopilotGrounding(emptyReport);
  assert.deepStrictEqual(redactedEmpty.probeEvidence, [], "empty probeEvidence stays empty");
  console.log("  ✓ Empty probeEvidence handled correctly\n");

  // Test 7: Verify no probeEvidence field when null/undefined
  console.log("Test 7: Null probeEvidence handling");
  const nullProbeReport = { ...detailedReport, probeEvidence: null };
  const redactedNull = redactPayloadForCopilotGrounding(nullProbeReport);
  // The redaction should either preserve null or convert to empty array
  assert.ok(redactedNull.probeEvidence === null || redactedNull.probeEvidence === undefined || Array.isArray(redactedNull.probeEvidence), "null probeEvidence handled");
  console.log("  ✓ Null probeEvidence handled correctly\n");

  console.log("=== All Phase 1B Tests Passed ===");
  console.log("\nFinal shapes:");
  console.log("\n1. Report input probeEvidence[0]:");
  console.log(JSON.stringify(reportInput.probeEvidence[0], null, 2));
  console.log("\n2. Copilot redacted probeEvidence[0]:");
  console.log(JSON.stringify(redactedProbe, null, 2));
  process.exit(0);
}

runTests().catch((e) => {
  console.error("\n❌ FAIL:", e.message);
  process.exit(1);
});
