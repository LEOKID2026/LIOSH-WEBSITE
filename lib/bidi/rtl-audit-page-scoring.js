/**
 * Score book/practice page text for RTL/math audit relevance.
 * Used by scripts/qa/rtl-content-audit.mjs — not user-facing UI.
 */

const INTRO_SKIP_RES = [
  /מה\s+לומדים/u,
  /היום\s+נלמד/u,
  /מה\s+נלמד/u,
  /בואו\s+נכיר/u,
  /ברוכים\s+הבאים/u,
  /עמוד\s+פתיחה/u,
];

/** @type {{ id: string, label: string, re: RegExp, weight: number }[]} */
export const RTL_AUDIT_SIGNALS = [
  { id: "equals", label: "=", re: /=/u, weight: 10 },
  { id: "plus", label: "+", re: /\+/u, weight: 6 },
  { id: "minus", label: "−/-", re: /[−\-]/u, weight: 6 },
  { id: "multiply", label: "×", re: /×|x\s*\d/u, weight: 6 },
  { id: "divide", label: "÷", re: /÷|\/\s*\d/u, weight: 6 },
  { id: "compare", label: "< >", re: /[<>]/u, weight: 8 },
  { id: "percent", label: "%", re: /%/u, weight: 10 },
  { id: "pi", label: "π", re: /π/u, weight: 12 },
  { id: "approx", label: "≈", re: /≈/u, weight: 10 },
  { id: "degree", label: "°", re: /°/u, weight: 10 },
  { id: "superscript", label: "²/³", re: /[²³]/u, weight: 10 },
  { id: "arrow", label: "→", re: /[→←]/u, weight: 8 },
  { id: "unit-cm", label: 'ס"מ', re: /ס״?מ|ס"מ|ס״מ/u, weight: 10 },
  { id: "unit-area", label: "סמ״ר/מ״ר", re: /סמ״?ר|מ״?ר|ס"ר|מ"ר/u, weight: 12 },
  { id: "unit-kg", label: 'ק"ג', re: /ק״?ג|ק"ג/u, weight: 10 },
  { id: "formula-latin", label: "A=πr²", re: /[A-Za-z]\s*=\s*[^\n]{0,40}[π²³°]/u, weight: 14 },
  { id: "table", label: "טבלה", re: /\|.+\|/u, weight: 15 },
  { id: "table-he", label: "טבלה (עברית)", re: /טבלה/u, weight: 8 },
  { id: "exercise", label: "תרגיל", re: /תרגיל|תרגל|פתרו|חשבו|מצאו|השלימו/u, weight: 5 },
  { id: "example-solved", label: "דוגמה/פתרון", re: /דוגמה|פתרון|תשובה:/u, weight: 5 },
  { id: "equation-run", label: "משוואה", re: /\d\s*[+−\-×÷]\s*\d/u, weight: 12 },
  { id: "decimal", label: "עשרוני", re: /\d+\.\d+/u, weight: 8 },
  { id: "thousands", label: "1,000", re: /\d{1,3}(?:,\d{3})+/u, weight: 8 },
  { id: "fraction", label: "שבר", re: /\d\s*\/\s*\d|שבר/u, weight: 8 },
  { id: "bullet-exercise", label: "רשימת תרגיל", re: /^[\s]*[-•*]\s*\d/m, weight: 4 },
];

const MIN_RELEVANT_SCORE = 12;

/**
 * @param {string|null|undefined} text
 * @param {string} [title]
 */
export function analyzeRtlAuditPageText(text, title = "") {
  const body = String(text || "").replace(/\s+/g, " ").trim();
  const heading = String(title || "").trim();
  const combined = `${heading}\n${body}`.trim();

  /** @type {string[]} */
  const matchedSignals = [];
  /** @type {string[]} */
  const reasons = [];
  let score = 0;

  for (const sig of RTL_AUDIT_SIGNALS) {
    if (sig.re.test(combined)) {
      score += sig.weight;
      matchedSignals.push(sig.label);
    }
  }

  const isIntro = INTRO_SKIP_RES.some((re) => re.test(combined));
  const hasDigit = /\d/.test(combined);
  const hasHebrew = /[\u0590-\u05FF]/.test(combined);
  const hasMathSymbol = matchedSignals.length > 0;

  if (isIntro && score < MIN_RELEVANT_SCORE + 5) {
    reasons.push("עמוד פתיחה/סיכום כללי");
  }
  if (!hasDigit && !hasMathSymbol) {
    reasons.push("אין מספרים או סימני מתמטיקה");
  }
  if (!hasHebrew) {
    reasons.push("אין טקסט עברי");
  }
  if (matchedSignals.includes("תרגיל") || matchedSignals.includes("דוגמה/פתרון")) {
    reasons.push("מכיל תרגילים/דוגמאות");
  }
  if (matchedSignals.includes("=")) reasons.push("מכיל שוויון");
  if (matchedSignals.some((s) => ["π", "≈", "°", "²/³", "A=πr²"].includes(s))) {
    reasons.push("מכיל נוסחה/סימן גאומטרי");
  }
  if (matchedSignals.some((s) => ['ס"מ', "סמ״ר/מ״ר", 'ק"ג'].includes(s))) {
    reasons.push("מכיל יחידות מדידה");
  }
  if (matchedSignals.includes("טבלה")) reasons.push("מכיל טבלה");

  const isRtlRelevant =
    !isIntro &&
    score >= MIN_RELEVANT_SCORE &&
    hasHebrew &&
    (hasDigit || hasMathSymbol);

  return {
    score,
    matchedSignals: [...new Set(matchedSignals)],
    selectionReason: reasons.filter(Boolean).join("; ") || "תוכן מעורב עברית+מתמטיקה",
    isIntro,
    isRtlRelevant,
    minScore: MIN_RELEVANT_SCORE,
  };
}

/**
 * Pick 2–4 highest-scoring relevant sections from a topic walk.
 * @param {{ sectionIndex: number, analysis: ReturnType<typeof analyzeRtlAuditPageText>, title?: string }[]} sections
 * @param {{ minPick?: number, maxPick?: number }} [opts]
 */
export function selectRtlAuditSections(sections, opts = {}) {
  const minPick = opts.minPick ?? 2;
  const maxPick = opts.maxPick ?? 4;

  const relevant = sections
    .filter((s) => s.analysis.isRtlRelevant)
    .sort((a, b) => b.analysis.score - a.analysis.score);

  if (relevant.length === 0) return [];

  const picked = relevant.slice(0, maxPick);
  if (picked.length >= minPick) return picked;

  return picked;
}
