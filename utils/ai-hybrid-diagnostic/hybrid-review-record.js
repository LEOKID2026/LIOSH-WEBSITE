import { summarizeHybridRuntimeForReview } from "./hybrid-review-summary.js";

/**
 * Single-unit review record: V2 vs hybrid comparison for inspection / export.
 *
 * @param {object} params
 * @param {object|null} params.hybridRuntime
 * @param {object|null} [params.diagnosticEngineV2]
 * @param {number} [params.unitIndex]
 * @param {string|null} [params.unitKey]
 */
export function buildHybridCaseReviewRecord({
  hybridRuntime,
  diagnosticEngineV2 = null,
  unitIndex = 0,
  unitKey = null,
}) {
  if (!hybridRuntime || !Array.isArray(hybridRuntime.units) || hybridRuntime.units.length === 0) {
    return null;
  }

  let u = hybridRuntime.units[unitIndex];
  if (typeof unitKey === "string" && unitKey) {
    const found = hybridRuntime.units.find((x) => x && x.unitKey === unitKey);
    if (found) u = found;
  }
  if (!u) return null;

  const v2Unit =
    (Array.isArray(diagnosticEngineV2?.units)
      ? diagnosticEngineV2.units.find((x) => x && x.unitKey === u.unitKey)
      : null) || null;

  const snap = u.v2AuthoritySnapshot && typeof u.v2AuthoritySnapshot === "object" ? u.v2AuthoritySnapshot : {};
  const d = u.disagreement && typeof u.disagreement === "object" ? u.disagreement : {};
  const rank = u.hypothesisRanking && typeof u.hypothesisRanking === "object" ? u.hypothesisRanking : {};
  const probe = u.probeIntelligence && typeof u.probeIntelligence === "object" ? u.probeIntelligence : {};
  const ec = u.explanationContract && typeof u.explanationContract === "object" ? u.explanationContract : {};
  const ex = u.explanations && typeof u.explanations === "object" ? u.explanations : {};
  const par = ex.parent && typeof ex.parent === "object" ? ex.parent : {};
  const tea = ex.teacher && typeof ex.teacher === "object" ? ex.teacher : {};
  const ev = u.explanationValidator && typeof u.explanationValidator === "object" ? u.explanationValidator : {};

  const topCandidates = Array.isArray(rank.candidates)
    ? rank.candidates.slice(0, 8).map((c) => ({
        candidateId: c.candidateId,
        rank: c.rank,
        probability: c.probability,
        calibratedProbability: c.calibratedProbability,
      }))
    : [];

  return {
    unitKey: u.unitKey,
    meta: {
      hybridRuntimeVersion: hybridRuntime.hybridRuntimeVersion,
      generatedAt: hybridRuntime.generatedAt,
      exposureMode: hybridRuntime.exposureMode,
    },
    shadowSummary: summarizeHybridRuntimeForReview(hybridRuntime),
    v2: {
      unitKey: snap.unitKey ?? v2Unit?.unitKey ?? null,
      taxonomyId: snap.taxonomyId ?? null,
      diagnosis: snap.diagnosis ?? null,
      outputGating: snap.outputGating ?? v2Unit?.outputGating ?? null,
      confidence: snap.confidence ?? v2Unit?.confidence ?? null,
      snapshotHash: snap.snapshotHash ?? null,
      engineTaxonomyId: v2Unit?.taxonomy?.id ?? v2Unit?.diagnosis?.taxonomyId ?? null,
    },
    hybrid: {
      aiAssist: u.aiAssist ?? null,
      topHypothesis: {
        top1Id: rank.top1Id,
        top1Probability: rank.top1Probability,
        calibrationBand: rank.calibrationBand,
        ambiguityScore: rank.ambiguityScore,
        topCandidates,
      },
      disagreement: {
        hasDisagreement: d.hasDisagreement,
        severity: d.severity,
        v2TopId: d.v2TopId,
        aiTopId: d.aiTopId,
        probabilityGap: d.probabilityGap,
        action: d.action,
        reasonCodes: Array.isArray(d.reasonCodes) ? d.reasonCodes : [],
      },
      probe: {
        suggestedProbeId: probe.suggestedProbeId,
        uncertaintyReductionEstimate: probe.uncertaintyReductionEstimate,
        stoppingRuleMet: probe.stoppingRuleMet,
        escalationRuleTriggered: probe.escalationRuleTriggered,
        v2ProbeSummary: probe.v2ProbeSummary ?? null,
      },
      explanation: {
        outputStatus: ec.outputStatus,
        validatorPass: ec.validatorPass,
        failureReason: ec.failureReason,
        parentText: typeof par.text === "string" ? par.text : "",
        teacherText: typeof tea.text === "string" ? tea.text : "",
        parentStatus: par.status ?? null,
        teacherStatus: tea.status ?? null,
      },
      explanationValidator: {
        overallPass: ev.overallPass,
        boundaryPass: ev.boundaryPass,
        evidenceLinkPass: ev.evidenceLinkPass,
        uncertaintyCompliancePass: ev.uncertaintyCompliancePass,
        reasonCodes: Array.isArray(ev.reasonCodes) ? ev.reasonCodes : [],
      },
    },
    comparison: {
      v2TaxonomyId: d.v2TopId,
      hybridTopTaxonomyId: d.aiTopId,
      disagree:
        typeof d.hasDisagreement === "boolean"
          ? d.hasDisagreement
          : !!(d.v2TopId && d.aiTopId && d.v2TopId !== d.aiTopId),
      narrativeHe:
        typeof d.hasDisagreement === "boolean" && d.hasDisagreement
          ? `התנגשות: V2 בחר ${d.v2TopId || "-"} לעומת Hybrid top ${d.aiTopId || "-"} (חומרה: ${d.severity || "-"})`
          : "אין התנגשות בין V2 לבין היפותזה עליונה של Hybrid.",
    },
  };
}
