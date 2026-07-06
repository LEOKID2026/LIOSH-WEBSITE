/**
 * Lightweight self-test for `utils/parent-report-insights/`.
 *
 * Runs in <1s. Validates:
 *  - Packet builder is deterministic (no Date.now()) — fixed input ⇒ byte-stable output (excluding `generatedAt`).
 *  - Strengths/focusAreas have stable `sourceId`s grounded in available enums.
 *  - Hebrew display names never collapse to raw English keys for known topics.
 *  - Thin-data inputs surface thinDataWarnings.
 *  - AI narrative input projection drops `clientMeta` and stays within budget.
 *  - Hint/time avg, fluency buckets, mistake recurrence, mode/level counts behave correctly.
 *
 * Run: `node scripts/parent-report-insights-selftest.mjs`
 */

import {
  buildParentReportInsightPacket,
  buildAiNarrativeInput,
  isAiNarrativeInputWithinBudget,
  MAX_PROMPT_INPUT_CHARS,
} from "../utils/parent-report-insights/index.js";
import { isValidSourceId } from "../utils/parent-report-insights/source-ids.js";

const FIXED_NOW = "2026-05-08T18:00:00.000Z";

let failures = 0;
let runs = 0;
function check(name, predicate, details) {
  runs += 1;
  if (predicate) return;
  failures += 1;
  process.stderr.write(`FAIL ${name}${details ? ` :: ${details}` : ""}\n`);
}

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function makeAggregate(overrides = {}) {
  const base = {
    ok: true,
    student: { id: "stu_1", full_name: "ילד דוגמה", grade_level: "g4", is_active: true },
    range: { from: "2026-05-01", to: "2026-05-08" },
    summary: {
      totalSessions: 6,
      completedSessions: 6,
      totalAnswers: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      accuracy: 0,
      totalDurationSeconds: 0,
      avgHintsPerQuestion: null,
      avgTimePerQuestionSec: null,
      modeCounts: { unknown: 0, learning: 0, review: 0, drill: 0 },
      levelCounts: { unknown: 0, easy: 0, medium: 0, hard: 0 },
      normalizedGradeLevel: "g4",
    },
    subjects: {
      math: emptySubject(),
      geometry: emptySubject(),
      english: emptySubject(),
      hebrew: emptySubject(),
      science: emptySubject(),
      moledet_geography: emptySubject(),
    },
    dailyActivity: [],
    recentMistakes: [],
    meta: {
      source: "supabase",
      version: "phase-2d-c2",
      insightsVersion: "2026.05-insights",
      fallbackUsed: false,
      sessionDateField: "started_at",
      answerDateField: "answered_at",
      fluencyThresholds: { slowMs: 60000, fastMs: 6000, manyHints: 3 },
    },
  };
  return mergeDeep(base, overrides);
}

function emptySubject() {
  return {
    sessions: 0,
    answers: 0,
    correct: 0,
    wrong: 0,
    accuracy: 0,
    durationSeconds: 0,
    hintsSum: 0,
    hintsCount: 0,
    timeMsSum: 0,
    timeMsCount: 0,
    correctSlowAnswers: 0,
    correctManyHintsAnswers: 0,
    wrongFastAnswers: 0,
    avgHintsPerQuestion: null,
    avgTimePerQuestionSec: null,
    modeCounts: { unknown: 0, learning: 0, review: 0, drill: 0 },
    levelCounts: { unknown: 0, easy: 0, medium: 0, hard: 0 },
    topics: {},
  };
}

function mergeDeep(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return clone(override);
  const result = clone(base);
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      result[key] && typeof result[key] === "object" && !Array.isArray(result[key])
    ) {
      result[key] = mergeDeep(result[key], value);
    } else {
      result[key] = value !== undefined ? clone(value) : result[key];
    }
  }
  return result;
}

