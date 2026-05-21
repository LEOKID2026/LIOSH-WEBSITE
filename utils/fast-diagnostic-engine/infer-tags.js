/**
 * Map raw mistake-event fields to normalized educational error tags (deterministic).
 * Tags are stable ids for logic; Hebrew labels live in parent-copy-he.js
 */

/** @param {string} s */
function low(s) {
  return String(s || "").trim().toLowerCase();
}

/**
 * @param {import("../mistake-event.js").MistakeEventV1} ev
 * @param {string} subjectId
 * @returns {string[]}
 */
export function inferNormalizedTags(ev, subjectId) {
  const sid = String(subjectId || "");
  const tags = new Set();
  const pf = low(ev?.patternFamily);
  const ct = low(ev?.conceptTag);
  const kind = low(ev?.kind);
  const subtype = low(ev?.subtype);

  const add = (t) => {
    if (t) tags.add(t);
  };

  if (!ev?.isCorrect && Array.isArray(ev.expectedErrorTags)) {
    for (const t of ev.expectedErrorTags) {
      const s = String(t || "").trim();
      if (s) add(s);
    }
  }

  // --- Cross-cutting: area/perimeter confusion is geometry-bank–driven (not general math). ---
  if (
    sid === "geometry" &&
    (pf.includes("perimeter") || pf.includes("area"))
  ) {
    add("concept_confusion");
  }
  if (pf.includes("fraction") || pf.includes("denominator") || ct.includes("denom")) {
    add("repeated_misconception");
    if (pf.includes("add") || kind.includes("add")) add("adds_denominators_directly");
    if (pf.includes("lcm") || ct.includes("lcm")) add("wrong_lcm");
    if (pf.includes("ignore") || ct.includes("ignore")) add("ignores_denominator");
  }
  if (pf.includes("place") || ct.includes("place_value")) add("place_value_error");
  if (pf.includes("multiplication") || ct.includes("times_table")) add("multiplication_fact_gap");
  if (pf.includes("operation") || kind.includes("wrong_op")) add("operation_confusion");

  if (sid === "english") {
    if (pf.includes("tense") || ct.includes("tense")) add("tense_confusion");
    if (pf.includes("vocab") || ct.includes("vocab")) add("vocabulary_gap");
    if (pf.includes("grammar") || ct.includes("grammar")) add("grammar_pattern_error");
    if (pf.includes("spell") || ct.includes("spell")) add("spelling_pattern_error");
    if (pf.includes("read") || ct.includes("rc")) add("reading_comprehension_gap");
    // Safety when bank tags missing but enriched conceptTag prefix is present.
    if (ct.startsWith("english_present_simple")) add("present_simple_3rd_singular_error");
    else if (ct.startsWith("english_past_simple")) add("past_tense_form_error");
    else if (ct.startsWith("english_progressive")) add("progressive_aspect_error");
    else if (ct.startsWith("english_question_frames")) add("question_word_order_error");
    else if (ct.startsWith("english_modals")) add("modal_verb_error");
    else if (ct.startsWith("english_quantifiers")) add("quantifier_choice_error");
    else if (ct.startsWith("english_comparatives")) add("comparative_form_error");
    else if (ct.startsWith("english_future_forms")) add("future_form_error");
    else if (ct.startsWith("english_complex_tenses")) add("perfect_aspect_error");
    else if (ct.startsWith("english_conditionals")) add("conditional_clause_error");
    else if (ct.startsWith("english_phase29_advanced")) add("advanced_grammar_error");
    else if (ct.startsWith("english_phase29_standard")) add("sentence_structure_error");
    else if (ct.startsWith("english_be_agreement")) add("grammar_pattern_error");
  }

  if (sid === "hebrew") {
    if (pf.includes("decod") || ct.includes("decode")) add("decoding_error");
    if (pf.includes("comprehen") || ct.includes("comp")) add("comprehension_gap");
    if (pf.includes("detail")) add("detail_recall_error");
    if (pf.includes("infer")) add("inference_error");
    if (pf.includes("vocab") || ct.includes("vocab")) add("vocabulary_gap");
    if (pf.includes("sequence") || ct.includes("order")) add("sequence_error");
  }

  if (
    sid === "science" ||
    sid === "moledet-geography" ||
    sid === "geometry"
  ) {
    if (pf.includes("concept") || ct.includes("concept")) add("concept_confusion");
    if (pf.includes("fact") || ct.includes("recall")) add("fact_recall_gap");
    if (pf.includes("cause") || pf.includes("effect")) add("cause_effect_gap");
    if (pf.includes("classif")) add("classification_error");
    if (pf.includes("map") || ct.includes("map")) add("map_reading_gap");
  }

  if (sid === "geometry") {
    if (pf.includes("prereq") || ct.includes("prereq")) add("prerequisite_gap");
  }

  if (kind.includes("misread") || subtype.includes("misread")) add("instruction_misread");
  if (ev?.hintUsed === true) add("strategy_error");
  if (ev?.responseMs != null && Number(ev.responseMs) < 2500 && !ev?.hintUsed) add("speed_block");
  if (ev?.retryCount != null && Number(ev.retryCount) > 1) add("attention_variability");

  // Subject-specific math keywords (stored in masters)
  if (sid === "math") {
    if (pf.includes("fraction") || ct.includes("frac")) {
      add("repeated_misconception");
      if (![...tags].some((t) => t.includes("denom") || t === "wrong_lcm")) add("concept_gap");
    }
    if (pf.includes("guess") || kind.includes("guess")) add("guessing_pattern");
  }

  if (tags.size === 0 && ev && !ev.isCorrect) {
    const hadRaw = !!(
      ev.patternFamily ||
      ev.conceptTag ||
      ev.kind ||
      ev.subtype ||
      ev.distractorFamily ||
      ev.diagnosticSkillId ||
      (Array.isArray(ev.expectedErrorTags) && ev.expectedErrorTags.length > 0)
    );
    if (hadRaw) {
      if (sid === "geometry") add("geometry_calculation_slip");
      else add("calculation_slip");
    }
  }

  return [...tags];
}

/** Misconception / high-information tags → prefer early_signal over insufficient. */
export function isHighInformationMisconceptionTag(tag) {
  const t = String(tag || "");
  return (
    t === "repeated_misconception" ||
    t === "adds_denominators_directly" ||
    t === "wrong_lcm" ||
    t === "ignores_denominator" ||
    t === "operation_confusion" ||
    t === "place_value_error" ||
    t === "concept_confusion" ||
    t === "concept_gap" ||
    t === "grammar_pattern_error" ||
    t === "tense_confusion" ||
    t === "comprehension_gap" ||
    t === "detail_recall_error" ||
    t === "inference_error" ||
    t === "fact_recall_gap" ||
    t === "cause_effect_gap" ||
    t === "classification_error" ||
    t === "prerequisite_gap"
  );
}
