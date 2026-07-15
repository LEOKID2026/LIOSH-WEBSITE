/**
 * Structured learning math line templates.
 * Parse known pedagogical patterns into explicit prose (RTL) + math (LTR) runs
 * instead of BiDi guessing on free-form strings.
 */

import {
  isFullEquationLine,
  isMathLikeText,
  hasHebrewMultiEquationTail,
  findInlineMathRuns,
} from "./book-math-display.js";
import { parseBookLineStructure } from "./book-line-structure.js";
import { stripStrayMarkdown } from "./parse-inline-markdown.js";
import { canonicalizePlaceValueDecomposition } from "./place-value-equation-order.js";

/** @typedef {{ type: "prose" | "math", value: string }} TemplateRun */

const LIST_PREFIX_RE = /^((?:[-•*]|\d+[.)])\s+)/u;

/**
 * @param {string} value
 * @returns {TemplateRun}
 */
export function mathRun(value) {
  return {
    type: "math",
    value: canonicalizePlaceValueDecomposition(String(value || "").trim()),
  };
}

/**
 * @param {string} value
 * @returns {TemplateRun}
 */
export function proseRun(value) {
  return { type: "prose", value: String(value || "") };
}

/**
 * @param {string} text
 */
function peelListPrefix(text) {
  const input = String(text || "").trim();
  const m = input.match(LIST_PREFIX_RE);
  if (!m) return { prefix: null, rest: input };
  return { prefix: m[1], rest: input.slice(m[0].length).trim() };
}

const NUM = String.raw`\d+(?:,\d+)*`;

/**
 * Canonicalize equations so blank/? stays on the RHS: 20 + 10 = ?
 * @param {string} body
 */
function canonicalizeBlankEquation(body) {
  const line = String(body || "").trim();
  const reversed = line.match(/^(\?|__)\s*=\s*(.+)$/u);
  if (reversed) return `${reversed[2].trim()} = ?`;
  return line;
}

const TAIL_MATH_OP = /\d\s*[=+\-−×÷<>]\s*\d|\d\s*[=+\-−×÷<>]\s*(?:__|\?)/u;

/**
 * Split a trailing math/prose mix into runs, isolating each equation as LTR math.
 * Used so equations after a Hebrew connector are never stranded in RTL prose.
 * @param {string} tail
 * @returns {TemplateRun[]}
 */
export function splitTailToRuns(tail) {
  const input = String(tail || "");
  if (!input) return [];
  const ms = findInlineMathRuns(input);
  if (!ms.length) return [proseRun(input)];

  /** @type {TemplateRun[]} */
  const runs = [];
  let last = 0;
  for (const m of ms) {
    if (m.start > last) runs.push(proseRun(input.slice(last, m.start)));
    runs.push(mathRun(m.value));
    last = m.end;
  }
  if (last < input.length) runs.push(proseRun(input.slice(last)));
  return runs;
}

/**
 * X% מ-Y = Z   /   ❌ 25% מ-80 = 55 — חיסרו 25   /   50% מ-60 = 30 (חצי)
 * Percent stays its own math island, "מ-" stays prose, the quantity/equation
 * after it is isolated as math so it never reverses inside RTL prose.
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parsePercentOfRuns(text) {
  const body = stripStrayMarkdown(text).trim();
  const { prefix, rest } = peelListPrefix(body);

  let marker = "";
  let core = rest;
  const mk = core.match(/^([❌✓✔✗×]\s+)/u);
  if (mk) {
    marker = mk[1];
    core = core.slice(mk[1].length);
  }

  const m = core.match(/^(\d+(?:[.,]\d+)?%)\s*(מ-?)\s*(\d[\s\S]*)$/u);
  if (!m) return null;

  const tail = m[3].trim();
  // Lone quantity (no operator) is safe as prose — leave to default handling.
  if (!TAIL_MATH_OP.test(tail)) return null;

  /** @type {TemplateRun[]} */
  const runs = [];
  if (prefix) runs.push(proseRun(prefix));
  if (marker) runs.push(proseRun(marker));
  runs.push(mathRun(m[1]));
  runs.push(proseRun(` ${m[2]}`));
  runs.push(...splitTailToRuns(tail));
  return runs;
}

