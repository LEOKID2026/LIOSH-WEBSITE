/**
 * Parent report surface — dedupe and cap visible lines/phrases.
 */

/** Phrases that may appear at most once per report surface. */
export const PARENT_SURFACE_ONCE_PHRASES = Object.freeze([
  "הכיוון חיובי יחסית",
  "נשארים עם חיזוק קצר וברור",
  "לפני שקובעים שהנושא יציב",
  "חיזוק ממוקד לפני קידום",
  "חיזוק ממוקד לפי הדוח",
  "לפני שקובעים כיוון",
  "עדיין מוקדם לקבוע",
]);

function norm(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown[]} lines
 * @param {{ max?: number, keep?: string[], oncePhrases?: string[] }} [options]
 */
export function capAndDedupeParentSurfaceLines(lines, options = {}) {
  const max = Math.max(0, Number(options.max) || 999);
  const keep = Array.isArray(options.keep) ? options.keep : [];
  const oncePhrases = Array.isArray(options.oncePhrases)
    ? options.oncePhrases
    : [...PARENT_SURFACE_ONCE_PHRASES];

  const out = [];
  const seenLines = new Set(keep.map(norm).filter(Boolean));
  const seenPhrases = new Set();

  for (const line of Array.isArray(lines) ? lines : []) {
    if (out.length >= max) break;
    const raw = String(line || "").trim();
    if (!raw) continue;
    const n = norm(raw);
    if (!n || seenLines.has(n)) continue;

    let blockedByPhrase = false;
    for (const phrase of oncePhrases) {
      const p = norm(phrase);
      if (!p || !n.includes(p)) continue;
      if (seenPhrases.has(p)) {
        blockedByPhrase = true;
        break;
      }
      seenPhrases.add(p);
    }
    if (blockedByPhrase) continue;

    seenLines.add(n);
    out.push(raw);
  }
  return out;
}

/**
 * Remove boilerplate phrases that already appeared in an earlier snapshot this report.
 * @param {unknown} text
 * @param {Set<string>} seenPhraseKeys — normalized phrase keys already used
 */
export function scrubRepeatedBoilerplateFromSnapshotHe(text, seenPhraseKeys) {
  let t = String(text || "").trim();
  if (!t || !seenPhraseKeys) return t;
  for (const phrase of PARENT_SURFACE_ONCE_PHRASES) {
    const p = norm(phrase);
    if (!p || !norm(t).includes(p)) continue;
    if (seenPhraseKeys.has(p)) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      t = t.replace(new RegExp(escaped, "g"), "");
      t = t.replace(/[;,\s]+/g, " ").replace(/\s{2,}/g, " ").trim();
    } else {
      seenPhraseKeys.add(p);
    }
  }
  return t.replace(/^[\s;,.-]+|[\s;,.-]+$/g, "").trim();
}

/**
 * @param {string} text
 * @param {Set<string>} seenPhraseKeys
 */
export function parentSurfacePhraseAlreadyUsed(text, seenPhraseKeys) {
  const n = norm(text);
  if (!n) return false;
  for (const phrase of PARENT_SURFACE_ONCE_PHRASES) {
    const p = norm(phrase);
    if (p && n.includes(p) && seenPhraseKeys.has(p)) return true;
  }
  return false;
}
