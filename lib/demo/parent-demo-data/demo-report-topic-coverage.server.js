/**
 * Ensure core demo math topics appear in parent report windows (deterministic, demo-only).
 */
import { getDemoParentChildById } from "./children.js";
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import { demoRandInt, demoSeededRandom } from "./seed.js";
import { enrichDemoWrongAnswerPayload } from "./demo-diagnostic-evidence.server.js";
import { attachDemoAnswerTiming, summarizeDemoSessionTiming } from "./demo-answer-time.server.js";
import { compareYmd, iterateYmdInclusive, ymdToIsraelIsoUtc } from "./israel-date.server.js";

/** Topics the regular report should be able to compare in a typical week demo. */
export const DEMO_REPORT_CORE_MATH_TOPICS = Object.freeze([
  "addition",
  "subtraction",
  "division",
  "fractions",
]);

const MIN_ANSWERS_PER_TOPIC = 8;

/**
 * Week-report showcase children — coverage injection must not alter structured profiles.
 * Noam uses demo-noam-math-topic-profile.server.js instead.
 */
export const DEMO_REPORT_MATH_COVERAGE_CHILD_IDS = new Set([]);

/**
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 * @param {Array<Record<string, unknown>>} sessions
 * @param {Array<Record<string, unknown>>} answers
 */
export function ensureDemoReportMathTopicCoverage(childId, fromYmd, toYmd, sessions, answers) {
  const child = getDemoParentChildById(childId);
  if (!child) return;
  const gradeKey = normalizeGradeLevelToKey(child.grade_level) || "g2";

  /** @type {Record<string, number>} */
  const answerCounts = {};
  for (const ans of answers) {
    const payload =
      ans.answer_payload && typeof ans.answer_payload === "object" ? ans.answer_payload : {};
    if (payload.subject !== "math") continue;
    const topic = String(payload.topic || "");
    if (!topic) continue;
    answerCounts[topic] = (answerCounts[topic] || 0) + 1;
  }

  const days = [...iterateYmdInclusive(fromYmd, toYmd)];
  const anchorDay = days[Math.floor(days.length / 2)] || toYmd;

  for (const topic of DEMO_REPORT_CORE_MATH_TOPICS) {
    if ((answerCounts[topic] || 0) >= MIN_ANSWERS_PER_TOPIC) continue;

    const need = MIN_ANSWERS_PER_TOPIC - (answerCounts[topic] || 0);
    const sessionId = `demo-cov-${child.slug}-${topic}-${fromYmd.replace(/-/g, "")}`;
    const sessRnd = demoSeededRandom(childId, fromYmd, toYmd, "coverage", topic);
    const hour = demoRandInt(sessRnd, 10, 15);
    const startedIso = ymdToIsraelIsoUtc(anchorDay, hour, 15);

    /** @type {Array<Record<string, unknown>>} */
    const sessionAnswers = [];

    for (let q = 0; q < need; q += 1) {
      const day = days[q % days.length] || anchorDay;
      const answerHour = hour;
      const isCorrect = q % 5 === 0;
      const answeredIso = ymdToIsraelIsoUtc(day, answerHour, 12 + (q % 45));

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
          hasHints: false,
        },
      };

      if (!isCorrect) {
        payload = enrichDemoWrongAnswerPayload({
          subject: "math",
          topic,
          qIndex: q,
          gradeLevel: child.grade_level,
          basePayload: payload,
        });
      }
      payload = attachDemoAnswerTiming(payload, {
        childId,
        questionKey: `${sessionId}-q${q}`,
        isCorrect,
        attemptIndex: isCorrect ? 0 : 1,
        usedHint: false,
      });

      sessionAnswers.push({
        id: `demo-cov-ans-${sessionId}-${q}`,
        student_id: childId,
        learning_session_id: sessionId,
        question_id: `demo-cov-q-${sessionId}-${q}`,
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
        summary: { totalQuestions: need },
      },
    });
    answers.push(...sessionAnswers);
  }
}

/**
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export function shouldEnsureDemoReportMathCoverage(fromYmd, toYmd) {
  if (!fromYmd || !toYmd) return false;
  if (compareYmd(fromYmd, toYmd) > 0) return false;
  const fromMs = Date.parse(`${fromYmd}T00:00:00.000Z`);
  const toMs = Date.parse(`${toYmd}T00:00:00.000Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return false;
  const days = Math.floor((toMs - fromMs) / 86_400_000) + 1;
  return days >= 5 && days <= 14;
}
