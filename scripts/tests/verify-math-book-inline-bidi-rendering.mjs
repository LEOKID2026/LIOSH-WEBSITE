/**
 * Verify inline math bidi splitting for Grade 1 learning book prose.
 * Run: node scripts/tests/verify-math-book-inline-bidi-rendering.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../../lib/learning-book/math-g1-registry.js";
import { parseLearningPageMarkdown } from "../../lib/learning-book/parse-learning-page-markdown.js";
import {
  findInlineMathRuns,
  splitTextAndMathRuns,
  stripInlineMarkdownForScan,
} from "../../lib/learning-book/book-math-display.js";
import { stripStrayMarkdown } from "../../lib/learning-book/parse-inline-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../../docs/learning-book/math/g1/drafts");

/** @param {string} value */
function normalizeMath(value) {
  return stripStrayMarkdown(value).replace(/\s+/g, " ").trim();
}

/**
 * @param {string} text
 * @param {string} expectedExpr
 */
function assertSingleMathRunContains(text, expectedExpr) {
  const runs = findInlineMathRuns(text).map((r) => normalizeMath(r.value));
  const ok = runs.some(
    (run) => run === expectedExpr || run.includes(expectedExpr)
  );
  if (!ok) {
    throw new Error(
      `Expected math run containing "${expectedExpr}" in:\n  ${text}\n  Got runs: ${JSON.stringify(runs)}`
    );
  }
}

/**
 * @param {string} text
 */
function assertNoOrphanOperatorsInTextRuns(text) {
  const parts = splitTextAndMathRuns(text);
  for (const part of parts) {
    if (part.type !== "text") continue;
    const stripped = stripInlineMarkdownForScan(part.value).stripped;
    if (/\d\s*[+−\-=×÷]\s*\d/.test(stripped)) {
      throw new Error(
        `Un-isolated equation fragment in text run:\n  source: ${text}\n  fragment: ${part.value}`
      );
    }
  }
}

/** @param {string} line */
function scanProseLine(line) {
  if (!line.trim()) return;
  if (/^```/.test(line.trim())) return;
  if (!/[\u0590-\u05FF]/.test(line)) return;
  if (!/\d/.test(line) || !/[+−\-=×÷?_]/.test(line)) return;

  assertNoOrphanOperatorsInTextRuns(line);

  const { stripped } = stripInlineMarkdownForScan(line);
  const eqRe =
    /\d+(?:\s*[+−\-=×÷<>]\s*(?:\d+|__|\?))+(?:\s*=\s*(?:\d+|__|\?))?|\d+\s*[−\-]\s*(?:\d+|__)/g;
  let match;
  while ((match = eqRe.exec(stripped)) !== null) {
    const expr = match[0].replace(/\s+/g, " ").trim();
    const runs = findInlineMathRuns(line).map((r) => normalizeMath(r.value));
    const covered = runs.some((run) => run.includes(expr) || expr.includes(run));
    if (!covered) {
      throw new Error(
        `Equation not fully isolated on page line:\n  ${line}\n  expr: ${expr}\n  runs: ${JSON.stringify(runs)}`
      );
    }
  }
}

const CANONICAL_CASES = [
  {
    text: "עכשיו יש לי 5 + 2 = 7 מדבקות.",
    expr: "5 + 2 = 7",
  },
  {
    text: "עכשיו יש לי 5 + 2 = **7** מדבקות.",
    expr: "5 + 2 = 7",
  },
  {
    text: "✓ 7 + 4 → אחרי 7 סופרים 4 צעדים: 8, 9, 10, 11 → התשובה 11.",
    expr: "7 + 4",
  },
  {
    text: "❌ 10 − 3 → 10, 9, 8 — ספרנו את 10 עצמו",
    expr: "10 − 3 → 10, 9, 8",
  },
  {
    text: "2 + __ = 8 — מה המספר החסר?",
    expr: "2 + __ = 8",
  },
  {
    text: "10 − __ = 7 — מה המספר החסר?",
    expr: "10 − __ = 7",
  },
  {
    text: "3 × 3 = 3 + 3 + 3 = 9",
    expr: "3 × 3 = 3 + 3 + 3 = 9",
  },
  {
    text: "5 + 5 + 2 = 12 → יש 12 שקלים יחד.",
    expr: "5 + 5 + 2 = 12",
  },
  {
    text: "10 − 7 = 3 עודף.",
    expr: "10 − 7 = 3",
  },
];

let failures = 0;

for (const sample of CANONICAL_CASES) {
  try {
    assertSingleMathRunContains(sample.text, sample.expr);
    assertNoOrphanOperatorsInTextRuns(sample.text);
  } catch (err) {
    failures += 1;
    console.error("FAIL canonical:", err.message);
  }
}

for (const pageId of MATH_G1_PAGE_ORDER) {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);

  for (const section of page.sections) {
    const body = section.body || "";
    const lines = body.split("\n");
    for (const line of lines) {
      if (/^[-*]\s+/.test(line)) {
        try {
          scanProseLine(line.replace(/^[-*]\s+/, ""));
        } catch (err) {
          failures += 1;
          console.error(`FAIL ${pageId} §${section.number}:`, err.message);
        }
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        try {
          scanProseLine(line.replace(/^\d+\.\s+/, ""));
        } catch (err) {
          failures += 1;
          console.error(`FAIL ${pageId} §${section.number}:`, err.message);
        }
        continue;
      }
      if (/^#{1,6}\s/.test(line) || /^```/.test(line.trim())) continue;
      try {
        scanProseLine(line);
      } catch (err) {
        failures += 1;
        console.error(`FAIL ${pageId} §${section.number}:`, err.message);
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: inline math bidi — ${CANONICAL_CASES.length} canonical cases + ${MATH_G1_PAGE_ORDER.length} book pages scanned.`
);
