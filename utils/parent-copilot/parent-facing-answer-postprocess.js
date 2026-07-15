/**
 * Final parent-facing sanitization: banned engine phrases, duplicate sentences/topics.
 */

/** @param {string} t */
function norm(t) {
  return String(t || "")
    .replace(/\s+/g, " ")
    .trim();
}

const BANNED_PHRASE_RULES = [
  {
    pattern: /רוב המוקדים עם ניסוח יציב יחסית[^.!?]*[.!?]?/gu,
    replace: "",
  },
  {
    pattern: /(?:כדאי להמשיך לעקוב\s*-\s*)?נכון לעכשיו, אין כאן מידע שלא מגיע מהדוח[^.!?]*[.!?]?/gu,
    replace: "",
  },
  {
    pattern: /זה אומר שהתמונה בנויה ממקצועות ונושאים שכבר הוכנסו לטווח התקופה\.?/gu,
    replace: "הדוח מתבסס על התרגול שבוצע באתר בתקופה שנבחרה.",
  },
  {
    pattern: /כהורה,?\s*אפשר להשתמש בזה כמילון משמעויות לדוח[^.!?]*[.!?]?/gu,
    replace: "",
  },
  {
    pattern: /בלי להוסיף שכבת פרשנות חיצונית\.?/gu,
    replace: "",
  },
  {
    pattern: /מילון משמעויות(?:\s+לדוח)?[^.!?]*[.!?]?/gu,
    replace: "",
  },
];

/**
 * @param {string} text
 */
export function sanitizeBannedParentPhrasesHe(text) {
  let t = norm(text);
  for (const { pattern, replace } of BANNED_PHRASE_RULES) {
    pattern.lastIndex = 0;
    t = norm(t.replace(pattern, replace));
  }
  t = norm(t.replace(/\s{2,}/g, " "));
  return t;
}

/**
 * @param {string} text
 */
export function dedupeSentencesHe(text) {
  const raw = norm(text);
  if (!raw) return raw;
  const parts = raw.split(/(?<=[.!?؟])\s+/).filter((p) => norm(p).length > 0);
  if (parts.length <= 1) return raw;
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const part of parts) {
    const p = norm(part);
    if (!p) continue;
    const key = p.toLowerCase();
    if (key.length >= 12 && seen.has(key)) continue;
    if (key.length >= 12) seen.add(key);
    out.push(p);
  }
  return norm(out.join(" "));
}

/**
 * Collapse duplicate "subject - topic" pairs within one answer body.
 * @param {string} text
 */
export function dedupeTopicPairsHe(text) {
  const raw = norm(text);
  if (!raw.includes("-")) return raw;
  const pairRe = /([\u0590-\u05FF][\u0590-\u05FF\s]{0,24})\s*-\s*([\u0590-\u05FF][^\n,.;]{2,48})/gu;
  const seen = new Set();
  let changed = false;
  const rebuilt = raw.replace(pairRe, (full, subj, topic) => {
    const key = `${norm(subj)}|${norm(topic)}`.toLowerCase();
    if (seen.has(key)) {
      changed = true;
      return "";
    }
    seen.add(key);
    return full;
  });
  if (!changed) return raw;
  return norm(rebuilt.replace(/\s{2,}/g, " ").replace(/\(\s*\)/g, ""));
}

/**
 * @param {string} text
 */
export function postprocessParentFacingAnswerHe(text) {
  let t = sanitizeBannedParentPhrasesHe(text);
  t = dedupeSentencesHe(t);
  t = dedupeTopicPairsHe(t);
  return norm(t);
}

/**
 * @param {Array<{ type?: string; textHe?: string; source?: string }>} blocks
 */
export function postprocessParentFacingBlocksHe(blocks) {
  const joined = (Array.isArray(blocks) ? blocks : [])
    .map((b) => norm(b?.textHe))
    .filter(Boolean)
    .join(" ");
  const globalSeen = new Set();
  return (Array.isArray(blocks) ? blocks : []).map((b) => {
    let textHe = postprocessParentFacingAnswerHe(String(b?.textHe || ""));
    const parts = textHe.split(/(?<=[.!?؟])\s+/).filter(Boolean);
    /** @type {string[]} */
    const kept = [];
    for (const part of parts) {
      const p = norm(part);
      const key = p.toLowerCase();
      if (key.length >= 12 && globalSeen.has(key)) continue;
      if (key.length >= 12) globalSeen.add(key);
      kept.push(p);
    }
    if (kept.length) textHe = norm(kept.join(" "));
    if (!textHe && joined) textHe = postprocessParentFacingAnswerHe(joined);
    return { ...b, textHe };
  }).filter((b) => norm(b.textHe).length > 0);
}

export const BANNED_PARENT_PHRASE_SNIPPETS = [
  "רוב המוקדים עם ניסוח יציב יחסית",
  "נכון לעכשיו, אין כאן מידע שלא מגיע מהדוח",
  "התמונה בנויה ממקצועות ונושאים",
  "מילון משמעויות",
  "שכבת פרשנות חיצונית",
];

export default {
  postprocessParentFacingAnswerHe,
  postprocessParentFacingBlocksHe,
  sanitizeBannedParentPhrasesHe,
  dedupeSentencesHe,
  dedupeTopicPairsHe,
  BANNED_PARENT_PHRASE_SNIPPETS,
};
