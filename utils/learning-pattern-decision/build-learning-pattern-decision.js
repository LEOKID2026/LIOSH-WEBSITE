/**
 * Compose learningPatternDecision from DE2/V3/professional + topic row (subject-agnostic).
 */
import { emptyLearningPatternDecision } from "./schema.js";
import { resolveEvidenceStrength } from "./resolve-evidence-strength.js";
import { resolveObservedPatternLevel } from "./resolve-observed-pattern-level.js";
import { resolveTopicFinding } from "./resolve-topic-finding.js";
import { resolveBlockedClaims } from "./resolve-blocked-claims.js";
import { buildParentVisibleFinding } from "./build-parent-visible-finding.js";
import { enrichParentFindingWithConsistentStrongTag } from "./enrich-parent-finding-with-factual-pattern.js";
import {
  buildFactualObservations,
  resolveObservedPatternLevelFromFactualObservations,
} from "./build-factual-observations.js";
import {
  buildParentReportEngineDecisionContract,
  injectEnginePatternIntoRepeatedMistakes,
} from "./build-parent-report-engine-decision-contract.js";
import { partitionPatternEligibleMistakes } from "./resolve-excluded-evidence.js";
import { normalizeParentVisibleMetrics } from "./normalize-parent-practice-metrics.js";
import { isUsableParentPatternLabel } from "./parent-pattern-label.js";
import { evidenceStrengthRank } from "./resolve-evidence-strength.js";
import { buildUnifiedDecisionContext } from "./build-unified-decision-context.js";

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
    String(
      row?.displayName ||
        row?.topicNameHe ||
        row?.label ||
        unit?.displayName ||
        row?.topicLabel ||
        topicKey,
    ).trim() || topicKey;
  const unifiedDecisionContext = buildUnifiedDecisionContext({
    row,
    unit,
    v3Enrichment,
    eligibleMistakes: included,
    excludedEvidence,
    evidenceBucketCounts: bucketCounts,
  });

  const engineDecisionContract = buildParentReportEngineDecisionContract({
    subjectId: sid,
    topicRowKey: trk,
    topicName,
    row,
    unit,
    v3Enrichment,
    professionalSlice,
    unifiedDecisionContext,
    decisionTimestamp: endMs,
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

  const factualObservations = buildFactualObservations({
    wrongEvents: eligibleWrongEvents,
    totalQuestions: performanceQ,
    totalErrors: performanceW,
  });

  const observedPatternLevelFromFacts =
    resolveObservedPatternLevelFromFactualObservations(factualObservations, performanceQ);
  const observedPatternLevelFallback = resolveObservedPatternLevel({
    questionCount: performanceQ,
    wrongCount: performanceW,
    wrongEvents: eligibleWrongEvents,
    hasPositiveDominance: finding.hasPositiveDominance,
  });
  const observedPatternLevel =
    observedPatternLevelFromFacts !== "none"
      ? observedPatternLevelFromFacts
      : observedPatternLevelFallback;

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
  const engineDecisionCode = String(engineDecisionContract.engineDecision || "");
  const preferLpdFallbackOverEngine =
    !!fallbackFinding &&
    !engineDecisionContract.detectedPattern &&
    (eligibleWrongEvents.length > 0 ||
      !["clear_topic_gap", "topic_needs_strengthening"].includes(engineDecisionCode));

  const parentVisibleFindingSelected =
    competitiveBucketOnly && fallbackFinding
      ? fallbackFinding
      : engineDecisionContract.detectedPattern && engineDecisionContract.parentSafeFinding
        ? engineDecisionContract.parentSafeFinding
        : fallbackHasRepeatedPattern && fallbackFinding
          ? fallbackFinding
          : engineFindingWins
            ? engineDecisionContract.parentSafeFinding
            : preferLpdFallbackOverEngine
              ? fallbackFinding
              : fallbackFinding || engineDecisionContract.parentSafeFinding;

  const parentVisibleFindingFinal = enrichParentFindingWithConsistentStrongTag({
    finding: parentVisibleFindingSelected,
    topicName,
    questions: performanceQ,
    wrong: performanceW,
    accuracy,
    engineDecision: engineDecisionCode,
    observedPatternLevel,
    evidenceStrength,
    repeatedMistakePatterns,
    factualObservations,
    subjectId: sid,
    taxonomyId:
      unifiedDecisionContext?.signals?.pattern?.taxonomyId ||
      unit?.taxonomy?.id ||
      null,
  });
  // Keep EDC parent-safe finding + factualObservations aligned for all report surfaces.
  // Do not mutate detectedPattern / blockPatternClaim / taxonomy / patternLayer / engineDecision / ADC.
  if (
    parentVisibleFindingFinal &&
    parentVisibleFindingFinal !== String(engineDecisionContract.parentSafeFinding || "")
  ) {
    engineDecisionContract.parentSafeFinding = parentVisibleFindingFinal;
    trace.push("parentVisibleFinding:composed_with_factual_observations");
  }
  engineDecisionContract.factualObservations = factualObservations;

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
    factualObservations,
    recommendedFocus: recommendedFocus && performanceQ > 2 ? topicName : null,
    parentVisibleFinding: parentVisibleFindingFinal,
    parentWordingLevel:
      factualObservations.length > 0
        ? factualObservations[0].recurrenceLevel === "strong"
          ? "strong_pattern"
          : factualObservations[0].recurrenceLevel === "consistent" ||
              factualObservations[0].recurrenceLevel === "repeated"
            ? "repeated_pattern"
            : "factual_observation"
        : engineDecisionContract.detectedPattern
          ? "repeated_pattern"
          : parentWordingLevel,
    engineDecisionContract,
    unifiedDecisionContext,
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
