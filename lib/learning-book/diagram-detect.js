/**
 * Detect diagram type from fenced code block content (UI only).
 */

/**
 * @param {string} content
 * @returns {'number_line' | 'objects' | 'frame' | 'cards' | 'coins' | 'frame_text' | 'generic'}
 */
export function detectDiagramType(content) {
  const lines = String(content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return "generic";

  const joined = lines.join("\n");

  if (/[┌├│└┴┬┤┘]/.test(joined)) return "frame";
  if (/^מה (יודעים|מבקשים|עושים)/m.test(joined)) return "frame_text";
  if (/₪/.test(joined)) return "coins";
  if (/^\[/.test(lines[0]) && /\]/.test(lines[0])) return "cards";
  if (/[●★✕]/.test(joined) && (/[=+−\-]/.test(joined) || /←/.test(joined))) {
    return "objects";
  }
  if (
    lines.some(
      (l) =>
        /^\d+\s*[—–\-]\s*\d+/.test(l) ||
        /^…\s*\d+\s*[—–\-]/.test(l) ||
        (/\d+\s*[—–\-]\s*\[\d+\]/.test(l) && !/[●★]/.test(l))
    )
  ) {
    return "number_line";
  }

  return "generic";
}

/**
 * Parse a number-line row into tokens.
 * @param {string} line
 */
export function parseNumberLineTokens(line) {
  const parts = String(line || "")
    .split(/\s*[—–\-]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.map((part) => {
    const bracket = part.match(/^\[(\d+)\]$/);
    if (bracket) return { type: "num", value: bracket[1], highlight: true };
    if (part === "…" || part === "...") return { type: "ellipsis", value: part };
    if (/^\d+$/.test(part)) return { type: "num", value: part, highlight: false };
    return { type: "raw", value: part };
  });
}

/**
 * Split an object-diagram row into groups (dots, operators, labels).
 * @param {string} line
 */
export function parseObjectDiagramGroups(line) {
  const groups = [];
  const re =
    /([●★]+(?:\s+[●★]+)*|✕(?:\s+✕)*|[+−\-=←→]+|←\s*\d+|←|\d+|\S+)/g;
  let match;

  while ((match = re.exec(line)) !== null) {
    const token = match[0].trim();
    if (!token) continue;
    if (/^[●★]/.test(token)) {
      groups.push({ type: "dots", value: token.replace(/\s/g, "").split("") });
    } else if (/^✕/.test(token)) {
      groups.push({ type: "cross", value: token.replace(/\s/g, "").split("") });
    } else if (/^[+−\-=→←]$/.test(token) || token === "+") {
      groups.push({ type: "op", value: token });
    } else if (/^\d+$/.test(token)) {
      groups.push({ type: "num", value: token });
    } else if (token.startsWith("←")) {
      groups.push({ type: "label", value: token });
    } else {
      groups.push({ type: "label", value: token });
    }
  }

  return groups;
}
