/**
 * Evidence source provenance - single source for "where did this practice evidence come from".
 *
 * Phase C: the report / diagnostic engine / Copilot must distinguish between evidence
 * produced by the child's own self-practice vs. an activity a parent assigned vs. book practice.
 * This is provenance metadata only — it never changes scores, accuracy, or grade relation.
 */

export const EVIDENCE_SOURCE = Object.freeze({
  SELF_PRACTICE: "self_practice",
  PARENT_ASSIGNED: "parent_assigned_activity",
  PRIVATE_TEACHER_ASSIGNED: "private_teacher_assigned_activity",
  LEARNING_BOOK: "learning_book",
  CLASSROOM_ASSIGNED: "classroom_assigned_activity",
  UNKNOWN: "unknown",
});

const KNOWN_SOURCES = new Set(Object.values(EVIDENCE_SOURCE));

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeEvidenceSourceKey(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (KNOWN_SOURCES.has(raw)) return raw;
  // tolerate a few legacy/alias spellings
  if (raw === "self" || raw === "free_practice" || raw === "self_practice_activity") {
    return EVIDENCE_SOURCE.SELF_PRACTICE;
  }
  if (raw === "parent" || raw === "parent_activity" || raw === "parent_assigned") {
    return EVIDENCE_SOURCE.PARENT_ASSIGNED;
  }
  if (
    raw === "private_teacher" ||
    raw === "private_teacher_assigned" ||
    raw === "teacher_assigned" ||
    raw === "assigned_individual"
  ) {
    return EVIDENCE_SOURCE.PRIVATE_TEACHER_ASSIGNED;
  }
  if (raw === "book" || raw === "book_practice") return EVIDENCE_SOURCE.LEARNING_BOOK;
  if (raw === "classroom" || raw === "classroom_activity") {
    return EVIDENCE_SOURCE.CLASSROOM_ASSIGNED;
  }
  return null;
}

/**
 * @param {Record<string, number>|null|undefined} counts
 * @param {unknown} sourceKey
 * @param {number} [n]
 * @returns {Record<string, number>}
 */
export function bumpEvidenceSourceCount(counts, sourceKey, n = 1) {
  const target =
    counts && typeof counts === "object" && !Array.isArray(counts) ? counts : {};
  const key = normalizeEvidenceSourceKey(sourceKey);
  if (!key) return target;
  target[key] = (Number(target[key]) || 0) + (Number(n) || 0);
  return target;
}

/**
 * @param {Record<string, number>|null|undefined} target
 * @param {Record<string, number>|null|undefined} source
 * @returns {Record<string, number>}
 */
export function mergeEvidenceSourceCounts(target, source) {
  const out =
    target && typeof target === "object" && !Array.isArray(target) ? target : {};
  if (!source || typeof source !== "object" || Array.isArray(source)) return out;
  for (const [rawKey, rawVal] of Object.entries(source)) {
    const key = normalizeEvidenceSourceKey(rawKey);
    if (!key) continue;
    const val = Number(rawVal) || 0;
    if (val <= 0) continue;
    out[key] = (Number(out[key]) || 0) + val;
  }
  return out;
}

/**
 * @param {Record<string, number>|null|undefined} counts
 * @returns {{ evidenceSourceCounts: Record<string, number>, evidenceSources: string[], primaryEvidenceSource: string|null }}
 */
export function summarizeEvidenceSources(counts) {
  const clean = {};
  if (counts && typeof counts === "object" && !Array.isArray(counts)) {
    for (const [rawKey, rawVal] of Object.entries(counts)) {
      const key = normalizeEvidenceSourceKey(rawKey);
      const val = Number(rawVal) || 0;
      if (!key || val <= 0) continue;
      clean[key] = (Number(clean[key]) || 0) + val;
    }
  }
  const sorted = Object.entries(clean).sort((a, b) => b[1] - a[1]);
  return {
    evidenceSourceCounts: clean,
    evidenceSources: sorted.map(([key]) => key),
    primaryEvidenceSource: sorted.length > 0 ? sorted[0][0] : null,
  };
}

export default {
  EVIDENCE_SOURCE,
  normalizeEvidenceSourceKey,
  bumpEvidenceSourceCount,
  mergeEvidenceSourceCounts,
  summarizeEvidenceSources,
};
