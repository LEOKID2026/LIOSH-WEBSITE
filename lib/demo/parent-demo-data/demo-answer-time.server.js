/**
 * Demo answer timing — uses the real free-practice timing contract (creditLearningUnitMs / 10 min cap).
 * Per-answer raw time is deterministic from grade, subject, topic, question kind, outcome, hints.
 * Session duration is derived from answer times + navigation gaps (never split session evenly).
 */
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import {
  creditedMsToSessionDurationSeconds,
  creditLearningUnitMs,
} from "../../learning/learning-time-credit-policy.js";
import { computeFreePracticeTiming } from "../../learning/timing-policy.js";
import { getDemoParentChildById } from "./children.js";
import { getDemoChildProfile } from "./profiles.js";
import { demoRandInt, demoSeededRandom } from "./seed.js";

/** Small session start overhead (loading screen). */
const SESSION_START_OVERHEAD_MS = 12_000;

/** @type {Record<string, number>} grade speed factor (lower = faster). */
const GRADE_SPEED_FACTOR = Object.freeze({
  g1: 1.08,
  g2: 1.0,
  g3: 0.94,
  g4: 0.88,
  g5: 0.82,
  g6: 0.76,
});

/** @type {Record<string, number>} profile speed tweak. */
const PROFILE_SPEED_FACTOR = Object.freeze({
  young_balanced: 1.02,
  strong_stem: 0.94,
  needs_writing: 0.9,
});

/** Base raw ms ranges [min, max] for g2 — before grade/profile modifiers. */
const BASE_MS_BY_KIND = Object.freeze({
  add: [22_000, 38_000],
  add_two: [24_000, 40_000],
  add_three: [38_000, 62_000],
  sub: [28_000, 44_000],
  sub_two: [30_000, 48_000],
  mul: [42_000, 68_000],
  div: [52_000, 82_000],
  frac_compare: [58_000, 92_000],
  compare: [20_000, 36_000],
  place: [28_000, 44_000],
  word_problem: [70_000, 120_000],
  passage_mcq: [95_000, 175_000],
  vocabulary_mcq: [18_000, 38_000],
  grammar_mcq: [36_000, 58_000],
  reading_mcq: [85_000, 150_000],
  geometry_mcq: [40_000, 68_000],
  science_mcq: [44_000, 72_000],
  default_practice: [32_000, 55_000],
});

/** @type {Record<string, [number, number]>} topic fallback when params.kind missing. */
const BASE_MS_BY_TOPIC = Object.freeze({
  addition: [24_000, 40_000],
  subtraction: [30_000, 48_000],
  multiplication: [42_000, 68_000],
  division: [52_000, 82_000],
  fractions: [58_000, 92_000],
  compare: [20_000, 36_000],
  number_sense: [28_000, 44_000],
  word_problems: [68_000, 115_000],
  comprehension: [95_000, 170_000],
  reading: [80_000, 140_000],
  vocabulary: [20_000, 38_000],
  grammar: [36_000, 58_000],
  translation: [42_000, 65_000],
  sentences: [40_000, 62_000],
  angles: [48_000, 72_000],
  area: [45_000, 70_000],
  shapes_basic: [38_000, 58_000],
  plants: [44_000, 70_000],
  earth_space: [48_000, 78_000],
  body: [42_000, 68_000],
});

/** @type {Record<string, [number, number]>} */
const BASE_MS_BY_SUBJECT = Object.freeze({
  math: [30_000, 52_000],
  hebrew: [55_000, 95_000],
  english: [32_000, 55_000],
  geometry: [42_000, 68_000],
  science: [44_000, 72_000],
});

/**
 * @param {string} childId
 * @returns {number}
 */
function demoChildSpeedFactor(childId) {
  const child = getDemoParentChildById(childId);
  const gradeKey = normalizeGradeLevelToKey(child?.grade_level) || "g2";
  const gradeFactor = GRADE_SPEED_FACTOR[gradeKey] ?? 1.0;
  const profileKey = child?.profileKey || "young_balanced";
  const profileFactor = PROFILE_SPEED_FACTOR[profileKey] ?? 1.0;
  return gradeFactor * profileFactor;
}

