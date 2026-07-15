/**
 * שאלות כתיב עם מילת יעד במרכאות — ניקוד בתוך המרכאות מוסר בתצוגה,
 * ובהשוואת תשובות נשמר (כדי שבית ≠ בֵּית).
 */

const HEBREW_NIQQUD_RE = /[\u0591-\u05C7]/g;

/**
 * זיהוי שאלת כתיב עם ציטוט המילה (לא „מה חלק הדיבר”, משמעות, וכו׳).
 */
export function isSpellingTargetWordInQuotesContextFromStem(stem) {
  const s = String(stem || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return false;
  const hasQuotedWord =
    /['׳][^'׳]{1,48}['׳]/.test(s) || /\u2018[^\u2019]{1,48}\u2019/.test(s);
  if (!hasQuotedWord) return false;
  if (/חלק\s+הדיבר|מה\s+המשמעות|מה\s+ההפך|איזה\s+משפט\s+נכון/i.test(s))
    return false;
  return (
    /איך\s+כותבים/i.test(s) ||
    /כותבים\s+נכון/i.test(s) ||
    /זיהוי\s+כתיב/i.test(s) ||
    /איזו\s+כתיב/i.test(s) ||
    /כתיב\s+מלאה/i.test(s) ||
    /כתיב\s+מדויקת/i.test(s)
  );
}

export function spellingStemForNiqqudDetect(q) {
  if (!q || typeof q !== "object") return "";
  return [q.exerciseText, q.question, q.questionLabel]
    .filter(Boolean)
    .join(" ");
}

/** מסיר ניקוד רק בתוך מקטעי מרכאות ישרות או עגולות. */
export function stripNiqqudInsideQuotedHebrewWordSpans(text) {
  return String(text ?? "")
    .replace(/'([^']{1,48})'/g, (_, inner) => {
      return "'" + String(inner).replace(HEBREW_NIQQUD_RE, "") + "'";
    })
    .replace(/\u2018([^\u2019]{1,48})\u2019/g, (_, inner) => {
      return "\u2018" + String(inner).replace(HEBREW_NIQQUD_RE, "") + "\u2019";
    });
}

const SURROUNDING_PUNCT_RE =
  /^[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+|[\s"'`׳״“”‘’.,!?;:()[\]{}\-–-]+$/g;

/** השוואת תשובה כשהניקוד משמעותי — בלי להסיר סימני ניקוד עבריים. */
export function normalizeAnswerForSpellingNiqqudStrict(value) {
  return String(value ?? "")
    .replace(/[""״]/g, '"')
    .replace(/[''׳]/g, "'")
    .replace(SURROUNDING_PUNCT_RE, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
