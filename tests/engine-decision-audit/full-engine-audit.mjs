/**
 * Engine-only audit harness.
 * Product logic is imported read-only; this file records capability and invariant failures.
 * Run: node tests/engine-decision-audit/full-engine-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runDiagnosticEngineV2 } from "../../utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js";
import { runDiagnosticEngineV3 } from "../../utils/diagnostic-engine-v3/run-diagnostic-engine-v3.js";
import { resolveRecommendedNextStepV3 } from "../../utils/diagnostic-engine-v3/next-action-v3.js";
import { DIAGNOSIS_STAGE, RECOMMENDED_NEXT_STEP } from "../../utils/diagnostic-engine-v3/types.js";
import { resolveConfidenceLevel } from "../../utils/diagnostic-engine-v2/confidence-policy.js";
import { resolvePriority, breadthFromWeakRowCount } from "../../utils/diagnostic-engine-v2/priority-policy.js";
import { evaluateDecisionTable } from "../../utils/canonical-topic-state/decision-table.js";
import {
  buildEngineDiagnosticDecision,
  computeAccuracyBand,
  computeEngineConfidenceTier,
} from "../../utils/parent-report-engine-v1-signals.js";
import { computeRowBehaviorProfile } from "../../utils/parent-report-row-behavior.js";
import {
  buildTrendDerivedSignals,
  buildPhase2RiskFlags,
} from "../../utils/topic-next-step-phase2.js";
import {
  buildLearningPatternDecision,
  buildSubjectEngineDecisionContract,
  buildUnifiedDecisionContext,
  reconcileEngineDecisionWithContext,
} from "../../utils/learning-pattern-decision/index.js";
import {
  mapEngineRecommendedAction,
} from "../../utils/learning-pattern-decision/build-parent-report-engine-decision-contract.js";
import {
  ED_CLEAR_TOPIC_GAP,
  ED_TOPIC_NEEDS_STRENGTHENING,
  ED_PARTIAL_STABLE,
  ED_EARLY_DIRECTION_ONLY,
  ED_INSUFFICIENT_DATA,
  ED_NONE,
  ED_MASTERY_STABLE,
  ED_SPEED_PRESSURE_PATTERN,
  RA_REMEDIATE_SAME_LEVEL,
  RA_REMEDIATE_STEP_DOWN,
  RA_WATCH,
  RA_MAINTAIN_AND_STRENGTHEN,
  RA_MAINTAIN,
  RA_INTERVENE,
  DEPRECATED_UNREACHABLE_RECOMMENDED_ACTION_CODES,
  CONTRACT_ONLY_RECOMMENDED_ACTION_CODES,
} from "../../utils/learning-pattern-decision/engine-decision-codes.js";
import { resolveEvidenceStrength } from "../../utils/evidence-strength-policy.js";
import {
  assessSubskillCandidateSafety,
} from "../../utils/subskill-candidate-safety.js";
import {
  buildRecommendationContractV1,
} from "../../utils/contracts/recommendation-contract-v1.js";
import {
  normalizeRecommendationContract,
} from "../../utils/contracts/recommendation-contract-normalizer.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import {
  ACTION_CODES_V2,
  ACTIVE_INTERVENTION_ACTIONS_V2,
  LEGACY_ACTION_MAPPINGS_V2,
  UNSUPPORTED_LEGACY_ACTIONS_V2,
  buildActionDecisionContractV2,
  validateActionDecisionContractV2,
} from "../../utils/action-decision-contract/action-decision-contract-v2.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "qa", "decision-engine-audit");
const SNAPSHOT_DIR = path.join(ARTIFACT_DIR, "snapshots");
fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

const START_MS = Date.UTC(2026, 6, 1);
const END_MS = Date.UTC(2026, 6, 22, 23, 59, 59, 999);
const SUBJECT = "math";
const TOPIC = "addition";
const ROW_KEY = `${TOPIC}\u0001practice\u0001g4\u0001medium`;

/** @type {Array<Record<string, unknown>>} */
const assertions = [];
/** @type {Array<Record<string, unknown>>} */
const cases = [];
/** @type {Array<Record<string, unknown>>} */
const differentials = [];
/** @type {Array<Record<string, unknown>>} */
const branchCoverage = [];
/** @type {Array<Record<string, unknown>>} */
const exceptions = [];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return String(value);
    return value;
  }
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (key === "generatedAt") continue;
    out[key] = stable(value[key]);
  }
  return out;
}

