#!/usr/bin/env node
/**
 * Debug script to verify english_fragile_hints diagnostic engine output
 */

import assert from "node:assert/strict";
import * as diagnosticEngineModule from "../utils/diagnostic-engine-v2/index.js";

const runDiagnosticEngineV2 =
  diagnosticEngineModule.runDiagnosticEngineV2 ||
  diagnosticEngineModule.default?.runDiagnosticEngineV2;

const START_MS = Date.UTC(2026, 3, 1, 0, 0, 0, 0);

function wrongEvents({ subject, bucketKey, count, withHints = false }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      subject,
      topic: bucketKey,
      operation: bucketKey,
      bucketKey,
      mode: "learning",
      grade: "g4",
      level: "medium",
      timestamp: START_MS + i * 3600_000 * 6 + (i % 1) * 86_400_000,
      isCorrect: false,
      patternFamily: `pf:fixture:${i % 3}`,
      hintUsed: withHints,
      exerciseText: `${bucketKey} q${i}`,
      correctAnswer: 10,
      userAnswer: 3,
    });
  }
  return out;
}

function row({ displayName, questions, correct, wrong, accuracy, behaviorType }) {
  return {
    displayName,
    questions,
    correct,
    wrong,
    accuracy,
    modeKey: "learning",
    behaviorType,
    lastSessionMs: Date.UTC(2026, 3, 14, 23, 59, 59, 999) - 3600_000,
    needsPractice: accuracy < 85,
    confidence01: 0.5,
    dataSufficiencyLevel: questions >= 12 ? "medium" : "low",
    isEarlySignalOnly: questions < 8,
    behaviorProfile: { version: 1, dominantType: behaviorType, signals: {}, decisionTrace: [] },
  };
}

// Run the english_fragile_hints scenario
const rowData = row({ displayName: "דקדוק", questions: 16, correct: 12, wrong: 4, accuracy: 75, behaviorType: "fragile_success" });
const mistakes = wrongEvents({ subject: "english", bucketKey: "grammar", count: 5, withHints: true });

const result = runDiagnosticEngineV2({
  periodDays: 14,
  rowsBySubject: {
    english: {
      "grammar\u0001learning": rowData,
    },
  },
  mistakesBySubject: {
    english: mistakes,
  },
  sessionsBySubject: {
    english: [],
  },
});

console.log("=== English Fragile + Hints Diagnostic Engine Output ===\n");

const unit = result?.units?.[0];
if (!unit) {
  console.log("No units produced by engine");
  process.exit(1);
}

console.log("Unit output:");
console.log(`  subjectId: ${unit.subjectId}`);
console.log(`  confidence.level: ${unit.confidence?.level}`);
console.log(`  priority.level: ${unit.priority?.level}`);
console.log(`  outputGating:`);
console.log(`    diagnosisAllowed: ${unit.outputGating?.diagnosisAllowed}`);
console.log(`    probeOnly: ${unit.outputGating?.probeOnly}`);
console.log(`    cannotConcludeYet: ${unit.outputGating?.cannotConcludeYet}`);
console.log(`    confidenceOnly: ${unit.outputGating?.confidenceOnly}`);
console.log(`    interventionAllowed: ${unit.outputGating?.interventionAllowed}`);
console.log(`    weak: ${unit.outputGating?.weak}`);
console.log(`    humanReviewRecommended: ${unit.outputGating?.humanReviewRecommended}`);

// Verify conservatism
console.log("\n=== Conservatism Checks ===");

// Check 1: No overconfident diagnosis
const noOverconfidentDiagnosis = !unit.outputGating?.diagnosisAllowed || unit.outputGating?.confidenceOnly;
console.log(`1. No overconfident diagnosis: ${noOverconfidentDiagnosis ? "✓ PASS" : "✗ FAIL"}`);
console.log(`   (diagnosisAllowed=${unit.outputGating?.diagnosisAllowed}, confidenceOnly=${unit.outputGating?.confidenceOnly})`);

// Check 2: No strong intervention from fragile/hinted evidence
const noStrongIntervention = !unit.outputGating?.interventionAllowed;
console.log(`2. No strong intervention: ${noStrongIntervention ? "✓ PASS" : "✗ FAIL"}`);
console.log(`   (interventionAllowed=${unit.outputGating?.interventionAllowed})`);

// Check 3: Conservative confidence level
const conservativeConfidence = ["early_signal_only", "low", "moderate", "insufficient_data"].includes(unit.confidence?.level);
console.log(`3. Conservative confidence: ${conservativeConfidence ? "✓ PASS" : "✗ FAIL"}`);
console.log(`   (confidence.level=${unit.confidence?.level})`);

// Check 4: Fields exist and are boolean
const fieldsAreBoolean =
  typeof unit.outputGating?.probeOnly === "boolean" &&
  typeof unit.outputGating?.cannotConcludeYet === "boolean" &&
  typeof unit.outputGating?.confidenceOnly === "boolean";
console.log(`4. Fields are boolean: ${fieldsAreBoolean ? "✓ PASS" : "✗ FAIL"}`);

// Overall safety check
const isSafe = noOverconfidentDiagnosis && noStrongIntervention && conservativeConfidence;
console.log(`\n=== Overall Safety: ${isSafe ? "✓ SAFE" : "⚠ CAUTION"} ===`);

// Exit with appropriate code
process.exit(isSafe ? 0 : 1);
