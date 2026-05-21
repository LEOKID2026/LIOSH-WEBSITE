#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  buildPendingProbeFromMistake,
  attachProbeMetaToQuestion,
  applyProbeOutcome,
  buildDiagnosticProbeClientMeta,
  selectQuestionWithProbe,
} from "../utils/active-diagnostic-runtime/index.js";
import { normalizeMistakeEvent } from "../utils/mistake-event.js";
import { normalizeDiagnosticProbeEvidenceFromClientMeta } from "../lib/parent-server/report-data-aggregate.server.js";

const wrong = normalizeMistakeEvent(
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
  wrong,
  {
    wrongAvoidKey: "wrong-row-1",
    fallbackTopicId: "fractions",
    fallbackGrade: "g5",
    fallbackLevel: "easy",
  },
  "math"
);
assert.ok(pendingProbe, "pending probe is created from wrong answer");

const probeQuestion = {
  id: "probe-row-1",
  topic: "fractions",
  params: {
    expectedErrorTags: ["adds_denominators_directly"],
    probePower: "concept_check",
  },
};
const fallbackQuestion = { id: "fallback-row-1", topic: "fractions", params: {} };
const selected = selectQuestionWithProbe({
  items: [probeQuestion, fallbackQuestion],
  pendingProbe,
  recentIds: [],
  currentTopic: "fractions",
  fallbackPick: () => fallbackQuestion,
  randomFn: () => 0,
});
assert.equal(selected.usedProbe, true, "probe question is selected when matching row exists");

const markedQuestion = attachProbeMetaToQuestion(selected.question, {
  probeSnapshot: pendingProbe,
  probeReason: selected.reason,
});
assert.equal(markedQuestion._diagnosticProbeAttempt, true, "probe question is marked");

const ledger = applyProbeOutcome(null, {
  isCorrect: false,
  inferredTags: ["adds_denominators_directly"],
  probeMeta: markedQuestion._probeMeta,
  now: 1700000000000,
});
assert.equal(ledger.status, "supported", "probe answer applies supported outcome");

const diagnosticProbe = buildDiagnosticProbeClientMeta({
  probeMeta: markedQuestion._probeMeta,
  ledger,
  inferredTags: ["adds_denominators_directly"],
  answeredAt: 1700000000000,
  learningSessionId: "session-1",
});
assert.equal(diagnosticProbe.isDiagnosticProbeAttempt, true, "safe probe metadata is created for clientMeta");
assert.equal(diagnosticProbe.outcomeStatus, "supported", "clientMeta stores outcome status");

const savedAnswerPayload = {
  clientMeta: {
    source: "math-master",
    version: "test",
    diagnosticProbe,
  },
};
const reportEvidence = normalizeDiagnosticProbeEvidenceFromClientMeta(savedAnswerPayload.clientMeta, {
  subject: "math",
  topic: "fractions",
  answeredAt: "2026-05-21T14:00:00.000Z",
  learningSessionId: "session-1",
  questionId: "probe-row-1",
});
assert.equal(reportEvidence?.outcomeStatus, "supported", "report builder reads persisted probe evidence");
assert.deepEqual(reportEvidence?.expectedErrorTags, ["adds_denominators_directly"]);
assert.equal(reportEvidence?.learningSessionId, "session-1");

console.log("PASS: probe persistence/report evidence QA");
