/**
 * Compose learningPatternDecision from DE2/V3/professional + topic row (subject-agnostic).
 */
import { emptyLearningPatternDecision } from "./schema.js";
import { resolveEvidenceStrength } from "./resolve-evidence-strength.js";
import { resolveObservedPatternLevel } from "./resolve-observed-pattern-level.js";
import { resolveTopicFinding } from "./resolve-topic-finding.js";
import { resolveBlockedClaims } from "./resolve-blocked-claims.js";
import { buildParentVisibleFinding } from "./build-parent-visible-finding.js";
import {
  buildParentReportEngineDecisionContract,
  injectEnginePatternIntoRepeatedMistakes,
} from "./build-parent-report-engine-decision-contract.js";
import { partitionPatternEligibleMistakes } from "./resolve-excluded-evidence.js";
import { normalizeParentVisibleMetrics } from "./normalize-parent-practice-metrics.js";
import { isUsableParentPatternLabel } from "./parent-pattern-label.js";
import { evidenceStrengthRank } from "./resolve-evidence-strength.js";

/**
 * @param {object} p
 * @param {string} p.subjectId
 * @param {string} p.topicRowKey
 * @param {Record<string, unknown>} [p.row]
 * @param {object|null} [p.unit]
 * @param {object|null} [p.v3Enrichment]
 * @param {object|null} [p.professionalSlice]
 * @param {unknown[]} [p.rawMistakes]
 * @param {number} [p.startMs]
 * @param {number} [p.endMs]
 */
