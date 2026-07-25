/**
 * Parent-safe pattern labels - never expose raw engine ids or "unknown" to parents.
 */

import { TAXONOMY_BY_ID } from "../diagnostic-engine-v2/taxonomy-registry.js";
import { RULE_PRIMARY_PRODUCER } from "../../lib/learning/taxonomy-rule-primary-producers.js";
import {
  isTechnicalEnglishPatternKey,
  parentFacingErrorPatternLabelHe,
  resolveParentFacingPatternLabelHe,
} from "./parent-facing-error-pattern-he.js";

const BLOCKED_LABELS = new Set([
  "unknown",
  "unspecified",
  "unclassified",
  "none",
  "null",
  "undefined",
]);

/** Parent-facing Hebrew for taxonomy patternHe values that must not leak English literals. */
const TAXONOMY_PARENT_PATTERN_BY_ID = Object.freeze({
  "E-02": "בלבול בין זמן עבר לזמן הווה באנגלית",
  "E-04": "חוסר התאמה בין כינוי הגוף לצורת הפועל",
});

/** @type {Record<string, string>} literal patternHe / tag → parent Hebrew */
const RAW_PATTERN_LITERAL_PARENT_HE = Object.freeze({
  "past/present": TAXONOMY_PARENT_PATTERN_BY_ID["E-02"],
  "he/she/it": TAXONOMY_PARENT_PATTERN_BY_ID["E-04"],
});

