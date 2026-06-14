/** Unicode Hebrew + niqqud block (rough) */
const HEBREW_SCRIPT_RE = /[\u0590-\u05FF]/;
/**
 * טעמים, ניקוד ונקודות — בלי U+05BE (מקף עברי / מקף מילה) שלא נחשב ניקוד.
 * טווח רחב מדי (\u0591–\u05C7) גרם לדילוג על כל השאלה כשיש מקף עברי בטקסט.
 */
const HEBREW_NIQQUD_RE = /[\u0591-\u05BD\u05BF-\u05C7]/;

/** מסיר תווי ניקוד/טעם לפני שליחה אל Nakdan — כדי לנקד מחדש את כל המחרוזת (גם כשיש ניקוד חלקי). */
export function stripHebrewNiqqudMarks(s) {
  return String(s ?? "").replace(HEBREW_NIQQUD_RE, "");
}

const CHILD_NIQQUD_GRADES = new Set(["g1", "g2"]);

const DEFAULT_DICTA_URL = "https://nakdan-u1-0.loadbalancer.dicta.org.il/api";

/** כיתות א׳–ב׳ בלבד — תצוגת ניקוד לשאלון הילד */
export function isChildHebrewNiqqudGradeKey(gradeKey) {
  if (gradeKey == null || gradeKey === "") return false;
  const k = String(gradeKey).trim().toLowerCase();
  return CHILD_NIQQUD_GRADES.has(k);
}

export function hebrewScriptLikely(s) {
  return HEBREW_SCRIPT_RE.test(String(s ?? ""));
}

export function textAlreadyHasNiqqud(s) {
  return HEBREW_NIQQUD_RE.test(String(s ?? ""));
}

/** Dicta לפעמים מחזיר `|` כגבול מורפולוגי — לא להצגה לילד */
export function sanitizeNakdanDisplayText(s) {
  return String(s ?? "")
    .replace(/\|/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * ממיר תשובת Dicta Nakdan (מערך טוקנים) למחרוזת מנוקדת.
 * @param {unknown} tokens
 * @returns {string}
 */
export function dictaNakdanTokensToString(tokens) {
  if (!Array.isArray(tokens)) return "";
  let out = "";
  for (const t of tokens) {
    if (!t || typeof t !== "object") continue;
    const opts = t.options;
    if (Array.isArray(opts) && opts.length > 0) {
      const first = opts[0];
      // פורמט ישן: [["מָה", [...מטא]], ...]
      if (Array.isArray(first) && first.length > 0 && typeof first[0] === "string") {
        out += first[0];
        continue;
      }
      // פורמט נפוץ: ["מָה", "מַה", ...] — מחרוזות מנוקדות ישירות
      if (typeof first === "string") {
        out += first;
        continue;
      }
    }
    out += t.word != null ? String(t.word) : "";
  }
  return out;
}

export function getDictaNakdanApiUrl() {
  if (typeof process !== "undefined" && process.env?.DICTA_NAKDAN_URL) {
    return String(process.env.DICTA_NAKDAN_URL).trim() || DEFAULT_DICTA_URL;
  }
  return DEFAULT_DICTA_URL;
}

/**
 * נקדון שרת (לשימוש מ API route של Next).
 * @param {string} text
 * @param {{ url?: string, signal?: AbortSignal }} [opts]
 * @returns {Promise<string>}
 */
export async function vocalizeHebrewWithDicta(text, opts = {}) {
  const raw = String(text ?? "");
  if (!raw.trim()) return raw;
  if (!hebrewScriptLikely(raw)) return raw;
  const stripped = stripHebrewNiqqudMarks(raw).trim();
  if (!stripped) return raw;
  if (!hebrewScriptLikely(stripped)) return raw;

  const url = opts.url || getDictaNakdanApiUrl();
  const maxLen = 3500;
  const payload = stripped.length > maxLen ? stripped.slice(0, maxLen) : stripped;

  const singleAttempt = async (addMorph = false) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "nakdan",
        data: payload,
        addmorph: addMorph,
        genre: "modern",
      }),
      signal: opts.signal,
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const vocalized = sanitizeNakdanDisplayText(dictaNakdanTokensToString(data));
    return vocalized ? vocalized : null;
  };

  try {
    let out = await singleAttempt(false);
    if (out == null) {
      await new Promise((r) => setTimeout(r, 220));
      out = await singleAttempt(false);
    }
    if (out == null) return raw;

    const lettersOnly = stripped.replace(/[^\u0590-\u05FF]/g, "");
    const multiLetterHebrew = lettersOnly.length >= 2;
    if (multiLetterHebrew && !textAlreadyHasNiqqud(out)) {
      await new Promise((r) => setTimeout(r, 200));
      let retry = await singleAttempt(false);
      if (!retry || !textAlreadyHasNiqqud(retry)) {
        await new Promise((r) => setTimeout(r, 200));
        retry = await singleAttempt(true);
      }
      if (retry && textAlreadyHasNiqqud(retry)) return retry;
    }

    return out;
  } catch {
    return raw;
  }
}
