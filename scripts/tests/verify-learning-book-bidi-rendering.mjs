/**
 * Unified mixed Hebrew/math book renderer verification (G1 + G2).
 * Run: node scripts/tests/verify-learning-book-bidi-rendering.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../../lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../../lib/learning-book/math-g2-registry.js";
import { MATH_G3_PAGE_ORDER } from "../../lib/learning-book/math-g3-registry.js";
import { MATH_G4_PAGE_ORDER } from "../../lib/learning-book/math-g4-registry.js";
import { MATH_G5_PAGE_ORDER } from "../../lib/learning-book/math-g5-registry.js";
import { MATH_G6_PAGE_ORDER } from "../../lib/learning-book/math-g6-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "../../lib/learning-book/geometry-g4-registry.js";
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
  if (/\d{1,3}(?:,\d{3})+/.test(input)) return true;
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

  for (const m of got.mathValues) {
    if (/000,1/.test(m) || /000,10/.test(m)) {
      fail(`reversed thousands separator in "${line}": ${JSON.stringify(got.mathValues)}`);
    }
  }

  if (/\d{1,3},\d{3}/.test(line) && /[÷×=+\-−]/.test(line)) {
    if (
      got.mathValues.length > 1 &&
      /^\d{1,3},\d{3}$/.test(got.mathValues[0])
    ) {
      const bare = got.mathValues[0];
      const start = line.indexOf(bare);
      if (start >= 0) {
        const afterBare = line.slice(start + bare.length);
        if (/^\s*[÷×=+−\-]/.test(afterBare)) {
          fail(
            `fragmented comma-thousands expression in "${line}": ${JSON.stringify(got.mathValues)}`
          );
        }
      }
    }
  }

  if (/÷/.test(line) && got.mathValues.some((m) => /÷/.test(m))) {
    for (const m of got.mathValues) {
      if (/÷/.test(m) && !/^[\d_?]/.test(m.trim())) {
        fail(`orphan division operator in math run "${m}" from "${line}"`);
      }
    }
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
  {
    line: "היום נלמד לקרוא מספרים **עד 1,000** ולזהות",
    expected: { math: ["1,000"] },
  },
  {
    line: "עד 1,000",
    expected: { math: ["1,000"] },
  },
  {
    line: "מספרים עד 1,000",
    expected: { math: ["1,000"] },
  },
  {
    line: "מאות, עשרות ואחדות — עד 1,000",
    expected: { math: ["1,000"] },
  },
  {
    line: "לפני **1,000** אין שכן \"אחרי\" בתוך הטווח שלנו — רק עד 999.",
    expected: { math: ["1,000"] },
  },
  {
    line: "כפל במאות (למשל 5 × 200)",
    expected: { math: ["5 × 200"] },
  },
  {
    line: "1,247 ÷ 8:",
    expected: { math: ["1,247 ÷ 8:"] },
  },
  {
    line: "1,247 ÷ 8 = 155 ושארית 7",
    expected: { math: ["1,247 ÷ 8 = 155"] },
  },
  {
    line: "523 ÷ 6 = 87 ושארית 1",
    expected: { math: ["523 ÷ 6 = 87"] },
  },
  {
    line: "תשובה: 155 ושארית 7",
    expected: { label: "תשובה:" },
  },
  {
    line: "בודקים: מכפילים את המנה במחלק, ואז מוסיפים את השארית.",
    expected: { label: null },
  },
  {
    line: "8 × 155 = 1,240",
    expected: { math: ["8 × 155 = 1,240"] },
  },
  {
    line: "522 + 1 = 523",
    expected: { math: ["522 + 1 = 523"] },
  },
  {
    line: "523 ÷ 6:",
    expected: { math: ["523 ÷ 6:"] },
  },
  {
    line: "523 ÷ 6 = 87 שארית 1",
    expected: { math: ["523 ÷ 6 = 87"] },
  },
  {
    line: "✓ 87 × 6 + 1 = 523",
    expected: { label: "✓", math: ["87 × 6 + 1 = 523"] },
  },
  {
    line: "שאלה: חשבו 1,247 ÷ 8 = ? (עם שארית)",
    expected: { label: "שאלה:", math: ["1,247 ÷ 8 = ?"] },
  },
  {
    line: "שלב 1: 8 × 155 = 1,240",
    expected: { label: "שלב 1:", math: ["8 × 155 = 1,240"] },
  },
  {
    line: "שלב 2: 1,247 − 1,240 = 7",
    expected: { label: "שלב 2:", math: ["1,247 − 1,240 = 7"] },
  },
  {
    line: "תשובה: 155 שארית 7",
    expected: { label: "תשובה:" },
  },
];

for (const sample of CANONICAL_LINES) {
  assertLineRender(sample.line, sample.expected);
}

/** Fail if thousands-formatted numbers are split or reversed in Hebrew prose. */
function assertThousandsGroupedInLine(line, expectedToken) {
  const parts = splitTextAndMathRuns(line);
  const mathParts = parts.filter((p) => p.type === "math");
  const normalized = mathParts.map((p) => normMath(stripStrayMarkdown(p.value)));
  const hasWholeToken = normalized.some(
    (m) => m === expectedToken || m.includes(expectedToken)
  );
  if (!hasWholeToken) {
    fail(
      `thousands token "${expectedToken}" not isolated in "${line}"\n  math parts: ${JSON.stringify(normalized)}`
    );
  }
  if (normalized.some((m) => /000,1/.test(m))) {
    fail(`reversed thousands in "${line}": ${JSON.stringify(normalized)}`);
  }
  const bareDigitOnly = parts.some(
    (p) => p.type === "text" && /(?<![\d,])000(?!\d)/.test(p.value)
  );
  if (bareDigitOnly && line.includes(expectedToken)) {
    fail(`thousands tail "000" left in Hebrew text for "${line}"`);
  }
}