/** Legacy patternHe (pre parent-copy fix) → approved parent Hebrew. Unambiguous strings only. */
const LEGACY_PATTERN_HE_TO_PARENT_HE = Object.freeze({
  "טעויות בהמרת ייצוג": "קושי בפירוק מספרים ובהבנת ערך המקום",
  "שגיאה בעמודת עשרות": "קושי בנשיאה בחיבור",
  "אותם זוגות שגויים": "טעויות חוזרות בעובדות כפל",
  "השוואה לפי מונה בלבד": "השוואת שברים לפי המונה בלבד",
  "טעות באותה שלב": "ביצוע שגוי של שלב בפעולה בשברים",
  "טעות כיוון עיגול": "עיגול לכיוון הלא נכון",
  "מספר נכון + יחידה שגויה": "בחירת יחידת מידה לא מתאימה",
  "כישלון רק באיחוד": "קושי בחיבור בין שלבי הפתרון",
  "כיוון הפוך / הוספה במקום חיסור": "חיבור במקום חיסור או היפוך כיוון הפעולה",
  "בחירת כפל לא מתאים לחילוק": "בחירת כפל במקום חילוק",
  "בחירת יחס שגוי בין אותם מספרים": "בחירת סימן השוואה לא נכון",
  "פעולה שגויה בהמרת קנה מידה": "בחירת פעולה לא נכונה בקנה מידה",
  "החלפת פעולת החילוק בכפל על אותם אופרנדים": "כפל במקום חילוק",
  "מנה או שארית שאינן מקיימות את זהות החילוק": "מנה או שארית שאינן מתאימות לתרגיל החילוק",
  "הזזת הנקודה העשרונית מקום אחד לאחר הפעולה": "הזזת הנקודה העשרונית למקום שגוי",
  "יישום לא עקבי של כלל הרצף": "יישום לא עקבי של חוקיות הסדרה",
  "היפוך או שינוי לא שקול של סדר היחס": "היפוך סדר היחס או שינוי היחס",
  "אי שימוש בפעולה הפוכה לשמירת השוויון": "שימוש לא נכון בפעולה הפוכה במשוואה",
  "חישוב לפי סדר כתיבה במקום קדימות פעולות": "חישוב לפי סדר הכתיבה במקום לפי סדר הפעולות",
  "היפוך מסקנת ההתחלקות לאחר בדיקת הכלל": "מסקנה שגויה לאחר בדיקת כלל התחלקות",
  "החלפת הסיווג ראשוני ופריק": "בלבול בין מספר ראשוני למספר פריק",
  "חישוב בסיס כפול מעריך במקום חזקה": "כפל הבסיס במעריך במקום חישוב חזקה",
  "יישום שגוי של איבר ניטרלי או מאפס": "שימוש לא נכון בתכונות של 0 או 1",
  "החלפת אומדן בתוצאה מדויקת או עיגול לא מתאים": "בלבול בין אומדן לתוצאה מדויקת",
  "הנחה שהמספר הקטן הוא תמיד המחלק המשותף הגדול ביותר": "בחירה שגויה של המחלק המשותף הגדול ביותר",
  "בלבול תכונות": "בלבול בין תכונות של צורות",
  "טעות בטווח זווית": "קריאה לא נכונה של זווית במד זווית",
  "צלעות כגובה": "בחירת צלע שאינה גובה",
  "סיבוב הפוך": "סיבוב בכיוון הלא נכון",
  "שוכח עומק": "התעלמות מממד העומק",
  "טעות יחידה חוזרת": "שימוש לא נכון ביחידת מידה בהיקף",
  "ציר שגוי חוזר": "בחירת ציר סימטריה לא נכון",
  "שוכח ÷2 או גובה שגוי": "אי חלוקה ב-2 או בחירת גובה לא מתאים בשטח משולש",
  "חיבור אורכים או בחירת פעולה במקום יחס הריבועים": "חיבור אורכי צלעות במקום שימוש במשפט פיתגורס",
  "מילה קרובה לא נכונה": "בחירת מילה דומה שאינה מתאימה להקשר",
  "כינוי/שם עצם שגוי": "חוסר התאמה במין או במספר במשפט",
  "אותה משפחה שגויה": "שגיאת כתיב חוזרת באותה משפחת מילים",
  "טעות כשעובדה לא בסדר קריאה": "קושי באיתור מידע מפורש בטקסט",
  "טעות רק בהומופון": "בחירת מילה שנשמעת דומה אך אינה מתאימה להקשר",
  "סדר מילים שגוי": "סדר מילים לא תקין במשפט",
  "משפטים לא מחוברים": "קושי ביצירת רצף בין משפטים",
  "רגיסטר שגוי חוזר": "שימוש במשלב שאינו מתאים להקשר",
  "תרגום מילולי שגוי": "תרגום מילולי שאינו מתאים להקשר",
  "טעות בדועמודי": "דילוג או מעבר שגוי בין שורות בטקסט",
  "אותה יחס שגויה": "בחירת מילת יחס לא מתאימה",
  "עובדה במקום הסקה": "בחירת מידע מפורש במקום הסקת מסקנה",
  "שגיאות חוזרות": "שגיאת איות חוזרת",
  "בלבול צמד צלילים": "בלבול בין צלילים דומים",
  "בלבול קטגוריה": "מיון לפי קטגוריה לא מתאימה",
  "לשנות הכול": "שינוי של יותר ממשתנה אחד בניסוי",
  "סדר/מיקום שגוי": "סדר או מיקום לא נכון במערכת",
  "נעלם בלי שימור": "קושי בהבנת שימור החומר",
  "בלבול יחידות": "בלבול בין יחידות מידה",
  "טעות בערך מגרף": "קריאה לא נכונה של ערך מתוך גרף",
  "רמה שגויה חוזרת": "בלבול בין רמות במערכת אקולוגית",
  "מרחקים יחסיים שגויים": "חישוב או פירוש לא נכון של מרחק לפי קנה מידה",
  "בלבול כשהמפה מוטה": "בלבול בכיוונים כאשר המפה מסובבת",
  "מיון שגוי חוזר": "בלבול בין זכות לחובה",
  "סדר הפוך": "סידור אירועים בסדר הפוך",
  "אזור שגוי חוזר": "שיוך אזור לאקלים לא מתאים",
  "סימול שגוי חוזר": "פירוש לא נכון של סימן במפה",
  "בלבול מושגי": "בלבול בין מושגים היסטוריים",
  "סדר אירועים שגוי": "סידור אירועים בסדר זמן שגוי",
  "השוואה חלקית שגויה": "השוואה חלקית או לא מדויקת בין אירועים",
  "בלבול מוסדות": "בלבול בין מוסדות לבין תפקידיהם",
  "בלבול השפעה": "בלבול בהשפעה של אירוע או תרבות",
  "קשר שגוי חוזר": "קישור לא נכון בין אירוע בעבר למצב בהווה",
});

/**
 * Ambiguous legacy labels — remap only when taxonomy ID or subject is known.
 * Never remap by bare text alone.
 * @type {Record<string, { byId: Record<string, string>, bySubject: Record<string, string> }>}
 */
const AMBIGUOUS_LEGACY_PATTERN_HE = Object.freeze({
  "טענה לא מבוססת": Object.freeze({
    byId: Object.freeze({
      "S-08": "טענה שאינה נתמכת בראיה",
      "HI-08": "טענה שאינה נתמכת במקור ההיסטורי",
    }),
    bySubject: Object.freeze({
      science: "טענה שאינה נתמכת בראיה",
      history: "טענה שאינה נתמכת במקור ההיסטורי",
    }),
  }),
  "סיבה שגויה חוזרת": Object.freeze({
    byId: Object.freeze({
      "MG-06": "בחירת סיבה שאינה מתאימה לתוצאה",
      "HI-03": "בחירת סיבה שאינה מתאימה לתוצאה ההיסטורית",
    }),
    bySubject: Object.freeze({
      moledet: "בחירת סיבה שאינה מתאימה לתוצאה",
      geography: "בחירת סיבה שאינה מתאימה לתוצאה",
      history: "בחירת סיבה שאינה מתאימה לתוצאה ההיסטורית",
    }),
  }),
  "בלבול תפקידים": Object.freeze({
    byId: Object.freeze({
      "MG-07": "בלבול בין תפקידי מוסדות",
      "HI-05": "בלבול בין דמויות לבין תפקידיהן",
    }),
    bySubject: Object.freeze({
      moledet: "בלבול בין תפקידי מוסדות",
      geography: "בלבול בין תפקידי מוסדות",
      history: "בלבול בין דמויות לבין תפקידיהן",
    }),
  }),
});