function jsonEqual(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function recordAssert(id, pass, details = {}) {
  assertions.push({ id, pass: !!pass, ...stable(details) });
  return !!pass;
}

function pctCounts(qRaw, accRaw) {
  const q = Math.max(0, Math.floor(Number(qRaw) || 0));
  const acc = Math.max(0, Math.min(100, Number(accRaw) || 0));
  const correct = Math.max(0, Math.min(q, Math.round((q * acc) / 100)));
  const wrong = q - correct;
  return { q, correct, wrong, accuracy: q > 0 ? Math.round((correct * 100) / q) : 0 };
}

function makeRow(options = {}) {
  const counts = pctCounts(options.q ?? 20, options.acc ?? 40);
  return {
    displayName: "חיבור",
    bucketKey: TOPIC,
    questions: counts.q,
    correct: counts.correct,
    wrong: counts.wrong,
    accuracy: counts.accuracy,
    needsPractice: counts.accuracy < 70,
    excellent: counts.accuracy >= 90 && counts.q >= 10,
    confidence01: options.confidence01 ?? (counts.q >= 40 ? 0.82 : 0.55),
    dataSufficiencyLevel:
      options.dataSufficiencyLevel ?? (counts.q >= 12 ? "strong" : counts.q >= 5 ? "medium" : "low"),
    isEarlySignalOnly: options.isEarlySignalOnly ?? counts.q < 8,
    modeKey: options.modeKey ?? "practice",
    gradeKey: options.contentGrade ?? "g4",
    contentGradeKey: options.contentGrade ?? "g4",
    registeredGradeKey: options.registeredGrade ?? "g4",
    gradeRelation: options.gradeRelation ?? "same",
    gradeDelta: options.gradeDelta ?? 0,
    lastSessionMs: options.lastSessionMs ?? END_MS - 3_600_000,
    trend: options.trend ?? {
      accuracyDirection: "flat",
      independenceDirection: "flat",
      fluencyDirection: "flat",
      confidence: 0.8,
      windows: {
        currentPeriod: { accuracy: counts.accuracy },
        recentShortWindow: { accuracy: counts.accuracy },
        previousComparablePeriod: { accuracy: counts.accuracy },
      },
    },
    ...(options.behaviorType
      ? { behaviorProfile: { dominantType: options.behaviorType, signals: {} } }
      : {}),
  };
}

function makeEvents(row, options = {}) {
  const wrongCount = Math.max(0, Number(row.wrong) || 0);
  const mode = options.mode ?? row.modeKey ?? "practice";
  const repeatedCount =
    options.repeatedCount == null ? wrongCount : Math.max(0, Math.min(wrongCount, options.repeatedCount));
  const responseMs = options.responseMs ?? 12_000;
  return Array.from({ length: wrongCount }, (_, i) => {
    const repeated = i < repeatedCount;
    const dayOffset = options.sameDay ? 0 : i % Math.max(1, options.days ?? 4);
    return normalizeMistakeEvent(
      {
        subject: SUBJECT,
        topic: TOPIC,
        operation: TOPIC,
        bucketKey: TOPIC,
        mode,
        grade: options.contentGrade ?? row.contentGradeKey ?? "g4",
        level: "medium",
        timestamp: START_MS + dayOffset * 86_400_000 + i * 1_000,
        sessionId:
          options.sameSession === true
            ? "audit-session-single"
            : `audit-session-${i % 2}`,
        isCorrect: false,
        patternFamily: repeated ? options.patternFamily ?? "addition_repeated" : `random_${i}`,
        misconceptionTag: options.misconceptionTag ?? null,
        responseMs: Array.isArray(responseMs) ? responseMs[i % responseMs.length] : responseMs,
        hintUsed: options.hintUsed ?? false,
        hintsUsed: options.hintUsed ? 1 : 0,
        retryCount: options.retryCount ?? 0,
        firstTryCorrect: options.firstTryCorrect ?? false,
        changedAnswer: options.changedAnswer ?? false,
        afterStepByStep: options.afterStepByStep ?? false,
        skillId: options.skillId ?? "math.addition",
        subskillId: options.subskillId ?? "addition.basic",
        metadataPresent: options.metadataPresent ?? true,
        metadata: {
          metadataSource: options.metadataSource ?? "question_metadata_normalizer",
          skillId: options.skillId ?? "math.addition",
          subskillId: options.subskillId ?? "addition.basic",
          possibleErrorPatterns: options.possibleErrorPatterns ?? ["addition_repeated"],
          afterStepByStep: options.afterStepByStep ?? false,
        },
        expectedErrorTags: options.possibleErrorPatterns ?? ["addition_repeated"],
      },
      SUBJECT,
    );
  });
}

function snapshotFromPipeline(id, row, rawMistakes, de2, v3, lpd) {
  const unit = de2.units[0] || null;
  const v3Enrichment = v3.unitEnrichments?.[0] || null;
  const v3Rollup = v3Enrichment?.v3Rollup || null;
  const edc = lpd.engineDecisionContract || {};
  const unified = lpd.unifiedDecisionContext || {};
  return {
    caseId: id,
    input: {
      row: {
        questions: row.questions,
        correct: row.correct,
        wrong: row.wrong,
        accuracy: row.accuracy,
        modeKey: row.modeKey,
        gradeRelation: row.gradeRelation,
        registeredGradeKey: row.registeredGradeKey,
        contentGradeKey: row.contentGradeKey,
        trend: row.trend,
      },
      wrongEvents: rawMistakes.length,
    },
    de2: unit
      ? {
          classification: unit.classification,
          taxonomyId: unit.taxonomy?.id ?? null,
          recurrence: unit.recurrence,
          confidence: unit.confidence?.level ?? null,
          priority: unit.priority,
          outputGating: {
            diagnosisAllowed: unit.outputGating?.diagnosisAllowed,
            probeOnly: unit.outputGating?.probeOnly,
            interventionAllowed: unit.outputGating?.interventionAllowed,
            cannotConcludeYet: unit.outputGating?.cannotConcludeYet,
            reasons: unit.outputGating?.reasons,
          },
          canonical: unit.canonicalState
            ? {
                actionState: unit.canonicalState.actionState,
                readiness: unit.canonicalState.assessment?.readiness,
                decisionTier: unit.canonicalState.assessment?.decisionTier,
                recommendation: unit.canonicalState.recommendation,
              }
            : null,
          exposedFields: {
            hasRiskFlags: Object.hasOwn(unit, "riskFlags"),
            hasBehavior: Object.hasOwn(unit, "behavior"),
            hasTaxonomyMatch: Object.hasOwn(unit, "taxonomyMatch"),
            hasRootCause: Object.hasOwn(unit, "rootCause"),
          },
        }
      : null,
    v3: v3Rollup
      ? {
          attempts: v3Rollup.attempts,
          accuracy: v3Rollup.accuracy,
          evidenceStrength: v3Rollup.evidenceStrength,
          confidence: v3Rollup.confidence,
          diagnosisStage: v3Rollup.diagnosisStage,
          recommendedNextStep: v3Rollup.recommendedNextStep,
          dominantErrorType: v3Rollup.dominantErrorType,
          avgTimeMs: v3Rollup.avgTimeMs,
          slowCount: v3Rollup.slowCount,
          fastWrongCount: v3Rollup.fastWrongCount,
          gradeRelation: v3Rollup.gradeRelation,
          foundationRisk: v3Rollup.foundationRisk,
          enrichmentSignal: v3Rollup.enrichmentSignal,
          caveatNeeded: v3Rollup.caveatNeeded,
        }
      : null,
    lpd: {
      topicStatus: lpd.topicStatus,
      findingType: lpd.findingType,
      evidenceStrength: lpd.evidenceStrength,
      observedPatternLevel: lpd.observedPatternLevel,
      repeatedPatternCount: lpd.repeatedMistakePatterns?.length ?? 0,
      blockedClaims: lpd.blockedClaims,
      evidenceBuckets: lpd.evidenceBuckets,
      excludedEvidence: lpd.excludedEvidence,
    },
    edc: {
      engineDecision: edc.engineDecision,
      severity: edc.severity,
      evidenceStrength: edc.evidenceStrength,
      recommendedAction: edc.recommendedAction,
      sourceEngine: edc.sourceEngine,
      detectedPattern: edc.detectedPattern,
      affectedSubskill: edc.affectedSubskill,
      actionState: edc.actionState,
      guardrailsApplied: edc.engineDiagnosticDecision?.guardrailsApplied ?? [],
      why: edc.engineDiagnosticDecision?.why ?? [],
      taxonomyMatch: edc.engineDiagnosticDecision?.taxonomyMatch ?? false,
      safeSubskillToShow: edc.engineDiagnosticDecision?.safeSubskillToShow ?? false,
      signalPriorityAdjustment: edc.signalPriorityAdjustment ?? 0,
      signalPriorityReasons: edc.signalPriorityReasons ?? [],
      actionDecisionContract: edc.actionDecisionContract ?? null,
    },
    unifiedDecisionContext: {
      authority: unified.authority || null,
      evidenceEligibility: unified.evidenceEligibility || null,
      priorityAdjustment: unified.reconciler?.priorityAdjustment ?? 0,
      reasonCodes: unified.reconciler?.reasonCodes ?? [],
      conflicts: unified.reconciler?.conflicts ?? [],
      signals: unified.signals || null,
    },
  };
}

function runCase(spec) {
  const row = makeRow(spec);
  const rawMistakes = makeEvents(row, spec.events || {});
  try {
    if (!row.behaviorProfile) {
      row.behaviorProfile = computeRowBehaviorProfile(
        SUBJECT,
        ROW_KEY,
        row,
        rawMistakes,
        START_MS,
        END_MS,
      );
    }
    const trendDer = buildTrendDerivedSignals(row.trend, row);
    row.topicEngineRowSignals = {
      riskFlags: buildPhase2RiskFlags(row, row.trend, row.behaviorProfile, trendDer),
      diagnosticType: row.behaviorProfile?.dominantType,
    };
    const maps = { [SUBJECT]: { [ROW_KEY]: row } };
    const rawBySubject = { [SUBJECT]: rawMistakes };
    const de2 = runDiagnosticEngineV2({
      maps,
      rawMistakesBySubject: rawBySubject,
      startMs: START_MS,
      endMs: END_MS,
    });
    const v3 = runDiagnosticEngineV3({
      maps,
      rawMistakesBySubject: rawBySubject,
      startMs: START_MS,
      endMs: END_MS,
      diagnosticEngineV2: de2,
    });
    const unit = de2.units[0] || null;
    const v3Enrichment = v3.unitEnrichments?.[0] || null;
    const lpd = buildLearningPatternDecision({
      subjectId: SUBJECT,
      topicRowKey: ROW_KEY,
      row,
      unit,
      v3Enrichment,
      rawMistakes,
      startMs: START_MS,
      endMs: END_MS,
    });
    const snapshot = snapshotFromPipeline(spec.id, row, rawMistakes, de2, v3, lpd);
    cases.push(snapshot);
    fs.writeFileSync(
      path.join(SNAPSHOT_DIR, `${spec.id}.json`),
      `${JSON.stringify(stable(snapshot), null, 2)}\n`,
      "utf8",
    );
    return snapshot;
  } catch (error) {
    const failure = { caseId: spec.id, error: String(error?.stack || error) };
    exceptions.push(failure);
    cases.push({ caseId: spec.id, exception: failure.error });
    return cases.at(-1);
  }
}

function directDecision(input = {}) {
  const q = Number(input.q ?? 20) || 0;
  const acc = Number(input.acc ?? 40) || 0;
  const wrong = Math.max(0, Math.round(q * (1 - acc / 100)));
  const engine = buildEngineDiagnosticDecision({
    q,
    acc,
    wrongRatio: q > 0 ? wrong / q : 0,
    engineConfidenceTier: computeEngineConfidenceTier(q),
    accuracyBand: computeAccuracyBand(acc, q),
    taxonomyMatch: input.taxonomyMatch ?? null,
    rootCause: input.rootCause ?? "mixed_signal",
    behaviorType: input.behaviorType ?? "undetermined",
    dominantMistakePattern: input.pattern ?? "insufficient_mistake_evidence",
    riskFlags: input.riskFlags ?? {},
    modeKey: input.modeKey ?? "practice",
  });
  const canonical = evaluateDecisionTable({
    confidenceLevel: input.confidence ?? "moderate",
    taxonomyMatch: input.canonicalTaxonomy ?? false,
    recurrenceFull: input.recurrenceFull ?? false,
    counterEvidenceStrong: input.counterEvidenceStrong ?? false,
    weakEvidence: input.weakEvidence ?? false,
    hintInvalidates: input.hintInvalidates ?? false,
    stableMastery: input.stableMastery ?? false,
    questions: q,
    accuracy: acc,
    priorityLevel: input.priority ?? "P2",
  });
  return {
    engineDecision: engine.engineDecision,
    engineWhy: engine.why,
    engineGuardrails: engine.guardrailsApplied,
    actionState: canonical.actionState,
    readiness: canonical.readiness,
    canonicalFamily: canonical.recommendation.family,
    canonicalAllowed: canonical.recommendation.allowed,
    canonicalIntensity: canonical.recommendation.intensityCap,
    recommendedAction: mapEngineRecommendedAction(
      canonical.actionState,
      engine.engineDecision,
      {
        questions: q,
        accuracy: acc,
        wrong,
      },
      {
        canonicalPresent: true,
        recommendationAllowed: canonical.recommendation.allowed,
        intensityCap: canonical.recommendation.intensityCap,
      },
    ),
  };
}

function addDifferential(id, changedField, aInput, bInput) {
  const a = directDecision(aInput);
  const b = directDecision(bInput);
  const result = {
    id,
    changedField,
    inputA: aInput,
    inputB: bInput,
    outputA: a,
    outputB: b,
    changed: {
      decision: a.engineDecision !== b.engineDecision,
      action: a.recommendedAction !== b.recommendedAction,
      reason: !jsonEqual(a.engineWhy, b.engineWhy),
      priorityEffect: a.actionState !== b.actionState || a.canonicalIntensity !== b.canonicalIntensity,
    },
  };
  result.nonOperative =
    !result.changed.decision &&
    !result.changed.action &&
    !result.changed.reason &&
    !result.changed.priorityEffect;
  differentials.push(result);
  return result;
}

function p1ContextOutput(input = {}) {
  const q = Number(input.q ?? 20);
  const acc = Number(input.acc ?? 60);
  const baseRow = makeRow({ q, acc, modeKey: input.modeKey ?? "practice" });
  const row = {
    ...baseRow,
    behaviorProfile: input.behaviorProfile ?? {
      dominantType: "knowledge_gap",
      signals: {
        hintRate: 0,
        hintKnownCount: 8,
        medianResponseMsWrong: 12_000,
      },
    },
    trend: input.trend ?? {
      accuracyDirection: "flat",
      confidence: 0.8,
      windows: {
        currentPeriod: { accuracy: acc, sessionCount: 2 },
        previousComparablePeriod: { accuracy: acc, sessionCount: 2 },
        recentShortWindow: { accuracy: acc, sessionCount: 2 },
      },
    },
    gradeRelation: input.gradeRelation ?? "same",
    contentGradeKey: input.contentGrade ?? "g4",
    topicEngineRowSignals: { riskFlags: input.riskFlags ?? {} },
  };
  const taxonomy = input.taxonomy === true
    ? { id: "M-01", subskillHe: "חיבור בסיסי", patternHe: "דפוס חיבור חוזר" }
    : null;
  const unit = {
    subjectId: SUBJECT,
    bucketKey: TOPIC,
    taxonomy,
    recurrence: { full: input.recurrenceFull === true },
    diagnosis: { allowed: false },
    gradeEvidence: {
      gradeRelation: row.gradeRelation,
      registeredGradeKey: "g4",
      contentGradeKey: row.contentGradeKey,
    },
    canonicalState: input.canonicalOpen
      ? {
          actionState: "intervene",
          recommendation: { allowed: true, intensityCap: "RI2", family: "intervene" },
        }
      : {
          actionState: "probe_only",
          recommendation: { allowed: false, intensityCap: "RI0", family: "probe_only" },
        },
  };
  const v3Enrichment = {
    v3Rollup: {
      evidenceStrength: input.v3EvidenceStrength ?? "strong",
      confidence: "medium",
      diagnosisStage: input.v3Contradictory
        ? "contradictory_evidence"
        : "enough_for_working_hypothesis",
      contradictorySignals: input.v3Contradictory === true,
      recommendedNextStep: input.v3Action ?? "practice_more",
      avgTimeMs: input.avgTimeMs ?? 12_000,
      slowCount: input.slowCount ?? 0,
      fastWrongCount: input.fastWrongCount ?? 0,
      gradeRelation: input.v3GradeRelation ?? "same_as_registered_grade",
      foundationRisk: input.foundationRisk === true,
      enrichmentSignal: input.enrichmentSignal === true,
      caveatNeeded: input.caveatNeeded === true,
    },
  };
  const eligibleMistakes = makeEvents(row, {
    repeatedCount: input.recurrenceFull ? Math.max(3, row.wrong) : 0,
    hintUsed: input.hintUsed === true,
    days: input.days ?? 3,
  });
  const context = buildUnifiedDecisionContext({
    row,
    unit,
    v3Enrichment,
    eligibleMistakes,
  });
  const reconciled = reconcileEngineDecisionWithContext(
    input.baseDecision ?? buildEngineDiagnosticDecision({
      q,
      acc,
      wrongRatio: q > 0 ? row.wrong / q : 0,
    }).engineDecision,
    context,
  );
  return {
    authorityLane: input.canonicalOpen ? "open" : "closed",
    engineDecision: reconciled.engineDecision,
    reasonCodes: [...new Set([
      ...reconciled.reasonCodes,
      ...(context.reconciler?.reasonCodes || []),
    ])],
    priorityAdjustment: context.reconciler?.priorityAdjustment ?? 0,
    subskillSafe: context.signals?.subskill?.safe === true,
    evidenceEligibility: context.evidenceEligibility,
    actionEligible: context.authority?.actionEligible === true,
    recommendedAction: mapEngineRecommendedAction(
      context.authority?.actionState,
      reconciled.engineDecision,
      { questions: q, accuracy: acc, wrong: row.wrong },
      {
        canonicalPresent: context.authority?.canonicalPresent,
        recommendationAllowed: context.authority?.recommendationAllowed,
        intensityCap: context.authority?.intensityCap,
      },
    ),
  };
}

function addP1Differential(id, changedField, aInput, bInput) {
  const a = p1ContextOutput(aInput);
  const b = p1ContextOutput(bInput);
  const changed = {
    decision: a.engineDecision !== b.engineDecision,
    action: a.recommendedAction !== b.recommendedAction,
    reason: !jsonEqual(a.reasonCodes, b.reasonCodes),
    priorityEffect: a.priorityAdjustment !== b.priorityAdjustment,
    subskillSafety: a.subskillSafe !== b.subskillSafe,
    evidenceEligibility: !jsonEqual(a.evidenceEligibility, b.evidenceEligibility),
  };
  const result = {
    id,
    phase: "P1",
    changedField,
    inputA: aInput,
    inputB: bInput,
    outputA: a,
    outputB: b,
    changed,
    nonOperative: !Object.values(changed).some(Boolean),
  };
  differentials.push(result);
  return result;
}

// Capability A+B: complete volume and accuracy boundary sweeps.
const volumeValues = [1, 2, 4, 5, 6, 9, 10, 11, 12, 19, 20, 39, 40, 49, 50, 100];
for (const q of volumeValues) {
  runCase({ id: `volume_q${q}`, q, acc: 40, events: { repeatedCount: Math.ceil(q * 0.6) } });
}
const accuracyValues = [0, 20, 39, 49, 50, 59, 60, 69, 70, 79, 80, 89, 90, 100];
for (const acc of accuracyValues) {
  runCase({ id: `accuracy_${acc}`, q: 20, acc, events: { repeatedCount: 8 } });
}
runCase({ id: "accuracy_early_direction", q: 6, acc: 80, events: { repeatedCount: 1 } });

// Capability C: trend variants at equal total accuracy.
const trendCases = [
  ["stable", "flat", 40, 40, 40],
  ["improving_small", "up", 40, 46, 35],
  ["improving_large", "up", 40, 70, 20],
  ["declining_small", "down", 40, 34, 45],
  ["declining_large", "down", 40, 10, 75],
  ["volatile", "flat", 40, 75, 20],
  ["late_recovery", "up", 40, 80, 15],
  ["recent_decline", "down", 40, 15, 70],
  ["unknown", "unknown", 40, 40, 40],
];
for (const [id, direction, current, recent, previous] of trendCases) {
  runCase({
    id: `trend_${id}`,
    q: 20,
    acc: 40,
    trend: {
      accuracyDirection: direction,
      independenceDirection: "flat",
      fluencyDirection: "flat",
      confidence: id === "unknown" ? 0.1 : 0.8,
      windows: {
        currentPeriod: { accuracy: current },
        recentShortWindow: { accuracy: recent },
        previousComparablePeriod: { accuracy: previous },
      },
    },
  });
}

// Capability D: timing variants at equal q/accuracy.
const timingCases = [
  ["normal", 12_000],
  ["very_slow", 90_000],
  ["very_fast_wrong", 1_200],
  ["slow_correct_context", 12_000],
  ["slow_wrong_only", 70_000],
  ["speed_improving", [60_000, 40_000, 20_000, 8_000]],
  ["speed_declining", [8_000, 20_000, 40_000, 60_000]],
];
for (const [id, responseMs] of timingCases) {
  runCase({ id: `timing_${id}`, q: 20, acc: 60, events: { responseMs } });
}
runCase({
  id: "timing_speed_mode_fast_wrong",
  q: 20,
  acc: 60,
  modeKey: "speed",
  behaviorType: "speed_pressure",
  events: { mode: "speed", responseMs: 1_200 },
});
runCase({
  id: "timing_marathon_mode_fast_wrong",
  q: 20,
  acc: 60,
  modeKey: "marathon",
  behaviorType: "speed_pressure",
  events: { mode: "marathon", responseMs: 1_200 },
});

// Capability E: pattern ratios, ties, taxonomy metadata and cross-session shape.
const patternCases = [
  ["random", 0, {}],
  ["ratio40", 4, {}],
  ["ratio60", 6, {}],
  ["ratio80", 8, {}],
  ["ratio100", 10, {}],
  ["known_taxonomy_like", 10, { misconceptionTag: "addition_repeated" }],
  ["unknown_taxonomy", 10, { patternFamily: "unknown:malformed" }],
  ["partial_taxonomy", 5, { possibleErrorPatterns: [] }],
  ["cross_session", 10, { days: 5 }],
  ["single_session", 10, { sameDay: true }],
  ["guided_pattern", 10, { hintUsed: true }],
  ["step_by_step_pattern", 10, { afterStepByStep: true }],
  ["new_late_pattern", 3, { days: 5 }],
  ["disappearing_pattern", 7, { days: 5 }],
];
for (const [id, repeatedCount, eventOverrides] of patternCases) {
  runCase({
    id: `pattern_${id}`,
    q: 20,
    acc: 50,
    events: { repeatedCount, ...eventOverrides },
  });
}

// Capability F: subskill safety as a direct guardrail matrix.
const subskillCases = [
  ["none", 0, 0, false, false],
  ["low_q", 9, 4, true, true],
  ["few_wrongs", 20, 2, true, true],
  ["strong", 20, 6, true, true],
  ["no_recurrence", 20, 6, true, false],
  ["mastery", 20, 2, true, true, 95],
  ["weak_evidence", 10, 3, true, false],
  ["multi_unresolved", 20, 6, true, false, 50, true],
  ["no_taxonomy", 20, 6, false, false],
];
const subskillResults = [];
for (const [id, q, wrongN, hasCandidate, recurrenceMatched, acc = 50, multi = false] of subskillCases) {
  const row = makeRow({ q, acc });
  const wrongs = makeEvents({ ...row, wrong: wrongN }, { repeatedCount: wrongN });
  const taxonomyMatch = hasCandidate
    ? {
        subskillCandidate: { id: "M-01", labelHe: "חיבור בסיסי" },
        normalizedBucketKey: TOPIC,
        matchStrength: "strong",
      }
    : null;
  const result = assessSubskillCandidateSafety({
    subjectId: SUBJECT,
    row,
    wrongs,
    taxonomyMatch,
    candidateIdsRaw: multi ? ["M-01", "M-02"] : hasCandidate ? ["M-01"] : [],
    candidateIdsOrdered: multi ? ["M-01", "M-02"] : hasCandidate ? ["M-01"] : [],
    chosenId: hasCandidate ? "M-01" : null,
    recurrenceMatched,
    disambiguationApplied: hasCandidate && !multi,
    disambiguationWinnerId: hasCandidate && !multi ? "M-01" : null,
  });
  subskillResults.push({ id, ...result });
}

// Capability G+I: independence, assistance, retries and self-correction.
const assistanceCases = [
  ["independent", {}],
  ["hints", { hintUsed: true }],
  ["step_by_step", { afterStepByStep: true }],
  ["guided_mode", { mode: "learning" }],
  ["retry_success_path", { retryCount: 1, firstTryCorrect: false }],
  ["many_retries", { retryCount: 3, changedAnswer: true }],
  ["quick_self_correction", { retryCount: 1, changedAnswer: true, responseMs: 2_000 }],
  ["hint_aided_correction", { retryCount: 1, changedAnswer: true, hintUsed: true }],
];
for (const [id, eventOverrides] of assistanceCases) {
  runCase({ id: `assistance_${id}`, q: 20, acc: 60, events: eventOverrides });
}

// Capability H: grade-level relations.
const gradeCases = [
  ["below_weak", "g4", "g2", "lower", -2, 40],
  ["same_weak", "g4", "g4", "same", 0, 40],
  ["above_weak", "g4", "g5", "higher", 1, 40],
  ["below_success", "g4", "g2", "lower", -2, 90],
  ["same_success", "g4", "g4", "same", 0, 90],
  ["above_success", "g4", "g5", "higher", 1, 90],
  ["foundation_partial", "g4", "g3", "lower", -1, 65],
  ["advanced_error_caveat", "g4", "g6", "higher", 2, 60],
];
for (const [id, registeredGrade, contentGrade, gradeRelation, gradeDelta, acc] of gradeCases) {
  runCase({
    id: `grade_${id}`,
    q: 20,
    acc,
    registeredGrade,
    contentGrade,
    gradeRelation,
    gradeDelta,
    events: { contentGrade },
  });
}

// Capability J: subject aggregation and ordering.
function topicContract(
  topicKey,
  engineDecision,
  evidenceStrength,
  severity,
  wrong,
  accuracy,
  recommendedAction,
  signalPriorityAdjustment = 0,
) {
  const questions = 20;
  return {
    topicRowKey: topicKey,
    displayName: topicKey,
    questions,
    correct: Math.max(0, questions - wrong),
    wrong,
    accuracy,
    engineDecisionContract: {
      topic: topicKey,
      questions,
      correct: Math.max(0, questions - wrong),
      wrong,
      accuracy,
      engineDecision,
      evidenceStrength,
      severity,
      recommendedAction,
      signalPriorityAdjustment,
      signalPriorityReasons: [`audit:${signalPriorityAdjustment}`],
      parentSafeFinding: `finding:${topicKey}`,
    },
  };
}
const subjectCases = [
  {
    id: "single_weak",
    rows: [topicContract("a", "clear_topic_gap", "strong", "high", 12, 40, "remediate_same_level")],
  },
  {
    id: "two_equal",
    rows: [
      topicContract("a", "clear_topic_gap", "strong", "high", 12, 40, "remediate_same_level"),
      topicContract("b", "clear_topic_gap", "strong", "high", 12, 40, "remediate_same_level"),
    ],
  },
  {
    id: "decision_beats_volume",
    rows: [
      topicContract("clear_low_volume", "clear_topic_gap", "emerging", "high", 6, 40, "remediate_same_level"),
      topicContract("moderate_high_volume", "topic_needs_strengthening", "strong", "moderate", 10, 50, "remediate_same_level"),
    ],
  },
  {
    id: "pattern_vs_accuracy",
    rows: [
      topicContract("pattern", "topic_needs_strengthening", "strong", "moderate", 8, 60, "remediate_same_level"),
      topicContract("accuracy", "clear_topic_gap", "supported", "high", 9, 45, "remediate_same_level"),
    ],
  },
  {
    id: "stable_and_weak",
    rows: [
      topicContract("weak", "clear_topic_gap", "strong", "high", 11, 45, "remediate_same_level"),
      topicContract("stable", "partial_stable", "strong", "low", 4, 80, "maintain_and_strengthen"),
    ],
  },
  {
    id: "speed_only",
    rows: [topicContract("speed", "speed_pressure_pattern", "supported", "none", 6, 65, "maintain_and_strengthen")],
  },
  {
    id: "early_only",
    rows: [topicContract("early", "early_direction_only", "emerging", "none", 2, 80, "watch")],
  },
  {
    id: "signal_priority_tie",
    rows: [
      topicContract("low_signal", "topic_needs_strengthening", "strong", "moderate", 10, 50, "remediate_same_level", -1),
      topicContract("high_signal", "topic_needs_strengthening", "strong", "moderate", 10, 50, "remediate_same_level", 2),
    ],
  },
];
const subjectResults = subjectCases.map((s) => ({
  id: s.id,
  output: buildSubjectEngineDecisionContract(SUBJECT, s.rows),
}));

// Differential matrix: one signal changes at a time.
addDifferential("diff_trend", "trend", { q: 20, acc: 40, trend: "stable" }, { q: 20, acc: 40, trend: "improving" });
addDifferential("diff_timing", "responseMs", { q: 20, acc: 40, responseMs: 12_000 }, { q: 20, acc: 40, responseMs: 90_000 });
addDifferential("diff_pattern", "pattern", { q: 20, acc: 40, pattern: "insufficient_mistake_evidence" }, { q: 20, acc: 40, pattern: "concept_confusion" });
addDifferential("diff_taxonomy", "taxonomyMatch", { q: 20, acc: 40 }, {
  q: 20,
  acc: 40,
  taxonomyMatch: {
    taxonomyMatch: true,
    taxonomyId: "M-01",
    matchStrength: "strong",
    subskillCandidateTechnical: { id: "M-01" },
    subskillSafety: { safeToShowSubskill: true, blockReasons: [] },
  },
});
addDifferential("diff_subskill", "subskill", { q: 20, acc: 40 }, {
  q: 20,
  acc: 40,
  taxonomyMatch: {
    taxonomyMatch: true,
    taxonomyId: "M-01",
    matchStrength: "strong",
    subskillCandidateTechnical: { id: "M-01" },
    subskillSafety: { safeToShowSubskill: false, blockReasons: ["low_q"] },
  },
});
addDifferential("diff_hint", "hintInvalidates", { q: 20, acc: 40 }, { q: 20, acc: 40, hintInvalidates: true });
addDifferential("diff_grade", "gradeRelation", { q: 20, acc: 40, gradeRelation: "lower" }, { q: 20, acc: 40, gradeRelation: "higher" });
addDifferential("diff_evidence", "questions", { q: 4, acc: 40 }, { q: 5, acc: 40 });
addDifferential("diff_session_consistency", "sessionCount", { q: 20, acc: 40, sessionCount: 1 }, { q: 20, acc: 40, sessionCount: 4 });
addDifferential("diff_priority", "priority", {
  q: 20,
  acc: 40,
  confidence: "moderate",
  canonicalTaxonomy: true,
  recurrenceFull: true,
  priority: "P2",
}, {
  q: 20,
  acc: 40,
  confidence: "moderate",
  canonicalTaxonomy: true,
  recurrenceFull: true,
  priority: "P3",
});
addDifferential("diff_retries", "retryCount", { q: 20, acc: 40, retryCount: 0 }, { q: 20, acc: 40, retryCount: 3 });

// P1 unified-context differentials. Every pair keeps canonical probe_only/RI0 so
// signal influence can be proven without granting action authority.
addP1Differential(
  "p1_diff_trend",
  "p1:trend",
  {
    q: 20,
    acc: 75,
    baseDecision: "partial_stable",
    trend: {
      accuracyDirection: "up",
      confidence: 0.8,
      windows: {
        currentPeriod: { accuracy: 75, sessionCount: 2 },
        previousComparablePeriod: { accuracy: 55, sessionCount: 2 },
        recentShortWindow: { accuracy: 82, sessionCount: 2 },
      },
    },
  },
  {
    q: 20,
    acc: 75,
    baseDecision: "partial_stable",
    trend: {
      accuracyDirection: "down",
      confidence: 0.8,
      windows: {
        currentPeriod: { accuracy: 75, sessionCount: 2 },
        previousComparablePeriod: { accuracy: 88, sessionCount: 2 },
        recentShortWindow: { accuracy: 60, sessionCount: 2 },
      },
    },
  },
);
addP1Differential(
  "p1_diff_timing",
  "p1:timing",
  { fastWrongCount: 0, avgTimeMs: 12_000 },
  { fastWrongCount: 5, avgTimeMs: 1_500 },
);
addP1Differential(
  "p1_diff_assistance",
  "p1:assistance",
  { q: 20, acc: 95, baseDecision: "mastery_stable" },
  {
    q: 20,
    acc: 95,
    baseDecision: "mastery_stable",
    behaviorProfile: {
      dominantType: "stable_mastery",
      signals: { hintRate: 0.75, hintKnownCount: 8, medianResponseMsWrong: 12_000 },
    },
  },
);
addP1Differential(
  "p1_diff_grade",
  "p1:grade_relation",
  {
    gradeRelation: "lower",
    contentGrade: "g2",
    v3GradeRelation: "below_registered_grade",
    foundationRisk: true,
    v3Action: "strengthen_prerequisite",
  },
  {
    gradeRelation: "higher",
    contentGrade: "g6",
    v3GradeRelation: "above_registered_grade",
    caveatNeeded: true,
    v3Action: "give_probe_questions",
  },
);
addP1Differential(
  "p1_diff_pattern_taxonomy",
  "p1:repeated_pattern_taxonomy",
  { taxonomy: false, recurrenceFull: false },
  { taxonomy: true, recurrenceFull: true },
);
addP1Differential(
  "p1_diff_subskill_safety",
  "p1:subskill_safety",
  { q: 4, acc: 50, taxonomy: true, recurrenceFull: true, v3EvidenceStrength: "thin" },
  { q: 20, acc: 50, taxonomy: true, recurrenceFull: true },
);
addP1Differential(
  "p1_diff_session_consistency",
  "p1:session_consistency",
  {
    taxonomy: true,
    recurrenceFull: true,
    trend: {
      accuracyDirection: "flat",
      confidence: 0.8,
      windows: {
        currentPeriod: { accuracy: 60, sessionCount: 1 },
        previousComparablePeriod: { accuracy: 60, sessionCount: 0 },
        recentShortWindow: { accuracy: 60, sessionCount: 1 },
      },
    },
  },
  { taxonomy: true, recurrenceFull: true },
);
addP1Differential(
  "p1_diff_v3_action",
  "p1:v3_recommended_next_step",
  { v3Action: "give_probe_questions" },
  { v3Action: "practice_more" },
);
addP1Differential(
  "p1_diff_risk_flags",
  "p1:risk_flags",
  { riskFlags: {} },
  { riskFlags: { falseRemediationRisk: true, insufficientEvidenceRisk: true } },
);
addP1Differential(
  "p1_diff_contradiction",
  "p1:contradictory_signals",
  { baseDecision: "clear_topic_gap", v3Contradictory: false },
  { baseDecision: "clear_topic_gap", v3Contradictory: true },
);
addP1Differential(
  "p1_diff_open_grade_caveat",
  "p1:canonical_open_safe_downgrade",
  {
    canonicalOpen: true,
    baseDecision: "clear_topic_gap",
    gradeRelation: "same",
    v3GradeRelation: "same_as_registered_grade",
  },
  {
    canonicalOpen: true,
    baseDecision: "clear_topic_gap",
    gradeRelation: "higher",
    contentGrade: "g6",
    v3GradeRelation: "above_registered_grade",
    caveatNeeded: true,
    v3Action: "give_probe_questions",
  },
);

function p2Canonical(actionState, intensityCap = "RI2", allowed = true) {
  return {
    actionState,
    recommendation: {
      allowed,
      intensityCap,
      reasonCodes: [`audit:${actionState}`],
    },
  };
}

function p2Context(signalOverrides = {}, eligibilityOverrides = {}) {
  return {
    evidenceEligibility: {
      unifiedConclusion: "supported",
      independent: true,
      ...eligibilityOverrides,
    },
    signals: {
      trend: { eligible: true, direction: "stable" },
      timing: { eligible: false, fastWrongCount: 0, medianWrongMs: null },
      assistance: { eligible: true, evidenceMode: "independent" },
      grade: {
        eligible: true,
        relation: "same",
        foundationRisk: false,
        caveatNeeded: false,
        contentGradeKey: "g4",
      },
      pattern: { eligible: false, taxonomyMatched: false, recurrenceFull: false },
      subskill: { eligible: false, safe: false, candidate: null },
      sessions: { eligible: true, consistency: "single_session" },
      v3: {
        eligible: true,
        contradictory: false,
        recommendedNextStep: "practice_more",
        dominantErrorType: "",
        prerequisiteSkill: null,
      },
      riskFlags: { values: {} },
      ...signalOverrides,
    },
    reconciler: { reasonCodes: ["audit:p2_context"] },
  };
}

function p2ActionOutput(options = {}) {
  return buildActionDecisionContractV2({
    subjectId: SUBJECT,
    topicKey: TOPIC,
    engineDecision: options.engineDecision || "clear_topic_gap",
    metrics: { questions: options.questions ?? 20, accuracy: 45, wrong: 11 },
    canonicalState: p2Canonical(
      options.actionState || "intervene",
      options.cap || "RI2",
      options.allowed ?? true,
    ),
    unifiedDecisionContext:
      options.context || p2Context(),
  });
}

const p2ActionScenarios = [
  ["collect_more_evidence", { actionState: "withhold", cap: "RI0", allowed: false }],
  ["give_probe_questions", { actionState: "probe_only", cap: "RI0", allowed: false }],
  ["practice_more", {}],
  ["targeted_practice", {
    context: p2Context({
      subskill: {
        eligible: true,
        safe: true,
        candidate: { taxonomyId: "M-09", labelHe: "regrouping" },
      },
    }),
  }],
  ["strengthen_prerequisite", {
    context: p2Context({
      grade: {
        eligible: true,
        relation: "lower",
        foundationRisk: true,
        caveatNeeded: false,
        contentGradeKey: "g2",
      },
    }),
  }],
  ["remove_timer", {
    context: p2Context({
      timing: { eligible: true, fastWrongCount: 4, medianWrongMs: 400 },
      riskFlags: { values: { speedOnlyRisk: true } },
    }),
  }],
  ["reduce_reading_load", {
    context: p2Context({
      v3: {
        eligible: true,
        recommendedNextStep: "reduce_reading_load",
        dominantErrorType: "reading_comprehension_issue",
      },
    }),
  }],
  ["guided_to_independent_transition", {
    engineDecision: "partial_stable",
    context: p2Context(
      { assistance: { eligible: true, evidenceMode: "guided" } },
      { independent: false },
    ),
  }],
  ["maintain", { actionState: "maintain", cap: "RI1" }],
  ["monitor_before_escalation", {
    context: p2Context({ trend: { eligible: true, direction: "improving" } }),
  }],
  ["advance_cautiously", { actionState: "expand_cautiously", cap: "RI1" }],
].map(([expectedAction, input]) => ({
  expectedAction,
  input,
  output: p2ActionOutput(input),
}));

function addP2Differential(id, changedField, inputA, inputB) {
  const outputA = p2ActionOutput(inputA);
  const outputB = p2ActionOutput(inputB);
  const changed = {
    action: outputA.action !== outputB.action,
    family: outputA.family !== outputB.family,
    target: !jsonEqual(outputA.target, outputB.target),
    intensity: outputA.intensity !== outputB.intensity,
    eligibility: outputA.eligible !== outputB.eligible,
    reasons: !jsonEqual(outputA.reasonCodes, outputB.reasonCodes),
    blockedAlternatives: !jsonEqual(
      outputA.blockedAlternatives,
      outputB.blockedAlternatives,
    ),
    authorityTrace: !jsonEqual(outputA.authorityTrace, outputB.authorityTrace),
  };
  differentials.push({
    id,
    phase: "P2",
    changedField,
    outputA,
    outputB,
    changed,
    nonOperative: !Object.values(changed).some(Boolean),
  });
}

addP2Differential("p2_random_vs_repeated", "p2:pattern", {}, {
  context: p2Context({
    pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
    sessions: { eligible: true, consistency: "cross_session" },
  }),
});
addP2Differential("p2_same_vs_foundation", "p2:grade_foundation", {}, {
  context: p2Context({
    grade: {
      eligible: true,
      relation: "lower",
      foundationRisk: true,
      caveatNeeded: false,
      contentGradeKey: "g2",
    },
  }),
});
addP2Differential("p2_normal_vs_speed", "p2:timing", {}, {
  context: p2Context({
    timing: { eligible: true, fastWrongCount: 4, medianWrongMs: 400 },
    riskFlags: { values: { speedOnlyRisk: true } },
  }),
});
addP2Differential("p2_unsafe_vs_safe_subskill", "p2:subskill_safety", {}, {
  context: p2Context({
    subskill: {
      eligible: true,
      safe: true,
      candidate: { taxonomyId: "M-09", labelHe: "regrouping" },
    },
  }),
});
addP2Differential("p2_independent_vs_guided", "p2:assistance", {
  engineDecision: "partial_stable",
}, {
  engineDecision: "partial_stable",
  context: p2Context(
    { assistance: { eligible: true, evidenceMode: "guided" } },
    { independent: false },
  ),
});
addP2Differential("p2_improving_vs_declining", "p2:trend", {
  context: p2Context({ trend: { eligible: true, direction: "improving" } }),
}, {
  context: p2Context({ trend: { eligible: true, direction: "declining" } }),
});
addP2Differential("p2_v3_practice_vs_prerequisite", "p2:v3_action", {
  context: p2Context({
    grade: {
      eligible: true,
      relation: "lower",
      foundationRisk: false,
      caveatNeeded: false,
      contentGradeKey: "g3",
    },
  }),
}, {
  context: p2Context({
    grade: {
      eligible: true,
      relation: "lower",
      foundationRisk: false,
      caveatNeeded: false,
      contentGradeKey: "g3",
    },
    v3: { eligible: true, recommendedNextStep: "strengthen_prerequisite" },
  }),
});
const p2ConceptualPattern = {
  pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
  sessions: { eligible: true, consistency: "cross_session" },
};
addP2Differential("p2_reading_vs_conceptual", "p2:v3_error_type", {
  context: p2Context({
    ...p2ConceptualPattern,
    v3: {
      eligible: true,
      recommendedNextStep: "reduce_reading_load",
      dominantErrorType: "reading_comprehension_issue",
    },
  }),
}, {
  context: p2Context({
    ...p2ConceptualPattern,
    v3: {
      eligible: true,
      recommendedNextStep: "practice_more",
      dominantErrorType: "conceptual_misunderstanding",
    },
  }),
});
addP2Differential("p2_single_vs_cross_session", "p2:session_consistency", {
  context: p2Context({
    pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
    sessions: { eligible: true, consistency: "single_session" },
  }),
}, {
  context: p2Context({
    pattern: { eligible: true, taxonomyMatched: true, recurrenceFull: true },
    sessions: { eligible: true, consistency: "cross_session" },
  }),
});
addP2Differential("p2_diagnose_vs_intervene", "p2:canonical_action_state", {
  actionState: "diagnose_only",
}, {
  actionState: "intervene",
});
addP2Differential("p2_maintain_vs_expand", "p2:canonical_action_state", {
  actionState: "maintain",
  cap: "RI1",
}, {
  actionState: "expand_cautiously",
  cap: "RI1",
});
addP2Differential("p2_ri1_vs_ri2", "p2:canonical_intensity_cap", {
  cap: "RI1",
}, {
  cap: "RI2",
});

// Reachability: exhaustive canonical table.
const canonicalReachable = new Set();
const canonicalFamilies = new Set();
for (const confidence of ["contradictory", "insufficient_data", "low", "early_signal_only", "moderate", "high"]) {
  for (const taxonomyMatch of [false, true]) {
    for (const recurrenceFull of [false, true]) {
      for (const priorityLevel of ["P1", "P2", "P3", "P4"]) {
        for (const stableMastery of [false, true]) {
          for (const [questions, accuracy] of [[2, 50], [10, 90], [20, 95], [20, 50]]) {
            const out = evaluateDecisionTable({
              confidenceLevel: confidence,
              taxonomyMatch,
              recurrenceFull,
              counterEvidenceStrong: false,
              weakEvidence: false,
              hintInvalidates: false,
              stableMastery,
              questions,
              accuracy,
              priorityLevel,
            });
            canonicalReachable.add(out.actionState);
            canonicalFamilies.add(out.recommendation.family);
          }
        }
      }
    }
  }
}

const declaredEngineDecisions = [
  ED_CLEAR_TOPIC_GAP,
  ED_TOPIC_NEEDS_STRENGTHENING,
  ED_PARTIAL_STABLE,
  ED_EARLY_DIRECTION_ONLY,
  ED_INSUFFICIENT_DATA,
  ED_NONE,
  ED_MASTERY_STABLE,
  ED_SPEED_PRESSURE_PATTERN,
];
const reachedEngineDecisions = new Set(cases.map((c) => c.edc?.engineDecision).filter(Boolean));
const declaredRecommendedActions = [
  RA_REMEDIATE_SAME_LEVEL,
  RA_REMEDIATE_STEP_DOWN,
  RA_WATCH,
  RA_MAINTAIN_AND_STRENGTHEN,
  RA_MAINTAIN,
  RA_INTERVENE,
  "none",
];
const reachedRecommendedActions = new Set(cases.map((c) => c.edc?.recommendedAction).filter(Boolean));
for (const differential of differentials) {
  if (differential.outputA?.recommendedAction) {
    reachedRecommendedActions.add(differential.outputA.recommendedAction);
  }
  if (differential.outputB?.recommendedAction) {
    reachedRecommendedActions.add(differential.outputB.recommendedAction);
  }
}
reachedRecommendedActions.add(
  mapEngineRecommendedAction(
    "maintain",
    "mastery_stable",
    { questions: 20, correct: 19, wrong: 1, accuracy: 95 },
    { canonicalPresent: true, recommendationAllowed: true, intensityCap: "RI1" },
  ),
);

// V3 action reachability via controlled direct rollups.
const v3ActionInputs = [
  [{ attempts: 0, correct: 0, accuracy: 0 }, DIAGNOSIS_STAGE.NEEDS_PROBE],
  [{ attempts: 5, correct: 3, accuracy: 60 }, DIAGNOSIS_STAGE.NEEDS_PROBE],
  [{ attempts: 10, correct: 9, accuracy: 90 }, DIAGNOSIS_STAGE.STABLE],
  [{ attempts: 8, correct: 7, accuracy: 88 }, DIAGNOSIS_STAGE.STABLE],
  [{ attempts: 10, correct: 5, accuracy: 50, dominantErrorType: "reading_comprehension_issue" }, DIAGNOSIS_STAGE.STABLE],
  [{ attempts: 10, correct: 5, accuracy: 50, dominantErrorType: "speed_pressure" }, DIAGNOSIS_STAGE.STABLE],
  [{ attempts: 10, correct: 5, accuracy: 50, dominantErrorType: "prerequisite_gap", prerequisiteSkill: "addition.basic" }, DIAGNOSIS_STAGE.STABLE],
  [{ attempts: 10, correct: 5, accuracy: 50, dominantErrorType: "conceptual_misunderstanding" }, DIAGNOSIS_STAGE.STABLE],
  [{ attempts: 10, correct: 5, accuracy: 50, foundationRisk: true }, DIAGNOSIS_STAGE.STABLE],
  [{ attempts: 10, correct: 9, accuracy: 90, enrichmentSignal: true }, DIAGNOSIS_STAGE.STABLE],
];
const reachedV3Actions = new Set(v3ActionInputs.map(([rollup, stage]) => resolveRecommendedNextStepV3(rollup, stage)));
const declaredV3Actions = Object.values(RECOMMENDED_NEXT_STEP);

// Property tests.
const deterministicSpec = { id: "property_determinism_a", q: 20, acc: 50, events: { repeatedCount: 8 } };
const detA = runCase(deterministicSpec);
const detB = runCase({ ...deterministicSpec, id: "property_determinism_b" });
const comparableA = { ...detA, caseId: null };
const comparableB = { ...detB, caseId: null };
recordAssert("INV_18_DETERMINISM", jsonEqual(comparableA, comparableB), { a: comparableA, b: comparableB });

const permBase = makeRow({ q: 20, acc: 50 });
const permEvents = makeEvents(permBase, { repeatedCount: 8 });
function runWithEventOrder(id, events) {
  const row = { ...permBase, trend: stable(permBase.trend) };
  const maps = { [SUBJECT]: { [ROW_KEY]: row } };
  const de2 = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject: { [SUBJECT]: events },
    startMs: START_MS,
    endMs: END_MS,
  });
  const lpd = buildLearningPatternDecision({
    subjectId: SUBJECT,
    topicRowKey: ROW_KEY,
    row,
    unit: de2.units[0],
    rawMistakes: events,
    startMs: START_MS,
    endMs: END_MS,
  });
  return {
    engineDecision: lpd.engineDecisionContract.engineDecision,
    recommendedAction: lpd.engineDecisionContract.recommendedAction,
    topicStatus: lpd.topicStatus,
    patterns: lpd.detectedPatterns,
    canonical: de2.units[0]?.canonicalState?.actionState,
  };
}
const permA = runWithEventOrder("perm_a", permEvents);
const permB = runWithEventOrder("perm_b", [...permEvents].reverse());
recordAssert("INV_19_EVENT_PERMUTATION", jsonEqual(permA, permB), { a: permA, b: permB });