const THOUSANDS_LINES = [
  { line: "היום נלמד לקרוא מספרים **עד 1,000** ולזהות", token: "1,000" },
  { line: "עד 1,000", token: "1,000" },
  { line: "מספרים עד 1,000", token: "1,000" },
  { line: "מאות, עשרות ואחדות — עד 1,000", token: "1,000" },
  { line: "עכשיו אתם יודעים לפרק מספר עד 1,000 למאות, עשרות ואחדות.", token: "1,000" },
  { line: "2,000", token: "2,000" },
  { line: "10,000", token: "10,000" },
  { line: "3,482", token: "3,482" },
  { line: "מספר **3,482**", token: "3,482" },
  { line: "עד **10,000**", token: "10,000" },
  { line: "מספר **125,480**", token: "125,480" },
  { line: "עד **200,000**", token: "200,000" },
  { line: "מספר **48,726**", token: "48,726" },
  { line: "עד **100,000**", token: "100,000" },
];

for (const sample of THOUSANDS_LINES) {
  assertThousandsGroupedInLine(sample.line, sample.token);
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
  g3: [
    "add_two",
    "sub_two",
    "add_three",
    "dec_add",
    "order_add_mul",
    "wp_leftover",
  ],
  g4: [
    "ns_place_hundreds",
    "ns_neighbors",
    "cmp",
    "round",
    "add_two",
    "sub_two",
    "divisibility",
    "fm_gcd",
    "power_base",
    "dec_add",
  ],
  g5: [
    "ns_place_hundreds",
    "cmp",
    "add_two",
    "div_with_remainder",
    "frac_reduce",
    "dec_add",
    "fm_gcd",
    "fm_multiple",
    "perc_part_of",
    "wp_time_sum",
  ],
  g6: [
    "ns_place_hundreds",
    "round",
    "add_two",
    "sub_two",
    "fm_gcd",
    "dec_add",
    "frac_multiply",
    "ratio_first",
    "scale_find",
    "perc_part_of",
    "wp_time_sum",
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
  [MATH_G3_PAGE_ORDER, "g3"],
  [MATH_G4_PAGE_ORDER, "g4"],
  [MATH_G5_PAGE_ORDER, "g5"],
  [MATH_G6_PAGE_ORDER, "g6"],
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

const GEOMETRY_G4_MANUAL_QA = [
  "shapes_basic_properties_angles",
  "parallel_perpendicular",
  "square_perimeter",
  "square_area",
  "triangle_angles",
  "diagonal_rectangle",
  "rectangular_prism_volume",
];

for (const pageId of GEOMETRY_G4_MANUAL_QA) {
  const raw = fs.readFileSync(
    path.join(ROOT, `docs/learning-book/geometry/g4/drafts/${pageId}.md`),
    "utf8"
  );
  const page = parseLearningPageMarkdown(raw, pageId);
  for (const sectionNumber of [3, 4, 5, 6]) {
    const section = page.sections.find((s) => s.number === sectionNumber);
    if (!section) {
      fail(`geometry/g4/${pageId}: missing section ${sectionNumber}`);
      continue;
    }
    scanSectionBody(section.body, `geometry/g4/${pageId}`, sectionNumber);
  }
}

for (const pageId of GEOMETRY_G4_PAGE_ORDER) {
  const raw = fs.readFileSync(
    path.join(ROOT, `docs/learning-book/geometry/g4/drafts/${pageId}.md`),
    "utf8"
  );
  const page = parseLearningPageMarkdown(raw, pageId);
  for (const section of page.sections) {
    scanSectionBody(section.body, `geometry/g4/${pageId}`, section.number);
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: learning book bidi — ${CANONICAL_LINES.length} canonical lines + ${THOUSANDS_LINES.length} high-risk token checks + math G1–G6 full scan + geometry G4 full scan + manual QA pages.`
);
