/**
 * Detect diagram type from fenced code block content (UI only).
 */

const PLACE_VALUE_LABELS = ["מאות", "עשרות", "אחדות"];

/**
 * Split a box-drawing table row into trimmed cell strings.
 * @param {string} line
 * @returns {string[]}
 */
function splitBoxTableRow(line) {
  return String(line || "")
    .split("│")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

/**
 * @param {string} cell
 */
function isPlaceValueDigitCell(cell) {
  return /^\d+$/.test(String(cell || "").trim());
}

/**
 * @param {string[]} cells
 */
function rowHasPlaceValueLabels(cells) {
  return cells.some((cell) =>
    PLACE_VALUE_LABELS.some((label) => String(cell).includes(label))
  );
}

/**
 * Parse place-value ASCII tables (Hebrew headers + digits per column).
 * Returns null when the block is not a recognized place-value table.
 * @param {string} content
 * @returns {{ columns: { label: string, digit: string }[], equation: string|null }|null}
 */
export function parsePlaceValueDiagram(content) {
  const lines = String(content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length || !/[┌├│└┴┬┤┘]/.test(lines.join("\n"))) {
    return null;
  }

  /** @type {string[][]} */
  const pipeRows = [];
  /** @type {string|null} */
  let equation = null;

  for (const line of lines) {
    if (line.includes("│")) {
      const cells = splitBoxTableRow(line);
      if (cells.length) pipeRows.push(cells);
      continue;
    }
    const eqMatch = line.match(/=\s*(\d+)/);
    if (eqMatch) {
      equation = eqMatch[1];
    }
  }

  if (pipeRows.length < 2) return null;

  const headerIndex = pipeRows.findIndex((row) => rowHasPlaceValueLabels(row));
  if (headerIndex < 0) return null;

  const headerCells = pipeRows[headerIndex];
  const digitRow = pipeRows.slice(headerIndex + 1).find(
    (row) =>
      row.length === headerCells.length && row.every((cell) => isPlaceValueDigitCell(cell))
  );
  if (!digitRow) return null;

  const columns = headerCells.map((label, i) => ({
    label: label.trim(),
    digit: digitRow[i].trim(),
  }));

  return { columns, equation };
}

/**
 * @param {string} content
 * @returns {'number_line' | 'objects' | 'frame' | 'cards' | 'coins' | 'frame_text' | 'place_value' | 'generic'}
 */
export function detectDiagramType(content) {
  const lines = String(content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return "generic";

  const joined = lines.join("\n");

  if (/[┌├│└┴┬┤┘]/.test(joined)) {
    if (parsePlaceValueDiagram(joined)) return "place_value";
    return "frame";
  }
  if (/^מה (יודעים|מבקשים|עושים)/m.test(joined)) return "frame_text";
  if (/₪/.test(joined)) return "coins";
  if (/^\[/.test(lines[0]) && /\]/.test(lines[0])) return "cards";
  if (/[●★✕]/.test(joined) && (/[=+−\-]/.test(joined) || /←/.test(joined))) {
    return "objects";
  }
  if (
    lines.some(
      (l) =>
        /^\d+\s*[-–\-]\s*\d+/.test(l) ||
        /^…\s*\d+\s*[-–\-]/.test(l) ||
        (/\d+\s*[-–\-]\s*\[\d+\]/.test(l) && !/[●★]/.test(l))
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
    .split(/\s*[-–\-]\s*/)
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

/**
 * Parse a diagram row that contains only spaced digits (e.g. "4   3   7").
 * @param {string} line
 * @returns {number[]|null}
 */
export function parseDiagramNumberRow(line) {
  const trimmed = String(line || "").trim();
  if (!/^\d+(?:\s+\d+)+\s*$/.test(trimmed)) return null;
  return trimmed.split(/\s+/).map((n) => Number(n));
}

/**
 * Build a readable equation from a visual diagram row and its numeric labels.
 * @param {string} visualLine
 * @param {number[]} numbers
 * @returns {string|null}
 */
export function inferDiagramEquation(visualLine, numbers) {
  if (!numbers?.length) return null;
  const visual = String(visualLine || "");
  const tokens = visual.match(/[+−\-=×÷?]/g) || [];
  const hasQuestion = visual.includes("?");
  const hasPlus = tokens.includes("+");
  const hasMinus = tokens.includes("−") || tokens.includes("-");
  const hasTimes = tokens.includes("×");

  if (hasQuestion && numbers.length >= 2) {
    if (hasTimes && numbers.length === 2) {
      return `${numbers[0]} × ${numbers[1]} = ?`;
    }
    if (hasMinus && !hasPlus && numbers.length === 2) {
      return `${numbers[0]} − ${numbers[1]} = ?`;
    }
    return `${numbers.join(" + ")} = ?`;
  }

  if (numbers.length >= 3 && tokens.includes("=")) {
    const result = numbers[numbers.length - 1];
    const parts = numbers.slice(0, -1);
    if (hasPlus) return `${parts.join(" + ")} = ${result}`;
    if (hasMinus && parts.length === 2) {
      return `${parts[0]} − ${parts[1]} = ${result}`;
    }
  }

  if (numbers.length === 2 && hasPlus) {
    return `${numbers[0]} + ${numbers[1]} = ${numbers[0] + numbers[1]}`;
  }

  if (numbers.length === 2 && hasMinus) {
    return `${numbers[0]} − ${numbers[1]} = ${numbers[0] - numbers[1]}`;
  }

  return null;
}

/**
 * Build equation from object/dot visual row (e.g. 4 dots + 3 dots = 7 dots).
 * @param {string} visualLine
 * @returns {string|null}
 */
export function inferEquationFromObjectVisual(visualLine) {
  const visual = String(visualLine || "");
  if (!/[+−\-=×]/.test(visual)) return null;

  const groups = parseObjectDiagramGroups(visual);
  if (!groups.some((g) => g.type === "op" && /[+−\-=×]/.test(g.value))) {
    return null;
  }

  /** @type {{ kind: 'num' | 'op', value: string | number }[]} */
  const tokens = [];

  for (const g of groups) {
    if (g.type === "dots" || g.type === "cross") {
      tokens.push({ kind: "num", value: g.value.length });
    } else if (g.type === "num") {
      tokens.push({ kind: "num", value: Number(g.value) });
    } else if (g.type === "op") {
      tokens.push({ kind: "op", value: g.value });
    }
  }

  if (tokens.length < 3) return null;
  if (!tokens.some((t) => t.kind === "op")) return null;

  let expr = String(tokens[0].value);
  for (let i = 1; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok.kind === "op") {
      expr += ` ${tok.value} `;
    } else {
      expr += tok.value;
    }
  }

  return expr.replace(/\s+/g, " ").trim();
}
