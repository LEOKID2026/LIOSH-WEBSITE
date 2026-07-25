/**
 * Hard evidence gate for taxonomy / detectedPattern — no pattern without supporting events.
 * Supports claim layers:
 * - primary_dominant: ratio gate met
 * - secondary_observed: multi-day recurrent (distinctDays >= 2), may be below ratio
 * - same_session_observed: proven same-tag cluster in one session / short window
 */

import {
  passesEvidenceRecurrenceRules,
  resolvePatternEvidenceLayer,
} from "./evidence-recurrence.js";
import {
  extractMisconceptionTagFromEvent,
  evidenceRuleForTaxonomyId,
  eventQuestionKindMatches,
} from "./taxonomy-evidence-rules.js";
import { mergeClassifierParamsFromQuestionId } from "../diagnostic-evidence.js";
import { extractEventQuestionKind, extractMulOperandPair } from "./extract-event-question-kind.js";

/**
 * @param {string|null|undefined} taxonomyId
 * @param {import("../mistake-event.js").MistakeEventV1[]} matchingEvents
 */
export function evaluateTaxonomySpecificEvidence(taxonomyId, matchingEvents) {
  const tid = String(taxonomyId || "").trim();
  const events = Array.isArray(matchingEvents) ? matchingEvents.filter((e) => !e.isCorrect) : [];
  if (!tid || events.length === 0) {
    return { ok: false, reason: "no_matching_events", repeatedPairMax: 0 };
  }

  if (tid === "M-03") {
    /** @type {Map<string, number>} */
    const pairCounts = new Map();
    for (const ev of events) {
      const pair = extractMulOperandPair(ev);
      if (!pair) continue;
      pairCounts.set(pair.key, (pairCounts.get(pair.key) || 0) + 1);
    }
    let repeatedPairMax = 0;
    let topPair = null;
    for (const [key, count] of pairCounts.entries()) {
      if (count > repeatedPairMax) {
        repeatedPairMax = count;
        topPair = key;
      }
    }
    if (repeatedPairMax < 2) {
      return {
        ok: false,
        reason: "M-03_requires_repeated_operand_pair",
        repeatedPairMax,
        topPair,
      };
    }
    return { ok: true, reason: "M-03_pair_recurrence", repeatedPairMax, topPair };
  }

  if (tid === "M-04") {
    const compareKinds = events.filter((ev) => {
      const k = extractEventQuestionKind(ev) || "";
      return k.includes("compare");
    });
    if (compareKinds.length === 0) {
      return { ok: false, reason: "M-04_requires_compare_kind_events" };
    }
  }

  return { ok: true, reason: "taxonomy_specific_ok" };
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1[]} matchingEvents
 * @param {string|null|undefined} [taxonomyId]
 * @param {number} [limit]
 */
export function buildSupportingEvidenceRows(matchingEvents, taxonomyId = null, limit = 5) {
  const events = Array.isArray(matchingEvents) ? matchingEvents.filter((e) => !e.isCorrect) : [];
  const rule = evidenceRuleForTaxonomyId(taxonomyId);
  return events.slice(0, limit).map((ev) => {
    const meta = ev.metadata && typeof ev.metadata === "object" ? ev.metadata : {};
    const questionId =
      ev.questionLabel || meta.questionId || ev.questionId || null;
    const kind = extractEventQuestionKind(ev);
    const params = mergeClassifierParamsFromQuestionId(
      questionId,
      ev.params && typeof ev.params === "object" ? ev.params : {},
    );
    const tag = extractMisconceptionTagFromEvent(ev);
    const classifierRuleId =
      (typeof meta.classifierRuleId === "string" && meta.classifierRuleId.trim()) ||
      (typeof ev.classifierRuleId === "string" && ev.classifierRuleId.trim()) ||
      (tag ? `misconception_tag:${tag}` : null);
    const kindOk = !rule?.questionKinds?.length || eventQuestionKindMatches(ev, rule.questionKinds);
    const whySupportsPattern =
      tag && rule?.requiredTags?.includes(tag) && kindOk
        ? `misconception_tag ${tag} matches taxonomy rule ${rule.taxonomyId} on kind ${kind || "unknown"}`
        : tag && !kindOk
          ? `tag ${tag} blocked: kind ${kind || "unknown"} does not match taxonomy ${taxonomyId || "?"}`
          : tag
            ? `tag ${tag} present but kind ${kind || "unknown"} may not support taxonomy ${taxonomyId || "?"}`
            : "no misconception tag on event";
    const userAns = ev.userAnswer ?? ev.selectedAnswer ?? null;
    const expectedAns = ev.correctAnswer ?? ev.expectedAnswer ?? null;
    return {
      questionId,
      kind,
      userAnswer: userAns,
      expectedAnswer: expectedAns,
      selectedAnswer: userAns,
      correctAnswer: expectedAns,
      parsedParams: params,
      misconceptionTag: tag,
      classifierRuleId,
      classifierRule: classifierRuleId,
      taxonomyRule: rule?.taxonomyId || null,
      whySupportsPattern,
      kindMatched: kindOk,
    };
  });
}

/**
 * @param {ReturnType<typeof buildSupportingEvidenceRows>} rows
 * @param {import("./taxonomy-evidence-rules.js").TaxonomyEvidenceRule|null} rule
 */
