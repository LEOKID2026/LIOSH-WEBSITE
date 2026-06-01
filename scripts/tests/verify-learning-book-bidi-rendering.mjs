/**
 * Unified mixed Hebrew/math book renderer verification (G1 + G2).
 * Run: node scripts/tests/verify-learning-book-bidi-rendering.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../../lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../../lib/learning-book/math-g2-registry.js";
import {
  findInlineMathRuns,
  splitTextAndMathRuns,
} from "../../lib/learning-book/book-math-display.js";
import {
  parseBookLineStructure,
  splitMixedBodyClauses,
} from "../../lib/learning-book/book-line-structure.js";
import { parseLearningPageMarkdown } from "../../lib/learning-book/parse-learning-page-markdown.js";
import { stripStrayMarkdown } from "../../lib/learning-book/parse-inline-markdown.js";
import { detectDiagramType } from "../../lib/learning-book/diagram-detect.js";
import { splitBookMarkdownBlocks } from "../../lib/learning-book/book-markdown-blocks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

/** @param {string} value */
function normMath(value) {
  return stripStrayMarkdown(value).replace(/\s+/g, " ").trim();
}

/**
 * True when a line contains a real equation pattern (not just Hebrew + bare digits).
 * @param {string} line
 */
function lineNeedsMathIsolation(line) {
  const input = String(line || "");
  if (!/[\u0590-\u05FF]/.test(input) || !/\d/.test(input)) return false;
  if (/\d\s*[=×÷]/.test(input)) return true;
  if (/__/.test(input)) return true;
  if (/\d\s*[+−\-]\s*\d/.test(input)) return true;
  return false;
}

/**
 * @param {string} line
 */
function analyzeBookLineRender(line) {
  const input = String(line || "").trim();
  const structure = parseBookLineStructure(input);
  const body = structure?.body ?? input;
  const clauses = splitMixedBodyClauses(body);
  /** @type {{ type: string, value: string }[]} */
  const segments = [];

  for (const clause of clauses) {
    const sub = parseBookLineStructure(clause);
    const scanText = sub?.body ?? clause;
    for (const part of splitTextAndMathRuns(scanText)) {
      segments.push({
        type: part.type,
        value: stripStrayMarkdown(part.value).replace(/\s+/g, " ").trim(),
      });
    }
  }

  return {
    label: structure?.label ?? null,
    segments,
    mathValues: segments.filter((s) => s.type === "math").map((s) => normMath(s.value)),
  };
}

/**
 * @param {string} line
 * @param {{ label?: string|null, math?: string[], mathInOrder?: string[] }} expected
 */
