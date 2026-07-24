import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  P3B_TOPIC_CLOSURE_PRODUCERS,
  randomWrongProducer,
} from "../../lib/learning/p3b-topic-closure-producers.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/index.js";
import { deriveMathMisconceptionEvidence } from "../../utils/math-topic-diagnostic-evidence.js";
import { assessSubskillCandidateSafety } from "../../utils/subskill-candidate-safety.js";
import { runP3RawTopicProducerScenario } from "../engine-decision-audit/p3-raw-evidence-harness.mjs";

const closureArtifact = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "artifacts",
      "qa",
      "decision-engine-p3b",
      "33-topic-coverage-closure.json"
    ),
    "utf8"
  )
);
const coverageArtifact = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "artifacts",
      "qa",
      "decision-engine-p3b",
      "p3b-coverage-closure.json"
    ),
    "utf8"
  )
);

test("33-topic closure artifact proves every required falsification gate", () => {
  assert.equal(
    closureArtifact.contract,
    "decision-engine-33-topic-coverage-closure-v2"
  );
  assert.deepEqual(closureArtifact.summary, {
    topics: 33,
    rawToActionPassed: 33,
    randomErrorPassed: 33,
    wrongTopicPassed: 33,
    gradeRelationSafetyPassed: 33,
    guidedOnlyPassed: 33,
    sameSessionPassed: 33,
    crossTopicTargets: 0,
  });
  // docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (Part 6):
  // triangles/circles verified to have no real per-option distractor
  // evidence in utils/geometry-question-generator.js — they are
  // topicLevelOnly producers with no taxonomy rule to match by design.
  // Topic-level passing counts as passing here too.
  const TOPIC_LEVEL_ONLY_NO_TAXONOMY = new Set(["triangles", "circles"]);
  for (const topic of closureArtifact.topics) {
    const isTopicLevelOnly = TOPIC_LEVEL_ONLY_NO_TAXONOMY.has(topic.topic);
    assert.equal(topic.producedMistakeTag != null, true, `${topic.subject}:${topic.topic}`);
    if (!isTopicLevelOnly) {
      assert.equal(topic.recurrenceResult.full, true, `${topic.subject}:${topic.topic}`);
    }
    assert.equal(
      topic.nearMissResult.status,
      isTopicLevelOnly ? "passed_topic_level_only" : "passed",
      `${topic.subject}:${topic.topic}`,
    );
    assert.equal(topic.randomErrorResult.status, "passed");
    assert.equal(topic.wrongTopicResult.status, "passed");
    assert.equal(
      topic.gradeRelationSafetyResult.status,
      "passed_topic_preserved"
    );
    const contentGrade = Number(topic.gradeRelationSafetyResult.contentGrade.slice(1));
    const registeredGrade = Number(
      topic.gradeRelationSafetyResult.registeredGrade.slice(1)
    );
    const expectedRelation =
      contentGrade < registeredGrade
        ? "lower"
        : contentGrade > registeredGrade
          ? "higher"
          : "same";
    assert.equal(topic.gradeRelationSafetyResult.gradeRelation, expectedRelation);
    assert.equal(
      topic.gradeRelationSafetyResult.selectedTaxonomy,
      topic.selectedTaxonomy
    );
    if (expectedRelation === "lower") {
      assert.equal(
        topic.gradeRelationSafetyResult.proofType,
        "grade_foundation_fallback"
      );
      assert.equal(
        topic.gradeRelationSafetyResult.finalTarget.prerequisiteDetail?.precision,
        "grade_foundation_area"
      );
    } else {
      assert.equal(
        topic.gradeRelationSafetyResult.proofType,
        "above_grade_topic_stability"
      );
      assert.equal(topic.gradeRelationSafetyResult.finalTarget.subskill, null);
    }
    assert.equal(topic.guidedOnlyResult.status, "passed");
    assert.equal(topic.sameSessionResult.status, "passed");
    assert.equal(topic.finalTarget.topic, topic.canonicalTopic);
  }
});

