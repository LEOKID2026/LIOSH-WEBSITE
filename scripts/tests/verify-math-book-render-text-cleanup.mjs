/**
 * Verify book render output paths against all 19 Grade 1 pages.
 * Run: node scripts/tests/verify-math-book-render-text-cleanup.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../../lib/learning-book/math-g1-registry.js";
import { parseLearningPageMarkdown } from "../../lib/learning-book/parse-learning-page-markdown.js";
import { splitBookMarkdownBlocks } from "../../lib/learning-book/book-markdown-blocks.js";
import {
  assertLineContainsMath,
  simulateBookSectionRender,
  simulateVisibleProseLine,
} from "../../lib/learning-book/simulate-book-visible-text.js";
import {
  inferDiagramEquation,
  inferEquationFromObjectVisual,
  parseDiagramNumberRow,
} from "../../lib/learning-book/diagram-detect.js";
import { formatBookProseForDisplay } from "../../lib/learning-book/book-prose-format.js";
import { stripStrayMarkdown } from "../../lib/learning-book/parse-inline-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../../docs/learning-book/math/g1/drafts");

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

/** @type {Record<string, number[]>} */
const SECTION_SPOT_CHECKS = {
  add_two: [3, 4, 6],
  sub_two: [3, 4, 6],
  eq_add_simple: [2, 4, 6],
  eq_sub_simple: [2, 4, 6],
  mul: [3, 6],
  wp_coins: [3, 4, 6],
  wp_coins_spent: [3, 4, 6],
  add_second_decade: [3, 4, 6],
};

function testCanonicalCases() {
  const story =
    "**דוגמה מחיי היום־יום:**\nיש לי 5 מדבקות. חבר נתן לי עוד 2. עכשיו יש לי 5 + 2 = **7** מדבקות.";
  const storyLines = formatBookProseForDisplay(story);
  if (storyLines.length < 4) {
    fail(`story split expected >=4 lines, got ${JSON.stringify(storyLines)}`);
  }
  if (!storyLines.some((l) => l.includes("יש לי 5 מדבקות."))) {
    fail("story missing first sentence line");
  }

  const steps = formatBookProseForDisplay(
    "**שאלה:** 5 + 3 = ?\n\n**שלב 1:** שימו 5 חפצים.\n\n**שלב 2:** הוסיפו 3."
  );
  const stepBlocks = splitBookMarkdownBlocks(
    "**שאלה:** 5 + 3 = ?\n\n**שלב 1:** שימו 5 חפצים.\n\n**שלב 2:** הוסיפו 3."
  );
  const stepLines = stepBlocks.flatMap((b) =>
    b.type === "prose" ? b.lines : []
  );
  if (stepLines.length < 3) {
    fail(`step blocks expected >=3 lines, got ${JSON.stringify(stepLines)}`);
  }

  const eq = inferEquationFromObjectVisual(
    "● ● ● ●    +    ● ● ●    =    ● ● ● ● ● ● ●"
  );
  if (eq !== "4 + 3 = 7") {
    fail(`object equation expected "4 + 3 = 7", got "${eq}"`);
  }

  const visible = simulateVisibleProseLine("**על ציר המספרים — 6 + 2:**");
  if (visible.includes("**") || visible.includes("`")) {
    fail(`caption markdown artifact: ${visible}`);
  }

  try {
    assertLineContainsMath("**שאלה:** 5 + 3 = ?", "5 + 3 = ?");
    assertLineContainsMath("עכשיו יש לי 5 + 2 = **7** מדבקות.", "5 + 2 = 7");
  } catch (err) {
    fail(err.message);
  }
}

testCanonicalCases();

for (const pageId of MATH_G1_PAGE_ORDER) {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);

  for (const section of page.sections) {
    const { proseLines, diagramEquations, issues } = simulateBookSectionRender(
      section.body
    );

    for (const issue of issues) {
      fail(`${pageId} §${section.number}: ${issue}`);
    }

    for (const line of proseLines) {
      if (/\*\*/.test(line) || /`/.test(line)) {
        fail(`${pageId} §${section.number}: visible markdown in "${line}"`);
      }
    }

    for (const eq of diagramEquations) {
      if (/^\d{3,}$/.test(eq.replace(/\s/g, ""))) {
        fail(`${pageId} §${section.number}: collapsed diagram equation "${eq}"`);
      }
    }
  }

  if (pageId === "add_two") {
    const sec3 = simulateBookSectionRender(
      page.sections.find((s) => s.number === 3).body
    );
    if (!sec3.diagramEquations.includes("4 + 3 = 7")) {
      fail(`add_two §3 missing diagram equation 4 + 3 = 7`);
    }
    const sec4 = simulateBookSectionRender(
      page.sections.find((s) => s.number === 4).body
    );
    if (sec4.proseLines.length < 6) {
      fail(
        `add_two §4 expected >=6 readable lines, got ${sec4.proseLines.length}`
      );
    }
    if (!sec4.proseLines.some((l) => l.includes("שאלה") && l.includes("5 + 3"))) {
      fail("add_two §4 missing question line");
    }
  }
}

for (const [pageId, sections] of Object.entries(SECTION_SPOT_CHECKS)) {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  for (const num of sections) {
    const section = page.sections.find((s) => s.number === num);
    if (!section) {
      fail(`${pageId} missing section ${num}`);
      continue;
    }
    const blocks = splitBookMarkdownBlocks(section.body);
    const hasHrAsText = blocks.some(
      (b) =>
        b.type === "prose" && b.lines.some((line) => /^---+$/.test(line.trim()))
    );
    if (hasHrAsText) {
      fail(`${pageId} §${num}: --- rendered as prose text`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: book render simulation — ${MATH_G1_PAGE_ORDER.length} pages, spot sections, canonical cases.`
);
