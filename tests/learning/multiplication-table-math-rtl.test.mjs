import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const MATH_MASTER_SRC = readFileSync(
  fileURLToPath(new URL("../../pages/learning/math-master.js", import.meta.url)),
  "utf8"
);

const MATH_LTR_ISLAND_SRC = readFileSync(
  fileURLToPath(
    new URL("../../components/learning/MathLtrIsland.jsx", import.meta.url)
  ),
  "utf8"
);

const MODAL_SRC = MATH_MASTER_SRC.slice(
  MATH_MASTER_SRC.indexOf("{/* Multiplication Table Modal */}"),
  MATH_MASTER_SRC.indexOf("{/* Leaderboard Modal */}")
);

test("MathLtrIsland uses dir=ltr, unicode-bidi isolate, and text-align center", () => {
  assert.match(MATH_LTR_ISLAND_SRC, /dir="ltr"/);
  assert.match(MATH_LTR_ISLAND_SRC, /learningMathIsolateStyle/);
  assert.match(MATH_LTR_ISLAND_SRC, /textAlign:\s*"center"/);
  assert.match(MATH_LTR_ISLAND_SRC, /data-math-ltr-island="true"/);
});

test("times table practice expression is wrapped in MathLtrIsland with logical operand order", () => {
  const practiceBlock = MODAL_SRC.slice(
    MODAL_SRC.indexOf("{practiceMode && practiceQuestion &&"),
    MODAL_SRC.indexOf("{practiceMode && !practiceQuestion &&")
  );

  assert.match(practiceBlock, /<MathLtrIsland[\s\S]*practiceQuestion\.row\} × \{practiceQuestion\.col\} = \?/);
  assert.doesNotMatch(practiceBlock, /<div className="text-2xl font-bold text-white mb-2">\s*\{practiceQuestion/);
});

test("times table multiplication result expression uses MathLtrIsland", () => {
  assert.match(
    MODAL_SRC,
    /<MathLtrIsland className="text-base text-white\/80">[\s\S]*\{selectedRow \|\| selectedCell\.row\} ×[\s\S]*\{selectedCol \|\| selectedCell\.col\} =/
  );
});

test("times table division result expression uses MathLtrIsland", () => {
  assert.match(
    MODAL_SRC,
    /<MathLtrIsland className="text-base text-white\/80">[\s\S]*\{selectedResult\} ÷ \{selectedDivisor\} =/
  );
  assert.match(
    MODAL_SRC,
    /שגיאה:[\s\S]*<MathLtrIsland>[\s\S]*\{selectedResult\} ÷ \{selectedDivisor\}/
  );
});

test("times table modal imports MathLtrIsland", () => {
  assert.match(MATH_MASTER_SRC, /import MathLtrIsland from "\.\.\/\.\.\/components\/learning\/MathLtrIsland"/);
});