export function buildLearningPatternDecision({
  subjectId,
  topicRowKey,
  row = {},
  unit = null,
  v3Enrichment = null,
  professionalSlice = null,
  rawMistakes = [],
  startMs = 0,
  endMs = Date.now(),
}) {
  const sid = String(subjectId || "");
  const trk = String(topicRowKey || "");
  const topicKey = String(row?.bucketKey || unit?.topicKey || trk.split("\u0001")[0] || trk);

  const metrics = normalizeParentVisibleMetrics(row, unit);
  const q = metrics.questions;
  const c = metrics.correct;
  const w = metrics.wrong;
  const accuracy = metrics.accuracy;

  const base = emptyLearningPatternDecision(sid, topicKey);
  /** @type {string[]} */
  const trace = [];
  /** @type {string[]} */
  const enrichmentMissing = [];
  /** @type {string[]} */
  const sourceEngines = ["topic_aggregation"];

  if (q === 0) {
    trace.push("not_practiced:q=0");
    return base;
  }

  const { included, excludedEvidence, competitiveBucketOnly, bucketCounts } =
    partitionPatternEligibleMistakes(rawMistakes, sid, trk, startMs, endMs);

  const wrongEvents = included.filter((e) => !e.isCorrect);
  const performanceQ = q;
  const performanceC = c;
  const performanceW = w;
  const eligibleWrongEvents = wrongEvents;

  if (unit) {
    sourceEngines.push("de2");
    if (unit.canonicalState) sourceEngines.push("canonicalState");
  } else {
    enrichmentMissing.push("de2_unit");
  }

  if (v3Enrichment?.v3Rollup) {
    sourceEngines.push("v3");
  } else {
    enrichmentMissing.push("v3_enrichment");
  }

  if (professionalSlice) {
    sourceEngines.push("professional");
  } else {
    enrichmentMissing.push("professional_slice");
  }

  const canonicalState = unit?.canonicalState || null;
  const recommendedFocus =
    !!canonicalState?.recommendation?.focusTopic ||
    !!row?.recommendedFocus ||
    (unit?.diagnosis?.allowed === true && w >= 2);

  const topicName =
    String(row?.displayName || unit?.displayName || row?.topicLabel || topicKey).trim() ||
    topicKey;

  const engineDecisionContract = buildParentReportEngineDecisionContract({
    subjectId: sid,
    topicRowKey: trk,
    topicName,
    row,
    unit,
    v3Enrichment,
    professionalSlice,
  });
  trace.push(...engineDecisionContract.traceReason.map((t) => `edc:${t}`));

  const finding = resolveTopicFinding({
    questionCount: performanceQ,
    correctCount: performanceC,
    wrongCount: performanceW,
    accuracy,
    wrongEvents: eligibleWrongEvents,
    recommendedFocus,
  });

  let { topicStatus, findingType, repeatedMistakePatterns, canUseRepeatedWording, hasMixed } =
    finding;

  if (professionalSlice?.reliabilitySoftened) {
    trace.push("professional:reliability_softened_wording");
  }

  const evidenceStrengthRaw = resolveEvidenceStrength(performanceQ);
  let evidenceStrength = evidenceStrengthRaw;
  if (professionalSlice?.reliabilitySoftened && evidenceStrength === "strong") {
    evidenceStrength = "supported";
    trace.push("professional:reliability_softened_evidenceStrength");
  }

  if (
    engineDecisionContract.detectedPattern &&
    isUsableParentPatternLabel(engineDecisionContract.detectedPattern)
  ) {
    repeatedMistakePatterns = injectEnginePatternIntoRepeatedMistakes(
      repeatedMistakePatterns,
      engineDecisionContract.detectedPattern,
      performanceW,
    );
    if (performanceW >= 2 && performanceQ >= 3) {
      topicStatus = "difficulty_repeated";
      findingType = "difficulty_pattern";
      canUseRepeatedWording =
        performanceQ >= 5 || evidenceStrengthRank(evidenceStrength) >= evidenceStrengthRank("emerging");
      trace.push(`engine:pattern_promoted:${engineDecisionContract.detectedPattern}`);
    }
  }

  if (v3Enrichment?.v3Rollup?.dominantErrorType && repeatedMistakePatterns.length) {
    repeatedMistakePatterns = repeatedMistakePatterns.map((p, i) =>
      i === 0
        ? { ...p, label: String(v3Enrichment.v3Rollup.dominantErrorType || p.label) }
        : p,
    );
    trace.push("v3:refined_pattern_label");
  }

  const observedPatternLevel = resolveObservedPatternLevel({
    questionCount: performanceQ,
    wrongCount: performanceW,
    wrongEvents: eligibleWrongEvents,
    hasPositiveDominance: finding.hasPositiveDominance,
  });

  const blockedClaims = resolveBlockedClaims({
    topicStatus,
    findingType,
    evidenceStrength,
    canUseRepeatedWording,
    canonicalState,
    competitiveBucketOnly,
    engineDetectedPattern: engineDecisionContract.detectedPattern,
  });

  const { parentVisibleFinding: fallbackFinding, parentWordingLevel, templateId } =
    buildParentVisibleFinding({
      topicName,
      questionCount: performanceQ,
      topicStatus,
      findingType,
      evidenceStrength,
      canUseRepeatedWording,
      repeatedMistakePatterns,
      competitiveBucketOnly,
      hasMixed,
      wrongCount: performanceW,
      accuracy,
    });

  const engineFindingWins =
    !!engineDecisionContract.parentSafeFinding &&
    !["insufficient_data", "early_direction_only", "none"].includes(
      String(engineDecisionContract.engineDecision || ""),
    );

  const fallbackHasRepeatedPattern =
    !!fallbackFinding && /מופיע דפוס חוזר/u.test(String(fallbackFinding));

  // competitiveBucketOnly (all mistakes are in a "speed"/competitive context) must keep that
  // context in the parent-facing text — the engine's own parentSafeFinding is not aware of
  // this LPD-level signal, so it must not win over the competitive-aware fallback text.
  const parentVisibleFindingFinal =
    competitiveBucketOnly && fallbackFinding
      ? fallbackFinding
      : engineDecisionContract.detectedPattern
        ? engineDecisionContract.parentSafeFinding
        : fallbackHasRepeatedPattern
          ? fallbackFinding
          : engineFindingWins
            ? engineDecisionContract.parentSafeFinding
            : fallbackFinding || engineDecisionContract.parentSafeFinding;
  if (competitiveBucketOnly && fallbackFinding) {
    trace.push("parentVisibleFinding:competitive_bucket_only");
  } else if (engineDecisionContract.detectedPattern && engineDecisionContract.parentSafeFinding) {
    trace.push("parentVisibleFinding:engine_pattern");
  } else if (fallbackHasRepeatedPattern) {
    trace.push("parentVisibleFinding:aggregation_pattern");
  } else if (engineFindingWins) {
    trace.push("parentVisibleFinding:engine_decision");
  } else if (fallbackFinding) {
    trace.push("parentVisibleFinding:lpd_fallback");
  }
  if (enrichmentMissing.length) {
    trace.push(`fallback:topic_performance_only missing=[${enrichmentMissing.join(",")}]`);
  }
  if (excludedEvidence.length > 0) {
    trace.push(`excluded_evidence:buckets=${excludedEvidence.length}`);
  }
  const rowMode = String(row?.modeKey || unit?.modeKey || "").trim();
  if (/^(learning|guided_practice|learning_book|mistakes)$/i.test(rowMode)) {
    trace.push(`aggregation:row_modeKey=${rowMode} pattern_events_from_eligible_mistakes_only`);
  }
  trace.push(`template:${templateId}`);
  trace.push(`wording:${parentWordingLevel}`);

  /** @type {import("./schema.js").LearningPatternDecisionShape} */
  return {
    ...base,
    topicKey: trk,
    practicedQuestions: performanceQ,
    correctCount: performanceC,
    wrongCount: performanceW,
    accuracy,
    observedPatternLevel,
    evidenceStrength,
    topicStatus,
    findingType,
    detectedPatterns: repeatedMistakePatterns.map((p) => ({
      key: p.key,
      count: p.count,
      ratio: p.ratio,
      label: p.label,
    })),
    positivePatterns:
      topicStatus.startsWith("positive") || findingType === "success_pattern"
        ? [{ type: "topic_success", accuracy, questionCount: performanceQ }]
        : [],
    repeatedMistakePatterns,
    recommendedFocus: recommendedFocus && performanceQ > 2 ? topicName : null,
    parentVisibleFinding: parentVisibleFindingFinal,
    parentWordingLevel: engineDecisionContract.detectedPattern ? "repeated_pattern" : parentWordingLevel,
    engineDecisionContract,
    blockedClaims,
    excludedEvidence,
    sourceEngines: [...new Set(sourceEngines)],
    competitiveBucketOnly,
    enrichmentMissing,
    trace,
    evidenceBuckets: bucketCounts,
    templateId,
  };
}
