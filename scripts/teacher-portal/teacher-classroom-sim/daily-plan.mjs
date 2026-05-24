/**
 * Daily plan: one subject, several topics, per-student attendance + sessions.
 */
import { makeRng } from "../../virtual-student-qa/lib/answer-profiles.mjs";
import { gradeNumber, studentLabel } from "./config.mjs";
import { getPersona, resolveProfileForSession } from "./personas.mjs";
import { pickTopicsForDay } from "./subjects.mjs";

const FNV1A_OFFSET = 2166136261;
const FNV1A_PRIME = 16777619;

function fnv1a32(str) {
  let h = FNV1A_OFFSET >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, FNV1A_PRIME) >>> 0;
  }
  return h >>> 0;
}

function rngInRange(rng, lo, hi) {
  const a = Number(lo) || 0;
  const b = Math.max(a, Number(hi) || a);
  return Math.round(a + rng() * (b - a));
}

function pickQuestionCount(rng, profile) {
  if (profile === "weak" || profile === "targeted") return rngInRange(rng, 7, 10);
  if (profile === "strong") return rngInRange(rng, 6, 8);
  return rngInRange(rng, 6, 9);
}

export function generateDailyPlan({
  date,
  grade,
  subject,
  topics,
  manifest,
  state,
  topicsPerDay,
}) {
  const gradeNum = gradeNumber(grade);
  const students = {};

  for (const entry of manifest.students) {
    const slot = entry.slot;
    const label = studentLabel(slot);
    const persona = getPersona(slot);
    const slotKey = String(slot).padStart(2, "0");
    const stateStudent = state.students?.[slotKey] || {};

    const attendanceSeed = fnv1a32(`${date}|${label}|attendance`);
    const attendanceRng = makeRng(attendanceSeed);
    const attends = attendanceRng() < persona.consistency;

    if (!attends) {
      students[label] = {
        slot,
        label,
        studentId: entry.id,
        username: entry.username,
        fullName: entry.fullName,
        studied: false,
        skipReason: "attendance-roll-no",
        personaKind: persona.kind,
        sessions: [],
      };
      continue;
    }

    const numTopics = Math.min(topics.length, topicsPerDay);
    const topicSlice = topics.slice(0, numTopics);
    const sessions = [];

    for (let ti = 0; ti < topicSlice.length; ti++) {
      const topic = topicSlice[ti];
      const sessionSeed = fnv1a32(`${date}|${label}|${subject}|${topic}|${ti}`);
      const sessionRng = makeRng(sessionSeed);
      const profile = resolveProfileForSession(persona, subject, topic, stateStudent);
      const weaknessSubject = persona.weaknesses?.[subject] === "targeted";
      sessions.push({
        subject,
        profile,
        topic,
        grade: gradeNum,
        questionCount: pickQuestionCount(sessionRng, profile),
        intendedMinutes: rngInRange(sessionRng, 8, 15),
        seed: sessionSeed,
        weaknessSubject,
      });
    }

    students[label] = {
      slot,
      label,
      studentId: entry.id,
      username: entry.username,
      fullName: entry.fullName,
      studied: true,
      skipReason: null,
      personaKind: persona.kind,
      defaultProfile: stateStudent.defaultProfile || persona.defaultProfile,
      sessions,
    };
  }

  const studied = Object.values(students).filter((s) => s.studied);
  const totalSessions = studied.reduce((n, s) => n + s.sessions.length, 0);

  return {
    date,
    grade,
    subject,
    topics: topics.slice(0, topicsPerDay),
    generatedAt: new Date().toISOString(),
    students,
    summary: {
      studied: studied.length,
      skipped: Object.values(students).length - studied.length,
      totalSessions,
    },
  };
}
