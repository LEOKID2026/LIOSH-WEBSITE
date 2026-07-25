/**
 * Deterministic answer rows that let the real LPD resolve a cautious initial_data
 * finding for one Ari topic — without hardcoding engineDecision / findings / ADC.
 */
import { normalizeGradeLevelToKey } from "../../learning-student-defaults.js";
import { attachDemoAnswerTiming, summarizeDemoSessionTiming } from "./demo-answer-time.server.js";
import { ymdToIsraelIsoUtc, compareYmd } from "./israel-date.server.js";

export const ARI_INITIAL_DATA_CHILD_ID = "demo-parent-child-ari-g6";
export const ARI_INITIAL_DATA_SUBJECT = "science";
export const ARI_INITIAL_DATA_TOPIC = "plants";

/**
 * Ensure Ari has exactly two diagnostic answers on science/plants inside the range
 * (after clearing any prior plants rows), so LPD can resolve initial_data naturally.
 *
 * @param {string} childId
 * @param {string} fromYmd
 * @param {string} toYmd
 * @param {{ slug: string, grade_level: string }} child
 * @param {Array<Record<string, unknown>>} sessions
 * @param {Array<Record<string, unknown>>} answers
 */
export function applyAriDemoInitialDataTopic(childId, fromYmd, toYmd, child, sessions, answers) {
  if (childId !== ARI_INITIAL_DATA_CHILD_ID) return;
  if (compareYmd(fromYmd, toYmd) > 0) return;

  for (let i = answers.length - 1; i >= 0; i -= 1) {
    const payload =
      answers[i]?.answer_payload && typeof answers[i].answer_payload === "object"
        ? answers[i].answer_payload
        : {};
    if (
      payload.subject === ARI_INITIAL_DATA_SUBJECT &&
      String(payload.topic || "") === ARI_INITIAL_DATA_TOPIC
    ) {
      answers.splice(i, 1);
    }
  }
  for (let i = sessions.length - 1; i >= 0; i -= 1) {
    const sess = sessions[i];
    if (
      sess.subject === ARI_INITIAL_DATA_SUBJECT &&
      String(sess.topic || "") === ARI_INITIAL_DATA_TOPIC
    ) {
      sessions.splice(i, 1);
    }
  }

  const gradeKey = normalizeGradeLevelToKey(child.grade_level) || "g6";
  const day = fromYmd;
  const sessionId = `demo-ari-initial-${ARI_INITIAL_DATA_TOPIC}-${day.replace(/-/g, "")}`;
  const startedIso = ymdToIsraelIsoUtc(day, 11, 5);
  /** @type {Array<Record<string, unknown>>} */
  const sessionAnswers = [];

  for (let q = 0; q < 2; q += 1) {
    const isCorrect = q === 0;
    const answeredIso = ymdToIsraelIsoUtc(day, 11, 8 + q * 2);
    let payload = {
      subject: ARI_INITIAL_DATA_SUBJECT,
      topic: ARI_INITIAL_DATA_TOPIC,
      gameMode: "practice",
      mode: "practice",
      level: "medium",
      contentGradeLevel: gradeKey,
      gradeLevel: gradeKey,
      isDiagnosticEligible: true,
      evidenceCategory: "diagnostic_independent",
      contextFlags: {
        afterStepByStep: false,
        contextAfterBookReading: false,
        hasHints: false,
      },
      prompt: isCorrect ? "איזה חלק בצמח קולט מים?" : "איזה חלק בצמח מייצר מזון?",
      expectedAnswer: isCorrect ? "שורש" : "עלה",
      userAnswer: isCorrect ? "שורש" : "גבעול",
      correctAnswer: isCorrect ? "שורש" : "עלה",
    };
    payload = attachDemoAnswerTiming(payload, {
      childId,
      questionKey: `${sessionId}-q${q}`,
      isCorrect,
      attemptIndex: isCorrect ? 0 : 1,
      usedHint: false,
    });
    sessionAnswers.push({
      id: `${sessionId}-a${q}`,
      student_id: childId,
      learning_session_id: sessionId,
      question_id: `${sessionId}-q${q}`,
      is_correct: isCorrect,
      answered_at: answeredIso,
      created_at: answeredIso,
      answer_payload: payload,
    });
  }

  const timing = summarizeDemoSessionTiming(sessionAnswers);
  sessions.push({
    id: sessionId,
    student_id: childId,
    subject: ARI_INITIAL_DATA_SUBJECT,
    topic: ARI_INITIAL_DATA_TOPIC,
    started_at: startedIso,
    created_at: startedIso,
    ended_at: sessionAnswers[sessionAnswers.length - 1].answered_at,
    duration_seconds: timing.durationSeconds,
    status: "completed",
    metadata: {
      mode: "practice",
      gameMode: "practice",
      gradeLevel: gradeKey,
      contentGradeLevel: gradeKey,
      summary: { totalQuestions: 2 },
    },
  });
  answers.push(...sessionAnswers);
}
