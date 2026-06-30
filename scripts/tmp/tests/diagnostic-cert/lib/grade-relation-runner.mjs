/**
 * Grade-relation cert helpers — aggregate → V2 → DE2/V3 (no grade blocking gate).
 */

import { aggregateReportPayloadFromActivityRows } from "../../../../../lib/parent-server/report-data-aggregate.server.js";
import { buildReportInputFromDbData } from "../../../../../lib/learning-supabase/report-data-adapter.js";
import { splitMoledetGeographyReportForDisplay, topicBucketBelongsToVisualStrand, VISUAL_STRAND_GEOGRAPHY, VISUAL_STRAND_MOLEDET } from "../../../../../lib/learning-shared/moledet-geography-display.js";
import { parseCanonicalTopicFromRowKey } from "../../../../../utils/parent-report-output-integrity/row-identity-v1.js";
import { gradeRelationSublineFromRelation } from "../../../../../utils/parent-report-output-integrity/row-display-label-context.js";
import { gradeScopeMeaningHe, evidenceScopeFromRelation } from "../../../../../utils/parent-report-language/grade-insight-he.js";
import { runDiagnosticEngineV2 } from "../../../../../utils/diagnostic-engine-v2/index.js";
import { runDiagnosticEngineV3 } from "../../../../../utils/diagnostic-engine-v3/index.js";
import { buildParentReportV2FromAggregate } from "../../../../qa/lib/mass-virtual-students/report-v2-bridge.mjs";

export const GRADE_AGG_FROM = new Date("2026-03-01T00:00:00.000Z");
export const GRADE_AGG_TO = new Date("2026-03-31T00:00:00.000Z");
export const GRADE_AGG_META = { sessionsFilterField: "started_at", answersFilterField: "answered_at" };

/** User-facing relation aliases → engine values */
export const RELATION_ALIASES = Object.freeze({
  below_registered_grade: ["lower"],
  above_registered_grade: ["higher"],
  outside_regular_grade_band: ["higher", "unknown"],
  same_registered_grade: ["same"],
});

/**
 * @param {string} relationAlias
 * @param {string|null|undefined} actual
 */
export function relationMatchesAlias(relationAlias, actual) {
  const allowed = RELATION_ALIASES[relationAlias] || [relationAlias];
  return allowed.includes(String(actual || "").trim());
}

/**
 * @param {{ id: string, full_name?: string, grade_level: string }} student
 * @param {object} opts
 */
export function buildPracticeSessionAndAnswers(student, opts) {
  const {
    subject,
    topic,
    contentGrade,
    total = 12,
    correct = 6,
    mode = "practice",
    sessionId = `sess-${subject}-${topic}-${contentGrade}`,
  } = opts;

  const session = {
    id: sessionId,
    student_id: student.id,
    subject: subject === "moledet-geography" ? "moledet_geography" : subject,
    topic,
    started_at: "2026-03-10T10:00:00Z",
    created_at: "2026-03-10T10:00:00Z",
    ended_at: "2026-03-10T10:45:00Z",
    duration_seconds: 900,
    status: "completed",
    metadata: {
      mode,
      contentGradeLevel: contentGrade,
      practiceGradeLevel: contentGrade,
    },
  };

  const answers = Array.from({ length: total }, (_, i) => ({
    id: `ans-${sessionId}-${i}`,
    student_id: student.id,
    learning_session_id: sessionId,
    question_id: `q-${i}`,
    is_correct: i < correct,
    answered_at: `2026-03-10T10:${String(5 + i).padStart(2, "0")}:00Z`,
    created_at: `2026-03-10T10:${String(5 + i).padStart(2, "0")}:00Z`,
    answer_payload: {
      subject: session.subject,
      topic,
      gameMode: mode,
      mode,
      contentGradeLevel: contentGrade,
      practiceGradeLevel: contentGrade,
      gradeLevel: contentGrade,
      isDiagnosticEligible: true,
      evidenceCategory: "diagnostic_independent",
      contextFlags: { afterStepByStep: false, contextAfterBookReading: false, hasHints: false },
      responseMs: 15000,
    },
  }));

  return { session, answers };
}

/**
 * @param {object} student
 * @param {object} opts
 */
