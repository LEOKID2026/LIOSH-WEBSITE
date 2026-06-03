/**
 * LTR isolation for numbers/equations inside Hebrew book text
 */

import { isStepLabelDigit, stripBookLineLabelForMathScan } from "./book-line-structure.js";

export const bookMathIsolateStyle = Object.freeze({
  direction: "ltr",
  unicodeBidi: "isolate",
  display: "inline-block",
  verticalAlign: "baseline",
  maxWidth: "100%",
});

/** RTL label isolation inside mixed lines */
export const bookLabelIsolateStyle = Object.freeze({
  direction: "rtl",
  unicodeBidi: "isolate",
  display: "inline-block",
  verticalAlign: "baseline",
});

/** Gap after structural labels (source space is trimmed during label/body split). */
export const bookLabelBodyGapStyle = Object.freeze({
  display: "inline-block",
  width: "0.35em",
  flexShrink: 0,
});

/** RTL prose isolation between LTR math islands */
export const bookProseIsolateStyle = Object.freeze({
  direction: "rtl",
  unicodeBidi: "isolate",
  display: "inline-block",
  verticalAlign: "baseline",
  maxWidth: "100%",
  whiteSpace: "pre-wrap",
});

const HEBREW_CHAR = /[\u0590-\u05FF]/;
const DIGIT = /\d/;
const MATH_OPERATOR = /[+−\-=×÷<>?]/;
const ARROW = /[→←]/;
const EM_DASH = /[—–]/;
const REMAINDER_WORD = /^(?:שארית)\s+\d+$/u;
const FORMULA_OPERATOR = /[=+−×÷()[\]]/;
const WORD_INTERNAL_HYPHEN = /[\u0590-\u05FF]-[\u0590-\u05FF]/u;

/** Thousands grouping: 1,000 / 12,345 / 1,000,000 — not counting lists like 8, 9, 10 */
const THOUSANDS_GROUPED_NUMBER = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;

/**
 * Detect text that should render LTR (equations, number lines, coin amounts).
 * @param {string} text
 */
export function isMathLikeText(text) {
  const s = String(text || "").trim();
  if (!s || !DIGIT.test(s)) return false;
  if (MATH_OPERATOR.test(s)) return true;
  if (/__/.test(s)) return true;
  if (/\?/.test(s) && DIGIT.test(s)) return true;
  if (/₪/.test(s)) return true;
  if (ARROW.test(s) && DIGIT.test(s)) return true;
  if (/^[0-9\s—→←↑↓[\]()●✕.,_]+$/.test(s)) return true;
  if (THOUSANDS_GROUPED_NUMBER.test(s.replace(/\s/g, ""))) return true;
  return false;
}

/**
 * Strip inline markdown markers for math scanning; map stripped indices → original.
 * @param {string} text
 * @returns {{ stripped: string, origAt: number[] }}
 */
export function stripInlineMarkdownForScan(text) {
  const input = String(text || "");
  /** @type {number[]} */
  const origAt = [];
  let stripped = "";
  let i = 0;

  while (i < input.length) {
    if (input.startsWith("**", i)) {
      i += 2;
      continue;
    }
    if (input[i] === "`") {
      i += 1;
      while (i < input.length && input[i] !== "`") {
        stripped += input[i];
        origAt.push(i);
        i += 1;
      }
      if (i < input.length) {
        stripped += input[i];
        origAt.push(i);
        i += 1;
      }
      continue;
    }
    if (input[i] === "*" && !input.startsWith("**", i)) {
      i += 1;
      continue;
    }
    stripped += input[i];
    origAt.push(i);
    i += 1;
  }

  return { stripped, origAt };
}

/**
 * @param {string} stripped
 * @param {number} index
 */
function isPlaceholderAt(stripped, index) {
  return stripped.slice(index, index + 2) === "__";
}

/**
 * @param {string} stripped
 * @param {number} index
 */
function isHebrewAt(stripped, index) {
  return index >= 0 && index < stripped.length && HEBREW_CHAR.test(stripped[index]);
}

/**
 * @param {string} stripped
 * @param {number} start
 * @returns {boolean}
 */
function isThousandsGroupedNumberAt(stripped, start) {
  if (start >= stripped.length || !DIGIT.test(stripped[start])) return false;
  return extendThousandsGroupedNumberEnd(stripped, start) != null;
}

