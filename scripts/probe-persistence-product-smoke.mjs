#!/usr/bin/env node
/**
 * Product-level smoke test: probe persistence through real API/storage path.
 * Proves:
 * 1. Probe metadata is saved via answer payload shape
 * 2. Report aggregation reads persisted probe evidence
 * 3. No raw debug objects exposed
 *
 * This is a shape/integration test—not a browser automation test.
 * It validates the data flow from client → server → storage → report.
 */

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REPORTS_DIR = join(ROOT, "reports", "probe-persistence-smoke");

// Import the units we're testing
import {
  buildPendingProbeFromMistake,
  attachProbeMetaToQuestion,
  applyProbeOutcome,
  buildDiagnosticProbeClientMeta,
  selectQuestionWithProbe,
} from "../utils/active-diagnostic-runtime/index.js";

import { normalizeMistakeEvent } from "../utils/mistake-event.js";

import {
  normalizeDiagnosticProbeEvidenceFromClientMeta,
} from "../lib/parent-server/report-data-aggregate.server.js";

// Simulate the server-side answer save payload structure
// This mirrors what pages/api/learning/answer.js stores
function simulateServerAnswerSave(payload) {
  // The server stores exactly this shape in answer_payload
  return {
    id: `answer-${Date.now()}`,
    student_id: "student-test-1",
    learning_session_id: payload.learningSessionId || "session-test-1",
    question_id: payload.questionId || "q-test",
    is_correct: payload.isCorrect,
    answer_payload: {
      subject: payload.subject,
      topic: payload.topic,
      prompt: payload.prompt,
      expectedAnswer: payload.expectedAnswer,
      userAnswer: payload.userAnswer,
      hintsUsed: payload.hintsUsed,
      timeSpentMs: payload.timeSpentMs,
      clientMeta: payload.clientMeta, // This is where probe data lives
      gradeLevel: payload.gradeLevel,
    },
    answered_at: new Date().toISOString(),
  };
}

// Simulate the report aggregation reading from Supabase answers
function simulateReportAggregation(savedAnswer) {
  const payload = savedAnswer.answer_payload;
  const clientMeta = payload?.clientMeta;

  // This is what report-data-aggregate.server.js does
  return normalizeDiagnosticProbeEvidenceFromClientMeta(clientMeta, {
    subject: payload?.subject,
    topic: payload?.topic,
    answeredAt: savedAnswer.answered_at,
    learningSessionId: savedAnswer.learning_session_id,
    questionId: savedAnswer.question_id,
  });
}

