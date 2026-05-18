/**
 * Grade-scoped parent report aggregation — acceptance checks.
 * Run: node scripts/parent-report-grade-scope-selftest.mjs
 */

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

async function importUtils(rel) {
  const m = await import(pathToFileURL(join(ROOT, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { buildReportInputFromDbData, REPORT_TOPIC_GRADE_SEP } = await importUtils(
  "lib/learning-supabase/report-data-adapter.js"
);
const { seedLocalStorageFromDbReportInput } = await importUtils("lib/learning-supabase/seed-db-report-local-storage.js");
const { resolveContentGradeFromAnswerPayload, buildGradeEvidenceFields } = await importUtils(
  "lib/learning-supabase/practice-grade-resolution.js"
);
const { buildInsightPacketFromV2Snapshot } = await importUtils(
  "utils/parent-report-insights/build-packet-from-v2-snapshot.js"
);
const { buildAiNarrativeInput } = await importUtils("utils/parent-report-insights/build-ai-narrative-input.js");

const syntheticAgg = {
  student: { id: "s1", full_name: "Test", grade_level: "g4", is_active: true },
  range: { from: "2026-05-01", to: "2026-05-07" },
  summary: {
    totalAnswers: 4,
    correctAnswers: 1,
    wrongAnswers: 3,
    registeredGradeLevel: "g4",
  },
  subjects: {
    math: {
      answers: 4,
      correct: 1,
      wrong: 3,
      topics: {
        fractions: {
          answers: 4,
          correct: 1,
          wrong: 3,
          byContentGrade: {
            g4: {
              answers: 2,
              correct: 1,
              wrong: 1,
              contentGradeLevel: "g4",
              registeredGradeLevel: "g4",
              gradeRelation: "same",
            },
            g5: {
              answers: 2,
              correct: 0,
              wrong: 2,
              contentGradeLevel: "g5",
              registeredGradeLevel: "g4",
              gradeRelation: "higher",
            },
          },
        },
      },
    },
  },
};

const dbInput = buildReportInputFromDbData(syntheticAgg);
const topicKeys = Object.keys(dbInput.subjects.math.topics);
assert.equal(topicKeys.length, 2, "adapter must emit two grade-scoped topic rows");
assert.ok(topicKeys.some((k) => k.includes(`${REPORT_TOPIC_GRADE_SEP}g4`)));
assert.ok(topicKeys.some((k) => k.includes(`${REPORT_TOPIC_GRADE_SEP}g5`)));

const store = new Map();
seedLocalStorageFromDbReportInput(store, dbInput);
const tracking = JSON.parse(store.get("mleo_time_tracking"));
const fracSessions = tracking.operations.fractions.sessions;
assert.equal(fracSessions.length, 2, "seed must keep two sessions with distinct grades");
assert.deepEqual(
  fracSessions.map((s) => s.grade).sort(),
  ["g4", "g5"]
);

const legacyOnly = resolveContentGradeFromAnswerPayload(
  { subject: "math", topic: "fractions", gradeLevel: "g4", registeredGradeLevel: "g4" },
  {},
  "g4"
);
assert.equal(legacyOnly, null, "legacy gradeLevel matching registered must not count as content grade");

const lowerEvidence = buildGradeEvidenceFields("g4", "g3");
assert.equal(lowerEvidence.gradeRelation, "lower");
assert.equal(lowerEvidence.gradeDelta, -1);

const v2Snap = {
  playerName: "Test",
  registeredGradeKey: "g4",
  gradePracticeMeta: {
    mixedGradePractice: true,
    mixedGradePracticeNoteHe: "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד.",
  },
  summary: { mathQuestions: 9, mathCorrect: 5, mathAccuracy: 56, totalQuestions: 9, overallAccuracy: 56 },
  mathOperations: {
    "fractions::grade:g4": {
      bucketKey: "fractions",
      displayName: "שברים",
      questions: 5,
      correct: 4,
      accuracy: 80,
      gradeKey: "g4",
      registeredGradeKey: "g4",
      contentGradeKey: "g4",
      gradeRelation: "same",
    },
    "fractions::grade:g5": {
      bucketKey: "fractions",
      displayName: "שברים",
      questions: 4,
      correct: 1,
      accuracy: 25,
      gradeKey: "g5",
      registeredGradeKey: "g4",
      contentGradeKey: "g5",
      gradeRelation: "higher",
    },
  },
  geometryTopics: {},
  englishTopics: {},
  scienceTopics: {},
  hebrewTopics: {},
  moledetGeographyTopics: {},
};

const packet = buildInsightPacketFromV2Snapshot(v2Snap);
assert.equal(packet.mixedGradePractice, true);
assert.ok(Array.isArray(packet.gradePracticeBreakdown) && packet.gradePracticeBreakdown.length >= 2);
const aiIn = buildAiNarrativeInput(packet);
assert.equal(aiIn.mixedGradePractice, true);
assert.ok(aiIn.gradePracticeBreakdown.length >= 2);

process.stdout.write("OK parent-report-grade-scope-selftest\n");
