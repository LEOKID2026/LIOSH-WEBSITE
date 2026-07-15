import assert from "node:assert/strict";
import test from "node:test";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import { flattenMixedHebrewMathVisibleText } from "../../lib/learning-book/book-visible-text-render.js";
import {
  FORBIDDEN_LEARNING_MATH_STRINGS,
  assertNotForbiddenLearningMath,
  flattenTemplateRuns,
  parseTemplateRuns,
} from "../../lib/learning-book/learning-math-line-templates.js";

/** @param {import("../../lib/learning-book/learning-math-line-templates.js").TemplateRun[]} runs */
function mathValues(runs) {
  return runs.filter((r) => r.type === "math").map((r) => r.value);
}

const BOOK_LINES = [
  {
    name: "number line steps right",
    input: "איזה מספר נמצא 3 צעדים ימינה מ-2?",
    flatIncludes: ["3", "צעדים ימינה", "2"],
    flatExcludes: ["צעדים ימינה מ-2 3"],
    math: ["3", "2"],
  },
  {
    name: "blank equation RHS",
    input: "**שאלה:** 20 + 10 = ?",
    flatIncludes: ["20 + 10 = ?"],
    flatExcludes: ["? = 20 + 10"],
    math: ["20 + 10 = ?"],
  },
  {
    name: "number line title pair",
    input: "**ציר מספרים - 12 ו-18:**",
    flatIncludes: ["12", "18", "ציר מספרים"],
    math: ["12", "18"],
  },
  {
    name: "ten rods count",
    input: "**שלב 1:** 20 = 2 מקלי עשרת",
    flatIncludes: ["20 = 2", "מקלי עשרת"],
    flatExcludes: ["3020"],
    math: ["20 = 2"],
    proseIncludes: ["מקלי עשרת"],
  },
  {
    name: "single ten rod",
    input: "**שלב 1:** 10 = מקל עשרת אחד",
    flatIncludes: ["10 =", "מקל עשרת אחד"],
    math: ["10 ="],
    proseIncludes: ["מקל עשרת אחד"],
  },
  {
    name: "ten rods sum",
    input: "2 מקלי עשרת ועוד מקל עשרת אחד = 3 מקלי עשרת",
    flatIncludes: ["2", "3", "מקלי עשרת"],
    flatExcludes: ["3020 + 10 ="],
    math: ["2", "3"],
  },
  {
    name: "tens addition result",
    input: "**שאלה:** 20 + 10 = 30",
    flatIncludes: ["20 + 10 = 30"],
    math: ["20 + 10 = 30"],
  },
  {
    name: "make ten sequence",
    input: "**שלב 3:** 7 + 3 = 10, ואז 10 + 3 = **13**",
    flatIncludes: ["7 + 3 = 10", "10 + 3 = 13"],
    flatExcludes: ["10 + 133", "137 + 6"],
    math: ["7 + 3 = 10", "10 + 3 = 13"],
  },
  {
    name: "comparison lt",
    input: "12 < 18 - 12 קטן מ-18",
    flatIncludes: ["12 < 18", "12 קטן מ-18"],
    math: ["12 < 18"],
    proseIncludes: ["12 קטן מ-18"],
  },
  {
    name: "comparison gt",
    input: "18 > 12 - 18 גדול מ-12",
    flatIncludes: ["18 > 12", "18 גדול מ-12"],
    math: ["18 > 12"],
    proseIncludes: ["18 גדול מ-12"],
  },
  {
    name: "comparison eq",
    input: "15 = 15 - 15 שווה ל-15",
    flatIncludes: ["15 = 15", "15 שווה ל-15"],
    math: ["15 = 15"],
    proseIncludes: ["15 שווה ל-15"],
  },
  {
    name: "quoted comparison eq",
    input: '- 15 **=** 15 - "15 שווה ל-15"',
    flatIncludes: ["15 = 15", "15 שווה ל-15"],
    math: ["15 = 15"],
    proseIncludes: ["15 שווה ל-15"],
  },
  {
    name: "make ten remainder step",
    input: "**שלב 2:** מ-6 נשארו **3** (6 = 3 + 3)",
    math: ["6", "3", "3 + 3 = 6"],
    proseIncludes: ["נשארו"],
  },
  {
    name: "answer line",
    input: "**תשובה:** 7 + 6 = **13**",
    flatIncludes: ["7 + 6", "13"],
    flatExcludes: ["137 + 6"],
    math: ["7 + 6 = 13"],
  },
];

for (const c of BOOK_LINES) {
  test(`G1/G2 book line: ${c.name}`, () => {
    const tpl = parseTemplateRuns(c.input);
    assert.ok(tpl, `expected template parse for: ${c.input}`);

    const runs = splitMixedHebrewMathRuns(c.input);
    const flat = flattenMixedHebrewMathVisibleText(c.input);
    assertNotForbiddenLearningMath(flat);

    if (c.math) {
      assert.deepEqual(mathValues(runs), c.math, "split math runs");
      assert.deepEqual(
        tpl.filter((r) => r.type === "math").map((r) => r.value),
        c.math,
        "template math runs"
      );
    }

    for (const inc of c.flatIncludes || []) {
      assert.ok(flat.includes(inc), `flat should include "${inc}" in "${flat}"`);
    }
    for (const exc of c.flatExcludes || []) {
      assert.ok(!flat.includes(exc), `flat must not include "${exc}" in "${flat}"`);
    }
    for (const inc of c.proseIncludes || []) {
      const prose = runs.filter((r) => r.type === "prose").map((r) => r.value).join("");
      assert.ok(prose.includes(inc), `prose should include "${inc}" in "${prose}"`);
    }
  });
}

test("forbidden G1/G2 patterns are listed", () => {
  for (const bad of [
    "צעדים ימינה מ-2 3",
    "? = 20 + 10",
    "5030 + 20",
    "3020 + 10",
    "4060 - 20",
    "5950 + 9",
    "4440 + 4",
    "24זוגי",
    "137 + 6",
    "10 + 133",
  ]) {
    assert.ok(
      FORBIDDEN_LEARNING_MATH_STRINGS.includes(bad),
      `missing forbidden entry: ${bad}`
    );
  }
});

test("flattenTemplateRuns preserves readable order", () => {
  const line = "**שלב 3:** 7 + 3 = 10, ואז 10 + 3 = **13**";
  const flat = flattenTemplateRuns(parseTemplateRuns(line));
  assert.match(flat, /7 \+ 3 = 10/);
  assert.match(flat, /10 \+ 3 = 13/);
  assert.doesNotMatch(flat, /10 \+ 133/);
});
