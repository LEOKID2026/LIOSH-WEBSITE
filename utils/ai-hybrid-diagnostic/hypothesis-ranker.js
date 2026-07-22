import { TAXONOMY_BY_ID } from "../diagnostic-engine-v2/taxonomy-registry.js";
import { taxonomyIdsForReportBucket } from "../diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { passesEvidenceRecurrenceRules } from "../diagnostic-engine-v2/evidence-recurrence.js";
import { filterMistakesForRow } from "../parent-report-row-trend.js";
import { NUMERIC_GATES } from "./constants.js";
import { taxonomyPriorBoost } from "./learning-loop.js";

function softmax(logits) {
  const m = Math.max(...logits);
  const ex = logits.map((z) => Math.exp(z - m));
  const s = ex.reduce((a, b) => a + b, 0) || 1;
  return ex.map((e) => e / s);
}

/**
 * @param {object} p
 * @param {object} p.unit
 * @param {object|null} p.row
 * @param {Record<string, unknown>} p.features
 * @param {unknown[]} p.rawMistakes
 * @param {number} p.startMs
 * @param {number} p.endMs
 * @param {import("./learning-loop.js").HybridLearningState|null} p.learningState
 * @param {string} p.mode assist|rank_only|explain_only|suppressed
 */
export function rankHypotheses({ unit, row, features, rawMistakes, startMs, endMs, learningState, mode }) {
  const empty = {
    candidates: [],
    top1Id: "",
    top1Probability: 0,
    calibratedProbability: 0,
    calibrationBand: /** @type {"well_calibrated"|"borderline"|"uncalibrated"} */ ("uncalibrated"),
    ambiguityScore: 1,
  };

  if (mode === "suppressed" || mode === "explain_only") {
    return { ...empty, calibrationBand: mode === "explain_only" ? "well_calibrated" : "uncalibrated" };
  }

  const subjectId = String(unit?.subjectId || "");
  const topicRowKey = String(unit?.topicRowKey || "");
  const bucketKey = String(unit?.bucketKey || "");
  const rowObj = row && typeof row === "object" ? row : {};
  const events = row ? filterMistakesForRow(subjectId, topicRowKey, rowObj, rawMistakes || [], startMs, endMs) : [];
  const wrongs = events.filter((e) => !e.isCorrect);

  let candidateIds = taxonomyIdsForReportBucket(subjectId, bucketKey);
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return empty;
  }
  candidateIds = [...new Set(candidateIds)];
  const v2Chosen = unit?.taxonomy?.id || unit?.diagnosis?.taxonomyId || null;

  const logits = candidateIds.map((tid) => {
    const trow = TAXONOMY_BY_ID[tid];
    if (!trow) return -99;
    let logit = passesEvidenceRecurrenceRules(wrongs, trow) ? 1.2 : 0.2;
    if (tid === v2Chosen) logit += 2.0;
    logit += taxonomyPriorBoost(tid, learningState || { taxonomyLiftByKey: {} });
    const wrongRate = wrongs.length / Math.max(1, events.length || 1);
    logit += wrongRate * 0.8;
    return logit;
  });

  let probs = softmax(logits);
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum <= 0 || Math.abs(sum - 1) > NUMERIC_GATES.probabilitySumTolerance + 0.5) {
    return { ...empty, calibrationBand: "uncalibrated" };
  }
  probs = probs.map((p) => p / sum);

  const order = candidateIds
    .map((id, i) => ({ candidateId: id, idx: i, p: probs[i] }))
    .sort((a, b) => b.p - a.p);

  const ranked = order.map((o, rank) => {
    const tid = o.candidateId;
    const calibrated = o.p;
    const supportDelta = tid === v2Chosen ? 0.08 : -0.02;
    return {
      candidateId: tid,
      rank: rank + 1,
      probability: o.p,
      calibratedProbability: calibrated,
      confidenceSupportDelta: supportDelta,
    };
  });

  const sortedP = [...probs].sort((a, b) => b - a);
  const top = sortedP[0] || 0;
  const second = sortedP[1] || 0;
  const entropy = -probs.reduce((acc, pr) => acc + (pr > 1e-9 ? pr * Math.log(pr) : 0), 0);
  const maxEnt = Math.log(Math.max(2, probs.length));
  const ambiguityScore = maxEnt > 1e-6 ? Math.min(1, entropy / maxEnt) : 0;

  let calibrationBand = /** @type {"well_calibrated"|"borderline"|"uncalibrated"} */ ("well_calibrated");
  if (ambiguityScore > 0.55 || top - second < 0.08) calibrationBand = "borderline";
  if (ambiguityScore > 0.82) calibrationBand = "uncalibrated";

  const top1 = ranked[0];
  return {
    candidates: ranked,
    top1Id: top1?.candidateId || "",
    top1Probability: top1?.probability || 0,
    calibratedProbability: top1?.calibratedProbability || 0,
    calibrationBand,
    ambiguityScore,
  };
}

/**
 * @param {object} p
 * @param {ReturnType<typeof rankHypotheses>} p.ranking
 * @param {string|null} p.v2TaxonomyId
 */
export function buildDisagreement({ ranking, v2TaxonomyId }) {
  const aiTop = ranking.top1Id || "";
  const v2Top = v2TaxonomyId || "";
  const has = !!aiTop && !!v2Top && aiTop !== v2Top;
  const gap = has ? Math.abs((ranking.candidates.find((c) => c.candidateId === aiTop)?.calibratedProbability || 0) - (ranking.candidates.find((c) => c.candidateId === v2Top)?.calibratedProbability || 0)) : 0;

  let severity = /** @type {"none"|"low"|"medium"|"high"} */ ("none");
  let action = /** @type {"retain_v2"|"surface_review"|"suppress_ai"} */ ("retain_v2");
  const reasonCodes = [];

  if (has) {
    reasonCodes.push("ai_top1_differs_from_v2");
    if (gap >= NUMERIC_GATES.disagreementProbabilityGapHigh) severity = "high";
    else if (gap >= NUMERIC_GATES.disagreementProbabilityGapMedium) severity = "medium";
    else severity = "low";
    if (severity === "high") action = "surface_review";
    if (ranking.calibrationBand === "uncalibrated") {
      action = "suppress_ai";
      reasonCodes.push("calibration_untrusted");
    }
  }

  return {
    hasDisagreement: has,
    severity,
    v2TopId: v2Top,
    aiTopId: aiTop,
    probabilityGap: gap,
    ambiguityScore: ranking.ambiguityScore,
    reasonCodes,
    action,
  };
}
