/**
 * Six-subject context-labeling matrix: per subject —
 * - same topic label at g4 (strong) + g5 (weak)
 * - second topic at registered grade g4 (strong)
 * Generic Hebrew labels only (no production topic hardcoding).
 */

const REPORT_MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  history: "historyTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

/** @type {Record<string, { split: { bucket: string; labelHe: string }; solo: { bucket: string; labelHe: string } }>} */
export const SUBJECT_MATRIX_TOPICS = {
  math: {
    split: { bucket: "matrix_topic_a", labelHe: "נושא א׳" },
    solo: { bucket: "matrix_topic_b", labelHe: "נושא ב׳" },
  },
  geometry: {
    split: { bucket: "matrix_topic_a", labelHe: "נושא א׳" },
    solo: { bucket: "matrix_topic_b", labelHe: "נושא ב׳" },
  },
  english: {
    split: { bucket: "matrix_topic_a", labelHe: "נושא א׳" },
    solo: { bucket: "matrix_topic_b", labelHe: "נושא ב׳" },
  },
  science: {
    split: { bucket: "matrix_topic_a", labelHe: "נושא א׳" },
    solo: { bucket: "matrix_topic_b", labelHe: "נושא ב׳" },
  },
  history: {
    split: { bucket: "matrix_topic_a", labelHe: "נושא א׳" },
    solo: { bucket: "matrix_topic_b", labelHe: "נושא ב׳" },
  },
  hebrew: {
    split: { bucket: "matrix_topic_a", labelHe: "נושא א׳" },
    solo: { bucket: "matrix_topic_b", labelHe: "נושא ב׳" },
  },
  "moledet-geography": {
    split: { bucket: "matrix_topic_a", labelHe: "נושא א׳" },
    solo: { bucket: "matrix_topic_b", labelHe: "נושא ב׳" },
  },
};

export const CONTEXT_LABELING_SUBJECT_IDS = Object.keys(SUBJECT_MATRIX_TOPICS);

/**
 * @param {object} p
 */
function v2Unit(p) {
  const q = p.questions;
  const acc = p.accuracy;
  const correct = Math.round((q * acc) / 100);
  return {
    subjectId: p.subjectId,
    topicRowKey: p.topicRowKey,
    bucketKey: p.bucket,
    displayName: p.displayName,
    classification: { state: "classified", reasonCode: null, weakFallbackBlocked: false },
    evidenceTrace: [{ type: "volume", value: { questions: q, correct, wrong: q - correct, accuracy: acc } }],
    taxonomy: p.patternHe ? { patternHe: p.patternHe, subskillHe: "תת־מיומנות לדוגמה" } : {},
    recurrence: { totalQuestions: q, wrongCountForRules: q - correct },
    confidence: {
      level: q >= 40 ? "high" : "moderate",
      rowSignals: { dataSufficiencyLevel: q >= 40 ? "strong" : "medium", isEarlySignalOnly: false },
    },
    priority: { level: p.actionState === "intervene" ? "P4" : "P2" },
    outputGating: { cannotConcludeYet: false, diagnosisAllowed: true, interventionAllowed: true },
    diagnosis: p.patternHe
      ? { allowed: true, lineHe: p.patternHe, taxonomyId: "matrix_fixture_tax" }
      : { allowed: false },
    canonicalState: {
      actionState: p.actionState,
      assessment: {
        readiness: q >= 40 ? "ready" : "forming",
        confidenceLevel: "high",
        decisionTier: 3,
      },
      evidence: {
        positiveAuthorityLevel: acc >= 85 ? "very_good" : acc <= 45 ? "none" : "good",
      },
    },
  };
}

function mapRow(p) {
  const q = p.questions;
  const acc = p.accuracy;
  const correct = Math.round((q * acc) / 100);
  return {
    displayName: p.displayName,
    questions: q,
    correct,
    wrong: q - correct,
    accuracy: acc,
    timeMinutes: p.timeMinutes ?? Math.max(1, Math.round(q / 8)),
    gradeKey: p.gradeKey,
    modeKey: "learning",
    latestActivityAt: "2026-05-10T12:00:00.000Z",
  };
}

