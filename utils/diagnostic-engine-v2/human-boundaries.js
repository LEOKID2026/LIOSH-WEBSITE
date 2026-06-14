/**
 * גבולות אנושי בלולא — stage1 §16: מונע ניסוחים אסורים במסקנה.
 */
const FORBIDDEN_SUBSTRINGS = [
  "דיסלקציה",
  "ADHD",
  "ADD",
  "לקות למידה",
  "אוטיזם",
  "הפרעת קשב",
  "אתה חכם",
  "אתה לא חכם",
  "מבחן קליני",
];

/**
 * @param {string} text
 * @returns {{ safe: string, stripped: boolean, matched?: string }}
 */
export function sanitizePedagogicLine(text) {
  const t = String(text || "").trim();
  if (!t) return { safe: "", stripped: false };
  for (const f of FORBIDDEN_SUBSTRINGS) {
    if (t.includes(f)) return { safe: "", stripped: true, matched: f };
  }
  return { safe: t, stripped: false };
}