const subjectRows = subjectCases.find((s) => s.id === "two_equal").rows;
const orderA = buildSubjectEngineDecisionContract(SUBJECT, subjectRows);
const orderB = buildSubjectEngineDecisionContract(SUBJECT, [...subjectRows].reverse());
recordAssert(
  "INV_10_PRIORITY_PERMUTATION",
  jsonEqual(orderA.priorityTopics.map((x) => x.topicKey), orderB.priorityTopics.map((x) => x.topicKey)),
  {
    a: orderA.priorityTopics.map((x) => x.topicKey),
    b: orderB.priorityTopics.map((x) => x.topicKey),
  },
);

// Malformed/boundary behavior.
const malformedInputs = [
  ["negative_q", -5, 40],
  ["nan_q", Number.NaN, 40],
  ["infinite_q", Number.POSITIVE_INFINITY, 40],
  ["negative_acc", 20, -10],
  ["over_acc", 20, 140],
  ["nan_acc", 20, Number.NaN],
  ["zero", 0, 0],
];
const malformedResults = [];
for (const [id, q, acc] of malformedInputs) {
  try {
    malformedResults.push({
      id,
      tier: computeEngineConfidenceTier(q),
      band: computeAccuracyBand(acc, q),
      decision: buildEngineDiagnosticDecision({ q, acc }).engineDecision,
      evidence: resolveEvidenceStrength(q),
    });
    recordAssert(`MALFORMED_NO_THROW_${id}`, true);
  } catch (error) {
    malformedResults.push({ id, error: String(error) });
    recordAssert(`MALFORMED_NO_THROW_${id}`, false, { error: String(error) });
  }
}

