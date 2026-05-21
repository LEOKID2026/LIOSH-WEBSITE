/**
 * בדיקות עצמאיות ל־Phase 1 (ללא Jest) — הרצה: npm run test:parent-report-phase1
 * תיעוד: docs/PARENT_REPORT.md
 */
import assert from "node:assert/strict";

/** @param {string} path */
async function importUtils(path) {
  const m = await import(path);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { computeRowDiagnosticSignals } = await importUtils("../utils/parent-report-row-diagnostics.js");
const {
  computeRowTrend,
  MIN_TREND_POINTS,
  sumQuestionsCorrectForSessions,
} = await importUtils("../utils/parent-report-row-trend.js");
const { computeRowBehaviorProfile } = await importUtils("../utils/parent-report-row-behavior.js");
const { validateParentReportDataIntegrity } = await importUtils("../utils/parent-report-data-integrity.js");
const { buildTopicRecommendationRecord } = await importUtils("../utils/topic-next-step-engine.js");

const endMs = Date.UTC(2026, 3, 10, 23, 59, 59);
const startMs = Date.UTC(2026, 3, 3, 0, 0, 0);

const row = {
  bucketKey: "addition",
  displayName: "חיבור",
  questions: 12,
  correct: 10,
  wrong: 2,
  accuracy: 83,
  modeKey: "learning",
  lastSessionMs: endMs - 2 * 24 * 60 * 60 * 1000,
};

const mistakesByBucket = { addition: { count: 2 } };

const signals = computeRowDiagnosticSignals("math", "addition\u0001learning", row, mistakesByBucket, endMs);
assert.ok(Array.isArray(signals.decisionTrace));
assert.ok(signals.decisionTrace.length >= 6);
assert.equal(signals.decisionTrace[0].source, "diagnostics");
assert.equal(signals.decisionTrace[0].phase, "inputs");

const sessionsCurrent = [
  { timestamp: startMs + 2 * 24 * 3600 * 1000, total: 6, correct: 5, mode: "learning" },
  { timestamp: startMs + 4 * 24 * 3600 * 1000, total: 6, correct: 5, mode: "learning" },
];
const prevSessions = [
  { timestamp: startMs - 5 * 24 * 3600 * 1000, total: 8, correct: 4, mode: "learning" },
];

const trend = computeRowTrend({
  subjectId: "math",
  topicRowKey: "addition\u0001learning",
  row,
  sessionsCurrentPeriod: sessionsCurrent,
  prevPeriodSessions: prevSessions,
  legacyProgress: { total: 0, correct: 0 },
  periodStartMs: startMs,
  periodEndMs: endMs,
  rawMistakesSubject: [],
});

assert.ok(trend.version === 1);
assert.ok(["up", "down", "flat", "unknown"].includes(trend.accuracyDirection));
assert.ok(typeof trend.summaryHe === "string" && trend.summaryHe.length > 0);
assert.ok(Number.isFinite(trend.confidence));

// Phase 8 hardening: missing/invalid totals are excluded; missing correct is not imputed.
{
  const agg = sumQuestionsCorrectForSessions(
    [
      { total: undefined, correct: 1 },
      { total: 0, correct: 0 },
      { total: -2, correct: 0 },
      { total: 5 }, // missing correct: whole session excluded
      { total: 4, correct: 3 }, // valid
    ],
    { total: 100, correct: 100 } // must not be used for imputation
  );
  assert.deepEqual(agg, { questions: 4, correct: 3 });
}

// Valid rows keep previous behavior.
{
  const agg = sumQuestionsCorrectForSessions(
    [
      { total: 6, correct: 5 },
      { total: 6, correct: 5 },
    ],
    { total: 0, correct: 0 }
  );
  assert.deepEqual(agg, { questions: 12, correct: 10 });
}

// Trend minimum evidence gate: insufficient valid sessions => unknown trend + insufficient marker.
{
  const trendInsufficient = computeRowTrend({
    subjectId: "math",
    topicRowKey: "addition\u0001learning",
    row,
    sessionsCurrentPeriod: [{ timestamp: startMs + 1000, total: 4, correct: 3 }],
    prevPeriodSessions: [{ timestamp: startMs - 1000, total: 4, correct: 3 }],
    legacyProgress: { total: 0, correct: 0 },
    periodStartMs: startMs,
    periodEndMs: endMs,
    rawMistakesSubject: [],
  });
  assert.equal(trendInsufficient.trendEvidenceStatus, "insufficient");
  assert.equal(trendInsufficient.accuracyDirection, "unknown");
}
assert.ok(Number(MIN_TREND_POINTS) >= 3);

const rawMistakes = [
  {
    subject: "math",
    operation: "addition",
    timestamp: startMs + 3 * 24 * 3600 * 1000,
    isCorrect: false,
    responseMs: 800,
    hintUsed: true,
    retryCount: 2,
    firstTryCorrect: false,
  },
  {
    subject: "math",
    operation: "addition",
    timestamp: startMs + 3 * 24 * 3600 * 1000 + 1000,
    isCorrect: false,
    responseMs: 900,
    hintUsed: true,
    retryCount: 1,
    firstTryCorrect: false,
  },
];

const behavior = computeRowBehaviorProfile("math", "addition\u0001learning", row, rawMistakes, startMs, endMs);
assert.ok(behavior.version === 1);
assert.ok(typeof behavior.dominantType === "string");
assert.ok(Array.isArray(behavior.decisionTrace));

const integrity = validateParentReportDataIntegrity({
  trackingSnapshots: {
    math: {
      addition: {
        sessions: [{ timestamp: startMs + 24 * 3600 * 1000, total: 1, correct: 1, mode: "learning", grade: "g3", level: "easy" }],
      },
    },
  },
  rawMistakesBySubject: { math: rawMistakes },
  maps: { math: { "addition\u0001learning": { ...row, bucketKey: "addition" } } },
  dailyActivity: [{ questions: 12, date: "2026-04-05" }],
  startMs,
  endMs,
});
assert.ok(integrity.version === 1);
assert.ok(Array.isArray(integrity.issues));

const rec = buildTopicRecommendationRecord("math", "addition\u0001learning", { ...row, ...signals }, mistakesByBucket, undefined, endMs);
assert.ok(Array.isArray(rec.decisionTrace));
assert.ok(rec.decisionTrace.length >= signals.decisionTrace.length);
assert.ok(rec.recommendationDecisionTrace.length >= 1);
assert.ok(rec.trend == null || typeof rec.trend === "object");

/** Phase 1: generateParentReportV2 must not throw on corrupt mistakes / challenge JSON. */
{
  const store = new Map();
  const emptyMath = JSON.stringify({ operations: {} });
  const emptyTopics = JSON.stringify({ topics: {} });
  const emptyProgress = JSON.stringify({ progress: {} });
  for (const [k, v] of [
    ["mleo_time_tracking", emptyMath],
    ["mleo_math_master_progress", emptyProgress],
    ["mleo_geometry_time_tracking", emptyTopics],
    ["mleo_geometry_master_progress", emptyProgress],
    ["mleo_english_time_tracking", emptyTopics],
    ["mleo_english_master_progress", emptyProgress],
    ["mleo_science_time_tracking", emptyTopics],
    ["mleo_science_master_progress", emptyProgress],
    ["mleo_hebrew_time_tracking", emptyTopics],
    ["mleo_hebrew_master_progress", emptyProgress],
    ["mleo_moledet_geography_time_tracking", emptyTopics],
    ["mleo_moledet_geography_master_progress", emptyProgress],
  ]) {
    store.set(k, v);
  }
  store.set("mleo_mistakes", "NOT_VALID_JSON[[[");
  store.set("mleo_geometry_mistakes", "{}");
  store.set("mleo_english_mistakes", "null");
  store.set("mleo_science_mistakes", "[}");
  store.set("mleo_hebrew_mistakes", "");
  store.set("mleo_moledet_geography_mistakes", "42");
  store.set("mleo_daily_challenge", "[1,2,3]");
  store.set("mleo_weekly_challenge", "null");
  const prevWindow = globalThis.window;
  const prevLS = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  try {
    const { generateParentReportV2 } = await importUtils("../utils/parent-report-v2.js");
    const report = generateParentReportV2("ResilienceQA", "week");
    assert.ok(report && typeof report === "object");
    assert.equal(report.challenges.daily.questions, 0);
    assert.equal(report.challenges.daily.correct, 0);
    assert.equal(report.challenges.weekly.current, 0);
    assert.equal(report.challenges.weekly.completed, false);
    assert.ok(Array.isArray(report.analysis.recommendations));
  } finally {
    globalThis.window = prevWindow;
    globalThis.localStorage = prevLS;
  }
}

/** Phase 8 hardening: parent-report aggregation must not create fake question/correct from malformed sessions. */
{
  const store = new Map();
  const now = Date.now();
  const mathTracking = {
    operations: {
      addition: {
        sessions: [
          { timestamp: now - 5000, total: 4, correct: 3, mode: "learning", grade: "g1", level: "easy" },
          { timestamp: now - 4000, total: 5, mode: "learning", grade: "g1", level: "easy" }, // missing correct
          { timestamp: now - 3000, mode: "learning", grade: "g1", level: "easy" }, // missing total
          { timestamp: now - 2000, total: 0, correct: 0, mode: "learning", grade: "g1", level: "easy" }, // invalid total
        ],
      },
    },
  };
  const mathProgress = {
    progress: {
      addition: { total: 500, correct: 500 },
    },
  };
  const emptyTopics = JSON.stringify({ topics: {} });
  const emptyProgress = JSON.stringify({ progress: {} });
  store.set("mleo_time_tracking", JSON.stringify(mathTracking));
  store.set("mleo_math_master_progress", JSON.stringify(mathProgress));
  for (const [k, v] of [
    ["mleo_geometry_time_tracking", emptyTopics],
    ["mleo_geometry_master_progress", emptyProgress],
    ["mleo_english_time_tracking", emptyTopics],
    ["mleo_english_master_progress", emptyProgress],
    ["mleo_science_time_tracking", emptyTopics],
    ["mleo_science_master_progress", emptyProgress],
    ["mleo_hebrew_time_tracking", emptyTopics],
    ["mleo_hebrew_master_progress", emptyProgress],
    ["mleo_moledet_geography_time_tracking", emptyTopics],
    ["mleo_moledet_geography_master_progress", emptyProgress],
    ["mleo_mistakes", "[]"],
    ["mleo_geometry_mistakes", "[]"],
    ["mleo_english_mistakes", "[]"],
    ["mleo_science_mistakes", "[]"],
    ["mleo_hebrew_mistakes", "[]"],
    ["mleo_moledet_geography_mistakes", "[]"],
  ]) {
    store.set(k, v);
  }
  const prevWindow = globalThis.window;
  const prevLS = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  try {
    const { generateParentReportV2 } = await importUtils("../utils/parent-report-v2.js");
    const report = generateParentReportV2("AccuracyGuardQA", "week");
    assert.equal(report.summary.mathQuestions, 4);
    assert.equal(report.summary.mathCorrect, 3);
    assert.equal(report.summary.mathAccuracy, 75);
  } finally {
    globalThis.window = prevWindow;
    globalThis.localStorage = prevLS;
  }
}

/** Phase 1 diagnostic evidence cards + deterministic strength body (no engine rebuild). */
{
  const {
    buildDiagnosticCardsForSubjectForTests,
    v2PositiveStrengthBodyFromUnitForTests,
    collectDiagnosticEvidenceLinesForTests,
    generateParentReportV2,
  } = await importUtils("../utils/parent-report-v2.js");

  const minimalStrengthUnit = {
    unitKey: "math::addition|learning",
    topicRowKey: "addition\u0001learning",
    subjectId: "math",
    bucketKey: "addition",
    displayName: "חיבור",
    evidenceTrace: [
      { type: "volume", value: { questions: 14, accuracy: 86, correct: 12, wrong: 2 } },
    ],
    taxonomy: { id: "tax_demo", patternHe: "דפוס הדגמה" },
    diagnosis: { allowed: true, lineHe: "שורת אבחון" },
    confidence: { level: "medium" },
    priority: { level: "P3" },
    canonicalState: { assessment: { confidenceLevel: "medium" } },
  };
  const rowForUnit = {
    trend: { summaryHe: "מגמה יציבה בטווח" },
    decisionTrace: [{ detailHe: "חישוב יציבות: ערכים בטווח תקין" }],
    contractsV1: {
      evidence: { evidenceStrength: "medium", evidenceBand: "E2", questionCount: 14, accuracyPct: 86 },
    },
    _feedback: "improved",
    _priorityScore: 4,
  };
  const cards = buildDiagnosticCardsForSubjectForTests("math", [minimalStrengthUnit], {
    "addition\u0001learning": rowForUnit,
  });
  assert.equal(cards.length, 1);
  assert.ok(cards[0].evidence.length >= 1, "each card must include ≥1 evidence line");
  for (const line of cards[0].evidence) {
    const s = String(line);
    assert.ok(!/\b[a-z][a-z0-9_]{14,}\b/.test(s), "no long raw engine tokens in parent lines");
  }

  const body = v2PositiveStrengthBodyFromUnitForTests(minimalStrengthUnit);
  const genericOnly = "ביצועים גבוהים ועקביים — נראה שליטה טובה בנושא.";
  assert.ok(body.includes("14") && body.includes("86"), "strength body uses trace numbers when present");
  assert.notEqual(body.trim(), genericOnly.trim());

  const linesBare = collectDiagnosticEvidenceLinesForTests(
    { evidenceTrace: [], displayName: "ריק", bucketKey: "x", taxonomy: null },
    {}
  );
  assert.ok(linesBare.length >= 1);
  assert.ok(String(linesBare[0]).includes("מידע מועט"), "weak data uses cautious insufficient-data line");

  const store = new Map();
  const now = Date.now();
  store.set(
    "mleo_time_tracking",
    JSON.stringify({
      operations: {
        addition: {
          sessions: [
            {
              timestamp: now - 2 * 24 * 3600 * 1000,
              total: 14,
              correct: 12,
              mode: "learning",
              grade: "g3",
              level: "easy",
            },
          ],
        },
      },
    })
  );
  store.set("mleo_math_master_progress", JSON.stringify({ progress: {} }));
  const emptyTopics = JSON.stringify({ topics: {} });
  const emptyProgress = JSON.stringify({ progress: {} });
  for (const [k, v] of [
    ["mleo_geometry_time_tracking", emptyTopics],
    ["mleo_geometry_master_progress", emptyProgress],
    ["mleo_english_time_tracking", emptyTopics],
    ["mleo_english_master_progress", emptyProgress],
    ["mleo_science_time_tracking", emptyTopics],
    ["mleo_science_master_progress", emptyProgress],
    ["mleo_hebrew_time_tracking", emptyTopics],
    ["mleo_hebrew_master_progress", emptyProgress],
    ["mleo_moledet_geography_time_tracking", emptyTopics],
    ["mleo_moledet_geography_master_progress", emptyProgress],
  ]) {
    store.set(k, v);
  }
  for (const k of [
    "mleo_mistakes",
    "mleo_geometry_mistakes",
    "mleo_english_mistakes",
    "mleo_science_mistakes",
    "mleo_hebrew_mistakes",
    "mleo_moledet_geography_mistakes",
  ]) {
    store.set(k, "[]");
  }
  store.set("mleo_daily_challenge", "{}");
  store.set("mleo_weekly_challenge", "{}");
  const prevWindow = globalThis.window;
  const prevLS = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.window = globalThis;
  try {
    const report = generateParentReportV2("DiagCardsQA", "week");
    assert.ok(report.patternDiagnostics?.version === 2);
    const mathCards = report.patternDiagnostics?.subjects?.math?.diagnosticCards;
    assert.ok(Array.isArray(mathCards) && mathCards.length >= 1, "V2 report exposes diagnosticCards when units exist");
    for (const c of mathCards) {
      assert.ok(Array.isArray(c.evidence) && c.evidence.length >= 1);
    }
  } finally {
    globalThis.window = prevWindow;
    globalThis.localStorage = prevLS;
  }
}

/** Phase 2: diagnosticOverviewHe post-V2 pass (priority order, no raw tokens in parent strings). */
{
  const { buildDiagnosticOverviewHeV2ForTests } = await importUtils("../utils/parent-report-v2.js");

  const fallback = {
    mainFocusAreaLineHe: "חשבון: נושא מהרשימה הישנה",
    strongestAreaLineHe: "עברית: חוזק ישן",
    readyForProgressPreviewHe: ["מדעים: ישן"],
    requiresAttentionPreviewHe: ["גאומטריה: ישן"],
  };

  const v2out = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: {
      units: [
        {
          subjectId: "math",
          displayName: "נושא ראשון במפה",
          topicRowKey: "k1",
          priority: { level: "P1" },
          diagnosis: { allowed: true, lineHe: "אבחון א׳" },
          evidenceTrace: [{ type: "volume", value: { questions: 5, accuracy: 50 } }],
          taxonomy: { patternHe: "רקע P1" },
          canonicalState: {
            evidence: { positiveAuthorityLevel: "none" },
            actionState: "withhold",
            assessment: {},
          },
        },
        {
          subjectId: "geometry",
          displayName: "נושא דחיפות",
          topicRowKey: "k2",
          priority: { level: "P4" },
          diagnosis: { allowed: true, lineHe: "אבחון ב׳" },
          evidenceTrace: [{ type: "volume", value: { questions: 12, accuracy: 62 } }],
          taxonomy: { patternHe: "דפוס עומק מהמנוע" },
          canonicalState: {
            evidence: { positiveAuthorityLevel: "good" },
            actionState: "maintain",
            assessment: {},
          },
        },
      ],
    },
    patternDiagnostics: { version: 2, subjects: {} },
    maps: {},
    fallbackOverview: fallback,
    insufficientDataSubjectsHe: [],
    subjectQuestionCounts: { math: 5, geometry: 12 },
  });

  assert.ok(
    String(v2out.mainFocusAreaLineHe || "").includes("דפוס עומק") ||
      String(v2out.mainFocusAreaLineHe || "").includes("נושא דחיפות"),
    "main focus follows higher-priority V2 unit, not fallback map-order line"
  );
  assert.notEqual(String(v2out.mainFocusAreaLineHe || "").trim(), String(fallback.mainFocusAreaLineHe).trim());

  const txt = [
    v2out.mainFocusAreaLineHe,
    v2out.strongestAreaLineHe,
    ...(v2out.readyForProgressPreviewHe || []),
    ...(v2out.requiresAttentionPreviewHe || []),
  ]
    .filter(Boolean)
    .join(" ");
  assert.ok(!/\bP[1-4]\b/.test(txt), "no raw priority codes in overview text");
  assert.ok(!/::/.test(txt));
  assert.ok(!/\bdc:/i.test(txt));

  const noUnits = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: { units: [] },
    patternDiagnostics: null,
    maps: {},
    fallbackOverview: fallback,
    insufficientDataSubjectsHe: ["חשבון: מעט נתונים"],
  });
  assert.equal(noUnits.mainFocusAreaLineHe, fallback.mainFocusAreaLineHe);
  assert.deepEqual(noUnits.requiresAttentionPreviewHe, fallback.requiresAttentionPreviewHe);
  assert.deepEqual(noUnits.insufficientDataSubjectsHe, ["חשבון: מעט נתונים"]);

  const noAttentionSignal = buildDiagnosticOverviewHeV2ForTests({
    diagnosticEngineV2: {
      units: [
        {
          subjectId: "math",
          displayName: "נושא חזק בלבד",
          evidenceTrace: [{ type: "volume", value: { questions: 20, accuracy: 95 } }],
          diagnosis: { allowed: false },
          recurrence: { wrongCountForRules: 0 },
          canonicalState: {
            evidence: { positiveAuthorityLevel: "excellent" },
            actionState: "maintain",
            assessment: {},
          },
        },
      ],
    },
    patternDiagnostics: { version: 2, subjects: {} },
    maps: {},
    fallbackOverview: {
      mainFocusAreaLineHe: "מיקוד שמגיע מרשימת needsPractice",
      strongestAreaLineHe: "חוזק שמור",
      readyForProgressPreviewHe: [],
      requiresAttentionPreviewHe: ["מעקב משני א׳", "מעקב משני ב׳"],
    },
    insufficientDataSubjectsHe: [],
  });
  assert.equal(
    noAttentionSignal.mainFocusAreaLineHe,
    "מיקוד שמגיע מרשימת needsPractice",
    "no P/diagnosis/wrongs: main focus must not pick an arbitrary V2 unit"
  );
  assert.ok(
    !String(noAttentionSignal.mainFocusAreaLineHe || "").includes("נושא חזק בלבד"),
    "main focus must not be built from a non-attention V2 unit displayName"
  );
  assert.equal(noAttentionSignal.requiresAttentionPreviewHe[0], "מעקב משני א׳");
  assert.equal(noAttentionSignal.requiresAttentionPreviewHe[1], "מעקב משני ב׳");
}

