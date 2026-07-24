import { runDiagnosticEngineV2 } from "../../utils/diagnostic-engine-v2/run-diagnostic-engine-v2.js";
import { runDiagnosticEngineV3 } from "../../utils/diagnostic-engine-v3/run-diagnostic-engine-v3.js";
import { buildLearningPatternDecision } from "../../utils/learning-pattern-decision/build-learning-pattern-decision.js";
import {
  taxonomyTopicCoverageInventory,
} from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  REAL_RUNTIME_SCENARIOS,
  classifyRealRuntimeScenario,
} from "../../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { classifyAnswerEvidence } from "../../lib/learning/classifiers/index.js";

const START_MS = Date.UTC(2026, 6, 1);
const END_MS = Date.UTC(2026, 6, 31, 23, 59, 59, 999);

function topicMappingForRule(ruleId) {
  return taxonomyTopicCoverageInventory()
    .filter(
      (row) =>
        row.taxonomyIds.includes(ruleId) &&
        row.topicKey !== "mixed",
    )
    .sort(
      (a, b) =>
        a.taxonomyIds.length - b.taxonomyIds.length ||
        a.topicKey.localeCompare(b.topicKey),
    )[0] || null;
}

function rowFor(topicKey, options = {}) {
  const q = options.questions ?? 40;
  const correct = options.correct ?? 0;
  const wrong = q - correct;
  return {
    displayName: topicKey,
    bucketKey: topicKey,
    grade: "g4",
    level: "medium",
    questions: q,
    correct,
    wrong,
    accuracy: q > 0 ? Math.round((correct / q) * 100) : 0,
    needsPractice: wrong > 0,
    confidence01: 0.82,
    dataSufficiencyLevel: "strong",
    isEarlySignalOnly: false,
    modeKey: options.modeKey || "practice",
    gradeKey: options.contentGradeKey || "g4",
    contentGradeKey: options.contentGradeKey || "g4",
    registeredGradeKey: options.registeredGradeKey || "g4",
    gradeRelation: options.gradeRelation || "same",
    gradeDelta: options.gradeRelation === "lower" ? -1 : 0,
    trend: {
      accuracyDirection: "flat",
      confidence: 0.9,
      windows: {
        currentPeriod: { accuracy: 0, sessionCount: 2 },
        previousComparablePeriod: { accuracy: 0, sessionCount: 2 },
        recentShortWindow: { accuracy: 0, sessionCount: 2 },
      },
    },
    behaviorProfile: {
      dominantType: "knowledge_gap",
      signals: {
        hintRate: options.guidedOnly ? 1 : 0,
        hintKnownCount: q,
        medianResponseMsWrong: options.responseMs ?? 12_000,
      },
    },
    topicEngineRowSignals: {
      riskFlags: options.riskFlags || {},
    },
  };
}

function rawEventsFromRealProducer(scenario, topicKey, options = {}) {
  const evidence = classifyRealRuntimeScenario(scenario, true);
  const payload = scenario.loadPositive();
  const count = options.eventCount ?? 40;
  return Array.from({ length: count }, (_, index) => {
    const day = 1 + (index % 3);
    const metadata = {
      metadataSource: "question_metadata_normalizer",
      answerEvidence: evidence,
      ...(options.prerequisiteSkillIds
        ? { prerequisiteSkillIds: options.prerequisiteSkillIds }
        : {}),
    };
    return {
      subject: scenario.subject,
      topic: topicKey,
      bucketKey: topicKey,
      grade: options.contentGradeKey || "g4",
      level: "medium",
      mode: options.guidedOnly ? "guided_practice" : "practice",
      isCorrect: false,
      userAnswer: payload.userAnswer,
      correctAnswer: payload.expectedAnswer,
      params: payload.params || payload.question?.params || {},
      answerEvidence: evidence,
      metadata,
      metadataPresent: true,
      hintUsed: options.guidedOnly,
      afterStepByStep: options.guidedOnly,
      responseMs: options.responseMs ?? 12_000,
      timestamp: Date.UTC(2026, 6, day, 10, index % 20),
      sessionId: `p3-session-${index % 2}`,
      questionLabel: `p3-${scenario.ruleId}-${index}`,
    };
  });
}