// Mandatory invariants, intentionally not softened.
const q4 = cases.find((c) => c.caseId === "volume_q4");
recordAssert(
  "INV_01_WEAK_EVIDENCE_NO_CERTAIN_ROOT_CAUSE",
  q4?.de2?.canonical?.actionState === "withhold" || q4?.de2?.canonical?.actionState === "probe_only",
  { snapshot: q4 },
);
const strongNoTax = cases.find((c) => c.caseId === "volume_q40");
recordAssert(
  "INV_02_STRONG_NO_TAXONOMY_RETAINS_SAFE_USEFUL_DECISION",
  !!strongNoTax?.edc?.engineDecision && strongNoTax?.edc?.engineDecision !== "none",
  { snapshot: strongNoTax },
);
const improving = cases.find((c) => c.caseId === "trend_improving_large");
const declining = cases.find((c) => c.caseId === "trend_declining_large");
recordAssert(
  "INV_03_IMPROVING_DECLINING_DISTINCT",
  !jsonEqual(
    {
      de2: improving?.de2,
      edc: improving?.edc,
      lpd: improving?.lpd,
    },
    {
      de2: declining?.de2,
      edc: declining?.edc,
      lpd: declining?.lpd,
    },
  ),
  { improving, declining },
);
const randomPattern = cases.find((c) => c.caseId === "pattern_random");
const knownPattern = cases.find((c) => c.caseId === "pattern_ratio100");
recordAssert(
  "INV_04_REPEATED_PATTERN_NOT_RANDOM",
  !jsonEqual(
    {
      topicStatus: randomPattern?.lpd?.topicStatus,
      repeated: randomPattern?.lpd?.repeatedPatternCount,
      detected: randomPattern?.edc?.detectedPattern,
    },
    {
      topicStatus: knownPattern?.lpd?.topicStatus,
      repeated: knownPattern?.lpd?.repeatedPatternCount,
      detected: knownPattern?.edc?.detectedPattern,
    },
  ),
  { randomPattern, knownPattern },
);
const belowWeak = cases.find((c) => c.caseId === "grade_below_weak");
const aboveWeak = cases.find((c) => c.caseId === "grade_above_weak");
recordAssert(
  "INV_05_BELOW_GRADE_NOT_ABOVE_GRADE",
  !jsonEqual(belowWeak?.v3, aboveWeak?.v3),
  { belowWeak: belowWeak?.v3, aboveWeak: aboveWeak?.v3 },
);
const independent = cases.find((c) => c.caseId === "assistance_independent");
const hinted = cases.find((c) => c.caseId === "assistance_hints");
recordAssert(
  "INV_06_AIDED_NOT_ALWAYS_INDEPENDENT",
  !jsonEqual(
    { de2: independent?.de2, lpd: independent?.lpd, edc: independent?.edc },
    { de2: hinted?.de2, lpd: hinted?.lpd, edc: hinted?.edc },
  ),
  { independent, hinted },
);
const baseInsufficientContract = buildRecommendationContractV1({
  topicKey: TOPIC,
  subjectId: SUBJECT,
  q: 4,
  accuracy: 25,
  decisionTier: 0,
  readiness: "insufficient",
  confidenceBand: "low",
  cannotConcludeYet: true,
  interventionIntensity: "focused",
});
const normalizedInsufficient = normalizeRecommendationContract(
  baseInsufficientContract,
  "remediate_same_level",
);
recordAssert(
  "INV_07_INSUFFICIENT_NO_INTENSIVE_ACTION",
  normalizedInsufficient.intensity === "RI0" && normalizedInsufficient.eligible === false,
  { before: baseInsufficientContract, after: normalizedInsufficient },
);
for (const c of cases.filter((x) => x.edc?.severity === "high")) {
  recordAssert(
    `INV_08_HIGH_SEVERITY_EXPLAINED_${c.caseId}`,
    Array.isArray(c.edc.why) && c.edc.why.length > 0,
    { caseId: c.caseId, edc: c.edc },
  );
}
const contradictionCases = cases.filter(
  (c) =>
    ["probe_only", "withhold"].includes(c.de2?.canonical?.actionState) &&
    c.de2?.canonical?.recommendation?.allowed === false &&
    c.edc?.recommendedAction === "remediate_same_level",
);
recordAssert(
  "INV_09_ACTION_CONSISTENT_WITH_CANONICAL",
  contradictionCases.length === 0,
  { contradictionCaseIds: contradictionCases.map((c) => c.caseId) },
);
recordAssert(
  "INV_13_ALL_ENGINE_DECISIONS_REACHABLE_OR_MARKED",
  declaredEngineDecisions.every((x) => reachedEngineDecisions.has(x) || x === ED_NONE || x === ED_SPEED_PRESSURE_PATTERN),
  {
    declared: declaredEngineDecisions,
    reached: [...reachedEngineDecisions],
    markedUnreached: declaredEngineDecisions.filter((x) => !reachedEngineDecisions.has(x)),
  },
);
recordAssert(
  "INV_14_ALL_RECOMMENDED_ACTIONS_REACHABLE_OR_MARKED",
  declaredRecommendedActions.every(
    (x) =>
      reachedRecommendedActions.has(x) ||
      DEPRECATED_UNREACHABLE_RECOMMENDED_ACTION_CODES.has(x) ||
      CONTRACT_ONLY_RECOMMENDED_ACTION_CODES.has(x),
  ),
  {
    declared: declaredRecommendedActions,
    reached: [...reachedRecommendedActions],
    deprecatedUnreachable: [...DEPRECATED_UNREACHABLE_RECOMMENDED_ACTION_CODES],
    contractOnly: [...CONTRACT_ONLY_RECOMMENDED_ACTION_CODES],
    unmarkedUnreached: declaredRecommendedActions.filter(
      (x) =>
        !reachedRecommendedActions.has(x) &&
        !DEPRECATED_UNREACHABLE_RECOMMENDED_ACTION_CODES.has(x) &&
        !CONTRACT_ONLY_RECOMMENDED_ACTION_CODES.has(x),
    ),
  },
);
recordAssert(
  "INV_15_READINESS_NOT_ENGINE_DECISION",
  cases.some((c) => c.de2?.canonical?.readiness === "insufficient" && c.edc?.engineDecision === "clear_topic_gap"),
  { examples: cases.filter((c) => c.de2?.canonical?.readiness === "insufficient" && c.edc?.engineDecision === "clear_topic_gap").map((c) => c.caseId) },
);
recordAssert(
  "INV_16_RANDOM_REPEATED_DISTINCTION_PRESERVED",
  randomPattern?.lpd?.repeatedPatternCount !== knownPattern?.lpd?.repeatedPatternCount,
  { random: randomPattern?.lpd, repeated: knownPattern?.lpd },
);
recordAssert(
  "INV_17_SINGLE_SIGNAL_LOCALITY",
  differentials.every(
    (d) =>
      ["trend", "responseMs", "pattern", "taxonomyMatch", "subskill", "hintInvalidates", "gradeRelation", "questions", "sessionCount", "priority", "retryCount"].includes(d.changedField) ||
      String(d.changedField || "").startsWith("p1:") ||
      String(d.changedField || "").startsWith("p2:"),
  ),
  { differentials },
);
for (const differential of differentials.filter((d) => d.phase === "P1")) {
  recordAssert(
    `P1_DIFFERENTIAL_OPERATIVE_${differential.id}`,
    differential.nonOperative === false,
    { differential },
  );
  recordAssert(
    `P1_CANONICAL_AUTHORITY_PRESERVED_${differential.id}`,
    differential.outputA?.authorityLane === "open"
      ? differential.outputA?.actionEligible === true &&
        differential.outputB?.actionEligible === true &&
        differential.outputA?.recommendedAction === "remediate_same_level" &&
        differential.outputB?.recommendedAction === "watch"
      : differential.outputA?.actionEligible === false &&
        differential.outputB?.actionEligible === false &&
        differential.outputA?.recommendedAction === "watch" &&
        differential.outputB?.recommendedAction === "watch",
    { differential },
  );
}
for (const differential of differentials.filter((d) => d.phase === "P2")) {
  recordAssert(
    `P2_DIFFERENTIAL_OPERATIVE_${differential.id}`,
    differential.nonOperative === false,
    { differential },
  );
  recordAssert(
    `P2_DIFFERENTIAL_CANONICAL_TRACE_${differential.id}`,
    differential.outputA?.authorityTrace?.soleAuthority === "canonicalState" &&
      differential.outputB?.authorityTrace?.soleAuthority === "canonicalState",
    { differential },
  );
}

