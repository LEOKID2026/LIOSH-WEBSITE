/**
 * Historical home-practice layer — learning_sessions + answers for R1 parent reports.
 */
import { QUESTION_COUNT } from "./school-sim-config.mjs";
import { attendanceRoll, scoreForStudent } from "./persona-model.mjs";
import { buildQuestionSet, pickTopic } from "./topic-catalog.mjs";
import { eveningTimestamp, dayRangeIso } from "./backfill-date-engine.mjs";
import { isSubjectAvailableForGrade } from "./school-sim-config.mjs";
import { selectByInChunks } from "./supabase-chunk.mjs";

export const REPORT_AGG_SUBJECTS = [
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "moledet_geography",
];

export const HOME_PRACTICE_SEED_TAG = "school-sim-backfill-v1";

const SUBJECTS_BY_GRADE = {
  1: ["math", "hebrew", "english"],
  2: ["math", "hebrew", "english", "science"],
  3: ["math", "hebrew", "english", "science", "moledet_geography"],
  4: ["math", "geometry", "hebrew", "english", "science", "moledet_geography"],
  5: ["math", "geometry", "hebrew", "english", "science", "moledet_geography"],
  6: ["math", "geometry", "hebrew", "english", "science", "moledet_geography"],
};

function buildStudentMetaMap(state) {
  const map = {};
  for (const [key, block] of Object.entries(state.studentsByPhysical || {})) {
    const grade = block.grade || Number(String(key).split(":")[0]) || 1;
    const physicalClass = block.name || key;
    for (const studentId of block.studentIds || []) {
      map[studentId] = { grade, physicalClass, physicalKey: key };
    }
  }
  for (let i = 0; i < (state.studentIds || []).length; i++) {
    const id = state.studentIds[i];
    if (!map[id]) map[id] = { grade: (i % 6) + 1, physicalClass: "unknown", physicalKey: null };
  }
  return map;
}

function studentsByGrade(state) {
  const meta = buildStudentMetaMap(state);
  const byGrade = {};
  for (const id of state.studentIds || []) {
    const g = meta[id]?.grade || 1;
    if (!byGrade[g]) byGrade[g] = [];
    byGrade[g].push(id);
  }
  return byGrade;
}

function pickSubjectForStudent(grade, targetDay, studentIndex, weakSubject) {
  const available = (SUBJECTS_BY_GRADE[grade] || SUBJECTS_BY_GRADE[1]).filter((s) =>
    isSubjectAvailableForGrade(s, grade)
  );
  if (!available.length) return "math";
  if (weakSubject && available.includes(weakSubject)) {
    return weakSubject;
  }
  return available[(targetDay + studentIndex) % available.length];
}

/** sample: 2–4 students per grade, rotating */
export function pickSampleStudentsForDay(state, targetDay) {
  const byGrade = studentsByGrade(state);
  const picked = [];
  for (let g = 1; g <= 6; g++) {
    const list = byGrade[g] || [];
    if (!list.length) continue;
    const count = 2 + (targetDay % 3);
    for (let i = 0; i < count; i++) {
      const idx = (targetDay + g + i) % list.length;
      const id = list[idx];
      if (!picked.includes(id)) picked.push(id);
    }
  }
  return picked;
}

/** weekly-all: cohort by weekday (Sun=0 .. Thu=4) */
export function pickWeeklyAllStudentsForDay(state, weekdayIndex) {
  const ids = state.studentIds || [];
  return ids.filter((_, i) => i % 5 === weekdayIndex);
}

/** full: all students subject to attendance */
export function pickFullStudentsForDay(state, profiles) {
  const ids = state.studentIds || [];
  return ids.filter((id) => attendanceRoll(profiles[id] || "average"));
}

export function resolveHomePracticeStudents(state, { scope, targetDay, weekdayIndex, profiles }) {
  if (scope === "none") return [];
  if (scope === "sample") return pickSampleStudentsForDay(state, targetDay);
  if (scope === "weekly-all") return pickWeeklyAllStudentsForDay(state, weekdayIndex);
  if (scope === "full") return pickFullStudentsForDay(state, profiles);
  throw new Error(`Invalid home-practice scope: ${scope}`);
}