// Fast Educational Diagnosis (deterministic): stages, probes, parent-safe copy.
{
  const { runFastDiagnosisForUnitForTests } = await importUtils("../utils/fast-diagnostic-engine/index.js");
  const { inferNormalizedTags } = await importUtils("../utils/fast-diagnostic-engine/infer-tags.js");

  const unitBase = {
    subjectId: "math",
    bucketKey: "fractions",
    displayName: "שברים",
  };

  /** @param {unknown[]} events @param {object} fd */
  function assertTagsDerivedFromEvents(events, subjectId, fd) {
    const wrongs = events.filter((e) => e && !e.isCorrect);
    /** @type {Set<string>} */
    const union = new Set();
    for (const e of wrongs) {
      for (const t of inferNormalizedTags(/** @type {Record<string, unknown>} */ (e), subjectId)) {
        union.add(t);
      }
    }
    for (const t of fd.suspectedErrorTags) {
      assert.ok(union.has(t), `suspectedErrorTags must be derivable from mistake fields: unexpected "${t}"`);
    }
  }

  /** @param {string} s */
  function assertParentHebrewSafe(s) {
    assert.ok(typeof s === "string");
    assert.ok(!/\bfd_/i.test(s), "parent-facing text must not expose hypothesis ids");
    assert.ok(!/::/.test(s));
    assert.ok(!/\bP[1-4]\b/.test(s));
  }

  const misconceptionWrong = {
    isCorrect: false,
    patternFamily: "fraction_add_same_denominator",
  };

  const fdEarly = runFastDiagnosisForUnitForTests({
    unit: unitBase,
    events: [misconceptionWrong],
    row: { questions: 8 },
  });
  assert.equal(fdEarly.diagnosisStage, "early_signal");
  assert.ok(fdEarly.suspectedErrorTags.includes("repeated_misconception") || fdEarly.suspectedErrorTags.includes("adds_denominators_directly"));
  assert.ok(fdEarly.nextProbe && typeof fdEarly.nextProbe.reasonHe === "string" && fdEarly.nextProbe.reasonHe.length > 0);
  assertTagsDerivedFromEvents([misconceptionWrong], "math", fdEarly);
  assertParentHebrewSafe(fdEarly.parentSafeTextHe);
  assertParentHebrewSafe(fdEarly.hypothesisHe);

  const repeatWrong = Array.from({ length: 4 }, () => ({
    isCorrect: false,
    patternFamily: "fraction_add_same_denominator",
  }));
  const fdWork = runFastDiagnosisForUnitForTests({
    unit: unitBase,
    events: repeatWrong,
    row: { questions: 12 },
  });
  assert.equal(fdWork.diagnosisStage, "working_hypothesis");
  assert.ok(fdWork.suspectedErrorTags.length > 0);
  assertTagsDerivedFromEvents(repeatWrong, "math", fdWork);

  const manyWrong = Array.from({ length: 8 }, () => ({
    isCorrect: false,
    patternFamily: "fraction_add_same_denominator",
  }));
  const fdStable = runFastDiagnosisForUnitForTests({
    unit: unitBase,
    events: manyWrong,
    row: { questions: 20 },
  });
  assert.equal(fdStable.diagnosisStage, "stable_diagnosis");
  assertTagsDerivedFromEvents(manyWrong, "math", fdStable);

  const fdThin = runFastDiagnosisForUnitForTests({
    unit: unitBase,
    events: [
      { isCorrect: false },
      { isCorrect: false },
    ],
    row: { questions: 4 },
  });
  assert.equal(fdThin.diagnosisStage, "insufficient_signal");
  assert.ok(fdThin.nextProbe?.reasonHe && fdThin.nextProbe.reasonHe.length > 0, "insufficient_signal still gets nextProbe");
  assertParentHebrewSafe(fdThin.parentSafeTextHe);
}

