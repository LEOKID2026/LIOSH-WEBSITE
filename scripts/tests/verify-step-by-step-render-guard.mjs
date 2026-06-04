/**
 * Guard: step-by-step / student-question render paths must stay untouched in Phase 1.
 * Run: node scripts/tests/verify-step-by-step-render-guard.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const forbiddenTouch = [
  "components/learning-book/MixedHebrewMathText.js",
  "lib/learning-book/book-math-display.js",
  "pages/learning/math-master.js",
  "components/learning/StudentQuestionDisplay.jsx",
  "utils/student-question-display.js",
];

for (const file of forbiddenTouch) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    errors.push(`missing expected file: ${file}`);
    continue;
  }
}

const mathMaster = read("pages/learning/math-master.js");
if (!/renderLearningMixedHebrewMathText/.test(mathMaster)) {
  errors.push("math-master: step modal must use renderLearningMixedHebrewMathText");
}
if (!/LearningMixedHebrewMathText/.test(mathMaster)) {
  errors.push("math-master: LearningMixedHebrewMathText import missing");
}

const studentDisplay = read("utils/student-question-display.js");
if (!/export function resolveStudentQuestionDisplayParts/.test(studentDisplay)) {
  errors.push("student-question-display: resolveStudentQuestionDisplayParts missing");
}

const bookContentLine = read("components/learning-book/BookContentLine.js");
if (/from "\.\/MixedHebrewMathText"/.test(bookContentLine) === false) {
  errors.push("BookContentLine must delegate fallback to MixedHebrewMathText");
}

if (errors.length) {
  console.error("FAIL: verify-step-by-step-render-guard");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log("OK: verify-step-by-step-render-guard — forbidden paths intact, BookContentLine fallback preserved.");
