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
import {
  isGeometryWorksheetStemIncomplete,
  normalizeGeometryWorksheetStem,
} from "../../utils/geometry-activity-question-stem.js";
import { withSeededRandom } from "./worksheet-seeded-random.server.js";
import { filterMixedPoolBySelection } from "./worksheet-mixed-topics.js";
import {
  GEOMETRY_WORKSHEET_TOPIC_IDS,
  listGeometryTopicsForGrade,
  listGeometryMixedPoolTopics,
  canExposeGeometryWorksheetMixed,
} from "./worksheet-geometry-allowlist.js";
import { resolveGeometryWorksheetAnswerMode } from "./worksheet-geometry-answer-mode.js";
import { geometryQuestionRequiresDiagram } from "./worksheet-geometry-display.server.js";
import { isGeometryWorksheetParamsMathValid } from "./worksheet-geometry-math-valid.js";
import { toPrintableWorksheetQuestion } from "./worksheet-question-sanitize.server.js";
import { isPrintableQuestion } from "./worksheet-print-allowlist.js";

/**
 * @typedef {Object} GeometryWorksheetSelectorParams
 * @property {string} gradeKey
 * @property {string} topicKey
 * @property {string} levelKey
 * @property {number} count
 * @property {number} [seed]
 * @property {boolean} [preferMcq]
 * @property {string[] | null} [mixedTopicKeys]
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
  if (!rawPrompt || !correctAnswer) return null;

  const p = q.params && typeof q.params === "object" ? { ...q.params } : {};
  const shape = q.shape != null ? String(q.shape) : p.shape != null ? String(p.shape) : undefined;
  if (shape) p.shape = shape;

  const kind = String(p.kind || "").replace(/^story_/, "");
  const answerMode = resolveGeometryWorksheetAnswerMode(kind, topicKey);
  const rawChoices = Array.isArray(q.answers) ? q.answers.map(String) : undefined;

  // Open compute: keep answer even without choices. Never invent fake MCQ.
  if (answerMode === "mcq") {
    if (!rawChoices?.length || rawChoices.length < 2) return null;
    if (!rawChoices.includes(correctAnswer)) return null;
  }

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
  setStr("which", p.which);
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
  setNum("axes", p.axes);
  setNum("tileSide", p.tileSide);
  setNum("floorL", p.floorL);
  setNum("floorW", p.floorW);
  setNum("tileArea", p.tileArea);
  setNum("floorArea", p.floorArea);
  setNum("count", p.count);
  setNum("dx", p.dx);
  setNum("dy", p.dy);
  setNum("baseSide", p.baseSide);
  setNum("baseWidth", p.baseWidth);
  setNum("baseLength", p.baseLength);
  setNum("baseHeight", p.baseHeight);
  setNum("baseArea", p.baseArea);
  setNum("slantHeight", p.slantHeight);
  setNum("diameter", p.diameter);
  setNum("depth", p.depth);
  setNum("faces", p.faces);
  setNum("edges", p.edges);
  setNum("vertices", p.vertices);
  setStr("solidShape", p.solidShape);
  setStr("solid", p.solid);
  setStr("type", p.type);
  setStr("tile", p.tile);
  if (typeof p.isParallel === "boolean") params.isParallel = p.isParallel;
  params.answerMode = answerMode;

  if (!isGeometryWorksheetParamsMathValid({ ...p, ...params, kind: params.kind || p.kind })) {
    return null;
  }

  const prompt = normalizeGeometryWorksheetStem(rawPrompt, {
    kind: params.kind,
    topic: topicKey,
    angle1: typeof p.angle1 === "number" ? p.angle1 : null,
    angle2: typeof p.angle2 === "number" ? p.angle2 : null,
    params,
  });
  if (!prompt) return null;
  if (isGeometryWorksheetStemIncomplete(prompt, String(params.kind || ""))) {
    return null;
  }

  // Reject unfinished data-only fragments (no instruction verb / question cue).
  if (
    answerMode === "open" &&
    !/(חשב(?:ו|י)?|מצא(?:ו|י)?|כתב(?:ו|י)?|השל(?:ימו|ם)|קבע(?:ו|י)?|סמנ(?:ו|י)?|מה\s|כמה\s)/u.test(
      prompt
    )
  ) {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const item = {
    question: prompt,
    correctAnswer,
    subject: "geometry",
    topic: String(q.topic || topicKey),
    operation: String(q.topic || topicKey),
    gradeLevel: gradeKey,
    shape,
    answerMode,
    params,
  };

  if (answerMode === "mcq") {
    item.answers = rawChoices;
    item.choices = rawChoices;
  } else {
    item.writingSpaceLines = 0;
    item.geometryAnswerLine = true;
  }

  return item;
}

/**
 * @param {string} topicKey
 * @param {string} gradeKey
 * @returns {string}
 */
