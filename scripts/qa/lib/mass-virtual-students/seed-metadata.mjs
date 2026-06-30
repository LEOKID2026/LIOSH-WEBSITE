import { classifyActivityEvidence } from "../../../../lib/learning/activity-classification.js";
import { enrichMetadataFromTaxonomy } from "../../../../utils/diagnostic-engine-v2/topic-taxonomy-metadata-enrichment.js";
import { normalizeDiagnosticSubjectId } from "../../../../utils/diagnostic-evidence.js";
import { SEED_META_KEY } from "./constants.mjs";
import { resolveMassSimAnswerLevelFields } from "./display-level-cohort.mjs";

/** @deprecated use per-subject taxonomy via enrichMetadataFromTaxonomy */
const MATH_ADDITION_TAXONOMY = {
  skillId: "M-03",
  subskillId: "M-03-01",
  taxonomyId: "M-03",
  patternFamily: "addition_basic",
};

function resolvePayloadTaxonomy({ subject, topic, grade, speedPressure, isCorrect }) {
  const subjectId = normalizeDiagnosticSubjectId(subject);
  return enrichMetadataFromTaxonomy({
    subjectId,
    topic,
    contentGradeKey: `g${grade}`,
    source: { params: { kind: "facts" } },
    baseMeta: {
      possibleErrorPatterns: speedPressure && !isCorrect ? ["לחץ זמן"] : [],
      metadataSource: "mass_virtual_students_seed",
    },
  });
}

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
  displayLevel = "regular",
  answerIndex = 0,
}) {
  const levelFields = resolveMassSimAnswerLevelFields(subject, displayLevel, answerIndex);
  const classification = classifyActivityEvidence(
    mode,
    mode === "homework" ? "assigned_parent" : "free_practice",
    { hintsUsed: 0 },
  );

  const taxonomy = resolvePayloadTaxonomy({ subject, topic, grade, speedPressure, isCorrect });
  const skillId = taxonomy.skillId || MATH_ADDITION_TAXONOMY.skillId;
  const subskillId = taxonomy.subskillId || taxonomy.subSkill || MATH_ADDITION_TAXONOMY.subskillId;
  const patternFamily = taxonomy.patternFamily || MATH_ADDITION_TAXONOMY.patternFamily;

  const diagnosticMetadata = {
    possibleErrorPatterns: taxonomy.possibleErrorPatterns || (speedPressure && !isCorrect ? ["לחץ זמן"] : []),
    metadataSource: taxonomy.metadataSource || "question_metadata_normalizer",
    patternFamily,
    taxonomyId: taxonomy.taxonomyId || skillId,
    taxonomyIds: taxonomy.taxonomyIds,
    taxonomyMissing: taxonomy.taxonomyMissing,
  };

  return {
    subject,
    topic,
    gameMode: mode,
    mode,
    level: levelFields.activityDbEnum,
    displayLevel: levelFields.displayLevel,
    sourceDifficulty: levelFields.sourceDifficulty,
    ...(levelFields.regularInternalState
      ? { regularInternalState: levelFields.regularInternalState }
      : {}),
    ...(levelFields.scienceInternalState
      ? { scienceInternalState: levelFields.scienceInternalState }
      : {}),
    gradeLevel: grade,
    ...(speedPressure ? { contentGradeLevel: `g${grade}` } : {}),
    prompt: `Mass sim ${subject}/${topic}`,
    expectedAnswer: "42",
    userAnswer: isCorrect ? "42" : "99",
    hintsUsed: 0,
    timeSpentMs,
    isDiagnosticEligible: classification.isDiagnosticEligible,
    evidenceCategory: classification.evidenceCategory,
    contextFlags: classification.contextFlags || {},
    clientMeta: { [SEED_META_KEY]: runId },
    patternFamily,
    diagnosticMetadata,
    questionEngine: {
      patternFamily,
      skillId,
      subskillId,
    },
    params: {
      kind: "facts",
      skillId,
      subskillId,
      clientMeta: { [SEED_META_KEY]: runId },
    },
    skillId,
    subSkill: subskillId,
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
