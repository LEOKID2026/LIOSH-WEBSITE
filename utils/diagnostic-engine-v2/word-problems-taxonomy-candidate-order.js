/**
 * Phase 2-D2 - order M-07 vs M-08 taxonomy candidates for math `word_problems` rows
 * using wrong-event metadata. Does not remove candidates; only reorders when both are present.
 *
 * Row context uses `levelKey` / `gradeKey` only (like multiplication routing) so literal
 * `word_problems` / topicRowKey substrings do not bias every row.
 */

/** Longer phrases first to reduce redundant substring double-counting where helpful. */
const M07_INDICATORS = [
  "correct_number_wrong_unit",
  "number_correct_unit_wrong",
  "measurement_unit",
  "quantity_label",
  "answer_label",
  "missing_unit",
  "wrong_unit",
  "answer_unit",
  "asks_for_unit",
  "asked_unit",
  "context_unit",
  "answer_format",
  "what_is_asked",
  "formulation",
  "wording",
  "units",
  "unit",
  "label",
];

const M08_INDICATORS = [
  "order_of_operations",
  "combine_information",
  "operation_selection",
  "operation_choice",
  "choose_operation",
  "wrong_operation",
  "multi_step",
  "multistep",
  "two_step",
  "parentheses",
  "representation",
  "integration",
  "modeling",
  "sequences",
  "sequence",
  "equations",
  "equation",
  "recursive",
  "brackets",
  "strategy",
  "variable",
  "expression",
  "pattern",
  "schema",
  "order_operations",
  "model",
  "plan",
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
 * Grade / level only - avoids bucket/topic keys always containing `word_problems`.
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
 * @returns {{ m07Score: number; m08Score: number }}
 */
export function wordProblemsTaxonomyRoutingScores(wrongEvents, row) {
  const rowHay = rowGradeLevelHaystack(row);
  let m07Score = 0;
  let m08Score = 0;
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  for (const ev of list) {
    const wh = `${rowHay} ${haystackForWrong(ev)}`.trim().toLowerCase();
    m07Score += countIndicatorHits(wh, M07_INDICATORS);
    m08Score += countIndicatorHits(wh, M08_INDICATORS);
  }
  return { m07Score, m08Score };
}

/**
 * Reorders only M-07 and M-08 when both appear; all other ids keep relative order.
 *
 * @param {string[]} candidateIds
 * @param {unknown[]} wrongEvents
 * @param {{ row?: unknown }} [ctx]
 * @returns {string[]}
 */
export function orderWordProblemsTaxonomyCandidates(candidateIds, wrongEvents, ctx = {}) {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return candidateIds ? [...candidateIds] : [];
  const has7 = candidateIds.includes("M-07");
  const has8 = candidateIds.includes("M-08");
  if (!has7 || !has8) return [...candidateIds];

  const { m07Score, m08Score } = wordProblemsTaxonomyRoutingScores(wrongEvents, ctx.row);

  if (m08Score > m07Score) {
    const rest = candidateIds.filter((id) => id !== "M-07" && id !== "M-08");
    return ["M-08", "M-07", ...rest];
  }
  if (m07Score > m08Score) {
    const rest = candidateIds.filter((id) => id !== "M-07" && id !== "M-08");
    return ["M-07", "M-08", ...rest];
  }

  return [...candidateIds];
}