test("final 79-topic matrix is 72 passed, 7 mixed, zero unsupported or failed", () => {
  assert.equal(coverageArtifact.summary.topics.total, 79);
  assert.equal(coverageArtifact.summary.topics.rawToActionPassed, 72);
  assert.equal(coverageArtifact.summary.topics.mixedSafeFallback, 7);
  assert.equal(coverageArtifact.summary.topics.explicitlyUnsupported, 0);
  assert.equal(coverageArtifact.summary.topics.failed, 0);
  assert.equal(coverageArtifact.summary.topics.unexplainedUnsupported, 0);
  assert.equal(coverageArtifact.summary.topics.wrongTopicPassed, 79);
  assert.ok(coverageArtifact.summary.topics.withDeclaredGradeEvidence >= 77);
});

test("all 33 producers classify a selected answer from a real question", () => {
  assert.equal(P3B_TOPIC_CLOSURE_PRODUCERS.length, 33);
  for (const producer of P3B_TOPIC_CLOSURE_PRODUCERS) {
    const attempt = producer.loadAttempt(0);
    const evidence = classifyAnswerEvidence({
      subject: producer.subjectId,
      topic: attempt.runtimeTopic || producer.topicKey,
      question: attempt.question,
      userAnswer: attempt.userAnswer,
      expectedAnswer: attempt.expectedAnswer,
      selectedOptionIndex: attempt.selectedOptionIndex,
      isCorrect: false,
    });
    // topicLevelOnly producers (triangles/circles) have no expectedTag —
    // there is no dedicated taxonomy row to classify toward by design (see
    // docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md,
    // Part 6). The real question/wrong-answer pair is still required.
    if (!producer.topicLevelOnly) {
      assert.equal(
        evidence.detectedMisconception,
        producer.expectedTag,
        `${producer.subjectId}:${producer.topicKey}`
      );
    }
    assert.notEqual(attempt.userAnswer, attempt.expectedAnswer);
  }
});

test("all math topic tags are backed by reproducible misconception transformations", () => {
  const mathProducers = P3B_TOPIC_CLOSURE_PRODUCERS.filter(
    (producer) => producer.subjectId === "math"
  );
  assert.equal(mathProducers.length, 16);
  for (const producer of mathProducers) {
    const attempt = producer.loadAttempt(0);
    const proof = deriveMathMisconceptionEvidence(attempt.question);
    assert.ok(proof?.transformationId, producer.topicKey);
    assert.ok(proof?.transformation, producer.topicKey);
    assert.equal(String(proof.value), String(attempt.userAnswer), producer.topicKey);
    assert.equal(
      attempt.question.params.topicDiagnosticEvidence.transformationId,
      proof.transformationId,
      producer.topicKey
    );
  }
});

test("artifact questions are complete and structurally reconstructable", () => {
  for (const topic of closureArtifact.topics) {
    assert.ok(topic.actualQuestion?.trim(), `${topic.subject}:${topic.topic}`);
    assert.notEqual(topic.actualQuestion.trim(), "__");
    assert.notEqual(topic.actualQuestion.trim(), "= __");
    assert.equal(topic.questionStructure.topic, topic.canonicalTopic);
    assert.notEqual(topic.questionStructure.correctAnswer, null);
    assert.ok(topic.questionStructure.answers.length >= 2);
    assert.ok(
      Object.keys(topic.questionStructure.structuralParams || {}).length > 0,
      `${topic.subject}:${topic.topic}`
    );
  }
});

test("broad rules cannot leak semantically unrelated subskills", () => {
  for (const topicKey of [
    "triangles",
    "parallel_perpendicular",
    "solids",
    "tiling",
    "circles",
    "perimeter",
    "sentence",
    "environment",
  ]) {
    const topic = closureArtifact.topics.find((row) => row.topic === topicKey);
    assert.ok(topic, topicKey);
    assert.equal(topic.finalTarget.subskill, null, topicKey);
    assert.equal(topic.finalTarget.subskillId, null, topicKey);
  }
});