export function runP3RawRuleScenario(ruleId, options = {}) {
  const scenario = REAL_RUNTIME_SCENARIOS.find((item) => item.ruleId === ruleId);
  if (!scenario) throw new Error(`P3 raw scenario missing rule ${ruleId}`);
  const mapping = topicMappingForRule(ruleId);
  if (!mapping) throw new Error(`P3 topic mapping missing rule ${ruleId}`);
  const topicKey = String(options.topicKeyOverride || mapping.topicKey);
  const engineSubjectId = TAXONOMY_BY_ID[ruleId]?.subjectId || scenario.subject;
  const topicRowKey = `${topicKey}\u0001${options.modeKey || "practice"}\u0001${options.contentGradeKey || "g4"}\u0001medium`;
  const row = rowFor(topicKey, options);
  const rawMistakes = rawEventsFromRealProducer(scenario, topicKey, options);
  if (options.reverseEvidence === true) rawMistakes.reverse();
  for (const event of rawMistakes) event.subject = engineSubjectId;
  const maps = { [engineSubjectId]: { [topicRowKey]: row } };
  const rawMistakesBySubject = { [engineSubjectId]: rawMistakes };
  const de2 = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject,
    startMs: START_MS,
    endMs: END_MS,
  });
  const v3 = runDiagnosticEngineV3({
    maps,
    rawMistakesBySubject,
    startMs: START_MS,
    endMs: END_MS,
    diagnosticEngineV2: de2,
  });
  const unit = de2.units[0] || null;
  const v3Enrichment = v3.unitEnrichments?.[0] || null;
  const lpd = buildLearningPatternDecision({
    subjectId: engineSubjectId,
    topicRowKey,
    row,
    unit,
    v3Enrichment,
    rawMistakes,
    startMs: START_MS,
    endMs: END_MS,
  });
  return {
    ruleId,
    subjectId: engineSubjectId,
    topicKey,
    mapping,
    producer: {
      sourceFile: scenario.sourceFile,
      classifier: scenario.classifier,
      expectedTag: scenario.expectedTag,
    },
    row,
    rawMistakes,
    de2: {
      taxonomyId: unit?.taxonomy?.id || null,
      classification: unit?.classification || null,
      recurrence: unit?.recurrence || null,
      canonicalState: unit?.canonicalState || null,
    },
    v3: v3Enrichment?.v3Rollup || null,
    unifiedDecisionContext:
      lpd.engineDecisionContract?.unifiedDecisionContext || null,
    actionDecisionContract:
      lpd.engineDecisionContract?.actionDecisionContract || null,
    lpd,
  };
}

/**
 * Topic closure harness. Every event starts with a fresh real question/bank row
 * and a selected wrong answer; no normalized-event or taxonomy fixture input.
 */