function topic(answers, correct, opts = {}) {
  return {
    answers,
    correct,
    wrong: Math.max(0, answers - correct),
    accuracy: answers > 0 ? Number(((correct / answers) * 100).toFixed(2)) : 0,
    contentGradeLevel: opts.contentGradeLevel || "g4",
    registeredGradeLevel: opts.registeredGradeLevel || "g4",
    gradeRelation: opts.gradeRelation || "same",
    durationSeconds: opts.durationSeconds || 0,
    hintsSum: opts.hintsSum || 0,
    hintsCount: opts.hintsCount || 0,
    timeMsSum: opts.timeMsSum || 0,
    timeMsCount: opts.timeMsCount || 0,
    correctSlowAnswers: opts.correctSlowAnswers || 0,
    correctManyHintsAnswers: opts.correctManyHintsAnswers || 0,
    wrongFastAnswers: opts.wrongFastAnswers || 0,
    avgHintsPerQuestion:
      opts.hintsCount > 0 ? Number(((opts.hintsSum || 0) / opts.hintsCount).toFixed(2)) : null,
    avgTimePerQuestionSec:
      opts.timeMsCount > 0
        ? Number(((opts.timeMsSum || 0) / opts.timeMsCount / 1000).toFixed(2))
        : null,
    modeCounts: { unknown: 0, learning: opts.learningCount || 0, review: 0, drill: 0 },
    levelCounts: { unknown: 0, easy: 0, medium: opts.mediumCount || 0, hard: 0 },
  };
}

// ---- Fixture builders ----

function strongStudent() {
  return makeAggregate({
    summary: {
      totalAnswers: 60, correctAnswers: 54, wrongAnswers: 6,
      accuracy: 90, totalDurationSeconds: 1800,
      avgHintsPerQuestion: 0.5, avgTimePerQuestionSec: 30,
      modeCounts: { unknown: 0, learning: 60, review: 0, drill: 0 },
      levelCounts: { unknown: 0, easy: 0, medium: 60, hard: 0 },
    },
    subjects: {
      math: {
        sessions: 3, answers: 30, correct: 27, wrong: 3, accuracy: 90, durationSeconds: 900,
        hintsSum: 15, hintsCount: 30, timeMsSum: 900000, timeMsCount: 30,
        avgHintsPerQuestion: 0.5, avgTimePerQuestionSec: 30,
        modeCounts: { unknown: 0, learning: 30, review: 0, drill: 0 },
        levelCounts: { unknown: 0, easy: 0, medium: 30, hard: 0 },
        topics: {
          multiplication: topic(20, 18, { hintsSum: 8, hintsCount: 20, timeMsSum: 600000, timeMsCount: 20, learningCount: 20, mediumCount: 20 }),
          division: topic(10, 9, { hintsSum: 7, hintsCount: 10, timeMsSum: 300000, timeMsCount: 10, learningCount: 10, mediumCount: 10 }),
        },
      },
      hebrew: {
        sessions: 3, answers: 30, correct: 27, wrong: 3, accuracy: 90, durationSeconds: 900,
        hintsSum: 15, hintsCount: 30, timeMsSum: 900000, timeMsCount: 30,
        avgHintsPerQuestion: 0.5, avgTimePerQuestionSec: 30,
        modeCounts: { unknown: 0, learning: 30, review: 0, drill: 0 },
        levelCounts: { unknown: 0, easy: 0, medium: 30, hard: 0 },
        topics: {
          comprehension: topic(20, 18, { hintsSum: 8, hintsCount: 20, timeMsSum: 600000, timeMsCount: 20, learningCount: 20, mediumCount: 20 }),
          grammar: topic(10, 9, { hintsSum: 7, hintsCount: 10, timeMsSum: 300000, timeMsCount: 10, learningCount: 10, mediumCount: 10 }),
        },
      },
    },
    dailyActivity: [
      { date: "2026-05-01", sessions: 1, answers: 10, correct: 9, wrong: 1, durationSeconds: 300 },
      { date: "2026-05-03", sessions: 1, answers: 10, correct: 9, wrong: 1, durationSeconds: 300 },
      { date: "2026-05-05", sessions: 2, answers: 20, correct: 18, wrong: 2, durationSeconds: 600 },
      { date: "2026-05-07", sessions: 2, answers: 20, correct: 18, wrong: 2, durationSeconds: 600 },
    ],
  });
}