/**
 * איזה מספר נמצא 3 צעדים ימינה מ-2?
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseNumberLineStepsQuestionRuns(text) {
  const body = stripStrayMarkdown(text).trim();
  const m =
    body.match(
      /^(איזה מספר נמצא\s+)(\d+)(\s+צעדים\s+ימינה\s+מ-)(\d+)(\?\s*)$/u
    ) ||
    body.match(
      /^(איזה מספר נמצא\s+)(\d+)(\s+צעדים\s+שמאלה\s+מ-)(\d+)(\?\s*)$/u
    );
  if (!m) return null;
  return [
    proseRun(m[1]),
    mathRun(m[2]),
    proseRun(m[3]),
    mathRun(m[4]),
    proseRun(m[5]),
  ];
}

/**
 * 12 < 18 — 12 קטן מ-18 / 15 = 15 — 15 שווה ל-15
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseComparisonDisplayRuns(text) {
  const body = stripStrayMarkdown(text)
    .trim()
    .replace(LIST_PREFIX_RE, "")
    .trim()
    .replace(/["״""]/gu, "");
  let m = body.match(
    /^(\d+)\s*([<>])\s*(\d+)\s*[–-]\s*(\d+)\s+(קטן|גדול)\s+מ-(\d+)\s*$/u
  );
  if (m) {
    return [
      mathRun(`${m[1]} ${m[2]} ${m[3]}`),
      proseRun(" - " + m[4] + " " + m[5] + " מ-" + m[6]),
    ];
  }
  m = body.match(/^(\d+)\s*=\s*(\d+)\s*[–-]\s*(\d+)\s+שווה\s+ל-(\d+)\s*$/u);
  if (m) {
    return [
      mathRun(`${m[1]} = ${m[2]}`),
      proseRun(" - " + m[3] + " שווה ל-" + m[4]),
    ];
  }
  return null;
}

/**
 * 7 + 3 = 10, ואז 10 + 3 = 13
 * @param {string} body
 * @returns {TemplateRun[]|null}
 */
export function parseMakeTenSequenceBody(body) {
  const line = stripStrayMarkdown(body).trim().replace(/\.$/, "");
  const m = line.match(/^(.+?\d\s*=\s*\d+)\s*,\s*ואז\s+(.+)$/u);
  if (!m) return null;
  const eq1 = canonicalizeBlankEquation(m[1].trim());
  const eq2 = canonicalizeBlankEquation(m[2].trim());
  if (!isMathLikeText(eq1) || !isMathLikeText(eq2)) return null;
  return [mathRun(eq1), proseRun(", ואז "), mathRun(eq2)];
}

/**
 * **שלב 2:** מ-6 נשארו 3 (6 = 3 + 3)
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledMakeTenRemainderRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;
  const line = stripStrayMarkdown(structure.body).trim();
  const m = line.match(/^(מ-)(\d+)(\s+נשארו\s+)(\d+)(\s+\()(.+?)(\))\s*$/u);
  if (!m) return null;
  const eq = canonicalizeBlankEquation(m[6].trim());
  if (!isMathLikeText(eq)) return null;
  return [
    proseRun(structure.label),
    proseRun(m[1]),
    mathRun(m[2]),
    proseRun(m[3]),
    mathRun(m[4]),
    proseRun(m[5]),
    mathRun(eq),
    proseRun(m[7]),
  ];
}

/**
 * **שלב 1:** 7 צריך 3 כדי להגיע ל-10 (זוג של 7 הוא 3)
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledMakeTenNeedRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;
  const line = stripStrayMarkdown(structure.body).trim();
  const m = line.match(/^(\d+)(\s+צריך\s+)(\d+)(\s+כדי להגיע ל-)(\d+)(\s+\()(.+?)(\))\s*$/u);
  if (!m) return null;
  return [
    proseRun(structure.label),
    mathRun(m[1]),
    proseRun(m[2]),
    mathRun(m[3]),
    proseRun(m[4]),
    mathRun(m[5]),
    proseRun(m[6] + m[7] + m[8]),
  ];
}

/**
 * **שלב 3:** 7 + 3 = 10, ואז 10 + 3 = 13
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledMakeTenSequenceRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;
  const core = parseMakeTenSequenceBody(structure.body);
  if (!core) return null;
  return [proseRun(structure.label), ...core];
}

/**
 * ציר מספרים — 12 ו-18:
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseTitleNumberPairRuns(text) {
  const line = stripStrayMarkdown(text).trim();
  const m = line.match(/^(.+?[–-]\s*)(\d+)(\s+ו-\s*)(\d+)(\s*:?\s*)$/u);
  if (!m || !/[\u0590-\u05FF]/.test(m[1])) return null;
  return [
    proseRun(m[1]),
    mathRun(m[2]),
    proseRun(m[3]),
    mathRun(m[4]),
    proseRun(m[5]),
  ];
}

/**
 * 20 = 2 מקלי עשרת / 10 = מקל עשרת אחד / 2 מקלי עשרת ועוד ... = 3 מקלי עשרת
 * @param {string} body
 * @returns {TemplateRun[]|null}
 */