/**
 * Extend 1,000-style thousands separators (comma + exactly 3 digits per group).
 * @param {string} stripped
 * @param {number} start
 * @returns {number|null}
 */
function extendThousandsGroupedNumberEnd(stripped, start) {
  let i = start;
  const len = stripped.length;

  while (i < len && DIGIT.test(stripped[i])) {
    i += 1;
  }

  while (i < len && stripped[i] === ",") {
    if (
      i + 3 < len &&
      DIGIT.test(stripped[i + 1]) &&
      DIGIT.test(stripped[i + 2]) &&
      DIGIT.test(stripped[i + 3]) &&
      !/\s/.test(stripped[i + 1])
    ) {
      i += 4;
      continue;
    }
    break;
  }

  if (stripped[i] === "." && DIGIT.test(stripped[i + 1] || "")) {
    i += 1;
    while (i < len && DIGIT.test(stripped[i])) {
      i += 1;
    }
  }

  if (i <= start) return null;

  const candidate = stripped.slice(start, i).trim();
  if (!THOUSANDS_GROUPED_NUMBER.test(candidate)) return null;
  return i;
}

/**
 * @param {string} stripped
 * @param {number} start
 * @returns {boolean}
 */
function canStartMathRun(stripped, start) {
  if (start >= stripped.length) return false;

  if (isThousandsGroupedNumberAt(stripped, start)) {
    return true;
  }

  if (isStepLabelDigit(stripped, start)) {
    return false;
  }

  if (isPlaceholderAt(stripped, start)) {
    return true;
  }

  if (!DIGIT.test(stripped[start])) return false;

  const tail = stripped.slice(start, start + 24);
  if (/\d\s*[+−\-=×÷<>]/.test(tail)) return true;
  if (/\d\s*__/.test(tail)) return true;
  if (/__\s*=\s*\d/.test(stripped.slice(Math.max(0, start - 4), start + 20))) return false;
  if (/\d\s*=\s*(\d+|__|\?)/.test(tail)) return true;
  if (/\d\s*[−\-]\s*(\d+|__)/.test(tail)) return true;
  if (/\d\s*[×x]\s*\d/.test(tail)) return true;

  return false;
}

/**
 * @param {string} stripped
 * @param {number} index
 */
function isRemainderPhraseAt(stripped, index) {
  const tail = stripped.slice(index).trimStart();
  return REMAINDER_WORD.test(tail.trim());
}

/**
 * @param {string} stripped
 * @param {number} end exclusive end index
 */
function thousandsOnlyRun(stripped, start, end) {
  const candidate = stripped.slice(start, end).trim();
  if (!THOUSANDS_GROUPED_NUMBER.test(candidate)) return false;
  const after = stripped.slice(end).trimStart();
  if (!after) return true;
  return !/^[+−\-=×÷?]/.test(after) && !/^÷/.test(after);
}

/**
 * @param {string} stripped
 * @param {number} start
 * @returns {number|null} end index (exclusive) in stripped space
 */
