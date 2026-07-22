/**
 * Misconception-aware adaptive routing — routes practice by detected/suspected pattern, not only streaks.
 */

/** @typedef {"normal"|"probe"|"focused_practice"|"transfer_check"|"recovery"} AdaptiveRoutePhase */

/**
 * @typedef {Object} MisconceptionAdaptiveState
 * @property {Record<string, { tag: string, count: number, lastSeenMs: number, probePending: boolean, confirmed: boolean }>} patterns
 * @property {AdaptiveRoutePhase} phase
 * @property {string|null} activeTag
 * @property {string|null} activeKind
 * @property {number} recoveryStreak
 */

/**
 * @returns {MisconceptionAdaptiveState}
 */
export function createMisconceptionAdaptiveState() {
  return {
    patterns: {},
    phase: "normal",
    activeTag: null,
    activeKind: null,
    recoveryStreak: 0,
  };
}

/** Probe kind map — distinguishes hypothesis from random calculation error. */
export const PROBE_KIND_BY_TAG = Object.freeze({
  omitted_addend: "add_three",
  add_instead_of_sub: "sub_two",
  add_instead_of_mul: "mul",
  mul_instead_of_add: "add_two",
  sub_instead_of_add: "add_two",
  numerator_only_compare: "frac_compare",
  rounding_wrong_direction: "dec_round",
  place_value_error: "place_digit",
  fact_error: "mul",
  multiplication_fact_error: "mul",
  grammar_error: "grammar_mcq",
  grammar_agreement_error: "grammar_mcq",
  gender_number_agreement: "grammar_mcq",
  spelling_pattern_error: "spelling_typed",
  spelling_error: "spelling_typed",
  writing_error: "spelling_typed",
  concept_confusion: "science_mcq",
  classification_error: "science_mcq",
  body_system_confusion: "science_mcq",
  timeline_sequence_error: "history_mcq",
  cause_effect_error: "history_mcq",
  map_reading_error: "geography_mcq",
  transformation_error: "geometry_transform",
  shape_property_confusion: "geometry_mcq",
  perimeter_area_confusion: "rect_area",
  forgot_divide_by_2: "tri_area",
  vocabulary_meaning_error: "vocabulary_mcq",
  translation_error: "translation_mcq",
  historical_connection_error: "history_mcq",
  material_property_error: "science_mcq",
  physical_chemical_confusion: "science_mcq",
  planet_confusion: "science_mcq",
  ecosystem_confusion: "science_mcq",
  animal_classification_error: "science_mcq",
  variable_control_error: "science_mcq",
  location_error: "geography_mcq",
  citizenship_error: "geography_mcq",
  homeland_identity_error: "moledet_mcq",
  landform_confusion: "geography_mcq",
  values_error: "moledet_mcq",
  community_error: "moledet_mcq",
  map_symbol_error: "geography_mcq",
  historical_concept_error: "history_mcq",
  comparison_error: "history_mcq",
  figure_role_confusion: "history_mcq",
  institution_confusion: "history_mcq",
  culture_heritage_error: "history_mcq",
  source_comprehension_error: "history_mcq",
  preposition_error: "grammar_mcq",
  phrasal_verb_error: "grammar_mcq",
  sentence_structure_error: "sentences_mcq",
  listening_comprehension_error: "phonics_mcq",
  vocabulary_context_error: "hebrew_mcq",
  verb_tense_error: "grammar_mcq",
  punctuation_error: "hebrew_mcq",
  speaking_expression_error: "hebrew_mcq",
  reading_comprehension_error: "hebrew_mcq",
  homophone_confusion: "spelling_typed",
  area_formula_error: "geometry_mcq",
  volume_formula_error: "geometry_mcq",
  symmetry_error: "geometry_mcq",
  angle_range_error: "geometry_mcq",
  carry_error: "add_vertical",
  common_denominator_error: "frac_add",
  unit_error: "wp_",
  wrong_operation_wp: "wp_",
});

