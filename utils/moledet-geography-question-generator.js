import { GRADES, TOPICS } from './moledet-geography-constants.js';
import { isMoledetGeographyGradeAllowed } from './moledet-geography-curriculum-gates.js';
import { sanitizeQuestionForStudentDisplay } from './student-question-stem-sanitizer.js';
import { rebalanceObviousMcqDistractors } from './mcq-distractor-rebalance.js';
import { repairMcqObviousAnswerContent } from './mcq-fail-content-repair.js';
import { mergeDiagnosticContractIntoParams } from './diagnostic-question-contract.js';
import { moledetDiagnosticContractFromBankRow } from './moledet-geography-diagnostic-metadata-bridge.js';
import { attachCanonicalMetadataToMoledetQuestion } from '../lib/learning/moledet-geography-canonical-metadata.js';
import { selectQuestionWithProbe } from './active-diagnostic-runtime/select-with-probe.js';
import * as geoPools from "../data/geography-questions/index.js";

/** Launch pools only (G2–G6). G1 is enrichment-only and not exported from the bank index. */
const LAUNCH_POOL_EXPORTS = [
  "G2_EASY_QUESTIONS",
  "G2_MEDIUM_QUESTIONS",
  "G2_HARD_QUESTIONS",
  "G3_EASY_QUESTIONS",
  "G3_MEDIUM_QUESTIONS",
  "G3_HARD_QUESTIONS",
  "G4_EASY_QUESTIONS",
  "G4_MEDIUM_QUESTIONS",
  "G4_HARD_QUESTIONS",
  "G5_EASY_QUESTIONS",
  "G5_MEDIUM_QUESTIONS",
  "G5_HARD_QUESTIONS",
  "G6_EASY_QUESTIONS",
  "G6_MEDIUM_QUESTIONS",
  "G6_HARD_QUESTIONS",
];

/** @type {Record<string, Record<string, unknown[]>>} */
const questionsMap = Object.fromEntries(
  LAUNCH_POOL_EXPORTS.map((exportName) => [exportName, geoPools[exportName]])
);

/**
 * Questions for exact grade+level+topic only — no silent cross-grade fallback.
 * @param {string} gradeKey
 * @param {string} levelKey
 * @param {string} topic
 * @returns {Array<{ question: string, answers: string[], correct: number }>}
 */
/** @param {Record<string, unknown>} row @param {string} topic */
export function moledetBankRowKey(row, topic) {
  const stem = String(row?.question || "").trim().slice(0, 48);
  return `${topic}:${stem}`;
}

export function listTopicQuestionsForGradeLevel(gradeKey, levelKey, topic) {
  const key = `${String(gradeKey).toUpperCase()}_${String(levelKey).toUpperCase()}_QUESTIONS`;
  const questionsPool = questionsMap[key];
  if (!questionsPool || typeof questionsPool !== "object") {
    return [];
  }
  const arr = questionsPool[topic];
  return Array.isArray(arr) ? arr : [];
}

function shuffleAnswersAndBuild(randomQ, selectedTopic, gradeKey, levelKey, uiLevel, poolFallbackCode) {
  const balanced = rebalanceObviousMcqDistractors(randomQ);
  const repaired = repairMcqObviousAnswerContent(balanced, {
    subject: "moledet_geography",
    stem: balanced.question,
  });
  const shuffledAnswers = [...repaired.answers];
  for (let i = shuffledAnswers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
  }
  const correctAnswer = repaired.answers[repaired.correct];
  const newCorrectIndex = shuffledAnswers.findIndex((ans) => ans === correctAnswer);
  const contentPoolLevel = levelKey;
  const diag = moledetDiagnosticContractFromBankRow(
    /** @type {Record<string, unknown>} */ (randomQ),
    selectedTopic
  );
  const params = mergeDiagnosticContractIntoParams(
    {
      kind: selectedTopic,
      grade: gradeKey,
      gradeKey,
      levelKey,
      uiLevel,
      contentPoolLevel,
      poolFallbackCode,
    },
    diag
  );
  const display = sanitizeQuestionForStudentDisplay({
    question: repaired.question,
    questionLabel: "",
    exerciseText: repaired.question,
    answers: shuffledAnswers,
    correctAnswer,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
    topic: selectedTopic,
    operation: selectedTopic,
    gradeKey,
    levelKey,
    a: null,
    b: null,
    params,
    id: moledetBankRowKey(
      /** @type {Record<string, unknown>} */ (balanced),
      selectedTopic
    ),
  });

  return attachCanonicalMetadataToMoledetQuestion(display, {
    topic: selectedTopic,
    gradeKey,
    levelKey,
    sourceRow: randomQ,
  });
}

/**
 * EMPTY POOL controlled state — no fabricated question, no grade switch.
 * @param {string} gradeKey
 * @param {string} uiLevel
 */
function buildEmptyPoolResult(gradeKey, uiLevel) {
  return {
    emptyPool: true,
    question: "",
    exerciseText: "",
    answers: [],
    correctAnswer: null,
    correctIndex: -1,
    topic: null,
    operation: null,
    gradeKey,
    levelKey: null,
    a: null,
    b: null,
    params: {
      gradeKey,
      levelKey: null,
      uiLevel,
      contentPoolLevel: null,
      poolFallbackCode: "empty_pool",
    },
  };
}

