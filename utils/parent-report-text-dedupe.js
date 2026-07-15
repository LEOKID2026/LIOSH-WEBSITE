/**
 * Parent report — generic display-only text dedupe helpers (Wave 2 Fix).
 *
 * Used to avoid showing the parent the same idea twice across different
 * report blocks (short report / detailed report / summary report).
 *
 * Display-only: never mutates payloads, never touches engine/API output.
 */

/**
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeParentReportTextForDedupe(text) {
  return String(text ?? "")
    .trim()
    .replace(/[\u0591-\u05C7]/g, "") // strip Hebrew niqqud if present
    .replace(/[""״]/g, '"')
    .replace(/['׳]/g, "'")
    .replace(/[.,;:!?()־–"'׃-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function isDuplicateParentReportText(a, b) {
  const na = normalizeParentReportTextForDedupe(a);
  const nb = normalizeParentReportTextForDedupe(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const MIN_CONTAINMENT_LEN = 35;
  if (na.length >= MIN_CONTAINMENT_LEN && nb.includes(na)) return true;
  if (nb.length >= MIN_CONTAINMENT_LEN && na.includes(nb)) return true;
  return false;
}

/**
 * Filter `candidates` to drop any entry that duplicates something already in `existing`.
 * @param {unknown[]} candidates
 * @param {unknown[]} existing
 * @returns {string[]}
 */
export function filterOutParentReportDuplicates(candidates, existing) {
  const existingList = (Array.isArray(existing) ? existing : [existing]).filter(Boolean);
  const out = [];
  for (const c of Array.isArray(candidates) ? candidates : [candidates]) {
    const t = String(c || "").trim();
    if (!t) continue;
    const isDup = existingList.some((e) => isDuplicateParentReportText(t, e));
    if (!isDup) out.push(t);
  }
  return out;
}