function supportingRowsMeetInvariant(rows, rule) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some((row) => {
    if (!row?.questionId) return false;
    if (!row?.kind) return false;
    if (row.userAnswer == null && row.selectedAnswer == null) return false;
    if (row.expectedAnswer == null && row.correctAnswer == null) return false;
    if (!row.classifierRuleId && !row.classifierRule) return false;
    if (rule?.questionKinds?.length && row.kindMatched === false) return false;
    return true;
  });
}

/**
 * @param {object} p
 * @param {string|null|undefined} p.taxonomyId
 * @param {ReturnType<import("./evidence-recurrence.js").evaluateEvidenceRecurrence>|null} [p.evidenceRecurrence]
 * @param {import("../mistake-event.js").MistakeEventV1[]} [p.matchingEvents]
 * @param {import("../mistake-event.js").MistakeEventV1[]} [p.wrongEvents]
 */
export function passesDetectedPatternEvidenceGate(p) {
  const taxonomyId = String(p?.taxonomyId || "").trim();
  const evRec = p?.evidenceRecurrence || null;
  const matchingEvents =
    (Array.isArray(p?.matchingEvents) && p.matchingEvents.length
      ? p.matchingEvents
      : evRec?.matchingEvents) || [];
  const wrongEvents = Array.isArray(p?.wrongEvents) ? p.wrongEvents : [];

  if (!taxonomyId) {
    return {
      allowed: false,
      patternLayer: null,
      reason: "no_taxonomy_id",
      supportingEvidence: [],
    };
  }

  const evidenceCount = evRec?.evidenceCount ?? matchingEvents.length;
  if (evidenceCount <= 0 || matchingEvents.length === 0) {
    return {
      allowed: false,
      patternLayer: null,
      reason: "matchingEvidenceCount_zero",
      supportingEvidence: [],
    };
  }

  const rule = evidenceRuleForTaxonomyId(taxonomyId);
  const trow = rule ? { id: taxonomyId, minWrong: rule.minTagMatches ?? 3 } : null;
  if (trow && wrongEvents.length && !passesEvidenceRecurrenceRules(wrongEvents, trow)) {
    return {
      allowed: false,
      patternLayer: null,
      reason: "insufficient_evidence_recurrence",
      supportingEvidence: buildSupportingEvidenceRows(matchingEvents, taxonomyId),
    };
  }

  const specific = evaluateTaxonomySpecificEvidence(taxonomyId, matchingEvents);
  if (!specific.ok) {
    return {
      allowed: false,
      patternLayer: null,
      reason: specific.reason,
      supportingEvidence: buildSupportingEvidenceRows(matchingEvents, taxonomyId),
      ...specific,
    };
  }

  const supportingEvidence = buildSupportingEvidenceRows(matchingEvents, taxonomyId);
  if (supportingEvidence.length === 0) {
    return {
      allowed: false,
      patternLayer: null,
      reason: "sampleEvidence_empty",
      supportingEvidence: [],
    };
  }

  if (!supportingRowsMeetInvariant(supportingEvidence, rule)) {
    return {
      allowed: false,
      patternLayer: null,
      reason: "supporting_evidence_missing_forensic_fields",
      supportingEvidence,
      evidenceCount,
      matchingEvidenceCount: matchingEvents.length,
    };
  }

  // detectedPattern requires matchingEvidenceCount > 0 and non-empty sampleEvidence
  if (!(evidenceCount > 0) || !(matchingEvents.length > 0)) {
    return {
      allowed: false,
      patternLayer: null,
      reason: "matchingEvidenceCount_zero",
      supportingEvidence: [],
      matchingEvidenceCount: 0,
    };
  }

  const layerInfo = resolvePatternEvidenceLayer(
    evRec || {
      state: "recurring",
      evidenceCount,
      occurrenceRatio: wrongEvents.length > 0 ? matchingEvents.length / wrongEvents.length : 1,
      matchingEvents,
      confirmed: false,
      recurrenceMet: true,
      reasonCode: "evidence_met",
    },
  );
  if (!layerInfo.layer) {
    return {
      allowed: false,
      patternLayer: null,
      reason: layerInfo.reason || "insufficient_for_pattern_layer",
      supportingEvidence,
      evidenceCount,
      matchingEvidenceCount: matchingEvents.length,
      occurrenceRatio: layerInfo.occurrenceRatio,
      distinctDays: layerInfo.distinctDays,
      ...specific,
    };
  }

  return {
    allowed: true,
    patternLayer: layerInfo.layer,
    isPrimaryDominant: layerInfo.layer === "primary_dominant",
    isSecondaryObserved: layerInfo.layer === "secondary_observed",
    isSameSessionObserved: layerInfo.layer === "same_session_observed",
    sharedMisconceptionTag: layerInfo.sharedMisconceptionTag || null,
    reason:
      layerInfo.layer === "primary_dominant"
        ? "evidence_met"
        : layerInfo.reason || "observed_recurrent",
    supportingEvidence,
    sampleEvidence: supportingEvidence,
    evidenceCount,
    matchingEvidenceCount: matchingEvents.length,
    occurrenceRatio: layerInfo.occurrenceRatio,
    distinctDays: layerInfo.distinctDays,
    ...specific,
  };
}

export { extractEventQuestionKind, extractMulOperandPair } from "./extract-event-question-kind.js";
