#!/usr/bin/env node
/**
 * Unit selftest for parent-facing Hebrew insights/recommendations (no DB).
 *   node scripts/teacher-portal/parent-facing-insights-selftest.mjs
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mod = await import(
  pathToFileURL(path.join(root, "lib/parent-server/parent-report-parent-facing.server.js")).href
);

const { buildParentInsightsHe, buildParentFacingBlocks } = mod;

function assertHebrewOnly(lines) {
  for (const line of lines) {
    assert(typeof line === "string" && line.trim(), "non-empty string");
    assert(!/[a-zA-Z]/.test(line), `English leak: ${line}`);
    assert(!/guardian|uuid|student_id|math\b|hebrew\b/i.test(line), `raw key leak: ${line}`);
  }
}

// Empty activity
{
  const insights = buildParentInsightsHe({ summary: {}, subjects: {} });
  assert(insights.length >= 1 && insights.length <= 4);
  assertHebrewOnly(insights);
}

// Weak math — range.to aligned with last activity (avoids false inactivity vs wall clock)
{
  const payload = {
    range: { from: "2026-05-01", to: "2026-05-25" },
    summary: { totalAnswers: 40, totalSessions: 8, accuracy: 52, diagnosticAnswers: 35 },
    subjects: {
      math: {
        answers: 20,
        accuracy: 45,
        diagnosticAnswers: 18,
        topics: { addition: { answers: 10, accuracy: 40, diagnosticAnswers: 10 } },
      },
      hebrew: { answers: 20, accuracy: 78, diagnosticAnswers: 17, topics: {} },
    },
    dailyActivity: [{ date: "2026-05-25", answers: 5, correct: 2 }],
  };
  const { insights, homeRecommendations } = buildParentFacingBlocks(payload);
  assert(insights.some((t) => t.includes("מתמטיקה") || t.includes("חשבון") || t.includes("קושי")));
  assert(homeRecommendations.some((t) => t.includes("בבית") && t.includes("שאלות")));
  assertHebrewOnly([...insights, ...homeRecommendations]);
}

// Improvement trend — range.to aligned; evidence quality via buildParentFacingBlocks
{
  const daily = [
    { date: "2026-05-01", answers: 10, correct: 4 },
    { date: "2026-05-05", answers: 10, correct: 5 },
    { date: "2026-05-10", answers: 10, correct: 5 },
    { date: "2026-05-15", answers: 10, correct: 9 },
    { date: "2026-05-20", answers: 10, correct: 9 },
  ];
  const { insights } = buildParentFacingBlocks({
    range: { from: "2026-05-01", to: "2026-05-20" },
    summary: { totalAnswers: 50, totalSessions: 10, accuracy: 64, diagnosticAnswers: 50 },
    subjects: { math: { answers: 25, accuracy: 70, diagnosticAnswers: 25, topics: {} } },
    dailyActivity: daily,
    recentMistakes: [
      { isCorrect: false, subject: "math", answeredAt: "2026-05-01T10:00:00.000Z" },
      { isCorrect: false, subject: "math", answeredAt: "2026-05-15T10:00:00.000Z" },
    ],
  });
  assert(insights.some((t) => t.includes("שיפור")));
  assertHebrewOnly(insights);
}

console.log("parent-facing-insights-selftest: PASS");
