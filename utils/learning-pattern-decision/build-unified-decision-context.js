import { assessSubskillCandidateSafety } from "../subskill-candidate-safety.js";
import {
  isIndependentRecurrenceEvidence,
} from "../diagnostic-evidence-eligibility.js";

const GUIDED_MODES = new Set([
  "learning",
  "guided_practice",
  "learning_book",
  "mistakes",
  "practice_mistakes",
]);

function finiteNumber(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeGradeRelation(value) {
  const relation = String(value || "").trim().toLowerCase();
  if (["lower", "below_registered_grade", "below"].includes(relation)) return "lower";
  if (["higher", "above_registered_grade", "above"].includes(relation)) return "higher";
  if (["same", "same_as_registered_grade"].includes(relation)) return "same";
  return "unknown";
}

function trendSnapshot(row) {
  const trend = row?.trend && typeof row.trend === "object" ? row.trend : {};
  const windows = trend.windows && typeof trend.windows === "object" ? trend.windows : {};
  const recentAccuracy = finiteNumber(windows.recentShortWindow?.accuracy);
  const previousAccuracy = finiteNumber(windows.previousComparablePeriod?.accuracy);
  const explicitDirection = String(trend.accuracyDirection || "").toLowerCase();
  const delta =
    recentAccuracy != null && previousAccuracy != null
      ? Math.round((recentAccuracy - previousAccuracy) * 10) / 10
      : null;
  const direction =
    explicitDirection === "up" || explicitDirection === "improving"
      ? "improving"
      : explicitDirection === "down" || explicitDirection === "declining"
        ? "declining"
        : explicitDirection === "flat" || explicitDirection === "stable"
          ? "stable"
          : delta != null && delta >= 8
            ? "improving"
            : delta != null && delta <= -8
              ? "declining"
              : "unknown";
  return {
    source: "row.trend",
    direction,
    delta,
    confidence: finiteNumber(trend.confidence, 0),
    recentAccuracy,
    previousAccuracy,
    eligible: direction !== "unknown" && finiteNumber(trend.confidence, 0) >= 0.5,
  };
}

function sessionSnapshot(row) {
  const windows = row?.trend?.windows || {};
  const current = Math.max(0, finiteNumber(windows.currentPeriod?.sessionCount, 0));
  const previous = Math.max(0, finiteNumber(windows.previousComparablePeriod?.sessionCount, 0));
  const recent = Math.max(0, finiteNumber(windows.recentShortWindow?.sessionCount, 0));
  const observed = Math.max(current, previous, recent);
  return {
    source: "row.trend.windows",
    current,
    previous,
    recent,
    observed,
    consistency:
      observed >= 2 && current >= 1 && previous >= 1
        ? "cross_session"
        : observed === 1
          ? "single_session"
          : "unknown",
    eligible: observed >= 1,
  };
}

/**
 * Build the single P1 signal context consumed by the combined decision reconciler.
 * This context may refine diagnosis and priority, but never action authority.
 *
 * @param {{
 *   row?: Record<string, unknown>,
 *   unit?: Record<string, unknown>|null,
 *   v3Enrichment?: Record<string, unknown>|null,
 *   eligibleMistakes?: unknown[],
 *   excludedEvidence?: unknown[],
 *   evidenceBucketCounts?: { independentCount?: number, guidedCount?: number, competitiveCount?: number }
 * }} input
 */
export function buildUnifiedDecisionContext(input = {}) {
  const row = input.row && typeof input.row === "object" ? input.row : {};
  const unit = input.unit && typeof input.unit === "object" ? input.unit : null;
  const v3 = input.v3Enrichment?.v3Rollup || null;
  const mistakes = Array.isArray(input.eligibleMistakes) ? input.eligibleMistakes : [];
  const wrongs = mistakes.filter((event) => event && event.isCorrect !== true);
  const excludedEvidence = Array.isArray(input.excludedEvidence) ? input.excludedEvidence : [];
  const canonical = unit?.canonicalState || null;
  const canonicalRecommendation = canonical?.recommendation || null;
  const q = Math.max(0, finiteNumber(row.questions, 0));
  const modeKey = String(row.modeKey || "").trim().toLowerCase();
  const behavior = row?.behaviorProfile && typeof row.behaviorProfile === "object"
    ? row.behaviorProfile
    : {};
  const behaviorSignals =
    behavior.signals && typeof behavior.signals === "object" ? behavior.signals : {};
  const rowEngineSignals =
    row?.topicEngineRowSignals && typeof row.topicEngineRowSignals === "object"
      ? row.topicEngineRowSignals
      : {};
  const precomputedDiagnostic =
    rowEngineSignals.engineDiagnosticDecision &&
    typeof rowEngineSignals.engineDiagnosticDecision === "object"
      ? rowEngineSignals.engineDiagnosticDecision
      : null;
  const rowRiskFlags =
    rowEngineSignals.riskFlags &&
    typeof rowEngineSignals.riskFlags === "object"
      ? rowEngineSignals.riskFlags
      : {};

  const trend = trendSnapshot(row);
  const sessions = sessionSnapshot(row);
  const hintRate = finiteNumber(behaviorSignals.hintRate);
  const guidedMode = GUIDED_MODES.has(modeKey);
  const afterStepByStepCount = wrongs.filter(
    (event) => event?.afterStepByStep === true,
  ).length;
  const assistance = {
    source: "row.behaviorProfile+row.modeKey",
    modeKey,
    guidedMode,
    hintRate,
    hintKnownCount: Math.max(0, finiteNumber(behaviorSignals.hintKnownCount, 0)),
    afterStepByStepCount,
    evidenceMode:
      guidedMode || afterStepByStepCount > 0 || (hintRate != null && hintRate >= 0.42)
        ? "guided"
        : hintRate != null && hintRate > 0
          ? "mixed"
          : "independent",
    eligible: q >= 3,
  };
  const probeEvidenceSupported = wrongs.some(
    (event) =>
      event?.metadata?.probeConfirmed === true ||
      event?.metadata?.answerEvidence?.evidenceType === "PROBE_CONFIRMED",
  );
  const independentEvidenceCount = Number.isFinite(
    Number(input?.evidenceBucketCounts?.independentCount),
  )
    ? Math.max(0, Number(input.evidenceBucketCounts.independentCount))
    : assistance.evidenceMode === "guided"
      ? 0
      : wrongs.filter(isIndependentRecurrenceEvidence).length;

  const timing = {
    source: v3 ? "v3.v3Rollup" : "row.behaviorProfile",
    avgTimeMs: finiteNumber(v3?.avgTimeMs),
    slowCount: Math.max(0, finiteNumber(v3?.slowCount, 0)),
    fastWrongCount: Math.max(0, finiteNumber(v3?.fastWrongCount, 0)),
    medianWrongMs: finiteNumber(behaviorSignals.medianResponseMsWrong),
    eligible:
      q >= 3 &&
      (finiteNumber(v3?.avgTimeMs) != null ||
        finiteNumber(behaviorSignals.medianResponseMsWrong) != null),
  };

  const de2Grade = unit?.gradeEvidence || {};
  const v3Grade = v3?.gradeContext || {};
  const v3GradeRelation = normalizeGradeRelation(
    v3?.gradeRelation || v3Grade.dominantRelation || v3Grade.relation,
  );
  const de2GradeRelation = normalizeGradeRelation(de2Grade.gradeRelation || row.gradeRelation);
  const gradeRelation =
    v3GradeRelation !== "unknown" ? v3GradeRelation : de2GradeRelation;
  const grade = {
    source: v3 ? "v3.v3Rollup.gradeContext+de2.gradeEvidence" : "de2.gradeEvidence",
    relation: gradeRelation,
    foundationRisk: v3?.foundationRisk === true || v3Grade.foundationRisk === true,
    enrichmentSignal: v3?.enrichmentSignal === true || v3Grade.enrichmentSignal === true,
    caveatNeeded: v3?.caveatNeeded === true || v3Grade.caveatNeeded === true,
    registeredGradeKey: de2Grade.registeredGradeKey ?? row.registeredGradeKey ?? null,
    contentGradeKey: de2Grade.contentGradeKey ?? row.contentGradeKey ?? null,
    eligible: gradeRelation !== "unknown",
  };

  const taxonomyId = unit?.taxonomy?.id ? String(unit.taxonomy.id) : null;
  const recurrenceFull = unit?.recurrence?.full === true;
  const precomputedTaxonomyId = String(
    precomputedDiagnostic?.taxonomyMatchId ||
      precomputedDiagnostic?.taxonomyMatch?.taxonomyId ||
      "",
  ).trim();
  const precomputedSubskill =
    precomputedDiagnostic?.subskillCandidateTechnical &&
    typeof precomputedDiagnostic.subskillCandidateTechnical === "object"
      ? precomputedDiagnostic.subskillCandidateTechnical
      : null;
  const technicalSubskill =
    taxonomyId &&
    precomputedSubskill &&
    (!precomputedTaxonomyId || precomputedTaxonomyId === taxonomyId)
      ? {
          ...precomputedSubskill,
          taxonomyId,
          labelHe:
            precomputedSubskill.labelHe ||
            precomputedSubskill.label ||
            String(unit?.taxonomy?.subskillHe || ""),
        }
      : taxonomyId && unit?.taxonomy?.subskillHe
        ? { taxonomyId, labelHe: String(unit.taxonomy.subskillHe) }
        : null;
  const taxonomyAdapter = technicalSubskill
    ? {
        taxonomyMatch: true,
        taxonomyId,
        matchStrength: recurrenceFull ? "strong" : "moderate",
        normalizedBucketKey: String(unit?.bucketKey || row.bucketKey || ""),
        subskillCandidate: technicalSubskill,
        candidateIds: Array.isArray(unit?.taxonomySelection?.candidateIdsRaw)
          ? unit.taxonomySelection.candidateIdsRaw
          : [taxonomyId],
        candidateIdsOrdered: Array.isArray(
          unit?.taxonomySelection?.candidateIdsOrdered,
        )
          ? unit.taxonomySelection.candidateIdsOrdered
          : [taxonomyId],
        disambiguationApplied:
          unit?.taxonomySelection?.disambiguationApplied === true,
        disambiguationWinnerId:
          unit?.taxonomySelection?.disambiguationWinnerId || null,
      }
    : null;
  const precomputedSafety =
    taxonomyId &&
    wrongs.length >= 3 &&
    (!precomputedTaxonomyId || precomputedTaxonomyId === taxonomyId) &&
    precomputedDiagnostic?.subskillSafety?.contractVersion === 3 &&
    typeof precomputedDiagnostic.subskillSafety === "object"
      ? precomputedDiagnostic.subskillSafety
      : null;
  const subskillSafety =
    precomputedSafety ||
    assessSubskillCandidateSafety({
      subjectId: String(unit?.subjectId || ""),
      row,
      wrongs,
      taxonomyMatch: taxonomyAdapter,
      candidateIdsRaw: taxonomyAdapter?.candidateIds || [],
      candidateIdsOrdered: taxonomyAdapter?.candidateIdsOrdered || [],
      chosenId: taxonomyId,
      recurrenceMatched: recurrenceFull,
      disambiguationApplied: taxonomyAdapter?.disambiguationApplied,
      disambiguationWinnerId: taxonomyAdapter?.disambiguationWinnerId,
      independentEvidenceCount,
      probeEvidenceSupported,
      counterEvidenceStrong:
        Math.round(finiteNumber(row.accuracy, 0)) >= 88 && wrongs.length >= 4,
      patternActiveRecently:
        typeof rowEngineSignals.patternActiveRecently === "boolean"
          ? rowEngineSignals.patternActiveRecently
          : undefined,
    });
  const pattern = {
    source: "de2.taxonomy+de2.recurrence",
    taxonomyMatched: !!taxonomyId,
    taxonomyId,
    recurrenceFull,
    wrongEventCount: wrongs.length,
    dominantPattern:
      unit?.taxonomy?.patternHe || v3?.dominantErrorType || null,
    eligible:
      !!taxonomyId &&
      recurrenceFull &&
      wrongs.length >= 2 &&
      (independentEvidenceCount >= 3 || probeEvidenceSupported),
  };
  const subskill = {
    source: precomputedSafety
      ? "row.topicEngineRowSignals.engineDiagnosticDecision+de2.taxonomy"
      : "de2.taxonomy+subskill-candidate-safety",
    candidate: technicalSubskill,
    safe: subskillSafety.safeToShowSubskill === true,
    safety: subskillSafety,
    eligible: subskillSafety.safeToShowSubskill === true,
  };

  const v3Signal = {
    source: "v3.v3Rollup",
    present: !!v3,
    evidenceStrength: String(v3?.evidenceStrength || "none"),
    confidence: String(v3?.confidence || ""),
    diagnosisStage: String(v3?.diagnosisStage || ""),
    contradictory: v3?.contradictorySignals === true,
    recommendedNextStep: String(v3?.recommendedNextStep || ""),
    dominantErrorType: String(v3?.dominantErrorType || ""),
    prerequisiteSkill: v3?.prerequisiteSkill ? String(v3.prerequisiteSkill) : null,
    eligible: !!v3 && !["none", "thin"].includes(String(v3?.evidenceStrength || "none")),
  };
  const upstreamDiagnostic = {
    source: "row.topicEngineRowSignals",
    present: !!precomputedDiagnostic,
    producedBeforeDe2: true,
    diagnosticType: String(
      rowEngineSignals.diagnosticType ||
      precomputedDiagnostic?.behaviorType ||
      behavior.dominantType ||
      "",
    ),
    rootCause: String(
      rowEngineSignals.rootCause || precomputedDiagnostic?.rootCause || "",
    ),
    conclusionStrength: String(rowEngineSignals.conclusionStrength || ""),
    shouldAvoidStrongConclusion: rowEngineSignals.shouldAvoidStrongConclusion === true,
    taxonomyMatchId: precomputedTaxonomyId || null,
  };

  const evidenceEligibility = {
    performance: q >= 5,
    de2Diagnosis: unit?.diagnosis?.allowed === true,
    v3: v3Signal.eligible,
    lpdPattern: wrongs.length >= 2,
    pattern: pattern.eligible,
    subskill: subskill.eligible,
    independent: assistance.evidenceMode === "independent",
    action:
      !!canonical &&
      canonicalRecommendation?.allowed === true &&
      String(canonicalRecommendation?.intensityCap || "RI0") !== "RI0" &&
      !["withhold", "probe_only"].includes(String(canonical?.actionState || "")),
  };

  const conflicts = [];
  if (v3Signal.contradictory) conflicts.push("v3:contradictory_evidence");
  if (trend.direction === "improving" && rowRiskFlags.recentTransitionRisk === true) {
    conflicts.push("trend:improving_with_recent_transition_risk");
  }
  if (grade.foundationRisk && grade.enrichmentSignal) {
    conflicts.push("grade:foundation_and_enrichment_conflict");
  }
  if (assistance.evidenceMode === "guided" && String(behavior.dominantType || "") === "stable_mastery") {
    conflicts.push("assistance:guided_mastery_conflict");
  }
  evidenceEligibility.unifiedConclusion =
    !evidenceEligibility.performance
      ? "insufficient"
      : conflicts.length > 0 || v3Signal.contradictory
        ? "contradictory"
        : assistance.evidenceMode === "guided"
          ? "descriptive_only"
          : evidenceEligibility.de2Diagnosis || evidenceEligibility.v3
            ? "supported"
            : "preliminary";

  /** @type {{ source: string, delta: number, reasonCode: string }[]} */
  const contributions = [];
  const add = (source, delta, reasonCode) => contributions.push({ source, delta, reasonCode });
  if (trend.eligible && trend.direction === "declining") add("trend", 2, "trend:declining_supported");
  if (trend.eligible && trend.direction === "improving") add("trend", -1, "trend:improving_supported");
  if (timing.eligible && timing.fastWrongCount >= 2) add("timing", 1, "timing:repeated_fast_wrong");
  if (
    timing.eligible &&
    timing.slowCount >= 3 &&
    Math.round(finiteNumber(row.accuracy, 0)) >= 70
  ) {
    add("timing", 1, "timing:slow_with_preserved_accuracy");
  }
  if (assistance.eligible && assistance.evidenceMode === "guided") {
    add("assistance", 1, "assistance:guided_evidence_only");
  }
  if (grade.eligible && grade.foundationRisk && grade.relation === "lower") {
    add("grade", 2, "grade:foundation_risk_supported");
  } else if (grade.eligible && grade.relation === "higher" && grade.caveatNeeded) {
    add("grade", -2, "grade:above_grade_caveat");
  } else if (grade.eligible && grade.enrichmentSignal) {
    add("grade", -1, "grade:enrichment_signal");
  }
  if (pattern.eligible) add("pattern", 2, "pattern:taxonomy_recurrence_supported");
  if (sessions.eligible && sessions.consistency === "cross_session" && pattern.recurrenceFull) {
    add("sessions", 1, "sessions:pattern_cross_session");
  } else if (sessions.eligible && sessions.consistency === "single_session") {
    add("sessions", -1, "sessions:single_session_only");
  }
  if (v3Signal.eligible) {
    if (v3Signal.recommendedNextStep === "strengthen_prerequisite") {
      add(
        "v3",
        grade.foundationRisk ? 0 : 2,
        grade.foundationRisk
          ? "v3:corroborates_foundation_risk"
          : "v3:strengthen_prerequisite",
      );
    } else if (v3Signal.recommendedNextStep === "remove_timer") {
      add(
        "v3",
        rowRiskFlags.speedOnlyRisk === true ? 0 : 1,
        rowRiskFlags.speedOnlyRisk === true
          ? "v3:corroborates_speed_only"
          : "v3:remove_timer",
      );
    } else if (["practice_more", "reduce_reading_load"].includes(v3Signal.recommendedNextStep)) {
      add("v3", 1, `v3:${v3Signal.recommendedNextStep}`);
    } else if (v3Signal.recommendedNextStep === "give_probe_questions") {
      add(
        "v3",
        grade.caveatNeeded || v3Signal.contradictory ? 0 : -1,
        grade.caveatNeeded || v3Signal.contradictory
          ? "v3:corroborates_probe_guard"
          : "v3:give_probe_questions",
      );
    } else if (["advance_cautiously", "maintain"].includes(v3Signal.recommendedNextStep)) {
      add("v3", -1, `v3:${v3Signal.recommendedNextStep}`);
    }
  }
  if (rowRiskFlags.insufficientEvidenceRisk === true) add("risk_flags", -2, "risk:insufficient_evidence");
  if (rowRiskFlags.falseRemediationRisk === true) add("risk_flags", -2, "risk:false_remediation");
  if (rowRiskFlags.falsePromotionRisk === true) add("risk_flags", -2, "risk:false_promotion");
  if (rowRiskFlags.recentTransitionRisk === true) add("risk_flags", -1, "risk:recent_transition");
  if (rowRiskFlags.hintDependenceRisk === true) add("risk_flags", 1, "risk:hint_dependence");
  if (rowRiskFlags.speedOnlyRisk === true) add("risk_flags", 1, "risk:speed_only");

  const bySource = new Map();
  for (const item of contributions) {
    const existing = bySource.get(item.source);
    if (!existing || Math.abs(item.delta) > Math.abs(existing.delta)) {
      bySource.set(item.source, item);
    }
  }
  const reconciledContributions = [...bySource.values()];
  const rawPriorityAdjustment = reconciledContributions.reduce((sum, item) => sum + item.delta, 0);
  const priorityAdjustment = Math.max(-4, Math.min(4, rawPriorityAdjustment));

  const reasonCodes = [
    ...reconciledContributions.map((item) => item.reasonCode),
    ...conflicts,
    ...(excludedEvidence.length > 0 ? ["evidence:excluded_buckets_present"] : []),
  ];

  return {
    version: 1,
    authority: {
      actionSource: "canonicalState",
      canonicalPresent: !!canonical,
      actionEligible: evidenceEligibility.action,
      actionState: canonical?.actionState || null,
      recommendationAllowed: canonicalRecommendation?.allowed === true,
      intensityCap: String(canonicalRecommendation?.intensityCap || "RI0"),
    },
    evidenceEligibility,
    signals: {
      trend,
      timing,
      assistance,
      grade,
      pattern,
      subskill,
      prerequisite: {
        source: "eligibleMistakes.metadata.prerequisiteSkillIds",
        prerequisiteSkillIds: [
          ...new Set(
            wrongs.flatMap((event) => {
              const raw =
                event?.metadata?.prerequisiteSkillIds ??
                event?.prerequisiteSkillIds ??
                [];
              return Array.isArray(raw)
                ? raw.map((id) => String(id || "").trim()).filter(Boolean)
                : [];
            }),
          ),
        ],
        independentEvidenceCount,
        probeEvidenceSupported,
      },
      sessions,
      v3: v3Signal,
      upstreamDiagnostic,
      riskFlags: { source: "row.topicEngineRowSignals.riskFlags", values: { ...rowRiskFlags } },
    },
    reconciler: {
      conflicts,
      contributions: reconciledContributions,
      priorityAdjustment,
      reasonCodes: [...new Set(reasonCodes)],
    },
  };
}

/**
 * Refine diagnosis only. This function never returns or modifies an action.
 * @param {string} baseDecision
 * @param {ReturnType<typeof buildUnifiedDecisionContext>|null|undefined} context
 */
export function reconcileEngineDecisionWithContext(baseDecision, context) {
  let decision = String(baseDecision || "insufficient_data");
  const reasons = [];
  if (!context || typeof context !== "object") return { engineDecision: decision, reasonCodes: reasons };
  const signals = context.signals || {};
  const qEligible = context.evidenceEligibility?.performance === true;

  if (decision === "insufficient_data" || !qEligible) {
    return { engineDecision: decision, reasonCodes: reasons };
  }

  if (signals.v3?.eligible === true && signals.v3?.contradictory === true) {
    reasons.push("reconcile:v3_contradictory_to_early_direction");
    return { engineDecision: "early_direction_only", reasonCodes: reasons };
  }

  if (
    signals.grade?.relation === "higher" &&
    signals.grade?.caveatNeeded === true &&
    ["clear_topic_gap", "topic_needs_strengthening"].includes(decision)
  ) {
    decision = "early_direction_only";
    reasons.push("reconcile:above_grade_mistake_not_topic_gap");
  }

  if (
    signals.assistance?.evidenceMode === "guided" &&
    decision === "mastery_stable"
  ) {
    decision = "partial_stable";
    reasons.push("reconcile:guided_success_not_independent_mastery");
  }

  if (
    signals.trend?.eligible === true &&
    signals.trend.direction === "improving" &&
    Number(signals.trend.recentAccuracy) >= 70 &&
    decision === "topic_needs_strengthening"
  ) {
    decision = "partial_stable";
    reasons.push("reconcile:recent_supported_improvement");
  } else if (
    signals.trend?.eligible === true &&
    signals.trend.direction === "declining" &&
    Number(signals.trend.recentAccuracy) < 70 &&
    decision === "partial_stable"
  ) {
    decision = "topic_needs_strengthening";
    reasons.push("reconcile:recent_supported_decline");
  }

  if (
    signals.riskFlags?.values?.speedOnlyRisk === true &&
    signals.timing?.fastWrongCount >= 2 &&
    ["topic_needs_strengthening", "partial_stable"].includes(decision)
  ) {
    decision = "speed_pressure_pattern";
    reasons.push("reconcile:speed_only_supported");
  }

  return { engineDecision: decision, reasonCodes: reasons };
}
