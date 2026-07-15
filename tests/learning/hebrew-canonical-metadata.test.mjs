/**
 * Q2-C4 — Hebrew canonical metadata population
 * Run: node --test tests/learning/hebrew-canonical-metadata.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  enrichHebrewPoolRowWithCanonicalMetadata,
  attachCanonicalMetadataToHebrewQuestion,
  inferHebrewQuestionType,
  inferHebrewProblemClass,
  deriveHebrewRequiresVisual,
  mapHebrewAnswerFormat,
  resolveHebrewSkillId,
  isHebrewEmptyPool,
} from "../../lib/learning/hebrew-canonical-metadata.js";
import { QUESTION_METADATA_CONTRACT_VERSION } from "../../lib/learning/question-metadata-normalizer.js";
import { generateQuestion } from "../../utils/hebrew-question-generator.js";
import { normalizeAndFreezeQuestionSet } from "../../lib/classroom-activities/assigned-activity-snapshot.server.js";

const COMP_ROW = {
  topic: "comprehension",
  minGrade: 3,
  maxGrade: 3,
  levels: ["easy"],
  patternFamily: "passage_explicit",
  subtype: "detail",
  distractorFamily: "wrong_detail",
  diagnosticSkillId: "he_comp_explicit_detail",
  probePower: "medium",
  expectedErrorTags: ["detail_recall_error", "comprehension_gap"],
  question: "מה פרט מפורש מהקטע?",
  answers: ["a", "b", "c", "d"],
  correct: 0,
  difficulty: "basic",
  cognitiveLevel: "understanding",
};

const VOCAB_ROW = {
  topic: "vocabulary",
  gradeBand: "mid",
  levels: ["easy", "medium"],
  patternFamily: "synonym",
  subtype: "near_meaning",
  distractorFamily: "semantic_near",
  diagnosticSkillId: "he_vocab_synonym",
  expectedErrorTags: ["synonym_confusion", "vocabulary_confusion"],
  question: "מה מילה נרדפת?",
  answers: ["a", "b", "c", "d"],
  correct: 1,
  difficulty: "basic",
  cognitiveLevel: "recall",
};

const GRAMMAR_ROW = {
  topic: "grammar",
  minGrade: 3,
  maxGrade: 3,
  levels: ["medium", "hard"],
  patternFamily: "gender_number",
  subtype: "plural",
  distractorFamily: "agreement_error",
  diagnosticSkillId: "he_gram_gender_number",
  expectedErrorTags: ["gender_number_error", "agreement_error"],
  question: "בחרו את הצורה הנכונה",
  answers: ["a", "b", "c", "d"],
  correct: 2,
  cognitiveLevel: "understanding",
};

const SPARSE_LEGACY_ROW = {
  question: "איזה משפט נכון?",
  answers: ["נכון", "לא נכון"],
  correct: 0,
  subtopicId: "g1.one_sentence_who_what",
  patternFamily: "g1_why_hat",
  subtype: "cause_warmth",
};

function assertCanonicalBlock(cm) {
  assert.equal(cm.contractVersion, QUESTION_METADATA_CONTRACT_VERSION);
  assert.equal(cm.subject, "hebrew");
  assert.ok(cm.skillId);
  assert.ok(cm.subSkill);
  assert.equal(cm.requiresAudio, false);
  assert.ok(["high", "medium", "low"].includes(cm.metadataConfidence));
}

describe("Q2-C4 - Hebrew pool enrichment", () => {
  test("comprehension row keeps explicit diagnosticSkillId", () => {
    const out = enrichHebrewPoolRowWithCanonicalMetadata(COMP_ROW, { topic: "comprehension" });
    const cm = out.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "he_comp_explicit_detail");
    assert.equal(cm.subSkill, "detail");
    assert.equal(cm.questionType, "reading_comprehension");
    assert.equal(cm.problemClass, "mixed");
    assert.equal(cm.answerFormat, "mcq");
    assert.ok(cm.possibleErrorPatterns?.includes("detail_recall_error"));
  });

  test("vocabulary row maps synonym → vocabulary questionType", () => {
    const out = enrichHebrewPoolRowWithCanonicalMetadata(VOCAB_ROW, { topic: "vocabulary" });
    const cm = out.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "he_vocab_synonym");
    assert.equal(cm.questionType, "vocabulary");
    assert.equal(cm.problemClass, "conceptual");
  });

  test("grammar row maps gender_number → grammar questionType", () => {
    const out = enrichHebrewPoolRowWithCanonicalMetadata(GRAMMAR_ROW, { topic: "grammar" });
    const cm = out.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "he_gram_gender_number");
    assert.equal(cm.questionType, "grammar");
    assert.equal(cm.problemClass, "conceptual");
  });

  test("sparse legacy row gets heb fallback skill id", () => {
    const out = enrichHebrewPoolRowWithCanonicalMetadata(SPARSE_LEGACY_ROW, {
      topic: "reading",
    });
    const cm = out.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "heb_reading_g1_one_sentence_who_what");
    assert.equal(cm.metadataConfidence, "low");
  });

  test("empty pool stays low confidence and not diagnostic-eligible", () => {
    const cm = attachCanonicalMetadataToHebrewQuestion(
      {
        question: "placeholder",
        correctAnswer: "הבנתי",
        topic: "grammar",
        answerMode: "choice",
        params: { kind: "empty_pool", patternFamily: "no_questions" },
      },
      { topic: "grammar", gradeKey: "g3", levelKey: "easy" }
    ).params.canonicalMetadata;
    assert.equal(cm.metadataConfidence, "low");
    assert.equal(cm.diagnosticEligibleByMetadata, false);
    assert.equal(isHebrewEmptyPool({ kind: "empty_pool" }), true);
  });

  test("idempotent when canonicalMetadata already present", () => {
    const once = attachCanonicalMetadataToHebrewQuestion(
      {
        question: "test",
        correctAnswer: "a",
        topic: "vocabulary",
        answerMode: "choice",
        params: { patternFamily: "synonym", subtype: "near_meaning" },
      },
      { topic: "vocabulary", gradeKey: "g4", levelKey: "easy" }
    );
    const twice = attachCanonicalMetadataToHebrewQuestion(once, {
      topic: "vocabulary",
      gradeKey: "g4",
      levelKey: "easy",
    });
    assert.strictEqual(twice, once);
  });
});

const HEBREW_EASY = { name: "קל" };
const HEBREW_MEDIUM = { name: "בינוני" };

describe("Q2-C4 - Hebrew generator attach", () => {
  test("generateQuestion comprehension attaches params.canonicalMetadata", () => {
    const q = generateQuestion(HEBREW_EASY, "comprehension", "g3", null, {
      excludeFingerprints: new Set(),
    });
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm, "expected params.canonicalMetadata");
    assertCanonicalBlock(cm);
    assert.equal(cm.questionType, "reading_comprehension");
    assert.equal(cm.answerFormat, "mcq");
    assert.ok(cm.skillId);
  });

  test("generateQuestion vocabulary attaches metadata", () => {
    const q = generateQuestion(HEBREW_EASY, "vocabulary", "g4", null, {
      excludeFingerprints: new Set(),
    });
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm);
    assert.equal(cm.questionType, "vocabulary");
    assert.ok(cm.skillId);
  });

  test("generateQuestion grammar attaches metadata", () => {
    const q = generateQuestion(HEBREW_MEDIUM, "grammar", "g3", null, {
      excludeFingerprints: new Set(),
    });
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm);
    assert.equal(cm.questionType, "grammar");
    assert.ok(cm.skillId);
  });
});

describe("Q2-C4 - HEBREW_RICH_POOL bank coverage", () => {
  test("all rich pool rows have row.canonicalMetadata", async () => {
    const { HEBREW_RICH_POOL } = await import("../../utils/hebrew-rich-question-bank.js");
    assert.ok(Array.isArray(HEBREW_RICH_POOL));
    assert.ok(HEBREW_RICH_POOL.length > 30);

    let withCanonical = 0;
    let withSkillId = 0;
    for (const row of HEBREW_RICH_POOL) {
      const cm = row?.canonicalMetadata;
      if (cm && typeof cm === "object") withCanonical += 1;
      if (cm?.skillId) withSkillId += 1;
    }

    assert.equal(withCanonical, HEBREW_RICH_POOL.length);
    assert.equal(withSkillId, HEBREW_RICH_POOL.length);
  });
});

describe("Q2-C4 - helpers", () => {
  test("inferHebrewQuestionType maps topics", () => {
    assert.equal(inferHebrewQuestionType("comprehension", {}), "reading_comprehension");
    assert.equal(inferHebrewQuestionType("vocabulary", { patternFamily: "antonym" }), "vocabulary");
    assert.equal(inferHebrewQuestionType("grammar", { patternFamily: "tense_shift" }), "grammar");
    assert.equal(inferHebrewQuestionType("writing", { patternFamily: "free_write" }), null);
  });

  test("resolveHebrewSkillId prefers explicit diagnosticSkillId", () => {
    assert.equal(
      resolveHebrewSkillId("grammar", { diagnosticSkillId: "he_gram_agreement" }),
      "he_gram_agreement"
    );
    assert.equal(
      resolveHebrewSkillId("vocabulary", { subtype: "register" }, { subtype: "register" }),
      "heb_vocabulary_register"
    );
  });

  test("mapHebrewAnswerFormat typing → text", () => {
    assert.equal(mapHebrewAnswerFormat({ answerMode: "typing" }), "text");
    assert.equal(mapHebrewAnswerFormat({ answerMode: "choice" }), "mcq");
  });

  test("deriveHebrewRequiresVisual false without assets", () => {
    assert.equal(deriveHebrewRequiresVisual({}, {}), false);
    assert.equal(deriveHebrewRequiresVisual({}, { diagram: "x.svg" }), true);
  });
});

describe("Q2-C4 - freeze preserves hebrew canonicalMetadata", () => {
  test("normalizeAndFreezeQuestionSet keeps params.canonicalMetadata", () => {
    const q = generateQuestion(HEBREW_EASY, "grammar", "g3", null, {
      excludeFingerprints: new Set(),
    });
    const playable = {
      question: q.question,
      correct_answer: q.correctAnswer,
      choices: q.answers,
      subject: "hebrew",
      topic: q.topic,
      grade: "g3",
      difficulty: "easy",
      skill_key: q.params?.diagnosticSkillId,
      params: q.params,
    };

    const frozen = normalizeAndFreezeQuestionSet([playable], {
      subject: "hebrew",
      topic: q.topic,
      grade: "g3",
    });

    assert.ok(frozen[0].params?.canonicalMetadata?.skillId);
    assert.equal(
      frozen[0].params?.canonicalMetadata?.answerFormat,
      q.params?.canonicalMetadata?.answerFormat
    );
  });
});
