import assert from "node:assert/strict";
import test from "node:test";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import {
  flattenBookSectionVisibleLines,
  flattenMixedHebrewMathVisibleText,
} from "../../lib/learning-book/book-visible-text-render.js";
import { simulateBookLineBidiRuns } from "../../lib/learning-book/simulate-book-bidi-runs.js";
import {
  FORBIDDEN_LEARNING_MATH_STRINGS,
  assertNotForbiddenLearningMath,
  buildComparisonConclusionRuns,
  flattenTemplateRuns,
  parseTemplateRuns,
} from "../../lib/learning-book/learning-math-line-templates.js";
import { loadLearningBookPage } from "../../lib/learning-book/load-learning-book-pages.js";
import {
  MATH_G2_BOOK_BATCHES,
  MATH_G2_BOOK_META,
  MATH_G2_PAGE_ORDER,
  getMathG2PageNeighbors,
  isValidMathG2PageId,
} from "../../lib/learning-book/math-g2-registry.js";

/** @param {import("../../lib/learning-book/learning-math-line-templates.js").TemplateRun[]} runs */
function mathText(runs) {
  return runs.find((r) => r.type === "math")?.value;
}

/** @param {import("../../lib/learning-book/learning-math-line-templates.js").TemplateRun[]} runs */
function proseTexts(runs) {
  return runs.filter((r) => r.type === "prose").map((r) => r.value);
}

const GOLDEN = [
  {
    name: "place value decomposition",
    input: "- 100 + 20 + 4 = 124",
    math: "100 + 20 + 4 = 124",
  },
  {
    name: "place value 405",
    input: "400 + 0 + 5 = 405",
    math: "400 + 0 + 5 = 405",
  },
  {
    name: "labeled tens",
    input: "עשרות: 30 + 20 = 50",
    math: "30 + 20 = 50",
    proseIncludes: ["עשרות:"],
  },
  {
    name: "carry arrow split",
    input: "8 + 7 = 15 → 5, נשיאה 1",
    math: "8 + 7 = 15 → 5",
    proseIncludes: ["נשיאה 1"],
  },
  {
    name: "comparison hence",
    input: "735 גדול מ-708, לכן: 735 > 708",
    math: "735 > 708",
    proseIncludes: ["735 גדול מ-708, לכן:"],
  },
  {
    name: "comparison lt",
    input: "612 קטן מ-628, לכן: 612 < 628",
    math: "612 < 628",
    proseIncludes: ["612 קטן מ-628, לכן:"],
  },
  {
    name: "labeled digit compare",
    input: "עשרות: 1 < 2 → 612 קטן מ-628",
    math: "1 < 2",
    proseIncludes: ["עשרות:", "612 קטן מ-628"],
  },
  {
    name: "addition total 58+37",
    input: "58 + 37 = 95",
    math: "58 + 37 = 95",
  },
  {
    name: "tens merge 80+15",
    input: "80 + 15 = 95",
    math: "80 + 15 = 95",
  },
  {
    name: "half of 12",
    input: "6 + 6 = 12",
    math: "6 + 6 = 12",
  },
  {
    name: "half division",
    input: "12 ÷ 2 = 6",
    math: "12 ÷ 2 = 6",
  },
  {
    name: "units cm",
    input: "12 ס״מ",
    math: "12 ס״מ",
  },
  {
    name: "area sq cm",
    input: "24 סמ״ר",
    math: "24 סמ״ר",
  },
  {
    name: "thousands",
    input: "1,000",
    math: "1,000",
  },
  {
    name: "pi",
    input: "π ≈ 3.14",
    math: "π ≈ 3.14",
  },
  {
    name: "area formula",
    input: "A = πr²",
    math: "A = πr²",
  },
  {
    name: "percent",
    input: "10% מתוך 490",
    math: "10%",
    proseIncludes: ["מתוך 490"],
  },
  {
    name: "fraction",
    input: "3/4",
    math: "3/4",
  },
  {
    name: "degrees",
    input: "52° + 101°",
    math: "52° + 101°",
  },
];