export function resolveGeometryWorksheetTopic(topicKey, gradeKey) {
  const raw = String(topicKey || "").trim().toLowerCase();
  if (raw === "mixed") {
    if (!canExposeGeometryWorksheetMixed(gradeKey)) {
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
 * @param {Record<string, unknown>} item
 * @param {import("./worksheet-question-types.js").PrintableWorksheetQuestion} printable
 * @returns {boolean}
 */
function isAcceptableGeometryWorksheetPrintable(item, printable) {
  if (!isPrintableQuestion(printable.printability) || !printable.stemHe?.trim()) {
    return false;
  }
  if (isGeometryWorksheetStemIncomplete(printable.stemHe, String(item.params?.kind || ""))) {
    return false;
  }
  if (!isGeometryWorksheetParamsMathValid(item.params)) {
    return false;
  }
  const mode = String(item.answerMode || "");
  if (
    mode === "open" &&
    !/(חשב(?:ו|י)?|מצא(?:ו|י)?|כתב(?:ו|י)?|השל(?:ימו|ם)|קבע(?:ו|י)?|סמנ(?:ו|י)?|מה\s|כמה\s)/u.test(
      printable.stemHe
    )
  ) {
    return false;
  }
  // Reject curved solids / blocked diagram kinds (printability usually catches these).
  if (printable.printability === "blocked_diagram_pending") return false;

  // Visual questions must keep a diagram; pure concept_* may stay text-only.
  if (geometryQuestionRequiresDiagram(item) && !printable.diagramSpec?.kind) {
    return false;
  }
  return true;
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
  const mixedPool =
    topicKey === "mixed"
      ? filterMixedPoolBySelection(
          listGeometryMixedPoolTopics(gradeKey),
          params.mixedTopicKeys
        )
      : [];

  return withSeededRandom(useSeed, () => {
    const plan = resolveActivityGenerationPlan(params.levelKey, "geometry");
    /** @type {Record<string, unknown>[]} */
    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 100;
    let openCount = 0;
    let mcqCount = 0;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const sourceDifficulty = pickSourceDifficultyForAttempt(
        plan.sourceDifficulties,
        attempt
      );
      const levelConfig = geometryLevelConfig(sourceDifficulty);

      /** @type {string[]} */
      const topicOrder =
        topicKey === "mixed"
          ? [...mixedPool].sort((a, b) => {
              const ca = questions.filter((q) => q.topic === a || q.operation === a).length;
              const cb = questions.filter((q) => q.topic === b || q.operation === b).length;
              if (ca !== cb) return ca - cb;
              // Prefer underfilled topics; slight seed jitter already from attempts.
              return String(a).localeCompare(String(b));
            })
          : [topicKey];

      let placed = false;
      for (const generateTopic of topicOrder) {
        const q = generateQuestion(levelConfig, generateTopic, gradeKey, null, null);
        if (isGeometryGeneratorNoQuestion(q)) continue;

        const item = geometryWorksheetItemFromGenerated(q, generateTopic, gradeKey);
        if (!item) continue;
        // Keep concrete topic identity on mixed sheets (not the umbrella "mixed").
        item.topic = String(q.topic || generateTopic);
        item.operation = item.topic;

        const mode = String(item.answerMode || "");
        if (
          questions.length < n - 2 &&
          openCount > 0 &&
          mcqCount > 0 &&
          Math.abs(openCount - mcqCount) > 4
        ) {
          if (mode === "open" && openCount > mcqCount && Math.random() < 0.55) continue;
          if (mode === "mcq" && mcqCount > openCount && Math.random() < 0.55) continue;
        }

        // Mixed: avoid monopolizing one topic before we have enough families.
        if (topicKey === "mixed" && mixedPool.length >= 4) {
          const topicCount = questions.filter(
            (x) => x.topic === item.topic || x.operation === item.topic
          ).length;
          const distinct = new Set(questions.map((x) => x.topic || x.operation)).size;
          if (questions.length >= 4 && distinct < 4 && topicCount > 0) {
            // Soft push toward unseen families while filling first slots.
            if (Math.random() < 0.75) continue;
          }
          if (topicCount >= Math.ceil(n / Math.max(4, Math.min(mixedPool.length, 6)))) {
            continue;
          }
        }

        const printable = toPrintableWorksheetQuestion(item, {
          displayIndex: 1,
          subject: "geometry",
        });
        if (!isAcceptableGeometryWorksheetPrintable(item, printable)) continue;

        const fp = `${item.question}|${item.correctAnswer}|${item.params?.kind || ""}|${mode}|${item.topic}`;
        if (!fp || seen.has(fp)) continue;
        seen.add(fp);
        questions.push(item);
        if (mode === "open") openCount += 1;
        else mcqCount += 1;
        placed = true;
        break;
      }
      if (!placed) continue;
    }

    if (questions.length < n) {
      throw new Error(
        `WORKSHEET_GEOMETRY_INSUFFICIENT:${gradeKey}:${topicKey}:${params.levelKey}`
      );
    }

    return { questions, seed: useSeed };
  });
}

export {
  GEOMETRY_WORKSHEET_TOPIC_IDS,
  listGeometryTopicsForGrade,
  listGeometryMixedPoolTopics,
  canExposeGeometryWorksheetMixed,
};

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
