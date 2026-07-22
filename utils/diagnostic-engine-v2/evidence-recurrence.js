/**
 * Evidence-based pattern recurrence — separates single mistake, suspected, recurring, confirmed.
 */

import { passesRecurrenceRules } from "./recurrence.js";
import {
  eventMatchesEvidenceRule,
  evidenceRuleForTaxonomyId,
  extractMisconceptionTagFromEvent,
} from "./taxonomy-evidence-rules.js";
import { PATTERN_RECURRENCE_STATES } from "../../lib/learning/answer-evidence-contract.js";

/**
 * @param {import("../mistake-event.js").MistakeEventV1} ev
 */
function eventDedupeKey(ev) {
  const tag = extractMisconceptionTagFromEvent(ev) || "unknown";
  const q =
    ev.questionLabel ||
    (ev.metadata && typeof ev.metadata === "object" ? ev.metadata.questionId : null) ||
    "";
  const stem = ev.exerciseText?.slice(0, 80) || "";
  const ans = ev.userAnswer != null ? String(ev.userAnswer) : "";
  const ts = ev.timestamp != null ? String(ev.timestamp) : "";
  return `${tag}::${q}::${stem}::${ans}::${ts}`;
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1[]} wrongEvents
 * @param {import("./taxonomy-types.js").TaxonomyRow} taxonomyRow
 */
export function evaluateEvidenceRecurrence(wrongEvents, taxonomyRow) {
  const rule = evidenceRuleForTaxonomyId(taxonomyRow.id);
  if (!rule) {
    return {
      state: PATTERN_RECURRENCE_STATES.NONE,
      matchingEvents: [],
      evidenceCount: 0,
      relevantQuestions: 0,
      occurrenceRatio: 0,
      recurrenceMet: false,
      reasonCode: "no_evidence_rule",
    };
  }

  const wrongs = Array.isArray(wrongEvents) ? wrongEvents.filter((e) => !e.isCorrect) : [];
  const matching = wrongs.filter((e) => eventMatchesEvidenceRule(e, rule));

  const seen = new Set();
  /** @type {import("../mistake-event.js").MistakeEventV1[]} */
  const deduped = [];
  for (const ev of matching) {
    const key = eventDedupeKey(ev);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ev);
  }

  const minMatches = Math.max(rule.minTagMatches ?? taxonomyRow.minWrong, taxonomyRow.minWrong);
  const minRelevant = rule.minRelevantQuestions ?? minMatches;
  const minRatio = rule.minOccurrenceRatio ?? 0.6;
  const relevantQuestions = Math.max(wrongs.length, minRelevant);
  const occurrenceRatio = relevantQuestions > 0 ? deduped.length / relevantQuestions : 0;

  const baseRecurrence = passesRecurrenceRules(deduped, {
    ...taxonomyRow,
    minWrong: minMatches,
  });

  let state = PATTERN_RECURRENCE_STATES.NONE;
  if (deduped.length === 1) state = PATTERN_RECURRENCE_STATES.SUSPECTED;
  else if (deduped.length >= 2 && deduped.length < minMatches) state = PATTERN_RECURRENCE_STATES.SUSPECTED;
  else if (baseRecurrence && occurrenceRatio >= minRatio) state = PATTERN_RECURRENCE_STATES.CONFIRMED;
  else if (deduped.length >= minMatches) state = PATTERN_RECURRENCE_STATES.RECURRING;

  const probeConfirmed = deduped.some(
    (e) =>
      e.metadata &&
      typeof e.metadata === "object" &&
      (e.metadata.probeConfirmed === true ||
        e.metadata.answerEvidence?.evidenceType === "PROBE_CONFIRMED")
  );
  if (probeConfirmed && deduped.length >= 2) {
    state = PATTERN_RECURRENCE_STATES.CONFIRMED;
  }

  return {
    state,
    matchingEvents: deduped,
    evidenceCount: deduped.length,
    relevantQuestions,
    occurrenceRatio,
    recurrenceMet: state === PATTERN_RECURRENCE_STATES.CONFIRMED || state === PATTERN_RECURRENCE_STATES.RECURRING,
    confirmed: state === PATTERN_RECURRENCE_STATES.CONFIRMED,
    suspected: state === PATTERN_RECURRENCE_STATES.SUSPECTED,
    reasonCode:
      deduped.length === 0
        ? "no_tag_matches"
        : !baseRecurrence
          ? "insufficient_recurrence"
          : occurrenceRatio < minRatio
            ? "low_occurrence_ratio"
            : "evidence_met",
    requiredTags: rule.requiredTags,
    evidenceSource: rule.evidenceSource,
  };
}

/**
 * Legacy adapter — evidence-gated recurrence only.
 * @param {import("../mistake-event.js").MistakeEventV1[]} wrongEvents
 * @param {import("./taxonomy-types.js").TaxonomyRow} row
 */
export function passesEvidenceRecurrenceRules(wrongEvents, row) {
  const result = evaluateEvidenceRecurrence(wrongEvents, row);
  return result.recurrenceMet || result.confirmed;
}
