/** Build expression highlight spans from step metadata and text. */

const HIGHLIGHT_PATTERNS = {
  baseNumber: /\d+(?:\.\d+)?/g,
  percentValue: /\d+(?:\.\d+)?\s*%|\d+(?:\.\d+)?(?=\s*%)/g,
  leftNumber: /^[\d.]+/,
  rightNumber: /[\d.]+$/,
  targetNumber: /\d+/g,
  divisorCandidate: /\d+/g,
  base: /\d+/,
  exponent: /\^?\d+/,
  decidingDigit: /\d/g,
  originalValue: /\d+/g,
  roundedValue: /\d+/g,
};

/**
 * @param {string} text
 * @param {string[]} highlights
 * @param {{ kind: string, start: number, end: number }[]} [expressionLines]
 */
export function buildExpressionHighlightRanges(text, highlights = [], expressionLines = []) {
  if (expressionLines?.length) {
    return expressionLines.map((line, idx) => ({
      ...line,
      id: line.id ?? `expr-${idx}`,
    }));
  }

  if (!text || !Array.isArray(highlights) || highlights.length === 0) return [];

  const ranges = [];
  for (const key of highlights) {
    const pattern = HIGHLIGHT_PATTERNS[key];
    if (!pattern) continue;
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let match;
    let count = 0;
    while ((match = re.exec(text)) !== null) {
      ranges.push({
        id: `${key}-${count}`,
        kind: key,
        start: match.index,
        end: match.index + match[0].length,
      });
      count++;
      if (!pattern.global && !re.global) break;
    }
  }

  return mergeOverlappingRanges(ranges);
}

function mergeOverlappingRanges(ranges) {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
      prev.kind = `${prev.kind},${cur.kind}`;
    } else {
      out.push(cur);
    }
  }
  return out;
}

export function isRangeHighlighted(ranges, start, end) {
  return ranges.some((r) => r.start <= start && r.end >= end);
}

/**
 * Enrich expression-family steps with expressionLines derived from text + highlights.
 * @param {object} step
 */
export function enrichExpressionStepMetadata(step) {
  if (!step || step.expressionLines?.length) return step;
  const text = String(step.text || "").replace(/\u2066|\u2069/g, "");
  if (!text || !step.highlights?.length) return step;
  const expressionLines = buildExpressionHighlightRanges(text, step.highlights);
  if (!expressionLines.length) return step;
  return { ...step, expressionLines };
}

/**
 * @param {object[]} steps
 */
export function enrichExpressionSteps(steps) {
  if (!Array.isArray(steps)) return steps;
  return steps.map((s) => enrichExpressionStepMetadata(s));
}