/**
 * @param {string} raw
 * @param {{ taxonomyId?: string|null, subjectId?: string|null }} [ctx]
 * @returns {string|null}
 */
function resolveAmbiguousLegacyPatternHe(raw, ctx = {}) {
  const entry = AMBIGUOUS_LEGACY_PATTERN_HE[raw];
  if (!entry) return null;
  const id = String(ctx.taxonomyId || "").trim();
  if (id && entry.byId[id]) return entry.byId[id];
  const subject = String(ctx.subjectId || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (subject && entry.bySubject[subject]) return entry.bySubject[subject];
  return null;
}

/** @type {Map<string, string>} tag -> taxonomyId */
const TAG_TO_TAXONOMY_ID = (() => {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const [taxonomyId, producer] of Object.entries(RULE_PRIMARY_PRODUCER)) {
    const tag = String(producer?.tag || "").trim().toLowerCase();
    if (tag) map.set(tag, taxonomyId);
  }
  return map;
})();

/**
 * Labels that must never drive parent-facing repeated-pattern wording.
 * @param {string|null|undefined} label
 */
export function isBlockedParentPatternLabel(label) {
  const raw = String(label || "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (BLOCKED_LABELS.has(lower)) return true;
  if (/^\(unknown\)$/i.test(raw)) return true;
  return false;
}

/**
 * @param {string|null|undefined} label
 * @param {{ taxonomyId?: string|null, subjectId?: string|null }} [ctx]
 */
export function isUsableParentPatternLabel(label, ctx = {}) {
  const resolved = resolveParentPatternLabelForDisplay(label, ctx);
  return !!resolved;
}

/**
 * Resolve any internal tag/key to approved Hebrew for parents.
 * Falls back to taxonomy patternHe when tag maps to a rule.
 * Ambiguous legacy Hebrew remaps only when taxonomyId or subjectId is provided.
 * @param {string|null|undefined} label
 * @param {{ taxonomyId?: string|null, subjectId?: string|null }} [ctx]
 * @returns {string}
 */
export function resolveParentPatternLabelForDisplay(label, ctx = {}) {
  const raw = String(label || "").trim();
  if (!raw || isBlockedParentPatternLabel(raw)) return "";

  if (/[\u0590-\u05FF]/.test(raw)) {
    const ambiguous = resolveAmbiguousLegacyPatternHe(raw, ctx);
    if (ambiguous) return ambiguous;
    const legacy = LEGACY_PATTERN_HE_TO_PARENT_HE[raw];
    if (legacy) return legacy;
    return raw.replace(/\s+/g, " ").trim();
  }

  const literalParent = RAW_PATTERN_LITERAL_PARENT_HE[raw.toLowerCase()];
  if (literalParent) return literalParent;

  const mapped = parentFacingErrorPatternLabelHe(raw);
  if (mapped) return mapped;

  const tagKey = raw.toLowerCase();
  const taxonomyId = String(ctx.taxonomyId || "").trim() || TAG_TO_TAXONOMY_ID.get(tagKey);
  if (taxonomyId && TAXONOMY_PARENT_PATTERN_BY_ID[taxonomyId]) {
    return TAXONOMY_PARENT_PATTERN_BY_ID[taxonomyId];
  }
  if (taxonomyId && TAXONOMY_BY_ID[taxonomyId]?.patternHe) {
    const patternHe = String(TAXONOMY_BY_ID[taxonomyId].patternHe).trim();
    const parentFromId = TAXONOMY_PARENT_PATTERN_BY_ID[taxonomyId];
    if (parentFromId) return parentFromId;
    if (/[\u0590-\u05FF]/.test(patternHe)) return patternHe;
    const fromLiteral = RAW_PATTERN_LITERAL_PARENT_HE[patternHe.toLowerCase()];
    if (fromLiteral) return fromLiteral;
  }

  if (isTechnicalEnglishPatternKey(raw)) return "";
  return raw;
}

/**
 * @param {string|null|undefined} label
 * @param {{ taxonomyId?: string|null, subjectId?: string|null }} [ctx]
 * @returns {string}
 */
export function sanitizeParentPatternLabel(label, ctx = {}) {
  return resolveParentPatternLabelForDisplay(label, ctx);
}

export { resolveParentFacingPatternLabelHe };
