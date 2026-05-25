/**
 * Parent report — forbidden substrings in parent-facing Hebrew (screen/PDF).
 * Used by selftest; can be imported by future snapshot guards.
 */

/** Lowercase ASCII fragments that must not appear in parent-facing lines */
/** מחרוזות שאסור שיופיעו בטקסט הורה גלוי (עברית/מעורב) — בדיקת readability */
export const PARENT_READABILITY_LEAK_SUBSTRINGS = [
  "מאסטרי",
  "טקסונומיה",
  "responsems",
  "מעקב שוטף",
  "מעקב זהיר",
  "מעקב צמוד",
  "מעקב בלבד",
  "אות חלש",
  "דל נתון",
  "חיכוך הוראה",
  "מצב שערים",
  "מיקוד סבב",
  "רגרסיה",
  "אוטומטיות",
  "שלב ראשון של רכישה",
  "חוזקה עקבית",
  "איכות הנתון",
  "נפח תרגול",
  "מגמה אחרונה עדינה",
  "זיהוי ראשוני",
  "מעקב קל",
  "מעקב רגיל",
  "מעקב קצר",
  "נקודה צרה",
  "צריך אות טרי",
  "נדרש מעקב",
  "המשך מעקב",
  "שימור ומעקב",
  "איסוף תרגול ומעקב",
  "אינדיקציה לרגרסיה",
  "אות מקצועי",
  "אותות חוסר",
  "מומלץ מעקב",
  "מעקב נוסף",
  "במעקב בלבד",
  "איסוף אות",
  "אינדיקציה חזקה",
  "נדרש בירור",
  "נדרש הקשר",
  "נדרש מיקוד",
  "נדרש בסיס",
  "דלות נתונים",
  "ראיות השורה",
  "אותות מוקדמים",
  "אות עצמאות",
  "אינדיקציה ראשונית",
  "דורשים חיזוק או המשך מעקב",
  "מעקב שגרתי",
  "המשך מעקב רגיל",
  "מעקב מדוד",
  "מעקב קצר אחרי כל מפגש",
  /* Plain-language guardrails — old diagnostic labels must not leak back */
  "חוזקה יחסית",
  "חוזקה בולטת",
  "מיקוד אבחוני",
  "דפוס אבחוני",
  "דפוס קושי דומיננטי",
  "דפוס התנהגות נפוץ בשטח",
  "רמת ודאות",
  "בסיס הנתונים",
  "בטחון בנתונים",
  "ביטחון בנתונים",
  "מקום לשיפור ממוקד",
  "המסקנה המקצועית",
  "כיוון המקצועי",
  "מוקד חירום",
  "סולם עדיפות",
  "עדיפות יסוד",
  "מוכנות להעברה",
  "קושי יסודי",
  "קפיצה לרמה גבוהה",
  "נקודות לשימת לב",
  /* Engine-internal M-10 taxonomy — must not leak to parents */
  "בחירת כפל לא מתאים לחילוק",
];

export const FORBIDDEN_PARENT_REPORT_SUBSTRINGS = [
  "insufficient_data",
  "early_signal_only",
  "contradictory",
  "probe",
  "fallback",
  "legacy",
  "diagnosticenginev2",
  "pattern_diagnostics",
  "p4)",
  "(p4",
  " p4",
  "p3)",
  "(p3",
  " p3",
  "p2)",
  "(p2",
  " p2",
  "p1)",
  "(p1",
  " p1",
];

/**
 * @param {string} s
 * @returns {string[]} list of matched forbidden fragments (lowercase scan)
 */
export function findForbiddenSubstringsInString(s) {
  const t = String(s || "").toLowerCase();
  const hits = [];
  for (const frag of FORBIDDEN_PARENT_REPORT_SUBSTRINGS) {
    if (t.includes(frag)) hits.push(frag);
  }
  return hits;
}

/**
 * @param {string} s
 * @returns {string[]}
 */
export function findReadabilityLeakSubstringsInString(s) {
  const t = String(s || "").toLowerCase();
  const hits = [];
  for (const frag of PARENT_READABILITY_LEAK_SUBSTRINGS) {
    if (t.includes(frag)) hits.push(frag);
  }
  return hits;
}

/**
 * Depth-first scan of string values in a plain object/array tree.
 * @param {unknown} value
 * @param {(path: string, hits: string[]) => void} onHits
 * @param {string} [path]
 */
export function scanValueForForbidden(value, onHits, path = "$") {
  if (value == null) return;
  if (typeof value === "string") {
    const hits = findForbiddenSubstringsInString(value);
    if (hits.length) onHits(path, hits);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanValueForForbidden(v, onHits, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object") {
    for (const k of Object.keys(value)) {
      scanValueForForbidden(/** @type {any} */ (value)[k], onHits, `${path}.${k}`);
    }
  }
}
