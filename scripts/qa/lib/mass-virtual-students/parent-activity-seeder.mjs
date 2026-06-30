import crypto from "node:crypto";

import { classifyActivityEvidence } from "../../../../lib/learning/activity-classification.js";
import { displayLevelToActivityDbEnum } from "../../../../lib/learning/display-level.js";
import { createServiceClient } from "./supabase.mjs";
import { resolvePracticeDisplayLevel } from "./display-level-cohort.mjs";
import { buildRichAnswerPayload, SEED_META_KEY } from "./seed-metadata.mjs";
import { resolveSessionSubject } from "./subject-registry.mjs";

/**
 * Insert parent-assigned attempts using schema columns (no answer_payload on this table).
 */
export async function insertParentAssignedActivity(supabase, parentId, studentId, runId, session) {
  const activityMode = session.mode || "homework";
  const classification = classifyActivityEvidence(activityMode, "assigned_parent", { hintsUsed: 0 });
  const activityId = crypto.randomUUID();
  const title = `[${runId}] parent ${activityMode} ${session.topic}`;

  const sessionSubject = resolveSessionSubject(session.subject);
  const sessionDisplayLevel = resolvePracticeDisplayLevel(session.subject, session.displayLevel || "regular");
  const difficultyLevel = displayLevelToActivityDbEnum(sessionDisplayLevel) || "mixed";

  const { error: actErr } = await supabase.from("parent_assigned_activities").insert({
    id: activityId,
    parent_id: parentId,
    student_id: studentId,
    title,
    subject: sessionSubject,
    topic: session.topic,
    question_count: session.count,
    mode: activityMode,
    difficulty_level: difficultyLevel,
    question_set: [{ prompt: "1+1", correctAnswer: "2", type: "numeric" }],
    status: "active",
  });
  if (actErr) throw new Error(`parent activity insert: ${actErr.message}`);

  const startedAt = `${session.day}T09:00:00.000Z`;
  const submittedAt = `${session.day}T09:30:00.000Z`;
  const correctCount = session.count - session.wrongCount;

  const { error: statusErr } = await supabase.from("parent_activity_status").insert({
    activity_id: activityId,
    student_id: studentId,
    status: "submitted",
    started_at: startedAt,
    submitted_at: submittedAt,
    answers_count: session.count,
    correct_count: correctCount,
    score_pct: session.count > 0 ? Number(((correctCount / session.count) * 100).toFixed(2)) : null,
  });
  if (statusErr) throw new Error(`parent activity status insert: ${statusErr.message}`);

  await insertAttemptsForActivity(supabase, {
    activityId,
    studentId,
    runId,
    session: { ...session, mode: activityMode, classification },
  });

  return { activityId, attemptCount: session.count };
}

/**
 * Insert attempts for an existing parent_assigned_activities row (backfill).
 */
export async function insertAttemptsForExistingActivity(supabase, activity, runId, session) {
  const activityMode = activity.mode || session.mode || "homework";
  const classification = classifyActivityEvidence(activityMode, "assigned_parent", { hintsUsed: 0 });
  const count = session.count ?? activity.question_count ?? 10;

  await insertAttemptsForActivity(supabase, {
    activityId: activity.id,
    studentId: activity.student_id,
    runId,
    session: {
      ...session,
      subject: session.subject ?? activity.subject,
      topic: session.topic ?? activity.topic,
      count,
      mode: activityMode,
      classification,
    },
  });

  const correctCount = count - (session.wrongCount ?? Math.round(count * 0.35));
  const startedAt = `${session.day}T09:00:00.000Z`;
  const submittedAt = `${session.day}T09:30:00.000Z`;

  const { error: statusErr } = await supabase.from("parent_activity_status").upsert(
    {
      activity_id: activity.id,
      student_id: activity.student_id,
      status: "submitted",
      started_at: startedAt,
      submitted_at: submittedAt,
      answers_count: count,
      correct_count: correctCount,
      score_pct: count > 0 ? Number(((correctCount / count) * 100).toFixed(2)) : null,
    },
    { onConflict: "activity_id,student_id" },
  );
  if (statusErr) throw new Error(`parent activity status upsert: ${statusErr.message}`);

  return { activityId: activity.id, attemptCount: count };
}

