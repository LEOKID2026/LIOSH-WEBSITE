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
  "שינוי עדין לאחרונה",
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
  "מה שרואים בנתונים",
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
  "מה שנראה מהתרגולים",
  "כיוון המקצועי",
  "מוקד חירום",
  "סולם עדיפות",
  "מה כדאי לחזק קודם",
  "מוכנות להעברה",
  "קושי בחלקים פשוטים יותר",
  "קפיצה לרמה גבוהה",
  "נקודות לשימת לב",
  /* Engine-internal M-10 taxonomy — must not leak to parents */
  "בחירת כפל לא מתאים לחילוק",
  /* Parent copy guard — diagnostic-engine jargon in default-visible report text */
  "אין שאלות בטווח",
  "בטווח זה - אין שאלות",
  "לא תורגל בטווח",
  "מקצועות שלא נדגמו",
  "סף נפח",
  "נפח/דיוק",
  "מעבירים שלב",
  "מסקנה חיובית",
  "חוויה מהתרגול",
  "תרגולים שעלו לדוח",
  "אירועי טעות רלוונטיים",
  "מגמת דיוק",
  "התאמה צפי",
  "פער ידע",
  "לא סוגרים מסקנה",
  "מסקנה חזקה",
  "לא מסכמים",
  "לא מדרגים",
  "רצף תמיכה",
  "זיכרון תומך",
  "זיכרון המלצה",
  "תלות יסוד",
  "יסוד מול",
  "יסוד קודם",
  "מקומי בטוח",
  "מוכנות לשחרור",
  "שחרור זהיר",
  "תסמין משנה",
  "מסלול קודם",
  "ביטחון סטטיסטי",
  "מגמה אמינה",
  "שורות דוח",
  "מעט חומר בתקופה",
  "לעמיס",
  "חוויה מוצלחת",
  "מרתון ארוך",
  "שלב 7",
  "אגרסיבית",
  "חיכוך הוראה/רמזים",
  "ראיות לא מספקות",
  "ראיות חזקות",
  "נפח סביר",
  /* Duplicate phrase guard — patch typo must not recur */
  "בתקופה שנבחרה שנבחרה",
  "שנבחרה שנבחרה",
  /* parent_report_hebrew_copy_spec.md §9 */
  "פער יסוד",
  "קושי בבסיס",
  "חוסר בסיס",
  "חוסר הבנה בסיסית",
  "פער יסודי",
  "ירידה בכיתה",
  "drop_one_level",
  "drop level",
  "הצלחה שבירה",
  "נראה שיש קושי ב",
  "יש טעויות חוזרות ב",
  "שווה לחזור עליהן בקצב איטי",
  "כדאי לשים לב ל",
  "זה נושא שחוזר בתרגולים",
  "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף",
  "הדפוס הנראה בביצוע",
  "נשמרו גם שיקולי זהירות",
  "חלקים פשוטים יותר של הנושא",
  "לא נקבע",
  "רעש טבעי של למידה מוקדמת",
  "יש התקדמות יחסית ב",
  "נראה כמו מקצוע שהילד מצליח בו יותר כרגע",
  /* blocked taxonomy patternHe labels — must never reach parent display */
  "נושא זה",
  "past/present",
  "טעות בדועמודי",
  "לשנות הכול",
  "נעלם בלי שימור",
  "רמה שגויה חוזרת",
  "אותה משפחה שגויה",
  "כינוי/שם עצם שגוי",
  "טעות בתקופה שנבחרה זווית",
];

/** Adjacent duplicate word pairs that must not appear in parent-facing copy. */
export const PARENT_COPY_DUPLICATE_WORD_PAIRS = Object.freeze([
  "שנבחרה שנבחרה",
  "בתקופה שנבחרה שנבחרה",
]);