/**
 * @param {MisconceptionAdaptiveState} state
 * @param {string|null|undefined} tag
 * @param {boolean} isCorrect
 * @param {number} [nowMs]
 */
export function applyMisconceptionAdaptiveAnswer(state, tag, isCorrect, nowMs = Date.now()) {
  const next = {
    ...state,
    patterns: { ...state.patterns },
  };
  const t = tag ? String(tag).trim() : "";
  if (!t || t === "unknown") {
    if (isCorrect && next.phase === "recovery") {
      next.recoveryStreak += 1;
      if (next.recoveryStreak >= 3) {
        next.phase = "normal";
        next.activeTag = null;
        next.activeKind = null;
        next.recoveryStreak = 0;
      }
    }
    return next;
  }

  if (!next.patterns[t]) {
    next.patterns[t] = { tag: t, count: 0, lastSeenMs: nowMs, probePending: false, confirmed: false };
  }
  const p = { ...next.patterns[t] };

  if (!isCorrect) {
    p.count += 1;
    p.lastSeenMs = nowMs;
    next.patterns[t] = p;

    if (p.count >= 2 && !p.confirmed) {
      next.phase = "probe";
      next.activeTag = t;
      next.activeKind = PROBE_KIND_BY_TAG[t] || null;
      p.probePending = true;
      next.patterns[t] = p;
    } else if (p.confirmed) {
      next.phase = "focused_practice";
      next.activeTag = t;
      next.activeKind = PROBE_KIND_BY_TAG[t] || null;
    }
    next.recoveryStreak = 0;
    return next;
  }

  if (p.probePending) {
    p.probePending = false;
    p.confirmed = true;
    next.patterns[t] = p;
    next.phase = "focused_practice";
    next.activeTag = t;
    next.activeKind = PROBE_KIND_BY_TAG[t] || null;
    next.recoveryStreak = 0;
    return next;
  }

  if (next.phase === "focused_practice" && next.activeTag === t) {
    next.phase = "transfer_check";
    next.recoveryStreak = 1;
    return next;
  }

  if (next.phase === "transfer_check" || next.phase === "recovery") {
    next.recoveryStreak += 1;
    if (next.recoveryStreak >= 3) {
      next.phase = "normal";
      next.activeTag = null;
      next.activeKind = null;
      next.recoveryStreak = 0;
      delete next.patterns[t];
    } else {
      next.phase = "recovery";
    }
  }

  return next;
}

/**
 * @param {MisconceptionAdaptiveState} state
 * @param {{ operation?: string, kind?: string, forceKind?: string }} [ctx]
 */
export function resolveMisconceptionAdaptiveQuestionTarget(state, ctx = {}) {
  if (state.phase === "normal") {
    return {
      preferKind: null,
      preferOperation: ctx.operation || null,
      phase: state.phase,
      reason: "normal_track",
    };
  }

  const kind = state.activeKind || PROBE_KIND_BY_TAG[state.activeTag || ""] || ctx.kind || null;
  return {
    preferKind: kind,
    preferOperation:
      kind === "add_three"
        ? "addition"
        : kind === "sub_two"
          ? "subtraction"
          : ctx.operation || null,
    phase: state.phase,
    activeTag: state.activeTag,
    reason: `${state.phase}:${state.activeTag || "unknown"}`,
  };
}

/**
 * Build probe metadata for client storage when routing enters probe phase.
 * @param {MisconceptionAdaptiveState} state
 */
export function buildMisconceptionProbeMeta(state) {
  if (state.phase !== "probe" || !state.activeTag) return null;
  return {
    hypothesisTag: state.activeTag,
    probeKind: state.activeKind || PROBE_KIND_BY_TAG[state.activeTag] || null,
    checks: `distinguish_${state.activeTag}_from_random_error`,
    createdAt: new Date().toISOString(),
  };
}
