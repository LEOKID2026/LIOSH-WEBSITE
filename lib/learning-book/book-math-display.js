/** LTR isolation for numbers/equations inside Hebrew book text */
export const bookMathIsolateStyle = Object.freeze({
  direction: "ltr",
  unicodeBidi: "isolate",
});

const MATH_OPERATOR = /[+−\-=×÷<>]/;
const DIGIT = /\d/;

/**
 * Detect text that should render LTR (equations, number lines, coin amounts).
 * @param {string} text
 */
export function isMathLikeText(text) {
  const s = String(text || "").trim();
  if (!s || !DIGIT.test(s)) return false;
  if (MATH_OPERATOR.test(s)) return true;
  if (/\?/.test(s) && DIGIT.test(s)) return true;
  if (/₪/.test(s)) return true;
  if (/→|←|↑|↓|—/.test(s) && DIGIT.test(s)) return true;
  if (/^[0-9\s—→←↑↓[\]()●✕.…]+$/.test(s)) return true;
  return false;
}

/**
 * Patterns matched in order (longest / most specific first).
 * @type {RegExp[]}
 */
const MATH_RUN_PATTERNS = [
  // Mixed Hebrew phrase: 4 גולות + 3, על ציר — 6 + 2
  /\d+(?:\s*[\u0590-\u05FF]+[\s,]*)?\s*[+−\-=×÷<>]\s*(?:[\u0590-\u05FF\s,]*)?\d+(?:\s*[+−\-=×÷<>]\s*(?:\d+|\?))*(?:\s*=\s*(?:\d+|\?))?/g,
  // Full equations with ? : 5 + 3 = ?, 7 + 4 = ?, 9 − 4 = ?
  /\d+(?:\s*[+−\-=×÷<>]\s*(?:\d+|\?))+(?:\s*=\s*(?:\d+|\?))?/g,
  // Chained addition: 5 + 5 + 2 = 12
  /\d+(?:\s*[+−\-=×÷<>]\s*\d+)+(?:\s*=\s*(?:\d+|\?))?/g,
  // Subtraction/addition pair: 9 − 4, 10 − 7
  /\d+\s*[−\-]\s*\d+/g,
  // Coin amounts
  /\d+\s*₪/g,
  // Number-line / diagram runs (4+ chars of digits and line symbols)
  /(?:\d+[\s—→←↑↓[\]()●✕.…\-–]+){2,}\d+/g,
  // Standalone digit groups in diagram context
  /(?:[0-9\s—→←↑↓[\]()●✕.…]{4,})/g,
];

/**
 * Split Hebrew prose into alternating prose / math-like runs.
 * @param {string} text
 * @returns {{ type: 'text' | 'math', value: string }[]}
 */
export function splitHebrewMathRuns(text) {
  const input = String(text || "");
  if (!input) return [];

  /** @type {{ start: number, end: number, value: string }[]} */
  const matches = [];

  for (const re of MATH_RUN_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(input)) !== null) {
      const token = match[0];
      if (!token.trim() || !isMathLikeText(token)) continue;
      const start = match.index;
      const end = start + token.length;
      const overlaps = matches.some(
        (m) => !(end <= m.start || start >= m.end)
      );
      if (!overlaps) {
        matches.push({ start, end, value: token.trim() });
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);

  /** @type {{ type: 'text' | 'math' | 'digit', value: string }[]} */
  const parts = [];
  let last = 0;

  for (const m of matches) {
    if (m.start > last) {
      parts.push(...splitBareDigits(input.slice(last, m.start)));
    }
    parts.push({ type: "math", value: m.value });
    last = m.end;
  }

  if (last < input.length) {
    parts.push(...splitBareDigits(input.slice(last)));
  }

  if (!parts.length) {
    parts.push(...splitBareDigits(input));
  }

  if (!parts.length) {
    parts.push({ type: "text", value: input });
  }

  return parts;
}

/**
 * Wrap standalone digits so they don't reorder in RTL Hebrew.
 * @param {string} chunk
 * @returns {{ type: 'text' | 'digit', value: string }[]}
 */
function splitBareDigits(chunk) {
  if (!chunk) return [];
  /** @type {{ type: 'text' | 'digit', value: string }[]} */
  const out = [];
  const re = /\d+/g;
  let last = 0;
  let match;

  while ((match = re.exec(chunk)) !== null) {
    if (match.index > last) {
      out.push({ type: "text", value: chunk.slice(last, match.index) });
    }
    out.push({ type: "digit", value: match[0] });
    last = match.index + match[0].length;
  }

  if (last < chunk.length) {
    out.push({ type: "text", value: chunk.slice(last) });
  }

  if (!out.length && chunk) {
    out.push({ type: "text", value: chunk });
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
