/**
 * Phase 1 — DB simulation for all demo school students.
 */
import { WEAK_TOPICS_BY_CLASS } from "../demo-school-data.mjs";
import { QUESTION_COUNT } from "./school-sim-config.mjs";
import { attendanceRoll, scoreForStudent } from "./persona-model.mjs";
import { generateDailyPlan } from "./school-day-planner.mjs";
import { buildQuestionSet, pickTopic } from "./topic-catalog.mjs";

async function loadClassRoster(serviceRole, classId) {
  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", classId)
    .is("removed_at", null);
  if (error) throw error;
  return (data || []).map((r) => r.student_id);
}

async function findExistingActivity(serviceRole, { classId, title }) {
  const { data, error } = await serviceRole
    .from("classroom_activities")
    .select("id")
    .eq("class_id", classId)
    .eq("title", title)
    .neq("status", "archived")
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

function weakTopicForClass(physicalName, classId, state) {
  const fromName = WEAK_TOPICS_BY_CLASS[physicalName];
  if (fromName) return fromName.topic;
  const fromState = state.classWeakTopics?.[classId];
  if (Array.isArray(fromState) && fromState[0]) return fromState[0];
  return null;
}

/**
 * @returns {Promise<{ activitiesCreated, plan, gradeSummary, classSummary, studentExceptions, modesUsed }>}
 */
export async function runDbSimulation(serviceRole, state, { dryRun = false, force = false, log = console.log } = {}) {
  const targetDay = (state.currentSchoolDay ?? 0) + 1;
  const plan = generateDailyPlan(state, targetDay);

  if (plan.skipped) {
    if (!dryRun) {
      const { mergeSchoolSimState } = await import("./longitudinal-state.mjs");
      mergeSchoolSimState({
        currentSchoolDay: targetDay,
        lastRunAt: new Date().toISOString(),
      });
    }
    return {
      activitiesCreated: 0,
      schoolDay: targetDay,
      skipped: true,
      plan,
      gradeSummary: {},
      classSummary: {},
      studentExceptions: [],
      modesUsed: {},
    };
  }

  const profiles = state.studentProfiles || {};
  const weakSubjects = state.studentWeakSubjects || {};
  const improvingBoost = state.improvingDayBoost || {};
  const gradeSummary = {};
  const classSummary = {};
  const studentExceptions = [];
  const modesUsed = {};
  let created = 0;

  for (const slot of plan.slots) {
    modesUsed[slot.mode] = (modesUsed[slot.mode] || 0) + 1;
    const gKey = String(slot.grade);
    if (!gradeSummary[gKey]) gradeSummary[gKey] = { activities: 0, studentsActive: new Set() };
    gradeSummary[gKey].activities += 1;

    if (!classSummary[slot.classId]) {
      classSummary[slot.classId] = {
        physicalName: slot.physicalName,
        grade: slot.grade,
        activities: 0,
        attended: 0,
        absent: 0,
      };
    }
    classSummary[slot.classId].activities += 1;

    if (dryRun) continue;

    const existingId = force ? null : await findExistingActivity(serviceRole, { classId: slot.classId, title: slot.title });
    if (existingId) continue;

    const weakTopic = weakTopicForClass(slot.physicalName, slot.classId, state);
    const topic = weakTopic || pickTopic(slot.subject, slot.grade, slot.hour + slot.schoolDay);
    const questionSet = buildQuestionSet(topic, QUESTION_COUNT);
    const now = new Date().toISOString();

    const { data: activity, error: actErr } = await serviceRole
      .from("classroom_activities")
      .insert({
        teacher_id: slot.teacherId,
        class_id: slot.classId,
        school_id: state.schoolId,
        title: slot.title,
        subject: slot.subject,
        topic,
        mode: slot.mode,
        question_count: QUESTION_COUNT,
        question_selection: "same_exact",
        status: "closed",
        question_set: questionSet,
        activated_at: now,
        closed_at: now,
      })
      .select("id")
      .single();
    if (actErr) throw actErr;

    const roster = await loadClassRoster(serviceRole, slot.classId);
    const statusRows = [];
    const attemptRows = [];

    for (const studentId of roster) {
      const persona = profiles[studentId] || "average";
      if (!attendanceRoll(persona)) {
        classSummary[slot.classId].absent += 1;
        continue;
      }
      classSummary[slot.classId].attended += 1;
      gradeSummary[gKey].studentsActive.add(studentId);

      const isWeak =
        weakTopic ||
        weakSubjects[studentId] === slot.subject ||
        (state.classWeakTopics?.[slot.classId]?.length > 0);
      const scorePct = scoreForStudent({
        persona,
        isWeakTopic: Boolean(isWeak),
        schoolDay: targetDay,
        improvingBoost: improvingBoost[studentId] || 0,
      });
      const correctCount = Math.round((scorePct / 100) * QUESTION_COUNT);

      statusRows.push({
        activity_id: activity.id,
        student_id: studentId,
        status: "submitted",
        submitted_at: now,
        answers_count: QUESTION_COUNT,
        correct_count: correctCount,
        score_pct: scorePct,
      });

      for (let q = 0; q < QUESTION_COUNT; q++) {
        const qObj = questionSet[q];
        const isCorrect = q < correctCount;
        attemptRows.push({
          activity_id: activity.id,
          student_id: studentId,
          question_index: q,
          skill_key: qObj.skillKey,
          question_snapshot: {
            questionId: qObj.questionId,
            topic: qObj.topic,
            difficulty: qObj.difficulty,
          },
          selected_answer: isCorrect ? qObj.correctAnswer : "א",
          correct_answer: qObj.correctAnswer,
          is_correct: isCorrect,
          time_spent_ms: 30000 + q * 1000,
          answered_at: now,
        });
      }
    }

    if (statusRows.length) {
      const { error: statusErr } = await serviceRole
        .from("classroom_activity_student_status")
        .insert(statusRows);
      if (statusErr) throw statusErr;
    }
    for (let i = 0; i < attemptRows.length; i += 400) {
      const chunk = attemptRows.slice(i, i + 400);
      const { error: attemptErr } = await serviceRole.from("classroom_activity_attempts").insert(chunk);
      if (attemptErr) throw attemptErr;
    }

    created += 1;
    if (created % 12 === 0) log(`db-sim: schoolDay=${targetDay} created=${created}/${plan.plannedActivities}`);
  }

  const gradeOut = {};
  for (const [g, v] of Object.entries(gradeSummary)) {
    gradeOut[g] = { activities: v.activities, studentsActive: v.studentsActive.size };
  }

  if (!dryRun) {
    const { mergeImprovingBoost } = await import("./persona-model.mjs");
    const { mergeSchoolSimState } = await import("./longitudinal-state.mjs");
    let nextBoost = { ...improvingBoost };
    for (const id of Object.keys(profiles)) {
      if (profiles[id] === "improving") {
        nextBoost = mergeImprovingBoost(nextBoost, id, 1);
      }
    }
    mergeSchoolSimState({
      currentSchoolDay: targetDay,
      lastRunAt: new Date().toISOString(),
      improvingDayBoost: nextBoost,
    });
  }

  return {
    activitiesCreated: dryRun ? plan.plannedActivities : created,
    schoolDay: targetDay,
    skipped: false,
    plan,
    gradeSummary: gradeOut,
    classSummary,
    studentExceptions,
    modesUsed,
    dryRun,
  };
}
