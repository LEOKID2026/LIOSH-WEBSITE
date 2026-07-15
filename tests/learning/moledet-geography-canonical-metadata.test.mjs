/**
 * Q2-C5 — Moledet/Geography canonical metadata population
 * Run: node --test tests/learning/moledet-geography-canonical-metadata.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  enrichMoledetBankRowWithCanonicalMetadata,
  buildMoledetFrozenParamsFromBankRow,
  attachCanonicalMetadataToMoledetQuestion,
  inferMoledetQuestionType,
  inferMoledetProblemClass,
  deriveMoledetRequiresVisual,
  mapMoledetAnswerFormat,
  resolveMoledetSkillId,
  isMoledetEmptyPool,
} from "../../lib/learning/moledet-geography-canonical-metadata.js";
import { QUESTION_METADATA_CONTRACT_VERSION } from "../../lib/learning/question-metadata-normalizer.js";
import { generateQuestion } from "../../utils/moledet-geography-question-generator.js";
import { normalizeAndFreezeQuestionSet } from "../../lib/classroom-activities/assigned-activity-snapshot.server.js";

const HOMELAND_ROW = {
  question: "מה היא בירת ישראל?",
  answers: ["ירושלים", "תל אביב", "חיפה", "באר שבע"],
  correct: 0,
  skillId: "moledet_geo_homeland",
  subtype: "g3",
  difficulty: "basic",
  cognitiveLevel: "recall",
  expectedErrorTypes: [
    "place_identification_error",
    "detail_recall_error",
    "vocabulary_confusion",
    "careless_error",
  ],
};

const MAPS_ROW = {
  question: "מה זה קואורדינטות?",
  answers: ["מיקום במפה", "צבעים במפה", "מספרים במפה", "אותיות במפה"],
  correct: 0,
  skillId: "moledet_geo_maps",
  subtype: "g5",
  difficulty: "basic",
  cognitiveLevel: "application",
  expectedErrorTypes: [
    "map_reading_error",
    "direction_confusion",
    "geography_concept_confusion",
    "careless_error",
  ],
};

const CITIZENSHIP_ROW = {
  question: "מה זה מוסדות בסיסיים?",
  answers: ["ממשל, כנסת, ממשלה", "רק ממשל", "רק כנסת", "רק ממשלה"],
  correct: 0,
  skillId: "moledet_geo_citizenship",
  subtype: "g5",
  difficulty: "basic",
  cognitiveLevel: "understanding",
  expectedErrorTypes: ["reading_comprehension_error", "concept_confusion", "careless_error"],
};

function assertCanonicalBlock(cm) {
  assert.equal(cm.contractVersion, QUESTION_METADATA_CONTRACT_VERSION);
  assert.equal(cm.subject, "moledet_geography");
  assert.ok(cm.skillId);
  assert.ok(cm.subSkill);
  assert.equal(cm.requiresAudio, false);
  assert.equal(cm.answerFormat, "mcq");
  assert.ok(["high", "medium", "low"].includes(cm.metadataConfidence));
}

function countMoledetBankRows(pools) {
  let total = 0;
  for (const pool of pools) {
    if (!pool || typeof pool !== "object") continue;
    for (const rows of Object.values(pool)) {
      if (Array.isArray(rows)) total += rows.length;
    }
  }
  return total;
}

const MOLEDET_EASY = { name: "קל" };

describe("Q2-C5 - Moledet pool enrichment", () => {
  test("homeland fact row with vocabulary tag → vocabulary questionType", () => {
    const out = enrichMoledetBankRowWithCanonicalMetadata(HOMELAND_ROW, {
      topic: "homeland",
      gradeKey: "g3",
    });
    const cm = out.params.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "moledet_geo_homeland");
    assert.equal(cm.questionType, "vocabulary");
    assert.equal(cm.problemClass, "conceptual");
    assert.equal(cm.requiresVisual, false);
    assert.ok(cm.possibleErrorPatterns?.includes("vocabulary_confusion"));
  });

  test("maps row → reading_comprehension (text map literacy)", () => {
    const out = enrichMoledetBankRowWithCanonicalMetadata(MAPS_ROW, {
      topic: "maps",
      gradeKey: "g5",
    });
    const cm = out.params.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "moledet_geo_maps");
    assert.equal(cm.questionType, "reading_comprehension");
    assert.equal(cm.problemClass, "mixed");
    assert.equal(cm.requiresVisual, false);
  });

  test("citizenship row → reading_comprehension", () => {
    const out = enrichMoledetBankRowWithCanonicalMetadata(CITIZENSHIP_ROW, {
      topic: "citizenship",
    });
    const cm = out.params.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.questionType, "reading_comprehension");
    assert.equal(cm.problemClass, "mixed");
  });

  test("vocabulary error tag maps to vocabulary questionType", () => {
    const qt = inferMoledetQuestionType(
      "homeland",
      { cognitiveLevel: "recall", expectedErrorTypes: ["vocabulary_confusion"] },
      HOMELAND_ROW
    );
    assert.equal(qt, "vocabulary");
  });

  test("empty pool low confidence", () => {
    const out = attachCanonicalMetadataToMoledetQuestion(
      { emptyPool: true, params: { poolFallbackCode: "empty_pool" } },
      { topic: "homeland", gradeKey: "g3" }
    );
    assert.equal(out.params.canonicalMetadata.metadataConfidence, "low");
    assert.equal(out.params.canonicalMetadata.diagnosticEligibleByMetadata, false);
    assert.equal(isMoledetEmptyPool({ poolFallbackCode: "empty_pool" }), true);
  });

  test("idempotent when canonicalMetadata already present", () => {
    const once = enrichMoledetBankRowWithCanonicalMetadata(HOMELAND_ROW, { topic: "homeland" });
    const twice = enrichMoledetBankRowWithCanonicalMetadata(once, { topic: "homeland" });
    assert.strictEqual(twice, once);
  });
});

describe("Q2-C5 - freeze params preservation", () => {
  test("buildMoledetFrozenParamsFromBankRow includes canonicalMetadata", () => {
    const params = buildMoledetFrozenParamsFromBankRow(HOMELAND_ROW, "homeland", "g3", "easy");
    assert.ok(params.canonicalMetadata);
    assert.equal(params.canonicalMetadata.skillId, "moledet_geo_homeland");
    assert.equal(params.diagnosticSkillId, "moledet_geo_homeland");
    assert.ok(Array.isArray(params.expectedErrorTags));
  });

  test("normalizeAndFreezeQuestionSet keeps params.canonicalMetadata from frozen adapter shape", () => {
    const params = buildMoledetFrozenParamsFromBankRow(MAPS_ROW, "maps", "g5", "easy");
    const playable = {
      question: MAPS_ROW.question,
      correct_answer: MAPS_ROW.answers[MAPS_ROW.correct],
      choices: MAPS_ROW.answers,
      subject: "moledet_geography",
      topic: "maps",
      grade: "g5",
      difficulty: "easy",
      skill_key: params.diagnosticSkillId,
      params,
    };

    const frozen = normalizeAndFreezeQuestionSet([playable], {
      subject: "moledet_geography",
      topic: "maps",
      grade: "g5",
    });

    assert.equal(frozen[0].params?.canonicalMetadata?.skillId, "moledet_geo_maps");
    assert.equal(frozen[0].params?.canonicalMetadata?.questionType, "reading_comprehension");
    assert.equal(frozen[0].params?.diagnosticSkillId, "moledet_geo_maps");
  });
});

describe("Q2-C5 - generator attach", () => {
  test("generateQuestion attaches params.canonicalMetadata", () => {
    const q = generateQuestion(MOLEDET_EASY, "homeland", "g3", null, null);
    assert.notEqual(q.emptyPool, true);
    const cm = q?.params?.canonicalMetadata;
    assert.ok(cm);
    assertCanonicalBlock(cm);
    assert.ok(cm.skillId);
  });
});

describe("Q2-C5 - geography bank coverage", () => {
  test("all exported bank rows have params.canonicalMetadata", async () => {
    const geo = await import("../../data/geography-questions/index.js");
    const pools = [
      geo.G2_EASY_QUESTIONS,
      geo.G2_MEDIUM_QUESTIONS,
      geo.G2_HARD_QUESTIONS,
      geo.G3_EASY_QUESTIONS,
      geo.G3_MEDIUM_QUESTIONS,
      geo.G3_HARD_QUESTIONS,
      geo.G4_EASY_QUESTIONS,
      geo.G4_MEDIUM_QUESTIONS,
      geo.G4_HARD_QUESTIONS,
      geo.G5_EASY_QUESTIONS,
      geo.G5_MEDIUM_QUESTIONS,
      geo.G5_HARD_QUESTIONS,
      geo.G6_EASY_QUESTIONS,
      geo.G6_MEDIUM_QUESTIONS,
      geo.G6_HARD_QUESTIONS,
    ];

    const total = countMoledetBankRows(pools);
    assert.ok(total > 500);

    let withCanonical = 0;
    let withSkillId = 0;
    for (const pool of pools) {
      for (const rows of Object.values(pool)) {
        if (!Array.isArray(rows)) continue;
        for (const row of rows) {
          const cm = row?.params?.canonicalMetadata;
          if (cm && typeof cm === "object") withCanonical += 1;
          if (cm?.skillId) withSkillId += 1;
        }
      }
    }

    assert.equal(withCanonical, total);
    assert.equal(withSkillId, total);
  });
});

describe("Q2-C5 - helpers", () => {
  test("resolveMoledetSkillId keeps row skillId", () => {
    assert.equal(
      resolveMoledetSkillId("homeland", {}, { skillId: "moledet_geo_homeland" }),
      "moledet_geo_homeland"
    );
    assert.equal(
      resolveMoledetSkillId("maps", { subtype: "g5" }, {}),
      "moledet_geo_maps_g5"
    );
  });

  test("deriveMoledetRequiresVisual only with assets", () => {
    assert.equal(deriveMoledetRequiresVisual({}, { topic: "maps" }), false);
    assert.equal(deriveMoledetRequiresVisual({}, { mapUrl: "x.png" }), true);
  });

  test("mapMoledetAnswerFormat defaults mcq", () => {
    assert.equal(mapMoledetAnswerFormat({ answerMode: "choice" }), "mcq");
  });

  test("inferMoledetProblemClass citizenship → mixed", () => {
    assert.equal(inferMoledetProblemClass("citizenship", { cognitiveLevel: "understanding" }), "mixed");
  });
});
