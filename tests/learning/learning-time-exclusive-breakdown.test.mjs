import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  creditExclusiveCategoriesMs,
  exclusiveMsToDisplayMinutes,
} from "../../lib/learning/learning-time-union.js";
import {
  formatExclusiveLearningMinutesHe,
  formatLearningTimeDivisionLineHe,
  normalizeLearningTimeExclusiveBreakdown,
} from "../../lib/parent-ui/learning-time-exclusive-breakdown-display.js";
import { buildDetailedParentReportFromBaseReport } from "../../utils/detailed-parent-report.js";
import { rebuildSummaryFromFilteredReport } from "../../lib/parent-ui/parent-report-regular-display.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

test("exclusive: question + book + other = total ms", () => {
  const r = creditExclusiveCategoriesMs([
    { start: 0, end: 100_000, category: "question" },
    { start: 100_000, end: 250_000, category: "book" },
    { start: 250_000, end: 300_000, category: "other" },
  ]);
  assert.equal(r.questionPracticeMs, 100_000);
  assert.equal(r.bookReadingMs, 150_000);
  assert.equal(r.otherActiveLearningMs, 50_000);
  assert.equal(
    r.questionPracticeMs + r.bookReadingMs + r.otherActiveLearningMs,
    r.totalMs
  );
});

test("exclusive: overlapping answer+visit → question only", () => {
  const r = creditExclusiveCategoriesMs([
    { start: 0, end: 120_000, category: "question" },
    { start: 30_000, end: 180_000, category: "other" },
  ]);
  assert.equal(r.questionPracticeMs, 120_000);
  assert.equal(r.otherActiveLearningMs, 60_000);
  assert.equal(r.bookReadingMs, 0);
  assert.equal(r.totalMs, 180_000);
});

test("exclusive: overlapping book+visit → book not other", () => {
  const r = creditExclusiveCategoriesMs([
    { start: 0, end: 200_000, category: "book", subjectKey: "math" },
    { start: 50_000, end: 250_000, category: "other" },
  ]);
  assert.equal(r.bookReadingMs, 200_000);
  assert.equal(r.otherActiveLearningMs, 50_000);
  assert.equal(r.questionPracticeMs, 0);
  assert.equal(r.bySubjectMs.math.bookReadingMs, 200_000);
});

test("exclusive: residual-only other", () => {
  const r = creditExclusiveCategoriesMs([
    { start: 0, end: 60_000, category: "other" },
  ]);
  assert.equal(r.otherActiveLearningMs, 60_000);
  assert.equal(r.totalMs, 60_000);
});

test("display minutes sum exactly to totalMinutes", () => {
  const parts = {
    questionPracticeMs: 100_000,
    bookReadingMs: 200_000,
    otherActiveLearningMs: 50_000,
    totalMs: 350_000,
  };
  const d = exclusiveMsToDisplayMinutes(parts, 5.83);
  assert.equal(
    Math.round(
      (d.questionPracticeMinutes + d.bookReadingMinutes + d.otherActiveLearningMinutes) * 100
    ),
    Math.round(d.totalMinutes * 100)
  );
  assert.equal(d.totalMinutes, 5.83);
});

test("normalize rejects incomplete breakdown; accepts full", () => {
  assert.equal(normalizeLearningTimeExclusiveBreakdown(null), null);
  assert.equal(normalizeLearningTimeExclusiveBreakdown({ totalMinutes: 1 }), null);
  const n = normalizeLearningTimeExclusiveBreakdown({
    totalMinutes: 10,
    questionPracticeMinutes: 4,
    bookReadingMinutes: 3,
    otherActiveLearningMinutes: 3,
    analyzedQuestionCount: 12,
    bySubject: [{ subjectKey: "math", questionPracticeMinutes: 4, bookReadingMinutes: 1 }],
  });
  assert.ok(n);
  assert.equal(n.bySubject[0].subjectLabelHe, "מתמטיקה");
  assert.match(formatLearningTimeDivisionLineHe(n), /חלוקת זמן הלמידה/);
  assert.equal(formatExclusiveLearningMinutesHe(4), "4");
});

test("rebuildSummary preserves exclusive breakdown", () => {
  const summary = rebuildSummaryFromFilteredReport({
    summary: {
      learningTimeSource: "unified_credited",
      creditedLearningMinutes: 12,
      totalTimeMinutes: 12,
      learningTimeExclusiveBreakdown: {
        totalMinutes: 12,
        questionPracticeMinutes: 5,
        bookReadingMinutes: 4,
        otherActiveLearningMinutes: 3,
        analyzedQuestionCount: 9,
        bySubject: [],
      },
    },
    mathOperations: {},
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    historyTopics: {},
    hebrewTopics: {},
  });
  assert.equal(summary.creditedLearningMinutes, 12);
  assert.equal(summary.learningTimeExclusiveBreakdown.questionPracticeMinutes, 5);
});

