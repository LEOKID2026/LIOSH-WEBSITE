import crypto from "node:crypto";

import { classifyActivityEvidence } from "../../../../lib/learning/activity-classification.js";
import { estimatePracticeDurationSeconds } from "../../../../lib/parent-server/report-duration-sanity.js";
import { insertParentAssignedActivity } from "./parent-activity-seeder.mjs";
import { buildRichAnswerPayload, SEED_META_KEY } from "./seed-metadata.mjs";
import { resolveSessionSubject } from "./subject-registry.mjs";

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFromSeed(seed) {
  let s = fnv1a(String(seed)) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function isoDayOffset(startDay, offset) {
  const d = new Date(`${startDay}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function answerPayload(opts) {
  return buildRichAnswerPayload({ ...opts, speedPressure: opts.mode === "speed" && !opts.isCorrect });
}

/**
 * Build per-day answer schedule for one student over simulated days.
 */
export function buildStudentActivityPlan(student, { days, minutesPerDay, startDay, runId }) {
  const profile = student.profile;
  const rng = rngFromSeed(`${runId}|plan|${student.login}`);
  const questionsPerDay = Math.max(4, Math.min(40, Math.round((minutesPerDay / 30) * 12)));
  const dayList = Array.from({ length: days }, (_, i) => isoDayOffset(startDay, i));

  const sessions = [];
  let totalAnswers = 0;

  for (const day of dayList) {
    if (rng() > profile.attendance) continue;

    let correctRate = profile.correctRate;
    if (profile.evolution === "improving") {
      const dayIdx = dayList.indexOf(day);
      correctRate = Math.min(0.95, profile.correctRate + dayIdx * 0.015);
    } else if (profile.evolution === "declining") {
      const dayIdx = dayList.indexOf(day);
      correctRate = Math.max(0.3, profile.correctRate - dayIdx * 0.012);
    } else if (profile.evolution === "inconsistent") {
      correctRate = rng() < 0.5 ? profile.correctRate + 0.2 : profile.correctRate - 0.25;
    }

    if (profile.sparse) {
      if (rng() > 0.35) continue;
    }

    const selfShare = profile.activityMix.self;
    const parentShare = profile.activityMix.parent;
    const selfQuestions = profile.activityMix.parent === 1 && profile.activityMix.self === 0
      ? 0
      : Math.round(questionsPerDay * selfShare);
    const parentQuestions =
      profile.activityMix.self === 1 && profile.activityMix.parent === 0
        ? 0
        : Math.max(0, questionsPerDay - selfQuestions);

    const subjectsToday = [student.primarySubject, ...student.secondarySubjects].slice(0, 2);
    for (const subject of subjectsToday) {
      if (selfQuestions <= 0) break;
      const topicPool = student.topics?.[subject] || [student.defaultTopic?.[subject] || "general"];
      const topic = topicPool[Math.floor(rng() * topicPool.length)];
      const weaknessList = student.weaknessTopics?.[subject] || [];
      const isWeakTopic = weaknessList.includes(topic);

      const answers = [];
      const answerCount = Math.ceil(selfQuestions / subjectsToday.length);

      for (let q = 0; q < answerCount; q += 1) {
        let pCorrect = isWeakTopic ? Math.max(0.25, correctRate - 0.35) : correctRate;
        if (profile.speedPressure && q > 2) pCorrect -= 0.1;
        const isCorrect = rng() < pCorrect;
        answers.push({
          isCorrect,
          timeSpentMs: isCorrect ? 7000 + (q % 3) * 800 : 4500 + (q % 4) * 300,
          answeredAt: `${day}T${String(9 + (q % 6)).padStart(2, "0")}:${String(10 + (q * 7) % 50).padStart(2, "0")}:00.000Z`,
        });
      }

      if (answers.length) {
        sessions.push({
          type: "self_practice",
          subject,
          topic,
          grade: student.grade,
          mode: "practice",
          answers,
        });
        totalAnswers += answers.length;
      }
    }

    if (parentQuestions > 0 && student.parentId) {
      const subject = student.primarySubject;
      const topic = student.defaultTopic?.[subject] || "general";
      const wrongCount = Math.round(parentQuestions * (1 - correctRate));
      sessions.push({
        type: "parent_assigned_activity",
        subject,
        topic,
        grade: student.grade,
        count: parentQuestions,
        wrongCount,
        day,
      });
      totalAnswers += parentQuestions;
    }
  }

  return { sessions, totalAnswers, simulatedDays: dayList.length };
}

export async function insertSelfPracticeSession(supabase, studentId, runId, session) {
  if (!session.answers?.length) return { sessionId: null, answerCount: 0 };

  const sessionSubject = resolveSessionSubject(session.subject);

  const startedMs = Date.parse(session.answers[0].answeredAt);
  const durationSeconds = estimatePracticeDurationSeconds(session.answers.length);
  const endedMs = startedMs + durationSeconds * 1000;
  const correct = session.answers.filter((a) => a.isCorrect).length;

  const sessionMetadata = {
    mode: session.mode || "practice",
    gameMode: session.mode || "practice",
    gradeLevel: session.grade,
    [SEED_META_KEY]: runId,
    summary: {
      totalQuestions: session.answers.length,
      correctAnswers: correct,
      wrongAnswers: session.answers.length - correct,
    },
  };
  if (session.contentGradeKey) {
    sessionMetadata.contentGradeLevel = session.contentGradeKey;
  }
  if (session.patchTag) sessionMetadata.patch = session.patchTag;

  const { data: sessionRow, error: sessErr } = await supabase
    .from("learning_sessions")
    .insert({
      student_id: studentId,
      subject: sessionSubject,
      topic: session.topic,
      started_at: new Date(startedMs).toISOString(),
      ended_at: new Date(endedMs).toISOString(),
      duration_seconds: durationSeconds,
      status: "completed",
      metadata: sessionMetadata,
    })
    .select("id")
    .single();
  if (sessErr || !sessionRow?.id) throw new Error(`session insert: ${sessErr?.message}`);

  const rows = session.answers.map((a, i) => ({
    student_id: studentId,
    learning_session_id: sessionRow.id,
    question_id: `${runId}:${sessionRow.id}:${i}`,
    is_correct: a.isCorrect,
    answered_at: a.answeredAt,
    answer_payload: answerPayload({
      runId,
      subject: sessionSubject,
      topic: session.topic,
      mode: session.mode,
      grade: session.grade,
      isCorrect: a.isCorrect,
      timeSpentMs: a.timeSpentMs ?? 5000,
      speedPressure: session.speedPressure === true,
    }),
  }));

  const { error: ansErr } = await supabase.from("answers").insert(rows);
  if (ansErr) throw new Error(`answers insert: ${ansErr.message}`);

  return { sessionId: sessionRow.id, answerCount: rows.length };
}

export async function seedStudentActivity(supabase, student, plan, runId) {
  let sessionCount = 0;
  let answerCount = 0;
  let parentActivityCount = 0;
  const errors = [];

  for (const session of plan.sessions) {
    try {
      if (session.type === "self_practice") {
        const res = await insertSelfPracticeSession(supabase, student.studentId, runId, session);
        if (res.sessionId) sessionCount += 1;
        answerCount += res.answerCount;
      } else if (session.type === "parent_assigned_activity") {
        await insertParentAssignedActivity(supabase, student.parentId, student.studentId, runId, session);
        parentActivityCount += 1;
        answerCount += session.count;
      }
    } catch (err) {
      errors.push({ studentId: student.studentId, login: student.login, error: err?.message || String(err) });
    }
  }

  return { sessionCount, answerCount, parentActivityCount, errors };
}
