/**
 * Math practiced; all other subjects 0 questions in period.
 */

import { buildRealGradeSplitRegressionBaseReport } from "./parent-report-real-regression-payload.mjs";

export function buildMathOnlyOtherSubjectsZeroBaseReport() {
  const base = buildRealGradeSplitRegressionBaseReport();
  base.summary.geometryQuestions = 0;
  base.summary.geometryCorrect = 0;
  base.summary.geometryAccuracy = 0;
  base.summary.englishQuestions = 0;
  base.summary.englishCorrect = 0;
  base.summary.englishAccuracy = 0;
  base.summary.scienceQuestions = 0;
  base.summary.scienceCorrect = 0;
  base.summary.scienceAccuracy = 0;
  base.summary.hebrewQuestions = 0;
  base.summary.hebrewCorrect = 0;
  base.summary.hebrewAccuracy = 0;
  base.summary.moledetGeographyQuestions = 0;
  base.summary.moledetGeographyCorrect = 0;
  base.summary.moledetGeographyAccuracy = 0;
  base.geometryTopics = {};
  base.englishTopics = {};
  base.scienceTopics = {};
  base.hebrewTopics = {};
  base.moledetGeographyTopics = {};
  base.diagnosticEngineV2.units = (base.diagnosticEngineV2.units || []).filter(
    (u) => String(u?.subjectId || "") === "math",
  );
  return base;
}

export default { buildMathOnlyOtherSubjectsZeroBaseReport };