export function parseTenRodsEquationBody(body) {
  const line = stripStrayMarkdown(body)
    .trim()
    .replace(/\.$/, "")
    .replace(/\s*→\s*.+$/, "")
    .trim();

  let m = line.match(/^(\d+)\s*=\s*(\d+)\s+(מקלי?\s+עשרת)\s*$/u);
  if (m) {
    return [mathRun(`${m[1]} = ${m[2]}`), proseRun(` ${m[3]}`)];
  }

  m = line.match(/^(\d+)\s*=\s*(מקל\s+עשרת\s+אחד)\s*$/u);
  if (m) {
    return [mathRun(`${m[1]} =`), proseRun(` ${m[2]}`)];
  }

  m = line.match(
    /^(\d+)\s+(מקלי?\s+עשרת)\s+ועוד\s+(מקל\s+עשרת\s+אחד)\s*=\s*(\d+)\s+(מקלי?\s+עשרת)\s*$/u
  );
  if (m) {
    return [
      mathRun(m[1]),
      proseRun(" " + m[2] + " ועוד " + m[3] + " = "),
      mathRun(m[4]),
      proseRun(` ${m[5]}`),
    ];
  }

  m = line.match(
    /^(\d+)\s+(מקלי?\s+עשרת)\s*\+\s*(מקל\s+עשרת\s+אחד)\s*=\s*(\d+)\s+(מקלי?\s+עשרת)\s*$/u
  );
  if (m) {
    return [
      mathRun(m[1]),
      proseRun(" " + m[2] + " + " + m[3] + " = "),
      mathRun(m[4]),
      proseRun(` ${m[5]}`),
    ];
  }

  return null;
}

/**
 * **שלב 1:** 20 = 2 מקלי עשרת
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledTenRodsRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;
  const core = parseTenRodsEquationBody(structure.body);
  if (!core) return null;
  return [proseRun(structure.label), ...core];
}

/**
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseTenRodsEquationRuns(text) {
  const body = stripStrayMarkdown(text).trim().replace(LIST_PREFIX_RE, "").trim();
  return parseTenRodsEquationBody(body);
}

/**
 * **שאלה:** 20 + 10 = ?
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledEquationRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;
  const body = stripStrayMarkdown(structure.body).trim().replace(/\.$/, "");
  if (/,\s*ואז\s+/.test(body)) return null;
  if (/[–-]\s*\d+\s+(?:קטן|גדול|שווה)\s+מ/u.test(body)) return null;
  if (parseMakeTenSequenceBody(body)) return null;
  if (/[\u0590-\u05FF]/.test(body)) return null;
  if (!isFullEquationLine(body) && !isMathLikeText(body)) return null;
  return [proseRun(structure.label), mathRun(canonicalizeBlankEquation(body))];
}

/**
 * @param {string} body
 */
function isLabeledMathBody(body) {
  const line = stripStrayMarkdown(body).trim().replace(/\.$/, "");
  if (!line || /גדול\s+מ|קטן\s+מ/u.test(line)) return false;
  if (/^\d+\s*[<>]\s*\d+\s*→/u.test(line)) return false;
  if (/,\s*ואז\s+/.test(line)) return false;
  if (/[\u0590-\u05FF]/.test(line)) return false;
  if (hasHebrewMultiEquationTail(line)) return false;
  return isFullEquationLine(line) || isMathLikeText(line);
}

/**
 * עשרות: 30 + 20 = 50
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledMathRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body || !isLabeledMathBody(structure.body)) return null;

  const body = stripStrayMarkdown(structure.body).trim().replace(/\.$/, "");
  return [proseRun(structure.label), mathRun(body)];
}

/**
 * 8 + 7 = 15 → 5, נשיאה 1
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseArrowCarryRuns(text) {
  const input = String(text || "");
  const match = input.match(
    /^([\d\s+−\-=×÷→←.,]+?)\s*(,\s*[\u0590-\u05FF][\s\S]*)$/u
  );
  if (!match?.[1] || !/→/.test(match[1]) || !/=\s*\d/.test(match[1])) {
    return null;
  }
  return [mathRun(match[1].trim()), proseRun(match[2])];
}

/**
 * 735 גדול מ-708 → 735 > 708
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseComparisonConclusionRuns(text) {
  let label = null;
  let body = stripStrayMarkdown(text).trim();

  const structure = parseBookLineStructure(text);
  if (structure?.body) {
    label = structure.label;
    body = stripStrayMarkdown(structure.body).trim();
  }

  const tryBody = (rest) => {
    const arrow = rest.match(
      new RegExp(
        `^(${NUM})\\s+(גדול|קטן)\\s+מ-?\\s*(${NUM})\\s*→\\s*(${NUM})\\s*([<>＝=])\\s*(${NUM})\\s*$`
      )
    );
    const hence = rest.match(
      new RegExp(
        `^(${NUM})\\s+(גדול|קטן)\\s+מ-?\\s*(${NUM})\\s*,?\\s*לכן:\\s*(${NUM})\\s*([<>＝=])\\s*(${NUM})\\s*$`
      )
    );
    const m = arrow || hence;
    if (!m) return null;
    const [, a, adj, b, left, op, right] = m;
    const sign = op === "＝" ? "=" : op;
    return [
      proseRun(`${a} ${adj} מ-${b}, לכן: `),
      mathRun(`${left} ${sign} ${right}`),
    ];
  };

  const { prefix, rest } = peelListPrefix(body);
  const core = tryBody(rest);
  if (!core) return null;

  /** @type {TemplateRun[]} */
  const runs = [];
  if (prefix) runs.push(proseRun(prefix));
  if (label) runs.push(proseRun(label));
  runs.push(...core);
  return runs;
}

