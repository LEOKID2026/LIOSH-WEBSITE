import { TEXT_HIGHLIGHT_KINDS } from "./geometry-step-types.js";

const FORMULA_KEYWORDS = [
  "נוסחה",
  "שטח",
  "היקף",
  "נפח",
  "π",
  "פיתגורס",
  "זווית",
  "מקביל",
  "מאונכ",
  "סימטר",
  "אלכסון",
];

/**
 * @param {object} step
 * @param {string} plainText
 */
export function buildGeometryTextHighlightState(step, plainText = "") {
  const text = String(plainText || step?.plainText || "").replace(/\u2066|\u2069/g, "");
  const highlights = Array.isArray(step?.textHighlights) ? [...step.textHighlights] : [];
  if (!text) return { highlights, ranges: [] };

  const ranges = [];
  if (highlights.includes(TEXT_HIGHLIGHT_KINDS.number) || highlights.length === 0) {
    const re = /\d+(?:\.\d+)?/g;
    let m;
    let i = 0;
    while ((m = re.exec(text)) !== null) {
      ranges.push({ id: `n-${i++}`, kind: TEXT_HIGHLIGHT_KINDS.number, start: m.index, end: m.index + m[0].length });
    }
  }

  for (const kw of FORMULA_KEYWORDS) {
    if (!highlights.includes(TEXT_HIGHLIGHT_KINDS.formula) && !highlights.includes(TEXT_HIGHLIGHT_KINDS.keyword)) {
      if (highlights.length > 0) continue;
    }
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      ranges.push({
        id: `kw-${kw}`,
        kind: TEXT_HIGHLIGHT_KINDS.keyword,
        start: idx,
        end: idx + kw.length,
      });
    }
  }

  return { highlights, ranges: mergeRanges(ranges) };
}

function mergeRanges(ranges) {
  if (ranges.length <= 1) return ranges;
  return [...ranges].sort((a, b) => a.start - b.start);
}
