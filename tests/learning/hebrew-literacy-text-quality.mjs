/**
 * Shared Hebrew literacy text-quality scan (G3–G6 pools).
 */

/** @param {string} text */
export function scanHebrewTextQuality(text) {
  const hits = [];
  const s = String(text || "");
  if (/\S\/\S/.test(s) && /\/ה\b|\/ה'|עשה\/|שמר\/|בדק\/|שבר\/|מכר\/|שכח\//.test(s)) {
    hits.push("gender-slash form");
  }
  if (/סימון\s/.test(s)) hits.push("סימון tag");
  if (/שאלה\s+\d+\s*:/.test(s)) hits.push("numbered stem prefix");
  if (/\([א-ת]{1,6}\)/.test(s) && /\(סימון|\([א-ת]{1,3}\)/.test(s)) {
    hits.push("odd parenthetical label");
  }
  if (/\b[a-z]{3,}\b/i.test(s)) hits.push("latin token");
  return hits;
}

/** @param {object[]} rows @param {string} label */
export function assertNoTextQualityBlockers(rows, label) {
  const failures = [];
  for (const row of rows) {
    const hits = scanHebrewTextQuality(row.question);
    for (const opt of row.answers || []) {
      hits.push(...scanHebrewTextQuality(String(opt)));
    }
    if (hits.length) {
      failures.push(`${label}: ${row.question?.slice(0, 60)} → ${[...new Set(hits)].join(", ")}`);
    }
  }
  return failures;
}