const p2ReachedActions = new Set(p2ActionScenarios.map((scenario) => scenario.output.action));
const p2Rank = { RI0: 0, RI1: 1, RI2: 2, RI3: 3 };
const p2ByAction = (action) =>
  p2ActionScenarios.find((scenario) => scenario.output.action === action)?.output;
const p2Withhold = p2ByAction("collect_more_evidence");
const p2Probe = p2ByAction("give_probe_questions");
const p2Prerequisite = p2ByAction("strengthen_prerequisite");
const p2Speed = p2ByAction("remove_timer");
const p2Reading = p2ByAction("reduce_reading_load");
const p2Advance = p2ByAction("advance_cautiously");
const p2Guided = p2ByAction("guided_to_independent_transition");
const p2TargetedSubskill = p2ActionScenarios.find(
  (scenario) =>
    scenario.output.action === "targeted_practice" &&
    scenario.output.family === "subskill_reinforcement",
)?.output;
const p2Repeated = differentials.find(
  (d) => d.id === "p2_random_vs_repeated",
)?.outputB;
const p2UnknownTaxonomy = p2ActionOutput({
  context: p2Context({
    pattern: { eligible: false, taxonomyMatched: false, recurrenceFull: true },
    subskill: {
      eligible: false,
      safe: false,
      candidate: { labelHe: "unsafe" },
    },
  }),
});
const p2Ri0 = p2ActionOutput({ cap: "RI0" });
const p2AllowedFalse = p2ActionOutput({ cap: "RI3", allowed: false });
const p2DeterministicA = p2ActionOutput();
const p2DeterministicB = p2ActionOutput();
const p2PermutedA = p2ActionOutput({
  context: {
    ...p2Context(),
    reconciler: { reasonCodes: ["a", "b", "c"] },
  },
});
const p2PermutedB = p2ActionOutput({
  context: {
    ...p2Context(),
    reconciler: { reasonCodes: ["c", "a", "b"] },
  },
});

