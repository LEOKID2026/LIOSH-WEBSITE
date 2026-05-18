/**
 * DB/localStorage-shaped regression payload: grade-split fractions + subtraction (3 math rows).
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
      ? { allowed: true, lineHe: p.patternHe, taxonomyId: "regression_tax" }
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
    latestActivityAt: p.latestActivityAt || "2026-05-10T12:00:00.000Z",
  };
}

/**
 * Three math rows: שברים g4 strong, שברים g5 weak, חיסור g4 strong.
 */
export function buildRealGradeSplitRegressionBaseReport() {
  const registeredGradeKey = "g4";
  const kFrac4 = "fractions::grade:g4";
  const kFrac5 = "fractions::grade:g5";
  const kSub4 = "subtraction::grade:g4";
  return {
    registeredGradeKey,
    summary: {
      totalQuestions: 593,
      mathQuestions: 593,
      mathCorrect: 475,
      mathAccuracy: 80,
      overallAccuracy: 80,
    },
    mathOperations: {
      [kFrac4]: mapRow({
        displayName: "שברים",
        questions: 450,
        accuracy: 88,
        gradeKey: "g4",
        timeMinutes: 48,
      }),
      [kFrac5]: mapRow({
        displayName: "שברים",
        questions: 76,
        accuracy: 41,
        gradeKey: "g5",
        timeMinutes: 14,
      }),
      [kSub4]: mapRow({
        displayName: "חיסור",
        questions: 67,
        accuracy: 84,
        gradeKey: "g4",
        timeMinutes: 12,
      }),
    },
    hebrewTopics: {},
    geometryTopics: {},
    englishTopics: {},
    scienceTopics: {},
    moledetGeographyTopics: {},
    diagnosticEngineV2: {
      units: [
        v2Unit({
          subjectId: "math",
          topicRowKey: kFrac4,
          bucket: "fractions",
          displayName: "שברים",
          questions: 450,
          accuracy: 88,
          actionState: "maintain",
        }),
        v2Unit({
          subjectId: "math",
          topicRowKey: kFrac5,
          bucket: "fractions",
          displayName: "שברים",
          questions: 76,
          accuracy: 41,
          actionState: "intervene",
          patternHe: "בלבול בין מכנה ומונה",
        }),
        v2Unit({
          subjectId: "math",
          topicRowKey: kSub4,
          bucket: "subtraction",
          displayName: "חיסור",
          questions: 67,
          accuracy: 84,
          actionState: "maintain",
        }),
      ],
    },
  };
}

export default { buildRealGradeSplitRegressionBaseReport };