function weakStudent() {
  return makeAggregate({
    summary: {
      totalAnswers: 40, correctAnswers: 14, wrongAnswers: 26,
      accuracy: 35, totalDurationSeconds: 2400,
      avgHintsPerQuestion: 2.5, avgTimePerQuestionSec: 60,
      modeCounts: { unknown: 0, learning: 40, review: 0, drill: 0 },
      levelCounts: { unknown: 0, easy: 20, medium: 20, hard: 0 },
    },
    subjects: {
      math: {
        sessions: 4, answers: 20, correct: 6, wrong: 14, accuracy: 30, durationSeconds: 1200,
        hintsSum: 60, hintsCount: 20, timeMsSum: 1500000, timeMsCount: 20,
        avgHintsPerQuestion: 3, avgTimePerQuestionSec: 75,
        correctSlowAnswers: 4, correctManyHintsAnswers: 5, wrongFastAnswers: 6,
        topics: {
          multiplication: topic(12, 3, { hintsSum: 36, hintsCount: 12, timeMsSum: 900000, timeMsCount: 12, correctSlowAnswers: 2, correctManyHintsAnswers: 3, wrongFastAnswers: 4 }),
          division: topic(8, 3, { hintsSum: 24, hintsCount: 8, timeMsSum: 600000, timeMsCount: 8, correctSlowAnswers: 2, correctManyHintsAnswers: 2, wrongFastAnswers: 2 }),
        },
      },
      english: {
        sessions: 3, answers: 20, correct: 8, wrong: 12, accuracy: 40, durationSeconds: 1200,
        hintsSum: 40, hintsCount: 20, timeMsSum: 900000, timeMsCount: 20,
        avgHintsPerQuestion: 2, avgTimePerQuestionSec: 45,
        topics: {
          grammar: topic(10, 4, { hintsSum: 20, hintsCount: 10, timeMsSum: 450000, timeMsCount: 10 }),
          reading_comprehension: topic(10, 4, { hintsSum: 20, hintsCount: 10, timeMsSum: 450000, timeMsCount: 10 }),
        },
      },
    },
    recentMistakes: [
      { subject: "math", topic: "multiplication", questionId: "q-mul-1", prompt: "x", expectedAnswer: "y", userAnswer: "z", hintsUsed: 3, timeSpentMs: 80000, mode: "learning", level: "medium", answeredAt: "2026-05-07T10:00:00.000Z" },
      { subject: "math", topic: "multiplication", questionId: "q-mul-1", prompt: "x", expectedAnswer: "y", userAnswer: "z", hintsUsed: 4, timeSpentMs: 90000, mode: "learning", level: "medium", answeredAt: "2026-05-08T10:00:00.000Z" },
      { subject: "math", topic: "division", questionId: "q-div-1", prompt: "x", expectedAnswer: "y", userAnswer: "z", hintsUsed: 2, timeSpentMs: 70000, mode: "learning", level: "medium", answeredAt: "2026-05-08T11:00:00.000Z" },
      { subject: "math", topic: "division", questionId: "q-div-2", prompt: "x", expectedAnswer: "y", userAnswer: "z", hintsUsed: 3, timeSpentMs: 60000, mode: "learning", level: "medium", answeredAt: "2026-05-08T12:00:00.000Z" },
    ],
  });
}

function thinStudent() {
  return makeAggregate({
    summary: {
      totalAnswers: 4, correctAnswers: 2, wrongAnswers: 2,
      accuracy: 50, totalDurationSeconds: 240,
      modeCounts: { unknown: 0, learning: 4, review: 0, drill: 0 },
      levelCounts: { unknown: 0, easy: 4, medium: 0, hard: 0 },
    },
    subjects: {
      math: {
        sessions: 1, answers: 4, correct: 2, wrong: 2, accuracy: 50, durationSeconds: 240,
        hintsSum: 0, hintsCount: 0, timeMsSum: 0, timeMsCount: 0,
        topics: { multiplication: topic(4, 2) },
      },
    },
  });
}

function emptyStudent() {
  return makeAggregate();
}

// ---- Tests ----

