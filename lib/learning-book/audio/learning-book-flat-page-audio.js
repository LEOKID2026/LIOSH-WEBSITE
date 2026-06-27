/**
 * Flat page-number audio for learning books (hebrew/english G1–G2).
 * Maps sequential book page N → `{subject}_{grade}_page_{NNN}.mp3`.
 */

/**
 * @param {string} subject
 * @param {string} grade
 * @param {number} pageNumber 1-based sequential page across the whole book
 * @returns {string}
 */
export function defaultLearningBookFlatPageAudioPublicPath(subject, grade, pageNumber) {
  const s = String(subject || "").trim().toLowerCase();
  const g = String(grade || "").trim().toLowerCase();
  const n = String(pageNumber).padStart(3, "0");
  return `/audio/learning-books/${s}-${g}/${s}_${g}_page_${n}.mp3`;
}

/**
 * @param {readonly string[]} pageIds
 * @param {number} sectionsPerPage
 * @returns {Map<string, number>} key `${pageId}:${sectionNumber}` → global page number
 */
export function buildFlatPageAudioLookup(pageIds, sectionsPerPage = 7) {
  /** @type {Map<string, number>} */
  const lookup = new Map();
  let pageNumber = 0;

  for (const pageId of pageIds) {
    for (let sectionNumber = 1; sectionNumber <= sectionsPerPage; sectionNumber += 1) {
      pageNumber += 1;
      lookup.set(`${pageId}:${sectionNumber}`, pageNumber);
    }
  }

  return lookup;
}

/**
 * @param {Map<string, number>} lookup
 * @param {string} pageId
 * @param {number} sectionNumber
 * @returns {number|null}
 */
export function resolveFlatPageNumber(lookup, pageId, sectionNumber) {
  const key = `${String(pageId || "").trim()}:${Number(sectionNumber)}`;
  const n = lookup.get(key);
  return Number.isFinite(n) && n > 0 ? n : null;
}
