/**
 * Verification-only: end-to-end mixed-grade path (aggregate → adapter → V2 → insight).
 * Run: npx tsx scripts/parent-report-grade-e2e-verify.mjs
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const importUtils = async (rel) => {
  const m = await import(pathToFileURL(join(ROOT, "..", rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
};

const { aggregateParentReportPayload } = await importUtils("lib/parent-server/report-data-aggregate.server.js");
const { buildReportInputFromDbData } = await importUtils("lib/learning-supabase/report-data-adapter.js");
const { seedLocalStorageFromDbReportInput } = await importUtils("lib/learning-supabase/seed-db-report-local-storage.js");
const { buildInsightPacketFromV2Snapshot } = await importUtils(
  "utils/parent-report-insights/build-packet-from-v2-snapshot.js"
);
const { resolveContentGradeFromAnswerPayload } = await importUtils(
  "lib/learning-supabase/practice-grade-resolution.js"
);
const { buildStrictParentReportAIInputFromParentReportV2 } = await importUtils(
  "utils/parent-report-ai/parent-report-ai-adapter.js"
);
const { buildAiNarrativeInput } = await importUtils("utils/parent-report-insights/build-ai-narrative-input.js");
const { runDiagnosticEngineV2 } = await importUtils("utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js");

const student = {
  id: "00000000-0000-4000-8000-000000000001",
  full_name: "Verify",
  grade_level: "g4",
  is_active: true,
};

function supabaseMock({ sessions, answers }) {
  return {
    from(table) {
      const ctx = { _table: table };
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        gte() {
          return chain;
        },
        lt() {
          return chain;
        },
        order() {
          if (ctx._table === "learning_sessions") {
            return Promise.resolve({ data: sessions, error: null });
          }
          return Promise.resolve({ data: answers, error: null });
        },
      };
      return chain;
    },
  };
}

const sessions = [
  {
    id: "s-g4",
    student_id: student.id,
    subject: "math",
    topic: "fractions",
    started_at: "2026-05-10T10:00:00.000Z",
    duration_seconds: 60,
    status: "completed",
    metadata: { contentGradeLevel: "g4", registeredGradeLevel: "g4", gradeRelation: "same", mode: "learning" },
  },
  {
    id: "s-g5",
    student_id: student.id,
    subject: "math",
    topic: "fractions",
    started_at: "2026-05-11T10:00:00.000Z",
    duration_seconds: 60,
    status: "completed",
    metadata: { contentGradeLevel: "g5", registeredGradeLevel: "g4", gradeRelation: "higher", mode: "learning" },
  },
];

const answers = [
  {
    id: "a0",
    student_id: student.id,
    learning_session_id: "s-g4",
    question_id: "q0",
    is_correct: true,
    answer_payload: {
      subject: "math",
      topic: "fractions",
      contentGradeLevel: "g4",
      registeredGradeLevel: "g4",
      gradeRelation: "same",
    },
    answered_at: "2026-05-10T12:00:00.000Z",
  },
  {
    id: "a1",
    student_id: student.id,
    learning_session_id: "s-g4",
    question_id: "q1",
    is_correct: false,
    answer_payload: {
      subject: "math",
      topic: "fractions",
      contentGradeLevel: "g4",
      registeredGradeLevel: "g4",
      gradeRelation: "same",
    },
    answered_at: "2026-05-10T12:01:00.000Z",
  },
  {
    id: "a2",
    student_id: student.id,
    learning_session_id: "s-g5",
    question_id: "q2",
    is_correct: false,
    answer_payload: {
      subject: "math",
      topic: "fractions",
      contentGradeLevel: "g5",
      registeredGradeLevel: "g4",
      gradeRelation: "higher",
    },
    answered_at: "2026-05-11T12:00:00.000Z",
  },
  {
    id: "a3",
    student_id: student.id,
    learning_session_id: "s-g5",
    question_id: "q3",
    is_correct: false,
    answer_payload: {
      subject: "math",
      topic: "fractions",
      contentGradeLevel: "g5",
      registeredGradeLevel: "g4",
      gradeRelation: "higher",
    },
    answered_at: "2026-05-11T12:01:00.000Z",
  },
];

const from = new Date("2026-05-01T00:00:00.000Z");
const to = new Date("2026-05-14T00:00:00.000Z");
const agg = await aggregateParentReportPayload(supabaseMock({ sessions, answers }), student, from, to);

const frac = agg.subjects.math.topics.fractions;
assert.equal(Object.keys(frac.byContentGrade).length, 2, "aggregate: two content grades");
assert.equal(frac.byContentGrade.g4.answers, 2);
assert.equal(frac.byContentGrade.g5.answers, 2);
assert.equal(frac.byContentGrade.g5.gradeRelation, "higher");

const db = buildReportInputFromDbData(agg);
const topicKeys = Object.keys(db.subjects.math.topics);
assert.equal(topicKeys.length, 2, "adapter: two topic keys");

const store = new Map();
seedLocalStorageFromDbReportInput(store, db);
const tracking = JSON.parse(store.get("mleo_time_tracking"));
assert.equal(tracking.operations.fractions.sessions.length, 2);
assert.deepEqual(
  tracking.operations.fractions.sessions.map((s) => s.grade).sort(),
  ["g4", "g5"]
);

const { generateParentReportV2 } = await importUtils("utils/parent-report-v2.js");
globalThis.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.window = globalThis;

const base = generateParentReportV2("Verify", "custom", "2026-05-01", "2026-05-14");
const opKeys = Object.keys(base.mathOperations);
assert.equal(opKeys.length, 2, "V2 table: two math rows");
assert.ok(opKeys.some((k) => k.includes("g4")));
assert.ok(opKeys.some((k) => k.includes("g5")));
assert.equal(base.registeredGradeKey, "g4");
assert.equal(base.gradePracticeMeta?.mixedGradePractice, true);

const { buildDetailedParentReportFromBaseReport } = await importUtils("utils/detailed-parent-report.js");
const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
assert.equal(detailed?.gradePracticeMeta?.mixedGradePractice, true);

const pkt = buildInsightPacketFromV2Snapshot(base);
assert.equal(pkt.mixedGradePractice, true);
assert.ok(pkt.gradePracticeBreakdown.length >= 2);

const aiStrict = buildStrictParentReportAIInputFromParentReportV2(base);
assert.ok(aiStrict, "strict AI input");
assert.equal(aiStrict.grade, "g4");
// buildStrictParentReportAIInput allowlist does not forward grade breakdown (known Copilot/summary gap).

const aiNarr = buildAiNarrativeInput(pkt);
assert.equal(aiNarr.mixedGradePractice, true);
assert.ok(aiNarr.gradePracticeBreakdown.length >= 2);

const de = runDiagnosticEngineV2({
  maps: { math: base.mathOperations },
  rawMistakesBySubject: { math: [] },
  startMs: 0,
  endMs: Date.now(),
});
const g4Unit = de.units.find((u) => u.gradeEvidence?.contentGradeKey === "g4");
const g5Unit = de.units.find((u) => u.gradeEvidence?.contentGradeKey === "g5");
assert.equal(g4Unit?.gradeEvidence?.evidenceScope, "registered_grade_primary");
assert.equal(g5Unit?.gradeEvidence?.evidenceScope, "enrichment_stretch");

// lower g3
const aggLow = await aggregateParentReportPayload(
  supabaseMock({
    sessions: [
      {
        id: "s3",
        student_id: student.id,
        subject: "math",
        topic: "fractions",
        started_at: "2026-05-10T10:00:00.000Z",
        duration_seconds: 30,
        status: "completed",
        metadata: { contentGradeLevel: "g3", registeredGradeLevel: "g4", gradeRelation: "lower" },
      },
    ],
    answers: [
      {
        id: "x0",
        student_id: student.id,
        learning_session_id: "s3",
        question_id: "qx",
        is_correct: true,
        answer_payload: {
          subject: "math",
          topic: "fractions",
          contentGradeLevel: "g3",
          registeredGradeLevel: "g4",
          gradeRelation: "lower",
        },
        answered_at: "2026-05-10T12:00:00.000Z",
      },
    ],
  }),
  student,
  from,
  to
);
assert.equal(aggLow.subjects.math.topics.fractions.byContentGrade.g3.gradeRelation, "lower");

// unknown legacy
assert.equal(
  resolveContentGradeFromAnswerPayload({ gradeLevel: "g4", registeredGradeLevel: "g4" }, {}, "g4"),
  null
);
const aggUnknown = await aggregateParentReportPayload(
  supabaseMock({
    sessions: [],
    answers: [
      {
        id: "u0",
        student_id: student.id,
        learning_session_id: null,
        question_id: "qu",
        is_correct: true,
        answer_payload: { subject: "math", topic: "fractions", gradeLevel: "g4" },
        answered_at: "2026-05-10T12:00:00.000Z",
      },
    ],
  }),
  student,
  from,
  to
);
assert.ok(aggUnknown.subjects.math.topics.fractions.byContentGrade.unknown);
assert.equal(aggUnknown.subjects.math.topics.fractions.byContentGrade.g4?.answers || 0, 0);

console.log("OK parent-report-grade-e2e-verify");