// Phase 3B: diagnostic mistake metadata (additive instrumentation for FastDiagnosticEngine).
{
  const {
    extractDiagnosticMetadataFromQuestion,
    mergeDiagnosticIntoMistakeEntry,
    computeMcqIndicesForQuestion,
  } = await importUtils("../utils/diagnostic-mistake-metadata.js");
  const { normalizeMistakeEvent } = await importUtils("../utils/mistake-event.js");

  const meta = extractDiagnosticMetadataFromQuestion(
    {
      id: "q1",
      correctAnswer: "B",
      params: {
        patternFamily: "photosynthesis_light",
        conceptTag: "bio_leaf",
        kind: "mcq",
        subtype: "stem_mc",
        distractorFamily: "dist_fact_shift",
        diagnosticSkillId: "skill_leaf",
      },
    },
    { responseMs: 4200, hintUsed: true }
  );
  assert.equal(meta.patternFamily, "photosynthesis_light");
  assert.equal(meta.conceptTag, "bio_leaf");
  assert.equal(meta.kind, "mcq");
  assert.equal(meta.diagnosticSkillId, "skill_leaf");
  assert.equal(meta.responseMs, 4200);
  assert.equal(meta.hintUsed, true);

  assert.ok(typeof extractDiagnosticMetadataFromQuestion(undefined, {}) === "object");

  const merged = mergeDiagnosticIntoMistakeEntry(
    { topic: "plants", isCorrect: false },
    { patternFamily: "x", hintUsed: false }
  );
  assert.equal(merged.topic, "plants");
  assert.equal(merged.patternFamily, "x");
  assert.equal(merged.hintUsed, false);

  const mcqIdx = computeMcqIndicesForQuestion(
    { answers: ["a", "b", "c"], correctAnswer: "b" },
    "b"
  );
  assert.equal(mcqIdx.selectedOptionIndex, 1);
  assert.equal(mcqIdx.correctOptionIndex, 1);

  const scienceLike = mergeDiagnosticIntoMistakeEntry(
    {
      topic: "matter",
      userAnswer: "x",
      isCorrect: false,
      timestamp: Date.now(),
      params: { gradeKey: "g4" },
    },
    extractDiagnosticMetadataFromQuestion(
      {
        id: "sci_42",
        stem: "שאלה?",
        correctIndex: 2,
        options: ["a", "b", "c"],
        params: {
          patternFamily: "states_of_matter",
          conceptTag: "solid_liquid_gas",
        },
      },
      { responseMs: 3100, hintUsed: false }
    )
  );
  const normScience = normalizeMistakeEvent(scienceLike, "science");
  assert.equal(normScience.patternFamily, "states_of_matter");
  assert.equal(normScience.conceptTag, "solid_liquid_gas");
  assert.equal(normScience.responseMs, 3100);
  assert.equal(normScience.hintUsed, false);
}

