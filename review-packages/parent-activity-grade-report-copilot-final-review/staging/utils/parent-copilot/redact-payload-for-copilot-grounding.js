/**
 * Server-side Copilot / LLM grounding snapshot: strips raw diagnostic engine strings
 * and nested objects that must never reach truth-packet assembly or LLM prompts.
 *
 * Callers pass a **clone** path only — this function clones defensively before mutating.
 */

import {
  parentFacingDiagnosisSnippetHe,
  parentFacingPatternLabelHe,
} from "../parent-report-language/parent-facing-pattern-label-he.js";

/**
 * @param {unknown} iv
 */
function slimIntelligenceV1ForCopilot(iv) {
  if (!iv || typeof iv !== "object") return undefined;
  const p = iv.patterns && typeof iv.patterns === "object" ? iv.patterns : {};
  const w = iv.weakness && typeof iv.weakness === "object" ? iv.weakness : {};
  const c = iv.confidence && typeof iv.confidence === "object" ? iv.confidence : {};
  return {
    weakness: {
      level: w.level != null ? String(w.level) : "none",
      codes: Array.isArray(w.codes) ? w.codes.map((x) => String(x || "").trim()).filter(Boolean) : [],
    },
    confidence: {
      band: c.band != null ? String(c.band) : "low",
    },
    patterns: {
      recurrenceFull: !!p.recurrenceFull,
      taxonomyId: p.taxonomyId != null && String(p.taxonomyId).trim() !== "" ? String(p.taxonomyId).trim() : null,
      noPatternClaims: !!p.noPatternClaims,
    },
  };
}

/**
 * @param {unknown} u
 */
function sanitizeDiagnosticUnitForCopilotGrounding(u) {
  if (!u || typeof u !== "object") return {};
  const traces = Array.isArray(u.evidenceTrace) ? u.evidenceTrace : [];
  const vol = traces.find((t) => String(t?.type || "") === "volume")?.value;
  const rec = u.recurrence && typeof u.recurrence === "object" ? u.recurrence : {};
  const out = {
    subjectId: u.subjectId != null ? String(u.subjectId) : "",
    topicRowKey: u.topicRowKey != null ? String(u.topicRowKey) : "",
    bucketKey: u.bucketKey != null ? String(u.bucketKey) : "",
    displayName: u.displayName != null ? String(u.displayName) : "",
    engineVersion: u.engineVersion != null ? String(u.engineVersion) : "",
    unitKey: u.unitKey != null ? String(u.unitKey) : "",
    blueprintRef: u.blueprintRef != null ? String(u.blueprintRef) : "",
  };
  const iv = slimIntelligenceV1ForCopilot(u.intelligenceV1);
  if (iv) out.intelligenceV1 = iv;
  if (vol && typeof vol === "object") {
    out.evidenceVolume = {
      questions: Math.max(0, Math.round(Number(vol.questions) || 0)),
      accuracy: Math.max(0, Math.min(100, Math.round(Number(vol.accuracy) || 0))),
      correct: Math.max(0, Math.round(Number(vol.correct) || 0)),
      wrong: Math.max(0, Math.round(Number(vol.wrong) || 0)),
    };
  }
  if (Object.keys(rec).length) {
    out.recurrenceSummary = {
      totalQuestions: Math.max(0, Math.round(Number(rec.totalQuestions) || 0)),
      wrongCountForRules: Math.max(0, Math.round(Number(rec.wrongCountForRules) || 0)),
      wrongEventCount: Math.max(0, Math.round(Number(rec.wrongEventCount) || 0)),
      full: !!rec.full,
    };
  }
  const cs = u.canonicalState;
  if (cs && typeof cs === "object") {
    out.canonicalState = {
      topicStateId: cs.topicStateId ?? null,
      stateHash: cs.stateHash ?? null,
      actionState: cs.actionState != null ? String(cs.actionState) : undefined,
      assessment:
        cs.assessment && typeof cs.assessment === "object"
          ? {
              readiness: cs.assessment.readiness != null ? String(cs.assessment.readiness) : undefined,
              confidenceLevel:
                cs.assessment.confidenceLevel != null ? String(cs.assessment.confidenceLevel) : undefined,
              cannotConcludeYet: !!cs.assessment.cannotConcludeYet,
            }
          : undefined,
      recommendation:
        cs.recommendation && typeof cs.recommendation === "object"
          ? {
              allowed: !!cs.recommendation.allowed,
              family: cs.recommendation.family != null ? String(cs.recommendation.family) : undefined,
              intensityCap:
                cs.recommendation.intensityCap != null ? String(cs.recommendation.intensityCap) : undefined,
            }
          : undefined,
      evidence:
        cs.evidence && typeof cs.evidence === "object"
          ? {
              positiveAuthorityLevel:
                cs.evidence.positiveAuthorityLevel != null
                  ? String(cs.evidence.positiveAuthorityLevel)
                  : undefined,
            }
          : undefined,
    };
  }
  const conf = u.confidence && typeof u.confidence === "object" ? u.confidence : null;
  if (conf) {
    out.confidence = {
      level: conf.level != null ? String(conf.level) : undefined,
      rowSignals:
        conf.rowSignals && typeof conf.rowSignals === "object"
          ? {
              dataSufficiencyLevel:
                conf.rowSignals.dataSufficiencyLevel != null
                  ? String(conf.rowSignals.dataSufficiencyLevel)
                  : undefined,
              isEarlySignalOnly: !!conf.rowSignals.isEarlySignalOnly,
            }
          : undefined,
    };
  }
  const pri = u.priority && typeof u.priority === "object" ? u.priority : null;
  if (pri) {
    out.priority = {
      level: pri.level != null ? String(pri.level) : undefined,
      breadth: pri.breadth != null ? String(pri.breadth) : undefined,
      score: Number.isFinite(Number(pri.score)) ? Number(pri.score) : undefined,
    };
  }
  const og = u.outputGating && typeof u.outputGating === "object" ? u.outputGating : null;
  if (og) {
    out.outputGating = {
      interventionAllowed: !!og.interventionAllowed,
      diagnosisAllowed: !!og.diagnosisAllowed,
      probeOnly: !!og.probeOnly,
      cannotConcludeYet: !!og.cannotConcludeYet,
      additiveCautionAllowed: !!og.additiveCautionAllowed,
      positiveAuthorityLevel: og.positiveAuthorityLevel != null ? String(og.positiveAuthorityLevel) : undefined,
    };
  }
  const tax = u.taxonomy && typeof u.taxonomy === "object" ? u.taxonomy : null;
  if (tax) {
    const patternLabelHe = parentFacingPatternLabelHe(u);
    const subskillHe = tax.subskillHe != null ? String(tax.subskillHe).trim() : "";
    if (patternLabelHe || subskillHe) {
      out.taxonomy = {
        ...(patternLabelHe ? { patternLabelHe } : {}),
        ...(subskillHe ? { subskillHe } : {}),
      };
    }
  }
  const diag = u.diagnosis && typeof u.diagnosis === "object" ? u.diagnosis : null;
  if (diag) {
    const lineHe =
      diag.lineHe != null ? parentFacingDiagnosisSnippetHe(u, String(diag.lineHe).trim()) : "";
    if (lineHe) {
      out.diagnosis = {
        lineHe,
        allowed: diag.allowed !== false,
      };
    }
  }
  return out;
}

