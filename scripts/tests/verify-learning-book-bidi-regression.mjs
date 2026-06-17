/**
 * Regression fixtures for Grade 2 RTL/BiDi failures and geometry mixed text.
 * Run: node scripts/tests/verify-learning-book-bidi-regression.mjs
 */
import {
  splitTextAndMathRuns,
  findInlineMathRuns,
} from "../../lib/learning-book/book-math-display.js";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import {
  analyzeBidiRenderStructure,
  assertBidiMathOrder,
  hasProseBetweenMathRuns,
} from "../../lib/learning-book/book-bidi-render.js";
import { describeMixedMathDomContract, hasForbiddenTokenSplit } from "../../lib/bidi/describe-mixed-math-dom.js";
import {
  isPipeTableBlock,
  parsePipeTable,
} from "../../lib/learning-book/book-pipe-table.js";
import { splitBookMarkdownBlocks } from "../../lib/learning-book/book-markdown-blocks.js";
import { flattenMixedHebrewMathVisibleText } from "../../lib/learning-book/book-visible-text-render.js";
import { stripStrayMarkdown } from "../../lib/learning-book/parse-inline-markdown.js";

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

function norm(v) {
  return stripStrayMarkdown(v).replace(/\s+/g, " ").trim();
}

/** @param {string} line @param {string[]} expectedMath */
function assertMathRuns(line, expectedMath) {
  const runs = findInlineMathRuns(line).map((r) => norm(r.value));
  for (const exp of expectedMath) {
    const n = norm(exp);
    if (!runs.some((r) => r.includes(n) || n.includes(r))) {
      fail(`missing math run "${n}" in "${line}"\n  got: ${JSON.stringify(runs)}`);
    }
  }
}

/** @param {string} line */
function assertNoUnisolatedMath(line) {
  for (const run of splitMixedHebrewMathRuns(line)) {
    if (
      run.type === "prose" &&
      /\d\s*[+−\-=×÷→←<>]\s*\d/.test(run.value) &&
      !/^[-•*\d.)]+\s*$/.test(run.value.trim())
    ) {
      fail(`un-isolated math in prose for "${line}": ${JSON.stringify(run.value)}`);
    }
  }
}

/** @param {string} line @param {number} minRtlIsolated */
function assertRtlIsolation(line, minRtlIsolated = 1) {
  const structure = analyzeBidiRenderStructure(line);
  const rtlRuns = structure.filter((r) => r.dir === "rtl");
  if (hasProseBetweenMathRuns(line) && rtlRuns.length < minRtlIsolated) {
    fail(
      `expected RTL isolation for "${line}"\n  structure: ${JSON.stringify(structure)}`
    );
  }
}

const REGRESSION_LINES = [
  {
    line: "68 − 24 = ?",
    math: ["68 − 24 = ?"],
    order: ["68 − 24 = ?"],
  },
  {
    line: "**שלב 1:** מפרקים — 68 = 60 + 8, ו-24 = 20 + 4.",
    math: ["60 + 8 = 68", "20 + 4 = 24"],
    order: ["60 + 8 = 68", "20 + 4 = 24"],
    rtlMin: 2,
  },
  {
    line: "68 = 60 + 8, ו-24 = 20 + 4",
    math: ["60 + 8 = 68", "20 + 4 = 24"],
    order: ["60 + 8 = 68", "20 + 4 = 24"],
    rtlMin: 1,
  },
  {
    line: "60 − 20 = 40",
    math: ["60 − 20 = 40"],
    order: ["60 − 20 = 40"],
  },
  {
    line: "8 − 4 = 4",
    math: ["8 − 4 = 4"],
    order: ["8 − 4 = 4"],
  },
  {
    line: "68 − 24 = 44",
    math: ["68 − 24 = 44"],
    order: ["68 − 24 = 44"],
  },
  {
    line: "58 + 37 = 95",
    math: ["58 + 37 = 95"],
    order: ["58 + 37 = 95"],
  },
  {
    line: "8 + 5 = 8 + 2 + 3 = 10 + 3 = 13",
    math: ["8 + 5 = 8 + 2 + 3 = 10 + 3 = 13"],
    order: ["8 + 5 = 8 + 2 + 3 = 10 + 3 = 13"],
  },
  {
    line: "612 < 628",
    math: ["612 < 628"],
    order: ["612 < 628"],
  },
  {
    line: "628 > 612",
    math: ["628 > 612"],
    order: ["628 > 612"],
  },
  {
    line: "700 = 700",
    math: ["700 = 700"],
    order: ["700 = 700"],
  },
  {
    line: "- 612 **<** 628",
    math: ["612 < 628"],
    order: ["612 < 628"],
  },
  {
    line: "עשרות: 60 − 20 = 40",
    math: ["60 − 20 = 40"],
    order: ["60 − 20 = 40"],
  },
  {
    line: "אחדות: 8 − 4 = 4",
    math: ["8 − 4 = 4"],
    order: ["8 − 4 = 4"],
  },
  {
    line: "בשיעור: π ≈ 3.14.",
    math: ["π ≈ 3.14"],
    order: ["π ≈ 3.14"],
    rtlMin: 1,
  },
  {
    line: "1 מאה + 2 עשרות + 4 אחדות = 124",
    math: ["1 מאה + 2 עשרות + 4 אחדות = 124"],
    order: ["124"],
    rtlMin: 0,
  },
  {
    line: "- 1 מאה + 2 עשרות + 4 אחדות = 124",
    math: ["1 מאה + 2 עשרות + 4 אחדות = 124"],
    order: ["124"],
    rtlMin: 0,
  },
  {
    line: "8 + 7 = 15 → 5, נשיאה 1",
    math: ["8 + 7 = 15 → 5"],
    order: ["8 + 7 = 15 → 5"],
    rtlMin: 1,
  },
];