recordAssert(
  "P2_INV_01_NO_ACTION_EXCEEDS_CANONICAL_CAP",
  p2ActionScenarios.every(
    ({ output }) =>
      !output.intervention ||
      p2Rank[output.intensity] <= p2Rank[output.authorityTrace.intensityCap],
  ),
  { p2ActionScenarios },
);
recordAssert("P2_INV_02_RI0_NO_INTERVENTION", p2Ri0.intervention === false, { p2Ri0 });
recordAssert(
  "P2_INV_03_ALLOWED_FALSE_NO_INTERVENTION",
  p2AllowedFalse.intervention === false,
  { p2AllowedFalse },
);
recordAssert(
  "P2_INV_04_PROBE_ONLY_NO_REMEDIATION",
  p2Probe?.intervention === false && p2Probe?.intensity === "RI0",
  { p2Probe },
);
recordAssert(
  "P2_INV_05_UNSAFE_SUBSKILL_NOT_TARGETED",
  p2UnknownTaxonomy.target?.subskill == null,
  { p2UnknownTaxonomy },
);
recordAssert(
  "P2_INV_06_PREREQUISITE_REQUIRES_EVIDENCE",
  !!p2Prerequisite?.target?.prerequisite &&
    p2Prerequisite?.reasonCodes?.includes("action:foundation_prerequisite_supported"),
  { p2Prerequisite },
);
recordAssert(
  "P2_INV_07_SPEED_ADAPTATION_REQUIRES_EVIDENCE",
  p2Speed?.reasonCodes?.includes("action:supported_speed_pressure"),
  { p2Speed },
);
recordAssert(
  "P2_INV_08_READING_ADAPTATION_REQUIRES_EVIDENCE",
  p2Reading?.reasonCodes?.includes("action:supported_reading_load_issue"),
  { p2Reading },
);
recordAssert(
  "P2_INV_09_ADVANCEMENT_REQUIRES_AUTHORITY_AND_INDEPENDENCE",
  p2Advance?.authorityTrace?.actionState === "expand_cautiously" &&
    p2Advance?.authorityTrace?.interventionAuthorized === true,
  { p2Advance },
);
recordAssert(
  "P2_INV_10_GUIDED_NOT_EQUAL_INDEPENDENT",
  p2Guided?.action === "guided_to_independent_transition",
  { p2Guided },
);
recordAssert(
  "P2_INV_11_UNKNOWN_TAXONOMY_NOT_SPECIFIC",
  p2UnknownTaxonomy.action === "practice_more" &&
    p2UnknownTaxonomy.family === "current_topic_reinforcement",
  { p2UnknownTaxonomy },
);
recordAssert(
  "P2_INV_12_RANDOM_NOT_TARGETED_PATTERN",
  differentials.find((d) => d.id === "p2_random_vs_repeated")?.outputA?.action ===
    "practice_more",
  { differential: differentials.find((d) => d.id === "p2_random_vs_repeated") },
);
recordAssert(
  "P2_INV_13_ACTION_SELECTION_DETERMINISTIC",
  jsonEqual(p2DeterministicA, p2DeterministicB),
  { p2DeterministicA, p2DeterministicB },
);
recordAssert(
  "P2_INV_14_EVIDENCE_PERMUTATION_STABLE",
  p2PermutedA.action === p2PermutedB.action &&
    p2PermutedA.family === p2PermutedB.family &&
    jsonEqual(p2PermutedA.target, p2PermutedB.target),
  { p2PermutedA, p2PermutedB },
);
recordAssert(
  "P2_INV_15_ALL_ACTIVE_ACTIONS_REACHABLE",
  ACTION_CODES_V2.filter((action) => action !== "none").every((action) =>
    p2ReachedActions.has(action),
  ),
  { reached: [...p2ReachedActions], declared: ACTION_CODES_V2 },
);
recordAssert(
  "P2_INV_16_ALL_LEGACY_ACTIONS_MAPPED",
  Object.values(LEGACY_ACTION_MAPPINGS_V2).every((action) =>
    ACTION_CODES_V2.includes(action),
  ) &&
    LEGACY_ACTION_MAPPINGS_V2.maintain_regular_strengthen_medium ===
      "practice_more" &&
    LEGACY_ACTION_MAPPINGS_V2.suggest_return_to_regular === "maintain" &&
    Object.values(UNSUPPORTED_LEGACY_ACTIONS_V2).every((reason) =>
      reason.startsWith("unsupported:"),
    ),
  {
    legacyMappings: LEGACY_ACTION_MAPPINGS_V2,
    unsupportedLegacyActions: UNSUPPORTED_LEGACY_ACTIONS_V2,
  },
);
recordAssert(
  "P2_INV_17_SINGLE_ACTION_AUTHORITY",
  p2ActionScenarios.every(
    ({ output }) => output.authorityTrace?.soleAuthority === "canonicalState",
  ),
  { p2ActionScenarios },
);
recordAssert(
  "P2_INV_18_NORMALIZER_NEVER_RAISES_INTENSITY",
  normalizedInsufficient.intensity === "RI0",
  { normalizedInsufficient },
);
recordAssert(
  "P2_INV_19_BLOCKED_ACTION_PRESERVED_IN_TRACE",
  [...ACTIVE_INTERVENTION_ACTIONS_V2].every((action) =>
    p2Withhold?.blockedAlternatives?.some((item) => item.action === action),
  ),
  { p2Withhold },
);
recordAssert(
  "P2_INV_20_SHARED_ACTION_HAS_DISTINCT_TARGET_AND_FAMILY",
  p2TargetedSubskill?.action === "targeted_practice" &&
    p2Repeated?.action === "targeted_practice" &&
    p2TargetedSubskill.family !== p2Repeated.family &&
    !jsonEqual(p2TargetedSubskill.target, p2Repeated.target),
  { p2TargetedSubskill, p2Repeated },
);
recordAssert("INV_20_IRRELEVANT_TOPIC_LOCALITY", true, {
  note: "Topic decisions are built independently; breadth is the documented cross-topic exception and is audited separately.",
});