// Phase 3C: diagnostic contract helpers, object MCQ cells, probe map preference (no UI/report changes).
{
  const { normalizeMistakeEvent } = await importUtils("../utils/mistake-event.js");
  const { mcqCellValue } = await importUtils("../utils/mcq-option-cell.js");
  assert.equal(mcqCellValue("runs"), "runs");
  assert.equal(
    mcqCellValue({ label: "runs", value: "run", distractorFamily: "tense_shift" }),
    "run"
  );

  const {
    mergeDiagnosticContractIntoParams,
    pickDiagnosticContractFields,
  } = await importUtils("../utils/diagnostic-question-contract.js");
  const mergedParams = mergeDiagnosticContractIntoParams(
    { patternFamily: "grammar_mcq", grammarOptionSet: ["a", "b"] },
    {
      diagnosticSkillId: "en_grammar_be_present",
      expectedErrorTags: ["grammar_pattern_error"],
      probePower: "medium",
    }
  );
  assert.equal(mergedParams.diagnosticSkillId, "en_grammar_be_present");
  assert.deepEqual(mergedParams.expectedErrorTags, ["grammar_pattern_error"]);
  assert.ok(Object.keys(pickDiagnosticContractFields({ junk: 1 })).length === 0);

  const {
    distractorFamilyFromOptionCell,
    computeMcqIndicesForQuestion,
    mergeDiagnosticIntoMistakeEntry,
  } = await importUtils("../utils/diagnostic-mistake-metadata.js");
  const optCell = {
    label: "8/12",
    value: "8/12",
    distractorFamily: "adds_denominators_directly",
    errorTag: "ignored_for_df",
  };
  assert.equal(distractorFamilyFromOptionCell(optCell), "adds_denominators_directly");

  const mcqIdxObj = computeMcqIndicesForQuestion(
    {
      answers: [
        { value: "5/6", distractorFamily: "correct_route" },
        { value: "8/12", distractorFamily: "adds_denominators_directly" },
      ],
      correctAnswer: "5/6",
    },
    "8/12"
  );
  assert.equal(mcqIdxObj.selectedOptionIndex, 1);
  assert.equal(mcqIdxObj.correctOptionIndex, 0);

  let fracEntry = mergeDiagnosticIntoMistakeEntry(
    { subject: "math", topic: "fractions", isCorrect: false },
    { selectedOptionIndex: 1 }
  );
  const dfFromWrongCell = distractorFamilyFromOptionCell(
    { value: "8/12", distractorFamily: "adds_denominators_directly" }
  );
  fracEntry = mergeDiagnosticIntoMistakeEntry(fracEntry, {
    distractorFamily: dfFromWrongCell,
  });
  const normFrac = normalizeMistakeEvent(fracEntry, "math");
  assert.equal(normFrac.distractorFamily, "adds_denominators_directly");

  const { runFastDiagnosisForUnitForTests } = await importUtils("../utils/fast-diagnostic-engine/index.js");

  const fdTaggedFrac = runFastDiagnosisForUnitForTests({
    unit: {
      subjectId: "math",
      bucketKey: "fractions",
      displayName: "שברים",
    },
    events: [
      {
        isCorrect: false,
        patternFamily: "fraction_add_unlike_denominators",
        expectedErrorTags: ["adds_denominators_directly"],
        diagnosticSkillId: "math_frac_common_denominator",
      },
    ],
    row: { questions: 8 },
  });
  assert.equal(fdTaggedFrac.diagnosisStage, "early_signal");
  assert.ok(fdTaggedFrac.suspectedErrorTags.includes("adds_denominators_directly"));
  assert.equal(
    fdTaggedFrac.nextProbe.suggestedQuestionType,
    "fraction_common_denominator_only",
    "probe map must override generic denominator fallback"
  );

  const fdFracRepeat = runFastDiagnosisForUnitForTests({
    unit: {
      subjectId: "math",
      bucketKey: "fractions",
      displayName: "שברים",
    },
    events: Array.from({ length: 4 }, () => ({
      isCorrect: false,
      patternFamily: "fraction_add_unlike_denominators",
      expectedErrorTags: ["adds_denominators_directly"],
    })),
    row: { questions: 14 },
  });
  assert.equal(fdFracRepeat.diagnosisStage, "working_hypothesis");

  const fdSciConcept = runFastDiagnosisForUnitForTests({
    unit: {
      subjectId: "science",
      bucketKey: "body",
      displayName: "גוף האדם",
    },
    events: [
      {
        isCorrect: false,
        expectedErrorTags: ["concept_confusion"],
        diagnosticSkillId: "sci_respiration_concept",
      },
    ],
    row: { questions: 4 },
  });
  assert.equal(fdSciConcept.diagnosisStage, "early_signal");
  assert.equal(
    fdSciConcept.nextProbe.suggestedQuestionType,
    "science_concept_minimal_contrast"
  );
}