function extendMathRunEnd(stripped, start) {
  let i = start;
  const len = stripped.length;
  let sawMathSignal =
    isPlaceholderAt(stripped, start) || MATH_OPERATOR.test(stripped[start] || "");

  if (isThousandsGroupedNumberAt(stripped, start)) {
    const thousandsEnd = extendThousandsGroupedNumberEnd(stripped, start);
    if (thousandsEnd != null && thousandsEnd > start) {
      i = thousandsEnd;
      sawMathSignal = true;
    }
  }

  while (i < len) {
    if (isHebrewAt(stripped, i)) break;
    if (isRemainderPhraseAt(stripped, i)) break;

    if (DIGIT.test(stripped[i])) {
      i += 1;
      continue;
    }

    if (/\s/.test(stripped[i])) {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && isHebrewAt(stripped, j)) break;
      i = j;
      continue;
    }

    if (isPlaceholderAt(stripped, i)) {
      sawMathSignal = true;
      i += 2;
      continue;
    }

    if (MATH_OPERATOR.test(stripped[i])) {
      sawMathSignal = true;
      i += 1;
      continue;
    }

    if (ARROW.test(stripped[i])) {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && isHebrewAt(stripped, j)) break;
      sawMathSignal = true;
      i += 1;
      continue;
    }

    if (stripped[i] === ",") {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && DIGIT.test(stripped[j])) {
        const groupLen = j - i - 1;
        const wsBeforeComma = stripped.slice(i + 1, j).length;
        if (
          wsBeforeComma === 0 &&
          groupLen === 3 &&
          DIGIT.test(stripped[i - 1] || "")
        ) {
          i = j;
          continue;
        }
      }
      if (j < len && (MATH_OPERATOR.test(stripped[j]) || isPlaceholderAt(stripped, j))) {
        sawMathSignal = true;
        i = j;
        continue;
      }
      if (j < len && DIGIT.test(stripped[j]) && sawMathSignal) {
        i = j;
        continue;
      }
      break;
    }

    if (stripped[i] === ":") {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j >= len) {
        if (sawMathSignal) {
          i = len;
          break;
        }
        break;
      }
      if (j < len && DIGIT.test(stripped[j])) {
        const beforeColon = stripped.slice(Math.max(0, start), i).trim();
        if (/^\d$/.test(beforeColon) && isStepLabelDigit(stripped, start)) {
          break;
        }
        sawMathSignal = true;
        i = j;
        continue;
      }
      break;
    }

    if (EM_DASH.test(stripped[i])) {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && isHebrewAt(stripped, j)) break;
      if (j < len && DIGIT.test(stripped[j])) {
        i = j;
        continue;
      }
      break;
    }

    if (stripped[i] === "-") {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && (DIGIT.test(stripped[j]) || isPlaceholderAt(stripped, j))) {
        sawMathSignal = true;
        i = j;
        continue;
      }
      break;
    }

    if (stripped[i] === "x" || stripped[i] === "X") {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && DIGIT.test(stripped[j])) {
        sawMathSignal = true;
        i = j;
        continue;
      }
      break;
    }

    if (stripped[i] === ".") {
      if (DIGIT.test(stripped[i - 1] || "") && DIGIT.test(stripped[i + 1] || "")) {
        i += 1;
        continue;
      }
      break;
    }

    break;
  }

  let end = i;
  while (end > start) {
    const slice = stripped.slice(start, end);
    if (/\s+$/.test(slice)) {
      end -= 1;
      while (end > start && /\s/.test(stripped[end - 1])) end -= 1;
      continue;
    }
    if (/[→←]+$/.test(slice)) {
      end = start + slice.replace(/[→←]+$/, "").length;
      continue;
    }
    if (/,$/.test(slice) && !/,\s*[+−\-=×÷]/.test(slice)) {
      end -= 1;
      continue;
    }
    if (/:$/.test(slice) && end < stripped.length) {
      end -= 1;
      continue;
    }
    break;
  }

  const candidate = stripped.slice(start, end);
  if (!candidate.trim() || !DIGIT.test(candidate)) return null;
  if (!sawMathSignal && !ARROW.test(candidate) && !/,/.test(candidate)) {
    return null;
  }
  if (THOUSANDS_GROUPED_NUMBER.test(candidate.trim()) && thousandsOnlyRun(stripped, start, end)) {
    return end;
  }
  if (!isMathLikeText(candidate.replace(/:$/, ""))) return null;

  return end;
}

/**
 * @param {string} stripped
 * @param {number} start
 * @returns {boolean}
 */
function canStartDigitListRun(stripped, start) {
  if (start >= stripped.length || !DIGIT.test(stripped[start])) return false;
  if (isThousandsGroupedNumberAt(stripped, start)) return false;
  const tail = stripped.slice(start, start + 40);
  return /^\d+(?:\s*,\s*\d+)+/.test(tail);
}

/**
 * Extend comma-separated counting lists: 8, 9, 10, 11
 * @param {string} stripped
 * @param {number} start
 * @returns {number|null}
 */
function extendDigitListRunEnd(stripped, start) {
  let i = start;
  const len = stripped.length;

  while (i < len) {
    if (isHebrewAt(stripped, i)) break;
    if (DIGIT.test(stripped[i])) {
      i += 1;
      continue;
    }
    if (/\s/.test(stripped[i])) {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && isHebrewAt(stripped, j)) break;
      i = j;
      continue;
    }
    if (stripped[i] === ",") {
      i += 1;
      continue;
    }
    break;
  }

  let end = i;
  while (end > start && /\s/.test(stripped[end - 1])) end -= 1;

  const candidate = stripped.slice(start, end);
  if (!/^\d+(?:\s*,\s*\d+)+$/.test(candidate.trim())) return null;
  return end;
}

/**
 * @param {string} text
 * @param {number[]} origAt
 * @param {number} strippedStart
 * @param {number} strippedEnd
 * @returns {{ start: number, end: number, value: string }}
 */
