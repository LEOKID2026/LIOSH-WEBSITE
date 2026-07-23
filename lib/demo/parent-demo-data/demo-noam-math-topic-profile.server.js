/**
 * Noam (g2) — structured virtual math practice so the real report engine
 * receives diverse topic-level decisions (demo data only).
 *
 * Questions are scheduled across the full demo history (DEMO_HISTORY_START → today).
 * Each report range includes only rows whose scheduled day falls inside that range.
 */
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import { enrichDemoWrongAnswerPayload } from "./demo-diagnostic-evidence.server.js";
import {
  attachDemoAnswerTiming,
  demoQuestionNavGapMs,
  summarizeDemoSessionTiming,
} from "./demo-answer-time.server.js";
import { DEMO_HISTORY_START } from "./constants.js";
import {
  compareYmd,
  iterateYmdInclusive,
  todayYmdIsrael,
  ymdToIsraelIsoUtc,
} from "./israel-date.server.js";

export const NOAM_DEMO_CHILD_ID = "demo-parent-child-noam-g2";

/** Topics whose math rows are fully owned by this profile (replaces random demo rows). */
export const NOAM_STRUCTURED_MATH_TOPICS = Object.freeze([
  "addition",
  "subtraction",
  "division",
  "compare",
  "fractions",
]);

/**
 * Per-topic virtual practice shape for the **full** demo history window.
 * early/late splits drive trendV1 inside the real engine on long ranges.
 *
 * @typedef {{
 *   totalQuestions: number,
 *   earlyCorrect: number,
 *   earlyTotal: number,
 *   lateCorrect: number,
 *   lateTotal: number,
 *   sessions: number,
 * }} NoamTopicSpec
 */

/** @type {Record<string, NoamTopicSpec>} */
const NOAM_MATH_TOPIC_SPECS = Object.freeze({
  addition: {
    totalQuestions: 48,
    earlyCorrect: 9,
    earlyTotal: 24,
    lateCorrect: 19,
    lateTotal: 24,
    sessions: 8,
  },
  subtraction: {
    totalQuestions: 52,
    earlyCorrect: 10,
    earlyTotal: 26,
    lateCorrect: 10,
    lateTotal: 26,
    sessions: 9,
  },
  division: {
    totalQuestions: 34,
    earlyCorrect: 9,
    earlyTotal: 17,
    lateCorrect: 9,
    lateTotal: 17,
    sessions: 6,
  },
  compare: {
    totalQuestions: 38,
    earlyCorrect: 12,
    earlyTotal: 18,
    lateCorrect: 17,
    lateTotal: 20,
    sessions: 7,
  },
  fractions: {
    totalQuestions: 6,
    earlyCorrect: 1,
    earlyTotal: 3,
    lateCorrect: 2,
    lateTotal: 3,
    sessions: 2,
  },
});

/**
 * @param {number} n
 * @param {number} correctCount
 */
function buildCorrectnessSequence(n, correctCount) {
  const total = Math.max(0, Math.floor(n));
  const correct = Math.max(0, Math.min(total, Math.floor(correctCount)));
  /** @type {boolean[]} */
  const seq = [];
  let remainingCorrect = correct;
  let remainingWrong = total - correct;
  for (let i = 0; i < total; i += 1) {
    const slotsLeft = total - i;
    const pickCorrect =
      remainingCorrect > 0 &&
      (remainingWrong === 0 || remainingCorrect / slotsLeft >= remainingWrong / slotsLeft);
    if (pickCorrect) {
      seq.push(true);
      remainingCorrect -= 1;
    } else {
      seq.push(false);
      remainingWrong -= 1;
    }
  }
  return seq;
}

/**
 * @param {NoamTopicSpec} spec
 */
function buildTopicCorrectnessTimeline(spec) {
  const early = buildCorrectnessSequence(spec.earlyTotal, spec.earlyCorrect);
  const late = buildCorrectnessSequence(spec.lateTotal, spec.lateCorrect);
  return [...early, ...late];
}

/**
 * @param {string[]} days
 * @param {number} count
 */
function pickSpreadDays(days, count) {
  if (!days.length || count <= 0) return [];
  if (count >= days.length) {
    /** @type {string[]} */
    const out = [];
    for (let i = 0; i < count; i += 1) {
      out.push(days[i % days.length]);
    }
    return out;
  }
  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor((i * days.length) / count);
    out.push(days[Math.min(idx, days.length - 1)]);
  }
  return out;
}

/**
 * Build immutable schedule for one topic across the full demo history.
 * @param {string} topic
 * @param {NoamTopicSpec} spec
 * @param {string[]} fullHistoryDays
 * @returns {Array<{ day: string, isCorrect: boolean, globalIndex: number }>}
 */
function buildNoamTopicFullHistorySchedule(topic, spec, fullHistoryDays) {
  const timeline = buildTopicCorrectnessTimeline(spec);
  const midIdx = Math.floor(fullHistoryDays.length / 2);
  const earlyDays = fullHistoryDays.slice(0, Math.max(1, midIdx));
  const lateDays = fullHistoryDays.slice(Math.max(1, midIdx));
  const earlySlots = pickSpreadDays(earlyDays, spec.earlyTotal);
  const lateSlots = pickSpreadDays(lateDays, spec.lateTotal);
  const daySlots = [...earlySlots, ...lateSlots];

  /** @type {Array<{ day: string, isCorrect: boolean, globalIndex: number }>} */
  const schedule = [];
  for (let i = 0; i < timeline.length; i += 1) {
    schedule.push({
      day: daySlots[Math.min(i, daySlots.length - 1)] || fullHistoryDays[0],
      isCorrect: timeline[i],
      globalIndex: i,
    });
  }
  void topic;
  return schedule;
}

