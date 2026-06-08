import { formatGradeLevelHe } from "../learning-student-defaults.js";
import { GRADES as MATH_GRADES } from "../../utils/math-constants.js";
import { getLevelConfig } from "../../utils/math-storage.js";
import { getMathReportBucketDisplayName } from "../../utils/math-report-generator.js";
import { LEVELS as GEOMETRY_LEVELS, GRADES as GEOMETRY_GRADES, TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";
import { TOPICS as MOLEDET_TOPICS } from "../../utils/moledet-geography-constants.js";
import {
  LEVELS as HEBREW_LEVELS,
  GRADES as HEBREW_GRADES,
  TOPICS as HEBREW_TOPICS,
} from "../../utils/hebrew-constants.js";
import {
  ENGLISH_TOPICS,
  ENGLISH_GRADES,
  getLevelForGrade,
  generateQuestion as generateEnglishQuestion,
} from "../../utils/english-question-generator.js";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec.js";
import { sanitizeGeometryActivityQuestionStem } from "../../utils/geometry-activity-question-stem.js";
import {
  ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS,
  isActivityPreviewSubjectSupported,
} from "./classroom-activities-preview.js";
import { buildMoledetFrozenParamsFromBankRow } from "../learning/moledet-geography-canonical-metadata.js";
import { shouldEnforceFourMcqOptions } from "../../utils/mcq-four-options.js";

/**
 * @param {unknown} q
 * @param {string[]} choices
 * @param {string} correct
 */
function frozenMcqChoicesValid(q, choices, correct) {
  if (!correct || !Array.isArray(choices) || choices.length === 0) return false;
  if (!choices.includes(correct)) return false;
  if (shouldEnforceFourMcqOptions({ ...q, choices, answers: choices })) {
    return choices.length === 4;
  }
  return choices.length >= 2;
}

export { ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS, isActivityPreviewSubjectSupported };

/**
 * @param {string} gradeKey
 */
function mathGradeNumberFromKey(gradeKey) {
  const num = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10);
  return num >= 1 && num <= 6 ? num : 3;
}

/**
 * Resolve canonical math operation key for assigned activities.
 * @param {string|null|undefined} rawTopic
 * @param {string} gradeKey
 */
export function normalizeMathActivityTopic(rawTopic, gradeKey) {
  const raw = String(rawTopic || "").trim();
  if (!raw) {
    throw new Error("נושא מתמטיקה נדרש");
  }

  const allowed = (MATH_GRADES[gradeKey]?.operations || []).filter((op) => op !== "mixed");
  const lower = raw.toLowerCase();
  if (allowed.includes(lower)) return lower;

  for (const key of allowed) {
    const label = getMathReportBucketDisplayName(key);
    if (label && (raw === label || lower === label.toLowerCase())) return key;
  }

  const gradeLabel = formatGradeLevelHe(gradeKey) || gradeKey;
  const topicLabel = getMathReportBucketDisplayName(lower) || raw;
  throw new Error(`אין נושא מתמטיקה "${topicLabel}" ל${gradeLabel}`);
}

/**
 * Guard against silent fallback to unrelated arithmetic families.
 * @param {string} operation
 * @param {string|null|undefined} kind
 */