function mapRunToOriginal(text, origAt, strippedStart, strippedEnd) {
  let origStart = origAt[strippedStart];
  let origEnd = origAt[strippedEnd - 1] + 1;

  while (origStart > 1 && text.slice(origStart - 2, origStart) === "**") {
    origStart -= 2;
  }
  while (origEnd + 1 < text.length && text.slice(origEnd, origEnd + 2) === "**") {
    origEnd += 2;
  }
  while (origStart > 0 && text[origStart - 1] === "*") {
    origStart -= 1;
  }

  return {
    start: origStart,
    end: origEnd,
    value: text.slice(origStart, origEnd),
  };
}

/**
 * Find inline math runs in raw text (markdown-aware).
 * @param {string} text
 * @returns {{ start: number, end: number, value: string }[]}
 */
export function findInlineMathRuns(text) {
  const input = String(text || "");
  if (!input) return [];

  const { scanText } = stripBookLineLabelForMathScan(input);
  const bodyOffset = scanText === input ? 0 : input.indexOf(scanText);

  const { stripped, origAt } = stripInlineMarkdownForScan(scanText);
  if (!stripped || !origAt.length) return [];

  /** @type {{ strippedStart: number, strippedEnd: number, len: number }[]} */
  const candidates = [];

  for (let i = 0; i < stripped.length; i += 1) {
    if (canStartMathRun(stripped, i)) {
      const end = extendMathRunEnd(stripped, i);
      if (end != null && end > i) {
        candidates.push({ strippedStart: i, strippedEnd: end, len: end - i });
      }
    } else if (canStartDigitListRun(stripped, i)) {
      const prev = stripped.slice(Math.max(0, i - 4), i);
      if (/[→←:]\s*$/.test(prev) || i === 0) {
        const end = extendDigitListRunEnd(stripped, i);
        if (end != null && end > i) {
          candidates.push({ strippedStart: i, strippedEnd: end, len: end - i });
        }
      }
    }
  }

  candidates.sort((a, b) => {
    if (a.strippedStart !== b.strippedStart) {
      return a.strippedStart - b.strippedStart;
    }
    return b.len - a.len;
  });

  /** @type {{ strippedStart: number, strippedEnd: number }[]} */
  const picked = [];
  for (const c of candidates) {
    const overlaps = picked.some(
      (p) =>
        !(
          c.strippedEnd <= p.strippedStart ||
          c.strippedStart >= p.strippedEnd
        )
    );
    if (!overlaps) {
      picked.push({ strippedStart: c.strippedStart, strippedEnd: c.strippedEnd });
    }
  }

  picked.sort((a, b) => a.strippedStart - b.strippedStart);

  const runs = picked.map((p) =>
    mapRunToOriginal(scanText, origAt, p.strippedStart, p.strippedEnd)
  );

  if (bodyOffset <= 0) return runs;

  return runs.map((run) => ({
    start: run.start + bodyOffset,
    end: run.end + bodyOffset,
    value: input.slice(run.start + bodyOffset, run.end + bodyOffset),
  }));
}

/**
 * Split text into top-level prose vs inline math (markdown-safe).
 * @param {string} text
 * @returns {{ type: "text" | "math", value: string, start: number, end: number }[]}
 */
export function splitTextAndMathRuns(text) {
  const input = String(text || "");
  if (!input) return [];

  const mathRuns = findInlineMathRuns(input);
  if (!mathRuns.length) {
    return [{ type: "text", value: input, start: 0, end: input.length }];
  }

  /** @type {{ type: "text" | "math", value: string, start: number, end: number }[]} */
  const parts = [];
  let last = 0;

  for (const m of mathRuns) {
    if (m.start > last) {
      parts.push({
        type: "text",
        value: input.slice(last, m.start),
        start: last,
        end: m.start,
      });
    }
    parts.push({
      type: "math",
      value: m.value,
      start: m.start,
      end: m.end,
    });
    last = m.end;
  }

  if (last < input.length) {
    parts.push({
      type: "text",
      value: input.slice(last),
      start: last,
      end: input.length,
    });
  }

  return parts;
}

/**
 * Split Hebrew prose into alternating prose / math-like runs (within a prose segment).
 * @param {string} text
 * @returns {{ type: "text" | "math" | "digit", value: string, start?: number, end?: number }[]}
 */
