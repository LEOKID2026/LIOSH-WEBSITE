/**
 * Generic multi-subject fixtures for parent report output integrity (no real topic names from PDFs).
 */

const SUBJECT_TOPIC = {
  math: { bucket: "topic_alpha", labelHe: "נושא א׳" },
  geometry: { bucket: "topic_beta", labelHe: "נושא ב׳" },
  english: { bucket: "topic_gamma", labelHe: "נושא ג׳" },
  hebrew: { bucket: "topic_delta", labelHe: "נושא ד׳" },
  science: { bucket: "topic_epsilon", labelHe: "נושא ה׳" },
  "moledet-geography": { bucket: "topic_zeta", labelHe: "נושא ו׳" },
};

const REPORT_MAP_KEY = {
  math: "mathOperations",
  geometry: "geometryTopics",
  english: "englishTopics",
  science: "scienceTopics",
  hebrew: "hebrewTopics",
  "moledet-geography": "moledetGeographyTopics",
};

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
      ? { allowed: true, lineHe: p.patternHe, taxonomyId: "fixture_tax" }
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
  return {
    displayName: p.displayName,
    questions: q,
    correct: Math.round((q * acc) / 100),
    wrong: q - Math.round((q * acc) / 100),
    accuracy: acc,
    timeMinutes: p.timeMinutes ?? Math.max(1, Math.round(q / 8)),
    gradeKey: p.gradeKey,
    modeKey: "learning",
  };
}

/**
 * Grade-split duplicate label scenario (generic topic names only).
 */
export function buildGradeSplitBaseReport() {
  const registeredGradeKey = "g4";
  const sid = "math";
  const meta = SUBJECT_TOPIC[sid];
  const k4 = `${meta.bucket}::grade:g4`;
  const k5 = `${meta.bucket}::grade:g5`;
  return {
    registeredGradeKey,
    summary: { totalQuestions: 433, mathQuestions: 433, mathCorrect: 350, mathAccuracy: 81, overallAccuracy: 81 },
    mathOperations: {
      [k4]: mapRow({ displayName: meta.labelHe, questions: 367, accuracy: 87, gradeKey: "g4", timeMinutes: 42 }),
      [k5]: mapRow({
        displayName: meta.labelHe,
        questions: 66,
        accuracy: 38,
        gradeKey: "g5",
        timeMinutes: 12,
      }),
    },
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    hebrewTopics: {},
    moledetGeographyTopics: {},
    diagnosticEngineV2: {
      units: [
        v2Unit({
          subjectId: sid,
          topicRowKey: k4,
          bucket: meta.bucket,
          displayName: meta.labelHe,
          questions: 367,
          accuracy: 87,
          actionState: "maintain",
        }),
        v2Unit({
          subjectId: sid,
          topicRowKey: k5,
          bucket: meta.bucket,
          displayName: meta.labelHe,
          questions: 66,
          accuracy: 38,
          actionState: "intervene",
          patternHe: "דפוס טעות חוזר לדוגמה",
        }),
      ],
    },
  };
}

/**
 * Full six-subject matrix with one strong + one weak row per subject where applicable.
 */
export function buildMultiSubjectMatrixBaseReport() {
  const registeredGradeKey = "g4";
  /** @type {Record<string, Record<string, object>>} */
  const topicMaps = {
    mathOperations: {},
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    hebrewTopics: {},
    moledetGeographyTopics: {},
  };
  /** @type {object[]} */
  const units = [];
  let totalQ = 0;

  for (const [subjectId, meta] of Object.entries(SUBJECT_TOPIC)) {
    const mk = REPORT_MAP_KEY[subjectId];
    const strongKey = `${meta.bucket}::grade:g4`;
    const weakKey = `${meta.bucket}::grade:g5`;
    topicMaps[mk][strongKey] = mapRow({
      displayName: meta.labelHe,
      questions: 120,
      accuracy: 88,
      gradeKey: "g4",
      timeMinutes: 25,
    });
    topicMaps[mk][weakKey] = mapRow({
      displayName: meta.labelHe,
      questions: 55,
      accuracy: 36,
      gradeKey: "g5",
      timeMinutes: 14,
    });
    totalQ += 175;
    units.push(
      v2Unit({
        subjectId,
        topicRowKey: strongKey,
        bucket: meta.bucket,
        displayName: meta.labelHe,
        questions: 120,
        accuracy: 88,
        actionState: "maintain",
        patternHe: subjectId === "math" ? `דפוס ${subjectId}` : undefined,
      }),
      v2Unit({
        subjectId,
        topicRowKey: weakKey,
        bucket: meta.bucket,
        displayName: meta.labelHe,
        questions: 55,
        accuracy: 36,
        actionState: "intervene",
        patternHe: `דפוס ${subjectId}`,
      }),
    );
  }

  return {
    registeredGradeKey,
    summary: { totalQuestions: totalQ, overallAccuracy: 70 },
    ...topicMaps,
    diagnosticEngineV2: { units },
  };
}

export const OUTPUT_INTEGRITY_SUBJECT_IDS = Object.keys(SUBJECT_TOPIC);

export { SUBJECT_TOPIC };

export default {
  buildGradeSplitBaseReport,
  buildMultiSubjectMatrixBaseReport,
  OUTPUT_INTEGRITY_SUBJECT_IDS,
  SUBJECT_TOPIC,
};
