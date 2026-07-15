/**
 * English worksheet question selector — grade/topic/level/count with seeded RNG.
 * @module lib/worksheets/worksheet-english-selector.server
 */

import {
  generateQuestion,
  getLevelForGrade,
  ENGLISH_GRADES,
} from "../../utils/english-question-generator.js";
import {
  pickSourceDifficultyForAttempt,
  resolveActivityGenerationPlan,
} from "../learning/activity-question-selection.js";
import { withSeededRandom } from "./worksheet-seeded-random.server.js";
import { filterMixedPoolBySelection } from "./worksheet-mixed-topics.js";
import {
  ENGLISH_WORKSHEET_TOPIC_IDS,
  listEnglishTopicsForGrade,
  classifyEnglishWorksheetPrintBlock,
} from "./worksheet-english-allowlist.js";
import { toPrintableWorksheetQuestion } from "./worksheet-question-sanitize.server.js";
import { isPrintableQuestion } from "./worksheet-print-allowlist.js";

/**
 * @typedef {Object} EnglishWorksheetSelectorParams
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {string} levelKey
 * @property {number} count
 * @property {number} [seed]
 * @property {string[] | null} [mixedTopicKeys]
 */

/**
 * @param {unknown} q
 */
function isEnglishGeneratorNoQuestion(q) {
  if (!q || typeof q !== "object") return true;
  const prompt = String(q.question || q.questionLabel || q.exerciseText || "").trim();
  if (!prompt) return true;
  if (prompt.includes("לא זמין") || prompt.includes("אין שאלות")) return true;
  return false;
}

/**
 * @param {unknown} correctAnswer
 */
function normalizeEnglishCorrectAnswer(correctAnswer) {
  if (correctAnswer == null) return null;
  if (typeof correctAnswer === "number" && Number.isFinite(correctAnswer)) {
    return String(correctAnswer);
  }
  const s = String(correctAnswer).trim();
  return s || null;
}

/**
 * @param {Record<string, unknown>} q
 * @param {string} topicKey
 * @param {string} gradeKey
 * @returns {Record<string, unknown>|null}
 */
