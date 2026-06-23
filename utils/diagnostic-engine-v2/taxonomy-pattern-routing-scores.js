/**
 * Stage 4D — score taxonomy candidates from existing taxonomy rows + mistake metadata.
 * Does not invent taxonomy; uses patternHe / rootsHe / subskillHe only.
 */

import { TAXONOMY_BY_ID } from "./taxonomy-registry.js";
import {
  routingHaystackForWrongEvent,
  collectPossibleErrorPatterns,
  buildRoutingHaystack,
} from "./diagnostic-routing-haystack.js";

/**
 * @param {string} text
 * @returns {string}
 */
function norm(text) {
  return String(text || "").trim().toLowerCase();
}

/**
 * @param {string} hay
 * @param {string} needle
 * @returns {boolean}
 */
function hayIncludesPhrase(hay, needle) {
  const n = norm(needle);
  if (!n) return false;
  return hay.includes(n);
}

/**
 * @param {readonly string[]} patterns
 * @param {string} phrase
 * @returns {boolean}
 */
function patternsIncludeExact(patterns, phrase) {
  const p = String(phrase || "").trim();
  if (!p) return false;
  return patterns.some((x) => String(x || "").trim() === p);
}

/**
 * @param {import("./taxonomy-types.js").TaxonomyRow} trow
 * @returns {string[]}
 */
function taxonomyRoutingPhrases(trow) {
  /** @type {string[]} */
  const out = [];
  if (trow.patternHe) out.push(String(trow.patternHe));
  if (Array.isArray(trow.rootsHe)) out.push(...trow.rootsHe.map(String));
  if (trow.subskillHe) out.push(String(trow.subskillHe));
  return [...new Set(out.filter(Boolean))];
}

/**
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @param {{ requireQuestionCorroboration?: boolean }} [opts]
 * @returns {Record<string, number>}
 */
export function taxonomyPatternRoutingScores(candidateIds, wrongEvents, row, opts = {}) {
  /** @type {Record<string, number>} */
  const scores = {};
  for (const id of candidateIds) scores[id] = 0;

  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  const rowHay = buildRoutingHaystack([], row);

  for (const ev of list) {
    const hayOpts = opts.requireQuestionCorroboration ? { excludeEnrichmentPatterns: true } : {};
    const hay = `${rowHay} ${routingHaystackForWrongEvent(ev, hayOpts)}`.trim().toLowerCase();
    const patterns = collectPossibleErrorPatterns([ev]);
    const meta =
      ev && typeof ev === "object" && ev.metadata && typeof ev.metadata === "object"
        ? /** @type {Record<string, unknown>} */ (ev.metadata)
        : {};
    const metaSource = String(meta.metadataSource || "");
    const questionNative =
      metaSource === "question_metadata_normalizer" || metaSource === "question_metadata_contract";

    for (const id of candidateIds) {
      const trow = TAXONOMY_BY_ID[id];
      if (!trow) continue;

      for (const phrase of taxonomyRoutingPhrases(trow)) {
        const inHay = hayIncludesPhrase(hay, phrase);
        const inPatterns = patternsIncludeExact(patterns, phrase);
        if (!inHay && !inPatterns) continue;

        let weight = inPatterns ? 4 : 2;
        if (opts.requireQuestionCorroboration && !questionNative && metaSource === "taxonomy_topic_enrichment") {
          weight = 0;
        }
        scores[id] += weight;
      }
    }
  }

  return scores;
}

/**
 * @param {Record<string, number>} scores
 * @param {readonly string[]} presentIds
 * @returns {{ winnerId: string|null; maxScore: number; tied: boolean }}
 */
export function pickUniqueRoutingWinner(scores, presentIds) {
  let maxS = 0;
  for (const id of presentIds) {
    const v = scores[id] ?? 0;
    if (v > maxS) maxS = v;
  }
  if (maxS <= 0) return { winnerId: null, maxScore: 0, tied: true };

  const winners = presentIds.filter((id) => (scores[id] ?? 0) === maxS);
  if (winners.length !== 1) return { winnerId: null, maxScore: maxS, tied: true };
  return { winnerId: winners[0], maxScore: maxS, tied: false };
}

/**
 * @param {string[]} candidateIds
 * @param {readonly string[]} bridgeOrder
 * @param {Record<string, number>} scores
 * @returns {{ orderedIds: string[]; disambiguationApplied: boolean; winnerId: string|null }}
 */
export function reorderCandidatesByScores(candidateIds, bridgeOrder, scores) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return { orderedIds: candidateIds ? [...candidateIds] : [], disambiguationApplied: false, winnerId: null };
  }
  const present = bridgeOrder.filter((id) => candidateIds.includes(id));
  if (present.length < 2) {
    return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: present[0] || null };
  }

  const { winnerId, tied } = pickUniqueRoutingWinner(scores, present);
  if (!winnerId || tied) {
    return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
  }

  const rest = present.filter((id) => id !== winnerId);
  const orderedCore = [winnerId, ...rest];
  const extras = candidateIds.filter((id) => !bridgeOrder.includes(id));
  return {
    orderedIds: [...orderedCore, ...extras],
    disambiguationApplied: true,
    winnerId,
  };
}

/**
 * @param {string} a
 * @param {string} b
 * @param {boolean} preferA
 * @param {boolean} preferB
 * @param {string[]} candidateIds
 * @returns {{ orderedIds: string[]; disambiguationApplied: boolean; winnerId: string|null }}
 */
export function reorderPairByPreference(a, b, preferA, preferB, candidateIds) {
  const rest = candidateIds.filter((id) => id !== a && id !== b);
  if (preferA && !preferB) {
    return { orderedIds: [a, b, ...rest], disambiguationApplied: true, winnerId: a };
  }
  if (preferB && !preferA) {
    return { orderedIds: [b, a, ...rest], disambiguationApplied: true, winnerId: b };
  }
  return { orderedIds: [...candidateIds], disambiguationApplied: false, winnerId: null };
}