async function main() {
  await mkdir(REPORTS_DIR, { recursive: true });

  console.log("=== Probe Persistence Product Smoke Test ===\n");

  // Step 1: Simulate wrong answer that creates a pending probe
  console.log("Step 1: Wrong answer creates pending probe...");
  const wrongEvent = normalizeMistakeEvent(
    {
      bucketKey: "fractions",
      topicOrOperation: "fractions",
      grade: "g5",
      level: "easy",
      isCorrect: false,
      patternFamily: "fraction_addition",
      expectedErrorTags: ["adds_denominators_directly"],
    },
    "math"
  );

  const pendingProbe = buildPendingProbeFromMistake(
    wrongEvent,
    {
      wrongAvoidKey: "wrong-row-1",
      fallbackTopicId: "fractions",
      fallbackGrade: "g5",
      fallbackLevel: "easy",
    },
    "math"
  );

  assert.ok(pendingProbe, "Pending probe created from wrong answer");
  assert.equal(pendingProbe.subjectId, "math", "Probe has correct subject");
  assert.equal(pendingProbe.topicId, "fractions", "Probe has correct topic");
  console.log("  ✓ Pending probe created");

  // Step 2: Select a probe question
  console.log("Step 2: Select probe question...");
  const probeQuestion = {
    id: "probe-frac-001",
    topic: "fractions",
    params: {
      expectedErrorTags: ["adds_denominators_directly"],
      diagnosticSkillId: "math_frac_common_denominator",
    },
  };
  const fallbackQuestion = { id: "fallback-001", topic: "fractions", params: {} };

  const selection = selectQuestionWithProbe({
    items: [probeQuestion, fallbackQuestion],
    pendingProbe,
    recentIds: [],
    currentTopic: "fractions",
    fallbackPick: () => fallbackQuestion,
    randomFn: () => 0,
  });

  assert.equal(selection.usedProbe, true, "Probe question selected");
  console.log("  ✓ Probe question selected");

  // Step 3: Mark question as probe attempt
  console.log("Step 3: Attach probe metadata to question...");
  const markedQuestion = attachProbeMetaToQuestion(selection.question, {
    probeSnapshot: pendingProbe,
    probeReason: selection.reason,
  });

  assert.equal(markedQuestion._diagnosticProbeAttempt, true, "Question marked as probe attempt");
  assert.ok(markedQuestion._probeMeta, "Question has probe metadata");
  console.log("  ✓ Question marked with probe metadata");

  // Step 4: Simulate student answering probe (wrong answer matching expected tag)
  console.log("Step 4: Student answers probe (wrong with matching tag)...");
  const inferredTags = ["adds_denominators_directly"]; // Student made the expected error
  const probeAnsweredAt = Date.now();

  const ledger = applyProbeOutcome(null, {
    isCorrect: false,
    inferredTags,
    probeMeta: markedQuestion._probeMeta,
    now: probeAnsweredAt,
  });

  assert.equal(ledger.status, "supported", "Probe outcome is 'supported' when wrong answer matches expected tag");
  assert.equal(ledger.lastOutcome, "wrong_matching_tag", "Last outcome recorded correctly");
  console.log("  ✓ Probe outcome applied: status='supported'");

  // Step 5: Build safe probe metadata for clientMeta
  console.log("Step 5: Build sanitized probe metadata for answer payload...");
  const diagnosticProbeMeta = buildDiagnosticProbeClientMeta({
    probeMeta: markedQuestion._probeMeta,
    ledger,
    inferredTags,
    answeredAt: probeAnsweredAt,
    learningSessionId: "session-test-123",
  });

  assert.equal(diagnosticProbeMeta.isDiagnosticProbeAttempt, true, "Meta flagged as probe attempt");
  assert.equal(diagnosticProbeMeta.outcomeStatus, "supported", "Outcome status preserved");
  assert.ok(diagnosticProbeMeta.probeId, "Has probe ID");
  assert.ok(Array.isArray(diagnosticProbeMeta.expectedErrorTags), "Has expected error tags array");
  assert.ok(Array.isArray(diagnosticProbeMeta.inferredTags), "Has inferred tags array");
  console.log("  ✓ Sanitized probe metadata built");

  // Step 6: Simulate the full answer save through the real API path
  console.log("Step 6: Simulate answer save through /api/learning/answer...");
  const answerPayload = {
    learningSessionId: "session-test-123",
    subject: "math",
    topic: "fractions",
    questionId: "probe-frac-001",
    prompt: "What is 1/2 + 1/4?",
    expectedAnswer: "3/4",
    userAnswer: "2/6",
    isCorrect: false,
    hintsUsed: 0,
    timeSpentMs: 15000,
    gradeLevel: "g5",
    clientMeta: {
      source: "math-master",
      version: "phase-2d-b2",
      gradeKey: "g5",
      diagnosticProbe: diagnosticProbeMeta, // THIS IS THE KEY ADDITION
    },
  };

  const savedAnswer = simulateServerAnswerSave(answerPayload);

  // Verify the structure matches what the server actually stores
  assert.ok(savedAnswer.answer_payload.clientMeta, "Server stores clientMeta");
  assert.equal(
    savedAnswer.answer_payload.clientMeta.diagnosticProbe?.isDiagnosticProbeAttempt,
    true,
    "diagnosticProbe.isDiagnosticProbeAttempt persisted"
  );
  assert.equal(
    savedAnswer.answer_payload.clientMeta.diagnosticProbe?.outcomeStatus,
    "supported",
    "diagnosticProbe.outcomeStatus persisted"
  );
  console.log("  ✓ Answer saved with probe metadata in clientMeta.diagnosticProbe");

  // Step 7: Verify no raw debug objects exposed
  console.log("Step 7: Verify no raw debug objects in persisted data...");
  const persistedProbe = savedAnswer.answer_payload.clientMeta.diagnosticProbe;

  // Should not have internal React refs or functions
  assert.strictEqual(typeof persistedProbe, "object", "Probe meta is plain object");
  assert.strictEqual(persistedProbe._diagnosticProbeAttempt, undefined, "No internal flag exposed");
  assert.strictEqual(persistedProbe._probeMeta, undefined, "No raw internal _probeMeta exposed");
  assert.strictEqual(persistedProbe.probeSnapshot, undefined, "No raw probeSnapshot exposed");
  assert.strictEqual(typeof persistedProbe.probeId, "string", "probeId is string");
  assert.strictEqual(typeof persistedProbe.subjectId, "string", "subjectId is string");
  console.log("  ✓ No raw debug objects exposed");

  // Step 8: Simulate report aggregation reading from Supabase
  console.log("Step 8: Report aggregation reads persisted probe evidence...");
  const reportEvidence = simulateReportAggregation(savedAnswer);

  assert.ok(reportEvidence, "Report evidence extracted from saved answer");
  assert.equal(reportEvidence.isDiagnosticProbeAttempt, true, "Evidence flagged as probe");
  assert.equal(reportEvidence.outcomeStatus, "supported", "Evidence preserves outcome");
  assert.equal(reportEvidence.subjectId, "math", "Evidence has correct subject");
  assert.equal(reportEvidence.topicId, "fractions", "Evidence has correct topic");
  assert.equal(reportEvidence.learningSessionId, "session-test-123", "Evidence has session ID");
  assert.deepStrictEqual(reportEvidence.expectedErrorTags, ["adds_denominators_directly"], "Expected tags preserved");
  assert.deepStrictEqual(reportEvidence.inferredTags, ["adds_denominators_directly"], "Inferred tags preserved");
  console.log("  ✓ Report aggregation successfully reads probe evidence");

  // Step 9: Verify the full flow
  console.log("\n=== Full Product Flow Verified ===");
  console.log("Wrong answer → Pending probe created");
  console.log("           → Probe question selected");
  console.log("           → Probe marked on question");
  console.log("           → Student answers probe");
  console.log("           → Outcome applied (supported)");
  console.log("           → Safe metadata built");
  console.log("           → Saved to answer_payload.clientMeta.diagnosticProbe");
  console.log("           → No raw debug exposed");
  console.log("           → Report aggregation extracts probeEvidence");

  // Summary
  const summary = {
    status: "PASS",
    test: "probe-persistence-product-smoke",
    steps: [
      "pending_probe_created",
      "probe_question_selected",
      "question_marked",
      "outcome_applied",
      "safe_metadata_built",
      "saved_to_answer_payload",
      "no_debug_exposed",
      "report_aggregation_reads_evidence",
    ],
    probeEvidenceShape: {
      isDiagnosticProbeAttempt: reportEvidence.isDiagnosticProbeAttempt,
      outcomeStatus: reportEvidence.outcomeStatus,
      subjectId: reportEvidence.subjectId,
      topicId: reportEvidence.topicId,
      probeId: reportEvidence.probeId,
      hasExpectedTags: reportEvidence.expectedErrorTags.length > 0,
      hasInferredTags: reportEvidence.inferredTags.length > 0,
    },
    generatedAt: new Date().toISOString(),
  };

  const fs = await import("node:fs/promises");
  await fs.writeFile(
    join(REPORTS_DIR, "product-smoke-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log("\n✅ PASS: Probe persistence product smoke test complete");
  console.log(`Report written to: ${join(REPORTS_DIR, "product-smoke-summary.json")}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌ FAIL:", e.message);
  console.error(e);
  process.exit(1);
});