export async function runGradeRelationScenario(student, opts) {
  const { session, answers } = buildPracticeSessionAndAnswers(student, opts);
  const agg = aggregateReportPayloadFromActivityRows(
    student,
    [session],
    answers,
    GRADE_AGG_FROM,
    GRADE_AGG_TO,
    GRADE_AGG_META,
  );

  const subjectKey = opts.subject === "moledet-geography" ? "moledet_geography" : opts.subject;
  const topicAgg = agg?.subjects?.[subjectKey]?.topics?.[opts.topic];
  const gradeSlice = topicAgg?.byContentGrade?.[opts.contentGrade] || null;

  const v2 = await buildParentReportV2FromAggregate(agg, {
    studentName: student.full_name,
    fromDate: GRADE_AGG_FROM,
    toDate: GRADE_AGG_TO,
  });

  const mapKey =
    opts.subject === "math"
      ? "mathOperations"
      : opts.subject === "history"
        ? "historyTopics"
        : opts.subject === "moledet-geography" || subjectKey === "moledet_geography"
          ? "moledetGeographyTopics"
          : `${opts.subject}Topics`;

  const topicMap = v2?.[mapKey] || {};
  const topicRow = Object.entries(topicMap).find(([k, r]) => {
    const bk = String(r?.bucketKey || k).split("\u0001")[0];
    return bk === opts.topic || k.includes(opts.topic);
  });

  const de2 = v2?.diagnosticEngineV2 || runDiagnosticEngineV2({
    maps: { [opts.subject === "moledet_geography" ? "moledet-geography" : opts.subject]: topicMap },
    rawMistakesBySubject: buildMistakesFromDbInput(
      buildReportInputFromDbData(agg, { period: "custom", timezone: "UTC" }),
      subjectKey,
    ),
    startMs: GRADE_AGG_FROM.getTime(),
    endMs: GRADE_AGG_TO.getTime(),
  });

  const unit =
    (Array.isArray(de2?.units) ? de2.units : []).find(
      (u) => String(u.topicKey || u.topicRowKey || "").includes(opts.topic) || u.subjectId === opts.subject,
    ) || de2?.units?.[0] || null;

  const dbInput = buildReportInputFromDbData(agg, { period: "custom", timezone: "UTC" });
  const rawMistakes = buildMistakesFromDbInput(dbInput, subjectKey);
  const engineSubject = subjectKey === "moledet_geography" ? "moledet-geography" : opts.subject;
  const maps = { [engineSubject]: topicMap };

  const v3 = runDiagnosticEngineV3({
    maps,
    rawMistakesBySubject: { [engineSubject]: rawMistakes },
    startMs: GRADE_AGG_FROM.getTime(),
    endMs: GRADE_AGG_TO.getTime(),
    diagnosticEngineV2: de2,
  });

  const rollups = v3.rollupsBySubject?.[engineSubject] || [];
  const relation = gradeSlice?.gradeRelation || unit?.gradeEvidence?.gradeRelation || topicRow?.[1]?.gradeRelation || null;
  const scope =
    unit?.gradeEvidence?.evidenceScope || evidenceScopeFromRelation(relation);
  const subline = gradeRelationSublineFromRelation(relation);
  const caveat = gradeScopeMeaningHe({
    gradeRelation: relation,
    evidenceScope: scope,
    isStrength: Number(gradeSlice?.accuracy ?? topicRow?.[1]?.accuracy) >= 85,
    needsSupport: Number(gradeSlice?.accuracy ?? topicRow?.[1]?.accuracy) < 70,
  });

  const mgSplit = resolveMoledetGeographyVisualSplit(v2);

  return {
    agg,
    v2,
    de2,
    v3,
    gradeSlice,
    topicRow: topicRow?.[1] || null,
    topicRowKey: topicRow?.[0] || null,
    unit,
    rollups,
    relation,
    scope,
    subline,
    caveat,
    mgSplit,
    diagnosticAnswers: Number(agg?.subjects?.[subjectKey]?.diagnosticAnswers || 0),
  };
}

/**
 * @param {object} dbInput
 * @param {string} subjectKey
 */
function buildMistakesFromDbInput(dbInput, subjectKey) {
  const mistakes = dbInput?.subjects?.[subjectKey]?.mistakes;
  return Array.isArray(mistakes) ? mistakes : [];
}

/**
 * Visual strand split — supports grade-suffixed row keys (e.g. geography::grade:g5).
 * @param {object|null|undefined} v2
 */
function resolveMoledetGeographyVisualSplit(v2) {
  const map = v2?.moledetGeographyTopics;
  if (!map || typeof map !== "object") {
    return splitMoledetGeographyReportForDisplay(v2);
  }

  /** @type {Record<string, unknown>} */
  const moledetTopics = {};
  /** @type {Record<string, unknown>} */
  const geographyTopics = {};

  for (const [rowKey, row] of Object.entries(map)) {
    const parsed = parseCanonicalTopicFromRowKey(rowKey);
    const canon =
      parsed.canonicalTopicKey ||
      String(rowKey).split("::")[0].split("\u0001")[0].trim().toLowerCase();
    if (topicBucketBelongsToVisualStrand(canon, VISUAL_STRAND_MOLEDET, row)) {
      moledetTopics[rowKey] = row;
    }
    if (topicBucketBelongsToVisualStrand(canon, VISUAL_STRAND_GEOGRAPHY, row)) {
      geographyTopics[rowKey] = row;
    }
  }

  const moledetQuestions = Object.values(moledetTopics).reduce(
    (n, r) => n + (Number(r?.questions) || 0),
    0,
  );
  const geographyQuestions = Object.values(geographyTopics).reduce(
    (n, r) => n + (Number(r?.questions) || 0),
    0,
  );

  return {
    moledetTopics,
    geographyTopics,
    moledetStats: { questions: moledetQuestions },
    geographyStats: { questions: geographyQuestions },
  };
}

/**
 * @param {object} student
 * @param {object} opts — same as buildPracticeSessionAndAnswers + subject/topic/contentGrade
 */
export async function runHistoryGradeScenario(student, opts) {
  return runGradeRelationScenario(student, { ...opts, subject: "history" });
}

/**
 * @param {object} student
 * @param {object} opts
 */
export async function runMoledetGeographyScenario(student, opts) {
  return runGradeRelationScenario(student, {
    ...opts,
    subject: "moledet-geography",
  });
}
