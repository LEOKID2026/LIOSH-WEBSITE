/**
 * קשירת הקראה סטטית לתוכן שאלה (first-pass) — hash דטרמיניסטי על טקסט מלא.
 * משותף לקליינט (attach) ולשרת (api/hebrew-audio-ensure).
 */

import { sha256 } from "js-sha256";

/** @param {string} s @param {number} max */
function clip(s, max) {
  const t = String(s || "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trim();
}

/**
 * נורמליזציה זהה בקליינט ובשרת לפני hash.
 * @param {string} plaintext
 */
export function normalizeNarrationForHash(plaintext) {
  return String(plaintext || "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 16 תווים hex — מפתח קובץ/זרם (ensure + /api/hebrew-audio-stream).
 * @param {string} plaintext
 */
export function narrationContentHash16(plaintext) {
  return sha256(normalizeNarrationForHash(plaintext)).slice(0, 16);
}

/**
 * טקסט מלא להקראה: שם תחום + הנחיה + תוכן השאלה + אפשרויות + סיום - ללא prefix של כיתה (למשל "כיתה א׳").
 * `gradeKey` נשאר לתאימות קוראים ואינו נכנס לטקסט.
 * @param {{
 *   gradeKey: string,
 *   topic: string,
 *   task_mode: string,
 *   qText: string,
 *   answers?: string[],
 * }} p
 */
export function buildFirstPassNarrationPlaintext(p) {
  const body = clip(p.qText, 1500);
  const ansLine = Array.isArray(p.answers)
    ? clip(
        p.answers
          .map((a) => String(a).trim())
          .filter(Boolean)
          .join(" · "),
        500
      )
    : "";
  const topicLabel = p.topic === "reading" ? "קריאה" : "הבנת הנקרא";
  const ansPart = ansLine ? ` האפשרויות: ${ansLine}.` : "";
  /** פתיח אחרי שם התחום — הנחיה מלאה; לא כולל ציון כיתה */
  const afterTopic = "האזינו לשאלה וענו לפי מה ששמעתם.";
  const lead = `${topicLabel}. ${afterTopic} תוכן השאלה: `;
  if (p.task_mode === "oral_comprehension_mcq") {
    return `${lead}${body}.${ansPart} בחרו את התשובה הנכונה לפי מה ששמעתם.`;
  }
  if (p.task_mode === "phonological_discrimination_he") {
    const phonLead = `${topicLabel}. האזינו לצליל המילה; ענו לפי מה ששמעתם. תוכן השאלה: `;
    return `${phonLead}${body}.${ansPart} בחרו את האפשרות המתאימה לפי מה ששמעתם.`;
  }
  return `${lead}${body}.${ansPart} בחרו את התשובה הנכונה.`;
}
