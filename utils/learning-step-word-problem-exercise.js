/** Word problem step text highlights. */

export function extractNumbersFromText(text) {
  const raw = String(text || "").replace(/\u2066|\u2069/g, "");
  const matches = [];
  const re = /\d+(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, value: m[0] });
  }
  return matches;
}

const KEYWORD_PATTERNS = [
  /בסך\s*ה?כל/g,
  /נותר/g,
  /נשאר/g,
  /יותר/g,
  /פחות/g,
  /כמה/g,
  /כל\s*אחד/g,
  /מחלקים/g,
  /מקבל/g,
  /מוסיפים/g,
  /מחסירים/g,
];

export function extractKeywordRanges(text) {
  const raw = String(text || "").replace(/\u2066|\u2069/g, "");
  const ranges = [];
  KEYWORD_PATTERNS.forEach((re, idx) => {
    const pattern = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    let m;
    while ((m = pattern.exec(raw)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, id: `kw-${idx}-${m.index}` });
    }
  });
  return ranges;
}

/**
 * @param {object} step
 * @param {object} [params]
 */
export function buildWordProblemHighlightRanges(step, params = {}) {
  const text = String(step?.text || "");
  const highlights = Array.isArray(step?.highlights) ? step.highlights : [];
  const ranges = [];

  if (highlights.includes("numbers") || highlights.includes("equation")) {
    extractNumbersFromText(text).forEach((n, i) => {
      ranges.push({ ...n, id: `num-${i}`, kind: "number" });
    });
  }

  if (params.a != null && highlights.includes("story")) {
    const aStr = String(params.a);
    const idx = text.indexOf(aStr);
    if (idx >= 0) ranges.push({ start: idx, end: idx + aStr.length, id: "param-a", kind: "number" });
  }
  if (params.b != null && highlights.includes("story")) {
    const bStr = String(params.b);
    const idx = text.lastIndexOf(bStr);
    if (idx >= 0) ranges.push({ start: idx, end: idx + bStr.length, id: "param-b", kind: "number" });
  }

  if (highlights.includes("operation") || highlights.includes("keywords")) {
    ranges.push(...extractKeywordRanges(text));
  }

  return ranges.sort((a, b) => a.start - b.start);
}

export function enrichWordProblemStepMetadata(step) {
  if (step?.type !== "word_problems" || step?.pre) return step;
  const params = step.params || {};
  const highlightKeywords = [];
  const highlightNumbers = [];
  const h = step.highlights || [];
  if (h.includes("operation") || h.includes("keywords")) highlightKeywords.push("operation");
  if (h.includes("story") || h.includes("equation")) highlightNumbers.push("numbers");
  return {
    ...step,
    exerciseView: "wordProblem",
    highlightKeywords,
    highlightNumbers,
  };
}

export function enrichWordProblemSteps(steps) {
  if (!Array.isArray(steps)) return steps;
  return steps.map((s) => enrichWordProblemStepMetadata(s));
}
