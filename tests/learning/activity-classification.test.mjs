/**
 * Phase 1 test gate — Activity Classification Layer
 *
 * Covers the full classification matrix:
 *  - All 11 free-practice modes
 *  - All 7 assigned activity modes
 *  - All 3 context overrides (afterStepByStep, contextAfterBookReading, hintsUsed)
 *  - learning_book source/mode
 *  - Unknown / missing mode fallback
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyActivityEvidence,
  EVIDENCE_CATEGORIES,
  DIAGNOSTIC_ELIGIBLE_MODES,
  MODE_CLASSIFICATION_MAP,
} from "../../lib/learning/activity-classification.js";

// ── Free-practice: diagnostic independent modes ──────────────────────────────

test("practice → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("practice");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("graded → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("graded");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("drill → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("drill");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("review → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("review");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("normal → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("normal");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

// ── Free-practice: diagnostic guided mode ────────────────────────────────────

test("practice_mistakes → diagnostic_guided, eligible", () => {
  const r = classifyActivityEvidence("practice_mistakes");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED);
});

// ── Free-practice: competitive modes ─────────────────────────────────────────

test("challenge → diagnostic_competitive, eligible", () => {
  const r = classifyActivityEvidence("challenge");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE);
});

test("speed → diagnostic_competitive, eligible", () => {
  const r = classifyActivityEvidence("speed");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE);
});

test("marathon → diagnostic_competitive, eligible", () => {
  const r = classifyActivityEvidence("marathon");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE);
});

// ── Free-practice: non-diagnostic modes ──────────────────────────────────────

test("learning → learning_guided, NOT eligible", () => {
  const r = classifyActivityEvidence("learning");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

test("mistakes → learning_review, NOT eligible", () => {
  const r = classifyActivityEvidence("mistakes");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_REVIEW);
});

// ── Assigned activity modes ───────────────────────────────────────────────────

test("quiz → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("quiz", "assigned_class");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("homework → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("homework", "assigned_class");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("worksheet → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("worksheet", "assigned_class");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("live_lesson → diagnostic_guided, eligible", () => {
  const r = classifyActivityEvidence("live_lesson", "assigned_class");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED);
});

test("guided_practice → learning_guided, NOT eligible (classroom)", () => {
  const r = classifyActivityEvidence("guided_practice", "assigned_class");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

test("guided_practice from parent → diagnostic_guided, eligible", () => {
  const r = classifyActivityEvidence("guided_practice", "assigned_parent");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_GUIDED);
});

test("homework from parent → diagnostic_independent, eligible", () => {
  const r = classifyActivityEvidence("homework", "assigned_parent");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

test("discussion → learning_context, NOT eligible", () => {
  const r = classifyActivityEvidence("discussion", "assigned_class");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_CONTEXT);
});

// ── Context overrides ─────────────────────────────────────────────────────────

test("afterStepByStep=true overrides practice → learning_guided, NOT eligible", () => {
  const r = classifyActivityEvidence("practice", "free_practice", { afterStepByStep: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
  assert.equal(r.contextFlags.stepByStepOverride, true);
  assert.equal(r.contextFlags.afterStepByStep, true);
});

test("afterStepByStep=true overrides challenge → learning_guided, NOT eligible", () => {
  const r = classifyActivityEvidence("challenge", "free_practice", { afterStepByStep: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
  assert.equal(r.contextFlags.stepByStepOverride, true);
});

test("afterStepByStep=true overrides quiz → learning_guided, NOT eligible", () => {
  const r = classifyActivityEvidence("quiz", "assigned_class", { afterStepByStep: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_GUIDED);
});

test("contextAfterBookReading=true + practice → still eligible, flag set", () => {
  const r = classifyActivityEvidence("practice", "free_practice", { contextAfterBookReading: true });
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
  assert.equal(r.contextFlags.contextAfterBookReading, true);
});

test("contextAfterBookReading=true + learning → still NOT eligible", () => {
  const r = classifyActivityEvidence("learning", "free_practice", { contextAfterBookReading: true });
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.contextFlags.contextAfterBookReading, true);
});

test("hintsUsed=3 → hasHints=true, does not change eligibility", () => {
  const r = classifyActivityEvidence("practice", "free_practice", { hintsUsed: 3 });
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.contextFlags.hasHints, true);
});

test("hintsUsed=0 → hasHints=false", () => {
  const r = classifyActivityEvidence("practice", "free_practice", { hintsUsed: 0 });
  assert.equal(r.contextFlags.hasHints, false);
});

// ── Book source / mode ────────────────────────────────────────────────────────

test("learning_book mode → learning_book, NOT eligible", () => {
  const r = classifyActivityEvidence("learning_book");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_BOOK);
});

test("source=learning_book → learning_book, NOT eligible regardless of mode", () => {
  const r = classifyActivityEvidence("practice", "learning_book");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.LEARNING_BOOK);
});

// ── Unknown / missing mode fallback ──────────────────────────────────────────

test("null mode → unclassified, NOT eligible", () => {
  const r = classifyActivityEvidence(null);
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.UNCLASSIFIED);
  assert.equal(r.contextFlags.unknownMode, true);
});

test("undefined mode → unclassified, NOT eligible", () => {
  const r = classifyActivityEvidence(undefined);
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.UNCLASSIFIED);
});

test("empty string mode → unclassified, NOT eligible", () => {
  const r = classifyActivityEvidence("");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.UNCLASSIFIED);
});

test("random garbage mode → unclassified, NOT eligible", () => {
  const r = classifyActivityEvidence("xyzzy_unknown_mode");
  assert.equal(r.isDiagnosticEligible, false);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.UNCLASSIFIED);
  assert.equal(r.contextFlags.unknownMode, true);
  assert.equal(r.contextFlags.rawMode, "xyzzy_unknown_mode");
});

test("mode casing is normalized - PRACTICE (uppercase) → eligible", () => {
  const r = classifyActivityEvidence("PRACTICE");
  assert.equal(r.isDiagnosticEligible, true);
  assert.equal(r.evidenceCategory, EVIDENCE_CATEGORIES.DIAGNOSTIC_INDEPENDENT);
});

// ── DIAGNOSTIC_ELIGIBLE_MODES export ─────────────────────────────────────────

test("DIAGNOSTIC_ELIGIBLE_MODES contains all expected eligible modes", () => {
  const expected = [
    "practice", "graded", "drill", "review", "normal",
    "practice_mistakes", "challenge", "speed", "marathon",
    "quiz", "homework", "worksheet", "live_lesson",
  ];
  for (const mode of expected) {
    assert.ok(DIAGNOSTIC_ELIGIBLE_MODES.has(mode), `Expected ${mode} to be in DIAGNOSTIC_ELIGIBLE_MODES`);
  }
});

test("DIAGNOSTIC_ELIGIBLE_MODES does NOT contain non-diagnostic modes", () => {
  const excluded = ["learning", "mistakes", "guided_practice", "discussion", "learning_book"];
  for (const mode of excluded) {
    assert.ok(!DIAGNOSTIC_ELIGIBLE_MODES.has(mode), `Expected ${mode} NOT in DIAGNOSTIC_ELIGIBLE_MODES`);
  }
});

// ── MODE_CLASSIFICATION_MAP completeness check ────────────────────────────────

test("MODE_CLASSIFICATION_MAP covers all 18 expected modes", () => {
  const allExpected = [
    "practice", "graded", "drill", "review", "normal",
    "practice_mistakes", "challenge", "speed", "marathon",
    "learning", "mistakes",
    "quiz", "homework", "worksheet", "live_lesson",
    "guided_practice", "discussion", "learning_book",
  ];
  for (const mode of allExpected) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(MODE_CLASSIFICATION_MAP, mode),
      `Expected MODE_CLASSIFICATION_MAP to have entry for '${mode}'`
    );
  }
});

test("every MODE_CLASSIFICATION_MAP entry has isDiagnosticEligible boolean and evidenceCategory string", () => {
  for (const [mode, entry] of Object.entries(MODE_CLASSIFICATION_MAP)) {
    assert.ok(
      typeof entry.isDiagnosticEligible === "boolean",
      `${mode}: isDiagnosticEligible must be boolean`
    );
    assert.ok(
      typeof entry.evidenceCategory === "string" && entry.evidenceCategory.length > 0,
      `${mode}: evidenceCategory must be non-empty string`
    );
  }
});

// ── contextFlags shape ────────────────────────────────────────────────────────

test("result always has contextFlags with required boolean fields", () => {
  const modes = ["practice", "learning", "quiz", null, "challenge"];
  for (const mode of modes) {
    const r = classifyActivityEvidence(mode);
    assert.ok(typeof r.contextFlags === "object", `${mode}: contextFlags must be object`);
    assert.ok(typeof r.contextFlags.afterStepByStep === "boolean", `${mode}: afterStepByStep must be boolean`);
    assert.ok(typeof r.contextFlags.contextAfterBookReading === "boolean", `${mode}: contextAfterBookReading must be boolean`);
    assert.ok(typeof r.contextFlags.hasHints === "boolean", `${mode}: hasHints must be boolean`);
  }
});
