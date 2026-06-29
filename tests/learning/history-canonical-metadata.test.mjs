/**
 * History canonical metadata population
 * Run: node --test tests/learning/history-canonical-metadata.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  enrichHistoryBankRowWithCanonicalMetadata,
  inferHistoryQuestionType,
  inferHistoryProblemClass,
  deriveHistoryRequiresVisual,
  mapHistoryRowTypeToAnswerFormat,
} from "../../lib/learning/history-canonical-metadata.js";
import { QUESTION_METADATA_CONTRACT_VERSION } from "../../lib/learning/question-metadata-normalizer.js";
import { normalizeAndFreezeQuestionSet } from "../../lib/classroom-activities/assigned-activity-snapshot.server.js";

const RICH_ROW = {
  id: "hist_g6_sample_1",
  topic: "what_is_history",
  subtopicKey: "hist_sub_intro_sources_timeline",
  grades: ["g6"],
  minLevel: "easy",
  type: "mcq",
  stem: "מהו מקור ראשוני?",
  options: ["a", "b", "c", "d"],
  correctIndex: 0,
  explanation: "מקור ראשוני נוצר בזמן האירוע.",
  params: {
    subtopicKey: "hist_sub_intro_sources_timeline",
    subskillId: "hist_sub_intro_sources_timeline",
    patternFamily: "history_primary_source",
    subtype: "hist_sub_intro_sources_timeline",
    diagnosticSkillId: "hist_concepts",
    probePower: "medium",
    expectedErrorTypes: ["source_type_confusion", "concept_confusion"],
    cognitiveLevel: "understanding",
    difficulty: "basic",
  },
};

function assertCanonicalBlock(cm) {
  assert.equal(cm.contractVersion, QUESTION_METADATA_CONTRACT_VERSION);
  assert.equal(cm.subject, "history");
  assert.ok(cm.skillId);
  assert.ok(cm.subSkill);
  assert.equal(cm.answerFormat, "mcq");
  assert.equal(cm.requiresAudio, false);
  assert.ok(["high", "medium", "low"].includes(cm.metadataConfidence));
}

describe("history bank enrichment", () => {
  test("rich row populates full canonicalMetadata", () => {
    const out = enrichHistoryBankRowWithCanonicalMetadata(RICH_ROW);
    const cm = out.params.canonicalMetadata;
    assertCanonicalBlock(cm);
    assert.equal(cm.skillId, "hist_concepts");
    assert.equal(cm.subSkill, "hist_sub_intro_sources_timeline");
    assert.equal(cm.questionType, "technical");
    assert.equal(out.subSkill, "hist_sub_intro_sources_timeline");
  });

  test("idempotent when canonicalMetadata already present", () => {
    const once = enrichHistoryBankRowWithCanonicalMetadata(RICH_ROW);
    const twice = enrichHistoryBankRowWithCanonicalMetadata(once);
    assert.strictEqual(twice, once);
  });

  test("source error tags → reading_comprehension questionType", () => {
    const qt = inferHistoryQuestionType(
      { topic: "what_is_history" },
      { expectedErrorTypes: ["source_reading", "concept_confusion"] }
    );
    assert.equal(qt, "reading_comprehension");
  });

  test("mapHistoryRowTypeToAnswerFormat defaults mcq", () => {
    assert.equal(mapHistoryRowTypeToAnswerFormat("mcq"), "mcq");
    assert.equal(mapHistoryRowTypeToAnswerFormat(undefined), "mcq");
  });

  test("deriveHistoryRequiresVisual false without assets", () => {
    assert.equal(deriveHistoryRequiresVisual({ topic: "classical_greece" }, {}), false);
  });
});

describe("HISTORY_QUESTIONS bank coverage", () => {
  test("all exported bank rows have params.canonicalMetadata", async () => {
    const { HISTORY_QUESTIONS } = await import("../../data/history-questions/index.js");
    assert.ok(Array.isArray(HISTORY_QUESTIONS));
    assert.ok(HISTORY_QUESTIONS.length >= 650);

    let withCanonical = 0;
    let withSkillId = 0;
    for (const row of HISTORY_QUESTIONS) {
      const cm = row?.params?.canonicalMetadata;
      if (cm && typeof cm === "object") withCanonical += 1;
      if (cm?.skillId) withSkillId += 1;
    }

    assert.equal(withCanonical, HISTORY_QUESTIONS.length);
    assert.equal(withSkillId, HISTORY_QUESTIONS.length);
  });
});

describe("freeze preserves history canonicalMetadata", () => {
  test("normalizeAndFreezeQuestionSet keeps params.canonicalMetadata", () => {
    const enriched = enrichHistoryBankRowWithCanonicalMetadata(RICH_ROW);
    const playable = {
      question: enriched.stem,
      correct_answer: enriched.options[enriched.correctIndex],
      choices: enriched.options,
      subject: "history",
      topic: enriched.topic,
      grade: "g6",
      difficulty: "easy",
      skill_key: enriched.params.diagnosticSkillId,
      params: enriched.params,
    };

    const frozen = normalizeAndFreezeQuestionSet([playable], {
      subject: "history",
      topic: "what_is_history",
      grade: "g6",
    });

    assert.equal(frozen[0].params?.canonicalMetadata?.skillId, "hist_concepts");
    assert.equal(frozen[0].params?.canonicalMetadata?.answerFormat, "mcq");
  });
});