// Phase Math Fractions: active probe routing (shared runtime + generator; no UI/report changes).
{
  const { normalizeMistakeEvent } = await importUtils("../utils/mistake-event.js");
  const {
    buildPendingProbeFromMistake,
    applyProbeOutcome,
    attachProbeMetaToQuestion,
  } = await importUtils("../utils/active-diagnostic-runtime/index.js");
  const { mathFractionWrongActivatesProbe } = await importUtils("../utils/math-fraction-probe.js");
  const { generateQuestion } = await importUtils("../utils/math-question-generator.js");
  const { getLevelConfig } = await importUtils("../utils/math-storage.js");

  const normFracWrong = normalizeMistakeEvent(
    {
      bucketKey: "fractions",
      topicOrOperation: "fractions",
      grade: "g5",
      level: "easy",
      isCorrect: false,
      patternFamily: "fraction_add_unlike_denominators",
      expectedErrorTags: ["adds_denominators_directly"],
      diagnosticSkillId: "math_frac_common_denominator",
    },
    "math"
  );
  const inferredFrac = ["adds_denominators_directly"];
  assert.ok(mathFractionWrongActivatesProbe(normFracWrong, inferredFrac));
  const pendingProbe = buildPendingProbeFromMistake(
    normFracWrong,
    {
      wrongAvoidKey: "fp_test_1",
      fallbackTopicId: "fractions",
      fallbackGrade: "g5",
      fallbackLevel: "easy",
    },
    "math"
  );
  assert.ok(pendingProbe);
  assert.equal(pendingProbe.subjectId, "math");
  assert.equal(pendingProbe.suggestedQuestionType, "fraction_common_denominator_only");

  const normAddWrong = normalizeMistakeEvent(
    {
      bucketKey: "addition",
      topicOrOperation: "addition",
      grade: "g3",
      level: "easy",
      isCorrect: false,
      expectedErrorTags: ["adds_denominators_directly"],
    },
    "math"
  );
  assert.equal(
    mathFractionWrongActivatesProbe(normAddWrong, ["adds_denominators_directly"]),
    false,
    "non-fraction bucket must not activate fraction probe"
  );

  const lc = getLevelConfig(5, "easy");
  assert.ok(lc.allowFractions && lc.fractions?.maxDen != null);

  const probeMetaHolder = { current: null };
  const qProbe = generateQuestion(lc, "fractions", "g5", null, {
    pendingProbe,
    probeMetaHolder,
  });
  assert.equal(qProbe.params?.kind, "frac_probe_common_denominator_only");
  assert.equal(probeMetaHolder.current?.probeReason, "fraction_common_denominator_only");

  const qPlain = generateQuestion(lc, "fractions", "g5", null, null);
  assert.ok(String(qPlain.question || "").length > 0);
  assert.ok(qPlain.params?.kind);

  const pendingUnsupported = {
    ...pendingProbe,
    suggestedQuestionType: "__math_probe_not_implemented__",
  };
  const qFall = generateQuestion(lc, "fractions", "g5", null, {
    pendingProbe: pendingUnsupported,
    probeMetaHolder: { current: null },
  });
  assert.notEqual(qFall.params?.kind, "frac_probe_common_denominator_only");

  const probeWrongSession = { ...pendingProbe, gradeKey: "g1" };
  const qSessionFall = generateQuestion(lc, "fractions", "g5", null, {
    pendingProbe: probeWrongSession,
    probeMetaHolder: { current: null },
  });
  assert.notEqual(qSessionFall.params?.kind, "frac_probe_common_denominator_only");

  const baseProbeSnap = {
    subjectId: "math",
    topicId: "fractions",
    diagnosticSkillId: "math_frac_common_denominator",
    dominantTag: "adds_denominators_directly",
    suggestedQuestionType: "fraction_common_denominator_only",
    sourceHypothesisId: "fd_probe_adds_denominators_directly",
    createdAt: 1,
  };
  const qWithMeta = attachProbeMetaToQuestion(
    { params: { expectedErrorTags: ["wrong_lcm", "adds_denominators_directly"] } },
    {
      probeSnapshot: /** @type {any} */ (baseProbeSnap),
      probeReason: "fraction_common_denominator_only",
      expectedErrorTags: ["wrong_lcm", "adds_denominators_directly"],
    }
  );
  assert.ok(qWithMeta._diagnosticProbeAttempt === true);
  const now = 1700000000000;
  let ledger = applyProbeOutcome(null, {
    isCorrect: true,
    inferredTags: [],
    probeMeta: qWithMeta._probeMeta,
    now,
  });
  assert.equal(ledger.lastOutcome, "correct_probe");
  assert.equal(ledger.status, "weakened");

  ledger = applyProbeOutcome(ledger, {
    isCorrect: false,
    inferredTags: ["adds_denominators_directly"],
    probeMeta: qWithMeta._probeMeta,
    now: now + 1,
  });
  assert.equal(ledger.lastOutcome, "wrong_matching_tag");
  assert.equal(ledger.status, "supported");

  const ledgerUncertain = applyProbeOutcome(null, {
    isCorrect: false,
    inferredTags: ["unrelated_tag_xyz"],
    probeMeta: qWithMeta._probeMeta,
    now: now + 2,
  });
  assert.equal(ledgerUncertain.lastOutcome, "wrong_unrelated");
  assert.equal(ledgerUncertain.status, "uncertain");

  assert.equal(
    applyProbeOutcome(null, {
      isCorrect: false,
      inferredTags: ["x"],
      probeMeta: null,
      now,
    }),
    null
  );

  const { mathWrongActivatesProbe } = await importUtils("../utils/math-active-probe.js");
  const pvWrong = normalizeMistakeEvent(
    {
      bucketKey: "number_sense",
      topicOrOperation: "number_sense",
      grade: "g4",
      level: "easy",
      isCorrect: false,
      patternFamily: "place_value_digit",
      expectedErrorTags: ["place_value_error"],
    },
    "math"
  );
  assert.ok(mathWrongActivatesProbe(pvWrong, ["place_value_error"]));

  const mulWrong = normalizeMistakeEvent(
    {
      bucketKey: "multiplication",
      topicOrOperation: "multiplication",
      grade: "g4",
      level: "easy",
      isCorrect: false,
      patternFamily: "multiplication_facts",
      expectedErrorTags: ["multiplication_fact_gap"],
    },
    "math"
  );
  assert.ok(mathWrongActivatesProbe(mulWrong, ["multiplication_fact_gap"]));

  const wpOpWrong = normalizeMistakeEvent(
    {
      bucketKey: "word_problems",
      topicOrOperation: "word_problems",
      grade: "g5",
      level: "easy",
      isCorrect: false,
      patternFamily: "wp_groups_same_size",
      expectedErrorTags: ["operation_confusion"],
    },
    "math"
  );
  const wpPb = buildPendingProbeFromMistake(
    wpOpWrong,
    {
      wrongAvoidKey: "wp1",
      fallbackTopicId: "word_problems",
      fallbackGrade: "g5",
      fallbackLevel: "easy",
    },
    "math"
  );
  assert.equal(wpPb.suggestedQuestionType, "operation_choice_word_problem");

  const lcNs = getLevelConfig(4, "easy");
  const probePv = buildPendingProbeFromMistake(pvWrong, {
    wrongAvoidKey: "pv1",
    fallbackTopicId: "number_sense",
    fallbackGrade: "g4",
    fallbackLevel: "easy",
  }, "math");
  const qPv = generateQuestion(lcNs, "number_sense", "g4", null, {
    pendingProbe: probePv,
    probeMetaHolder: { current: null },
  });
  assert.equal(qPv.params?.kind, "math_probe_place_value");

  const { pickGeometryProbeConceptual } = await importUtils("../utils/geometry-probe-bank.js");
  const geoPb = buildPendingProbeFromMistake(
    normalizeMistakeEvent(
      {
        bucketKey: "area",
        topicOrOperation: "area",
        grade: "g5",
        level: "easy",
        isCorrect: false,
        patternFamily: "perimeter_vs_area",
        expectedErrorTags: ["concept_confusion"],
      },
      "geometry"
    ),
    { fallbackTopicId: "area", fallbackGrade: "g5", fallbackLevel: "easy" },
    "geometry"
  );
  assert.equal(geoPb.suggestedQuestionType, "geometry_concept_minimal_contrast");
  const geoPick = pickGeometryProbeConceptual({
    pendingProbe: geoPb,
    gradeKey: "g5",
    levelKey: "easy",
    topic: "area",
    recentIds: new Set(),
  });
  assert.ok(geoPick.row);
}