export function mathActivityKindMatchesOperation(operation, kind) {
  const k = String(kind || "");
  if (!k) return false;

  switch (operation) {
    case "addition":
      return k.startsWith("add_");
    case "subtraction":
      return k.startsWith("sub_");
    case "multiplication":
      return k === "mul" || k.startsWith("mul_");
    case "division":
      return k === "div" || k === "div_two_digit";
    case "division_with_remainder":
      return k === "div_with_remainder" || k === "div";
    case "fractions":
      return k.startsWith("frac_") || k === "mixed_to_frac";
    case "percentages":
      return k.startsWith("perc_");
    case "sequences":
      return k.startsWith("seq_");
    case "decimals":
      return k.startsWith("dec_");
    case "rounding":
      return k === "round";
    case "divisibility":
      return k === "divisibility";
    case "prime_composite":
      return k === "prime_composite";
    case "powers":
      return k.startsWith("power_");
    case "zero_one_properties":
      return k.startsWith("zero_") || k.startsWith("one_");
    case "equations":
      return k.startsWith("eq_");
    case "order_of_operations":
      return k.startsWith("order_");
    case "compare":
      return k === "cmp";
    case "number_sense":
      return k.startsWith("ns_");
    case "factors_multiples":
      return k.startsWith("fm_");
    case "estimation":
      return k.startsWith("est_");
    case "word_problems":
      return k.startsWith("wp_");
    case "ratio":
      return k.startsWith("ratio_");
    case "scale":
      return k.startsWith("scale_");
    default:
      return false;
  }
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

const SCIENCE_TOPIC_LABELS = {
  body: "גוף האדם",
  animals: "בעלי חיים",
  plants: "צמחים",
  materials: "חומרים",
  experiments: "ניסויים",
  earth_space: "כדור הארץ וחלל",
  environment: "סביבה",
};

const DIFFICULTY_LABELS = {
  easy: "קל",
  medium: "בינוני",
  hard: "קשה",
};

const DIAGRAM_OPTIONAL_KINDS = new Set([
  "transformations",
  "concept_transform",
  "rotation",
  "solids",
  "shapes_basic_properties_square",
  "shapes_basic_properties_rectangle",
  "shapes_basic_properties_angles",
]);

function levelLabelForKey(levelKey, levelsMap) {
  return DIFFICULTY_LABELS[levelKey] || levelsMap?.[levelKey]?.name || levelKey;
}

function notEnoughQuestionsMessage(subjectHe, gradeKey, topicKey, levelKey, topicLabel) {
  const gradeLabel = formatGradeLevelHe(gradeKey) || gradeKey;
  const levelLabel = levelLabelForKey(levelKey, GEOMETRY_LEVELS);
  return `אין מספיק שאלות ${subjectHe} עבור ${gradeLabel} — נושא: ${topicLabel} — רמה: ${levelLabel}`;
}

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

const ENGLISH_TOPIC_KEYS = new Set(Object.keys(ENGLISH_TOPICS));

/**
 * @param {string|null|undefined} raw
 * @param {string} gradeKey
 */
export function normalizeEnglishTopic(raw, gradeKey) {
  const trimmed = String(raw || "").trim();
  const lower = trimmed.toLowerCase();
  for (const [key, meta] of Object.entries(ENGLISH_TOPICS)) {
    if (key === lower || meta?.name === trimmed) return key;
  }
  if (ENGLISH_TOPIC_KEYS.has(lower)) return lower;
  return lower;
}

/**
 * @param {unknown} q
 */
function isEnglishNonMcqMode(q) {
  if (!q || typeof q !== "object") return true;
  if (String(q.topic || "").toLowerCase() === "writing") return true;

  const choices = Array.isArray(q.answers) ? q.answers.map(String) : [];
  const correct = String(q.correctAnswer || "").trim();
  if (choices.length >= 2 && correct && choices.includes(correct)) {
    return false;
  }

  const modes = [q.qType, q.answerMode, q.params?.answerMode].map((m) =>
    String(m || "").toLowerCase()
  );
  return modes.some((m) => m === "typing");
}

/**
 * @param {unknown} q
 */
function isEnglishGeneratorPlaceholder(q) {
  if (!q || typeof q !== "object") return true;
  if (q.params?.patternFamily === "english_empty_pool") return true;
  const prompt = String(q.question || "").trim();
  if (!prompt) return true;
  if (
    prompt.includes("אין כרגע שאלת דקדוק") ||
    prompt.includes("אין כרגע משפטי תרגום") ||
    prompt.includes("אין כרגע תבניות משפט")
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
function frozenEnglishItemFromGenerated(q, topicKey, gradeKey, levelKey) {
  if (isEnglishNonMcqMode(q)) return null;

  const choices = Array.isArray(q.answers) ? q.answers.map(String) : [];
  const correctAnswer = q.correctAnswer != null ? String(q.correctAnswer).trim() : "";
  const prompt = String(q.question || "").trim();
  if (!prompt || !correctAnswer) return null;
  if (!frozenMcqChoicesValid(q, choices, correctAnswer)) return null;

  const resolvedTopic = String(q.topic || topicKey);

  const p = q.params && typeof q.params === "object" ? { ...q.params } : {};
  const params = {
    answerMode: "choice",
    topicKey: resolvedTopic,
  };
  const setStr = (key, val) => {
    if (val != null && String(val).trim()) params[key] = String(val);
  };
  setStr("patternFamily", p.patternFamily);
  setStr("direction", p.direction);
  setStr("subtype", p.subtype);
  setStr("listKey", p.listKey);
  if (Array.isArray(p.grammarOptionSet) && p.grammarOptionSet.length) {
    params.grammarOptionSet = p.grammarOptionSet.map(String);
  }
  if (Array.isArray(p.sentenceOptionSet) && p.sentenceOptionSet.length) {
    params.sentenceOptionSet = p.sentenceOptionSet.map(String);
  }

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
    explanation: p.explanation != null ? String(p.explanation) : undefined,
    hint: q.hint != null ? String(q.hint) : undefined,
    subject: "english",
    topic: resolvedTopic,
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
  if (!frozenMcqChoicesValid(q, answers, correctAnswer)) return null;

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
  const rawPrompt = String(q.question || "").trim();
  const choices = Array.isArray(q.answers) ? q.answers.map(String) : undefined;
  if (!rawPrompt || !correctAnswer) return null;
  if (!frozenMcqChoicesValid(q, choices || [], correctAnswer)) return null;

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
  setNum("diagonal", p.diagonal);
  setNum("area", p.area);
  setNum("axes", p.axes);
  setNum("angle", p.angle);
  if (typeof p.isParallel === "boolean") params.isParallel = p.isParallel;
  setStr("type", p.type);

  const prompt = sanitizeGeometryActivityQuestionStem(rawPrompt, {
    kind: params.kind,
    topic: topicKey,
    subject: "geometry",
  });
  if (!prompt) return null;

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
  const kind = String(item.params.kind).replace(/^story_/, "");
  if (DIAGRAM_OPTIONAL_KINDS.has(kind)) return true;
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
  if (!frozenMcqChoicesValid({ params: row.params }, answers, correct)) return null;

  const params = buildMoledetFrozenParamsFromBankRow(row, topicKey, gradeKey, levelKey);
  const skillKey =
    params.diagnosticSkillId != null
      ? String(params.diagnosticSkillId)
      : row.skillId != null
        ? String(row.skillId)
        : undefined;

  return {
    question: prompt,
    correctAnswer: correct,
    choices: answers,
    subject: "moledet_geography",
    topic: topicKey,
    gradeLevel: gradeKey,
    difficulty: levelKey,
    skillKey,
    params,
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
  if (!frozenMcqChoicesValid({ params: q.params }, options, correct)) return null;

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
 * Classroom activity preview generators (math, science, moledet_geography, geometry, hebrew, english).
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
    const operation = normalizeMathActivityTopic(topic, grade);
    const levelKey = normalizeActivityDifficulty(difficulty);
    const levelConfig = getLevelConfig(mathGradeNumberFromKey(grade), levelKey);
    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 40;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const q = generateQuestion(levelConfig, operation, grade, null, {});
      if (!q?.question || q.correctAnswer == null) continue;

      const kind = q.params?.kind;
      if (!mathActivityKindMatchesOperation(operation, kind)) continue;

      const fp = `${q.question}|${q.correctAnswer}`;
      if (!fp || fp === "|" || seen.has(fp)) continue;
      seen.add(fp);

      questions.push({
        question: String(q.question),
        correctAnswer: String(q.correctAnswer),
        choices: Array.isArray(q.answers) ? q.answers.map(String) : undefined,
        explanation: q.explanation != null ? String(q.explanation) : undefined,
        hint: q.hint != null ? String(q.hint) : undefined,
        params: q.params,
        subject: "math",
        topic: operation,
        gradeLevel: grade,
        difficulty: levelKey,
      });
    }

    if (questions.length < n) {
      const topicLabel = getMathReportBucketDisplayName(operation) || operation;
      const gradeLabel = formatGradeLevelHe(grade) || grade;
      const levelLabel = levelLabelForKey(levelKey, {});
      throw new Error(
        `אין מספיק שאלות מתמטיקה עבור ${gradeLabel} — נושא: ${topicLabel} — רמה: ${levelLabel}`
      );
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
        notEnoughQuestionsMessage(
          "מדע",
          gradeKey,
          topicKey,
          levelKey,
          SCIENCE_TOPIC_LABELS[topicKey] || topicKey
        )
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
        notEnoughQuestionsMessage(
          "מדע",
          gradeKey,
          topicKey,
          levelKey,
          SCIENCE_TOPIC_LABELS[topicKey] || topicKey
        )
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
        notEnoughQuestionsMessage(
          "גאומטריה",
          gradeKey,
          topicKey,
          levelKey,
          GEOMETRY_TOPICS[topicKey]?.name || topicKey
        )
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

    if (questions.length > 0 && questions.length < n) {
      for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
        const q = generateQuestion(levelConfig, topicKey, gradeKey, null);
        if (isGeometryGeneratorNoQuestion(q)) continue;

        const item = frozenGeometryItemFromGenerated(q, topicKey, gradeKey, levelKey, undefined);
        if (!item || !frozenGeometryItemHasDiagram(item)) continue;

        const kind = String(item.params?.kind || "").replace(/^story_/, "");
        if (!DIAGRAM_OPTIONAL_KINDS.has(kind)) continue;

        questions.push(item);
      }
    }

    if (questions.length < n) {
      throw new Error(
        notEnoughQuestionsMessage(
          "גאומטריה",
          gradeKey,
          topicKey,
          levelKey,
          GEOMETRY_TOPICS[topicKey]?.name || topicKey
        )
      );
    }
    return questions;
  }

  if (sub === "moledet_geography") {
    const { isMoledetGeographyGradeAllowed } = await import(
      "../../utils/moledet-geography-curriculum-gates.js"
    );
    const gradeKey = normalizeGradeKey(gradeLevel);
    if (!isMoledetGeographyGradeAllowed(gradeKey)) {
      throw new Error(
        notEnoughQuestionsMessage("מולדת וגאוגרפיה", gradeKey, topic, difficulty, topic)
      );
    }
    const { listTopicQuestionsForGradeLevel } = await import(
      "../../utils/moledet-geography-question-generator.js"
    );
    const levelKey = normalizeActivityDifficulty(difficulty);
    const topicKey = normalizeMoledetGeographyTopic(topic);

    const pool = listTopicQuestionsForGradeLevel(gradeKey, levelKey, topicKey);
    if (!Array.isArray(pool) || pool.length === 0) {
      throw new Error(
        notEnoughQuestionsMessage(
          "מולדת וגאוגרפיה",
          gradeKey,
          topicKey,
          levelKey,
          MOLEDET_TOPICS[topicKey]?.name || topicKey
        )
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
        notEnoughQuestionsMessage(
          "מולדת וגאוגרפיה",
          gradeKey,
          topicKey,
          levelKey,
          MOLEDET_TOPICS[topicKey]?.name || topicKey
        )
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
        notEnoughQuestionsMessage(
          "עברית",
          gradeKey,
          topicKey,
          levelKey,
          HEBREW_TOPICS[topicKey]?.name || topicKey
        )
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
        notEnoughQuestionsMessage(
          "עברית",
          gradeKey,
          topicKey,
          levelKey,
          HEBREW_TOPICS[topicKey]?.name || topicKey
        )
      );
    }
    return questions;
  }

  if (sub === "english") {
    const gradeKey = normalizeGradeKey(gradeLevel);
    const levelKey = normalizeActivityDifficulty(difficulty);
    const topicKey = normalizeEnglishTopic(topic, gradeKey);
    const gradeTopics = ENGLISH_GRADES[gradeKey]?.topics || [];

    if (!gradeTopics.includes(topicKey)) {
      throw new Error(
        notEnoughQuestionsMessage(
          "אנגלית",
          gradeKey,
          topicKey,
          levelKey,
          ENGLISH_TOPICS[topicKey]?.name || topicKey
        )
      );
    }

    const levelConfig = getLevelForGrade(levelKey, gradeKey);
    const questions = [];
    const seen = new Set();
    const maxAttempts = n * 40;

    for (let attempt = 0; attempt < maxAttempts && questions.length < n; attempt += 1) {
      const q = generateEnglishQuestion(levelConfig, topicKey, gradeKey, null, levelKey, null);
      if (isEnglishGeneratorPlaceholder(q)) continue;
      if (isEnglishNonMcqMode(q)) continue;

      const correct = String(q.correctAnswer || "").trim();
      const fp = `${q.question}|${correct}`;
      if (!fp || fp === "|" || seen.has(fp)) continue;

      const item = frozenEnglishItemFromGenerated(q, topicKey, gradeKey, levelKey);
      if (!item) continue;

      seen.add(fp);
      questions.push(item);
    }

    if (questions.length < n) {
      throw new Error(
        notEnoughQuestionsMessage(
          "אנגלית",
          gradeKey,
          topicKey,
          levelKey,
          ENGLISH_TOPICS[topicKey]?.name || topicKey
        )
      );
    }
    return questions;
  }

  throw new Error("מקצוע לא נתמך לתצוגה מקדימה");
}
