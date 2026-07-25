/**
 * Evidence-based pattern recurrence — separates single mistake, suspected, recurring, confirmed.
 */

import { passesRecurrenceRules } from "./recurrence.js";
import {
  eventMatchesEvidenceRule,
  evidenceRuleForTaxonomyId,
  extractMisconceptionTagFromEvent,
} from "./taxonomy-evidence-rules.js";
import {
  EVIDENCE_TYPES,
  PATTERN_RECURRENCE_STATES,
} from "../../lib/learning/answer-evidence-contract.js";

/** Same-session / short-window cluster: events must fall within this span. */
export const SAME_SESSION_PATTERN_WINDOW_MS = 60 * 60 * 1000;

const UNPROVEN_TAGS = new Set(["unknown", "generic_proximity", ""]);

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

  const wrongs = Array.isArray(wrongEvents)
    ? wrongEvents.filter(
        (e) => e && typeof e === "object" && e.isCorrect !== true,
      )
    : [];
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
 * Includes secondary observed-recurrent (ratio below threshold) so taxonomy
 * selection is not suppressed when a recurring tag is present.
 * @param {import("../mistake-event.js").MistakeEventV1[]} wrongEvents
 * @param {import("./taxonomy-types.js").TaxonomyRow} row
 */
export function passesEvidenceRecurrenceRules(wrongEvents, row) {
  const result = evaluateEvidenceRecurrence(wrongEvents, row);
  return result.recurrenceMet || result.confirmed;
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1[]|null|undefined} events
 */