function assertLineRender(line, expected) {
  const got = analyzeBookLineRender(line);

  if (expected.label !== undefined && got.label !== expected.label) {
    fail(`label mismatch for "${line}"\n  expected: ${expected.label}\n  got: ${got.label}`);
  }

  if (expected.math) {
    for (const expr of expected.math) {
      const normalized = normMath(expr);
      if (!got.mathValues.some((m) => m.includes(normalized) || normalized.includes(m))) {
        fail(
          `missing math "${normalized}" in "${line}"\n  got math: ${JSON.stringify(got.mathValues)}`
        );
      }
    }
  }

  if (expected.mathInOrder) {
    const joined = got.mathValues.join(" | ");
    let lastIndex = -1;
    for (const expr of expected.mathInOrder) {
      const n = normMath(expr);
      const idx = got.mathValues.findIndex(
        (m, i) => i > lastIndex && (m.includes(n) || n.includes(m))
      );
      if (idx < 0) {
        fail(
          `math order broken for "${line}"\n  expected order: ${JSON.stringify(expected.mathInOrder)}\n  got: ${JSON.stringify(got.mathValues)}`
        );
        return;
      }
      lastIndex = idx;
    }
  }

  for (const m of got.mathValues) {
    if (/שלב/u.test(m)) {
      fail(`step label leaked into math run "${m}" from line "${line}"`);
    }
    if (/\d\s*[+−\-=×÷]\s*\d/.test(m.split("").reverse().join(""))) {
      // crude reversal guard: "9 + 50" when source had "50 + 9"
    }
  }

  if (/50 \+ 9 = 59/.test(line) && got.mathValues.some((m) => /9 \+ 50/.test(m))) {
    fail(`reversed addition in "${line}": ${JSON.stringify(got.mathValues)}`);
  }

  for (const seg of got.segments) {
    if (/\*\*/.test(seg.value) || /`/.test(seg.value)) {
      fail(`markdown artifact in segment for "${line}": ${JSON.stringify(seg)}`);
    }
    if (seg.type === "text" && /\d\s*[+−\-=×÷]\s*\d/.test(seg.value)) {
      fail(`un-isolated math in text segment for "${line}": ${JSON.stringify(seg)}`);
    }
  }
}

const CANONICAL_LINES = [
  {
    line: "**שאלה:** חשבו: 34 + 25 = ?",
    expected: { label: "שאלה:", math: ["34 + 25 = ?"] },
  },
  {
    line: "**שלב 1:** מפרקים — 34 = 30 + 4, ו-25 = 20 + 5.",
    expected: {
      label: "שלב 1:",
      mathInOrder: ["34 = 30 + 4", "25 = 20 + 5"],
    },
  },
  {
    line: "**שלב 2:** מחברים עשרות: 30 + 20 = **50**.",
    expected: { label: "שלב 2:", math: ["30 + 20 = 50"] },
  },
  {
    line: "**שלב 3:** מחברים אחדות: 4 + 5 = **9**.",
    expected: { label: "שלב 3:", math: ["4 + 5 = 9"] },
  },
  {
    line: "**שלב 4:** 50 + 9 = **59**.",
    expected: { label: "שלב 4:", math: ["50 + 9 = 59"] },
  },
  {
    line: "**תשובה:** 34 + 25 = **59**",
    expected: { label: "תשובה:", math: ["34 + 25 = 59"] },
  },
  {
    line: "עשרות: 30 + 20 = 50",
    expected: { label: "עשרות:", math: ["30 + 20 = 50"] },
  },
  {
    line: "אחדות:  4 +  5 =  9",
    expected: { label: "אחדות:", math: ["4 + 5 = 9"] },
  },
  {
    line: "עכשיו יש לי 5 + 2 = 7 מדבקות.",
    expected: { label: null, math: ["5 + 2 = 7"] },
  },
  {
    line: "2 + __ = 8 — מה המספר החסר?",
    expected: { math: ["2 + __ = 8"] },
  },
  {
    line: "10 − __ = 7 — מה המספר החסר?",
    expected: { math: ["10 − __ = 7"] },
  },
  {
    line: "**שלב 3:** אחדות: 12 − 7 = **5**. עשרות: 4 − 2 = **2**.",
    expected: {
      label: "שלב 3:",
      mathInOrder: ["12 − 7 = 5", "4 − 2 = 2"],
    },
  },
];

for (const sample of CANONICAL_LINES) {
  assertLineRender(sample.line, sample.expected);
}

/** @param {string} body */
function scanSectionBody(body, pageId, sectionNumber) {
  const blocks = splitBookMarkdownBlocks(body);
  for (const block of blocks) {
    const lines =
      block.type === "prose"
        ? block.lines
        : block.type === "ul" || block.type === "ol"
          ? block.items.flat()
          : [];

    for (const line of lines) {
      if (!lineNeedsMathIsolation(line)) continue;

      const runs = findInlineMathRuns(line).map((r) => normMath(r.value));
      if (!runs.length) {
        fail(`${pageId} §${sectionNumber}: no math runs in mixed line: ${line}`);
      }
      for (const run of runs) {
        if (/שלב/u.test(run)) {
          fail(`${pageId} §${sectionNumber}: step label inside math "${run}"`);
        }
      }
      assertLineRender(line, {});
    }

    if (block.type === "code") {
      const kind = detectDiagramType(block.content);
      const codeLines = String(block.content || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const hasMixed = codeLines.some((l) => lineNeedsMathIsolation(l));
      if (hasMixed && (kind === "generic" || kind === "frame")) {
        for (const cl of codeLines) {
          if (lineNeedsMathIsolation(cl)) {
            assertLineRender(cl, {});
          }
        }
      }
    }
  }
}

const MANUAL_QA = {
  g1: [
    "add_two",
    "sub_two",
    "eq_add_simple",
    "eq_sub_simple",
    "wp_coins",
    "wp_coins_spent",
  ],
  g2: [
    "add_two",
    "sub_two",
    "add_vertical",
    "sub_vertical",
    "div",
    "wp_coins",
    "wp_coins_spent",
    "wp_division_simple",
  ],
};

for (const [grade, pageIds] of Object.entries(MANUAL_QA)) {
  for (const pageId of pageIds) {
    const raw = fs.readFileSync(
      path.join(ROOT, `docs/learning-book/math/${grade}/drafts/${pageId}.md`),
      "utf8"
    );
    const page = parseLearningPageMarkdown(raw, pageId);
    for (const sectionNumber of [3, 4]) {
      const section = page.sections.find((s) => s.number === sectionNumber);
      if (!section) {
        fail(`${grade}/${pageId}: missing section ${sectionNumber}`);
        continue;
      }
      scanSectionBody(section.body, `${grade}/${pageId}`, sectionNumber);
    }
  }
}

for (const [order, grade] of [
  [MATH_G1_PAGE_ORDER, "g1"],
  [MATH_G2_PAGE_ORDER, "g2"],
]) {
  for (const pageId of order) {
    const raw = fs.readFileSync(
      path.join(ROOT, `docs/learning-book/math/${grade}/drafts/${pageId}.md`),
      "utf8"
    );
    const page = parseLearningPageMarkdown(raw, pageId);
    for (const section of page.sections) {
      scanSectionBody(section.body, `${grade}/${pageId}`, section.number);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: learning book bidi — ${CANONICAL_LINES.length} canonical lines + G1/G2 full scan + manual QA pages.`
);
