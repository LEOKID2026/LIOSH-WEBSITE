#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  P3B_TOPIC_CLOSURE_PRODUCERS,
  randomWrongProducer,
} from "../lib/learning/p3b-topic-closure-producers.js";
import { taxonomyTopicCoverageInventory } from "../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import { runP3RawTopicProducerScenario } from "../tests/engine-decision-audit/p3-raw-evidence-harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "artifacts", "qa", "decision-engine-p3b");
const OUT_FILE = join(OUT_DIR, "33-topic-coverage-closure.json");

function differentGrade(grade) {
  const number = Number(String(grade || "").replace(/\D/g, "")) || 4;
  return `g${number === 1 ? 2 : number - 1}`;
}

function relationBetweenGrades(contentGrade, registeredGrade) {
  const content = Number(String(contentGrade || "").replace(/\D/g, ""));
  const registered = Number(String(registeredGrade || "").replace(/\D/g, ""));
  if (!Number.isFinite(content) || !Number.isFinite(registered)) return "unknown";
  if (content < registered) return "lower";
  if (content > registered) return "higher";
  return "same";
}

function wrongTopicFor(config, inventory) {
  return (
    inventory.find(
      (row) =>
        row.subjectId === config.subjectId &&
        row.topicKey !== "mixed" &&
        row.topicKey !== config.topicKey &&
        !row.taxonomyIds.includes(config.ruleId)
    )?.topicKey || null
  );
}

function noSubskill(result) {
  const target = result.actionDecisionContract?.target || {};
  return !target.subskill && !target.subskillId;
}

function structuralParams(question) {
  return Object.fromEntries(
    Object.entries(question.params || {}).filter(
      ([name]) => !["mcqOptionCells", "canonicalMetadata"].includes(name)
    )
  );
}

function reconstructMathPrompt(question) {
  const p = question.params || {};
  switch (p.kind) {
    case "scale_map_to_real":
      return `קנה מידה 1:${p.scale}; ${p.mapLength} ס"מ במפה = __ ס"מ במציאות`;
    case "scale_real_to_map":
      return `קנה מידה 1:${p.scale}; ${p.realLength} ס"מ במציאות = __ ס"מ במפה`;
    case "scale_find":
      return `${p.mapLength} ס"מ במפה מייצגים ${p.realLength} ס"מ במציאות; קנה המידה הוא 1:__`;
    case "dec_add":
      return `${p.a} + ${p.b} = __`;
    case "dec_sub":
      return `${p.a} - ${p.b} = __`;
    case "dec_multiply":
      return `${p.a} × ${p.b} = __`;
    case "dec_divide":
      return `${p.a} ÷ ${p.b} = __`;
    case "power_calc":
      return `${p.base}^${p.exp} = __`;
    case "power_base":
      return `__^${p.exp} = ${p.result}`;
    case "fm_gcd":
      return `מהו המחלק המשותף הגדול ביותר של ${p.a} ו-${p.b}?`;
    default:
      return null;
  }
}

function completeQuestionText(question) {
  const parts = [
    question.questionLabel,
    question.question,
    question.stem,
    question.exerciseText,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index);
  const visible = parts.join(" | ");
  if (visible && !["__", "= __"].includes(visible)) return visible;
  return reconstructMathPrompt(question) || visible || null;
}