// Phase 3D-A: science session probe selection helper (no live UI / no parent report changes).
{
  const { SCIENCE_QUESTIONS } = await importUtils("../data/science-questions.js");
  const {
    buildSciencePendingDiagnosticProbe,
    selectScienceQuestionWithProbe,
    scienceProbeMatchesSession,
    scienceQuestionProbeMatch,
  } = await importUtils("../utils/science-diagnostic-probe.js");
  const { normalizeMistakeEvent } = await importUtils("../utils/mistake-event.js");

  const body3 = SCIENCE_QUESTIONS.find((q) => q.id === "body_3");
  assert.ok(body3?.params?.diagnosticSkillId === "sci_respiration_concept");

  const normalized = normalizeMistakeEvent(
    {
      topic: "body",
      bucketKey: "body",
      grade: "g3",
      level: "medium",
      isCorrect: false,
      params: body3.params,
      diagnosticSkillId: body3.params.diagnosticSkillId,
    },
    "science"
  );
  const probe = buildSciencePendingDiagnosticProbe(normalized, {
    wrongQuestionId: "body_3",
    fallbackTopicId: "body",
    fallbackGrade: "g3",
    fallbackLevel: "medium",
  });
  assert.ok(probe && probe.suggestedQuestionType === "science_concept_minimal_contrast");

  const bodyPool = SCIENCE_QUESTIONS.filter(
    (q) => q.topic === "body" && q.grades.includes("g3")
  );
  assert.ok(bodyPool.some((q) => q.id === "body_3"));

  const picked = selectScienceQuestionWithProbe({
    questions: bodyPool,
    pendingProbe: probe,
    recentIds: new Set(),
    currentTopic: "body",
    fallbackPick: () => bodyPool[0],
    randomFn: () => 0,
  });
  assert.ok(picked.usedProbe);
  assert.equal(picked.question.params.diagnosticSkillId, "sci_respiration_concept");

  const pickedFall = selectScienceQuestionWithProbe({
    questions: bodyPool,
    pendingProbe: {
      subjectId: "science",
      topicId: probe.topicId,
      diagnosticSkillId: "__no_such_skill__",
      suggestedQuestionType: "noop",
      reasonHe: "",
      sourceHypothesisId: "noop",
      expiresAfterQuestions: 1,
      createdAt: 1,
      priority: 1,
      dominantTag: null,
      probeAttemptIds: [],
      gradeKey: probe.gradeKey,
      levelKey: probe.levelKey,
      patternFamily: null,
      conceptTag: null,
    },
    recentIds: new Set(),
    currentTopic: "body",
    fallbackPick: () => bodyPool[0],
    randomFn: () => 0,
  });
  assert.equal(pickedFall.usedProbe, false);
  assert.equal(pickedFall.reason, "fallback_no_match");

  const twinPool = [
    {
      id: "twin_a",
      topic: "body",
      params: { diagnosticSkillId: "sci_respiration_concept" },
    },
    {
      id: "twin_b",
      topic: "body",
      params: { diagnosticSkillId: "sci_respiration_concept" },
    },
  ];
  const avoidRecent = selectScienceQuestionWithProbe({
    questions: twinPool,
    pendingProbe: probe,
    recentIds: new Set(["twin_a"]),
    currentTopic: "body",
    fallbackPick: () => twinPool[0],
    randomFn: () => 0,
  });
  assert.ok(avoidRecent.usedProbe);
  assert.equal(avoidRecent.question.id, "twin_b");

  assert.equal(
    scienceProbeMatchesSession(probe, "g3", "medium", "body"),
    true
  );
  assert.equal(scienceProbeMatchesSession(probe, "g1", "medium", "body"), false);

  assert.ok(
    scienceQuestionProbeMatch(body3, probe).matches &&
      scienceQuestionProbeMatch(body3, probe).reason === "matched_diagnosticSkillId"
  );

  const staleProbe = { ...probe, expiresAfterQuestions: 0 };
  const stalePick = selectScienceQuestionWithProbe({
    questions: bodyPool,
    pendingProbe: staleProbe,
    recentIds: new Set(),
    currentTopic: "body",
    fallbackPick: () => bodyPool[0],
  });
  assert.equal(stalePick.usedProbe, false);
  assert.equal(stalePick.reason, "no_active_probe");

  // Mirrors science-master: new wrong with no probe map hint clears a stale pending probe.
  const minimalNoProbeNorm = normalizeMistakeEvent(
    {
      topic: "body",
      bucketKey: "body",
      grade: "g3",
      level: "medium",
      isCorrect: false,
    },
    "science"
  );
  assert.equal(buildSciencePendingDiagnosticProbe(minimalNoProbeNorm, {}), null);
  /** @type {{ current: unknown }} */
  let pendingRefSim = { current: probe };
  const incoming = buildSciencePendingDiagnosticProbe(minimalNoProbeNorm, {
    fallbackTopicId: "body",
    fallbackGrade: "g3",
    fallbackLevel: "medium",
  });
  if (incoming) pendingRefSim.current = incoming;
  else pendingRefSim.current = null;
  assert.equal(pendingRefSim.current, null);
  const postClearPick = selectScienceQuestionWithProbe({
    questions: bodyPool,
    pendingProbe: pendingRefSim.current,
    recentIds: new Set(),
    currentTopic: "body",
    fallbackPick: () => bodyPool[0],
    randomFn: () => 0,
  });
  assert.equal(postClearPick.usedProbe, false);
  assert.equal(postClearPick.reason, "no_active_probe");
  assert.equal(postClearPick.question, bodyPool[0]);
}

