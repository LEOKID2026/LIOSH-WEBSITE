/**
 * Q2-C3 — English canonical metadata population
 * Run: node --test tests/learning/english-canonical-metadata.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  enrichEnglishPoolRowWithCanonicalMetadata,
  attachCanonicalMetadataToEnglishQuestion,
  inferEnglishQuestionType,
  inferEnglishProblemClass,
  deriveEnglishRequiresVisual,
  mapEnglishAnswerFormat,
  resolveEnglishSkillId,
} from "../../lib/learning/english-canonical-metadata.js";
import { QUESTION_METADATA_CONTRACT_VERSION } from "../../lib/learning/question-metadata-normalizer.js";
import { generateQuestion } from "../../utils/english-question-generator.js";
import { normalizeAndFreezeQuestionSet } from "../../lib/classroom-activities/assigned-activity-snapshot.server.js";

const GRAMMAR_ROW = {
  question: "She ___ happy.",
  correct: "is",
  options: ["is", "are", "am", "be"],
  patternFamily: "grammar_be_present",
  distractorFamily: "grammar_forms",
  diagnosticSkillId: "en_grammar_be_present",
  subtype: "be_basic",
  cognitiveLevel: "understanding",
  difficulty: "basic",
  expectedErrorTags: ["verb_form_confusion", "subject_verb_agreement"],
};

const TRANSLATION_ROW = {
  en: "Please sit down",
  he: "בבקשה שבו",
  patternFamily: "translation_classroom_g1",
  difficulty: "basic",
  cognitiveLevel: "recall",
};

const SENTENCE_ROW = {
  template: "I ___ to school every day.",
  correct: "go",
  options: ["go", "goes", "going", "went"],
  patternFamily: "routine_present_simple",
  skillId: "routine_present_simple",
  subtype: "routine",
  difficulty: "basic",
};

function assertCanonicalBlock(cm) {
  assert.equal(cm.contractVersion, QUESTION_METADATA_CONTRACT_VERSION);
  assert.equal(cm.subject, "english");
  assert.ok(cm.skillId);
  assert.ok(cm.subSkill);
  assert.equal(cm.requiresAudio, false);
  assert.ok(["high", "medium", "low"].includes(cm.metadataConfidence));
}

function countPoolRows(pools) {
  let total = 0;
  for (const rows of Object.values(pools)) {
    if (Array.isArray(rows)) total += rows.length;
  }
  return total;
}

describe("Q2-C3 - English pool enrichment", () => {
  test("grammar row keeps explicit diagnosticSkillId", () => {
    const out = enrichEnglishPoolRowWithCanonicalMetadata(GRAMMAR_ROW, {
      topic: "grammar",
      poolKey: "be_basic",
    });
    const cm = out.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "en_grammar_be_present");
    assert.equal(cm.subSkill, "be_basic");
    assert.equal(cm.questionType, "grammar");
    assert.equal(cm.problemClass, "conceptual");
    assert.equal(cm.answerFormat, "mcq");
    assert.ok(cm.possibleErrorPatterns?.includes("verb_form_confusion"));
  });

  test("translation row gets eng_translation_{poolKey} fallback", () => {
    const out = enrichEnglishPoolRowWithCanonicalMetadata(TRANSLATION_ROW, {
      topic: "translation",
      poolKey: "classroom",
    });
    const cm = out.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "eng_translation_classroom");
    assert.equal(cm.subSkill, "translation_classroom_g1");
    assert.equal(cm.questionType, "translation");
    assert.equal(cm.problemClass, "mixed");
  });

  test("sentence row uses skillId field", () => {
    const out = enrichEnglishPoolRowWithCanonicalMetadata(SENTENCE_ROW, {
      topic: "sentences",
      poolKey: "routine",
    });
    const cm = out.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "routine_present_simple");
    assert.equal(cm.subSkill, "routine");
    assert.equal(cm.questionType, "grammar");
    assert.equal(cm.problemClass, "conceptual");
  });

  test("empty pool pattern stays low confidence", () => {
    const cm = attachCanonicalMetadataToEnglishQuestion(
      {
        question: "placeholder",
        correctAnswer: "הבנתי",
        topic: "grammar",
        qType: "choice",
        params: { patternFamily: "english_empty_pool" },
      },
      { topic: "grammar", gradeKey: "g3", levelKey: "easy" }
    ).params.canonicalMetadata;
    assert.equal(cm.metadataConfidence, "low");
    assert.equal(cm.diagnosticEligibleByMetadata, false);
  });

  test("idempotent when canonicalMetadata already present", () => {
    const once = attachCanonicalMetadataToEnglishQuestion(
      {
        question: "test",
        correctAnswer: "a",
        topic: "vocabulary",
        qType: "choice",
        params: {
          listKey: "colors",
          patternFamily: "vocab_translation",
          direction: "en_to_he",
        },
      },
      { topic: "vocabulary", gradeKey: "g3", levelKey: "easy" }
    );
    const twice = attachCanonicalMetadataToEnglishQuestion(once, {
      topic: "vocabulary",
      gradeKey: "g3",
      levelKey: "easy",
    });
    assert.strictEqual(twice, once);
  });
});

describe("Q2-C3 - English generator attach", () => {
  test("generateQuestion grammar attaches params.canonicalMetadata", () => {
    const q = generateQuestion(1, "grammar", "g3", null, "easy", {
      forceSkillId: "en_grammar_be_present",
    });
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm, "expected params.canonicalMetadata");
    assertCanonicalBlock(cm);
    assert.equal(cm.questionType, "grammar");
    assert.equal(cm.answerFormat, "mcq");
    assert.ok(cm.skillId);
  });

  test("generateQuestion vocabulary uses eng_vocabulary_{listKey}", () => {
    const q = generateQuestion(1, "vocabulary", "g3", null, "easy", {
      forceSkillId: "en_vocab_colors",
    });
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm);
    assert.match(cm.skillId, /^eng_vocabulary_/);
    assert.equal(cm.questionType, "vocabulary");
  });

  test("generateQuestion translation attaches metadata", () => {
    const q = generateQuestion(1, "translation", "g3", null, "easy", null);
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm);
    assert.equal(cm.questionType, "translation");
    assert.ok(cm.skillId);
  });

  test("generateQuestion sentences attaches metadata", () => {
    const q = generateQuestion(1, "sentences", "g3", null, "easy", null);
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm);
    assert.equal(cm.questionType, "grammar");
    assert.ok(cm.skillId);
  });
});

describe("Q2-C3 - English pool bank coverage", () => {
  test("exported pools have row.canonicalMetadata", async () => {
    const { GRAMMAR_POOLS, SENTENCE_POOLS, TRANSLATION_POOLS } = await import(
      "../../data/english-questions/index.js"
    );

    const grammarTotal = countPoolRows(GRAMMAR_POOLS);
    const sentenceTotal = countPoolRows(SENTENCE_POOLS);
    const translationTotal = countPoolRows(TRANSLATION_POOLS);
    const total = grammarTotal + sentenceTotal + translationTotal;

    assert.ok(grammarTotal > 50);
    assert.ok(sentenceTotal > 20);
    assert.ok(translationTotal > 50);

    let withCanonical = 0;
    let withSkillId = 0;
    for (const pools of [GRAMMAR_POOLS, SENTENCE_POOLS, TRANSLATION_POOLS]) {
      for (const rows of Object.values(pools)) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          const cm = row?.canonicalMetadata;
          if (cm && typeof cm === "object") withCanonical += 1;
          if (cm?.skillId) withSkillId += 1;
        }
      }
    }

    assert.equal(withCanonical, total);
    assert.equal(withSkillId, total);
  });
});

describe("Q2-C3 - helpers", () => {
  test("inferEnglishQuestionType maps topics", () => {
    assert.equal(inferEnglishQuestionType("grammar", {}), "grammar");
    assert.equal(inferEnglishQuestionType("vocabulary", {}), "vocabulary");
    assert.equal(inferEnglishQuestionType("translation", {}), "translation");
    assert.equal(inferEnglishQuestionType("writing", {}), "translation");
  });

  test("inferEnglishProblemClass he_to_en → mixed", () => {
    assert.equal(inferEnglishProblemClass("translation", { direction: "he_to_en" }), "mixed");
  });

  test("resolveEnglishSkillId vocabulary listKey", () => {
    assert.equal(
      resolveEnglishSkillId("vocabulary", { listKey: "colors" }),
      "eng_vocabulary_colors"
    );
  });

  test("mapEnglishAnswerFormat typing → text", () => {
    assert.equal(mapEnglishAnswerFormat("typing", { answerMode: "typing" }), "text");
    assert.equal(mapEnglishAnswerFormat("choice", {}), "mcq");
  });

  test("deriveEnglishRequiresVisual false without assets", () => {
    assert.equal(deriveEnglishRequiresVisual({}, {}), false);
    assert.equal(deriveEnglishRequiresVisual({}, { imageUrl: "x.png" }), true);
  });
});

describe("Q2-C3 - freeze preserves english canonicalMetadata", () => {
  test("normalizeAndFreezeQuestionSet keeps params.canonicalMetadata", () => {
    const q = generateQuestion(1, "grammar", "g3", null, "easy", {
      forceSkillId: "en_grammar_be_present",
    });
    const playable = {
      question: q.question,
      correct_answer: q.correctAnswer,
      choices: q.answers,
      subject: "english",
      topic: q.topic,
      grade: "g3",
      difficulty: "easy",
      skill_key: q.params?.diagnosticSkillId,
      params: q.params,
    };

    const frozen = normalizeAndFreezeQuestionSet([playable], {
      subject: "english",
      topic: "grammar",
      grade: "g3",
    });

    assert.ok(frozen[0].params?.canonicalMetadata?.skillId);
    assert.equal(frozen[0].params?.canonicalMetadata?.answerFormat, "mcq");
  });
});
