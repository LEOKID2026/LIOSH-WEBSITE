/**
 * Parent-report activity timestamp pipeline — regression checks.
 * Run: npx tsx scripts/parent-report-activity-time-selftest.mjs
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

const {
  bumpActivityFromLearningSession,
  bumpActivityTimestamp,
  createEmptyActivityTimestamps,
  formatParentReportActivityIsrael,
  parseActivityTimestampMs,
  reportRangeBoundsMs,
  reconcileLatestActivityToReportRange,
  activityMsInReportRange,
} = await importUtils("lib/learning-supabase/parent-report-activity-time.js");
const { buildReportInputFromDbData, REPORT_TOPIC_GRADE_SEP } = await importUtils(
  "lib/learning-supabase/report-data-adapter.js"
);
const { seedLocalStorageFromDbReportInput } = await importUtils(
  "lib/learning-supabase/seed-db-report-local-storage.js"
);
const { collapseTopicRowsToCanonicalTopicEntityForTests } = await importUtils("utils/parent-report-v2.js");

const OLD_MS = Date.UTC(2026, 4, 14, 12, 0, 0);
const NEW_MS = Date.UTC(2026, 4, 18, 15, 0, 0);
const OLD_ISO = new Date(OLD_MS).toISOString();
const NEW_ISO = new Date(NEW_MS).toISOString();

// Latest answer wins over older session end.
{
  const bucket = createEmptyActivityTimestamps();
  bumpActivityFromLearningSession(bucket, {
    started_at: OLD_ISO,
    ended_at: OLD_ISO,
  });
  bumpActivityTimestamp(bucket, {
    iso: NEW_ISO,
    source: "answer.answered_at",
    kind: "answer",
  });
  assert.equal(bucket.latestActivityMs, NEW_MS);
  assert.equal(bucket.latestActivitySource, "answer.answered_at");
  assert.equal(bucket.lastAnswerMs, NEW_MS);
}

// finished_at when no answers.
{
  const bucket = createEmptyActivityTimestamps();
  bumpActivityFromLearningSession(bucket, {
    started_at: OLD_ISO,
    ended_at: NEW_ISO,
  });
  assert.equal(bucket.latestActivityMs, NEW_MS);
  assert.equal(bucket.latestActivitySource, "session.ended_at");
  assert.equal(bucket.lastAnswerMs, null);
}

// Period-scoped aggregation: ignore session updated_at outside report window.
{
  const MARCH_MS = Date.UTC(2026, 2, 29, 6, 15, 40);
  const MARCH_ISO = new Date(MARCH_MS).toISOString();
  const JUNE_MS = Date.UTC(2026, 5, 15, 12, 47, 44);
  const JUNE_ISO = new Date(JUNE_MS).toISOString();
  const range = reportRangeBoundsMs(
    new Date("2026-03-01T00:00:00.000Z"),
    new Date("2026-03-31T00:00:00.000Z")
  );
  const bucket = createEmptyActivityTimestamps();
  bumpActivityFromLearningSession(
    bucket,
    {
      started_at: MARCH_ISO,
      ended_at: MARCH_ISO,
      updated_at: JUNE_ISO,
    },
    range
  );
  bumpActivityTimestamp(bucket, {
    ms: MARCH_MS,
    source: "answer.answered_at",
    kind: "answer",
  });
  reconcileLatestActivityToReportRange(bucket, range);
  assert.equal(bucket.latestActivityMs, MARCH_MS);
  assert.ok(activityMsInReportRange(bucket.latestActivityMs, range));
}

// UTC 15:00 → Israel 18:00 (May DST, Asia/Jerusalem).
{
  const label = formatParentReportActivityIsrael(NEW_MS);
  assert.match(label, /18\/05\/2026 18:00/, `expected Israel local time, got ${label}`);
}

// Adapter + seed: real latestActivityAt, not report-range midpoint.
{
  const rangeMidMs = Math.floor(
    (new Date("2026-05-01T00:00:00.000Z").getTime() + new Date("2026-05-07T23:59:59.999Z").getTime()) / 2
  );
  const syntheticAgg = {
    student: { id: "s1", full_name: "Test", grade_level: "g4", is_active: true },
    range: { from: "2026-05-01", to: "2026-05-18" },
    summary: { totalAnswers: 2, correctAnswers: 1, wrongAnswers: 1, registeredGradeLevel: "g4" },
    subjects: {
      math: {
        answers: 2,
        correct: 1,
        wrong: 1,
        latestActivityMs: NEW_MS,
        latestActivityAt: NEW_ISO,
        latestActivitySource: "answer.answered_at",
        topics: {
          fractions: {
            answers: 2,
            correct: 1,
            wrong: 1,
            latestActivityMs: NEW_MS,
            latestActivityAt: NEW_ISO,
            latestActivitySource: "answer.answered_at",
            byContentGrade: {
              g4: {
                answers: 2,
                correct: 1,
                wrong: 1,
                contentGradeLevel: "g4",
                registeredGradeLevel: "g4",
                gradeRelation: "same",
                latestActivityMs: NEW_MS,
                latestActivityAt: NEW_ISO,
                latestActivitySource: "answer.answered_at",
                lastAnswerMs: NEW_MS,
                lastAnswerAt: NEW_ISO,
              },
            },
          },
        },
      },
    },
  };

  const dbInput = buildReportInputFromDbData(syntheticAgg);
  const topicKey = `fractions${REPORT_TOPIC_GRADE_SEP}g4`;
  assert.equal(parseActivityTimestampMs(dbInput.subjects.math.topics[topicKey].latestActivityMs), NEW_MS);

  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  const tracking = JSON.parse(store.get("mleo_time_tracking"));
  const sessions = tracking.operations.fractions.sessions;
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].timestamp, NEW_MS);
  assert.notEqual(sessions[0].timestamp, rangeMidMs, "seed must not use report-range midpoint");
}

// Mixed-grade rows keep separate latestActivityAt.
{
  const g4Ms = OLD_MS;
  const g5Ms = NEW_MS;
  const syntheticAgg = {
    student: { id: "s1", full_name: "Test", grade_level: "g4", is_active: true },
    range: { from: "2026-05-01", to: "2026-05-18" },
    summary: { totalAnswers: 4, correctAnswers: 2, wrongAnswers: 2, registeredGradeLevel: "g4" },
    subjects: {
      math: {
        answers: 4,
        topics: {
          fractions: {
            answers: 4,
            byContentGrade: {
              g4: {
                answers: 2,
                correct: 1,
                wrong: 1,
                contentGradeLevel: "g4",
                latestActivityMs: g4Ms,
                latestActivityAt: new Date(g4Ms).toISOString(),
                latestActivitySource: "session.ended_at",
              },
              g5: {
                answers: 2,
                correct: 1,
                wrong: 1,
                contentGradeLevel: "g5",
                latestActivityMs: g5Ms,
                latestActivityAt: new Date(g5Ms).toISOString(),
                latestActivitySource: "answer.answered_at",
              },
            },
          },
        },
      },
    },
  };
  const dbInput = buildReportInputFromDbData(syntheticAgg);
  const k4 = `fractions${REPORT_TOPIC_GRADE_SEP}g4`;
  const k5 = `fractions${REPORT_TOPIC_GRADE_SEP}g5`;
  assert.equal(parseActivityTimestampMs(dbInput.subjects.math.topics[k4].latestActivityMs), g4Ms);
  assert.equal(parseActivityTimestampMs(dbInput.subjects.math.topics[k5].latestActivityMs), g5Ms);

  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  const tracking = JSON.parse(store.get("mleo_time_tracking"));
  const byGrade = Object.fromEntries(
    tracking.operations.fractions.sessions.map((s) => [s.grade, s.timestamp])
  );
  assert.equal(byGrade.g4, g4Ms);
  assert.equal(byGrade.g5, g5Ms);
}

// Classroom-only topic rows (answers, no activity timestamps) seed with range end so v2 counts them.
{
  const rangeTo = "2026-05-18";
  const rangeEndMs = parseActivityTimestampMs(`${rangeTo}T23:59:59.999Z`);
  const syntheticAgg = {
    student: { id: "s-classroom", full_name: "ClassroomOnly", grade_level: "g4", is_active: true },
    range: { from: "2026-05-01", to: rangeTo },
    summary: { totalAnswers: 12, correctAnswers: 8, wrongAnswers: 4, registeredGradeLevel: "g4" },
    subjects: {
      math: {
        answers: 12,
        topics: {
          fractions: {
            answers: 12,
            correct: 8,
            wrong: 4,
            latestActivitySource: "classroom_activity",
          },
        },
      },
    },
  };
  const dbInput = buildReportInputFromDbData(syntheticAgg);
  const topic =
    dbInput.subjects.math.topics[`fractions${REPORT_TOPIC_GRADE_SEP}g4`] ||
    dbInput.subjects.math.topics.fractions;
  assert.ok(topic, "adapter builds classroom topic row");
  assert.equal(topic.total, 12);
  assert.equal(parseActivityTimestampMs(topic.lastAnswerAt), null);

  const store = new Map();
  seedLocalStorageFromDbReportInput(store, dbInput);
  const tracking = JSON.parse(store.get("mleo_time_tracking"));
  const sessions = tracking.operations.fractions.sessions;
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].timestamp, rangeEndMs);
  assert.equal(sessions[0].total, 12);
}

// Collapse merges mode variants but keeps max activity time.
{
  const collapsed = collapseTopicRowsToCanonicalTopicEntityForTests("math", {
    "fractions::mode:learning::g4::easy": {
      bucketKey: "fractions",
      gradeKey: "g4",
      questions: 3,
      correct: 2,
      lastSessionMs: OLD_MS,
      lastSessionAt: formatParentReportActivityIsrael(OLD_MS),
    },
    "fractions::mode:practice::g4::medium": {
      bucketKey: "fractions",
      gradeKey: "g4",
      questions: 2,
      correct: 1,
      lastSessionMs: NEW_MS,
      lastSessionAt: formatParentReportActivityIsrael(NEW_MS),
      latestActivitySource: "answer.answered_at",
    },
  });
  const row = collapsed["fractions::grade:g4"];
  assert.equal(row.lastSessionMs, NEW_MS);
  assert.match(String(row.latestActivityAt), /18\/05\/2026 18:00/);
}

process.stdout.write("OK parent-report-activity-time-selftest\n");