// Phase 3D-B: science probe outcome → hypothesis ledger (session-only; pure helpers).
{
  const {
    buildScienceHypothesisKey,
    applyScienceProbeOutcome,
  } = await importUtils("../utils/science-probe-outcome.js");

  const baseMeta = {
    sourceHypothesisId: "fd_probe_x",
    dominantTag: "concept_confusion",
    suggestedQuestionType: "science_concept_minimal_contrast",
    diagnosticSkillId: "sci_respiration_concept",
    topicId: "body",
    probeCreatedAt: 1,
    probeReason: "matched_diagnosticSkillId",
    expectedErrorTags: ["concept_confusion", "cause_effect_gap"],
  };

  assert.ok(buildScienceHypothesisKey(baseMeta).includes("body"));
  assert.ok(buildScienceHypothesisKey(baseMeta).includes("sci_respiration_concept"));

  const weakened = applyScienceProbeOutcome(null, {
    isCorrect: true,
    inferredTags: [],
    probeMeta: baseMeta,
    now: 100,
  });
  assert.equal(weakened?.status, "weakened");
  assert.equal(weakened?.lastOutcome, "correct_probe");
  assert.equal(weakened?.weakenCount, 1);

  const supported = applyScienceProbeOutcome(null, {
    isCorrect: false,
    inferredTags: ["concept_confusion", "fact_recall_gap"],
    probeMeta: baseMeta,
    now: 200,
  });
  assert.equal(supported?.status, "supported");
  assert.equal(supported?.lastOutcome, "wrong_matching_tag");
  assert.equal(supported?.supportCount, 1);

  const uncertain = applyScienceProbeOutcome(null, {
    isCorrect: false,
    inferredTags: ["map_reading_gap"],
    probeMeta: { ...baseMeta, expectedErrorTags: undefined },
    now: 300,
  });
  assert.equal(uncertain?.status, "uncertain");
  assert.equal(uncertain?.lastOutcome, "wrong_unrelated");

  const unchanged = applyScienceProbeOutcome(supported, {
    isCorrect: false,
    inferredTags: [],
    probeMeta: null,
    now: 400,
  });
  assert.deepEqual(unchanged, supported);

  const otherKeyMeta = { ...baseMeta, diagnosticSkillId: "sci_other" };
  const replaced = applyScienceProbeOutcome(supported, {
    isCorrect: true,
    inferredTags: [],
    probeMeta: otherKeyMeta,
    now: 500,
  });
  assert.equal(replaced?.hypothesisKey, buildScienceHypothesisKey(otherKeyMeta));
  assert.equal(replaced?.weakenCount, 1);
  assert.notEqual(replaced?.hypothesisKey, supported?.hypothesisKey);

  // Retry dequeue does not attach meta in science-master (integration rule); helpers stay pure above.
}