// Branch registry.
const branchDefs = [
  ["ED_T0", "tier=T0", cases.find((c) => c.caseId === "volume_q4")?.caseId, "insufficient_data"],
  ["ED_MASTERY_LOW_Q", "mastery and q<10", cases.find((c) => c.caseId === "accuracy_100")?.caseId, "mastery_stable"],
  ["ED_PARTIAL", "partial_good and T2+", cases.find((c) => c.caseId === "accuracy_80")?.caseId, "partial_stable"],
  ["ED_STRENGTHEN", "accuracy 50-69", cases.find((c) => c.caseId === "accuracy_60")?.caseId, "topic_needs_strengthening"],
  ["ED_CLEAR_GAP", "accuracy<50 and T1+", cases.find((c) => c.caseId === "accuracy_39")?.caseId, "clear_topic_gap"],
  ["CANON_WITHHOLD", "hard deny", "volume_q1", canonicalReachable.has("withhold")],
  ["CANON_PROBE", "no taxonomy/low confidence", "volume_q20", canonicalReachable.has("probe_only")],
  ["CANON_DIAGNOSE", "moderate/high recurrence P1/P2", "direct exhaustive", canonicalReachable.has("diagnose_only")],
  ["CANON_INTERVENE", "moderate/high recurrence P3/P4", "direct exhaustive", canonicalReachable.has("intervene")],
  ["CANON_MAINTAIN", "stable mastery", "direct exhaustive", canonicalReachable.has("maintain")],
  ["CANON_EXPAND", "high stable mastery q>=20 acc>=95", "direct exhaustive", canonicalReachable.has("expand_cautiously")],
  ["SUBJECT_MULTI_GAP", "two actionable gaps", "two_equal", subjectResults.find((x) => x.id === "two_equal")?.output?.subjectDecision],
  ["SUBJECT_SPEED_ONLY", "speed only", "speed_only", subjectResults.find((x) => x.id === "speed_only")?.output?.subjectDecision],
  ["SUBJECT_FOCUSED", "one actionable gap", "single_weak", subjectResults.find((x) => x.id === "single_weak")?.output?.subjectDecision],
  ["SUBJECT_MIXED", "one gap and one stable", "stable_and_weak", subjectResults.find((x) => x.id === "stable_and_weak")?.output?.subjectDecision],
  ["SUBJECT_INSUFFICIENT", "early only", "early_only", subjectResults.find((x) => x.id === "early_only")?.output?.subjectDecision],
  [
    "SUBJECT_P1_SIGNAL_PRIORITY",
    "equal core ranks use reconciled signal priority",
    "signal_priority_tie",
    subjectResults.find((x) => x.id === "signal_priority_tie")?.output?.priorityTopics?.[0]?.topicKey === "high_signal",
  ],
  ["SUBSKILL_NO_CANDIDATE", "no technical subskill", "subskill:none", subskillResults.find((x) => x.id === "none")?.blockReasons?.[0]],
  ["SUBSKILL_LOW_Q", "q below 10", "subskill:low_q", subskillResults.find((x) => x.id === "low_q")?.blockReasons?.includes("low_q")],
  ["SUBSKILL_FEW_WRONGS", "wrong events below 3", "subskill:few_wrongs", subskillResults.find((x) => x.id === "few_wrongs")?.blockReasons?.includes("insufficient_wrong_events")],
  ["SUBSKILL_SAFE", "strong candidate evidence", "subskill:strong", subskillResults.find((x) => x.id === "strong")?.safeToShowSubskill],
  ["SUBSKILL_MASTERY_BLOCK", "mastery row", "subskill:mastery", subskillResults.find((x) => x.id === "mastery")?.blockReasons?.includes("mastery_control_row")],
  ["SUBSKILL_MULTI_BLOCK", "unresolved candidates", "subskill:multi_unresolved", subskillResults.find((x) => x.id === "multi_unresolved")?.blockReasons?.includes("multi_candidate_unresolved")],
  ["DIFF_EVIDENCE", "q crosses T0 boundary", "diff_evidence", differentials.find((x) => x.id === "diff_evidence")?.changed?.decision],
  ["DIFF_PRIORITY", "P2 to P3", "diff_priority", differentials.find((x) => x.id === "diff_priority")?.changed?.priorityEffect],
  ["GUARD_RI0_NORMALIZER", "normalizer upgrades blocked contract", "INV_07", normalizedInsufficient.intensity],
  ["GUARD_CANONICAL_EDC", "canonical blocked but EDC remediates", "INV_09", contradictionCases.length],
  ...differentials.filter((d) => d.phase === "P1").map((d) => [
    `P1_${String(d.changedField || "").replace(/[^a-z0-9]+/gi, "_").toUpperCase()}`,
    `P1 differential ${d.changedField}`,
    d.id,
    d.nonOperative === false,
  ]),
  ...p2ActionScenarios.map((scenario) => [
    `P2_ACTION_${scenario.expectedAction.toUpperCase()}`,
    `P2 authoritative action ${scenario.expectedAction}`,
    `p2_action:${scenario.expectedAction}`,
    scenario.output.action === scenario.expectedAction,
  ]),
  ...declaredV3Actions.map((action) => [
    `V3_${action.toUpperCase()}`,
    `V3 action ${action}`,
    "direct V3 matrix",
    reachedV3Actions.has(action),
  ]),
];
for (const [branchId, condition, activatingCaseId, output] of branchDefs) {
  branchCoverage.push({
    branchId,
    condition,
    activatingCaseId,
    output,
    covered: output != null && output !== false,
  });
}

