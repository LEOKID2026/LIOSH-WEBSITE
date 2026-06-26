import { insertSelfPracticeSession } from "./activity-seeder.mjs";
import {
  countTopicPracticeAnswersBeforeCohort,
  resolveSpeedPressureCurriculumTargetFromSeed,
  SPEED_COHORT_PATCH_TAG,
} from "./curriculum-speed-pressure.mjs";
import { createServiceClient } from "./supabase.mjs";
import { buildSpeedPressureAnswerSchedule, SEED_META_KEY } from "./seed-metadata.mjs";

const SPEED_SHELL_COUNT = 40;
const PRACTICE_ANSWER_COUNT = 22;
/** Speed sessions must strictly outnumber practice answers on topic so V2 dominantMode=speed. */
const SPEED_SHELL_BUFFER = 9;

export { SPEED_SHELL_COUNT, PRACTICE_ANSWER_COUNT, SPEED_COHORT_PATCH_TAG };

const FIELDS_WRITTEN = [
  "learning_sessions (speed shells: metadata.mode=speed on curriculum topic)",
  "learning_sessions (practice session: metadata.mode=practice, patch=speed_pressure_cohort)",
  "answers (practice mode, curriculum topic, timeSpentMs, questionEngine, diagnosticMetadata, skillId)",
];

async function insertSpeedSessionShells(supabase, studentId, runId, { subject, topic, grade, day, count }) {
  const shells = [];
  for (let i = 0; i < count; i += 1) {
    const hour = 14 + (i % 6);
    const startedMs = Date.parse(`${day}T${String(hour).padStart(2, "0")}:${String(i % 50).padStart(2, "0")}:00.000Z`);
    const durationSeconds = 45;
    shells.push({
      student_id: studentId,
      subject,
      topic,
      started_at: new Date(startedMs).toISOString(),
      ended_at: new Date(startedMs + durationSeconds * 1000).toISOString(),
      duration_seconds: durationSeconds,
      status: "completed",
      metadata: {
        mode: "speed",
        gameMode: "speed",
        gradeLevel: grade,
        [SEED_META_KEY]: runId,
        patch: "speed_mode_shell",
        curriculumTopic: topic,
        shellIndex: i,
      },
    });
  }
  const { error } = await supabase.from("learning_sessions").insert(shells);
  if (error) throw new Error(`speed session shells insert: ${error.message}`);
  return shells.length;
}

/**
 * Speed-pressure cohort on real curriculum topic for fast_errors profile.
 */
export async function patchSpeedPressureForStudents({ students, runId, endDay }) {
  const supabase = createServiceClient();
  const targets = students.filter((s) => s.profile === "fast_errors");
  const results = [];

  for (const student of targets) {
    const curriculum = await resolveSpeedPressureCurriculumTargetFromSeed(supabase, student, runId);
    const { subject, topic, grade, taxonomy, topicSource } = curriculum;
    const day = endDay || new Date().toISOString().slice(0, 10);

    const { count: existingCohortSessions } = await supabase
      .from("learning_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student.studentId)
      .eq("subject", subject)
      .eq("topic", topic)
      .contains("metadata", { patch: SPEED_COHORT_PATCH_TAG });

    if ((existingCohortSessions || 0) > 0) {
      results.push({
        login: student.login,
        studentId: student.studentId,
        ok: true,
        skipped: true,
        reason: "speed_pressure_cohort already seeded on curriculum topic",
        subject,
        topic,
        topicSource,
      });
      continue;
    }

    const answers = buildSpeedPressureAnswerSchedule({
      count: PRACTICE_ANSWER_COUNT,
      correctRate: 15 / PRACTICE_ANSWER_COUNT,
      day,
    });

    try {
      const priorPractice = await countTopicPracticeAnswersBeforeCohort(
        supabase,
        student.studentId,
        subject,
        topic,
        runId,
      );
      const shellCount = Math.max(
        SPEED_SHELL_COUNT,
        priorPractice + PRACTICE_ANSWER_COUNT + SPEED_SHELL_BUFFER,
      );

      const practiceRes = await insertSelfPracticeSession(supabase, student.studentId, runId, {
        subject,
        topic,
        grade,
        mode: "practice",
        answers,
        patchTag: SPEED_COHORT_PATCH_TAG,
        speedPressure: true,
      });
      const speedShellCount = await insertSpeedSessionShells(supabase, student.studentId, runId, {
        subject,
        topic,
        grade,
        day,
        count: shellCount,
      });
      results.push({
        login: student.login,
        studentId: student.studentId,
        subject,
        topic,
        topicSource,
        grade,
        taxonomy,
        priorPracticeAnswers: priorPractice,
        shellCountTarget: shellCount,
        practiceSessionId: practiceRes.sessionId,
        practiceAnswerCount: practiceRes.answerCount,
        speedShellCount,
        ok: true,
      });
    } catch (err) {
      results.push({
        login: student.login,
        studentId: student.studentId,
        ok: false,
        error: err?.message || String(err),
      });
    }
  }

  const patchedNew = results.filter((r) => r.ok && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  const failed = results.filter((r) => !r.ok);

  return {
    mutatesDatabase: true,
    targetProfile: "fast_errors",
    curriculumTopicStrategy: "lightest_seed_answer_volume (fallback defaultTopicForSubject)",
    fieldsWritten: FIELDS_WRITTEN,
    studentsTargeted: targets.length,
    studentsPatched: patchedNew.length,
    studentsSkipped: skipped.length,
    studentsFailed: failed.length,
    patched: results.filter((r) => r.ok).length,
    failed: failed.length,
    answersInserted: patchedNew.reduce((s, r) => s + (r.practiceAnswerCount || 0), 0),
    speedShellsInserted: patchedNew.reduce((s, r) => s + (r.speedShellCount || 0), 0),
    practiceSessionsInserted: patchedNew.filter((r) => r.practiceSessionId).length,
    students: results,
    results,
    engineConditions: {
      modeKey: "speed (dominantMode when speed session count > practice answer count on topic)",
      topicRequirement: "real curriculum topicKey — not synthetic probe",
      speedOnlyRisk:
        "behaviorType speed_pressure (median wrong responseMs < 2200) OR mode speed + acc>=55 + wrongRatio<0.32",
      minWrongFastMs: "<2200 median on wrong answers in diagnosticMistakes",
      targetAccuracy: "65-72% → topic_needs_strengthening band",
      minQuestions: 20,
      practiceMode: "answers must be practice/diagnostic_independent (speed mode answers excluded by evidence gate)",
      metadata: ["questionEngine", "diagnosticMetadata", "skillId", "subskillId", "patternFamily", "timeSpentMs"],
      override:
        "riskFlags.speedOnlyRisk && modeKey===speed && engineDecision in (clear_topic_gap|topic_needs_strengthening) → speed_pressure_pattern",
    },
  };
}

export const seedSpeedPressureCohort = patchSpeedPressureForStudents;
