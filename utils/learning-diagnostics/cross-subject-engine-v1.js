/**
 * Cross-subject pattern hints (cautious educational language only).
 */

import { getSubjectAccuracyFromSummary, getSubjectQuestionTotalFromSummary } from "./diagnostic-framework-v1.js";

export const CROSS_SUBJECT_ENGINE_V1 = "1.0.0";

/**
 * @param {Record<string, Record<string, unknown>>} maps
 * @param {Record<string, unknown>} summaryCounts
 */
export function detectCrossSubjectPatternsV1(maps, summaryCounts) {
  /** @type {object[]} */
  const patterns = [];

  const mathQ = getSubjectQuestionTotalFromSummary(summaryCounts, "math");
  const hebQ = getSubjectQuestionTotalFromSummary(summaryCounts, "hebrew");
  const engQ = getSubjectQuestionTotalFromSummary(summaryCounts, "english");
  const sciQ = getSubjectQuestionTotalFromSummary(summaryCounts, "science");
  const geoQ = getSubjectQuestionTotalFromSummary(summaryCounts, "geometry");
  const molQ = getSubjectQuestionTotalFromSummary(summaryCounts, "moledet-geography");

  const mathAcc = getSubjectAccuracyFromSummary(summaryCounts, "math");
  const hebAcc = getSubjectAccuracyFromSummary(summaryCounts, "hebrew");

  const weakWordProblems =
    maps?.math &&
    Object.values(maps.math).some(
      (r) =>
        r &&
        String(r.displayName || "").toLowerCase().includes("word") &&
        Number(r.accuracy) < 65 &&
        Number(r.questions) >= 5
    );

  if (
    weakWordProblems &&
    mathQ >= 10 &&
    hebQ >= 10 &&
    Number.isFinite(mathAcc) &&
    Number.isFinite(hebAcc) &&
    mathAcc < 72 &&
    hebAcc < 72
  ) {
    patterns.push({
      crossSubjectPattern: "instruction_or_reading_component_possible",
      involvedSubjects: ["math", "hebrew"],
      evidence: ["Weak math word-problem row with concurrent Hebrew comprehension signal."],
      confidence: "low",
      reasoning: [
        "Both subjects show limited accuracy with adequate volume-may share comprehension/instruction factors.",
      ],
      doNotConclude: [
        "Not a clinical diagnosis.",
        "Requires targeted probes in each subject before attributing shared cause.",
      ],
      nextProbe: { probeType: "cross_subject_check", subjects: ["math", "hebrew"], questionCount: 6 },
    });
  }

  const sciWeak =
    Number.isFinite(getSubjectAccuracyFromSummary(summaryCounts, "science")) &&
    getSubjectAccuracyFromSummary(summaryCounts, "science") < 68 &&
    sciQ >= 8;
  if (sciWeak && hebQ >= 8 && Number.isFinite(hebAcc) && hebAcc < 70) {
    patterns.push({
      crossSubjectPattern: "science_instruction_hebrew_comprehension_overlap",
      involvedSubjects: ["science", "hebrew"],
      evidence: ["Science performance limited alongside Hebrew comprehension metrics."],
      confidence: "low",
      reasoning: ["Scientific items often embed Hebrew reading load."],
      doNotConclude: ["Separate vocabulary vs experiment-logic with probes.", "No disability claims."],
      nextProbe: { probeType: "cross_subject_check", subjects: ["science", "hebrew"], questionCount: 5 },
    });
  }

  if (molQ >= 8 && geoQ >= 8) {
    const molAcc = getSubjectAccuracyFromSummary(summaryCounts, "moledet-geography");
    const gAcc = getSubjectAccuracyFromSummary(summaryCounts, "geometry");
    if (Number.isFinite(molAcc) && Number.isFinite(gAcc) && molAcc < 65 && gAcc < 65) {
      patterns.push({
        crossSubjectPattern: "spatial_reasoning_hypothesis",
        involvedSubjects: ["moledet-geography", "geometry"],
        evidence: ["Both spatial/map-heavy subjects below band simultaneously."],
        confidence: "low",
        reasoning: ["May reflect shared spatial reasoning demands-not definitive."],
        doNotConclude: ["Verify with targeted spatial vs symbolic tasks.", "Educational hypothesis only."],
        nextProbe: { probeType: "cross_subject_check", subjects: ["geometry", "moledet-geography"], questionCount: 4 },
      });
    }
  }

  return {
    version: CROSS_SUBJECT_ENGINE_V1,
    patterns,
    note: "Patterns require evidence in multiple subjects; thin single-subject data cannot trigger.",
  };
}
