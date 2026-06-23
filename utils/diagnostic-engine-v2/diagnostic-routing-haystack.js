/**
 * Stage 4D — shared evidence haystack for taxonomy candidate disambiguation.
 * Uses mistake-event metadata from stage 4B (no invented fields).
 */

/**
 * @param {unknown} ev
 * @param {{ excludeEnrichmentPatterns?: boolean }} [opts]
 * @returns {string}
 */
export function routingHaystackForWrongEvent(ev, opts = {}) {
  if (!ev || typeof ev !== "object") return "";
  const e = /** @type {Record<string, unknown>} */ (ev);
  /** @type {string[]} */
  const parts = [];

  const meta = e.metadata;
  const metaSource =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? String(/** @type {Record<string, unknown>} */ (meta).metadataSource || "")
      : "";
  const skipEnrichedPatterns =
    opts.excludeEnrichmentPatterns === true && metaSource === "taxonomy_topic_enrichment";
  const skipEnrichedMetaFields = skipEnrichedPatterns;

  for (const k of [
    "patternFamily",
    "kind",
    "subtype",
    "conceptTag",
    "diagnosticSkillId",
    ...(skipEnrichedMetaFields ? [] : ["skillId", "subskillId", "subSkill"]),
    "topicOrOperation",
    "bucketKey",
    "operation",
  ]) {
    if (e[k] != null && String(e[k]).trim()) parts.push(String(e[k]));
  }

  if (e.exerciseText != null && String(e.exerciseText).trim()) parts.push(String(e.exerciseText));
  if (e.questionLabel != null && String(e.questionLabel).trim()) parts.push(String(e.questionLabel));

  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = /** @type {Record<string, unknown>} */ (meta);
    for (const k of ["patternFamily", "questionType", "metadataSource"]) {
      if (m[k] != null && String(m[k]).trim()) parts.push(String(m[k]));
    }
    if (!skipEnrichedMetaFields) {
      for (const k of ["skillId", "subskillId", "subSkill"]) {
        if (m[k] != null && String(m[k]).trim()) parts.push(String(m[k]));
      }
    }
    if (!skipEnrichedPatterns && Array.isArray(m.possibleErrorPatterns)) {
      for (const p of m.possibleErrorPatterns) {
        const s = String(p || "").trim();
        if (s) parts.push(s);
      }
    }
    if (!skipEnrichedPatterns && Array.isArray(m.taxonomyIds)) {
      for (const id of m.taxonomyIds) parts.push(String(id));
    }
  }

  if (!skipEnrichedPatterns && Array.isArray(e.possibleErrorPatterns)) {
    for (const p of e.possibleErrorPatterns) parts.push(String(p));
  }
  if (Array.isArray(e.expectedErrorTags)) {
    for (const p of e.expectedErrorTags) parts.push(String(p));
  }

  const params = e.params;
  if (params && typeof params === "object" && !Array.isArray(params)) {
    const p = /** @type {Record<string, unknown>} */ (params);
    for (const k of [
      "kind",
      "subtype",
      "patternFamily",
      "operation",
      "conceptTag",
      "diagnosticSkillId",
      "semanticFamily",
      "direction",
    ]) {
      if (p[k] != null && String(p[k]).trim()) parts.push(String(p[k]));
    }
    try {
      parts.push(JSON.stringify(p).toLowerCase());
    } catch {
      /* ignore */
    }
  }

  return parts.join(" ").toLowerCase();
}

/**
 * @param {unknown} row
 * @returns {string}
 */
export function routingRowGradeLevelHaystack(row) {
  const parts = [];
  if (row && typeof row === "object") {
    const r = /** @type {Record<string, unknown>} */ (row);
    for (const k of ["levelKey", "gradeKey", "contentGradeKey"]) {
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
export function countRoutingIndicatorHits(hay, phrases) {
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
 * @param {{ excludeEnrichmentPatterns?: boolean }} [opts]
 * @returns {string}
 */
export function buildRoutingHaystack(wrongEvents, row, opts = {}) {
  const rowHay = routingRowGradeLevelHaystack(row);
  const list = Array.isArray(wrongEvents) ? wrongEvents : [];
  /** @type {string[]} */
  const chunks = [rowHay];
  for (const ev of list) {
    const h = routingHaystackForWrongEvent(ev, opts);
    if (h) chunks.push(h);
  }
  return chunks.join(" ").trim().toLowerCase();
}

/**
 * @param {unknown[]} wrongEvents
 * @returns {string[]}
 */
export function collectPossibleErrorPatterns(wrongEvents) {
  /** @type {string[]} */
  const out = [];
  for (const ev of Array.isArray(wrongEvents) ? wrongEvents : []) {
    if (!ev || typeof ev !== "object") continue;
    const e = /** @type {Record<string, unknown>} */ (ev);
    const sources = [
      e.possibleErrorPatterns,
      e.metadata && typeof e.metadata === "object"
        ? /** @type {Record<string, unknown>} */ (e.metadata).possibleErrorPatterns
        : null,
      e.expectedErrorTags,
    ];
    for (const src of sources) {
      if (!Array.isArray(src)) continue;
      for (const p of src) {
        const s = String(p || "").trim();
        if (s) out.push(s);
      }
    }
  }
  return out;
}
