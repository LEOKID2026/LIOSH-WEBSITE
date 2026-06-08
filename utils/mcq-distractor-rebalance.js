/**
 * Rebalance obvious MCQ distractors (generic "רק …" placeholders) at runtime.
 * Used by moledet/science generators — not UI copy.
 */

const GENERIC_ONLY_RE = /^רק\s+/u;

const FALLBACK_DISTRACTORS = [
  "אזור עם הרבה אנשים",
  "מקום עם מים",
  "אזור בטבע",
  "אזור בעיר",
  "מבנה גבוה",
  "דרך ראשית",
  "שטח פתוח",
  "אגם קטן",
  "יער קטן",
  "גבעה נמוכה",
];

/** @param {string} text */
function normKey(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Replace generic "רק בית/כיתה/…" distractors with plausible alternatives.
 * @param {{ answers?: string[], options?: string[], correct?: number, correctIndex?: number }} row
 * @returns {typeof row}
 */
export function rebalanceObviousMcqDistractors(row) {
  const answers = Array.isArray(row.answers)
    ? [...row.answers]
    : Array.isArray(row.options)
      ? [...row.options]
      : null;
  if (!answers || answers.length < 4) return row;

  const ci =
    Number.isFinite(Number(row.correctIndex)) && Number(row.correctIndex) >= 0
      ? Number(row.correctIndex)
      : Number.isFinite(Number(row.correct)) && Number(row.correct) >= 0
        ? Number(row.correct)
        : 0;

  if (ci >= answers.length) return row;

  const correct = String(answers[ci] ?? "").trim();
  const wrongs = answers
    .map((a, i) => ({ text: String(a ?? "").trim(), i }))
    .filter((x) => x.i !== ci);
  const genericWrong = wrongs.filter((x) => GENERIC_ONLY_RE.test(x.text));
  if (genericWrong.length < 2) return row;

  const used = new Set(answers.map((a) => normKey(a)));
  let fi = 0;
  for (const w of genericWrong) {
    while (fi < FALLBACK_DISTRACTORS.length) {
      const cand = FALLBACK_DISTRACTORS[fi++];
      const key = normKey(cand);
      if (key && key !== normKey(correct) && !used.has(key)) {
        answers[w.i] = cand;
        used.add(key);
        break;
      }
    }
  }

  const out = { ...row };
  if (Array.isArray(row.answers)) out.answers = answers;
  if (Array.isArray(row.options)) out.options = answers;
  return out;
}

/** @param {unknown} value */
export function mcqOptionCompareKey(value) {
  const s = String(value ?? "").trim();
  if (s.length <= 2 && /^[.,!?;:…]+$/u.test(s)) return `punct:${s}`;
  return s.toLowerCase().replace(/\s+/g, " ");
}

/** @param {unknown} a @param {unknown} b */
export function mcqOptionsAreDuplicate(a, b) {
  return mcqOptionCompareKey(a) === mcqOptionCompareKey(b);
}