/** Forbidden fragments in parent-report Hebrew copy sources (denylist for copy guard). */
export const PARENT_COPY_FORBIDDEN_FRAGMENTS = Object.freeze([
  "אין שאלות בטווח",
  "בטווח זה - אין שאלות",
  "לא תורגל בטווח",
  "מקצועות שלא נדגמו",
  "סף נפח",
  "נפח/דיוק",
  "מעבירים שלב",
  "מסקנה חיובית",
  "חוויה מהתרגול",
  "תרגולים שעלו לדוח",
  "אירועי טעות רלוונטיים",
  "מגמת דיוק",
  "התאמה צפי",
  "פער ידע",
  "לא סוגרים מסקנה",
  "מסקנה חזקה",
  /* Awkward bare "בתקופה" / engineer empty-state wording */
  "שורות דוח בתקופה",
  "אין שורות דוח -",
  "בתרגול בתקופה שנבחרה",
  "מה שנאסף בתקופה",
  "בתקופה כדי לסכם",
  "נושא יחיד בתקופה",
  "הנתונים בתקופה עדיין",
  "עוד שאלות בתקופה,",
  "נרשמו בתקופה ",
  "לא מסכמים",
  "לא מדרגים",
  "רצף תמיכה",
  "זיכרון תומך",
  "זיכרון המלצה",
  "תלות יסוד",
  "יסוד מול",
  "יסוד קודם",
  "מקומי בטוח",
  "מוכנות לשחרור",
  "שחרור זהיר",
  "תסמין משנה",
  "מסלול קודם",
  "ביטחון סטטיסטי",
  "מגמה אמינה",
  "שורות דוח",
  "מעט חומר בתקופה",
  "לעמיס",
  "חוויה מוצלחת",
  "מרתון ארוך",
  "שלב 7",
  "אגרסיבית",
  "חיכוך הוראה/רמזים",
  "ראיות לא מספקות",
  "ראיות חזקות",
  "נפח סביר",
  /* Duplicate phrase guard — patch typo must not recur */
  "בתקופה שנבחרה שנבחרה",
  "שנבחרה שנבחרה",
  /* explicit parent-facing forbidden terms — owner spec */
  "חולשה ברורה",
  "מוכן להתקדם",
  "דפוס לימודי פעיל",
  "ביצועים גבוהים",
  "subskill",
  "oracle",
  /* parent_report_hebrew_copy_spec.md §9 */
  "פער יסוד",
  "קושי בבסיס",
  "חוסר בסיס",
  "חוסר הבנה בסיסית",
  "פער יסודי",
  "ירידה בכיתה",
  "הצלחה שבירה",
  "נראה שיש קושי ב",
  "יש טעויות חוזרות ב",
  "שווה לחזור עליהן בקצב איטי",
  "כדאי לשים לב ל",
  "זה נושא שחוזר בתרגולים",
  "הביצועים הכלליים בתקופה מצביעים על צורך בחיזוק נוסף",
  "הדפוס הנראה בביצוע",
  "נשמרו גם שיקולי זהירות",
  "חלקים פשוטים יותר של הנושא",
  "לא נקבע",
  "רעש טבעי של למידה מוקדמת",
  "יש התקדמות יחסית ב",
  "נראה כמו מקצוע שהילד מצליח בו יותר כרגע",
  "אין מספיק מידע",
  "אין עדיין מספיק מידע",
  "יש כמה סוגי טעויות",
  "בלבול מושגי",
  "נקודת ידע לא יציבה",
  "clear_topic_gap",
  "partial_stable",
  "mastery_stable",
  "engineDecision",
  "safeSubskill",
  /* blocked taxonomy patternHe labels */
  "נושא זה",
  "past/present",
  "טעות בדועמודי",
  "לשנות הכול",
  "נעלם בלי שימור",
  "רמה שגויה חוזרת",
  "אותה משפחה שגויה",
  "כינוי/שם עצם שגוי",
  "טעות בתקופה שנבחרה זווית",
]);

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
 * @returns {string[]}
 */
export function findParentCopyForbiddenFragmentsInString(s) {
  const t = String(s || "");
  const hits = [];
  for (const frag of PARENT_COPY_FORBIDDEN_FRAGMENTS) {
    if (t.includes(frag)) hits.push(frag);
  }
  return hits;
}

/**
 * @param {string} s
 * @returns {string[]}
 */
export function findDuplicateWordPairsInString(s) {
  const t = String(s || "");
  const hits = [];
  for (const pair of PARENT_COPY_DUPLICATE_WORD_PAIRS) {
    if (t.includes(pair)) hits.push(pair);
  }
  return hits;
}

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