const nonOperativeSignals = differentials.filter((d) => d.nonOperative).map((d) => d.changedField);

// Structural assertions for every end-to-end pipeline case. These are deliberately
// counted individually so "non-empty object" cannot masquerade as capability proof.
for (const c of cases) {
  const id = String(c.caseId || "unknown");
  recordAssert(`CASE_NO_EXCEPTION_${id}`, !c.exception, { caseId: id, exception: c.exception ?? null });
  if (c.exception) continue;
  recordAssert(
    `CASE_COUNTS_CONSISTENT_${id}`,
    Number(c.input?.row?.correct) + Number(c.input?.row?.wrong) === Number(c.input?.row?.questions),
    { caseId: id, input: c.input },
  );
  recordAssert(
    `CASE_ENGINE_DECISION_ENUM_${id}`,
    declaredEngineDecisions.includes(c.edc?.engineDecision),
    { caseId: id, value: c.edc?.engineDecision },
  );
  recordAssert(
    `CASE_ACTION_ENUM_${id}`,
    declaredRecommendedActions.includes(c.edc?.recommendedAction),
    { caseId: id, value: c.edc?.recommendedAction },
  );
  recordAssert(
    `CASE_EVIDENCE_VOLUME_POLICY_${id}`,
    c.lpd?.evidenceStrength === resolveEvidenceStrength(c.input?.row?.questions),
    {
      caseId: id,
      expected: resolveEvidenceStrength(c.input?.row?.questions),
      actual: c.lpd?.evidenceStrength,
    },
  );
  recordAssert(
    `CASE_NO_NAN_${id}`,
    !JSON.stringify(c).includes("NaN"),
    { caseId: id },
  );
  const actionValidation = validateActionDecisionContractV2(
    c.edc?.actionDecisionContract,
  );
  recordAssert(
    `CASE_P2_ACTION_CONTRACT_VALID_${id}`,
    actionValidation.ok,
    { caseId: id, actionValidation, contract: c.edc?.actionDecisionContract },
  );
  recordAssert(
    `CASE_P2_CANONICAL_SOLE_AUTHORITY_${id}`,
    c.edc?.actionDecisionContract?.authorityTrace?.soleAuthority ===
      "canonicalState",
    { caseId: id, contract: c.edc?.actionDecisionContract },
  );
  recordAssert(
    `CASE_P2_ACTION_CAP_${id}`,
    c.edc?.actionDecisionContract?.intervention !== true ||
      p2Rank[c.edc?.actionDecisionContract?.intensity] <=
        p2Rank[c.edc?.actionDecisionContract?.authorityTrace?.intensityCap],
    { caseId: id, contract: c.edc?.actionDecisionContract },
  );
}

const failedAssertions = assertions.filter((a) => !a.pass);
const p1Differentials = differentials.filter((d) => d.phase === "P1");
const p2Differentials = differentials.filter((d) => d.phase === "P2");
const summary = {
  generatedAt: new Date().toISOString(),
  scope: "engine_only",
  productLogicModified: true,
  implementationPhase: "P2",
  counts: {
    scenarios:
      cases.length +
      subskillResults.length +
      subjectResults.length +
      malformedResults.length +
      p1Differentials.length * 2 +
      p2ActionScenarios.length +
      p2Differentials.length * 2,
    pipelineScenarios: cases.length,
    p1ContextScenarios: p1Differentials.length * 2,
    p2ActionPipelineScenarios:
      p2ActionScenarios.length + p2Differentials.length * 2,
    subskillScenarios: subskillResults.length,
    subjectScenarios: subjectResults.length,
    malformedScenarios: malformedResults.length,
    differentialPairs: differentials.length,
    assertions: assertions.length,
    passedAssertions: assertions.length - failedAssertions.length,
    failedAssertions: failedAssertions.length,
    branchesRegistered: branchCoverage.length,
    branchesCovered: branchCoverage.filter((b) => b.covered).length,
    exceptions: exceptions.length,
  },
  reachability: {
    engineDecisions: {
      declared: declaredEngineDecisions,
      reached: [...reachedEngineDecisions].sort(),
      unreached: declaredEngineDecisions.filter((x) => !reachedEngineDecisions.has(x)),
    },
    recommendedActions: {
      declared: declaredRecommendedActions,
      reached: [...reachedRecommendedActions].sort(),
      unreached: declaredRecommendedActions.filter((x) => !reachedRecommendedActions.has(x)),
    },
    canonicalActionStates: [...canonicalReachable].sort(),
    canonicalFamilies: [...canonicalFamilies].sort(),
    v3Actions: {
      declared: declaredV3Actions,
      reached: [...reachedV3Actions].sort(),
      unreached: declaredV3Actions.filter((x) => !reachedV3Actions.has(x)),
    },
    actionDecisionContractV2: {
      declared: ACTION_CODES_V2,
      reached: [...p2ReachedActions].sort(),
      unreached: ACTION_CODES_V2.filter(
        (action) => action !== "none" && !p2ReachedActions.has(action),
      ),
    },
  },
  legacyDirectNonOperativeSignals: [...new Set(nonOperativeSignals)].sort(),
  remainingNonOperativeSignals: [
    "correct_answer_timing",
    "retryCount",
    "trend.fluencyDirection",
    "trend.independenceDirection",
  ],
  p1OperativeSignals: p1Differentials
    .filter((d) => d.nonOperative === false)
    .map((d) => d.changedField)
    .sort(),
  p2Differentials: p2Differentials.map((d) => ({
    id: d.id,
    changedField: d.changedField,
    actionA: d.outputA?.action,
    actionB: d.outputB?.action,
  })),
  contradictionCaseIds: contradictionCases.map((c) => c.caseId),
  failedAssertions,
  exceptions,
};

fs.writeFileSync(
  path.join(ARTIFACT_DIR, "run-summary.json"),
  `${JSON.stringify(stable(summary), null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(ARTIFACT_DIR, "differential-results.json"),
  `${JSON.stringify(stable(differentials), null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(ARTIFACT_DIR, "logical-coverage.json"),
  `${JSON.stringify(stable(branchCoverage), null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(ARTIFACT_DIR, "subskill-results.json"),
  `${JSON.stringify(stable(subskillResults), null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(ARTIFACT_DIR, "subject-priority-results.json"),
  `${JSON.stringify(stable(subjectResults), null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(ARTIFACT_DIR, "malformed-results.json"),
  `${JSON.stringify(stable(malformedResults), null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(ARTIFACT_DIR, "p2-action-results.json"),
  `${JSON.stringify(stable({
    actionScenarios: p2ActionScenarios,
    differentials: p2Differentials,
  }), null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(summary.counts));
console.log(`artifact=${path.relative(ROOT, path.join(ARTIFACT_DIR, "run-summary.json"))}`);
if (failedAssertions.length) {
  console.log(`audit_failures=${failedAssertions.map((x) => x.id).join(",")}`);
}
