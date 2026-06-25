import { classifyActivityEvidence } from "../../../../lib/learning/activity-classification.js";
import { SEED_META_KEY } from "./constants.mjs";

/** Minimal taxonomy linkage for math addition speed-pressure QA seed. */
const MATH_ADDITION_TAXONOMY = {
  skillId: "M-03",
  subskillId: "M-03-01",
  taxonomyId: "M-03",
  patternFamily: "addition_basic",
};

/**
 * Build answer_payload aligned with engine expectations (timing, mode, metadata).
 */
export function buildRichAnswerPayload({
  runId,
  subject,
  topic,
  grade,
  mode,
  isCorrect,
  timeSpentMs,
  speedPressure = false,
}) {
  const classification = classifyActivityEvidence(
    mode,
    mode === "homework" ? "assigned_parent" : "free_practice",
    { hintsUsed: 0 },
  );

  const diagnosticMetadata = {
    possibleErrorPatterns: speedPressure && !isCorrect ? ["לחץ זמן"] : [],
    metadataSource: "question_metadata_normalizer",
    patternFamily: MATH_ADDITION_TAXONOMY.patternFamily,
  };

  return {
    subject,
    topic,
    gameMode: mode,
    mode,
    level: "medium",
    gradeLevel: grade,
    prompt: `Mass sim ${subject}/${topic}`,
    expectedAnswer: "42",
    userAnswer: isCorrect ? "42" : "99",
    hintsUsed: 0,
    timeSpentMs,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    evidenceCategory: classification.evidenceCategory,
    contextFlags: classification.contextFlags || {},
    clientMeta: { [SEED_META_KEY]: runId },
    patternFamily: MATH_ADDITION_TAXONOMY.patternFamily,
    diagnosticMetadata,
    questionEngine: {
      patternFamily: MATH_ADDITION_TAXONOMY.patternFamily,
      skillId: MATH_ADDITION_TAXONOMY.skillId,
      subskillId: MATH_ADDITION_TAXONOMY.subskillId,
    },
    params: {
      kind: "facts",
      skillId: MATH_ADDITION_TAXONOMY.skillId,
      subskillId: MATH_ADDITION_TAXONOMY.subskillId,
      clientMeta: { [SEED_META_KEY]: runId },
    },
    skillId: MATH_ADDITION_TAXONOMY.skillId,
    subSkill: MATH_ADDITION_TAXONOMY.subskillId,
  };
}

/**
 * Self-practice speed answers are excluded by parent-report evidence gate.
 * Engine override requires modeKey=speed — use practice answers + speed session shells.
 */
export function buildSpeedPressureAnswerSchedule({
  count = 28,
  correctRate = 0.68,
  day,
  startHour = 10,
  minWrong = 0,
}) {
  const answers = [];
  let targetWrong = Math.max(minWrong, Math.round(count * (1 - correctRate)));
  targetWrong = Math.min(Math.max(0, count - 1), targetWrong);

  for (let i = 0; i < count; i += 1) {
    const isWrong = i >= count - targetWrong;
    const timeSpentMs = isWrong ? 800 + (i % 5) * 220 : 7500 + (i % 4) * 900;
    answers.push({
      isCorrect: !isWrong,
      timeSpentMs,
      answeredAt: `${day}T${String(startHour + (i % 4)).padStart(2, "0")}:${String(12 + (i * 3) % 48).padStart(2, "0")}:00.000Z`,
    });
  }
  return answers;
}

export { MATH_ADDITION_TAXONOMY, SEED_META_KEY };
