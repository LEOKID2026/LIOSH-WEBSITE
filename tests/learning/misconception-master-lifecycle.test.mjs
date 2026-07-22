/**
 * Master lifecycle E2E — pattern → probe → focus → refresh → resume → recovery (all 7 subjects).
 * Run: node --test tests/learning/misconception-master-lifecycle.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  bindDiagnosticStateTestStore,
  DIAGNOSTIC_STATE_VERSION,
} from "../../lib/learning/diagnostic-state-persistence.js";
import {
  buildMasterDiagnosticCtx,
  recordMisconceptionAdaptiveAnswer,
} from "../../lib/learning/diagnostic-state-master-helper.js";
import { createMisconceptionAdaptiveState } from "../../lib/learning/misconception-adaptive-routing.js";
import {
  REAL_RUNTIME_SCENARIOS,
  classifyRealRuntimeScenario,
} from "../../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";

const MASTER_SUBJECTS = [
  "math",
  "hebrew",
  "english",
  "science",
  "geometry",
  "history",
  "moledet_geography",
];

describe("master lifecycle — all 7 subjects", () => {
  for (const subjectId of MASTER_SUBJECTS) {
    test(`${subjectId}: pattern → probe → persist → resume → recovery`, () => {
      const scenario = REAL_RUNTIME_SCENARIOS.find((s) => s.subject === subjectId);
      assert.ok(scenario, `real runtime scenario for ${subjectId}`);

      const positive = classifyRealRuntimeScenario(scenario, true);
      const tag = positive.detectedMisconception;
      assert.ok(tag);

      const store = new Map();
      const testStore = bindDiagnosticStateTestStore(store);
      const ctx = buildMasterDiagnosticCtx("student-lifecycle", subjectId, "g5", "easy", "practice");

      const pendingRef = { current: { subjectId, topicId: "practice", dominantTag: tag } };
      const ledgerRef = { current: null };
      const adaptiveRef = { current: createMisconceptionAdaptiveState() };

      recordMisconceptionAdaptiveAnswer({ ctx, pendingRef, ledgerRef, adaptiveRef, tag, isCorrect: false });
      recordMisconceptionAdaptiveAnswer({ ctx, pendingRef, ledgerRef, adaptiveRef, tag, isCorrect: false });
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
      assert.equal(adaptiveRef.current.phase, "probe");
      assert.equal(adaptiveRef.current.activeTag, tag);

      recordMisconceptionAdaptiveAnswer({
        ctx,
        pendingRef,
        ledgerRef,
        adaptiveRef,
        tag,
        isCorrect: true,
      });
      assert.equal(adaptiveRef.current.phase, "focused_practice");

      recordMisconceptionAdaptiveAnswer({
        ctx,
        pendingRef,
        ledgerRef,
        adaptiveRef,
        tag,
        isCorrect: true,
      });
      assert.equal(adaptiveRef.current.phase, "transfer_check");

      for (let i = 0; i < 3; i++) {
        recordMisconceptionAdaptiveAnswer({
          ctx,
          pendingRef,
          ledgerRef,
          adaptiveRef,
          tag,
          isCorrect: true,
        });
      }
      assert.equal(adaptiveRef.current.phase, "normal");
      assert.equal(adaptiveRef.current.activeTag, null);
    });
  }
});
