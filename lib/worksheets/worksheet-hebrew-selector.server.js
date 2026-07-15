/**
 * Hebrew worksheet question selector — grade/topic/level/count with seeded RNG.
 * @module lib/worksheets/worksheet-hebrew-selector.server
 */

import { GRADES as HEBREW_GRADES, LEVELS as HEBREW_LEVELS } from "../../utils/hebrew-constants.js";
import { generateQuestion } from "../../utils/hebrew-question-generator.js";
import {
  pickSourceDifficultyForAttempt,
  resolveActivityGenerationPlan,
} from "../learning/activity-question-selection.js";
import { withSeededRandom } from "./worksheet-seeded-random.server.js";
import { filterMixedPoolBySelection } from "./worksheet-mixed-topics.js";
import {
  HEBREW_WORKSHEET_TOPIC_IDS,
  listHebrewTopicsForGrade,
} from "./worksheet-hebrew-allowlist.js";
import { toPrintableWorksheetQuestion } from "./worksheet-question-sanitize.server.js";
import { isPrintableQuestion } from "./worksheet-print-allowlist.js";

/**
 * @typedef {Object} HebrewWorksheetSelectorParams
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {string} levelKey
 * @property {number} count
 * @property {number} [seed]
 * @property {string[] | null} [mixedTopicKeys]
 */

/**
 * @param {string|null|undefined} sourceDifficulty
 */
function hebrewLevelConfig(sourceDifficulty) {
  const key = String(sourceDifficulty || "easy").toLowerCase();
  const cfg = HEBREW_LEVELS[key] || HEBREW_LEVELS.easy;
  return { ...cfg, name: cfg.name };
}

/**
 * @param {unknown} q
 */
function isHebrewGeneratorNoQuestion(q) {
  if (!q || typeof q !== "object") return true;
  const prompt = String(q.question || q.questionLabel || q.exerciseText || "").trim();
  if (!prompt) return true;
  if (
    prompt.includes("לא תקינה") ||
    prompt.includes("לא זמין") ||
    prompt.includes("אין שאלות")
  ) {
    return true;
  }
  return false;
}

/**
 * @param {unknown} correctAnswer
 */
