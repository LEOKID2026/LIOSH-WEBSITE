import assert from "node:assert/strict";
import {
  isTopicDifficultyMetadataLead,
  resolveStudentQuestionDisplayParts,
  shouldOmitInstructionLead,
} from "../utils/student-question-display.js";
import { sanitizeQuestionForStudentDisplay } from "../utils/student-question-stem-sanitizer.js";

const METADATA_CASES = [
  ["dec_sub", "חיסור עשרוניים (קל): 1.23 − 0.45 = __"],
  ["dec_add", "חיבור עשרוניים (בינוני): 2.10 + 3.20 = __"],
  ["geometry_pyth", "פיתגורס (קל): ניצבים 3 ו-4 - מה אורך היתר?"],
  ["divisibility", "התחלקות (קל): האם 24 מתחלק ב-3 בלי שארית?"],
  ["grade_level", "כיתה ד׳ (קל): תיבה 2×3×4 - מה הנפח?"],
  ["fractions", "שברים (אתגר): 1/2 + 1/4 = __"],
];

const PRESERVE_CASES = [
  ["plain_add", "7 + 3 = __"],
  ["english", "Choose the correct word: The cat is ___ the table."],
  ["hebrew_instruction", "איזה משפט נכון?"],
  ["word_problem", "לליאו יש גינה בצורת ריבוע, אורך כל צלע הוא 5 מטר. כמה מטרים רבועים שטח הגינה?"],
];

for (const [name, before] of METADATA_CASES) {
  assert.equal(isTopicDifficultyMetadataLead(before.split(":")[0]), true, `${name}: metadata lead`);

  const sanitized = sanitizeQuestionForStudentDisplay({ question: before });
  assert.equal(sanitized.questionLabel, undefined, `${name}: questionLabel removed`);
  const body = String(sanitized.exerciseText || sanitized.question).trim();
  assert.ok(body.length > 0, `${name}: exercise preserved`);
  assert.equal(body.includes("פיתגורס (קל)"), false, `${name}: no metadata in body`);
  assert.equal(body.includes("חיסור עשרוניים"), false, `${name}: no decimal metadata in body`);
  assert.equal(body.includes("התחלקות (קל)"), false, `${name}: no divisibility metadata in body`);
  assert.equal(/^כיתה\s+[אבגדהו]/u.test(body), false, `${name}: no grade metadata in body`);

  const display = resolveStudentQuestionDisplayParts(sanitized);
  assert.equal(display.leadText, "", `${name}: no visible lead`);
  assert.ok(display.bodyText.trim().length > 0, `${name}: body visible`);
}

for (const [name, text] of PRESERVE_CASES) {
  const sanitized = sanitizeQuestionForStudentDisplay({ question: text });
  const display = resolveStudentQuestionDisplayParts(sanitized);
  const visible = `${display.leadText || ""} ${display.bodyText || ""}`.replace(/\s+/g, " ").trim();
  if (name === "plain_add") {
    assert.equal(display.bodyText.trim(), text.trim(), `${name}: unchanged body`);
    assert.equal(display.leadText, "", `${name}: no lead line`);
  } else if (name === "english") {
    assert.match(visible, /Choose the correct word/i, `${name}: instruction preserved`);
    assert.equal(isTopicDifficultyMetadataLead("Choose the correct word"), false, `${name}: not metadata`);
  } else {
    assert.ok(visible.includes(text.trim().slice(0, 20)), `${name}: content preserved (${visible})`);
  }
}

assert.equal(
  shouldOmitInstructionLead("מצאו את הנעלם:", "5 + __ = 12"),
  true,
  "equation instruction still omitted for compact body"
);

console.log("PASS: student-question-metadata-lead tests");
