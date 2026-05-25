import { LEVELS } from "../../utils/math-constants.js";
import { LEVELS as GEOMETRY_LEVELS, GRADES as GEOMETRY_GRADES, TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";
import {
  LEVELS as HEBREW_LEVELS,
  GRADES as HEBREW_GRADES,
  TOPICS as HEBREW_TOPICS,
} from "../../utils/hebrew-constants.js";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec.js";
import {
  ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS,
  isActivityPreviewSubjectSupported,
} from "./classroom-activities-preview.js";

export { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS, isActivityPreviewSubjectSupported };

/**
 * Map teacher difficulty to math generator level config.
 * @param {string|null|undefined} difficulty
 */
function mathLevelConfig(difficulty) {
  const key = String(difficulty || "medium").toLowerCase();
  if (key === "easy" || key === "hard" || key === "mixed") {
    return { ...LEVELS[key === "mixed" ? "medium" : key], name: LEVELS[key === "mixed" ? "medium" : key].name };
  }
  return { ...LEVELS.medium };
}

/**
 * Pick math operation from topic hint.
 * @param {string} topic
 */
function mathOperationFromTopic(topic) {
  const t = String(topic || "").toLowerCase();
  if (t.includes("fraction") || t.includes("שבר")) return "fractions";
  if (t.includes("mult") || t.includes("כפל")) return "multiplication";
  if (t.includes("div") || t.includes("חילוק")) return "division";
  if (t.includes("sub") || t.includes("חיסור")) return "subtraction";
  return "addition";
}

/**
 * Normalize grade key for generators (g1..g6).
 * @param {string|null|undefined} gradeLevel
 */
function normalizeGradeKey(gradeLevel) {
  const raw = String(gradeLevel || "g3").trim().toLowerCase();
  if (/^g[1-6]$/.test(raw)) return raw;
  const num = parseInt(raw.replace(/\D/g, ""), 10);
  if (num >= 1 && num <= 6) return `g${num}`;
  return "g3";
}

const SCIENCE_LEVEL_ORDER = { easy: 0, medium: 1, hard: 2 };

const SCIENCE_TOPIC_MAP = {
  גוף: "body",
  גופנו: "body",
  "בעלי חיים": "animals",
  חיות: "animals",
  צמחים: "plants",
  חומרים: "materials",
  ניסויים: "experiments",
  "כדור הארץ": "earth_space",
  חלל: "earth_space",
  סביבה: "environment",
};

/**
 * @param {string|null|undefined} raw
 */
function normalizeActivityDifficulty(raw) {
  const key = String(raw || "medium").trim().toLowerCase();
  if (key === "easy" || key === "hard" || key === "mixed") return key === "mixed" ? "medium" : key;
  if (key === "medium") return "medium";
  return "medium";
}

/** @param {string|null|undefined} raw */
function normalizeScienceDifficulty(raw) {
  return normalizeActivityDifficulty(raw);
}

const MOLEDET_TOPIC_KEYS = new Set([
  "homeland",
  "community",
  "citizenship",
  "geography",
  "values",
  "maps",
  "mixed",
]);

const MOLEDET_TOPIC_MAP = {
  מולדת: "homeland",
  קהילה: "community",
  אזרחות: "citizenship",
  גאוגרפיה: "geography",
  ערכים: "values",
  מפות: "maps",
  ערבוב: "mixed",
};

/**
 * @param {string|null|undefined} raw
 */
export function normalizeMoledetGeographyTopic(raw) {
  const trimmed = String(raw || "").trim();
  const lower = trimmed.toLowerCase();
  if (MOLEDET_TOPIC_MAP[trimmed]) return MOLEDET_TOPIC_MAP[trimmed];
  if (MOLEDET_TOPIC_MAP[lower]) return MOLEDET_TOPIC_MAP[lower];
  if (MOLEDET_TOPIC_KEYS.has(lower)) return lower;
  return lower || "homeland";
}

/**
 * @param {Record<string, unknown>} row
 */
function moledetBankItemFingerprint(row) {
  const prompt = String(row.question || "").trim();
  const answers = Array.isArray(row.answers) ? row.answers : [];
  const correctIdx = row.correct != null ? Number(row.correct) : 0;
  const correct =
    answers[correctIdx] != null ? String(answers[correctIdx]) : String(row.correctAnswer || "");
  return `${prompt}|${correct}`;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} topicKey
 * @param {string} gradeKey
 * @param {string} levelKey
 */
const GEOMETRY_TOPIC_KEYS = new Set(Object.keys(GEOMETRY_TOPICS));

const HEBREW_TOPIC_KEYS = new Set(Object.keys(HEBREW_TOPICS));

/**
 * @param {string|null|undefined} raw
 * @param {string} gradeKey
 */
export function normalizeHebrewTopic(raw, gradeKey) {
  const trimmed = String(raw || "").trim();
  const lower = trimmed.toLowerCase();
  for (const [key, meta] of Object.entries(HEBREW_TOPICS)) {
    if (key === lower || meta?.name === trimmed) return key;
  }
  if (HEBREW_TOPIC_KEYS.has(lower)) return lower;
  return lower;
}

/**
 * @param {string|null|undefined} raw
 */
function hebrewLevelConfig(raw) {
  const key = normalizeActivityDifficulty(raw);
  const cfg = HEBREW_LEVELS[key] || HEBREW_LEVELS.medium;
  return { ...cfg, name: cfg.name };
}

/**
 * @param {unknown} q
 */
function isHebrewTypingMode(q) {
  if (!q || typeof q !== "object") return false;
  const fields = [
    q.answerMode,
    q.preferredAnswerMode,
    q.params?.answerMode,
    q.params?.preferredAnswerMode,
  ];
  return fields.some((m) => String(m || "").toLowerCase() === "typing");
}

/**
 * @param {unknown} q
 */
function isHebrewGeneratorPlaceholder(q) {
  if (!q || typeof q !== "object") return true;
  if (q.params?.kind === "empty_pool" || q.params?.patternFamily === "no_questions") {
    return true;
  }
  const prompt = String(q.question || "").trim();
  if (!prompt) return true;
  if (
    prompt.includes("אין כרגע שאלות זמינות") ||
    prompt.includes("לא תקינה") ||
    prompt.includes("לא זמין")
  ) {
    return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>} q
 * @param {string} topicKey
 * @param {string} gradeKey
 * @param {string} levelKey
 */
function frozenHebrewItemFromGenerated(q, topicKey, gradeKey, levelKey) {
  if (isHebrewTypingMode(q)) return null;

  const answers = Array.isArray(q.answers) ? q.answers.map(String) : [];
  let correctAnswer =
    q.correctAnswer != null ? String(q.correctAnswer).trim() : null;
  if (!correctAnswer && q.correct != null && answers[Number(q.correct)] != null) {
    correctAnswer = String(answers[Number(q.correct)]).trim();
  }
  const prompt = String(q.question || "").trim();
  if (!prompt || !correctAnswer) return null;
  if (answers.length < 2 || !answers.includes(correctAnswer)) return null;

  const p = q.params && typeof q.params === "object" ? { ...q.params } : {};
  const params = {
    answerMode: "choice",
  };
  const setStr = (key, val) => {
    if (val != null && String(val).trim()) params[key] = String(val);
  };
  setStr("patternFamily", p.patternFamily);
  setStr("subtype", p.subtype);
  setStr("kind", p.kind);
  setStr("subtopicId", p.subtopicId);

  const skillKey =
    p.diagnosticSkillId != null
      ? String(p.diagnosticSkillId)
      : p.skillKey != null
        ? String(p.skillKey)
        : undefined;

  return {
    question: prompt,
    correctAnswer,
    choices: answers,
    explanation: q.explanation != null ? String(q.explanation) : undefined,
    hint: q.hint != null ? String(q.hint) : undefined,
    subject: "hebrew",
    topic: String(q.topic || topicKey),
    gradeLevel: gradeKey,
    difficulty: levelKey,
    skillKey,
    params,
  };
}

/**
 * @param {string|null|undefined} raw
 * @param {string} gradeKey
 */
export function normalizeGeometryTopic(raw, gradeKey) {
  const trimmed = String(raw || "").trim();
  const lower = trimmed.toLowerCase();
  for (const [key, meta] of Object.entries(GEOMETRY_TOPICS)) {
    if (key === lower || meta?.name === trimmed) return key;
  }
  return lower;
}

/**
 * @param {string|null|undefined} raw
 */
function geometryLevelConfig(raw) {
  const key = normalizeActivityDifficulty(raw);
  const cfg = GEOMETRY_LEVELS[key] || GEOMETRY_LEVELS.medium;
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
 * @param {string} levelKey
 */
function frozenGeometryItemFromGenerated(q, topicKey, gradeKey, levelKey, explanation) {
  const correctAnswer = normalizeGeometryCorrectAnswer(q.correctAnswer);
  const prompt = String(q.question || "").trim();
  const choices = Array.isArray(q.answers) ? q.answers.map(String) : undefined;
  if (!prompt || !correctAnswer) return null;
  if (!choices?.length || !choices.includes(correctAnswer)) return null;

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
  setStr("patternFamily", p.patternFamily);
  setStr("subtype", p.subtype);
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

  const skillKey =
    p.diagnosticSkillId != null
      ? String(p.diagnosticSkillId)
      : p.skillKey != null
        ? String(p.skillKey)
        : undefined;

  return {
    question: prompt,
    correctAnswer,
    choices,
    explanation,
    subject: "geometry",
    topic: String(q.topic || topicKey),
    gradeLevel: gradeKey,
    difficulty: levelKey,
    shape,
    skillKey,
    params,
  };
}

/**
 * Classroom geometry must ship with a renderable diagram (no text-only items).
 * @param {ReturnType<typeof frozenGeometryItemFromGenerated>} item
 */
function frozenGeometryItemHasDiagram(item) {
  if (!item?.params?.kind) return false;
  const spec = getGeometryDiagramSpec({
    topic: item.topic,
    shape: item.shape,
    params: item.params,
  });
  return Boolean(spec?.kind);
}

function frozenMoledetItemFromBankRow(row, topicKey, gradeKey, levelKey) {
  const answers = Array.isArray(row.answers) ? row.answers.map(String) : [];
  const correctIdx = row.correct != null ? Number(row.correct) : -1;
  const correct =
    correctIdx >= 0 && answers[correctIdx] != null
      ? String(answers[correctIdx])
      : row.correctAnswer != null
        ? String(row.correctAnswer)
        : null;
  const prompt = String(row.question || "").trim();
  if (!prompt || !correct) return null;
  if (answers.length < 2 || !answers.includes(correct)) return null;

  return {
    question: prompt,
    correctAnswer: correct,
    choices: answers,
    subject: "moledet_geography",
    topic: topicKey,
    gradeLevel: gradeKey,
    difficulty: levelKey,
    skillKey: row.skillId != null ? String(row.skillId) : undefined,
    params: {
      subtype: row.subtype != null ? String(row.subtype) : undefined,
      cognitiveLevel: row.cognitiveLevel != null ? String(row.cognitiveLevel) : undefined,
    },
  };
}

/**
 * @param {string|null|undefined} raw
 */
export function normalizeScienceTopic(raw) {
  const trimmed = String(raw || "").trim();
  const lower = trimmed.toLowerCase();
  if (SCIENCE_TOPIC_MAP[trimmed]) return SCIENCE_TOPIC_MAP[trimmed];
  if (SCIENCE_TOPIC_MAP[lower]) return SCIENCE_TOPIC_MAP[lower];
  return lower || "body";
}

/**
 * @param {Record<string, unknown>} question
 * @param {string} levelKey
 */
export function scienceLevelAllowed(question, levelKey) {
  const min = SCIENCE_LEVEL_ORDER[question.minLevel] ?? 0;
  const max = SCIENCE_LEVEL_ORDER[question.maxLevel] ?? 2;
  const target = SCIENCE_LEVEL_ORDER[levelKey] ?? 1;
  return target >= min && target <= max;
}

/**
 * @param {unknown[]} arr
 */
function shuffleArray(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @param {Record<string, unknown>} q
 */
function scienceBankItemFingerprint(q) {
  const prompt = String(q.stem || q.question || q.prompt || "").trim();
  const options = Array.isArray(q.options) ? q.options : [];
  const correctIdx =
    q.correctIndex != null
      ? Number(q.correctIndex)
      : q.correctOptionIndex != null
        ? Number(q.correctOptionIndex)
        : 0;
  const correct =
    q.correctAnswer != null
      ? String(q.correctAnswer)
      : options[correctIdx] != null
        ? String(options[correctIdx])
        : "";
  return `${prompt}|${correct}`;
}

/**
 * @param {Record<string, unknown>} q
 */
function frozenScienceItemFromBankRow(q, topicKey, gradeKey, levelKey) {
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  const correctIdx =
    q.correctIndex != null
      ? Number(q.correctIndex)
      : q.correctOptionIndex != null
        ? Number(q.correctOptionIndex)
        : 0;
  const correct =
    q.correctAnswer != null
      ? String(q.correctAnswer)
      : options[correctIdx] != null
        ? String(options[correctIdx])
        : null;
  const prompt = String(q.stem || q.question || q.prompt || "").trim();
  if (!prompt || !correct) return null;
  if (!options.length || !options.includes(correct)) return null;

  const params = q.params && typeof q.params === "object" ? q.params : undefined;
  const skillKey =
    q.skillKey != null
      ? String(q.skillKey)
      : params?.diagnosticSkillId != null
        ? String(params.diagnosticSkillId)
        : undefined;

  return {
    question: prompt,
    correctAnswer: correct,
    choices: options,
    explanation: q.explanation != null ? String(q.explanation) : undefined,
    hint: q.hint != null ? String(q.hint) : undefined,
    subject: "science",
    topic: String(q.topic || topicKey),
    gradeLevel: gradeKey,
    difficulty: levelKey,
    skillKey,
    params,
  };
}

/**
 * Phase A: only math and science have real preview generators.
 * @param {string} subject
 * @param {string} gradeLevel
 * @param {string} topic
 * @param {string|null} difficulty
 * @param {number} count
 */
export async function generateActivityQuestionSetClient({
  subject,
  gradeLevel,
  topic,
  difficulty,
  count,
}) {
  const n = Math.min(50, Math.max(1, Math.floor(Number(count) || 5)));
  const sub = String(subject || "math").trim().toLowerCase();

  if (!isActivityPreviewSubjectSupported(sub)) {
    throw new Error(
      "בשלב זה ניתן ליצור פעילויות בתצוגה מקדימה רק במקצועות נתמכים. בחרו מקצוע נתמך."
    );
  }

  if (sub === "math") {
    const { generateQuestion } = await import("../../utils/math-question-generator.js");
    const grade = normalizeGradeKey(gradeLevel);
    const levelConfig = mathLevelConfig(difficulty);
    const op = mathOperationFromTopic(topic);
    const questions = [];
    const seen = new Set();

    for (let i = 0; i < n; i += 1) {
      let q = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        q = generateQuestion(levelConfig, op, grade, null, {});
        const key = `${q?.question}|${q?.correctAnswer}`;
        if (!seen.has(key)) {
          seen.add(key);
          break;
        }
      }
      if (!q?.question || q.correctAnswer == null) continue;
      questions.push({
        question: String(q.question),
        correctAnswer: String(q.correctAnswer),
        explanation: q.explanation != null ? String(q.explanation) : undefined,
        hint: q.hint != null ? String(q.hint) : undefined,
        params: q.params,
        subject: "math",
        topic,
      });
    }

    if (questions.length < n) {
      throw new Error("לא ניתן ליצור מספיק שאלות מתמטיקה — נסו נושא או רמה אחרת");
    }
    return questions;
  }

  if (sub === "science") {
    const bank = await import("../../data/science-questions.js");
    const pool = Array.isArray(bank?.SCIENCE_QUESTIONS) ? bank.SCIENCE_QUESTIONS : [];
    const gradeKey = normalizeGradeKey(gradeLevel);
    const levelKey = normalizeScienceDifficulty(difficulty);
    const topicKey = normalizeScienceTopic(topic);

    const filtered = pool.filter((q) => {
      if (!q || typeof q !== "object") return false;
      if (!Array.isArray(q.grades) || !q.grades.includes(gradeKey)) return false;
      const bankTopic = String(q.topic || q.category || "").toLowerCase();
      if (bankTopic !== topicKey) return false;
      return scienceLevelAllowed(q, levelKey);
    });

    if (!filtered.length) {
      throw new Error(
        `אין מספיק שאלות מדע עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }

    const shuffled = shuffleArray(filtered);
    const seen = new Set();
    const questions = [];

    for (const q of shuffled) {
      const fp = scienceBankItemFingerprint(q);
      if (!fp || fp === "|" || seen.has(fp)) continue;
      const item = frozenScienceItemFromBankRow(q, topicKey, gradeKey, levelKey);
      if (!item) continue;
      seen.add(fp);
      questions.push(item);
      if (questions.length >= n) break;
    }

    if (questions.length < n) {
      throw new Error(
        `אין מספיק שאלות מדע עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }
    return questions;
  }

  if (sub === "geometry") {
    const { generateQuestion } = await import("../../utils/geometry-question-generator.js");
    const gradeKey = normalizeGradeKey(gradeLevel);
    const levelKey = normalizeActivityDifficulty(difficulty);
    const levelConfig = geometryLevelConfig(difficulty);
    const topicKey = normalizeGeometryTopic(topic, gradeKey);
    const allowedTopics = (GEOMETRY_GRADES[gradeKey]?.topics || []).filter((t) => t !== "mixed");

    if (!allowedTopics.includes(topicKey)) {
      throw new Error(
        `אין מספיק שאלות גיאומטריה עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }

    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 40;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const q = generateQuestion(levelConfig, topicKey, gradeKey, null);
      if (isGeometryGeneratorNoQuestion(q)) continue;

      const fp = `${q.question}|${normalizeGeometryCorrectAnswer(q.correctAnswer)}`;
      if (!fp || fp === "|" || seen.has(fp)) continue;

      const item = frozenGeometryItemFromGenerated(q, topicKey, gradeKey, levelKey, undefined);
      if (!item || !frozenGeometryItemHasDiagram(item)) continue;

      seen.add(fp);
      questions.push(item);
    }

    if (questions.length < n) {
      throw new Error(
        `אין מספיק שאלות גיאומטריה עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }
    return questions;
  }

  if (sub === "moledet_geography") {
    const { listTopicQuestionsForGradeLevel } = await import(
      "../../utils/moledet-geography-question-generator.js"
    );
    const gradeKey = normalizeGradeKey(gradeLevel);
    const levelKey = normalizeActivityDifficulty(difficulty);
    const topicKey = normalizeMoledetGeographyTopic(topic);

    const pool = listTopicQuestionsForGradeLevel(gradeKey, levelKey, topicKey);
    if (!Array.isArray(pool) || pool.length === 0) {
      throw new Error(
        `אין מספיק שאלות מולדת וגאוגרפיה עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }

    const shuffled = shuffleArray(pool);
    const seen = new Set();
    const questions = [];

    for (const row of shuffled) {
      if (!row || typeof row !== "object") continue;
      const fp = moledetBankItemFingerprint(row);
      if (!fp || fp === "|" || seen.has(fp)) continue;
      const item = frozenMoledetItemFromBankRow(row, topicKey, gradeKey, levelKey);
      if (!item) continue;
      seen.add(fp);
      questions.push(item);
      if (questions.length >= n) break;
    }

    if (questions.length < n) {
      throw new Error(
        `אין מספיק שאלות מולדת וגאוגרפיה עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }
    return questions;
  }

  if (sub === "hebrew") {
    const { generateQuestion } = await import("../../utils/hebrew-question-generator.js");
    const gradeKey = normalizeGradeKey(gradeLevel);
    const levelKey = normalizeActivityDifficulty(difficulty);
    const levelConfig = hebrewLevelConfig(difficulty);
    const topicKey = normalizeHebrewTopic(topic, gradeKey);
    const gradeTopics = HEBREW_GRADES[gradeKey]?.topics || [];

    if (!gradeTopics.includes(topicKey)) {
      throw new Error(
        `אין מספיק שאלות עברית עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }

    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 40;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const q = generateQuestion(levelConfig, topicKey, gradeKey, null, {});
      if (isHebrewGeneratorPlaceholder(q)) continue;
      if (isHebrewTypingMode(q)) continue;

      const correct =
        q.correctAnswer != null
          ? String(q.correctAnswer).trim()
          : Array.isArray(q.answers) && q.correct != null
            ? String(q.answers[Number(q.correct)] || "").trim()
            : "";
      const fp = `${q.question}|${correct}`;
      if (!fp || fp === "|" || seen.has(fp)) continue;

      const item = frozenHebrewItemFromGenerated(q, topicKey, gradeKey, levelKey);
      if (!item) continue;

      seen.add(fp);
      questions.push(item);
    }

    if (questions.length < n) {
      throw new Error(
        `אין מספיק שאלות עברית עבור כיתה ${gradeKey} נושא ${topicKey} רמה ${levelKey}`
      );
    }
    return questions;
  }

  throw new Error("מקצוע לא נתמך לתצוגה מקדימה");
}