export function countDistinctEvidenceDays(events) {
  const days = new Set();
  for (const e of Array.isArray(events) ? events : []) {
    const t = e?.timestamp;
    if (t == null || !Number.isFinite(Number(t))) continue;
    const d = new Date(Number(t));
    if (Number.isNaN(d.getTime())) continue;
    days.add(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`);
  }
  return days.size;
}

/**
 * Proven tag evidence only — never topic-only / unknown / generic proximity.
 * @param {import("../mistake-event.js").MistakeEventV1|null|undefined} ev
 */
export function eventHasProvenMisconceptionEvidence(ev) {
  if (!ev || typeof ev !== "object") return false;
  const tag = extractMisconceptionTagFromEvent(ev);
  if (!tag || UNPROVEN_TAGS.has(tag)) return false;

  const meta = ev.metadata && typeof ev.metadata === "object" ? ev.metadata : {};
  const ruleId = String(ev.classifierRuleId || meta.classifierRuleId || "").trim();
  const aeRaw =
    (ev.answerEvidence && typeof ev.answerEvidence === "object" ? ev.answerEvidence : null) ||
    (meta.answerEvidence && typeof meta.answerEvidence === "object" ? meta.answerEvidence : null);
  const aeTag = aeRaw?.detectedMisconception != null ? String(aeRaw.detectedMisconception).trim() : "";
  const aeType = aeRaw?.evidenceType != null ? String(aeRaw.evidenceType).trim() : "";
  const aeRule = String(aeRaw?.evidenceDetails?.classifierRuleId || "").trim();

  const hasValidRuleId = !!(ruleId || aeRule);
  const hasValidAnswerEvidence =
    !!aeRaw &&
    aeTag === tag &&
    !!aeType &&
    aeType !== EVIDENCE_TYPES.UNKNOWN;

  return hasValidRuleId || hasValidAnswerEvidence;
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1[]} events
 * @returns {{ ok: boolean, sharedTag: string|null, reason: string }}
 */
export function eventsShareExactProvenMisconceptionTag(events) {
  const list = Array.isArray(events) ? events.filter((e) => e && typeof e === "object") : [];
  if (list.length === 0) {
    return { ok: false, sharedTag: null, reason: "no_events" };
  }
  /** @type {string|null} */
  let sharedTag = null;
  for (const ev of list) {
    if (!eventHasProvenMisconceptionEvidence(ev)) {
      return { ok: false, sharedTag: null, reason: "unproven_or_generic_tag" };
    }
    const tag = extractMisconceptionTagFromEvent(ev);
    if (!tag || UNPROVEN_TAGS.has(tag)) {
      return { ok: false, sharedTag: null, reason: "unproven_or_generic_tag" };
    }
    if (sharedTag == null) sharedTag = tag;
    else if (tag !== sharedTag) {
      return { ok: false, sharedTag: null, reason: "mixed_misconception_tags" };
    }
  }
  return { ok: true, sharedTag, reason: "proven_shared_tag" };
}

/**
 * Same sessionId (when present on all) OR timestamps within SAME_SESSION_PATTERN_WINDOW_MS.
 * @param {import("../mistake-event.js").MistakeEventV1[]} events
 */
export function eventsFormSameSessionCluster(events) {
  const list = Array.isArray(events) ? events.filter((e) => e && typeof e === "object") : [];
  if (list.length < 2) return false;

  const sessionIds = list.map((e) => (e.sessionId != null ? String(e.sessionId).trim() : ""));
  const allHaveSession = sessionIds.every((id) => !!id);
  if (allHaveSession) {
    const uniq = new Set(sessionIds);
    if (uniq.size === 1) return true;
    // Different sessions: still allow short wall-clock cluster below
  }

  const times = list.map((e) => Number(e.timestamp)).filter((t) => Number.isFinite(t));
  if (times.length !== list.length) return false;
  const span = Math.max(...times) - Math.min(...times);
  return span >= 0 && span <= SAME_SESSION_PATTERN_WINDOW_MS;
}

/**
 * Pattern claim layer for parent/report synthesis.
 * - primary_dominant: ratio gate met (confirmed)
 * - secondary_observed: multi-day recurrent (distinctDays >= 2), may be below ratio
 * - same_session_observed: proven same-tag cluster in one session / short window
 *
 * @param {ReturnType<typeof evaluateEvidenceRecurrence>|null|undefined} evidenceRecurrence
 * @returns {{
 *   layer: "primary_dominant"|"secondary_observed"|"same_session_observed"|null,
 *   reason: string,
 *   evidenceCount: number,
 *   occurrenceRatio: number,
 *   distinctDays: number,
 *   sharedMisconceptionTag: string|null,
 * }}
 */
export function resolvePatternEvidenceLayer(evidenceRecurrence) {
  const ev = evidenceRecurrence && typeof evidenceRecurrence === "object" ? evidenceRecurrence : null;
  if (!ev || !(Number(ev.evidenceCount) > 0) || !Array.isArray(ev.matchingEvents) || ev.matchingEvents.length === 0) {
    return {
      layer: null,
      reason: "no_evidence",
      evidenceCount: 0,
      occurrenceRatio: 0,
      distinctDays: 0,
      sharedMisconceptionTag: null,
    };
  }

  const evidenceCount = Math.max(0, Math.floor(Number(ev.evidenceCount) || 0));
  const occurrenceRatio = Number(ev.occurrenceRatio) || 0;
  const distinctDays = countDistinctEvidenceDays(ev.matchingEvents);
  const state = String(ev.state || "");
  const tagCheck = eventsShareExactProvenMisconceptionTag(ev.matchingEvents);

  if (ev.confirmed === true || state === PATTERN_RECURRENCE_STATES.CONFIRMED) {
    return {
      layer: "primary_dominant",
      reason: ev.reasonCode || "evidence_met",
      evidenceCount,
      occurrenceRatio,
      distinctDays,
      sharedMisconceptionTag: tagCheck.sharedTag,
    };
  }

  // Multi-day protection: secondary_observed requires distinctDays >= 2
  if (
    distinctDays >= 2 &&
    evidenceCount >= 3 &&
    (state === PATTERN_RECURRENCE_STATES.RECURRING ||
      ev.reasonCode === "low_occurrence_ratio" ||
      ev.recurrenceMet === true)
  ) {
    return {
      layer: "secondary_observed",
      reason:
        ev.reasonCode === "low_occurrence_ratio"
          ? "multi_day_low_occurrence_ratio"
          : "multi_day_recurrence",
      evidenceCount,
      occurrenceRatio,
      distinctDays,
      sharedMisconceptionTag: tagCheck.sharedTag,
    };
  }

  // Same-session / short-window cluster (explicit non-dominant layer)
  if (
    evidenceCount >= 3 &&
    tagCheck.ok &&
    eventsFormSameSessionCluster(ev.matchingEvents)
  ) {
    return {
      layer: "same_session_observed",
      reason: "same_session_proven_tag_cluster",
      evidenceCount,
      occurrenceRatio,
      distinctDays,
      sharedMisconceptionTag: tagCheck.sharedTag,
    };
  }

  if (evidenceCount >= 3 && !tagCheck.ok && distinctDays < 2) {
    return {
      layer: null,
      reason: tagCheck.reason || "unproven_same_session_cluster",
      evidenceCount,
      occurrenceRatio,
      distinctDays,
      sharedMisconceptionTag: null,
    };
  }

  return {
    layer: null,
    reason: ev.reasonCode || "insufficient_for_pattern_layer",
    evidenceCount,
    occurrenceRatio,
    distinctDays,
    sharedMisconceptionTag: tagCheck.sharedTag,
  };
}

/** @param {ReturnType<typeof evaluateEvidenceRecurrence>|null|undefined} evidenceRecurrence */
export function isPrimaryDominantPattern(evidenceRecurrence) {
  return resolvePatternEvidenceLayer(evidenceRecurrence).layer === "primary_dominant";
}

/** Multi-day secondary only (distinctDays >= 2). */
export function isSecondaryObservedPattern(evidenceRecurrence) {
  return resolvePatternEvidenceLayer(evidenceRecurrence).layer === "secondary_observed";
}

/** Same-session / short-window proven cluster. */
export function isSameSessionObservedPattern(evidenceRecurrence) {
  return resolvePatternEvidenceLayer(evidenceRecurrence).layer === "same_session_observed";
}

/** Any non-dominant but parent-visible pattern layer. */
export function isNonDominantObservedPattern(evidenceRecurrence) {
  const layer = resolvePatternEvidenceLayer(evidenceRecurrence).layer;
  return layer === "secondary_observed" || layer === "same_session_observed";
}
