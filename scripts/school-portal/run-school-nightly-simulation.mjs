#!/usr/bin/env node
/**
 * Nightly demo school simulation (direct DB, no Playwright).
 *
 *   node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=advance [--dry-run]
 *   node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=seed-history --days=10
 *   node --env-file=.env.local scripts/school-portal/run-school-nightly-simulation.mjs --mode=reset
 */
import {
  PHYSICAL_CLASSES,
  SUBJECTS,
  TIMETABLE_BY_DAY,
  classRecordKey,
  physicalClassName,
  teacherKeyForSubject,
} from "./demo-school-data.mjs";
import { createServiceRole, loadSimState, mergeSimState } from "./demo-school-lib.mjs";
import { bootstrapSchoolDbWriteGuard } from "./lib/school-db-write-guard.mjs";

const QUESTION_COUNT = 10;
const START_DATE = "2025-09-01";

function parseArgs(argv) {
  let mode = "advance";
  let days = 10;
  let dryRun = true;
  let force = false;

  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--write") dryRun = false;
    else if (arg === "--force") force = true;
    else if (arg.startsWith("--mode=")) mode = arg.slice("--mode=".length);
    else if (arg === "--mode") continue;
    else if (arg.startsWith("--days=")) days = Number(arg.slice("--days=".length));
    else if (arg === "--days") continue;
    else if (!arg.startsWith("-") && argv[argv.indexOf(arg) - 1] === "--mode") mode = arg;
    else if (!arg.startsWith("-") && argv[argv.indexOf(arg) - 1] === "--days") days = Number(arg);
  }

  return { mode, days, dryRun, force };
}

function buildStubQuestionSet(topic) {
  const items = [];
  for (let i = 1; i <= QUESTION_COUNT; i++) {
    items.push({
      questionId: `stub-q${String(i).padStart(2, "0")}`,
      topic: topic || "general",
      difficulty: i <= 3 ? "easy" : i <= 7 ? "medium" : "hard",
      questionText: `שאלה ${i}`,
      options: ["א", "ב", "ג", "ד"],
      correctAnswer: "ב",
      skillKey: `${topic || "general"}_skill`,
    });
  }
  return items;
}

function schoolDayToWeekday(schoolDay) {
  const start = new Date(`${START_DATE}T12:00:00Z`);
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + schoolDay);
  let dow = d.getUTCDay();
  while (dow === 5 || dow === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
    dow = d.getUTCDay();
  }
  return dow;
}

function weekdayToTimetableIndex(dow) {
  if (dow === 0) return 0;
  if (dow >= 1 && dow <= 4) return dow;
  return null;
}

function scoreForStudent(profile, isWeakTopic) {
  let base;
  if (profile === "strong") base = 85 + Math.floor(Math.random() * 16);
  else if (profile === "struggling") base = 20 + Math.floor(Math.random() * 31);
  else base = 55 + Math.floor(Math.random() * 26);
  if (isWeakTopic) base = Math.max(5, base - 18);
  return Math.min(100, Math.max(0, base));
}

function activityModeForSubject(subject, hour) {
  if (subject === "english" || subject === "hebrew") return hour % 2 === 0 ? "guided_practice" : "homework";
  if (subject === "geometry" || subject === "science") return hour >= 4 ? "quiz" : "guided_practice";
  return "guided_practice";
}

async function loadClassRoster(serviceRole, classId) {
  const { data, error } = await serviceRole
    .from("teacher_class_students")
    .select("student_id")
    .eq("class_id", classId)
    .is("removed_at", null);
  if (error) throw error;
  return (data || []).map((r) => r.student_id);
}