function englishWorksheetItemFromGenerated(q, topicKey, gradeKey) {
  const block = classifyEnglishWorksheetPrintBlock(q);
  if (block.blocked) return null;

  const answerMode = String(q.params?.answerMode || q.qType || "choice");
  const isOpen = answerMode === "typing" || topicKey === "writing";
  const correctAnswer = normalizeEnglishCorrectAnswer(q.correctAnswer);
  const topic = String(q.topic || topicKey);
  const isPhonics = topic === "phonics" || topicKey === "phonics";
  const questionLabel = String(q.questionLabel || "").trim();
  const exerciseText = String(
    q.exerciseText || q.params?.phonicsStimulus || ""
  ).trim();
  const itemType = String(q.params?.itemType || q.itemType || "").trim();
  const rawPrompt = isPhonics
    ? questionLabel
    : String(q.question || q.questionLabel || q.exerciseText || "").trim();
  const choices = Array.isArray(q.answers) ? q.answers.map(String) : undefined;

  if (isPhonics) {
    if (!questionLabel || !exerciseText) return null;
  } else if (!rawPrompt) {
    return null;
  }
  if (!isOpen) {
    if (!correctAnswer) return null;
    if (!choices?.length || choices.length < 2) return null;
    if (!choices.includes(correctAnswer)) return null;
  } else if (!correctAnswer && !Array.isArray(q.acceptedAnswers)) {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const params = {
    answerMode,
    gradeKey,
    levelKey: q.params?.levelKey,
    direction: q.params?.direction,
    word: q.params?.word,
  };
  if (isPhonics) {
    params.itemType = itemType || undefined;
    params.phonicsStimulus = exerciseText;
    params.questionLabel = questionLabel;
    params.exerciseText = exerciseText;
  }

  return {
    question: rawPrompt,
    questionLabel: isPhonics ? questionLabel : undefined,
    exerciseText: isPhonics ? exerciseText : undefined,
    correctAnswer: correctAnswer || (q.acceptedAnswers?.[0] ? String(q.acceptedAnswers[0]) : ""),
    answers: choices,
    choices,
    answerMode,
    subject: "english",
    topic,
    operation: topic,
    gradeLevel: gradeKey,
    writingSpaceLines: isOpen ? 6 : undefined,
    params,
  };
}

/**
 * Concrete (non-mixed) topics used for worksheet mixed round-robin.
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listEnglishMixedPoolTopics(gradeKey) {
  return listEnglishTopicsForGrade(gradeKey).filter((t) => t && t !== "mixed");
}

/**
 * @param {string} topicKey
 * @param {string} gradeKey
 * @returns {string}
 */
export function resolveEnglishWorksheetTopic(topicKey, gradeKey) {
  const raw = String(topicKey || "").trim().toLowerCase();
  if (raw === "mixed") {
    if (!ENGLISH_GRADES[gradeKey]?.topics?.includes("mixed")) {
      throw new Error(`WORKSHEET_ENGLISH_MIXED_NOT_ALLOWED:${gradeKey}`);
    }
    if (listEnglishMixedPoolTopics(gradeKey).length < 2) {
      throw new Error(`WORKSHEET_ENGLISH_MIXED_NEED_TWO_TOPICS:${gradeKey}`);
    }
    return "mixed";
  }
  const allowed = listEnglishTopicsForGrade(gradeKey);
  if (!allowed.includes(raw)) {
    throw new Error(`WORKSHEET_ENGLISH_TOPIC_NOT_IN_GRADE:${gradeKey}:${raw}`);
  }
  return raw;
}

/**
 * @param {EnglishWorksheetSelectorParams} params
 * @returns {{ questions: Record<string, unknown>[], seed: number }}
 */
export function selectEnglishWorksheetQuestions(params) {
  const gradeKey = String(params.gradeKey || "g3");
  if (!ENGLISH_GRADES[gradeKey]) {
    throw new Error(`WORKSHEET_ENGLISH_INVALID_GRADE:${gradeKey}`);
  }
  const topicKey = resolveEnglishWorksheetTopic(params.topicKey, gradeKey);
  const n = Math.min(20, Math.max(1, Math.floor(Number(params.count) || 5)));
  const useSeed =
    typeof params.seed === "number" ? params.seed >>> 0 : (Date.now() % 1_000_000) >>> 0;
  const mixedPool =
    topicKey === "mixed"
      ? filterMixedPoolBySelection(listEnglishMixedPoolTopics(gradeKey), params.mixedTopicKeys)
      : [];

  return withSeededRandom(useSeed, () => {
    const plan = resolveActivityGenerationPlan(params.levelKey, "english");
    /** @type {Record<string, unknown>[]} */
    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 100;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const sourceDifficulty = pickSourceDifficultyForAttempt(plan.sourceDifficulties, attempt);
      const levelConfig = getLevelForGrade(sourceDifficulty, gradeKey);

      /** @type {string[]} */
      const topicOrder =
        topicKey === "mixed"
          ? [...mixedPool].sort((a, b) => {
              const ca = questions.filter((q) => q.topic === a).length;
              const cb = questions.filter((q) => q.topic === b).length;
              return ca - cb;
            })
          : [topicKey];

      let placed = false;
      for (const generateTopic of topicOrder) {
        const q = generateQuestion(
          levelConfig,
          generateTopic,
          gradeKey,
          null,
          params.levelKey,
          null
        );
        if (isEnglishGeneratorNoQuestion(q)) continue;

        const item = englishWorksheetItemFromGenerated(q, generateTopic, gradeKey);
        if (!item) continue;
        item.topic = String(q.topic || generateTopic);
        item.operation = item.topic;

        const printable = toPrintableWorksheetQuestion(item, {
          displayIndex: 1,
          subject: "english",
        });
        if (!isPrintableQuestion(printable.printability) || !printable.stemHe?.trim()) {
          continue;
        }
        if (
          item.topic === "phonics" &&
          (!printable.englishPhonicsMode || !String(printable.phonicsStimulus || "").trim())
        ) {
          continue;
        }

        const fp = `${printable.stemHe}|${printable.phonicsStimulus || ""}|${item.correctAnswer}|${item.topic}`;
        if (!fp || fp === "|||" || seen.has(fp)) continue;
        seen.add(fp);
        questions.push(item);
        placed = true;
        break;
      }
      if (!placed) continue;
    }

    if (questions.length < n) {
      throw new Error(
        `WORKSHEET_ENGLISH_INSUFFICIENT:${gradeKey}:${topicKey}:${params.levelKey}`
      );
    }

    return { questions, seed: useSeed };
  });
}

export { ENGLISH_WORKSHEET_TOPIC_IDS, listEnglishTopicsForGrade };

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} [levelKey]
 * @param {number} [seed]
 */
export function canSelectEnglishWorksheetTopic(
  gradeKey,
  topicKey,
  levelKey = "medium",
  seed = 42
) {
  if (!ENGLISH_GRADES[gradeKey]?.topics?.includes(topicKey)) return false;
  try {
    const { questions } = selectEnglishWorksheetQuestions({
      gradeKey,
      topicKey,
      levelKey,
      count: 1,
      seed,
    });
    return questions.length >= 1;
  } catch {
    return false;
  }
}

/**
 * @returns {Array<{ topicKey: string, gradeKey: string, supported: boolean, grades: string[] }>}
 */
export function auditEnglishTopicsSupportMatrix() {
  return ENGLISH_WORKSHEET_TOPIC_IDS.map((topicKey) => {
    const grades = listGradesForEnglishTopic(topicKey);
    const gradeKey = grades[0] || "g3";
    const supported = grades.length
      ? canSelectEnglishWorksheetTopic(gradeKey, topicKey, "medium", 42)
      : false;
    return { topicKey, gradeKey, supported, grades };
  });
}

/**
 * @param {string} topicKey
 * @returns {string[]}
 */
function listGradesForEnglishTopic(topicKey) {
  /** @type {string[]} */
  const out = [];
  for (const [gradeKey, cfg] of Object.entries(ENGLISH_GRADES)) {
    if (cfg.topics?.includes(topicKey)) out.push(gradeKey);
  }
  return out;
}
