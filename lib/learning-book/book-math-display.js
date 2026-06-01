/** LTR isolation for numbers/equations inside Hebrew book text */
export const bookMathIsolateStyle = Object.freeze({
  direction: "ltr",
  unicodeBidi: "isolate",
});

/**
 * Detect text that should render LTR (equations, number lines, coin amounts).
 * @param {string} text
 */
export function isMathLikeText(text) {
  const s = String(text || "").trim();
  if (!s || !/\d/.test(s)) return false;
  if (/[+\-−=×*/()]/.test(s)) return true;
  if (/₪/.test(s)) return true;
  if (/→|←|↑|↓|—/.test(s) && /\d/.test(s)) return true;
  if (/^[0-9\s—→←↑↓[\]()●✕.]+$/.test(s)) return true;
  return false;
}

/**
 * Split Hebrew prose into alternating prose / math-like runs.
 * @param {string} text
 * @returns {{ type: 'text' | 'math', value: string }[]}
 */
export function splitHebrewMathRuns(text) {
  const input = String(text || "");
  if (!input) return [];

  const re =
    /(\d+(?:\s*[+−\-=×]\s*\d+)+(?:\s*[+−\-=×]\s*\d+)*)|(\d+\s*₪)|((?:[0-9\s—→←↑↓[\]()●✕.]+){4,})/g;

  const parts = [];
  let last = 0;
  let match;

  while ((match = re.exec(input)) !== null) {
    const token = match[0];
    if (!token.trim()) continue;
    if (!isMathLikeText(token)) continue;

    if (match.index > last) {
      parts.push({ type: "text", value: input.slice(last, match.index) });
    }
    parts.push({ type: "math", value: token.trim() });
    last = match.index + token.length;
  }

  if (last < input.length) {
    parts.push({ type: "text", value: input.slice(last) });
  }

  if (!parts.length) {
    parts.push({ type: "text", value: input });
  }

  return parts;
}

/**
 * Scale monospace diagram font size by line length for mobile fit.
 * @param {string} content
 */
export function diagramTextSizeClass(content) {
  const lines = String(content || "").split("\n");
  const maxLen = Math.max(...lines.map((l) => l.length), 0);
  if (maxLen > 42) return "text-[0.62rem] leading-snug sm:text-xs";
  if (maxLen > 32) return "text-xs leading-snug sm:text-sm";
  if (maxLen > 24) return "text-sm leading-relaxed sm:text-base";
  return "text-base leading-relaxed sm:text-lg";
}
