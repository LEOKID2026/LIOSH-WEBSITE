import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectStudentStemMetadataLeaks,
  sanitizeQuestionForStudentDisplay,
  sanitizeStudentQuestionStem,
} from "../../utils/student-question-stem-sanitizer.js";
import { prepareAssignedActivityQuestionSetForStudentDisplay } from "../../lib/classroom-activities/prepare-assigned-activity-questions-for-display.client.js";
import { mapFrozenQuestionDetail } from "../../lib/classroom-activities/frozen-activity-question.server.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIRTY =
  "כיתה ה׳ · רמה קלה · מה עושה חילזון בלחות? · מוקד snail_moisture_v3";
const CLEAN = "מה עושה חילזון בלחות?";

test("1) gen-science-p1 source templates have no grade/level framing", () => {
  const src = readFileSync(
    join(ROOT, "scripts/gen-science-p1-g456-fill.mjs"),
    "utf8"
  );
  assert.equal(/\["בכיתה/.test(src), false);
  assert.equal(/\["כיתה\s+[אבגדהו]/.test(src), false);
  assert.equal(/מוקד\s+[a-z0-9_]+/.test(src), false);
});

test("2) gen-science-needs-more-volume framedStem returns core only", () => {
  const src = readFileSync(
    join(ROOT, "scripts/gen-science-needs-more-volume.mjs"),
    "utf8"
  );
  assert.match(src, /function framedStem/);
  assert.doesNotMatch(
    src,
    /function framedStem[\s\S]{0,200}return `\$\{tag\}/
  );
  assert.match(src, /return String\(core/);
});

test("3) sanitizer remains idempotent", () => {
  const once = sanitizeStudentQuestionStem(DIRTY);
  assert.equal(once, CLEAN);
  assert.equal(sanitizeStudentQuestionStem(once), once);
});

test("4) legacy frozen activity displays clean via prepare pipeline", () => {
  const [q] = prepareAssignedActivityQuestionSetForStudentDisplay([
    {
      question: DIRTY,
      choices: ["א", "ב", "ג", "ד"],
      correctAnswer: "ג",
      subject: "science",
      skillId: "keep_skill",
      params: { diagnosticSkillId: "keep_diag" },
    },
  ]);
  assert.equal(q.question, CLEAN);
  assert.equal(detectStudentStemMetadataLeaks(q.question).leak, false);
});

test("5) new activity freezes clean stem unchanged", () => {
  const [q] = prepareAssignedActivityQuestionSetForStudentDisplay([
    {
      question: CLEAN,
      choices: ["א", "ב", "ג", "ד"],
      correctAnswer: "ב",
      subject: "science",
      topicKey: "snail_moisture_v3",
      gradeLevel: "g5",
      difficulty: "easy",
    },
  ]);
  assert.equal(q.question, CLEAN);
  assert.equal(q.topicKey, "snail_moisture_v3");
  assert.equal(q.gradeLevel, "g5");
  assert.equal(q.difficulty, "easy");
});

test("6-8) parent / student / class scopes share clean prepare path", () => {
  for (const scope of ["parent", "student", "class"]) {
    const [q] = prepareAssignedActivityQuestionSetForStudentDisplay([
      {
        question: DIRTY,
        choices: ["א", "ב", "ג", "ד"],
        correctAnswer: "א",
        subject: "science",
        scopeHint: scope,
        skillId: "sci_keep",
        params: { diagnosticSkillId: "diag_keep" },
      },
    ]);
    assert.equal(q.question, CLEAN, scope);
    assert.equal(q.correctAnswer, "א", scope);
    assert.deepEqual(q.choices, ["א", "ב", "ג", "ד"], scope);
    assert.equal(q.skillId, "sci_keep", scope);
    assert.equal(q.params.diagnosticSkillId, "diag_keep", scope);
  }
});

test("9) self-practice sanitize path cleans dirty stem", () => {
  const cleaned = sanitizeQuestionForStudentDisplay({
    stem: DIRTY,
    question: DIRTY,
    subject: "science",
  });
  assert.equal(cleaned.question, CLEAN);
  assert.equal(cleaned.stem, CLEAN);
});

test("10) diagnostic metadata remains on object", () => {
  const cleaned = sanitizeQuestionForStudentDisplay({
    question: DIRTY,
    topicKey: "animals",
    skillId: "sci_animals_g5_easy_snail_moisture",
    subskillId: "snail_moisture",
    gradeLevel: "g5",
    difficulty: "easy",
    params: { diagnosticSkillId: "keep", conceptTag: "snail_moisture_v3" },
  });
  assert.equal(cleaned.topicKey, "animals");
  assert.equal(cleaned.skillId, "sci_animals_g5_easy_snail_moisture");
  assert.equal(cleaned.subskillId, "snail_moisture");
  assert.equal(cleaned.gradeLevel, "g5");
  assert.equal(cleaned.difficulty, "easy");
  assert.equal(cleaned.params.diagnosticSkillId, "keep");
  assert.equal(cleaned.params.conceptTag, "snail_moisture_v3");
});

test("11) correctAnswer / choices / matching fields are unchanged", () => {
  const [q] = prepareAssignedActivityQuestionSetForStudentDisplay([
    {
      question: DIRTY,
      choices: ["נכון", "לא נכון", "חלקית", "לא יודע"],
      correctAnswer: "נכון",
      subject: "science",
    },
  ]);
  assert.equal(q.correctAnswer, "נכון");
  assert.deepEqual(q.choices, ["נכון", "לא נכון", "חלקית", "לא יודע"]);
});

test("12) Science product level is regular-only (UI label wiring)", () => {
  const scienceMaster = readFileSync(
    join(ROOT, "pages/learning/science-master.js"),
    "utf8"
  );
  assert.match(scienceMaster, /studentDisplayLevelLabel\("regular"\)/);
  assert.match(
    scienceMaster,
    /easy:\s*\{\s*name:\s*"קל"/
  );
  // Internal tiers exist; advanced is not a subject-level SCIENCE option in subtitle
  assert.doesNotMatch(
    scienceMaster,
    /studentDisplayLevelLabel\("advanced"\)/
  );
});

test("frozen mapper cleans legacy stem without DB rewrite", () => {
  const mapped = mapFrozenQuestionDetail(
    {
      question: DIRTY,
      choices: ["א", "ב", "ג", "ד"],
      correctAnswer: "ב",
      subject: "science",
      skillKey: "sci_keep",
    },
    0,
    { subject: "science" }
  );
  assert.equal(mapped.questionText, CLEAN);
  assert.equal(mapped.skillKey, "sci_keep");
  assert.deepEqual(mapped.choices, ["א", "ב", "ג", "ד"]);
});

test("english natural stem preserved; technical מוקד stripped", () => {
  assert.equal(
    sanitizeStudentQuestionStem("I have ___ finished my project"),
    "I have ___ finished my project"
  );
  assert.equal(sanitizeStudentQuestionStem("מוקד present_perfect_v3"), "");
});

test("geometry gradeTag no longer interpolated in generator source", () => {
  const geo = readFileSync(
    join(ROOT, "utils/geometry-question-generator.js"),
    "utf8"
  );
  assert.doesNotMatch(geo, /\$\{gradeTag \? `\$\{gradeTag\}/);
  assert.equal(
    sanitizeStudentQuestionStem(
      "כיתה ג׳ | לפי השרטוט, איזה יחס מתקיים בין שני הישרים?"
    ),
    "לפי השרטוט, איזה יחס מתקיים בין שני הישרים?"
  );
});
