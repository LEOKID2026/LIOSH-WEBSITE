import assert from "node:assert/strict";
import {
  computeTopicTrendV1,
  filterApprovedTopicTrendEvents,
  shouldShowTrendV1Line,
  trendV1DisplayLineHe,
  TREND_V1_PARENT_LINE_HE,
} from "../../utils/parent-report-topic-trend-v1.js";
import { EVIDENCE_SOURCE } from "../../lib/learning-supabase/evidence-source.js";

const DAY = 24 * 60 * 60 * 1000;
const baseMs = Date.UTC(2026, 2, 1, 12, 0, 0);

/** @param {number} i @param {boolean} correct @param {number} dayOffset */
function ev(i, correct, dayOffset = 0) {
  return {
    answeredAtMs: baseMs + dayOffset * DAY + i * 60_000,
    isCorrect: correct,
    evidenceSource: EVIDENCE_SOURCE.SELF_PRACTICE,
  };
}

function buildEvents(pattern, dayOffsets) {
  return pattern.map((correct, i) => ev(i, correct, dayOffsets[i] ?? Math.floor(i / 2)));
}

{
  const events = buildEvents(
    [false, false, false, false, true, true, true, true, true, true, true, true],
    [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2],
  );
  const trend = computeTopicTrendV1(events);
  assert.equal(trend.direction, "improving");
  assert.ok((trend.deltaPct ?? 0) >= 10);
  assert.equal(shouldShowTrendV1Line(trend), true);
}

{
  const events = buildEvents(
    [true, false, true, false, true, true, false, true, false, true],
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
  const trend = computeTopicTrendV1(events);
  assert.equal(trend.direction, "stable");
  assert.ok(Math.abs(trend.deltaPct ?? 0) <= 9);
}

{
  const events = buildEvents(
    [true, true, true, true, true, false, false, false, false, false],
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4],
  );
  const trend = computeTopicTrendV1(events);
  assert.equal(trend.direction, "declining");
  assert.ok((trend.deltaPct ?? 0) <= -10);
}

{
  const events = buildEvents([true, false, true, false, true, false], [0, 0, 1, 1, 2, 2]);
  const trend = computeTopicTrendV1(events);
  assert.equal(trend.direction, "insufficient_data");
  assert.equal(shouldShowTrendV1Line(trend), false);
}

{
  const events = Array.from({ length: 10 }, (_, i) => ev(i, i % 2 === 0, 0));
  const trend = computeTopicTrendV1(events);
  assert.equal(trend.direction, "insufficient_data");
  assert.equal(shouldShowTrendV1Line(trend), false);
}

{
  const math = computeTopicTrendV1(
    buildEvents([false, false, false, false, true, true, true, true, true, true], [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]),
  );
  const hebrew = computeTopicTrendV1(
    buildEvents([true, true, true, true, false, false, false, false, false, false], [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]),
  );
  assert.equal(math.direction, "improving");
  assert.equal(hebrew.direction, "declining");
}

{
  const filtered = filterApprovedTopicTrendEvents([
    { answeredAtMs: baseMs, isCorrect: true, evidenceSource: EVIDENCE_SOURCE.LEARNING_BOOK },
    { answeredAtMs: baseMs + 1000, isCorrect: true, evidenceSource: EVIDENCE_SOURCE.SELF_PRACTICE },
    {
      answeredAtMs: baseMs + 2000,
      isCorrect: false,
      evidenceSource: EVIDENCE_SOURCE.PRIVATE_TEACHER_ASSIGNED,
    },
    {
      answeredAtMs: baseMs + 3000,
      isCorrect: true,
      evidenceSource: EVIDENCE_SOURCE.PARENT_ASSIGNED,
    },
  ]);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].evidenceSource, EVIDENCE_SOURCE.SELF_PRACTICE);
  assert.equal(filtered[1].evidenceSource, EVIDENCE_SOURCE.PARENT_ASSIGNED);
}

{
  const mixed = filterApprovedTopicTrendEvents([
  ...buildEvents([true, true, true, true, true, true, true, true], [0, 0, 1, 1, 2, 2, 3, 3]).map((e) => ({
    ...e,
    evidenceSource: EVIDENCE_SOURCE.SELF_PRACTICE,
  })),
  ...buildEvents([true, true, true, true], [4, 4, 5, 5]).map((e) => ({
    ...e,
    evidenceSource: EVIDENCE_SOURCE.PARENT_ASSIGNED,
  })),
  ]);
  const trend = computeTopicTrendV1(mixed);
  assert.ok(["improving", "stable", "declining"].includes(trend.direction));
}

{
  const line = trendV1DisplayLineHe({
    ok: true,
    direction: "improving",
    parentLineHe: TREND_V1_PARENT_LINE_HE.improving,
  });
  assert.ok(line.includes("משתפר"));
  assert.ok(line.includes("מגמה בתקופה: משתפר -"));
  assert.equal(
    trendV1DisplayLineHe({ ok: true, direction: "insufficient_data", parentLineHe: "x" }),
    "",
  );
}

{
  const line = trendV1DisplayLineHe({
    ok: true,
    direction: "stable",
    parentLineHe: "מגמה בתקופה: התוצאות בנושא הזה יציבות יחסית בתקופה שנבחרה.",
  });
  assert.ok(line.includes("מגמה בתקופה: ללא שינוי משמעותי -"));
  assert.ok(line.includes("עדיין כדאי לחזק את הנושא בתרגול קצר"));
}

console.log("parent-report-topic-trend-v1.test.mjs: ok");