async function insertAttemptsForActivity(supabase, { activityId, studentId, runId, session }) {
  const classification = session.classification;
  const sessionSubject = resolveSessionSubject(session.subject);
  let wrongLeft = session.wrongCount ?? Math.round(session.count * 0.35);

  for (let i = 0; i < session.count; i += 1) {
    const isWrong = wrongLeft > 0;
    if (isWrong) wrongLeft -= 1;
    const timeSpentMs = session.timeSpentMs?.(i, isWrong) ?? (isWrong ? 1200 : 8000);
    const payload = buildRichAnswerPayload({
      runId,
      subject: sessionSubject,
      topic: session.topic,
      grade: session.grade,
      mode: session.mode || "homework",
      displayLevel: resolvePracticeDisplayLevel(session.subject, session.displayLevel || "regular"),
      answerIndex: i,
      isCorrect: !isWrong,
      timeSpentMs,
    });

    const { error: attErr } = await supabase.from("parent_activity_attempts").insert({
      activity_id: activityId,
      student_id: studentId,
      question_index: i,
      is_correct: !isWrong,
      answered_at: `${session.day}T${String(9 + (i % 5)).padStart(2, "0")}:15:00.000Z`,
      time_spent_ms: timeSpentMs,
      hints_used: 0,
      selected_answer: payload.userAnswer,
      correct_answer: payload.expectedAnswer,
      question_snapshot: {
        prompt: payload.prompt,
        subject: sessionSubject,
        topic: session.topic,
        grade: session.grade,
        gradeLevel: session.grade,
        displayLevel: payload.displayLevel,
        evidenceCategory: classification.evidenceCategory,
        isDiagnosticEligible: classification.isDiagnosticEligible,
        patternFamily: payload.patternFamily,
        diagnosticMetadata: payload.diagnosticMetadata,
        questionEngine: payload.questionEngine,
        clientMeta: { [SEED_META_KEY]: runId },
      },
    });
    if (attErr) throw new Error(`parent activity attempt insert: ${attErr.message}`);
  }
}

/**
 * Backfill attempts for parent activities created without attempts (legacy seed bug).
 */
export async function backfillParentActivityAttempts({ runId, endDay }) {
  const supabase = createServiceClient();
  const { data: activities } = await supabase
    .from("parent_assigned_activities")
    .select("id, parent_id, student_id, subject, topic, question_count, mode, title")
    .like("title", `[${runId}]%`);

  let backfilled = 0;
  let skipped = 0;
  const errors = [];

  for (const act of activities || []) {
    const { count } = await supabase
      .from("parent_activity_attempts")
      .select("id", { count: "exact", head: true })
      .eq("activity_id", act.id);
    if (count > 0) {
      skipped += 1;
      continue;
    }

    const { data: student } = await supabase
      .from("students")
      .select("grade_level")
      .eq("id", act.student_id)
      .maybeSingle();
    const grade = Number(String(student?.grade_level || "").replace(/\D/g, "")) || 1;
    const day = endDay || new Date().toISOString().slice(0, 10);
    const qCount = act.question_count || 10;
    const wrongCount = Math.round(qCount * 0.35);

    try {
      await insertAttemptsForExistingActivity(supabase, act, runId, {
        subject: act.subject,
        topic: act.topic,
        grade,
        count: qCount,
        wrongCount,
        day,
        mode: act.mode || "homework",
      });
      backfilled += 1;
    } catch (err) {
      errors.push({ activityId: act.id, title: act.title, error: err?.message || String(err) });
    }
  }

  return { backfilled, skipped, errors, activitiesChecked: (activities || []).length };
}
