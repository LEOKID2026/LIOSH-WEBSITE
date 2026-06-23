/**
 * Phase 4-B3 / Stage 4D — order English taxonomy candidates for conflict buckets only:
 * - `vocabulary`: E-01 vs E-05
 * - `grammar`: E-02 vs E-04
 *
 * Uses wrong-event metadata (patternFamily, kind, params, possibleErrorPatterns, questionLabel)
 * plus row grade/level only. Never removes candidates; only reorders with real evidence.
 */

import {
  routingHaystackForWrongEvent,
  routingRowGradeLevelHaystack,
  countRoutingIndicatorHits,
  collectPossibleErrorPatterns,
} from "./diagnostic-routing-haystack.js";
import {
  taxonomyPatternRoutingScores,
  reorderPairByPreference,
} from "./taxonomy-pattern-routing-scores.js";

/** Longer / more specific phrases first where possible to reduce double-counting. */
const E05_VOCAB_CONTEXT_INDICATORS = [
  "meaning_from_context",
  "vocabulary_context",
  "word_in_context",
  "sentence_context",
  "word_combination",
  "choose_word",
  "usage",
  "in_context",
  "context_clue",
  "preposition_context",
  "preposition",
  "prepositions",
];

const E01_VOCAB_BASIC_INDICATORS = [
  "vocab_recall_en",
  "vocab_recall",
  "word_to_picture",
  "picture_match",
  "match_word",
  "identify_word",
  "word_meaning",
  "word_bank",
  "known_word",
  "vocab_basic",
  "vocabulary",
  "translation",
  "recall",
  "he_to_en",
  "en_to_he",
  "false_friend",
  "false friend",
  "collocation",
];

const E04_GRAMMAR_STRUCTURE_INDICATORS = [
  "sentence_structure",
  "phrase_structure",
  "sentence_building",
  "building_sentence",
  "build_sentence",
  "grammar_context",
  "sentence_meaning",
  "word_order",
  "connectors",
  "connector",
  "structure",
];

const E02_GRAMMAR_BASIC_INDICATORS = [
  "grammar_basic",
  "sentence_grammar",
  "subject_verb",
  "verb_form",
  "he_she_it",
  "do_does",
  "has_have",
  "is_are_am",
  "pronoun",
  "agreement",
  "tense",
  "present",
  "past",
];

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ e01Score: number; e05Score: number }}
 */
export function englishVocabularyRoutingScores(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  let e01Score = 0;
  let e05Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  const tax = taxonomyPatternRoutingScores(["E-01", "E-05"], list, row);
  e01Score += tax["E-01"] || 0;
  e05Score += tax["E-05"] || 0;

  for (const ev of list) {
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev)}`.trim().toLowerCase();
    e01Score += countRoutingIndicatorHits(wh, E01_VOCAB_BASIC_INDICATORS);
    e05Score += countRoutingIndicatorHits(wh, E05_VOCAB_CONTEXT_INDICATORS);

    const params =
      ev && typeof ev === "object" && ev.params && typeof ev.params === "object"
        ? /** @type {Record<string, unknown>} */ (ev.params)
        : {};
    const direction = String(params.direction || "").trim().toLowerCase();
    const patternFamily = String(
      (ev && typeof ev === "object" ? ev.patternFamily : null) || params.patternFamily || "",
    )
      .trim()
      .toLowerCase();

    if (patternFamily === "vocab_recall_en" || wh.includes("vocab_recall_en")) e01Score += 3;
    if (direction === "he_to_en") e01Score += 2;
    if (direction === "en_to_he" && (wh.includes("word_meaning") || wh.includes("vocabulary"))) e01Score += 2;

    const patterns = collectPossibleErrorPatterns([ev]);
    if (patterns.some((p) => /תרגום מילולי|false friend/i.test(String(p)))) e01Score += 3;
    if (patterns.some((p) => /preposition|יחס/i.test(String(p)))) e05Score += 3;
  }

  return { e01Score, e05Score };
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @returns {{ e02Score: number; e04Score: number }}
 */
export function englishGrammarRoutingScores(wrongEvents, row) {
  const rowHay = routingRowGradeLevelHaystack(row);
  let e02Score = 0;
  let e04Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  const tax = taxonomyPatternRoutingScores(["E-02", "E-04"], list, row);
  e02Score += tax["E-02"] || 0;
  e04Score += tax["E-04"] || 0;

  for (const ev of list) {
    const wh = `${rowHay} ${routingHaystackForWrongEvent(ev)}`.trim().toLowerCase();
    e02Score += countRoutingIndicatorHits(wh, E02_GRAMMAR_BASIC_INDICATORS);
    e04Score += countRoutingIndicatorHits(wh, E04_GRAMMAR_STRUCTURE_INDICATORS);
  }
  return { e02Score, e04Score };
}

/**
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string }} [ctx]
 * @returns {{ orderedIds: string[]; disambiguationApplied: boolean; winnerId: string|null; scores?: Record<string, number> }}
 */
export function orderEnglishTaxonomyCandidatesWithMeta(candidateIds, wrongEvents, ctx = {}) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return { orderedIds: candidateIds ? [...candidateIds] : [], disambiguationApplied: false, winnerId: null };
  }
  const bucketKey = String(ctx.bucketKey || "").trim().toLowerCase();
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];

  if (bucketKey === "vocabulary") {
    const has1 = candidateIds.includes("E-01");
    const has5 = candidateIds.includes("E-05");
    if (has1 && has5) {
      const { e01Score, e05Score } = englishVocabularyRoutingScores(list, ctx.row);
      const pair = reorderPairByPreference(
        "E-01",
        "E-05",
        e01Score > e05Score,
        e05Score > e01Score,
        candidateIds,
      );
      return { ...pair, scores: { "E-01": e01Score, "E-05": e05Score } };
    }
  }

  if (bucketKey === "grammar") {
    const has2 = candidateIds.includes("E-02");
    const has4 = candidateIds.includes("E-04");
    if (has2 && has4) {
      const { e02Score, e04Score } = englishGrammarRoutingScores(list, ctx.row);
      const pair = reorderPairByPreference(
        "E-02",
        "E-04",
        e02Score > e04Score,
        e04Score > e02Score,
        candidateIds,
      );
      return { ...pair, scores: { "E-02": e02Score, "E-04": e04Score } };
    }
  }

  return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
}

/**
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string }} [ctx]
 * @returns {string[]}
 */
export function orderEnglishTaxonomyCandidates(candidateIds, wrongEvents, ctx = {}) {
  return orderEnglishTaxonomyCandidatesWithMeta(candidateIds, wrongEvents, ctx).orderedIds;
}
