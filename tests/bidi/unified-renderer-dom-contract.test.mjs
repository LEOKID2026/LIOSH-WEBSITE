import assert from "node:assert/strict";
import test from "node:test";
import { splitMixedHebrewMathRuns } from "../../lib/bidi/mixed-hebrew-math-runs.js";
import {
  describeMixedMathDomContract,
  hasForbiddenTokenSplit,
} from "../../lib/bidi/describe-mixed-math-dom.js";
import { analyzeBidiRenderStructure } from "../../lib/learning-book/book-bidi-render.js";
import { canonicalizePlaceValueDecomposition } from "../../lib/learning-book/place-value-equation-order.js";

const OWNER_LINES = [
  "100 + 20 + 4 = 124",
  "1 מאה + 2 עשרות + 4 אחדות = 124",
  "58 + 37 = 95",
  "8 + 7 = 15 → 5, נשיאה 1",
  "עשרות: 30 + 20 = 50",
  "אחדות: 8 + 7 = 15",
  "סה״כ: 50 + 9 = 59",
  "π ≈ 3.14",
  "A = πr²",
  "10% מתוך 490",
  "3/4",
  "52° + 101°",
  "12 ס״מ",
  "24 סמ״ר",
  "1,000",
  "- 1 מאה + 2 עשרות + 4 אחדות = 124",
  "7 + 8 = 15",
  "47 + 28 = 75",
];

for (const line of OWNER_LINES) {
  test(`single-island or label+math for: ${line.slice(0, 40)}`, () => {
    assert.equal(hasForbiddenTokenSplit(line), false, line);
    const runs = splitMixedHebrewMathRuns(line);
    const mathRuns = runs.filter((r) => r.type === "math");
    assert.ok(mathRuns.length >= 1, `expected math island: ${line}`);
    if (/=/.test(line) && !/^עשרות:|^אחדות:|^סה״כ:/u.test(line)) {
      const eq = mathRuns.find((r) => /=/.test(r.value));
      assert.ok(eq, `equation must be one island: ${line}`);
      if (!/[\u0590-\u05FF]/.test(line.replace(/:/, ""))) {
        assert.equal(mathRuns.length, 1, `pure equation must be one island: ${line}`);
      }
    }
  });

  test(`DOM contract isolate for: ${line.slice(0, 40)}`, () => {
    const { nodes } = describeMixedMathDomContract(line);
    assert.ok(nodes.length >= 1);
    for (const node of nodes) {
      assert.equal(node.unicodeBidi, "isolate");
      assert.ok(node.dir === "ltr" || node.dir === "rtl");
      assert.match(node.html, /unicode-bidi:isolate/);
    }
  });
}

test("analyzeBidiRenderStructure never emits token-split roles", () => {
  for (const line of OWNER_LINES) {
    const structure = analyzeBidiRenderStructure(line);
    const bad = structure.filter((r) =>
      /^(digit|formula-op|formula-symbol|formula-term)$/.test(r.role)
    );
    assert.equal(bad.length, 0, `${line} → ${JSON.stringify(bad)}`);
  }
});

test("carry decomposition labels produce label RTL + math LTR", () => {
  const dom = describeMixedMathDomContract("עשרות: 30 + 20 = 50");
  assert.equal(dom.nodes[0].role, "prose");
  assert.match(dom.nodes[0].textContent, /עשרות/);
  assert.equal(dom.nodes[1].role, "math");
  assert.equal(dom.nodes[1].textContent, "30 + 20 = 50");
  assert.equal(dom.nodes[1].dir, "ltr");
});

test("place value decomposition math string order (not dir-only)", () => {
  const cases = [
    ["124 = 100 + 20 + 4", "100 + 20 + 4 = 124"],
    ["405 = 400 + 0 + 5", "400 + 0 + 5 = 405"],
    ["- 124 = 100 + 20 + 4", "- 100 + 20 + 4 = 124"],
    ["58 = 50 + 8", "50 + 8 = 58"],
    ["68 = 60 + 8", "60 + 8 = 68"],
  ];
  for (const [raw, expected] of cases) {
    assert.equal(canonicalizePlaceValueDecomposition(raw), expected);
    const math = splitMixedHebrewMathRuns(raw).find((r) => r.type === "math")?.value;
    assert.equal(math, expected.replace(/^-\s+/, ""));
    assert.doesNotMatch(math, /^124\s*=/);
    assert.doesNotMatch(math, /^405\s*=/);
  }
});
