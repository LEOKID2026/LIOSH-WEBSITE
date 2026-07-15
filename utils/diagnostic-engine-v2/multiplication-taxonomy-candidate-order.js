/**
 * Phase 2-C2 - order M-03 vs M-10 taxonomy candidates for math `multiplication` report rows
 * using wrong-event metadata (patternFamily, kind, conceptTag, params, etc.) plus row grade/level.
 * Does not remove candidates; only reorders when both M-03 and M-10 are present.
 *
 * Row `bucketKey` / `topicRowKey` are excluded from the routing haystack so the literal substring
 * "multiplication" does not dominate every multiplication bucket row.
 */

/** Longer phrases first to reduce redundant substring double-counting where helpful. */
const M03_INDICATORS = [
  "multiplication_fact",
  "repeated_addition",
  "equal_groups",
  "multiplication",
  "multiples",
  "multiple",
  "factors",
  "factor",
  "powers",
  "exponent",
  "multiply",
  "product",
  "facts",
  "square",
  "array",
  "cube",
  "fact",
  "times",
];

const M10_INDICATORS = [
  "wrong_multiplication_for_division",
  "multiplication_for_division",
  "division_with_remainder",
  "multiplicative_comparison",
  "inverse_operation",
  "proportion",
  "proportional",
  "remainder",
  "quotient",
  "division",
  "inverse",
  "divide",
  "ratio",
  "relation",
  "rate",
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
    for (const k of ["kind", "patternFamily", "operation", "conceptTag", "diagnosticSkillId", "semanticFamily"]) {
      if (p[k] != null && String(p[k]).trim()) parts.push(String(p[k]));
    }
    try {
      parts.push(JSON.stringify(p).toLowerCase());
    } catch {
      /* ignore */
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
 * Grade / level only - avoids bucket/topic keys always containing "multiplication".
 *
 * @param {unknown} row
 * @returns {string}
 */
function rowGradeLevelHaystack(row) {
  const parts = [];
  if (row && typeof row === "object") {
    const r = /** @type {Record<string, unknown>} */ (row);
    for (const k of ["levelKey", "gradeKey"]) {
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
 * @returns {{ m03Score: number; m10Score: number }}
 */
export function multiplicationTaxonomyRoutingScores(wrongEvents, row) {
  const rowHay = rowGradeLevelHaystack(row);
  let m03Score = 0;
  let m10Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  for (const ev of list) {
    const wh = `${rowHay} ${haystackForWrong(ev)}`.trim().toLowerCase();
    m03Score += countIndicatorHits(wh, M03_INDICATORS);
    m10Score += countIndicatorHits(wh, M10_INDICATORS);
  }
  return { m03Score, m10Score };
}

/**
 * Reorders only M-03 and M-10 when both appear; all other ids keep relative order.
 *
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown }} [ctx]
 * @returns {string[]}
 */
export function orderMultiplicationTaxonomyCandidates(candidateIds, wrongEvents, ctx = {}) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return candidateIds ? [...candidateIds] : [];
  const has3 = candidateIds.includes("M-03");
  const has10 = candidateIds.includes("M-10");
  if (!has3 || !has10) return [...candidateIds];

  const { m03Score, m10Score } = multiplicationTaxonomyRoutingScores(wrongEvents, ctx.row);

  if (m10Score > m03Score) {
    const rest = candidateIds.filter((id) => id !== "M-03" && id !== "M-10");
    return ["M-10", "M-03", ...rest];
  }
  if (m03Score > m10Score) {
    const rest = candidateIds.filter((id) => id !== "M-03" && id !== "M-10");
    return ["M-03", "M-10", ...rest];
  }

  return [...candidateIds];
}