export function runP3RawTopicProducerScenario(config, options = {}) {
  const subjectId = config.subjectId;
  const topicKey = config.topicKey;
  const grade = config.grade || "g4";
  const count = options.eventCount ?? 40;
  const rawMistakes = Array.from({ length: count }, (_, index) => {
    const payload = config.loadAttempt(index);
    if (!payload?.question) {
      throw new Error(`${subjectId}::${topicKey}: real producer returned no question`);
    }
    const evidence = classifyAnswerEvidence({
      subject: subjectId,
      topic: payload.runtimeTopic || topicKey,
      question: payload.question,
      params: payload.question.params,
      userAnswer: payload.userAnswer,
      expectedAnswer: payload.expectedAnswer,
      selectedOptionIndex: payload.selectedOptionIndex ?? null,
      isCorrect: false,
      questionGenerator: payload.generator,
    });
    return {
      subject: subjectId,
      topic: topicKey,
      bucketKey: topicKey,
      grade,
      level: "medium",
      mode: options.guidedOnly ? "guided_practice" : "practice",
      isCorrect: false,
      userAnswer: payload.userAnswer,
      correctAnswer: payload.expectedAnswer,
      params: payload.question.params || {},
      answerEvidence: evidence,
      metadata: {
        metadataSource: "real_topic_question",
        answerEvidence: evidence,
        questionId: payload.questionId || null,
        sourceFile: config.sourceFile,
      },
      metadataPresent: true,
      hintUsed: options.guidedOnly === true,
      afterStepByStep: options.guidedOnly === true,
      responseMs: 12_000,
      timestamp: Date.UTC(2026, 6, 1 + (index % 3), 10, index % 20),
      sessionId: options.sameSession ? "topic-closure-one-session" : `topic-closure-${index % 2}`,
      questionLabel:
        payload.questionId ||
        `${subjectId}-${topicKey}-${String(payload.question.question || payload.question.stem || "").slice(0, 80)}-${index}`,
    };
  });

  const topicRowKey = `${topicKey}\u0001practice\u0001${grade}\u0001medium`;
  const row = rowFor(topicKey, {
    questions: count,
    contentGradeKey: grade,
    registeredGradeKey: options.registeredGradeKey || grade,
    gradeRelation: options.gradeRelation || "same",
    guidedOnly: options.guidedOnly,
  });
  const maps = { [subjectId]: { [topicRowKey]: row } };
  const rawMistakesBySubject = { [subjectId]: rawMistakes };
  const de2 = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject,
    startMs: START_MS,
    endMs: END_MS,
  });
  const v3 = runDiagnosticEngineV3({
    maps,
    rawMistakesBySubject,
    startMs: START_MS,
    endMs: END_MS,
    diagnosticEngineV2: de2,
  });
  const unit = de2.units[0] || null;
  const v3Enrichment = v3.unitEnrichments?.[0] || null;
  const lpd = buildLearningPatternDecision({
    subjectId,
    topicRowKey,
    row,
    unit,
    v3Enrichment,
    rawMistakes,
    startMs: START_MS,
    endMs: END_MS,
  });
  return {
    ruleId: config.ruleId,
    subjectId,
    topicKey,
    canonicalTopic: config.canonicalTopic || topicKey,
    producer: {
      sourceFile: config.sourceFile,
      generator: config.generator,
      expectedTag: config.expectedTag,
    },
    rawMistakes,
    de2: {
      taxonomyId: unit?.taxonomy?.id || null,
      recurrence: unit?.recurrence || null,
      canonicalState: unit?.canonicalState || null,
      taxonomySelection: unit?.taxonomySelection || null,
    },
    unifiedDecisionContext:
      lpd.engineDecisionContract?.unifiedDecisionContext || null,
    actionDecisionContract:
      lpd.engineDecisionContract?.actionDecisionContract || null,
    subskillSafety:
      lpd.engineDecisionContract?.unifiedDecisionContext?.signals?.subskill || null,
    lpd,
  };
}

export function runP3RawMissingMetadataScenario(subjectId = "math", topicKey = "addition") {
  const topicRowKey = `${topicKey}\u0001practice\u0001g4\u0001medium`;
  const row = rowFor(topicKey, { questions: 12 });
  const rawMistakes = Array.from({ length: 12 }, (_, index) => ({
    subject: subjectId,
    topic: topicKey,
    bucketKey: topicKey,
    grade: "g4",
    level: "medium",
    mode: "practice",
    isCorrect: false,
    userAnswer: `noise-${index}`,
    correctAnswer: "correct",
    timestamp: Date.UTC(2026, 6, 1 + (index % 3)),
    questionLabel: `p3-noise-${index}`,
  }));
  const maps = { [subjectId]: { [topicRowKey]: row } };
  const rawMistakesBySubject = { [subjectId]: rawMistakes };
  const de2 = runDiagnosticEngineV2({
    maps,
    rawMistakesBySubject,
    startMs: START_MS,
    endMs: END_MS,
  });
  const unit = de2.units[0] || null;
  const lpd = buildLearningPatternDecision({
    subjectId,
    topicRowKey,
    row,
    unit,
    rawMistakes,
    startMs: START_MS,
    endMs: END_MS,
  });
  return {
    subjectId,
    topicKey,
    de2: {
      taxonomyId: unit?.taxonomy?.id || null,
      classification: unit?.classification || null,
      canonicalState: unit?.canonicalState || null,
    },
    actionDecisionContract:
      lpd.engineDecisionContract?.actionDecisionContract || null,
  };
}