for (const { name, input, math, proseIncludes = [] } of GOLDEN) {
  test(`golden string order: ${name}`, () => {
    const runs = splitMixedHebrewMathRuns(input);
    assert.equal(mathText(runs), math, `math island for: ${input}`);
    for (const snippet of proseIncludes) {
      assert.ok(
        proseTexts(runs).some((p) => p.includes(snippet)),
        `expected prose "${snippet}" in ${JSON.stringify(proseTexts(runs))}`
      );
    }
    assertNotForbiddenLearningMath(flattenTemplateRuns(runs));
  });
}

test("forbidden strings are rejected", () => {
  for (const bad of FORBIDDEN_LEARNING_MATH_STRINGS) {
    assert.throws(() => assertNotForbiddenLearningMath(bad), /forbidden/);
  }
});

test("buildComparisonConclusionRuns gt/lt", () => {
  assert.deepEqual(buildComparisonConclusionRuns({ left: 735, right: 708, relation: "gt" }), [
    { type: "prose", value: "735 גדול מ-708, לכן: " },
    { type: "math", value: "735 > 708" },
  ]);
  assert.deepEqual(buildComparisonConclusionRuns({ left: 612, right: 628, relation: "lt" }), [
    { type: "prose", value: "612 קטן מ-628, לכן: " },
    { type: "math", value: "612 < 628" },
  ]);
});

test("g2 add_two draft: no 80+5+1 in visible flatten", () => {
  const registry = {
    batches: MATH_G2_BOOK_BATCHES,
    pageOrder: MATH_G2_PAGE_ORDER,
    meta: MATH_G2_BOOK_META,
    getPageNeighbors: getMathG2PageNeighbors,
    isValidPageId: isValidMathG2PageId,
  };
  const page = loadLearningBookPage(registry, "add_two");
  const section3 = page.sections[2];
  const lines = String(section3.body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const flat = flattenMixedHebrewMathVisibleText(line);
    assertNotForbiddenLearningMath(flat);
    assertNotForbiddenLearningMath(line.replace(/\*\*/g, ""));
  }
});

