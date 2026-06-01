/**
 * Parse inline markdown (bold / italic / code) before math isolation.
 * Prevents math splitting from breaking **…** pairs.
 */

/**
 * @param {string} text
 * @returns {{ type: 'text' | 'bold' | 'italic' | 'code', value: string }[]}
 */
export function parseInlineMarkdown(text) {
  const input = String(text || "");
  if (!input) return [];

  /** @type {{ type: 'text' | 'bold' | 'italic' | 'code', value: string }[]} */
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/gs;
  let last = 0;
  let match;

  while ((match = re.exec(input)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: input.slice(last, match.index) });
    }
    if (match[2] !== undefined) {
      parts.push({ type: "bold", value: match[2] });
    } else if (match[3] !== undefined) {
      parts.push({ type: "italic", value: match[3] });
    } else if (match[4] !== undefined) {
      parts.push({ type: "code", value: match[4] });
    }
    last = match.index + match[0].length;
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
 * Strip leftover markdown markers that failed to parse (safety net).
 * @param {string} text
 */
export function stripStrayMarkdown(text) {
  let out = String(text || "")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/`(.+?)`/gs, "$1");

  while (out.includes("**")) {
    out = out.replace(/\*\*/g, "");
  }
  out = out.replace(/(?<!\*)\*(?!\*)/g, "");
  out = out.replace(/`/g, "");
  return out;
}
