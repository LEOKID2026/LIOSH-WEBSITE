import { defaultTopicForSubject } from "../../../virtual-student-qa/scenarios/student-personas.mjs";
import { enrichMetadataFromTaxonomy } from "../../../../utils/diagnostic-engine-v2/topic-taxonomy-metadata-enrichment.js";
import { taxonomyIdsForReportBucket } from "../../../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { normalizeDiagnosticSubjectId } from "../../../../utils/diagnostic-evidence.js";
import { SEED_META_KEY } from "./constants.mjs";

export const SPEED_COHORT_PATCH_TAG = "speed_pressure_cohort";

function isRunTagged(row, runId) {
  const payload = row?.answer_payload;
  const meta = row?.learning_sessions?.metadata;
  return (
    payload?.clientMeta?.[SEED_META_KEY] === runId ||
    payload?.params?.clientMeta?.[SEED_META_KEY] === runId ||
    meta?.[SEED_META_KEY] === runId
  );
}

function isSpeedCohortSession(meta) {
  const patch = meta?.patch;
  return patch === SPEED_COHORT_PATCH_TAG || patch === "speed_mode_shell";
}

/**
 * Pick the curriculum topic V2 is most likely to emit — highest wrong-answer volume
 * from regular seed (exclude speed-pressure cohort shells/sessions).
 */
export async function resolveDominantCurriculumTopicFromSeed(supabase, studentId, subject, runId) {
  const { data: rows, error } = await supabase
    .from("answers")
    .select("is_correct, answer_payload, learning_sessions!inner(topic, subject, metadata)")
    .eq("student_id", studentId)
    .eq("learning_sessions.subject", subject);
  if (error) throw new Error(`dominant topic query: ${error.message}`);

  /** @type {Map<string, { total: number, wrong: number }>} */
  const byTopic = new Map();
  for (const row of rows || []) {
    if (!isRunTagged(row, runId)) continue;
    const meta = row.learning_sessions?.metadata;
    if (isSpeedCohortSession(meta)) continue;
    const topic = row.learning_sessions?.topic || row.answer_payload?.topic || "general";
    const stats = byTopic.get(topic) || { total: 0, wrong: 0 };
    stats.total += 1;
    if (!row.is_correct) stats.wrong += 1;
    byTopic.set(topic, stats);
  }

  let bestTopic = null;
  let bestWrong = -1;
  let bestTotal = -1;
  for (const [topic, stats] of byTopic) {
    if (stats.wrong > bestWrong || (stats.wrong === bestWrong && stats.total > bestTotal)) {
      bestTopic = topic;
      bestWrong = stats.wrong;
      bestTotal = stats.total;
    }
  }
  return bestTopic;
}

/**
 * Topic with the least regular-seed answers — cohort dominates stats (matches isolated probe PASS).
 * Prefer topics with some activity so V2 can emit a row after cohort patch.
 */
export async function resolveLightestCurriculumTopicFromSeed(supabase, studentId, subject, runId) {
  const { data: rows, error } = await supabase
    .from("answers")
    .select("answer_payload, learning_sessions!inner(topic, subject, metadata)")
    .eq("student_id", studentId)
    .eq("learning_sessions.subject", subject);
  if (error) throw new Error(`lightest topic query: ${error.message}`);

  /** @type {Map<string, number>} */
  const byTopic = new Map();
  for (const row of rows || []) {
    if (!isRunTagged(row, runId)) continue;
    const meta = row.learning_sessions?.metadata;
    if (isSpeedCohortSession(meta)) continue;
    const topic = row.learning_sessions?.topic || row.answer_payload?.topic || "general";
    byTopic.set(topic, (byTopic.get(topic) || 0) + 1);
  }

  let lightest = null;
  let lightestCount = Infinity;
  for (const [topic, count] of byTopic) {
    if (count < lightestCount) {
      lightest = topic;
      lightestCount = count;
    }
  }
  return lightest;
}

/** Practice answers already on topic before speed cohort (excludes cohort patch/shells). */
export async function countTopicPracticeAnswersBeforeCohort(supabase, studentId, subject, topic, runId) {
  const { data: rows, error } = await supabase
    .from("answers")
    .select("is_correct, answer_payload, learning_sessions!inner(topic, subject, metadata)")
    .eq("student_id", studentId)
    .eq("learning_sessions.subject", subject)
    .eq("learning_sessions.topic", topic);
  if (error) throw new Error(`topic practice count: ${error.message}`);

  let count = 0;
  for (const row of rows || []) {
    if (!isRunTagged(row, runId)) continue;
    const meta = row.learning_sessions?.metadata;
    if (isSpeedCohortSession(meta)) continue;
    count += 1;
  }
  return count;
}

function buildCurriculumTarget(student, topic) {
  const subject = student.primarySubject || "math";
  const grade = student.grade;
  const subjectId = normalizeDiagnosticSubjectId(subject);
  const enriched = enrichMetadataFromTaxonomy({
    subjectId,
    topic,
    contentGradeKey: `g${grade}`,
    source: { params: { kind: "facts" } },
    baseMeta: {
      metadataSource: "mass_virtual_students_speed_cohort",
    },
  });
  const taxonomyIds = taxonomyIdsForReportBucket(subjectId, topic);
  return {
    subject,
    topic,
    grade,
    subjectId,
    taxonomy: {
      skillId: enriched.skillId || taxonomyIds[0] || null,
      subskillId: enriched.subskillId || enriched.subSkill || taxonomyIds[0] || null,
      patternFamily: enriched.patternFamily || null,
      taxonomyId: enriched.taxonomyId || taxonomyIds[0] || null,
      taxonomyIds,
      taxonomyMissing: enriched.taxonomyMissing ?? taxonomyIds.length === 0,
    },
  };
}

/**
 * Single aligned curriculum topic for speed-pressure cohort — same key for seed, probe, aggregate, V2.
 * Uses defaultTopicForSubject so V2 already emits a row for this topic from regular activity seed.
 */
export function resolveAlignedSpeedPressureTopic(student, topicOverride) {
  const subject = student.primarySubject || "math";
  const topic =
    topicOverride ||
    student.speedPressureTopic ||
    student.defaultTopic?.[subject] ||
    defaultTopicForSubject(subject, student.grade);
  return {
    ...buildCurriculumTarget(student, topic),
    topicSource: "defaultTopicForSubject",
  };
}

/**
 * @deprecated Prefer resolveAlignedSpeedPressureTopic — kept for callers that pass explicit override.
 */
export function resolveSpeedPressureCurriculumTarget(student, topicOverride) {
  return resolveAlignedSpeedPressureTopic(student, topicOverride);
}

export async function resolveSpeedPressureCurriculumTargetFromSeed(supabase, student, runId) {
  return resolveAlignedSpeedPressureTopic(student);
}