test("detailed overallSnapshot carries exclusive breakdown", () => {
  const payload = buildDetailedParentReportFromBaseReport({
    playerName: "T",
    period: "month",
    summary: {
      totalTimeMinutes: 20,
      totalQuestions: 5,
      overallAccuracy: 80,
      learningTimeExclusiveBreakdown: {
        totalMinutes: 20,
        questionPracticeMinutes: 10,
        bookReadingMinutes: 5,
        otherActiveLearningMinutes: 5,
        analyzedQuestionCount: 5,
        bySubject: [],
      },
    },
    mathOperations: {},
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    historyTopics: {},
    hebrewTopics: {},
  });
  assert.equal(payload.overallSnapshot.learningTimeExclusiveBreakdown.totalMinutes, 20);
});

test("missing breakdown does not crash normalize / division line", () => {
  assert.equal(normalizeLearningTimeExclusiveBreakdown(undefined), null);
  assert.equal(formatLearningTimeDivisionLineHe(null), "");
});

test("UI sources do not use raw meta.learningTimeBreakdown for exclusive display", () => {
  const displaySrc = readFileSync(
    join(ROOT, "lib/parent-ui/learning-time-exclusive-breakdown-display.js"),
    "utf8"
  );
  assert.doesNotMatch(displaySrc, /meta\.learningTimeBreakdown/);
  assert.match(displaySrc, /learningTimeExclusiveBreakdown/);
  const detailedPage = readFileSync(join(ROOT, "pages/learning/parent-report-detailed.js"), "utf8");
  assert.match(detailedPage, /LearningTimeBreakdownDetails/);
  assert.match(detailedPage, /formatLearningTimeDivisionLineHe/);
  assert.match(detailedPage, /displayMode === \"full\"/);
  assert.doesNotMatch(detailedPage, /meta\.learningTimeBreakdown/);
  const regularPage = readFileSync(join(ROOT, "pages/learning/parent-report.js"), "utf8");
  assert.match(regularPage, /חלוקת זמן הלמידה/);
  assert.match(regularPage, /layout=\"vertical\"/);
  assert.match(regularPage, /stackId=\"lt\"/);
  assert.doesNotMatch(regularPage, /meta\.learningTimeBreakdown/);
  // Table before recommendations; chart first in graph section before daily activity.
  const summaryCardsEnd = regularPage.indexOf("ParentReportDataHealthNote");
  const combinedAfterCards = regularPage.slice(
    regularPage.indexOf('grid grid-cols-2 md:grid-cols-4'),
    summaryCardsEnd
  );
  assert.doesNotMatch(combinedAfterCards, /חלוקת זמן הלמידה/);
  const learningTableIdx = regularPage.indexOf("סוג הלמידה");
  const recommendationsIdx = regularPage.indexOf("💡 המלצות");
  assert.ok(learningTableIdx > 0 && recommendationsIdx > learningTableIdx);
  const graphSectionIdx = regularPage.indexOf('aria-label="גרפים"');
  assert.ok(graphSectionIdx > recommendationsIdx);
  const learningChartTitleIdx = regularPage.indexOf("חלוקת זמן הלמידה", graphSectionIdx);
  const dailyChartIdx = regularPage.indexOf("פעילות יומית", graphSectionIdx);
  assert.ok(learningChartTitleIdx > graphSectionIdx);
  assert.ok(dailyChartIdx > learningChartTitleIdx);
  const surface = readFileSync(join(ROOT, "components/parent-report-detailed-surface.jsx"), "utf8");
  assert.match(surface, /export function LearningTimeBreakdownDetails/);
  assert.doesNotMatch(surface, /\borphan\b/i);
});

test("existing credited fields remain in attach module", () => {
  const attach = readFileSync(
    join(ROOT, "lib/parent-server/attach-unified-learning-time.server.js"),
    "utf8"
  );
  assert.match(attach, /creditedLearningMinutes/);
  assert.match(attach, /totalDurationSeconds/);
  assert.match(attach, /learningTimeSource/);
  assert.match(attach, /learningTimeExclusiveBreakdown/);
  assert.match(attach, /meta\.learningTimeBreakdown = unified\.breakdown/);
});

test("summary mode keeps division line wiring; details gated to full", () => {
  const detailedPage = readFileSync(join(ROOT, "pages/learning/parent-report-detailed.js"), "utf8");
  const detailsIdx = detailedPage.indexOf("<LearningTimeBreakdownDetails");
  const fullGateIdx = detailedPage.lastIndexOf('displayMode === "full"', detailsIdx);
  assert.ok(detailsIdx > 0);
  assert.ok(fullGateIdx > 0 && fullGateIdx < detailsIdx);
  assert.match(detailedPage, /כיסוי לפי מקצוע/);
});
