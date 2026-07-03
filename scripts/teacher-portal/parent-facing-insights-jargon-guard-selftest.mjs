#!/usr/bin/env node
/**
 * Parent-facing insights — forbidden diagnostic jargon guard (no DB).
 * Run: node scripts/teacher-portal/parent-facing-insights-jargon-guard-selftest.mjs
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mod = await import(
  pathToFileURL(path.join(root, "lib/parent-server/parent-report-parent-facing.server.js")).href
);
const { insufficientDataInsightHe, noUrgentTopicInsightHe } = await import(
  pathToFileURL(path.join(root, "utils/parent-report-language/parent-report-hebrew-copy-spec.js")).href
);

const { buildParentInsightsHe, buildParentFacingBlocks } = mod;

const PARENT_INSIGHTS_FORBIDDEN_DIAGNOSTIC_FRAGMENTS = [
  "אבחוניות",
  "תשובות אבחוניות",
  "האבחון בהם",
  "שורת אבחון",
  "המנוע לא זיהה",
];

function assertNoDiagnosticJargonInParentInsights(lines) {
  for (const line of lines) {
    for (const frag of PARENT_INSIGHTS_FORBIDDEN_DIAGNOSTIC_FRAGMENTS) {
      assert.ok(
        !String(line || "").includes(frag),
        `parent insight must not contain "${frag}": ${line}`,
      );
    }
    assert.ok(
      !String(line || "").includes("«") && !String(line || "").includes("»"),
      `parent insight must not contain guillemets: ${line}`,
    );
  }
}

// Empty activity — no-data insight
{
  const insights = buildParentInsightsHe({ summary: {}, subjects: {} });
  assert(insights.some((t) => t.includes("נתוני תרגול")));
  assertNoDiagnosticJargonInParentInsights(insights);
}

// Thin-data path (insufficientDataInsightHe)
{
  const insights = buildParentInsightsHe({
    range: { from: "2026-05-01", to: "2026-05-25" },
    summary: { totalAnswers: 3, totalSessions: 2, accuracy: 55 },
    subjects: { math: { answers: 3, accuracy: 55, topics: {} } },
    dailyActivity: [{ date: "2026-05-25", answers: 3, correct: 2 }],
  });
  assert(insights.some((t) => t.includes("נתוני תרגול")));
  assertNoDiagnosticJargonInParentInsights(insights);
}

// Spec helper string (A2 copy)
{
  const line = insufficientDataInsightHe();
  assert(line.includes("נתוני תרגול"));
  assertNoDiagnosticJargonInParentInsights([line]);
}

// Spec §1.3 — no urgent topic (engine-word guard)
{
  const line = noUrgentTopicInsightHe();
  assert(line.includes("המערכת עדיין לא זיהתה"));
  assertNoDiagnosticJargonInParentInsights([line]);
}

// Weak-math-style payload — topic insight line
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
  const { insights } = buildParentFacingBlocks(payload);
  assert(insights.length >= 1);
  assertNoDiagnosticJargonInParentInsights(insights);
}

console.log("parent-facing-insights-jargon-guard-selftest: PASS");