/**
 * @param {Record<string, unknown>} payload
 */
function resolveDemoQuestionKind(payload) {
  const params =
    payload?.params && typeof payload.params === "object" ? payload.params : null;
  if (params?.kind) return String(params.kind).trim();
  const qe =
    payload?.questionEngine && typeof payload.questionEngine === "object"
      ? payload.questionEngine
      : null;
  if (qe?.questionType === "passage" || qe?.questionType === "reading") return "passage_mcq";
  return "";
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {[number, number]}
 */
function resolveBaseMsRange(payload) {
  const kind = resolveDemoQuestionKind(payload);
  if (kind && BASE_MS_BY_KIND[kind]) return BASE_MS_BY_KIND[kind];

  const topic = String(payload?.topic || "").trim();
  if (topic && BASE_MS_BY_TOPIC[topic]) return BASE_MS_BY_TOPIC[topic];

  const subject = String(payload?.subject || "").trim().toLowerCase();
  if (subject === "hebrew" && /comprehension|reading/.test(topic)) return BASE_MS_BY_KIND.passage_mcq;
  if (subject === "hebrew" && /grammar|vocabulary/.test(topic)) {
    return BASE_MS_BY_TOPIC[topic] || BASE_MS_BY_KIND.grammar_mcq;
  }
  if (subject === "english" && topic === "vocabulary") return BASE_MS_BY_KIND.vocabulary_mcq;
  if (subject === "math") return BASE_MS_BY_SUBJECT.math;
  if (subject && BASE_MS_BY_SUBJECT[subject]) return BASE_MS_BY_SUBJECT[subject];

  return BASE_MS_BY_KIND.default_practice;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {boolean} isCorrect
 * @param {number} attemptIndex
 * @param {boolean} usedHint
 */
function applyDemoTimingModifiers(baseMs, payload, isCorrect, attemptIndex, usedHint) {
  let ms = baseMs;
  const kind = resolveDemoQuestionKind(payload);
  const level = String(payload?.level || "medium").toLowerCase();

  if (/add_three|word_problem|passage|comprehension|reading/.test(kind + String(payload?.topic || ""))) {
    ms = Math.round(ms * 1.18);
  }

  if (level === "hard") ms = Math.round(ms * 1.12);
  if (level === "easy") ms = Math.round(ms * 0.9);

  if (!isCorrect) {
    ms += 9_000 + Math.min(18_000, attemptIndex * 7_000);
    ms = Math.round(ms * 1.12);
  }

  if (usedHint) ms += 11_000;

  const flags =
    payload?.contextFlags && typeof payload.contextFlags === "object"
      ? payload.contextFlags
      : null;
  if (flags?.hasHints) ms += 8_000;
  if (flags?.afterStepByStep) ms = Math.round(ms * 0.92);

  return Math.max(8_000, ms);
}

/**
 * Deterministic raw dwell ms for one answered question.
 * @param {Record<string, unknown>} payload
 * @param {{
 *   childId: string,
 *   questionKey: string,
 *   isCorrect: boolean,
 *   attemptIndex?: number,
 *   usedHint?: boolean,
 * }} ctx
 */
export function estimateDemoAnswerRawTimeMs(payload, ctx) {
  const [minMs, maxMs] = resolveBaseMsRange(payload);
  const rnd = demoSeededRandom(ctx.childId, ctx.questionKey, "answer-time");
  const picked = demoRandInt(rnd, minMs, maxMs);
  const speed = demoChildSpeedFactor(ctx.childId);
  const scaled = Math.round(picked * speed);
  return applyDemoTimingModifiers(
    scaled,
    payload,
    ctx.isCorrect,
    Math.max(0, Math.floor(Number(ctx.attemptIndex) || 0)),
    !!ctx.usedHint,
  );
}

/**
 * Gap between consecutive questions inside one session.
 * @param {string} childId
 * @param {string} sessionKey
 * @param {number} afterQuestionIndex
 */
export function demoQuestionNavGapMs(childId, sessionKey, afterQuestionIndex) {
  const rnd = demoSeededRandom(childId, sessionKey, "nav-gap", String(afterQuestionIndex));
  return demoRandInt(rnd, 4_000, 9_000);
}

/**
 * Attach real timing fields to an answered demo payload.
 * @param {Record<string, unknown>} payload
 * @param {{
 *   childId: string,
 *   questionKey: string,
 *   isCorrect: boolean,
 *   attemptIndex?: number,
 *   usedHint?: boolean,
 * }} ctx
 */
export function attachDemoAnswerTiming(payload, ctx) {
  const rawMs = estimateDemoAnswerRawTimeMs(payload, ctx);
  const { rawTimeSpentMs, creditedTimeMs, timingStatus, overCreditCap } =
    computeFreePracticeTiming(rawMs);

  if (!rawTimeSpentMs || !creditedTimeMs) return payload;

  return {
    ...payload,
    rawTimeSpentMs,
    timeSpentMs: rawTimeSpentMs,
    creditedTimeMs,
    timingStatus,
    ...(overCreditCap ? { overCreditCap: true } : {}),
  };
}

/**
 * @param {Array<{ answer_payload?: Record<string, unknown> }>} sessionAnswers
 */
export function sumDemoAnswerCreditedMs(sessionAnswers) {
  let total = 0;
  for (const row of sessionAnswers || []) {
    const payload = row?.answer_payload;
    if (!payload || typeof payload !== "object") continue;
    total += creditLearningUnitMs(Number(payload.creditedTimeMs) || 0);
  }
  return total;
}

/**
 * @param {Array<{ answer_payload?: Record<string, unknown> }>} sessionAnswers
 * @param {string} childId
 * @param {string} sessionKey
 */
export function computeDemoSessionNavMs(sessionAnswers, childId, sessionKey) {
  const n = sessionAnswers?.length || 0;
  if (n <= 1) return 0;
  let nav = 0;
  for (let i = 1; i < n; i += 1) {
    nav += demoQuestionNavGapMs(childId, sessionKey, i - 1);
  }
  return nav;
}

/**
 * @param {Array<{ answer_payload?: Record<string, unknown> }>} sessionAnswers
 * @param {string} childId
 * @param {string} sessionKey
 */
export function summarizeDemoSessionTiming(sessionAnswers, childId, sessionKey) {
  const creditedMs = sumDemoAnswerCreditedMs(sessionAnswers);
  const navMs = computeDemoSessionNavMs(sessionAnswers, childId, sessionKey);
  const totalSpanMs = SESSION_START_OVERHEAD_MS + navMs + creditedMs;
  return {
    creditedMs,
    navMs,
    totalSpanMs,
    durationSeconds: creditedMsToSessionDurationSeconds(totalSpanMs),
  };
}

/** Target book ms as a share of question practice ms (~8–10% of eventual total). */
export function demoTargetBookMsFromQuestionMs(childId, fromYmd, toYmd, questionMs) {
  const q = Math.max(0, Math.floor(Number(questionMs) || 0));
  if (q <= 0) return 0;
  const rnd = demoSeededRandom(childId, fromYmd, toYmd, "book-share");
  const shareOfQuestion = 0.106 + rnd() * 0.027;
  return Math.round(q * shareOfQuestion);
}

/** @deprecated use attachDemoAnswerTiming */
export function allocateDemoAnswerCreditedTimeMs(durationSec, questionCount, questionIndex) {
  const qCount = Math.max(0, Math.floor(Number(questionCount) || 0));
  const qIndex = Math.max(0, Math.floor(Number(questionIndex) || 0));
  if (qCount <= 0 || qIndex >= qCount) return 0;
  const totalMs = Math.max(0, Math.floor(Number(durationSec) || 0) * 1000);
  if (totalMs <= 0) return 0;
  const baseMs = Math.floor(totalMs / qCount);
  const remainderMs = totalMs - baseMs * qCount;
  return baseMs + (qIndex < remainderMs ? 1 : 0);
}

/** @deprecated use attachDemoAnswerTiming */
export function attachDemoAnswerCreditedTime(payload, durationSec, questionCount, questionIndex) {
  return attachDemoAnswerTiming(payload, {
    childId: "demo-unknown",
    questionKey: `legacy-${questionIndex}`,
    isCorrect: true,
  });
}