test("perimeter subskill distinguishes unit evidence from formula evidence", () => {
  const safetyFor = (tag) =>
    assessSubskillCandidateSafety({
      subjectId: "geometry",
      row: { questions: 10, accuracy: 40 },
      wrongs: [0, 1, 2].map((index) => ({
        isCorrect: false,
        mode: "practice",
        sessionId: `perimeter-${index % 2}`,
        expectedErrorTags: [tag],
        metadata: {
          metadataSource: "question_metadata_normalizer",
          answerEvidence: { detectedMisconception: tag },
        },
      })),
      taxonomyMatch: {
        normalizedBucketKey: "perimeter",
        subskillCandidate: "המרת יחידות",
        matchStrength: "strong",
      },
      candidateIdsRaw: ["G-06"],
      candidateIdsOrdered: ["G-06"],
      chosenId: "G-06",
      recurrenceMatched: true,
      independentEvidenceCount: 3,
      patternActiveRecently: true,
    });
  assert.equal(safetyFor("unit_error").safeToShowSubskill, true);
  const formula = safetyFor("formula_selection_error");
  assert.equal(formula.safeToShowSubskill, false);
  assert.ok(formula.blockReasons.includes("topic_subskill_semantic_mismatch"));
});

test("phonics and Hasmonaean proofs use professionally aligned questions", () => {
  const phonics = closureArtifact.topics.find((row) => row.topic === "listening");
  assert.equal(phonics.producedMistakeTag, "phonics_minimal_pair_error");
  assert.equal(
    phonics.questionStructure.structuralParams.itemType,
    "early_word_reading"
  );
  assert.equal(
    phonics.questionStructure.structuralParams.phonicsDiagnosticEvidence
      .transformation,
    "single_grapheme_substitution"
  );
  const history = closureArtifact.topics.find(
    (row) => row.topic === "hasmonaeans"
  );
  assert.equal(
    history.questionStructure.id,
    "hist_g6_hist_sub_hasmonaean_kingdom_easy_05"
  );
  assert.match(history.actualQuestion, /תפקיד הכהונה/);
});

test("random wrong options cannot activate the topic taxonomy", () => {
  for (const producer of P3B_TOPIC_CLOSURE_PRODUCERS) {
    const result = runP3RawTopicProducerScenario(randomWrongProducer(producer));
    if (producer.topicLevelOnly) {
      // No ruleId to compare against by design — the safety property is
      // that random evidence still produces no taxonomy match at all.
      assert.equal(
        result.de2.taxonomyId,
        null,
        `${producer.subjectId}:${producer.topicKey}`
      );
      continue;
    }
    assert.notEqual(
      result.de2.taxonomyId,
      producer.ruleId,
      `${producer.subjectId}:${producer.topicKey}`
    );
  }
});

test("runtime aliases point to proven canonical generators", () => {
  const expected = {
    "english:sentences": "sentences",
    "english:phonics": "phonics",
  };
  for (const [key, canonicalTopic] of Object.entries(expected)) {
    const [subjectId, topicKey] = key.split(":");
    const producer = P3B_TOPIC_CLOSURE_PRODUCERS.find(
      (item) => item.subjectId === subjectId && item.topicKey === topicKey
    );
    assert.ok(producer, key);
    assert.equal(producer.canonicalTopic, canonicalTopic);
    const attempt = producer.loadAttempt(0);
    assert.equal(attempt.runtimeTopic, canonicalTopic);
  }
  assert.equal(
    P3B_TOPIC_CLOSURE_PRODUCERS.find(
      (item) => item.subjectId === "english" && item.topicKey === "sentences"
    ).legacyTopicKey,
    "sentence"
  );
  assert.equal(
    P3B_TOPIC_CLOSURE_PRODUCERS.find(
      (item) => item.subjectId === "english" && item.topicKey === "phonics"
    ).legacyTopicKey,
    "listening"
  );
  const hebrewReading = P3B_TOPIC_CLOSURE_PRODUCERS.find(
    (item) => item.subjectId === "hebrew" && item.topicKey === "reading"
  );
  assert.equal(hebrewReading.canonicalTopic, "reading");
  assert.equal(hebrewReading.loadAttempt(0).runtimeTopic, "reading");
});
