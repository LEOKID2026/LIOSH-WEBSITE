/**
 * History diagnostics — exact TEPs (timeline, cause/effect, concept slots).
 * Structural edit-distance only after exact under spelling gate; far wrongs → null (0 FP).
 */

import {
  asNormHumanitiesList,
  collectWrongForms,
  humanitiesEditDistance,
  humanitiesHit,
  isHumanitiesSpellingGate,
  matchesConfusionPair,
  normalizeHumanitiesText,
  resolveListedTag,
} from "./fuzzy-tolerance-humanities-shared.js";

/** @type {Record<string, string>} */
export const HISTORY_PATTERN_TO_TAG = Object.freeze({
  history_timeline: "timeline_sequence_error",
  hist_timeline_sequence: "timeline_sequence_error",
  history_cause_effect: "cause_effect_error",
  hist_cause_effect: "cause_effect_error",
  history_comparison: "comparison_error",
  hist_comparison: "comparison_error",
  history_figure: "figure_role_confusion",
  hist_figures_roles: "figure_role_confusion",
  history_institution: "institution_confusion",
  hist_governance_institutions: "institution_confusion",
  history_culture: "culture_heritage_error",
  hist_culture_heritage: "culture_heritage_error",
  history_source: "source_comprehension_error",
  hist_simple_source: "source_comprehension_error",
  hist_past_present_link: "historical_connection_error",
  hist_concepts: "historical_concept_error",
});

function historyGateBlob(p) {
  return [
    p?.patternFamily,
    p?.kind,
    p?.topic,
    p?.conceptTag,
    p?.diagnosticSkillId,
    ...(Array.isArray(p?.expectedErrorTags) ? p.expectedErrorTags : []),
  ]
    .map((x) => String(x || "").toLowerCase())
    .join(" ");
}

/**
 * Chronology / timeline: user ∈ timelineAlts or wrongForms under chronology gate.
 * @param {object} p
 */
export function proveHistoryTimelineAlt(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const blob = historyGateBlob(p);
  const chronoGate =
    blob.includes("timeline") ||
    blob.includes("chronolog") ||
    blob.includes("sequence") ||
    Array.isArray(p?.timelineAlts);
  if (!chronoGate) return null;

  const alts = [
    ...asNormHumanitiesList(p?.timelineAlts),
    ...collectWrongForms(p, expected),
  ];
  if (!alts.includes(user) && !matchesConfusionPair(p, user, expected)) return null;

  return humanitiesHit(
    "timeline_sequence_error",
    { user, expected, mode: "timeline_alt" },
    "history_exact:timeline_sequence_error",
    0.92,
  );
}

/**
 * Cause ↔ effect swap: explicit causeEffectPair { cause, effect } or [cause, effect].
 * @param {object} p
 */
export function proveHistoryCauseEffectSwap(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const blob = historyGateBlob(p);
  const ceGate =
    blob.includes("cause") ||
    blob.includes("effect") ||
    blob.includes("inference") ||
    p?.causeEffectPair != null;
  if (!ceGate) return null;

  /** @type {string[]} */
  let pair = [];
  const raw = p?.causeEffectPair;
  if (Array.isArray(raw)) {
    pair = asNormHumanitiesList(raw);
  } else if (raw && typeof raw === "object") {
    pair = asNormHumanitiesList([raw.cause, raw.effect, raw.causeText, raw.effectText]);
  }
  if (pair.length < 2) {
    // listed wrongForms under cause/effect gate
    const wrong = collectWrongForms(p, expected);
    if (!wrong.includes(user)) return null;
  } else if (!(pair.includes(user) && pair.includes(expected))) {
    return null;
  }

  return humanitiesHit(
    "cause_effect_error",
    { user, expected, mode: "cause_effect_swap", pair },
    "history_exact:cause_effect_error",
    0.92,
  );
}

/**
 * General history concept / figure / institution / source slot.
 * @param {object} p
 */
export function proveHistoryConceptSlot(p) {
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer);
  if (!user || !expected || user === expected) return null;

  const hasList =
    matchesConfusionPair(p, user, expected) ||
    collectWrongForms(p, expected).includes(user) ||
    asNormHumanitiesList(p?.knownMisconceptions).includes(user);
  if (!hasList) return null;

  const hasCue =
    historyGateBlob(p).length > 0 ||
    Array.isArray(p?.wrongForms) ||
    Array.isArray(p?.confusionPair) ||
    Array.isArray(p?.expectedErrorTags);
  if (!hasCue) return null;

  const tag = resolveListedTag(p, "historical_concept_error", HISTORY_PATTERN_TO_TAG);
  return humanitiesHit(
    tag,
    { user, expected, mode: "history_concept_slot", tag },
    `history_exact:${tag}`,
    0.9,
  );
}

/**
 * Structural spelling for typed history labels only.
 * @param {object} p
 */
export function proveHistorySpellingStructural(p) {
  if (!isHumanitiesSpellingGate(p)) return null;
  const user = normalizeHumanitiesText(p?.userAnswer);
  const expected = normalizeHumanitiesText(p?.expectedAnswer ?? p?.expectedWord);
  if (!user || !expected || user === expected) return null;
  const dist = humanitiesEditDistance(user, expected);
  const len = Math.max(user.length, expected.length);
  if (dist === 1 && len >= 2 && len <= 28) {
    return humanitiesHit(
      "historical_concept_error",
      { user, expected, editDistance: dist, tier: "structural" },
      "history_structural:historical_concept_error",
      0.8,
    );
  }
  return null;
}

/**
 * @param {object} p
 */
export function classifyHistoryAnswer(p) {
  const exact = [proveHistoryTimelineAlt, proveHistoryCauseEffectSwap, proveHistoryConceptSlot];
  for (const fn of exact) {
    const r = fn(p);
    if (r) return r;
  }
  return proveHistorySpellingStructural(p);
}
