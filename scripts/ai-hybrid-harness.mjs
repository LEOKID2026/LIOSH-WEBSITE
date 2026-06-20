/**
 * AI-hybrid diagnostic layer harness (V2 authority preserved).
 * Run: npm run test:ai-hybrid-harness
 */
import assert from "node:assert/strict";
import { runDiagnosticEngineV2 } from "../utils/diagnostic-engine-v2/index.js";
import { safeBuildHybridRuntimeForReport } from "../utils/ai-hybrid-diagnostic/safe-build-hybrid-runtime.js";

const START_MS = Date.UTC(2026, 3, 1, 0, 0, 0, 0);
const END_MS = Date.UTC(2026, 3, 14, 23, 59, 59, 999);

function row(displayName, questions, correct, wrong, accuracy, behaviorType = "knowledge_gap") {
  return {
    displayName,
    questions,
    correct,
    wrong,
    accuracy,
    modeKey: "learning",
    lastSessionMs: END_MS - 3600_000,
    needsPractice: accuracy < 85,
    confidence01: 0.5,
    dataSufficiencyLevel: questions >= 12 ? "medium" : "low",
    isEarlySignalOnly: questions < 8,
    behaviorProfile: { version: 1, dominantType: behaviorType, signals: {}, decisionTrace: [] },
  };
}

function wrongEvents(subject, bucketKey, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      subject,
      topic: bucketKey,
      operation: bucketKey,
      bucketKey,
      mode: "learning",
      grade: "g4",
      level: "medium",
      timestamp: START_MS + i * 3600_000 * 6,
      isCorrect: false,
      patternFamily: `pf:${i % 3}`,
      hintUsed: false,
      exerciseText: `${bucketKey} q${i}`,
      correctAnswer: 10,
      userAnswer: 3,
    });
  }
  return out;
}

const cases = [
  {
    id: "weak_sparse_explain_only_hybrid",
    maps: {
      math: {
        "addition\u0001learning\u0001g4\u0001medium": row("חיבור", 4, 3, 1, 75),
      },
    },
    raw: { math: wrongEvents("math", "addition", 1) },
    assertHybrid: (hr) => {
      const u = hr.units[0];
      assert.equal(u.aiAssist.mode, "suppressed");
      assert.ok(
        u.aiAssist.suppressionFlags.includes("canonical_action_blocked"),
        "suppressed by canonical action probe_only/withhold"
      );
    },
  },
  {
    id: "hybrid_attaches_per_unit",
    maps: {
      geometry: {
        "perimeter\u0001learning": row("היקף", 20, 10, 10, 50, "knowledge_gap"),
      },
    },
    raw: { geometry: wrongEvents("geometry", "perimeter", 10) },
    assertHybrid: (hr) => {
      assert.equal(hr.units.length, 1);
      assert.ok(hr.hybridRuntimeVersion);
      assert.ok(["assist", "rank_only", "explain_only", "suppressed"].includes(hr.units[0].aiAssist.mode));
      assert.ok(hr.units[0].v2AuthoritySnapshot?.snapshotHash);
    },
  },
];

let fail = 0;
for (const tc of cases) {
  try {
    const diagnosticEngineV2 = runDiagnosticEngineV2({
      maps: tc.maps,
      rawMistakesBySubject: tc.raw,
      startMs: START_MS,
      endMs: END_MS,
    });
    const hr = safeBuildHybridRuntimeForReport({
      diagnosticEngineV2,
      maps: tc.maps,
      rawMistakesBySubject: tc.raw,
      startMs: START_MS,
      endMs: END_MS,
    });
    tc.assertHybrid(hr);
    console.log(`[PASS] ${tc.id}`);
  } catch (e) {
    fail += 1;
    console.log(`[FAIL] ${tc.id}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

if (fail > 0) process.exitCode = 1;
else console.log("\nAI-hybrid harness: all cases passed.");