/**
 * Sanitizes probeEvidence item for Copilot grounding.
 * Keeps only context fields useful for LLM explanations; removes internal metadata.
 * @param {unknown} item
 * @returns {object|null}
 */
function sanitizeProbeEvidenceForCopilot(item) {
  if (!item || typeof item !== "object") return null;
  if (item.isDiagnosticProbeAttempt !== true) return null;
  const out = {
    subjectId: item.subjectId != null ? String(item.subjectId) : "",
    topicId: item.topicId != null ? String(item.topicId) : "",
    probeId: item.probeId != null ? String(item.probeId) : "",
    outcomeStatus: item.outcomeStatus != null ? String(item.outcomeStatus) : "",
    supportCount: Math.max(0, Math.floor(Number(item.supportCount) || 0)),
    weakenCount: Math.max(0, Math.floor(Number(item.weakenCount) || 0)),
  };
  if (Array.isArray(item.expectedErrorTags) && item.expectedErrorTags.length > 0) {
    out.expectedErrorTags = item.expectedErrorTags.filter((t) => typeof t === "string").slice(0, 4);
  }
  if (Array.isArray(item.inferredTags) && item.inferredTags.length > 0) {
    out.inferredTags = item.inferredTags.filter((t) => typeof t === "string").slice(0, 4);
  }
  if (item.dominantTag != null && String(item.dominantTag).trim()) {
    out.dominantTag = String(item.dominantTag).slice(0, 120);
  }
  if (item.answeredAt != null && String(item.answeredAt).trim()) {
    out.answeredAt = String(item.answeredAt).slice(0, 80);
  }
  return out;
}

/**
 * Deep-clones the detailed-report payload and replaces `diagnosticEngineV2.units[]`
 * with parent-safe numeric / structural fields only (no taxonomy / probe / intervention / diagnosis).
 *
 * @param {unknown} payload
 * @returns {unknown}
 */
export function redactPayloadForCopilotGrounding(payload) {
  if (payload == null || typeof payload !== "object") return payload;
  /** @type {Record<string, unknown>} */
  let clone;
  try {
    clone = structuredClone(payload);
  } catch {
    try {
      clone = JSON.parse(JSON.stringify(payload));
    } catch {
      return payload;
    }
  }
  const de = clone.diagnosticEngineV2;
  if (de && typeof de === "object") {
    const units = Array.isArray(de.units) ? de.units : [];
    clone.diagnosticEngineV2 = {
      ...de,
      units: units.map((u) => sanitizeDiagnosticUnitForCopilotGrounding(u)),
    };
  }
  const pe = clone.probeEvidence;
  if (pe && Array.isArray(pe)) {
    clone.probeEvidence = pe.map((item) => sanitizeProbeEvidenceForCopilot(item)).filter(Boolean);
  }
  return clone;
}

export default { redactPayloadForCopilotGrounding };