function testDeterminism() {
  const fx = strongStudent();
  const a = buildParentReportInsightPacket({ aggregate: fx }, { now: FIXED_NOW, rangeLabel: "week" });
  const b = buildParentReportInsightPacket({ aggregate: fx }, { now: FIXED_NOW, rangeLabel: "week" });
  check("determinism :: byte-identical with fixed now", JSON.stringify(a) === JSON.stringify(b));

  const c = buildParentReportInsightPacket({ aggregate: fx }, { now: "2030-01-01T00:00:00.000Z", rangeLabel: "week" });
  const stripGen = (p) => ({ ...p, generatedAt: "" });
  check("determinism :: stable when generatedAt excluded", JSON.stringify(stripGen(a)) === JSON.stringify(stripGen(c)));

  const d = buildParentReportInsightPacket({ aggregate: fx }, { rangeLabel: "week" });
  check("determinism :: no Date.now() ⇒ generatedAt empty when not injected", d.generatedAt === "");
}

function testStrengthsFocusSourceIds() {
  const strongPkt = buildParentReportInsightPacket({ aggregate: strongStudent() }, { now: FIXED_NOW });
  check("strengths :: at least one strength on strong student", strongPkt.strengths.length > 0);
  for (const s of strongPkt.strengths) {
    check(`strengths :: valid sourceId (${s.sourceId})`, isValidSourceId(s.sourceId));
    check(`strengths :: in availableStrengthSourceIds`, strongPkt.availableStrengthSourceIds.includes(s.sourceId));
    check(`strengths :: displayNameHe non-empty for ${s.sourceId}`, typeof s.displayNameHe === "string" && s.displayNameHe.trim().length > 0);
    check(`strengths :: displayNameHe contains Hebrew`, /[\u0590-\u05FF]/.test(s.displayNameHe));
  }

  const weakPkt = buildParentReportInsightPacket({ aggregate: weakStudent() }, { now: FIXED_NOW });
  check("focusAreas :: at least one focus on weak student", weakPkt.focusAreas.length > 0);
  for (const f of weakPkt.focusAreas) {
    check(`focusAreas :: valid sourceId (${f.sourceId})`, isValidSourceId(f.sourceId));
    check(`focusAreas :: in availableFocusSourceIds`, weakPkt.availableFocusSourceIds.includes(f.sourceId));
    check(`focusAreas :: displayNameHe contains Hebrew`, /[\u0590-\u05FF]/.test(f.displayNameHe));
  }
}

function testTopicRowsIncludeGradeWhenStudentRegistered() {
  const pkt = buildParentReportInsightPacket({ aggregate: strongStudent() }, { now: FIXED_NOW });
  check("grade guard :: student registered with g4", pkt.student.gradeLevel === "g4");
  const practicedTopics = pkt.topics.filter((t) => (t.totalQuestions || 0) > 0);
  check("grade guard :: practiced topics present", practicedTopics.length > 0);
  for (const t of practicedTopics) {
    check(
      `grade guard :: ${t.key} has contentGradeLevel`,
      typeof t.contentGradeLevel === "string" && t.contentGradeLevel.trim().length > 0,
      `got ${JSON.stringify(t.contentGradeLevel)}`,
    );
  }
}

function testHebrewLabelResolution() {
  const pkt = buildParentReportInsightPacket({ aggregate: strongStudent() }, { now: FIXED_NOW });
  for (const t of pkt.topics) {
    check(`topics :: ${t.key} label has Hebrew`, /[\u0590-\u05FF]/.test(t.displayNameHe), `got "${t.displayNameHe}"`);
  }
  for (const s of pkt.subjects) {
    check(`subjects :: ${s.key} label has Hebrew`, /[\u0590-\u05FF]/.test(s.displayNameHe));
  }
}

function testThinDataWarnings() {
  const pkt = buildParentReportInsightPacket({ aggregate: thinStudent() }, { now: FIXED_NOW });
  check("thinData :: overall scope present", pkt.thinDataWarnings.some((w) => w.scope === "overall"));
  check("thinData :: limitations non-empty", pkt.limitations.length > 0);
  const empty = buildParentReportInsightPacket({ aggregate: emptyStudent() }, { now: FIXED_NOW });
  check("thinData :: empty student lists 0 strengths/focus", empty.strengths.length === 0 && empty.focusAreas.length === 0);
  check("thinData :: empty student has limitation entry", empty.limitations.length > 0);
}

