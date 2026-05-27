import { isQuestionTypeAutoGradable } from "./worksheet-shared.server.js";

/**
 * @param {unknown} value
 */
function normalizeAnswerScalar(value) {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "value" in value) {
    return normalizeAnswerScalar(/** @type {Record<string, unknown>} */ (value).value);
  }
  return String(value).trim().toLowerCase();
}

/**
 * @param {unknown} studentAnswer
 * @param {unknown} correctAnswer
 * @param {string} questionType
 */
export function gradeWorksheetAnswer(studentAnswer, correctAnswer, questionType) {
  if (!isQuestionTypeAutoGradable(questionType)) {
    return { autoIsCorrect: null, autoScore: null };
  }
  if (correctAnswer == null) {
    return { autoIsCorrect: null, autoScore: null };
  }

  if (questionType === "numeric") {
    const studentNum = Number(normalizeAnswerScalar(studentAnswer));
    const correctNum = Number(normalizeAnswerScalar(correctAnswer));
    if (!Number.isFinite(studentNum) || !Number.isFinite(correctNum)) {
      return { autoIsCorrect: false, autoScore: 0 };
    }
    const match = studentNum === correctNum;
    return { autoIsCorrect: match, autoScore: match ? 1 : 0 };
  }

  const studentNorm = normalizeAnswerScalar(studentAnswer);
  const correctNorm = normalizeAnswerScalar(correctAnswer);
  const match = studentNorm === correctNorm && studentNorm !== "";
  return { autoIsCorrect: match, autoScore: match ? 1 : 0 };
}

/**
 * @param {Array<{ points: number|null, isAutoGradable: boolean, correctAnswer: unknown }>} questions
 * @param {Array<{ questionIndex: number, answerValue: unknown, autoIsCorrect: boolean|null, autoScore: number|null, teacherScore: number|null, teacherOverride: boolean }>} answers
 */
export function computeAutoScorePct(questions, answers) {
  let earned = 0;
  let possible = 0;

  for (const q of questions) {
    const pts = q.points != null && q.points > 0 ? Number(q.points) : 1;
    possible += pts;
    const ans = answers.find((a) => a.questionIndex === q.questionIndex);
    if (!ans) continue;
    if (ans.teacherOverride && ans.teacherScore != null) {
      earned += Math.min(pts, Math.max(0, Number(ans.teacherScore)));
      continue;
    }
    if (ans.autoIsCorrect === true) {
      earned += pts;
    } else if (ans.autoIsCorrect === false) {
      earned += 0;
    }
  }

  if (possible <= 0) return null;
  return Math.round((earned / possible) * 10000) / 100;
}

/**
 * @param {Array<{ points: number|null }>} questions
 * @param {Array<{ questionIndex: number, teacherScore: number|null, autoIsCorrect: boolean|null, autoScore: number|null, teacherOverride: boolean }>} answers
 */
export function computeFinalScorePct(questions, answers) {
  let earned = 0;
  let possible = 0;

  for (const q of questions) {
    const pts = q.points != null && q.points > 0 ? Number(q.points) : 1;
    possible += pts;
    const ans = answers.find((a) => a.questionIndex === q.questionIndex);
    if (!ans) continue;

    if (ans.teacherScore != null) {
      earned += Math.min(pts, Math.max(0, Number(ans.teacherScore)));
    } else if (ans.autoIsCorrect === true) {
      earned += pts;
    }
  }

  if (possible <= 0) return null;
  return Math.round((earned / possible) * 10000) / 100;
}

/**
 * @param {Array<{ questionType: string, isAutoGradable: boolean, correctAnswer: unknown }>} questions
 */
export function submissionRequiresTeacherReview(questions) {
  return questions.some((q) => {
    if (!isQuestionTypeAutoGradable(q.questionType)) return true;
    if (q.isAutoGradable && q.correctAnswer == null) return true;
    return false;
  });
}