async function hasExistingSession(serviceRole, studentId, simulatedDate) {
  const { fromIso, toIso } = dayRangeIso(simulatedDate);
  const { count, error } = await serviceRole
    .from("learning_sessions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("started_at", fromIso)
    .lte("started_at", toIso);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function deleteSessionsForStudentDay(serviceRole, studentId, simulatedDate) {
  const { fromIso, toIso } = dayRangeIso(simulatedDate);
  const { data: sessions, error } = await serviceRole
    .from("learning_sessions")
    .select("id")
    .eq("student_id", studentId)
    .gte("started_at", fromIso)
    .lte("started_at", toIso);
  if (error) throw error;
  const sessionIds = (sessions || []).map((r) => r.id);
  if (!sessionIds.length) return;
  await serviceRole.from("answers").delete().in("learning_session_id", sessionIds);
  await serviceRole.from("learning_sessions").delete().in("id", sessionIds);
}

function spreadAnswerTimes(startIso, endIso, count) {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (count <= 1) return [startIso];
  const span = Math.max(1, endMs - startMs);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(new Date(startMs + Math.floor((span * i) / (count - 1))).toISOString());
  }
  return out;
}

function recordSessionManifest(manifest, studentId, meta, sessionInfo) {
  if (!manifest[studentId]) {
    manifest[studentId] = {
      studentId,
      grade: meta.grade,
      physicalClass: meta.physicalClass,
      personaType: sessionInfo.persona,
      weakSubject: sessionInfo.weakSubject || null,
      sessionsGenerated: [],
      totalSessions: 0,
      totalAnswers: 0,
    };
  }
  manifest[studentId].sessionsGenerated.push({
    date: sessionInfo.date,
    subject: sessionInfo.subject,
    topic: sessionInfo.topic,
    sessionCount: 1,
    answersCount: sessionInfo.answersCount,
    scorePercent: sessionInfo.scorePercent,
  });
  manifest[studentId].totalSessions += 1;
  manifest[studentId].totalAnswers += sessionInfo.answersCount;
}

/**
 * @returns {Promise<{ sessionsCreated, answersCreated, daySummary, manifestPatch }>}
 */
export async function runHomePracticeSimulation(
  serviceRole,
  state,
  {
    simulatedDate,
    targetDay,
    weekdayIndex = 0,
    scope = "sample",
    dryRun = false,
    force = false,
    improvingBoost = {},
    manifestAccumulator = {},
    log = console.log,
  } = {}
) {
  if (scope === "none") {
    return { sessionsCreated: 0, answersCreated: 0, daySummary: { students: 0 }, manifestPatch: {} };
  }

  const profiles = state.studentProfiles || {};
  const weakSubjects = state.studentWeakSubjects || {};
  const studentMeta = buildStudentMetaMap(state);
  const studentIds = resolveHomePracticeStudents(state, { scope, targetDay, weekdayIndex, profiles });

  let sessionsCreated = 0;
  let answersCreated = 0;
  const dayEntries = [];

  for (let si = 0; si < studentIds.length; si++) {
    const studentId = studentIds[si];
    const meta = studentMeta[studentId] || { grade: 1, physicalClass: "unknown" };
    const persona = profiles[studentId] || "average";

    if (scope === "full" && !attendanceRoll(persona)) continue;

    const exists = dryRun ? false : await hasExistingSession(serviceRole, studentId, simulatedDate);
    if (exists && !force) continue;
    if (exists && force && !dryRun) {
      await deleteSessionsForStudentDay(serviceRole, studentId, simulatedDate);
    }

    const weakSubject = weakSubjects[studentId] || null;
    const subject = pickSubjectForStudent(meta.grade, targetDay, si, weakSubject);
    if (!REPORT_AGG_SUBJECTS.includes(subject)) continue;

    const topic = pickTopic(subject, meta.grade, targetDay + si);
    const questionSet = buildQuestionSet(topic, QUESTION_COUNT);
    const scorePct = scoreForStudent({
      persona,
      isWeakTopic: weakSubject === subject,
      schoolDay: targetDay,
      improvingBoost: improvingBoost[studentId] || 0,
    });
    const correctCount = Math.round((scorePct / 100) * QUESTION_COUNT);
    const startedAt = eveningTimestamp(simulatedDate, si);
    const durationSec = 480 + (si % 8) * 60;
    const endedAt = new Date(new Date(startedAt).getTime() + durationSec * 1000).toISOString();
    const answerTimes = spreadAnswerTimes(startedAt, endedAt, QUESTION_COUNT);

    if (dryRun) {
      sessionsCreated += 1;
      answersCreated += QUESTION_COUNT;
      recordSessionManifest(manifestAccumulator, studentId, meta, {
        persona,
        weakSubject,
        date: simulatedDate,
        subject,
        topic,
        answersCount: QUESTION_COUNT,
        scorePercent: scorePct,
      });
      dayEntries.push({ studentId, subject, topic, dryRun: true });
      continue;
    }

    const wrong = QUESTION_COUNT - correctCount;
    const { data: sessionRow, error: sessErr } = await serviceRole
      .from("learning_sessions")
      .insert({
        student_id: studentId,
        subject,
        topic,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSec,
        status: "completed",
        metadata: {
          mode: "learning",
          gradeLevel: `g${meta.grade}`,
          contentGradeLevel: `g${meta.grade}`,
          backfillTag: `${HOME_PRACTICE_SEED_TAG}:${simulatedDate}`,
          schoolSimBackfill: HOME_PRACTICE_SEED_TAG,
          summary: {
            totalQuestions: QUESTION_COUNT,
            correctAnswers: correctCount,
            wrongAnswers: wrong,
            accuracy: scorePct,
            score: scorePct,
          },
        },
      })
      .select("id")
      .single();
    if (sessErr) throw sessErr;

    const answerRows = [];
    for (let q = 0; q < QUESTION_COUNT; q++) {
      const qObj = questionSet[q];
      const isCorrect = q < correctCount;
      answerRows.push({
        student_id: studentId,
        learning_session_id: sessionRow.id,
        question_id: `${HOME_PRACTICE_SEED_TAG}:${sessionRow.id}:${q}`,
        is_correct: isCorrect,
        answered_at: answerTimes[q],
        answer_payload: {
          subject,
          topic,
          prompt: qObj.questionText || `${subject}/${topic} #${q + 1}`,
          expectedAnswer: qObj.correctAnswer,
          userAnswer: isCorrect ? qObj.correctAnswer : "א",
          timeSpentMs: 4000 + q * 800,
          gradeLevel: `g${meta.grade}`,
          clientMeta: { origin: HOME_PRACTICE_SEED_TAG, simulatedDate },
        },
      });
    }

    const { error: ansErr } = await serviceRole.from("answers").insert(answerRows);
    if (ansErr) throw ansErr;

    sessionsCreated += 1;
    answersCreated += QUESTION_COUNT;
    recordSessionManifest(manifestAccumulator, studentId, meta, {
      persona,
      weakSubject,
      date: simulatedDate,
      subject,
      topic,
      answersCount: QUESTION_COUNT,
      scorePercent: scorePct,
    });
    dayEntries.push({ studentId, sessionId: sessionRow.id, subject, topic });
  }

  if (sessionsCreated && sessionsCreated % 10 === 0) {
    log(`home-practice: date=${simulatedDate} sessions=${sessionsCreated}`);
  }

  return {
    sessionsCreated,
    answersCreated,
    daySummary: { students: studentIds.length, entries: dayEntries },
    manifestPatch: { ...manifestAccumulator },
  };
}

export function buildExpectedRanges(fromIso, toIso, sessionDates) {
  const dates = [...new Set(sessionDates)].sort();
  const first = dates[0] || fromIso;
  const last = dates[dates.length - 1] || toIso;
  return {
    week1: { from: first, to: last, expectedAnswers: dates.length ? ">0" : "0" },
    month: { from: fromIso.slice(0, 8) + "01", to: toIso, expectedAnswers: dates.length ? ">0" : "0" },
    fullRange: { from: fromIso, to: toIso, expectedAnswers: dates.length ? ">0" : "0" },
  };
}

export async function enrichHomePracticeManifest(serviceRole, manifestByStudent, { fromIso, toIso, baseUrl }) {
  const studentIds = Object.keys(manifestByStudent);
  if (!studentIds.length) return { students: [], totalStudents: 0, totalSessions: 0, totalAnswers: 0 };

  const rows = await selectByInChunks(serviceRole, "students", "id, full_name", "id", studentIds);
  const names = Object.fromEntries(rows.map((r) => [r.id, r.full_name]));

  const students = studentIds.map((studentId) => {
    const entry = manifestByStudent[studentId];
    const sessionDates = (entry.sessionsGenerated || []).map((s) => s.date);
    const ranges = buildExpectedRanges(fromIso, toIso, sessionDates);
    const r1Query = `studentId=${studentId}&from=${fromIso}&to=${toIso}`;
    return {
      ...entry,
      fullName: names[studentId] || studentId,
      r1ApiCheck: {
        description:
          "Normal parent report — learning_sessions + answers only. Auth as scaffolding parent (demofamily@leo-k.com).",
        apiRoute: `/api/parent/students/${studentId}/report-data`,
        exampleCall: `/api/parent/students/${studentId}/report-data?${r1Query}`,
        dataSource: "learning_sessions (started_at filter) + answers (answered_at filter)",
        r1ExpectedRanges: ranges,
      },
      r3TeacherBridge: {
        description:
          "Teacher QA parent-report bridge — learning_sessions + answers + classroom rollup. Auth as teacher.",
        apiRoute: `/api/teacher/students/${studentId}/parent-report-data`,
        exampleCall: `/api/teacher/students/${studentId}/parent-report-data?${r1Query}`,
        manualBrowserUrl: `${baseUrl.replace(/\/$/, "")}/learning/parent-report?studentId=${studentId}&from=${fromIso}&to=${toIso}&source=teacher`,
        dataSource: "learning_sessions + answers + classroom_activity_student_status (submitted_at filter)",
        r3ExpectedRanges: {
          ...ranges,
          week1: { ...ranges.week1, classroomActivities: ">0" },
          month: { ...ranges.month, classroomActivities: ">0" },
          fullRange: { ...ranges.fullRange, classroomActivities: ">0" },
        },
      },
    };
  });

  const totalSessions = students.reduce((n, s) => n + (s.totalSessions || 0), 0);
  const totalAnswers = students.reduce((n, s) => n + (s.totalAnswers || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    fromDate: fromIso,
    toDate: toIso,
    totalStudents: students.length,
    totalSessions,
    totalAnswers,
    students,
  };
}