for (const sample of REGRESSION_LINES) {
  assertMathRuns(sample.line, sample.math);
  assertNoUnisolatedMath(sample.line);
  assertRtlIsolation(sample.line, sample.rtlMin ?? 0);
  try {
    assertBidiMathOrder(sample.line, sample.order);
  } catch (e) {
    fail(e.message);
  }

  if (hasForbiddenTokenSplit(sample.line)) {
    fail(`token-split math detected for "${sample.line}"`);
  }
  const roles = analyzeBidiRenderStructure(sample.line).map((r) => r.role);
  if (roles.some((r) => /^(digit|formula-op|formula-symbol|formula-term)$/.test(r))) {
    fail(`legacy token-split roles in "${sample.line}": ${JSON.stringify(roles)}`);
  }

  const flat = flattenMixedHebrewMathVisibleText(sample.line);
  for (const m of sample.math) {
    if (!flat.includes(norm(m).replace(/\*\*/g, ""))) {
      fail(`flatten lost math "${m}" from "${sample.line}"\n  flat: ${flat}`);
    }
  }
}

const GEOMETRY_LINES = [
  "זווית ישרה = 90°",
  "קווים מקבילים — ∥",
  "קווים מאונכים — ⊥",
  "אלכסון = קו שמחבר שני קודקודים שאינם על אותה צלע",
  "גובה = המרחק האנכי מקודקוד לבסיס",
  "היקף = סכום אורכי כל הצלעות",
  "שטח = 5 × 4 = 20",
  "נפח = 3 × 4 × 5 = 60",
];

for (const line of GEOMETRY_LINES) {
  assertNoUnisolatedMath(line);
  const flat = flattenMixedHebrewMathVisibleText(line);
  if (!flat.trim()) {
    fail(`geometry line flattened empty: "${line}"`);
  }
}

const PIPE_TABLE_MD = `| | מאות | עשרות | אחדות |
|---|------|-------|-------|
| 612 | 6 | 1 | 2 |
| 628 | 6 | 2 | 8 |`;

const tableLines = PIPE_TABLE_MD.split("\n");
if (!isPipeTableBlock(tableLines)) {
  fail("pipe table not detected");
}
const parsed = parsePipeTable(tableLines);
if (!parsed || parsed.rows.length !== 2) {
  fail(`pipe table parse failed: ${JSON.stringify(parsed)}`);
}

const blocks = splitBookMarkdownBlocks(PIPE_TABLE_MD);
const tableBlock = blocks.find((b) => b.type === "pipe_table");
if (!tableBlock) {
  fail(`pipe table block not emitted: ${JSON.stringify(blocks.map((b) => b.type))}`);
}
if (tableBlock.rows[0][0] !== "612") {
  fail(`pipe table first cell wrong: ${JSON.stringify(tableBlock.rows[0])}`);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: BiDi regression — ${REGRESSION_LINES.length} math fixtures + ${GEOMETRY_LINES.length} geometry lines + pipe table.`
);
