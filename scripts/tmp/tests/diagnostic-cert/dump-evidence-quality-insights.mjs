#!/usr/bin/env node
/**
 * Dump actual buildParentInsightsHe output for failing evidence-quality-layer cases.
 * Run: node scripts/tmp/tests/diagnostic-cert/dump-evidence-quality-insights.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { attachParentContextEvidenceQuality } from "../../../../lib/learning/evidence-quality.js";
import {
  allowsStrongParentDiagnosisAtStudent,
  allowsHedgedParentInsightAtStudent,
} from "../../../../lib/learning/evidence-quality.js";
import { buildParentInsightsHe } from "../../../../lib/parent-server/parent-report-parent-facing.server.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const OUT = join(ROOT, "reports", "diagnostic-cert", "evidence-quality-insights-dump.json");

function scenarioInsightTier811() {
  const payload = attachParentContextEvidenceQuality({
    summary: { diagnosticAnswers: 8, totalSessions: 3, totalAnswers: 8 },
    subjects: {
      math: {
        diagnosticAnswers: 8,
        diagnosticAccuracy: 50,
        topics: {
          fractions: { diagnosticAnswers: 8, diagnosticAccuracy: 50 },
        },
      },
    },
    recentMistakes: [
      { id: "m1", subject: "math", topic: "fractions", answeredAt: "2026-01-10T10:00:00Z" },
      { id: "m2", subject: "math", topic: "fractions", answeredAt: "2026-01-12T10:00:00Z" },
    ],
    dailyActivity: [{ date: "2026-01-10", answers: 8, correct: 4 }],
  });
  const insights = buildParentInsightsHe(payload);
  return {
    testName: "insight tier (8–11) allows hedged Hebrew only",
    allowsStrongParentDiagnosisAtStudent: allowsStrongParentDiagnosisAtStudent(payload),
    allowsHedgedParentInsightAtStudent: allowsHedgedParentInsightAtStudent(payload),
    insights,
    insightsCount: insights.length,
    expectedSubstrings: ["קושי יחסי", "כדאי לשים לב"],
    matchedExpected: {
      koshiYhasi: insights.some((t) => t.includes("קושי יחסי")),
      kadaiLashimLev: insights.some((t) => t.includes("כדאי לשים לב")),
    },
  };
}

function scenarioSupportedTier12() {
  const mistakes = [];
  for (let i = 0; i < 12; i++) {
    mistakes.push({
      id: `m${i}`,
      subject: "math",
      topic: "fractions",
      answeredAt: i < 6 ? "2026-01-10T10:00:00Z" : "2026-01-15T10:00:00Z",
    });
  }
  const payload = attachParentContextEvidenceQuality({
    summary: { diagnosticAnswers: 12, totalSessions: 3, totalAnswers: 12 },
    subjects: {
      math: {
        diagnosticAnswers: 12,
        diagnosticAccuracy: 50,
        topics: {
          fractions: { diagnosticAnswers: 12, diagnosticAccuracy: 50 },
        },
      },
    },
    recentMistakes: mistakes,
    dailyActivity: [{ date: "2026-01-10", answers: 12, correct: 6 }],
  });
  const insights = buildParentInsightsHe(payload);
  return {
    testName: "supported tier allows strong Hebrew weakness lines",
    allowsStrongParentDiagnosisAtStudent: allowsStrongParentDiagnosisAtStudent(payload),
    allowsHedgedParentInsightAtStudent: allowsHedgedParentInsightAtStudent(payload),
    insights,
    insightsCount: insights.length,
    expectedSubstrings: ["קושי", "כדאי לשים לב"],
    matchedExpected: {
      koshi: insights.some((t) => t.includes("קושי")),
      kadaiLashimLev: insights.some((t) => t.includes("כדאי לשים לב")),
    },
  };
}

const dump = {
  generatedAt: new Date().toISOString(),
  source: "tests/learning/evidence-quality-layer.test.mjs",
  scenarios: [scenarioInsightTier811(), scenarioSupportedTier12()],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`, "utf8");

console.log(JSON.stringify(dump, null, 2));
console.log(`\nSaved: ${OUT}`);