/**
 * עשרות: 1 < 2 → 612 קטן מ-628
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseLabeledDigitComparisonRuns(text) {
  const structure = parseBookLineStructure(text);
  if (!structure?.body) return null;

  const body = stripStrayMarkdown(structure.body).trim();
  const m = body.match(/^(\d+)\s*([<>])\s*(\d+)\s*→\s*(.+)$/);
  if (!m) return null;

  const tail = m[4].trim();
  /** @type {TemplateRun[]} */
  const runs = [
    proseRun(structure.label),
    mathRun(`${m[1]} ${m[2]} ${m[3]}`),
  ];

  // The arrow tail can itself contain equations (e.g. "שואלים → 10 − 5 = 5").
  // Isolate every equation as LTR math so it never reverses inside RTL prose.
  if (TAIL_MATH_OP.test(tail)) {
    runs.push(proseRun("→ "));
    runs.push(...splitTailToRuns(tail));
  } else {
    runs.push(proseRun(`→ ${tail}`));
  }
  return runs;
}

/**
 * Build comparison conclusion from parts (generators / future API).
 * @param {{ left: number|string, right: number|string, relation: "gt"|"lt"|"eq" }} p
 * @returns {TemplateRun[]}
 */
export function buildComparisonConclusionRuns({ left, right, relation }) {
  const a = String(left);
  const b = String(right);
  if (relation === "gt") {
    return [
      proseRun(`${a} גדול מ-${b}, לכן: `),
      mathRun(`${a} > ${b}`),
    ];
  }
  if (relation === "lt") {
    return [
      proseRun(`${a} קטן מ-${b}, לכן: `),
      mathRun(`${a} < ${b}`),
    ];
  }
  return [proseRun(`${a} שווה ל-${b}, לכן: `), mathRun(`${a} = ${b}`)];
}

/**
 * @param {string} text
 * @returns {TemplateRun[]|null}
 */
export function parseTemplateRuns(text) {
  const input = String(text || "");
  if (!input.trim()) return null;

  return (
    parsePercentOfRuns(input) ||
    parseNumberLineStepsQuestionRuns(input) ||
    parseComparisonDisplayRuns(input) ||
    parseTitleNumberPairRuns(input) ||
    parseLabeledMakeTenNeedRuns(input) ||
    parseLabeledMakeTenRemainderRuns(input) ||
    parseLabeledMakeTenSequenceRuns(input) ||
    parseLabeledTenRodsRuns(input) ||
    parseTenRodsEquationRuns(input) ||
    parseLabeledEquationRuns(input) ||
    parseLabeledMathRuns(input) ||
    parseComparisonConclusionRuns(input) ||
    parseLabeledDigitComparisonRuns(input) ||
    parseArrowCarryRuns(input) ||
    null
  );
}

/**
 * Flatten template runs to visible child-facing string (verification).
 * @param {TemplateRun[]} runs
 */
export function flattenTemplateRuns(runs) {
  return runs
    .map((r) => r.value.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Patterns that must never appear in learning math output. */
export const FORBIDDEN_LEARNING_MATH_STRINGS = [
  "58 = 50 + 8",
  "37 = 30 + 7",
  "68 = 60 + 8",
  "24 = 20 + 4",
  "124 = 100 + 20 + 4",
  "405 = 400 + 0 + 5",
  "80 + 5 + 1 = 95",
  "80 + 2 + 1 = 92",
  "צעדים ימינה מ-2 3",
  "? = 20 + 10",
  "5030 + 20",
  "3020 + 10",
  "4060 - 20",
  "5950 + 9",
  "4440 + 4",
  "24זוגי",
  "35אי-זוגי",
  "2552 - 27",
  "246 + 6 + 6",
  "137 + 6",
  "10 + 133",
];

/**
 * @param {string} rendered
 */
export function assertNotForbiddenLearningMath(rendered) {
  const norm = String(rendered || "").replace(/\s+/g, " ").trim();
  for (const bad of FORBIDDEN_LEARNING_MATH_STRINGS) {
    if (norm.includes(bad)) {
      throw new Error(`forbidden learning math string: "${bad}" in "${norm}"`);
    }
  }
}
