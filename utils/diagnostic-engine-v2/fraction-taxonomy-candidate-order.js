/**
 * Phase 2-B3 - order M-04 vs M-05 taxonomy candidates for math `fractions` rows
 * using wrong-event metadata (patternFamily, kind, conceptTag, optional params).
 * Does not remove candidates; only reorders when both M-04 and M-05 are present.
 */

/** Longer phrases first to reduce redundant double-counting on the same haystack. */
const M04_INDICATORS = [
  "equivalence_for_compare",
  "equivalent_compare",
  "like_den_compare",
  "unlike_den_compare",
  "fraction_compare",
  "numerator_only",
  "denominator_size",
  "denominator meaning",
  "comparison",
  "compare",
];

const M05_INDICATORS = [
  "unlike_denominators_add_sub",
  "same_denominator_add_sub",
  "common_denominator",
  "fraction_operation",
  "procedural",
  "operation",
  "addition",
  "subtraction",
  "add_sub",
  "subtract",
  "commonden",
  "lcm",
  "add",
];

/**
 * @param {unknown} ev
 * @returns {string}
 */
function haystackForWrong(ev) {
  if (!ev || typeof ev !== "object") return "";
  const e = /** @type {Record<string, unknown>} */ (ev);
  const parts = [];
  for (const k of ["patternFamily", "kind", "conceptTag", "diagnosticSkillId", "topicOrOperation"]) {
    if (e[k] != null && String(e[k]).trim()) parts.push(String(e[k]));
  }
  const params = e.params;
  if (params && typeof params === "object") {
    const p = /** @type {Record<string, unknown>} */ (params);
    for (const k of ["kind", "patternFamily", "operation", "conceptTag", "diagnosticSkillId"]) {
      if (p[k] != null && String(p[k]).trim()) parts.push(String(p[k]));
    }
    const contract = p.contract;
    if (contract && typeof contract === "object") {
      try {
        parts.push(JSON.stringify(contract).toLowerCase());
      } catch {
        /* ignore */
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

/**
 * @param {unknown} row
 * @param {string} bucketKey
 * @param {string} topicRowKey
 * @returns {string}
 */
function rowContextHaystack(row, bucketKey, topicRowKey) {
  const parts = [bucketKey, topicRowKey].filter(Boolean).map((s) => String(s).toLowerCase());
  if (row && typeof row === "object") {
    const r = /** @type {Record<string, unknown>} */ (row);
    for (const k of ["levelKey", "bucketKey", "gradeKey"]) {
      if (r[k] != null && String(r[k]).trim()) parts.push(String(r[k]).toLowerCase());
    }
  }
  return parts.join(" ");
}

/**
 * @param {string} hay
 * @param {readonly string[]} phrases
 * @returns {number}
 */
function countIndicatorHits(hay, phrases) {
  let n = 0;
  for (const ph of phrases) {
    if (!ph) continue;
    if (hay.includes(ph)) n += 1;
  }
  return n;
}

/**
 * @param {unknown[]} wrongEvents
 * @param {unknown} [row]
 * @param {string} [bucketKey]
 * @param {string} [topicRowKey]
 * @returns {{ comparisonScore: number; operationScore: number }}
 */
export function fractionTaxonomyRoutingScores(wrongEvents, row, bucketKey, topicRowKey) {
  const rowHay = rowContextHaystack(row, bucketKey || "", topicRowKey || "");
  let comparisonScore = 0;
  let operationScore = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  for (const ev of list) {
    const wh = `${rowHay} ${haystackForWrong(ev)}`.trim().toLowerCase();
    comparisonScore += countIndicatorHits(wh, M04_INDICATORS);
    operationScore += countIndicatorHits(wh, M05_INDICATORS);
  }
  return { comparisonScore, operationScore };
}

/**
 * Reorders only M-04 and M-05 when both appear; all other ids keep relative order.
 *
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown; bucketKey?: string; topicRowKey?: string }} [ctx]
 * @returns {string[]}
 */
export function orderFractionTaxonomyCandidates(candidateIds, wrongEvents, ctx = {}) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return candidateIds ? [...candidateIds] : [];
  const has4 = candidateIds.includes("M-04");
  const has5 = candidateIds.includes("M-05");
  if (!has4 || !has5) return [...candidateIds];

  const { comparisonScore, operationScore } = fractionTaxonomyRoutingScores(
    wrongEvents,
    ctx.row,
    ctx.bucketKey,
    ctx.topicRowKey
  );

  if (operationScore > comparisonScore) {
    const rest = candidateIds.filter((id) => id !== "M-04" && id !== "M-05");
    return ["M-05", "M-04", ...rest];
  }
  if (comparisonScore > operationScore) {
    const rest = candidateIds.filter((id) => id !== "M-04" && id !== "M-05");
    return ["M-04", "M-05", ...rest];
  }

  return [...candidateIds];
}
