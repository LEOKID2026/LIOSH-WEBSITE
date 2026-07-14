/**
 * Geometry worksheet question selector — grade/topic/level/count with seeded RNG.
 * @module lib/worksheets/worksheet-geometry-selector.server
 */

import { GRADES as GEOMETRY_GRADES, TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";
import { LEVELS as GEOMETRY_LEVELS } from "../../utils/geometry-constants.js";
import { generateQuestion } from "../../utils/geometry-question-generator.js";
import { normalizeGeometryTopic } from "../classroom-activities/generate-activity-questions-client.js";
import {
  pickSourceDifficultyForAttempt,
  resolveActivityGenerationPlan,
} from "../learning/activity-question-selection.js";
import { sanitizeGeometryActivityQuestionStem } from "../../utils/geometry-activity-question-stem.js";
import { withSeededRandom } from "./worksheet-seeded-random.server.js";
import {
  GEOMETRY_WORKSHEET_TOPIC_IDS,
  listGeometryTopicsForGrade,
} from "./worksheet-geometry-allowlist.js";
import { toPrintableWorksheetQuestion } from "./worksheet-question-sanitize.server.js";
import { isPrintableQuestion } from "./worksheet-print-allowlist.js";

/**
 * @typedef {Object} GeometryWorksheetSelectorParams
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {string} levelKey
 * @property {number} count
 * @property {number} [seed]
 */

/**
 * @param {string|null|undefined} sourceDifficulty
 */
function geometryLevelConfig(sourceDifficulty) {
  const key = String(sourceDifficulty || "easy").toLowerCase();
  const cfg = GEOMETRY_LEVELS[key] || GEOMETRY_LEVELS.easy;
  return { ...cfg, name: cfg.name };
}

/**
 * @param {unknown} q
 */
function isGeometryGeneratorNoQuestion(q) {
  if (!q || typeof q !== "object") return true;
  if (q.params?.kind === "no_question") return true;
  const prompt = String(q.question || "").trim();
  if (!prompt) return true;
  if (
    prompt.includes("לא תקינה") ||
    prompt.includes("לא זמין") ||
    prompt.includes("אין שאלות") ||
    prompt.includes("אין נושאים")
  ) {
    return true;
  }
  return false;
}

/**
 * @param {unknown} correctAnswer
 */
function normalizeGeometryCorrectAnswer(correctAnswer) {
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
function geometryWorksheetItemFromGenerated(q, topicKey, gradeKey) {
  const correctAnswer = normalizeGeometryCorrectAnswer(q.correctAnswer);
  const rawPrompt = String(q.question || "").trim();
  const choices = Array.isArray(q.answers) ? q.answers.map(String) : undefined;
  if (!rawPrompt || !correctAnswer) return null;
  if (!choices?.length || choices.length < 2) return null;
  if (!choices.includes(correctAnswer)) return null;

  const p = q.params && typeof q.params === "object" ? { ...q.params } : {};
  const shape = q.shape != null ? String(q.shape) : p.shape != null ? String(p.shape) : undefined;
  if (shape) p.shape = shape;

  const params = {};
  const setStr = (key, val) => {
    if (val != null && String(val).trim()) params[key] = String(val);
  };
  const setNum = (key, val) => {
    if (typeof val === "number" && Number.isFinite(val)) params[key] = val;
  };

  setStr("kind", p.kind);
  setStr("subtype", p.subtype);
  setStr("type", p.type);
  if (shape) params.shape = shape;
  setNum("side", p.side);
  setNum("base", p.base);
  setNum("height", p.height);
  setNum("radius", p.radius);
  setNum("length", p.length);
  setNum("width", p.width);
  setNum("base1", p.base1);
  setNum("base2", p.base2);
  setNum("a", p.a);
  setNum("b", p.b);
  setNum("c", p.c);
  setNum("angle1", p.angle1);
  setNum("angle2", p.angle2);
  setNum("angle3", p.angle3);
  setNum("diagonal", p.diagonal);
  setNum("area", p.area);
  setNum("angle", p.angle);
  setNum("side1", p.side1);
  setNum("side2", p.side2);
  setNum("side3", p.side3);
  setStr("solidShape", p.solidShape);
  setStr("solid", p.solid);
  setStr("type", p.type);
  if (typeof p.isParallel === "boolean") params.isParallel = p.isParallel;

  const prompt = sanitizeGeometryActivityQuestionStem(rawPrompt, {
    kind: params.kind,
    topic: topicKey,
    subject: "geometry",
  });
  if (!prompt) return null;

  return {
    question: prompt,
    correctAnswer,
    answers: choices,
    choices,
    subject: "geometry",
    topic: String(q.topic || topicKey),
    operation: String(q.topic || topicKey),
    gradeLevel: gradeKey,
    shape,
    params,
  };
}

/**
 * @param {string} topicKey
 * @param {string} gradeKey
 * @returns {string}
 */
export function resolveGeometryWorksheetTopic(topicKey, gradeKey) {
  const raw = String(topicKey || "").trim().toLowerCase();
  if (raw === "mixed") {
    if (!GEOMETRY_GRADES[gradeKey]?.topics?.includes("mixed")) {
      throw new Error(`WORKSHEET_GEOMETRY_MIXED_NOT_ALLOWED:${gradeKey}`);
    }
    return "mixed";
  }
  const resolved = normalizeGeometryTopic(topicKey, gradeKey);
  const allowed = listGeometryTopicsForGrade(gradeKey);
  if (!allowed.includes(resolved)) {
    throw new Error(`WORKSHEET_GEOMETRY_TOPIC_NOT_IN_GRADE:${gradeKey}:${resolved}`);
  }
  return resolved;
}

/**
 * @param {GeometryWorksheetSelectorParams} params
 * @returns {{ questions: Record<string, unknown>[], seed: number }}
 */
export function selectGeometryWorksheetQuestions(params) {
  const gradeKey = String(params.gradeKey || "g3");
  if (!GEOMETRY_GRADES[gradeKey]) {
    throw new Error(`WORKSHEET_GEOMETRY_INVALID_GRADE:${gradeKey}`);
  }
  const topicKey = resolveGeometryWorksheetTopic(params.topicKey, gradeKey);
  const n = Math.min(20, Math.max(1, Math.floor(Number(params.count) || 5)));
  const useSeed =
    typeof params.seed === "number" ? params.seed >>> 0 : (Date.now() % 1_000_000) >>> 0;

  return withSeededRandom(useSeed, () => {
    const plan = resolveActivityGenerationPlan(params.levelKey, "geometry");
    /** @type {Record<string, unknown>[]} */
    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 60;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const sourceDifficulty = pickSourceDifficultyForAttempt(
        plan.sourceDifficulties,
        attempt
      );
      const levelConfig = geometryLevelConfig(sourceDifficulty);
      const q = generateQuestion(levelConfig, topicKey, gradeKey, null, null);
      if (isGeometryGeneratorNoQuestion(q)) continue;

      const item = geometryWorksheetItemFromGenerated(q, topicKey, gradeKey);
      if (!item) continue;

      const printable = toPrintableWorksheetQuestion(item, {
        displayIndex: 1,
        subject: "geometry",
      });
      if (!isPrintableQuestion(printable.printability) || !printable.stemHe?.trim()) {
        continue;
      }

      const fp = `${item.question}|${item.correctAnswer}|${item.params?.kind || ""}`;
      if (!fp || fp === "||" || seen.has(fp)) continue;
      seen.add(fp);
      questions.push(item);
    }

    if (questions.length < n) {
      throw new Error(
        `WORKSHEET_GEOMETRY_INSUFFICIENT:${gradeKey}:${topicKey}:${params.levelKey}`
      );
    }

    return { questions, seed: useSeed };
  });
}

export { GEOMETRY_WORKSHEET_TOPIC_IDS, listGeometryTopicsForGrade };

/**
 * @param {string} gradeKey
 * @param {string} topicKey
 * @param {string} [levelKey]
 * @param {number} [seed]
 */
export function canSelectGeometryWorksheetTopic(
  gradeKey,
  topicKey,
  levelKey = "medium",
  seed = 42
) {
  if (!GEOMETRY_GRADES[gradeKey]?.topics?.includes(topicKey)) return false;
  try {
    const { questions } = selectGeometryWorksheetQuestions({
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
export function auditGeometryTopicsSupportMatrix() {
  return GEOMETRY_WORKSHEET_TOPIC_IDS.map((topicKey) => {
    const grades = listGradesForGeometryTopic(topicKey);
    const gradeKey = grades[0] || "g3";
    const supported = grades.length
      ? canSelectGeometryWorksheetTopic(gradeKey, topicKey, "medium", 42)
      : false;
    return { topicKey, gradeKey, supported, grades };
  });
}

/**
 * @param {string} topicKey
 * @returns {string[]}
 */
function listGradesForGeometryTopic(topicKey) {
  /** @type {string[]} */
  const out = [];
  for (const [gradeKey, cfg] of Object.entries(GEOMETRY_GRADES)) {
    if (cfg.topics?.includes(topicKey)) out.push(gradeKey);
  }
  return out;
}
