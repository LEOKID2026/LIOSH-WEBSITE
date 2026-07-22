/**
 * Persistence E2E — identify pattern → exit session → re-enter → resume probe.
 * Run: node --test tests/learning/misconception-state-persistence.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildDiagnosticStateStorageKey,
  bindDiagnosticStateTestStore,
  DIAGNOSTIC_STATE_VERSION,
} from "../../lib/learning/diagnostic-state-persistence.js";
import {
  bootstrapMasterDiagnosticState,
  buildMasterDiagnosticCtx,
  recordMisconceptionAdaptiveAnswer,
  snapshotMasterDiagnosticState,
} from "../../lib/learning/diagnostic-state-master-helper.js";
import { createMisconceptionAdaptiveState } from "../../lib/learning/misconception-adaptive-routing.js";
import { buildPendingProbeFromMistake } from "../../utils/active-diagnostic-runtime/build-pending-probe.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";

describe("diagnostic state persistence", () => {
  test("storage key is stable per student+subject+context", () => {
    const k1 = buildDiagnosticStateStorageKey({
      studentId: "s1",
      subjectId: "math",
      gradeKey: "g5",
      levelKey: "easy",
      operationOrTopic: "addition",
    });
    const k2 = buildDiagnosticStateStorageKey({
      studentId: "s1",
      subjectId: "math",
      gradeKey: "g5",
      levelKey: "easy",
      operationOrTopic: "addition",
    });
    assert.equal(k1, k2);
    assert.notEqual(
      k1,
      buildDiagnosticStateStorageKey({
        studentId: "s1",
        subjectId: "math",
        gradeKey: "g4",
        levelKey: "easy",
        operationOrTopic: "addition",
      })
    );
  });

  test("E2E: pattern → exit → re-enter → resume probe/focus", () => {
    const store = new Map();
    const testStore = bindDiagnosticStateTestStore(store);
    const ctx = buildMasterDiagnosticCtx("student-omer", "math", "g5", "easy", "addition");

    const pendingRef = { current: { subjectId: "math", topicId: "addition", dominantTag: "omitted_addend" } };
    const ledgerRef = { current: null };
    const adaptiveRef = { current: createMisconceptionAdaptiveState() };

    recordMisconceptionAdaptiveAnswer({
      ctx,
      pendingRef,
      ledgerRef,
      adaptiveRef,
      tag: "omitted_addend",
      isCorrect: false,
    });
    recordMisconceptionAdaptiveAnswer({
      ctx,
      pendingRef,
      ledgerRef,
      adaptiveRef,
      tag: "omitted_addend",
      isCorrect: false,
    });
    assert.equal(adaptiveRef.current.phase, "probe");

    testStore.save({
      ...ctx,
      pendingProbe: pendingRef.current,
      hypothesisLedger: ledgerRef.current,
      adaptiveState: adaptiveRef.current,
    });

    pendingRef.current = null;
    ledgerRef.current = null;
    adaptiveRef.current = createMisconceptionAdaptiveState();

    const loaded = testStore.load(ctx);
    assert.ok(loaded);
    assert.equal(loaded.v, DIAGNOSTIC_STATE_VERSION);
    pendingRef.current = loaded.pendingProbe;
    ledgerRef.current = loaded.hypothesisLedger;
    adaptiveRef.current = loaded.adaptiveState;
    assert.ok(pendingRef.current);
    assert.equal(pendingRef.current.subjectId, "math");
    assert.equal(adaptiveRef.current.phase, "probe");
    assert.equal(adaptiveRef.current.activeTag, "omitted_addend");
  });

  test("logout/login simulation — same studentId restores", () => {
    const store = new Map();
    const testStore = bindDiagnosticStateTestStore(store);
    const ctx = buildMasterDiagnosticCtx("student-42", "hebrew", "g3", "medium", "spelling");

    const pendingRef = { current: { subjectId: "hebrew", topicId: "spelling", dominantTag: "spelling_pattern_error" } };
    const ledgerRef = { current: { hypothesisKey: "fd_probe_spelling_pattern_error", status: "supported" } };
    const adaptiveRef = { current: createMisconceptionAdaptiveState() };
    adaptiveRef.current.phase = "focused_practice";
    adaptiveRef.current.activeTag = "spelling_pattern_error";

    testStore.save({
      ...ctx,
      pendingProbe: pendingRef.current,
      hypothesisLedger: ledgerRef.current,
      adaptiveState: adaptiveRef.current,
    });

    pendingRef.current = null;
    ledgerRef.current = null;
    adaptiveRef.current = createMisconceptionAdaptiveState();

    const loaded = testStore.load(ctx);
    pendingRef.current = loaded.pendingProbe;
    ledgerRef.current = loaded.hypothesisLedger;
    adaptiveRef.current = loaded.adaptiveState;
    assert.equal(adaptiveRef.current.phase, "focused_practice");
    assert.equal(ledgerRef.current.status, "supported");
  });
});