/**
 * @param {string} subjectId
 * @returns {{ splitG4: string; splitG5: string; soloG4: string; splitLabelHe: string; soloLabelHe: string }}
 */
export function matrixRowKeysForSubject(subjectId) {
  const meta = SUBJECT_MATRIX_TOPICS[subjectId];
  if (!meta) throw new Error(`unknown subject ${subjectId}`);
  return {
    splitG4: `${meta.split.bucket}::grade:g4`,
    splitG5: `${meta.split.bucket}::grade:g5`,
    soloG4: `${meta.solo.bucket}::grade:g4`,
    splitLabelHe: meta.split.labelHe,
    soloLabelHe: meta.solo.labelHe,
  };
}

/**
 * Full six-subject labeling matrix (3 practiced rows per subject).
 */
export function buildSixSubjectContextLabelingMatrixBaseReport() {
  const registeredGradeKey = "g4";
  /** @type {Record<string, Record<string, object>>} */
  const topicMaps = {
    mathOperations: {},
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    historyTopics: {},
    hebrewTopics: {},
    moledetGeographyTopics: {},
  };
  /** @type {object[]} */
  const units = [];
  let totalQ = 0;

  for (const subjectId of CONTEXT_LABELING_SUBJECT_IDS) {
    const mk = REPORT_MAP_KEY[subjectId];
    const { splitG4, splitG5, soloG4, splitLabelHe, soloLabelHe } = matrixRowKeysForSubject(subjectId);
    const splitMeta = SUBJECT_MATRIX_TOPICS[subjectId].split;
    const soloMeta = SUBJECT_MATRIX_TOPICS[subjectId].solo;

    topicMaps[mk][splitG4] = mapRow({
      displayName: splitLabelHe,
      questions: 120,
      accuracy: 88,
      gradeKey: "g4",
      timeMinutes: 28,
    });
    topicMaps[mk][splitG5] = mapRow({
      displayName: splitLabelHe,
      questions: 55,
      accuracy: 36,
      gradeKey: "g5",
      timeMinutes: 14,
    });
    topicMaps[mk][soloG4] = mapRow({
      displayName: soloLabelHe,
      questions: 72,
      accuracy: 86,
      gradeKey: "g4",
      timeMinutes: 16,
    });
    totalQ += 247;

    units.push(
      v2Unit({
        subjectId,
        topicRowKey: splitG4,
        bucket: splitMeta.bucket,
        displayName: splitLabelHe,
        questions: 120,
        accuracy: 88,
        actionState: "maintain",
      }),
      v2Unit({
        subjectId,
        topicRowKey: splitG5,
        bucket: splitMeta.bucket,
        displayName: splitLabelHe,
        questions: 55,
        accuracy: 36,
        actionState: "intervene",
        patternHe: `דפוס ${subjectId} ג5`,
      }),
      v2Unit({
        subjectId,
        topicRowKey: soloG4,
        bucket: soloMeta.bucket,
        displayName: soloLabelHe,
        questions: 72,
        accuracy: 86,
        actionState: "maintain",
      }),
    );
  }

  return {
    registeredGradeKey,
    gradePracticeMeta: {
      mixedGradePractice: true,
      mixedGradePracticeNoteHe:
        "חלק מהתרגול בוצע בכיתה שונה מהכיתה הרשומה, ולכן הוא מוצג בנפרד.",
    },
    summary: { totalQuestions: totalQ, overallAccuracy: 72 },
    mathOperations: topicMaps.mathOperations,
    geometryTopics: topicMaps.geometryTopics,
    englishTopics: topicMaps.englishTopics,
    scienceTopics: topicMaps.scienceTopics,
    historyTopics: topicMaps.historyTopics,
    hebrewTopics: topicMaps.hebrewTopics,
    moledetGeographyTopics: topicMaps.moledetGeographyTopics,
    diagnosticEngineV2: { units },
  };
}

export { REPORT_MAP_KEY };

export default {
  SUBJECT_MATRIX_TOPICS,
  CONTEXT_LABELING_SUBJECT_IDS,
  matrixRowKeysForSubject,
  buildSixSubjectContextLabelingMatrixBaseReport,
};
