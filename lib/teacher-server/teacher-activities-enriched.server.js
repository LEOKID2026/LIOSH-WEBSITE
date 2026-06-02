/**
 * Enriched activity report payload — server-side builder.
 * Extends buildActivityReportPayload with full question details,
 * per-student per-question responses, class info, teacher info,
 * and all-skills analytics.
 *
 * Used by /api/teacher/activities/[activityId]/report-export.
 * The same payload shape is designed for future PDF export with no server changes.
 */

import { isDbSchemaNotReadyError } from "./teacher-audit.server.js";
import { buildActivityReportPayload } from "./teacher-activities.server.js";
import { loadTeacherClassOwned } from "./teacher-classes.server.js";
import { loadTeacherProfileRow } from "./teacher-session.server.js";
import {
  extractFrozenQuestionChoices,
  formatFrozenCorrectAnswerForExport,
  formatFrozenSelectedAnswerForExport,
  mapFrozenQuestionDetail,
  mergeFrozenQuestionSources,
} from "../classroom-activities/frozen-activity-question.server.js";
import { activityExportSkillLabelHe } from "../teacher-portal/teacher-activity-report-export-labels.js";

/**
 * Aggregate all skills from raw attempts.
 * Returns every skill found (not only weak ones), sorted ascending by accuracy.
 *
 * @param {Array<{skill_key?: string|null, is_correct: boolean|null}>} attempts
 * @param {string|null|undefined} subject
 * @param {string|null|undefined} activityTopic
 * @param {string|number|null|undefined} [gradeLevel]
 * @returns {Array<Record<string, unknown>>}
 */
