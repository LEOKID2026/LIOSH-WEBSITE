import { DEMO_HISTORY_START, DEMO_PARENT_SUBJECTS } from "./constants.js";
import { getDemoParentChildById } from "./children.js";
import { getDemoChildProfile, pickDemoSubject } from "./profiles.js";
import { pickDemoTopicKey } from "./subject-topics.js";
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import {
  compareYmd,
  isIsraelWeekend,
  iterateYmdInclusive,
  todayYmdIsrael,
  ymdToIsraelIsoUtc,
  ymdToUtcDate,
} from "./israel-date.server.js";
import { demoRandInt, demoSeededRandom } from "./seed.js";
import { enrichDemoWrongAnswerPayload } from "./demo-diagnostic-evidence.server.js";
import {
  attachDemoAnswerTiming,
  demoQuestionNavGapMs,
  summarizeDemoSessionTiming,
} from "./demo-answer-time.server.js";
import { applyNoamDemoMathTopicProfile } from "./demo-noam-math-topic-profile.server.js";

/**
 * @typedef {{ id: string, student_id: string, subject: string, topic: string, started_at: string, created_at: string, ended_at: string, duration_seconds: number, status: string, metadata: { mode: string, summary?: { totalQuestions: number } } }} DemoLearningSession
 * @typedef {{ id: string, student_id: string, learning_session_id: string, question_id: string, is_correct: boolean, answered_at: string, created_at: string, answer_payload: Record<string, unknown> }} DemoLearningAnswer
 */

/**
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 * @returns {{ sessions: DemoLearningSession[], answers: DemoLearningAnswer[] }}
 */
export function generateDemoLearningRowsForRange(childId, fromYmd, toYmd) {
  const child = getDemoParentChildById(childId);
  if (!child) return { sessions: [], answers: [] };

  const endYmd = compareYmd(toYmd, todayYmdIsrael()) > 0 ? todayYmdIsrael() : toYmd;
  const startYmd = compareYmd(fromYmd, DEMO_HISTORY_START) < 0 ? DEMO_HISTORY_START : fromYmd;
  if (compareYmd(startYmd, endYmd) > 0) return { sessions: [], answers: [] };

  const profile = getDemoChildProfile(child);
  /** @type {DemoLearningSession[]} */
  const sessions = [];
  /** @type {DemoLearningAnswer[]} */
  const answers = [];

  for (const ymd of iterateYmdInclusive(startYmd, endYmd)) {
    const dayRnd = demoSeededRandom(childId, ymd, "day");
    const rate = isIsraelWeekend(ymd) ? profile.weekendActivityRate : profile.weekdayActivityRate;
    if (dayRnd() > rate) continue;

    const sessionCount = demoRandInt(dayRnd, profile.sessionsMin, profile.sessionsMax);
    for (let s = 0; s < sessionCount; s++) {
      const sessRnd = demoSeededRandom(childId, ymd, "session", String(s));
      const subject = pickDemoSubject(profile, sessRnd);
      if (!DEMO_PARENT_SUBJECTS.includes(subject)) continue;
      const topic = pickDemoTopicKey(child.grade_level, subject, sessRnd);
      const qCount = demoRandInt(sessRnd, profile.questionsMin, profile.questionsMax);
      const bias = profile.accuracyBias[subject] ?? 0;
      const baseAcc = 0.62 + bias;
      const gradeKey = normalizeGradeLevelToKey(child.grade_level) || "g2";
      const hour = demoRandInt(sessRnd, 8, 19);
      const minute = demoRandInt(sessRnd, 0, 59);
      const startedIso = ymdToIsraelIsoUtc(ymd, hour, minute);
      const sessionId = `demo-sess-${child.slug}-${ymd.replace(/-/g, "")}-${s}`;

      /** @type {DemoLearningAnswer[]} */
      const sessionAnswers = [];
      let sessionCursorMs = Date.parse(startedIso);

      for (let q = 0; q < qCount; q += 1) {
        const ansRnd = demoSeededRandom(childId, sessionId, "q", String(q));
        const isCorrect = ansRnd() < Math.min(0.95, Math.max(0.25, baseAcc));
        const usedHint = !isCorrect && ansRnd() > 0.88;

        if (q > 0) {
          sessionCursorMs += demoQuestionNavGapMs(childId, sessionId, q - 1);
        }

        /** @type {Record<string, unknown>} */
        let answerPayload = {
          subject,
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
          answerPayload = enrichDemoWrongAnswerPayload({
            subject,
            topic,
            qIndex: q,
            gradeLevel: child.grade_level,
            basePayload: answerPayload,
          });
        }
        answerPayload = attachDemoAnswerTiming(answerPayload, {
          childId,
          questionKey: `${sessionId}-q${q}`,
          isCorrect,
          attemptIndex: isCorrect ? 0 : 1,
          usedHint,
        });

        const creditedMs = Number(answerPayload.creditedTimeMs) || 0;
        sessionCursorMs += creditedMs;
        const answeredIso = new Date(sessionCursorMs).toISOString();

        sessionAnswers.push({
          id: `demo-ans-${sessionId}-${q}`,
          student_id: childId,
          learning_session_id: sessionId,
          question_id: `demo-q-${sessionId}-${q}`,
          is_correct: isCorrect,
          answered_at: answeredIso,
          created_at: answeredIso,
          answer_payload: answerPayload,
        });
      }

      const timing = summarizeDemoSessionTiming(sessionAnswers, childId, sessionId);
      const endedIso = new Date(Date.parse(startedIso) + timing.totalSpanMs).toISOString();

      sessions.push({
        id: sessionId,
        student_id: childId,
        subject,
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
          summary: { totalQuestions: qCount },
        },
      });
      answers.push(...sessionAnswers);
    }
  }

  applyNoamDemoMathTopicProfile(childId, startYmd, endYmd, child, sessions, answers);

  return { sessions, answers };
}

/**
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export function generateDemoLearningRows(childId, fromYmd, toYmd) {
  return generateDemoLearningRowsForRange(childId, fromYmd, toYmd);
}

export { ymdToUtcDate, todayYmdIsrael, DEMO_HISTORY_START };
