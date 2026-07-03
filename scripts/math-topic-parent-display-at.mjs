/**
 * Acceptance — תווית שם נושא מתמטיקה (רק שם פעולה; מצב רק בכפילות אותו scope).
 * npx tsx scripts/math-topic-parent-display-at.mjs
 */
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

const { applyMathScopedParentDisplayNames, mathTopicParentDisplayCoreFromRow } = await load(
  "utils/math-topic-parent-display.js"
);
const { getMathReportBucketDisplayName } = await load("utils/math-report-generator.js");

function rowStub({ bk, gk, lk, mode }) {
  return {
    subject: "math",
    bucketKey: bk,
    gradeKey: gk,
    levelKey: lk,
    modeKey: mode,
    questions: 10,
    accuracy: 70,
  };
}

function at1() {
  const m = {
    k1: rowStub({ bk: "addition", gk: "g2", lk: "easy", mode: "learning" }),
    k2: rowStub({ bk: "addition", gk: "g3", lk: "medium", mode: "learning" }),
  };
  applyMathScopedParentDisplayNames(m);
  assert.equal(m.k1.displayName, "חיבור");
  assert.equal(m.k2.displayName, "חיבור");
}

function at2() {
  const m = {
    a: rowStub({ bk: "addition", gk: "g2", lk: "medium", mode: "learning" }),
    b: rowStub({ bk: "addition", gk: "g2", lk: "medium", mode: "practice" }),
  };
  applyMathScopedParentDisplayNames(m);
  assert.equal(m.a.displayName, "חיבור — למידה");
  assert.equal(m.b.displayName, "חיבור — תרגול");
}

function at3() {
  const r = rowStub({ bk: "addition", gk: "g2", lk: null, mode: "learning" });
  const m = { k: r };
  applyMathScopedParentDisplayNames(m);
  assert.equal(m.k.displayName, "חיבור");
}

function at4() {
  const r = rowStub({ bk: "addition", gk: null, lk: "medium", mode: "learning" });
  const m = { k: r };
  applyMathScopedParentDisplayNames(m);
  assert.equal(m.k.displayName, "חיבור");
}

function at5_coreSingleTopicNoFakeUnknown() {
  const r = rowStub({ bk: "addition", gk: null, lk: null, mode: "learning" });
  assert.equal(mathTopicParentDisplayCoreFromRow(r, "addition"), "חיבור");
}

function at6_wpKindMapsToWordProblems() {
  assert.equal(getMathReportBucketDisplayName("wp_shop_discount"), "בעיות מילוליות");
  assert.equal(getMathReportBucketDisplayName("multiplication_table"), "לוח הכפל");
  assert.notEqual(getMathReportBucketDisplayName("general"), "נושא");
  assert.equal(getMathReportBucketDisplayName("general"), "תרגול");
}

at1();
at2();
at3();
at4();
at5_coreSingleTopicNoFakeUnknown();
at6_wpKindMapsToWordProblems();
console.log("math-topic-parent-display-at: AT1–AT6 OK");