export function buildAllSkillsFromAttempts(attempts, subject, activityTopic, gradeLevel = null) {
  /** @type {Map<string, { answers: number, correct: number }>} */
  const skillMap = new Map();

  for (const a of attempts || []) {
    if (a.is_correct == null) continue;
    const key = a.skill_key || "general";
    const cur = skillMap.get(key) || { answers: 0, correct: 0 };
    cur.answers += 1;
    if (a.is_correct === true) cur.correct += 1;
    skillMap.set(key, cur);
  }

  /** @type {Array<Record<string, unknown>>} */
  const result = [];
  for (const [skillKey, stats] of skillMap.entries()) {
    const accuracyPct =
      stats.answers > 0
        ? Number(((stats.correct / stats.answers) * 100).toFixed(2))
        : 0;
    result.push({
      skillKey,
      skillLabelHe: activityExportSkillLabelHe(skillKey, {
        subject: String(subject || ""),
        topic: activityTopic != null ? String(activityTopic) : null,
        gradeLevel,
      }),
      accuracyPct,
      answers: stats.answers,
      correct: stats.correct,
      isWeak: accuracyPct < 60 && stats.answers >= 2,
    });
  }

  result.sort((a, b) => a.accuracyPct - b.accuracyPct);
  return result;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build the enriched activity report payload for export (Excel / future PDF).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceRole
 * @param {string} teacherId
 * @param {string} activityId
 */
export async function buildEnrichedActivityReportPayload(
  serviceRole,
  teacherId,
  activityId
) {
  const base = await buildActivityReportPayload(serviceRole, teacherId, activityId);
  if (!base.ok) return base;

  const actId = base.activity.activityId;
  const classId = base.activity.classId;
  const tId = base.activity.teacherId;
  const subject = base.activity.subject;
  const activityTopic = base.activity.topic;

  /** @type {string|null} */
  let reportGradeLevel = base.classInfo?.gradeLevel ?? null;
  if (reportGradeLevel == null && classId) {
    try {
      const classResult = await loadTeacherClassOwned(
        serviceRole,
        teacherId,
        classId,
        { allowArchived: true }
      );
      if (classResult.ok) {
        reportGradeLevel = classResult.row.grade_level ?? null;
      }
    } catch {
      // Grade unavailable — export skill labels fail closed for formula keys.
    }
  }

  const resolveSkillLabelHe = (skillKey, ctx) =>
    activityExportSkillLabelHe(skillKey, {
      ...ctx,
      gradeLevel: ctx?.gradeLevel ?? reportGradeLevel,
    });

  // ── Full question_set from classroom_activities ─────────────────────────────
  const { data: actRow, error: actErr } = await serviceRole
    .from("classroom_activities")
    .select("question_set")
    .eq("id", actId)
    .maybeSingle();

  if (actErr) {
    if (isDbSchemaNotReadyError(actErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  const questionSet = Array.isArray(actRow?.question_set) ? actRow.question_set : [];

  // ── All attempts for this activity ────────────────────────────────────────
  const { data: attempts, error: attErr } = await serviceRole
    .from("classroom_activity_attempts")
    .select(
      "student_id, question_index, skill_key, selected_answer, correct_answer, is_correct, answered_at, time_spent_ms, hints_used, explanation_viewed, question_snapshot"
    )
    .eq("activity_id", actId)
    .order("student_id", { ascending: true })
    .order("question_index", { ascending: true });

  if (attErr) {
    if (isDbSchemaNotReadyError(attErr)) {
      return { ok: false, status: 503, code: "db_schema_not_ready" };
    }
    return { ok: false, status: 500, code: "internal_error" };
  }

  // Merge attempt snapshots into question slots when they carry richer frozen data
  /** @type {Map<number, Record<string, unknown>>} */
  const snapshotByIndex = new Map();
  for (const a of attempts || []) {
    const idx = Number(a.question_index);
    if (!Number.isFinite(idx) || idx < 0) continue;
    if (a.question_snapshot && typeof a.question_snapshot === "object") {
      snapshotByIndex.set(idx, a.question_snapshot);
    }
  }

  const questions = questionSet.map((q, i) => {
    const merged = mergeFrozenQuestionSources(q, snapshotByIndex.get(i));
    return mapFrozenQuestionDetail(merged, i, {
      subject,
      topic: activityTopic,
      resolveSkillLabelHe,
    });
  });

  const studentNameMap = new Map(
    base.students.map((s) => [s.studentId, s.studentFullNameMasked])
  );

  const responses = (attempts || []).map((a) => {
    const qi = Number(a.question_index);
    const qDetail = questions[qi];
    const choices =
      extractFrozenQuestionChoices(qDetail) ||
      extractFrozenQuestionChoices(
        mergeFrozenQuestionSources(questionSet[qi], a.question_snapshot)
      );

    const correctRaw =
      a.correct_answer ?? qDetail?.correctAnswer ?? "";
    const selectedRaw = a.selected_answer ?? null;

    return {
      studentId: a.student_id,
      studentFullNameMasked: studentNameMap.get(a.student_id) || "",
      questionIndex: qi,
      selectedAnswer: selectedRaw,
      selectedAnswerDisplay: formatFrozenSelectedAnswerForExport(choices, selectedRaw),
      correctAnswer: correctRaw,
      correctAnswerDisplay: formatFrozenCorrectAnswerForExport(choices, correctRaw),
      isCorrect: a.is_correct ?? null,
      answeredAt: a.answered_at ?? null,
      timeSpentMs: a.time_spent_ms ?? null,
      hintsUsed: Number(a.hints_used) || 0,
      explanationViewed: a.explanation_viewed === true,
    };
  });

  // ── Class info (non-fatal) ────────────────────────────────────────────────
  /** @type {{ classId: string, className: string, gradeLevel: string|null, subjectFocus: string|null }|null} */
  let classInfo = null;
  try {
    const classResult = await loadTeacherClassOwned(
      serviceRole,
      teacherId,
      classId,
      { allowArchived: true }
    );
    if (classResult.ok) {
      classInfo = {
        classId: classResult.row.id,
        className: classResult.row.name,
        gradeLevel: classResult.row.grade_level ?? null,
        subjectFocus: classResult.row.subject_focus ?? null,
      };
    }
  } catch {
    // non-fatal
  }

  // ── Teacher info (non-fatal) ──────────────────────────────────────────────
  /** @type {{ teacherId: string, displayName: string|null }|null} */
  let teacherInfo = null;
  try {
    const profileResult = await loadTeacherProfileRow(serviceRole, tId);
    if (profileResult.ok && profileResult.profile) {
      teacherInfo = {
        teacherId: tId,
        displayName: profileResult.profile.display_name ?? null,
      };
    }
  } catch {
    // non-fatal
  }

  const allSkills = buildAllSkillsFromAttempts(
    attempts || [],
    subject,
    activityTopic,
    reportGradeLevel
  );

  return {
    ...base,
    questions,
    responses,
    classInfo,
    teacherInfo,
    allSkills,
    exportMeta: {
      generatedAt: new Date().toISOString(),
      exportVersion: "1",
    },
  };
}
