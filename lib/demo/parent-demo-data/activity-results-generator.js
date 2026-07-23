import {
  mapAssignedActivityQuestionAnswerDetail,
  SNAPSHOT_STATUS_FROZEN,
} from "../../classroom-activities/assigned-activity-snapshot.server.js";
import {
  buildAllDemoAssignedActivities,
  resolveDemoActivityStatus,
  computeDemoActivityProgressMeta,
} from "./activities-generator.js";
import { getDemoParentChildById } from "./children.js";
import { demoSeededRandom, demoStableQuestionKey } from "./seed.js";
import { buildDemoRealActivityQuestionSet } from "./demo-real-question-set.server.js";
import { estimateDemoAnswerRawTimeMs } from "./demo-answer-time.server.js";
import { computeAssignedActivityTiming } from "../../learning/timing-policy.js";

export { demoStableQuestionKey } from "./seed.js";

/**
 * @param {number} correct
 * @param {readonly string[]} choices
 */
function pickWrongChoice(correct, choices) {
  const wrong = choices.filter((c) => c !== correct);
  return wrong[0] || correct;
}

/**
 * @param {import("./activities-generator.js").DemoAssignedActivityDef} activity
 * @param {string} gradeLevel
 */
export async function buildDemoActivityQuestionSet(activity, gradeLevel) {
  return buildDemoRealActivityQuestionSet(activity, gradeLevel);
}

/**
 * @param {import("./activities-generator.js").DemoAssignedActivityDef} activity
 * @param {Array<Record<string, unknown>>} questionSet
 * @param {ReturnType<typeof computeDemoActivityProgressMeta>} progress
 * @param {string} childId
 * @param {string} gradeLevel
 */
export function buildDemoActivityAttempts(activity, questionSet, progress, childId, gradeLevel) {
  const { answeredQuestionCount, correctCount } = progress;
  if (!answeredQuestionCount) return [];

  /** @type {Set<number>} */
  const wrongIndices = new Set();
  let wrongNeeded = answeredQuestionCount - correctCount;
  for (let i = 0; i < answeredQuestionCount && wrongNeeded > 0; i += 1) {
    const roll = demoSeededRandom(activity.activityId, "wrong-slot", String(i))();
    if (roll > 0.55) {
      wrongIndices.add(i);
      wrongNeeded -= 1;
    }
  }
  for (let i = 0; i < answeredQuestionCount && wrongNeeded > 0; i += 1) {
    if (!wrongIndices.has(i)) {
      wrongIndices.add(i);
      wrongNeeded -= 1;
    }
  }

  const baseStartMs = activity.startedAtYmd
    ? Date.parse(`${activity.startedAtYmd}T10:00:00.000Z`)
    : Date.parse(`${activity.sentAtYmd}T10:00:00.000Z`);

  /** @type {Array<Record<string, unknown>>} */
  const attempts = [];

  for (let i = 0; i < answeredQuestionCount; i += 1) {
    const frozen = questionSet[i];
    const correct = String(frozen.correct_answer);
    const choices = Array.isArray(frozen.choices) ? frozen.choices.map(String) : [];
    const isWrong = wrongIndices.has(i);
    const selected = isWrong ? pickWrongChoice(correct, choices) : correct;
    const isCorrect = selected === correct;
    const timeRnd = demoSeededRandom(activity.activityId, "time", String(i));
    const hintsUsed = timeRnd() > 0.85 ? 1 : 0;
    /** @type {Record<string, unknown>} */
    const timingPayload = {
      subject: activity.subject,
      topic: activity.topic,
      level: "medium",
      params: frozen.params && typeof frozen.params === "object" ? frozen.params : {},
      contextFlags: { hasHints: hintsUsed > 0 },
    };
    const rawMs = estimateDemoAnswerRawTimeMs(timingPayload, {
      childId,
      questionKey: `${activity.activityId}-q${i}`,
      isCorrect,
      attemptIndex: isWrong ? 1 : 0,
      usedHint: hintsUsed > 0,
    });
    const { rawTimeSpentMs, creditedTimeMs } = computeAssignedActivityTiming(rawMs);
    const answeredAt = new Date(baseStartMs + (i + 1) * (Number(creditedTimeMs) + 5_000)).toISOString();

    attempts.push({
      question_index: i,
      question_key: frozen.qk,
      selected_answer: selected,
      correct_answer: correct,
      is_correct: isCorrect,
      answered_at: answeredAt,
      time_spent_ms: creditedTimeMs ?? rawTimeSpentMs ?? rawMs,
      hints_used: hintsUsed,
      question_snapshot: frozen,
    });
  }

  return attempts;
}

/**
 * Full parent activity detail payload matching real `/api/parent/activities/[id]`.
 * @param {import("./activities-generator.js").DemoAssignedActivityDef} activity
 * @param {string} studentStatus
 * @param {ReturnType<typeof computeDemoActivityProgressMeta>} progress
 * @param {string} gradeLevel
 */
export async function buildDemoActivityDetailFields(
  activity,
  studentStatus,
  progress,
  gradeLevel,
  childId,
) {
  const questionSet = await buildDemoActivityQuestionSet(activity, gradeLevel);
  const rawAttempts = buildDemoActivityAttempts(
    activity,
    questionSet,
    progress,
    childId,
    gradeLevel,
  );
  const questions = mapAssignedActivityQuestionAnswerDetail({
    questionSet,
    attempts: rawAttempts,
    questionCount: activity.questionCount,
    snapshotStatus: SNAPSHOT_STATUS_FROZEN,
    subject: activity.subject,
    topic: activity.topic,
  });

  const attempts = rawAttempts.map((attempt) => ({
    questionIndex: attempt.question_index,
    questionKey: attempt.question_key ?? null,
    isCorrect: attempt.is_correct,
    selectedAnswer: attempt.selected_answer,
    correctAnswer: attempt.correct_answer,
    answeredAt: attempt.answered_at,
    timeSpentMs: attempt.time_spent_ms,
    hintsUsed: attempt.hints_used ?? 0,
  }));

  return { questionSet, rawAttempts, questions, attempts };
}

/**
 * Resolve demo activity definition + detail bundle by id.
 * @param {string} childId
 * @param {string} activityId
 * @param {string} asOfYmd
 */
export async function resolveDemoActivityDetailBundle(childId, activityId, asOfYmd) {
  const child = getDemoParentChildById(childId);
  if (!child) return null;

  const def = buildAllDemoAssignedActivities(childId).find((a) => a.activityId === activityId);
  if (!def) return null;

  const status = resolveDemoActivityStatus(def, asOfYmd);
  if (!status) return null;

  const studentStatus =
    status === "submitted"
      ? "submitted"
      : status === "in_progress"
        ? "in_progress"
        : "not_started";

  const progress = computeDemoActivityProgressMeta(def, studentStatus);
  const detail = await buildDemoActivityDetailFields(
    def,
    studentStatus,
    progress,
    child.grade_level,
    childId,
  );

  return {
    def,
    studentStatus,
    progress,
    ...detail,
  };
}
