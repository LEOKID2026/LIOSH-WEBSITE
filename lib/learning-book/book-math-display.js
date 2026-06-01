/** LTR isolation for numbers/equations inside Hebrew book text */
export const bookMathIsolateStyle = Object.freeze({
  direction: "ltr",
  unicodeBidi: "isolate",
});

const HEBREW_CHAR = /[\u0590-\u05FF]/;
const DIGIT = /\d/;
const MATH_OPERATOR = /[+−\-=×÷<>?]/;
const ARROW = /[→←]/;
const EM_DASH = /[—–]/;

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
function canStartMathRun(stripped, start) {
  if (start >= stripped.length) return false;

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
 * @param {number} start
 * @returns {number|null} end index (exclusive) in stripped space
 */
function extendMathRunEnd(stripped, start) {
  let i = start;
  const len = stripped.length;
  let sawMathSignal =
    isPlaceholderAt(stripped, start) || MATH_OPERATOR.test(stripped[start] || "");

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
        i = j;
        continue;
      }
      break;
    }

    if (stripped[i] === ":") {
      let j = i + 1;
      while (j < len && /\s/.test(stripped[j])) j += 1;
      if (j < len && DIGIT.test(stripped[j])) {
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
    if (/[,:]$/.test(slice)) {
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
  if (!isMathLikeText(candidate)) return null;

  return end;
}

/**
 * @param {string} stripped
 * @param {number} start
 * @returns {boolean}
 */
function canStartDigitListRun(stripped, start) {
  if (start >= stripped.length || !DIGIT.test(stripped[start])) return false;
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

  const { stripped, origAt } = stripInlineMarkdownForScan(input);
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

  return picked.map((p) =>
    mapRunToOriginal(text, origAt, p.strippedStart, p.strippedEnd)
  );
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
  const re = /\d+/g;
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