test("g2 real book lines keep bold result inside one visible equation island", () => {
  const cases = [
    {
      pageId: "add_two",
      source: "- עשרות: 30 + 20 = 50",
      expected: "- עשרות: 30 + 20 = 50",
      math: "30 + 20 = 50",
      forbidden: ["5030 + 20"],
    },
    {
      pageId: "add_two",
      source: "- אחדות: 4 + 5 = 9",
      expected: "- אחדות: 4 + 5 = 9",
      math: "4 + 5 = 9",
      forbidden: ["94 + 5", "5950 + 9"],
    },
    {
      pageId: "add_two",
      source: "- סה״כ: 50 + 9 = 59",
      expected: "- סה״כ: 50 + 9 = 59",
      math: "50 + 9 = 59",
      forbidden: ["5950 + 9"],
    },
    {
      pageId: "sub_two",
      source: "- עשרות: 60 − 20 = 40",
      expected: "- עשרות: 60 − 20 = 40",
      math: "60 − 20 = 40",
      forbidden: ["4060", "4060 - 20"],
    },
    {
      pageId: "sub_two",
      source: "- אחדות: 8 − 4 = 4",
      expected: "- אחדות: 8 − 4 = 4",
      math: "8 − 4 = 4",
      forbidden: ["48 − 4"],
    },
    {
      pageId: "sub_two",
      source: "- סה״כ: 40 + 4 = 44",
      expected: "- סה״כ: 40 + 4 = 44",
      math: "40 + 4 = 44",
      forbidden: ["4440 + 4"],
    },
    {
      pageId: "mul",
      source: "- סה״כ: 6 + 6 + 6 + 6 = 24",
      expected: "- סה״כ: 6 + 6 + 6 + 6 = 24",
      math: "6 + 6 + 6 + 6 = 24",
      forbidden: ["246 + 6 + 6"],
    },
    {
      pageId: "mul",
      source: "חיבור חוזר: 6 + 6 + 6 + 6 = 24",
      expected: "חיבור חוזר: 6 + 6 + 6 + 6 = 24",
      math: "6 + 6 + 6 + 6 = 24",
      forbidden: ["246 + 6 + 6"],
    },
    {
      pageId: "mul",
      source: "4 × 6 = 24",
      expected: "4 × 6 = 24",
      math: "4 × 6 = 24",
      forbidden: ["244 × 6"],
    },
    {
      pageId: "ns_even_odd",
      source: "לכל כוכב יש שותף → 24 זוגי.",
      expected: "לכל כוכב יש שותף → 24 זוגי.",
      forbidden: ["24זוגי"],
    },
    {
      pageId: "ns_even_odd",
      source: "טיפ: ב-35 הספרה האחרונה היא 5 → אי זוגי.",
      expected: "טיפ: ב-35 הספרה האחרונה היא 5 → אי זוגי.",
      forbidden: ["35אי-זוגי"],
    },
  ];

  const registry = {
    batches: MATH_G2_BOOK_BATCHES,
    pageOrder: MATH_G2_PAGE_ORDER,
    meta: MATH_G2_BOOK_META,
    getPageNeighbors: getMathG2PageNeighbors,
    isValidPageId: isValidMathG2PageId,
  };

  for (const c of cases) {
    const page = loadLearningBookPage(registry, c.pageId);
    const inPage = page.sections.some((section) => String(section.body || "").includes(c.source));
    assert.ok(inPage, `golden source must come from real g2 page ${c.pageId}: ${c.source}`);

    const visible = flattenMixedHebrewMathVisibleText(c.source);
    assert.equal(visible, c.expected);

    const mathRuns = simulateBookLineBidiRuns(c.source).filter((r) => r.dir === "ltr");
    if (c.math) {
      assert.ok(
        mathRuns.some((r) => r.value === c.math),
        `expected one LTR island "${c.math}" in ${JSON.stringify(mathRuns)}`
      );
    }
    for (const bad of c.forbidden) {
      assert.ok(!visible.includes(bad), `visible text must not include ${bad}: ${visible}`);
      assert.ok(
        !mathRuns.some((r) => r.value.includes(bad)),
        `math run must not include ${bad}: ${JSON.stringify(mathRuns)}`
      );
    }
  }
});

test("g2 target pages have no forbidden visible output", () => {
  const registry = {
    batches: MATH_G2_BOOK_BATCHES,
    pageOrder: MATH_G2_PAGE_ORDER,
    meta: MATH_G2_BOOK_META,
    getPageNeighbors: getMathG2PageNeighbors,
    isValidPageId: isValidMathG2PageId,
  };
  const pageIds = [
    "add_two",
    "sub_two",
    "sub_vertical",
    "mul",
    "ns_even_odd",
    "ns_neighbors",
    "ns_place_tens_units",
  ];
  const forbidden = [
    /5030/u,
    /3020/u,
    /4060/u,
    /5950/u,
    /4440/u,
    /2552/u,
    /246\s*\+\s*6/u,
    /137\s*\+\s*6/u,
    /24זוגי/u,
  ];

  for (const pageId of pageIds) {
    const page = loadLearningBookPage(registry, pageId);
    for (const section of page.sections) {
      const visibleLines = flattenBookSectionVisibleLines(section.body).lines;
      for (const { source, rendered } of visibleLines) {
        assertNotForbiddenLearningMath(rendered);
        for (const bad of forbidden) {
          assert.ok(
            !bad.test(rendered),
            `${pageId} §${section.number} rendered forbidden ${bad}: ${rendered} (source: ${source})`
          );
        }
      }
    }
  }
});

test("g2 cmp draft: comparison lines split prose vs math", () => {
  const cmpLines = [
    "612 קטן מ-628, לכן: 612 < 628",
    "**שלב 3:** 735 גדול מ-708, לכן: 735 > 708",
  ];
  for (const line of cmpLines) {
    const runs = parseTemplateRuns(line);
    assert.ok(runs?.length >= 2);
    assert.match(mathText(runs), /^\d+ [<>] \d+$/);
    assert.match(proseTexts(runs).join(" "), /לכן:/);
  }
});