function testFluencyAndMistakes() {
  const pkt = buildParentReportInsightPacket({ aggregate: weakStudent() }, { now: FIXED_NOW });
  check("fluency :: correctSlowTopicsHe non-empty for weak student",
    pkt.fluencySignals.correctSlowTopicsHe.length > 0,
    JSON.stringify(pkt.fluencySignals));
  check("fluency :: wrongFastTopicsHe non-empty for weak student",
    pkt.fluencySignals.wrongFastTopicsHe.length > 0);
  check("mistakes :: at least one same_question_recurrence pattern",
    pkt.mistakePatterns.some((m) => m.kind === "same_question_recurrence"));
  check("mistakes :: at least one topic_recurrence pattern",
    pkt.mistakePatterns.some((m) => m.kind === "topic_recurrence"));
  for (const m of pkt.mistakePatterns) {
    check(`mistakes :: ${m.topicDisplayHe} contains Hebrew`, /[\u0590-\u05FF]/.test(m.topicDisplayHe));
    check(`mistakes :: ${m.topicDisplayHe} occurrences ≥ 2`, m.occurrences >= 2);
  }
}

function testModeLevelExposure() {
  const pkt = buildParentReportInsightPacket({ aggregate: strongStudent() }, { now: FIXED_NOW });
  check("modeCounts :: present at overall", pkt.overall.modeCounts && typeof pkt.overall.modeCounts === "object");
  check("modeCounts :: learning > 0 in fixture", (pkt.overall.modeCounts.learning || 0) > 0);
  check("normalizedGradeLevel :: g4", pkt.overall.normalizedGradeLevel === "g4");
  check("student.gradeLevel :: g4", pkt.student.gradeLevel === "g4");
}

function testAiNarrativeInputProjection() {
  const pkt = buildParentReportInsightPacket({ aggregate: weakStudent() }, { now: FIXED_NOW });
  const input = buildAiNarrativeInput(pkt);
  check("aiInput :: not null for non-empty packet", input != null);
  check("aiInput :: budget under cap", isAiNarrativeInputWithinBudget(input), `size=${JSON.stringify(input).length}, max=${MAX_PROMPT_INPUT_CHARS}`);
  const flat = JSON.stringify(input);
  check("aiInput :: no clientMeta key in serialized input", flat.indexOf("clientMeta") === -1);
  check("aiInput :: no prompt/expectedAnswer/userAnswer in serialized input",
    flat.indexOf("\"prompt\"") === -1 && flat.indexOf("\"expectedAnswer\"") === -1 && flat.indexOf("\"userAnswer\"") === -1);
  check("aiInput :: availableStrengthSourceIds matches packet", JSON.stringify([...input.availableStrengthSourceIds].sort()) === JSON.stringify([...pkt.availableStrengthSourceIds].sort()));
  check("aiInput :: availableFocusSourceIds matches packet", JSON.stringify([...input.availableFocusSourceIds].sort()) === JSON.stringify([...pkt.availableFocusSourceIds].sort()));
}

function testStrongVsWeakDifferentiation() {
  const strongPkt = buildParentReportInsightPacket({ aggregate: strongStudent() }, { now: FIXED_NOW });
  const weakPkt = buildParentReportInsightPacket({ aggregate: weakStudent() }, { now: FIXED_NOW });
  check("differentiation :: strong has strengths", strongPkt.strengths.length > 0);
  check("differentiation :: weak has focusAreas", weakPkt.focusAreas.length > 0);
  check("differentiation :: weak data confidence ≠ thin overall (40q)", weakPkt.overall.dataConfidence !== "thin");
  check("differentiation :: thin student data confidence == thin", buildParentReportInsightPacket({ aggregate: thinStudent() }, { now: FIXED_NOW }).overall.dataConfidence === "thin");
}

function run() {
  testDeterminism();
  testStrengthsFocusSourceIds();
  testTopicRowsIncludeGradeWhenStudentRegistered();
  testHebrewLabelResolution();
  testThinDataWarnings();
  testFluencyAndMistakes();
  testModeLevelExposure();
  testAiNarrativeInputProjection();
  testStrongVsWeakDifferentiation();
  process.stdout.write(`\nparent-report-insights selftest :: ${runs - failures}/${runs} passed\n`);
  if (failures > 0) process.exit(1);
}

run();