function normalizeHebrewCorrectAnswer(correctAnswer) {
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
function hebrewWorksheetItemFromGenerated(q, topicKey, gradeKey) {
  const answerMode = String(q.params?.answerMode || q.answerMode || "choice");
  const isOpen = answerMode === "typing" || topicKey === "writing";
  const correctAnswer = normalizeHebrewCorrectAnswer(q.correctAnswer);
  const rawPrompt = String(q.question || q.questionLabel || q.exerciseText || "").trim();
  const choices = Array.isArray(q.answers) ? q.answers.map(String) : undefined;

  if (!rawPrompt) return null;
  if (!isOpen) {
    if (!correctAnswer) return null;
    if (!choices?.length || choices.length < 2) return null;
    if (!choices.includes(correctAnswer)) return null;
  } else if (!correctAnswer && !Array.isArray(q.acceptedAnswers)) {
    return null;
  }

  return {
    question: rawPrompt,
    correctAnswer: correctAnswer || (q.acceptedAnswers?.[0] ? String(q.acceptedAnswers[0]) : ""),
    answers: choices,
    choices,
    answerMode,
    subject: "hebrew",
    topic: String(q.topic || topicKey),
    operation: String(q.topic || topicKey),
    gradeLevel: gradeKey,
    writingSpaceLines: isOpen ? 6 : undefined,
    params: {
      answerMode,
      gradeKey,
      levelKey: q.params?.levelKey,
    },
  };
}

/**
 * Concrete (non-mixed) topics used for worksheet mixed round-robin.
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listHebrewMixedPoolTopics(gradeKey) {
  return listHebrewTopicsForGrade(gradeKey).filter((t) => t && t !== "mixed");
}

/**
 * @param {string} topicKey
 * @param {string} gradeKey
 * @returns {string}
 */
export function resolveHebrewWorksheetTopic(topicKey, gradeKey) {
  const raw = String(topicKey || "").trim().toLowerCase();
  if (raw === "mixed") {
    if (!HEBREW_GRADES[gradeKey]?.topics?.includes("mixed")) {
      throw new Error(`WORKSHEET_HEBREW_MIXED_NOT_ALLOWED:${gradeKey}`);
    }
    if (listHebrewMixedPoolTopics(gradeKey).length < 2) {
      throw new Error(`WORKSHEET_HEBREW_MIXED_NEED_TWO_TOPICS:${gradeKey}`);
    }
    return "mixed";
  }
  const allowed = listHebrewTopicsForGrade(gradeKey);
  if (!allowed.includes(raw)) {
    throw new Error(`WORKSHEET_HEBREW_TOPIC_NOT_IN_GRADE:${gradeKey}:${raw}`);
  }
  return raw;
}

/**
 * @param {HebrewWorksheetSelectorParams} params
 * @returns {{ questions: Record<string, unknown>[], seed: number }}
 */
export function selectHebrewWorksheetQuestions(params) {
  const gradeKey = String(params.gradeKey || "g3");
  if (!HEBREW_GRADES[gradeKey]) {
    throw new Error(`WORKSHEET_HEBREW_INVALID_GRADE:${gradeKey}`);
  }
  const topicKey = resolveHebrewWorksheetTopic(params.topicKey, gradeKey);
  const n = Math.min(20, Math.max(1, Math.floor(Number(params.count) || 5)));
  const useSeed =
    typeof params.seed === "number" ? params.seed >>> 0 : (Date.now() % 1_000_000) >>> 0;
  const mixedPool =
    topicKey === "mixed"
      ? filterMixedPoolBySelection(listHebrewMixedPoolTopics(gradeKey), params.mixedTopicKeys)
      : [];

  return withSeededRandom(useSeed, () => {
    const plan = resolveActivityGenerationPlan(params.levelKey, "hebrew");
    /** @type {Record<string, unknown>[]} */
    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 80;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const sourceDifficulty = pickSourceDifficultyForAttempt(plan.sourceDifficulties, attempt);
      const levelConfig = hebrewLevelConfig(sourceDifficulty);

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
        const q = generateQuestion(levelConfig, generateTopic, gradeKey, null, {
          levelKey: params.levelKey,
        });
        if (isHebrewGeneratorNoQuestion(q)) continue;

        const item = hebrewWorksheetItemFromGenerated(q, generateTopic, gradeKey);
        if (!item) continue;
        item.topic = String(q.topic || generateTopic);
        item.operation = item.topic;

        const printable = toPrintableWorksheetQuestion(item, {
          displayIndex: 1,
          subject: "hebrew",
        });
        if (!isPrintableQuestion(printable.printability) || !printable.stemHe?.trim()) {
          continue;
        }

        const fp = `${printable.stemHe}|${item.correctAnswer}|${item.params?.answerMode || ""}|${item.topic}`;
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
        `WORKSHEET_HEBREW_INSUFFICIENT:${gradeKey}:${topicKey}:${params.levelKey}`
      );
    }

    return { questions, seed: useSeed };
  });
}

export { HEBREW_WORKSHEET_TOPIC_IDS, listHebrewTopicsForGrade };

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} [levelKey]
 * @param {number} [seed]
 */
export function canSelectHebrewWorksheetTopic(
  gradeKey,
  topicKey,
  levelKey = "medium",
  seed = 42
) {
  if (!HEBREW_GRADES[gradeKey]?.topics?.includes(topicKey)) return false;
  try {
    const { questions } = selectHebrewWorksheetQuestions({
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
export function auditHebrewTopicsSupportMatrix() {
  return HEBREW_WORKSHEET_TOPIC_IDS.map((topicKey) => {
    const grades = listGradesForHebrewTopic(topicKey);
    const gradeKey = grades[0] || "g3";
    const supported = grades.length
      ? canSelectHebrewWorksheetTopic(gradeKey, topicKey, "medium", 42)
      : false;
    return { topicKey, gradeKey, supported, grades };
  });
}

/**
 * @param {string} topicKey
 * @returns {string[]}
 */
function listGradesForHebrewTopic(topicKey) {
  /** @type {string[]} */
  const out = [];
  for (const [gradeKey, cfg] of Object.entries(HEBREW_GRADES)) {
    if (cfg.topics?.includes(topicKey)) out.push(gradeKey);
  }
  return out;
}