/**
 * Resolve pool for grade/level/topic (same fallback rules as generateQuestion).
 * @returns {{ topicQuestions: object[], resolvedTopic: string, poolFallbackCode: string }}
 */
export function resolveMoledetTopicPool(levelConfig, topic, gradeKey, mixedTopics = null) {
  if (!isMoledetGeographyGradeAllowed(gradeKey)) {
    return { topicQuestions: [], resolvedTopic: null, levelKey: null, poolFallbackCode: "grade_gated" };
  }
  const gradeCfg = GRADES[gradeKey] || GRADES.g3;
  let allowedTopics = gradeCfg.topics.filter((t) => t !== "mixed");
  if (mixedTopics) {
    allowedTopics = allowedTopics.filter((t) => mixedTopics[t]);
  }
  if (allowedTopics.length === 0) {
    return { topicQuestions: [], resolvedTopic: null, levelKey: null, poolFallbackCode: "empty_topics" };
  }
  const isMixed = topic === "mixed";
  let selectedTopic = topic;
  if (isMixed) {
    selectedTopic = allowedTopics[Math.floor(Math.random() * allowedTopics.length)];
  }
  if (!allowedTopics.includes(selectedTopic)) {
    selectedTopic = "homeland";
  }
  const levelKey =
    levelConfig?.name === "קל"
      ? "easy"
      : levelConfig?.name === "בינוני"
        ? "medium"
        : levelConfig?.name === "קשה"
          ? "hard"
          : "easy";

  let topicQuestions = listTopicQuestionsForGradeLevel(gradeKey, levelKey, selectedTopic);
  let resolvedTopic = selectedTopic;
  let poolFallbackCode = "none";

  if (!topicQuestions.length && selectedTopic !== "homeland") {
    topicQuestions = listTopicQuestionsForGradeLevel(gradeKey, levelKey, "homeland");
    if (topicQuestions.length) {
      resolvedTopic = "homeland";
      poolFallbackCode = "topic_to_homeland";
    }
  }

  if (!topicQuestions.length) {
    const alreadyChecked = new Set([selectedTopic]);
    if (selectedTopic !== "homeland") alreadyChecked.add("homeland");
    for (const alt of allowedTopics) {
      if (alreadyChecked.has(alt)) continue;
      alreadyChecked.add(alt);
      const altPool = listTopicQuestionsForGradeLevel(gradeKey, levelKey, alt);
      if (altPool.length) {
        topicQuestions = altPool;
        resolvedTopic = alt;
        poolFallbackCode = "topic_fallback_same_grade_level";
        break;
      }
    }
  }

  return { topicQuestions, resolvedTopic, levelKey, poolFallbackCode };
}

function attachBookPracticeMeta(question, forceKind) {
  if (!forceKind || !question || question.emptyPool) return question;
  const params = { ...(question.params || {}) };
  params.kind = forceKind;
  params.subtopicId = forceKind;
  params.bookPageId = forceKind;
  return { ...question, params };
}

// ========== פונקציה עיקרית ליצירת שאלה ==========
/**
 * @param {object} [probeOpts]
 * @param {import('./active-diagnostic-runtime/build-pending-probe.js').PendingDiagnosticProbe|null} [probeOpts.pendingProbe]
 * @param {Set<string>|string[]} [probeOpts.recentIds]
 * @param {{ usedProbe?: boolean, reason?: string }} [probeOpts.resultHolder]
 */
export function generateQuestion(levelConfig, topic, gradeKey, mixedTopics = null, probeOpts = null) {
  const forceKind =
    probeOpts?.forceKind != null ? String(probeOpts.forceKind).trim() : "";
  const { topicQuestions, resolvedTopic, levelKey, poolFallbackCode } = resolveMoledetTopicPool(
    levelConfig,
    topic,
    gradeKey,
    mixedTopics
  );
  const uiLevel = levelKey;

  if (!topicQuestions.length) {
    return attachCanonicalMetadataToMoledetQuestion(buildEmptyPoolResult(gradeKey, uiLevel), {
      topic,
      gradeKey,
      levelKey: uiLevel,
    });
  }

  const fallbackPick = () =>
    topicQuestions[Math.floor(Math.random() * topicQuestions.length)];

  let randomQ = fallbackPick();
  const pendingProbe = probeOpts?.pendingProbe;
  if (pendingProbe && pendingProbe.expiresAfterQuestions > 0) {
    const items = topicQuestions.map((q) => ({
      ...q,
      topic: resolvedTopic,
      id: moledetBankRowKey(/** @type {Record<string, unknown>} */ (q), resolvedTopic),
    }));
    const pr = selectQuestionWithProbe({
      items,
      pendingProbe,
      recentIds: probeOpts.recentIds || [],
      currentTopic: resolvedTopic,
      fallbackPick,
      getItemTopic: () => resolvedTopic,
      getItemId: (q) => String(q.id || ""),
    });
    if (pr.question) {
      randomQ = pr.question;
      if (probeOpts.resultHolder) {
        probeOpts.resultHolder.usedProbe = pr.usedProbe;
        probeOpts.resultHolder.reason = pr.reason;
      }
    }
  }

  return attachBookPracticeMeta(
    sanitizeQuestionForStudentDisplay(
      shuffleAnswersAndBuild(
        randomQ,
        resolvedTopic,
        gradeKey,
        levelKey,
        uiLevel,
        poolFallbackCode
      )
    ),
    forceKind
  );
}