async function findExistingActivity(serviceRole, { classId, schoolDay, subject, hour }) {
  const title = `יום ${schoolDay} שעה ${hour} — ${subject}`;
  const { data, error } = await serviceRole
    .from("classroom_activities")
    .select("id, status")
    .eq("class_id", classId)
    .eq("title", title)
    .neq("status", "archived")
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

async function advanceOneSchoolDay(serviceRole, state, { dryRun, force }) {
  const targetDay = (state.currentSchoolDay ?? 0) + 1;
  const dayForSlots = targetDay;
  const dow = schoolDayToWeekday(dayForSlots);
  const ttIndex = weekdayToTimetableIndex(dow);
  if (ttIndex == null) {
    console.log(`School day ${dayForSlots}: weekend skip`);
    if (!dryRun) {
      mergeSimState({ currentSchoolDay: targetDay, lastRunAt: new Date().toISOString() });
    }
    return { activities: 0, skipped: true };
  }

  const slots = TIMETABLE_BY_DAY[ttIndex];
  const plan = [];
  let created = 0;

  for (const pc of PHYSICAL_CLASSES) {
    const physicalName = physicalClassName(pc.grade, pc.section);
    for (let hour = 0; hour < slots.length; hour++) {
      const subject = slots[hour];
      const classId = state.classIds[classRecordKey(pc.grade, pc.section, subject)];
      const teacherKey = teacherKeyForSubject(pc.grade, subject);
      const teacherId = state.teacherIds[teacherKey];
      plan.push({ physicalName, grade: pc.grade, subject, classId, teacherId, hour: hour + 1 });
    }
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        { dryRun: true, schoolDay: dayForSlots, weekday: dow, plannedActivities: plan.length },
        null,
        2
      )
    );
    return { activities: plan.length, dryRun: true };
  }

  const weakTopics = state.classWeakTopics || {};
  const profiles = state.studentProfiles || {};

  for (const slot of plan) {
    const existingId = force
      ? null
      : await findExistingActivity(serviceRole, {
          classId: slot.classId,
          schoolDay: dayForSlots,
          subject: slot.subject,
          hour: slot.hour,
        });
    if (existingId) continue;

    const topic = (weakTopics[slot.classId] && weakTopics[slot.classId][0]) || slot.subject;
    const questionSet = buildStubQuestionSet(topic);
    const status = "closed";
    const now = new Date().toISOString();
    const title = `יום ${dayForSlots} שעה ${slot.hour} — ${slot.subject}`;

    const { data: activity, error: actErr } = await serviceRole
      .from("classroom_activities")
      .insert({
        teacher_id: slot.teacherId,
        class_id: slot.classId,
        school_id: state.schoolId,
        title,
        subject: slot.subject,
        topic,
        mode: activityModeForSubject(slot.subject, slot.hour),
        question_count: QUESTION_COUNT,
        question_selection: "same_exact",
        status,
        question_set: questionSet,
        activated_at: now,
        closed_at: now,
      })
      .select("id")
      .single();

    if (actErr) throw actErr;

    const roster = await loadClassRoster(serviceRole, slot.classId);
    const isWeakClass = Boolean(weakTopics[slot.classId]?.length);

    const statusRows = [];
    const attemptRows = [];
    for (const studentId of roster) {
      const profile = profiles[studentId] || "average";
      const scorePct = scoreForStudent(profile, isWeakClass);
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
    if (created % 12 === 0) {
      console.log(`advance: schoolDay=${dayForSlots} created=${created}/${plan.length}`);
    }
  }

  if (!dryRun) {
    mergeSimState({
      currentSchoolDay: targetDay,
      lastRunAt: new Date().toISOString(),
    });
  }

  return { activities: created, schoolDay: dayForSlots };
}

async function main() {
  const argv = process.argv.slice(2);
  const guard = bootstrapSchoolDbWriteGuard(
    "school-portal/run-school-nightly-simulation",
    "RUN_SCHOOL_NIGHTLY_SIMULATION",
    argv
  );
  const { mode, days, dryRun, force } = parseArgs(argv);
  if (dryRun !== guard.isDryRun) {
    throw new Error("Internal guard/argv dry-run mismatch");
  }
  const serviceRole = createServiceRole();
  const state = loadSimState();

  if (!state.schoolId || !state.classIds) {
    throw new Error("sim-state.json incomplete — run seed phases first");
  }

  if (mode === "reset") {
    const { spawn } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const resetPath = fileURLToPath(new URL("./reset-demo-school-activities.mjs", import.meta.url));
    const child = spawn(process.execPath, [resetPath, "--mode=activities"], {
      stdio: "inherit",
      env: process.env,
    });
    await new Promise((resolve, reject) => {
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`reset exited ${code}`))));
    });
    return;
  }

  if (mode === "seed-history") {
    let total = 0;
    for (let i = 0; i < days; i++) {
      const dayState = loadSimState();
      console.log(
        `seed-history: day ${i + 1}/${days} (sim currentSchoolDay=${dayState.currentSchoolDay ?? 0})`
      );
      const result = await advanceOneSchoolDay(serviceRole, dayState, { dryRun: false, force });
      total += result.activities || 0;
      console.log(
        `seed-history: day ${i + 1}/${days} done — activities=${result.activities ?? 0}, total=${total}`
      );
    }
    console.log(JSON.stringify({ mode: "seed-history", days, activitiesCreated: total }, null, 2));
    guard.printEndSummary({ affectedRows: total });
    return;
  }

  if (mode === "advance") {
    const result = await advanceOneSchoolDay(serviceRole, state, { dryRun, force });
    console.log(JSON.stringify({ mode: "advance", ...result }, null, 2));
    guard.printEndSummary({
      affectedRows: result.activities || 0,
      skippedRows: dryRun ? result.activities || 0 : 0,
    });
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

main().catch((e) => {
  if (e?.name === "ProductionScriptGuardError") {
    console.error(`[production-guard] BLOCKED: ${e.message}`);
    process.exit(1);
  }
  console.error("run-school-nightly-simulation: FAIL", e.message || e);
  process.exit(1);
});