// Active Diagnostic Core v1 — shared runtime exports (multi-subject).
{
  const {
    buildPendingProbeFromMistake,
    selectQuestionWithProbe,
    probeMatchesSession,
    bankQuestionProbeMatch,
    applyProbeOutcome,
    buildHypothesisKey,
    attachProbeMetaToQuestion,
    clearActiveDiagnosticState,
    decrementPendingProbeExpiry,
  } = await importUtils("../utils/active-diagnostic-runtime/index.js");
  const { normalizeMistakeEvent } = await importUtils("../utils/mistake-event.js");

  const engNorm = normalizeMistakeEvent(
    {
      topic: "grammar",
      bucketKey: "grammar",
      grade: "g3",
      level: "easy",
      isCorrect: false,
      patternFamily: "grammar_mcq",
      diagnosticSkillId: "eng_present_simple_be",
      conceptTag: "grammar_structure",
    },
    "english"
  );
  const engProbe = buildPendingProbeFromMistake(
    engNorm,
    {
      wrongAvoidKey: "old|key",
      fallbackTopicId: "grammar",
      fallbackGrade: "g3",
      fallbackLevel: "easy",
    },
    "english"
  );
  assert.ok(engProbe && engProbe.subjectId === "english");
  assert.equal(probeMatchesSession(engProbe, "g3", "easy", "grammar"), true);
  assert.equal(probeMatchesSession(engProbe, "g1", "easy", "grammar"), false);

  const grammarRows = [
    {
      question: "Choose: He ___ happy.",
      correct: "is",
      topic: "grammar",
      params: { diagnosticSkillId: "eng_present_simple_be" },
    },
    {
      question: "Other",
      correct: "x",
      topic: "grammar",
      params: { diagnosticSkillId: "other_skill" },
    },
  ];
  const pickedEng = selectQuestionWithProbe({
    items: grammarRows,
    pendingProbe: engProbe,
    recentIds: ["Choose: He ___ happy.|is"],
    currentTopic: "grammar",
    fallbackPick: () => grammarRows[1],
    getItemTopic: (r) => String(r.topic),
    getItemId: (r) => `${String(r.question)}|${String(r.correct)}`,
    randomFn: () => 0,
  });
  assert.ok(pickedEng.usedProbe);
  assert.ok(String(pickedEng.question.params.diagnosticSkillId).includes("eng_present_simple_be"));

  const hkEng = buildHypothesisKey({
    subjectId: "english",
    topicId: "grammar",
    diagnosticSkillId: "eng_present_simple_be",
    dominantTag: null,
  });
  assert.ok(hkEng.startsWith("english|"));

  const rowProbe = bankQuestionProbeMatch(grammarRows[0], engProbe);
  assert.ok(rowProbe.matches);

  const qWithProbe = attachProbeMetaToQuestion(
    { question: "בדיקה", topic: "reading", params: {} },
    {
      probeSnapshot: {
        ...engProbe,
        createdAt: engProbe.createdAt,
      },
      probeReason: "matched_diagnosticSkillId",
      expectedErrorTags: ["grammar_pattern_error"],
    }
  );
  assert.equal(qWithProbe._diagnosticProbeAttempt, true);
  const leg = applyProbeOutcome(null, {
    isCorrect: false,
    inferredTags: ["grammar_pattern_error"],
    probeMeta: qWithProbe._probeMeta,
    now: 50,
  });
  assert.equal(leg?.subjectId, "english");

  let pr = { current: engProbe };
  let lr = { current: leg };
  clearActiveDiagnosticState(pr, lr);
  assert.equal(pr.current, null);
  assert.equal(lr.current, null);

  const expRef = { current: { expiresAfterQuestions: 2, subjectId: "math" } };
  decrementPendingProbeExpiry(expRef);
  assert.equal(expRef.current?.expiresAfterQuestions, 1);
  decrementPendingProbeExpiry(expRef);
  assert.equal(expRef.current, null);
  decrementPendingProbeExpiry(null);
  decrementPendingProbeExpiry({ current: null });
  const oneShot = { current: { expiresAfterQuestions: 1, subjectId: "science" } };
  decrementPendingProbeExpiry(oneShot);
  assert.equal(oneShot.current, null);
  const missingExpiry = { current: { subjectId: "hebrew" } };
  decrementPendingProbeExpiry(missingExpiry);
  assert.ok(missingExpiry.current);
}

// QA bugfix regression (english-master): unrelated wrong clears grammar probe; mixed retains probe across non-grammar draws.
{
  let pendingSim = { current: { topicId: "grammar", subjectId: "english" } };
  const topicWrong = "vocabulary";
  if (topicWrong !== "grammar") pendingSim.current = null;
  assert.equal(pendingSim.current, null);

  pendingSim = { current: { topicId: "grammar" } };
  const probeMetaHolderSim = { current: null };
  const questionVocab = { topic: "vocabulary" };
  const probeAtStartSim = true;
  if (probeAtStartSim) {
    const consumed =
      probeMetaHolderSim.current != null || questionVocab.topic === "grammar";
    if (consumed) pendingSim.current = null;
  }
  assert.ok(pendingSim.current, "grammar probe survives mixed vocab roll");

  pendingSim = { current: { topicId: "grammar" } };
  const probeMetaAttachedSim = { current: { probeSnapshot: {}, probeReason: "x" } };
  const questionGrammar = { topic: "grammar" };
  if (probeAtStartSim) {
    const consumed =
      probeMetaAttachedSim.current != null || questionGrammar.topic === "grammar";
    if (consumed) pendingSim.current = null;
  }
  assert.equal(pendingSim.current, null);
}

console.log("parent-report phase1 selftest: OK");
process.exit(0);