function topicArtifact(config, inventory) {
  const sourceAttempt = config.loadAttempt(0);
  const positive = runP3RawTopicProducerScenario(config);
  const random = runP3RawTopicProducerScenario(randomWrongProducer(config));
  const guided = runP3RawTopicProducerScenario(config, { guidedOnly: true });
  const sameSession = runP3RawTopicProducerScenario(config, { sameSession: true });
  const wrongTopic = wrongTopicFor(config, inventory);
  const wrongTopicResult = wrongTopic
    ? runP3RawTopicProducerScenario({ ...config, topicKey: wrongTopic })
    : null;
  const comparisonGrade = differentGrade(config.grade);
  const gradeRelation = relationBetweenGrades(config.grade, comparisonGrade);
  const gradeRelationResult = runP3RawTopicProducerScenario(config, {
    registeredGradeKey: comparisonGrade,
    gradeRelation,
  });
  const target = positive.actionDecisionContract?.target || null;
  const alternatives =
    positive.actionDecisionContract?.alternatives ||
    positive.actionDecisionContract?.blockedAlternatives ||
    [];

  return {
    subject: config.subjectId,
    topic: config.legacyTopicKey || config.topicKey,
    canonicalTopic: config.canonicalTopic,
    grades: config.grades,
    sourceFile: config.sourceFile,
    generatorBank: config.generator,
    questionIdOrGeneratorParameters:
      sourceAttempt.questionId ||
      sourceAttempt.question.params?.topicDiagnosticEvidence ||
      sourceAttempt.question.params?.kind ||
      sourceAttempt.question.params?.patternFamily ||
      null,
    actualQuestion: completeQuestionText(sourceAttempt.question),
    questionStructure: {
      id: sourceAttempt.questionId || sourceAttempt.question.id || null,
      topic:
        sourceAttempt.runtimeTopic ||
        sourceAttempt.question.topic ||
        sourceAttempt.question.operation ||
        null,
      question: sourceAttempt.question.question || null,
      stem: sourceAttempt.question.stem || null,
      questionLabel: sourceAttempt.question.questionLabel || null,
      exerciseText: sourceAttempt.question.exerciseText || null,
      correctAnswer: sourceAttempt.expectedAnswer,
      answers:
        sourceAttempt.question.answers ||
        sourceAttempt.question.options ||
        sourceAttempt.question.choices ||
        [],
      selectedOptionIndex: sourceAttempt.selectedOptionIndex,
      structuralParams: structuralParams(sourceAttempt.question),
    },
    actualWrongAnswer: sourceAttempt.userAnswer,
    producedMistakeTag:
      positive.rawMistakes[0]?.answerEvidence?.detectedMisconception || null,
    selectedTaxonomy: positive.de2.taxonomyId,
    recurrenceResult: positive.de2.recurrence,
    canonicalActionState: positive.de2.canonicalState?.actionState || null,
    finalAction: positive.actionDecisionContract?.action || null,
    finalTarget: target,
    blockedAlternatives: alternatives,
    rawToActionTrace: {
      questionTopic:
        sourceAttempt.runtimeTopic ||
        sourceAttempt.question.topic ||
        sourceAttempt.question.operation ||
        null,
      normalizedMistakeTopic: positive.rawMistakes[0]?.topic || null,
      taxonomyId: positive.de2.taxonomyId,
      recurrenceFull: positive.de2.recurrence?.full === true,
      canonicalState: positive.de2.canonicalState?.actionState || null,
      action: positive.actionDecisionContract?.action || null,
      targetTopic: target?.topic || null,
    },
    nearMissResult: {
      status:
        positive.de2.taxonomyId === config.ruleId &&
        positive.de2.recurrence?.full === true
          ? "passed"
          : "failed",
      selectedTaxonomy: positive.de2.taxonomyId,
    },
    randomErrorResult: {
      status: random.de2.taxonomyId !== config.ruleId ? "passed" : "failed",
      selectedTaxonomy: random.de2.taxonomyId,
      finalAction: random.actionDecisionContract?.action || null,
    },
    wrongTopicResult: {
      status:
        wrongTopicResult && wrongTopicResult.de2.taxonomyId !== config.ruleId
          ? "passed"
          : "failed",
      testedTopic: wrongTopic,
      selectedTaxonomy: wrongTopicResult?.de2.taxonomyId || null,
    },
    gradeRelationSafetyResult: {
      status:
        gradeRelationResult.actionDecisionContract?.target?.topic === config.canonicalTopic
          ? "passed_topic_preserved"
          : "failed",
      proofType:
        gradeRelation === "lower"
          ? "grade_foundation_fallback"
          : "above_grade_topic_stability",
      truthClaim:
        gradeRelation === "lower"
          ? "This proves topic preservation with a grade-foundation fallback; it does not prove taxonomy rejection by grade."
          : "This proves topic preservation and suppression of unsafe specificity for above-grade content; it does not prove taxonomy rejection by grade.",
      contentGrade: config.grade,
      registeredGrade: comparisonGrade,
      gradeRelation,
      selectedTaxonomy: gradeRelationResult.de2.taxonomyId,
      finalTarget: gradeRelationResult.actionDecisionContract?.target || null,
    },
    guidedOnlyResult: {
      status: noSubskill(guided) ? "passed" : "failed",
      finalTarget: guided.actionDecisionContract?.target || null,
    },
    sameSessionResult: {
      status: noSubskill(sameSession) ? "passed" : "failed",
      finalTarget: sameSession.actionDecisionContract?.target || null,
    },
    authorityInvariant: {
      canonicalStateSource: "DE2.canonicalState",
      intensityCap:
        positive.de2.canonicalState?.recommendation?.intensityCap || null,
      adcActionState:
        positive.actionDecisionContract?.canonicalActionState ||
        positive.de2.canonicalState?.actionState ||
        null,
    },
  };
}

async function main() {
  const inventory = taxonomyTopicCoverageInventory();
  const topics = P3B_TOPIC_CLOSURE_PRODUCERS.map((config) =>
    topicArtifact(config, inventory)
  );
  const summary = {
    topics: topics.length,
    rawToActionPassed: topics.filter(
      (topic) =>
        topic.nearMissResult.status === "passed" &&
        topic.finalTarget?.topic === topic.canonicalTopic
    ).length,
    randomErrorPassed: topics.filter(
      (topic) => topic.randomErrorResult.status === "passed"
    ).length,
    wrongTopicPassed: topics.filter(
      (topic) => topic.wrongTopicResult.status === "passed"
    ).length,
    gradeRelationSafetyPassed: topics.filter(
      (topic) =>
        topic.gradeRelationSafetyResult.status === "passed_topic_preserved"
    ).length,
    guidedOnlyPassed: topics.filter(
      (topic) => topic.guidedOnlyResult.status === "passed"
    ).length,
    sameSessionPassed: topics.filter(
      (topic) => topic.sameSessionResult.status === "passed"
    ).length,
    crossTopicTargets: topics.filter(
      (topic) => topic.finalTarget?.topic !== topic.canonicalTopic
    ).length,
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    contract: "decision-engine-33-topic-coverage-closure-v2",
    summary,
    topics,
  };
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
  const complete =
    summary.topics === 33 &&
    summary.rawToActionPassed === 33 &&
    summary.randomErrorPassed === 33 &&
    summary.wrongTopicPassed === 33 &&
    summary.gradeRelationSafetyPassed === 33 &&
    summary.guidedOnlyPassed === 33 &&
    summary.sameSessionPassed === 33 &&
    summary.crossTopicTargets === 0;
  if (!complete) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