/**
 * @param {string} ymd
 * @param {string} fromYmd
 * @param {string} toYmd
 */
function dayInRange(ymd, fromYmd, toYmd) {
  return compareYmd(ymd, fromYmd) >= 0 && compareYmd(ymd, toYmd) <= 0;
}

/**
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 * @param {{ slug: string, grade_level: string }} child
 * @param {Array<Record<string, unknown>>} sessions
 * @param {Array<Record<string, unknown>>} answers
 */
export function applyNoamDemoMathTopicProfile(childId, fromYmd, toYmd, child, sessions, answers) {
  if (childId !== NOAM_DEMO_CHILD_ID) return;

  const controlled = new Set(NOAM_STRUCTURED_MATH_TOPICS);
  const removedSessionIds = new Set();

  for (let i = answers.length - 1; i >= 0; i -= 1) {
    const row = answers[i];
    const payload =
      row?.answer_payload && typeof row.answer_payload === "object" ? row.answer_payload : {};
    if (payload.subject === "math" && controlled.has(String(payload.topic || ""))) {
      removedSessionIds.add(String(row.learning_session_id || ""));
      answers.splice(i, 1);
    }
  }

  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    const sess = sessions[i];
    if (
      removedSessionIds.has(String(sess.id || "")) ||
      (sess.subject === "math" && controlled.has(String(sess.topic || "")))
    ) {
      sessions.splice(i, 1);
    }
  }

  const historyEnd = todayYmdIsrael();
  const fullHistoryDays = [...iterateYmdInclusive(DEMO_HISTORY_START, historyEnd)];
  if (!fullHistoryDays.length) return;

  const gradeKey = normalizeGradeLevelToKey(child.grade_level) || "g2";

  for (const topic of NOAM_STRUCTURED_MATH_TOPICS) {
    const spec = NOAM_MATH_TOPIC_SPECS[topic];
    if (!spec) continue;

    const schedule = buildNoamTopicFullHistorySchedule(topic, spec, fullHistoryDays);
    const inRange = schedule.filter((slot) => dayInRange(slot.day, fromYmd, toYmd));
    if (!inRange.length) continue;

    /** @type {Map<string, typeof inRange>} */
    const byDay = new Map();
    for (const slot of inRange) {
      const list = byDay.get(slot.day) || [];
      list.push(slot);
      byDay.set(slot.day, list);
    }

    for (const [day, daySlots] of byDay) {
      const sessionId = `demo-noam-math-${topic}-${day.replace(/-/g, "")}`;
      const hour = 9 + (daySlots[0].globalIndex % 8);
      const startedIso = ymdToIsraelIsoUtc(day, hour, 10);
      let sessionCursorMs = Date.parse(startedIso);
      /** @type {Array<Record<string, unknown>>} */
      const sessionAnswers = [];

      for (let q = 0; q < daySlots.length; q += 1) {
        const slot = daySlots[q];
        const isCorrect = slot.isCorrect;
        const usedHint = !isCorrect && slot.globalIndex % 4 === 0;

        if (q > 0) {
          sessionCursorMs += demoQuestionNavGapMs(childId, sessionId, q - 1);
        }

        /** @type {Record<string, unknown>} */
        let payload = {
          subject: "math",
          topic,
          gameMode: "practice",
          level: "medium",
          isDiagnosticEligible: true,
          evidenceCategory: "diagnostic_independent",
          contextFlags: {
            afterStepByStep: false,
            contextAfterBookReading: false,
            hasHints: usedHint,
          },
        };

        if (!isCorrect) {
          payload = enrichDemoWrongAnswerPayload({
            subject: "math",
            topic,
            qIndex: slot.globalIndex,
            gradeLevel: child.grade_level,
            basePayload: payload,
          });
        }

        payload = attachDemoAnswerTiming(payload, {
          childId,
          questionKey: `${sessionId}-g${slot.globalIndex}`,
          isCorrect,
          attemptIndex: isCorrect ? 0 : 1,
          usedHint,
        });

        const creditedMs = Number(payload.creditedTimeMs) || 0;
        sessionCursorMs += creditedMs;
        const answeredIso = new Date(sessionCursorMs).toISOString();

        sessionAnswers.push({
          id: `demo-noam-math-ans-${sessionId}-${slot.globalIndex}`,
          student_id: childId,
          learning_session_id: sessionId,
          question_id: `demo-noam-math-q-${sessionId}-${slot.globalIndex}`,
          is_correct: isCorrect,
          answered_at: answeredIso,
          created_at: answeredIso,
          answer_payload: payload,
        });
      }

      const timing = summarizeDemoSessionTiming(sessionAnswers, childId, sessionId);
      const endedIso = new Date(Date.parse(startedIso) + timing.totalSpanMs).toISOString();

      sessions.push({
        id: sessionId,
        student_id: childId,
        subject: "math",
        topic,
        started_at: startedIso,
        created_at: startedIso,
        ended_at: endedIso,
        duration_seconds: timing.durationSeconds,
        status: "completed",
        metadata: {
          mode: "practice",
          gameMode: "practice",
          gradeLevel: gradeKey,
          contentGradeLevel: gradeKey,
          summary: { totalQuestions: sessionAnswers.length },
        },
      });
      answers.push(...sessionAnswers);
    }
  }
}