export function splitHebrewMathRuns(text) {
  const input = String(text || "");
  if (!input) return [];

  const top = splitTextAndMathRuns(input);
  /** @type {{ type: "text" | "math" | "digit", value: string, start?: number, end?: number }[]} */
  const out = [];

  for (const part of top) {
    if (part.type === "math") {
      out.push({
        type: "math",
        value: part.value,
        start: part.start,
        end: part.end,
      });
      continue;
    }
    out.push(...splitBareDigits(part.value, part.start));
  }

  if (!out.length) {
    out.push({ type: "text", value: input, start: 0, end: input.length });
  }

  return out;
}

/**
 * Wrap standalone digits so they don't reorder in RTL Hebrew.
 * @param {string} chunk
 * @param {number} offset
 * @returns {{ type: "text" | "digit", value: string, start: number, end: number }[]}
 */
function splitBareDigits(chunk, offset = 0) {
  if (!chunk) return [];
  /** @type {{ type: "text" | "digit", value: string, start: number, end: number }[]} */
  const out = [];
  const re = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+/g;
  let last = 0;
  let match;

  while ((match = re.exec(chunk)) !== null) {
    if (match.index > last) {
      out.push({
        type: "text",
        value: chunk.slice(last, match.index),
        start: offset + last,
        end: offset + match.index,
      });
    }
    out.push({
      type: "digit",
      value: match[0],
      start: offset + match.index,
      end: offset + match.index + match[0].length,
    });
    last = match.index + match[0].length;
  }

  if (last < chunk.length) {
    out.push({
      type: "text",
      value: chunk.slice(last),
      start: offset + last,
      end: offset + chunk.length,
    });
  }

  if (!out.length && chunk) {
    out.push({
      type: "text",
      value: chunk,
      start: offset,
      end: offset + chunk.length,
    });
  }

  return out;
}

/**
 * True when body mixes Hebrew variable names with formula operators (not a pure numeric equation).
 * @param {string} text
 */
export function isFormulaLikeBody(text) {
  const s = String(text || "").trim();
  if (!HEBREW_CHAR.test(s)) return false;
  if (/\d/.test(s)) return false;
  if (/[*`]/.test(s)) return false;
  if (!/[=+−×÷]/.test(s)) return false;
  if (!FORMULA_OPERATOR.test(s)) return false;

  // Prose with word-internal hyphens (צעד-צעד) — not a formula row.
  if (WORD_INTERNAL_HYPHEN.test(s) && !/[()]/.test(s)) {
    return false;
  }

  // Explanatory Hebrew chains with multi-word segments (קדימה = ימינה = מספר גדול יותר).
  if (!/[()]/.test(s) && /[\u0590-\u05FF]\s+[\u0590-\u05FF]+\s+[\u0590-\u05FF]/.test(s)) {
    return false;
  }

  return true;
}

/**
 * Tokenize Hebrew-formula bodies like "מחולק = (מחלק × מנה) + שארית".
 * @param {string} text
 * @returns {{ type: "hebrew" | "op", value: string }[]}
 */
export function splitFormulaTokens(text) {
  const input = String(text || "");
  if (!input.trim()) return [];

  /** @type {{ type: "hebrew" | "op" | "space", value: string }[]} */
  const tokens = [];
  const re = /([=+−×÷()[\]])|(\s+)/g;
  let last = 0;
  let match;

  while ((match = re.exec(input)) !== null) {
    if (match.index > last) {
      const chunk = input.slice(last, match.index);
      if (chunk) tokens.push({ type: "hebrew", value: chunk });
    }
    if (match[1]) {
      tokens.push({ type: "op", value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: "space", value: match[2] });
    }
    last = match.index + match[0].length;
  }

  if (last < input.length) {
    const chunk = input.slice(last);
    if (chunk) tokens.push({ type: "hebrew", value: chunk });
  }

  return tokens;
}

/**
 * Scale diagram font size by line length for mobile fit.
 * @param {string} content
 */
export function diagramTextSizeClass(content) {
  const lines = String(content || "").split("\n");
  const maxLen = Math.max(...lines.map((l) => l.length), 0);
  if (maxLen > 42) return "text-xs leading-snug sm:text-sm";
  if (maxLen > 32) return "text-sm leading-relaxed sm:text-base";
  if (maxLen > 24) return "text-base leading-relaxed sm:text-lg";
  return "text-lg leading-relaxed sm:text-xl";
}
