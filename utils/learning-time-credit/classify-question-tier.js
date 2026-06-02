/** @typedef {import('./constants.js').LearningTimeCreditTier} LearningTimeCreditTier */

const HEBREW_LONG_READING_TOPICS = new Set(["reading", "comprehension"]);
const HEBREW_LONG_READING_KIND_MARKERS = [
  "comprehension_",
  "reading_structural",
  "reading_",
];

const HEBREW_HARD_KIND_MARKERS = [
  "full_composition",
  "multi_step",
  "composition_scaffold",
  "argument_scaffold",
  "argument_",
];

const ENGLISH_LONG_READING_KIND_PREFIXES = ["story_", "passage_", "reading_"];
const ENGLISH_LONG_READING_TOPICS_WITH_PASSAGE = new Set(["vocabulary"]);

const ENGLISH_HARD_TOPICS = new Set(["translation"]);
const ENGLISH_HARD_KIND_MARKERS = [
  "multi_step",
  "grammar_context",
  "translation_multi",
  "build_sentence",
  "sentence_build",
];

const SCIENCE_HARD_TOPICS = new Set(["experiments"]);
const SCIENCE_HARD_PATTERN_MARKERS = [
  "sci_experiments",
  "sci_vol_experiments",
  "experiment",
  "multi_step",
  "lab_",
  "investigation",
];
const SCIENCE_LONG_READING_PATTERN_MARKERS = [
  "passage",
  "reading_comprehension",
  "comprehension_passage",
];

const MOLEDET_LONG_READING_TOPICS = new Set(["maps"]);
const MOLEDET_HARD_TOPICS = new Set(["maps", "geography"]);

/**
 * @param {unknown} value
 */
function norm(value) {
  return value != null ? String(value).trim().toLowerCase() : "";
}

/**
 * @param {unknown} subjectId
 */
export function normalizeTimeCreditSubjectId(subjectId) {
  const s = norm(subjectId);
  if (s === "moledet" || s === "moledet-geography") return "moledet_geography";
  return s;
}

/**
 * @param {unknown} question
 */
function questionKind(question) {
  const q = question && typeof question === "object" ? question : {};
  const params = q.params && typeof q.params === "object" ? q.params : {};
  return norm(params.kind || q.kind);
}

/**
 * @param {unknown} question
 */
function questionTopic(question) {
  const q = question && typeof question === "object" ? question : {};
  return norm(q.topic || q.operation);
}

/**
 * @param {unknown} question
 */
function questionPatternFamily(question) {
  const q = question && typeof question === "object" ? question : {};
  const params = q.params && typeof q.params === "object" ? q.params : {};
  return norm(params.patternFamily || q.patternFamily);
}

/**
 * @param {unknown} question
 */
function questionSubtype(question) {
  const q = question && typeof question === "object" ? question : {};
  const params = q.params && typeof q.params === "object" ? q.params : {};
  return norm(params.subtype);
}

/**
 * @param {string} subjectId
 * @param {unknown} question
 */
function matchesLongReading(subjectId, question) {
  const subject = normalizeTimeCreditSubjectId(subjectId);
  const kind = questionKind(question);
  const topic = questionTopic(question);
  const patternFamily = questionPatternFamily(question);
  const subtype = questionSubtype(question);

  if (subject === "hebrew") {
    if (HEBREW_LONG_READING_TOPICS.has(topic)) return true;
    if (HEBREW_LONG_READING_KIND_MARKERS.some((m) => kind.startsWith(m) || kind.includes(m))) {
      return true;
    }
    return false;
  }

  if (subject === "english") {
    if (ENGLISH_LONG_READING_KIND_PREFIXES.some((p) => kind.startsWith(p))) return true;
    if (kind.includes("passage") || kind.includes("reading_comprehension")) return true;
    if (
      ENGLISH_LONG_READING_TOPICS_WITH_PASSAGE.has(topic) &&
      (kind.startsWith("story_") || kind.includes("passage"))
    ) {
      return true;
    }
    return false;
  }

  if (subject === "science") {
    if (
      SCIENCE_LONG_READING_PATTERN_MARKERS.some(
        (m) => patternFamily.includes(m) || subtype.includes(m) || kind.includes(m)
      )
    ) {
      return true;
    }
    return false;
  }

  if (subject === "moledet_geography") {
    if (MOLEDET_LONG_READING_TOPICS.has(topic)) return true;
    if (topic === "geography" && (kind.includes("passage") || kind.includes("map_read"))) {
      return true;
    }
    return false;
  }

  if (subject === "math" || subject === "geometry") {
    if (kind.startsWith("reading_") || kind.includes("passage") || kind.includes("comprehension")) {
      return true;
    }
  }

  return false;
}

/**
 * @param {string} subjectId
 * @param {unknown} question
 */
function matchesHard(subjectId, question) {
  const subject = normalizeTimeCreditSubjectId(subjectId);
  const kind = questionKind(question);
  const topic = questionTopic(question);
  const patternFamily = questionPatternFamily(question);
  const subtype = questionSubtype(question);
  const q = question && typeof question === "object" ? question : {};
  const params = q.params && typeof q.params === "object" ? q.params : {};
  const answerMode = norm(q.answerMode);
  const levelKey = norm(params.levelKey || params.uiLevel);
  const difficulty = norm(params.difficulty);

  if (subject === "math") {
    const op = norm(q.operation);
    if (op === "word_problems") return true;
    if (kind.startsWith("wp_")) return true;
    if (kind.includes("multi_step")) return true;
    if (kind.startsWith("story_")) return true;
  }

  if (subject === "geometry") {
    if (kind.startsWith("concept")) return true;
  }

  if (subject === "hebrew") {
    if (answerMode === "hebrew_audio_recorded_manual") return true;
    if (HEBREW_HARD_KIND_MARKERS.some((m) => kind.includes(m))) return true;
    if (topic === "grammar" && kind.includes("multi")) return true;
    return false;
  }

  if (subject === "english") {
    if (ENGLISH_HARD_TOPICS.has(topic)) return true;
    if (topic === "grammar" && ENGLISH_HARD_KIND_MARKERS.some((m) => kind.includes(m))) {
      return true;
    }
    if (ENGLISH_HARD_KIND_MARKERS.some((m) => kind.includes(m) || patternFamily.includes(m))) {
      return true;
    }
    return false;
  }

  if (subject === "science") {
    if (SCIENCE_HARD_TOPICS.has(topic)) return true;
    if (
      SCIENCE_HARD_PATTERN_MARKERS.some(
        (m) => patternFamily.includes(m) || subtype.includes(m) || kind.includes(m)
      )
    ) {
      return true;
    }
    return false;
  }

  if (subject === "moledet_geography") {
    if (
      MOLEDET_HARD_TOPICS.has(topic) &&
      (levelKey === "hard" || difficulty === "advanced")
    ) {
      return true;
    }
    if (kind.includes("multi_part") || kind.includes("multi_step")) return true;
    if (patternFamily.includes("navigation") || patternFamily.includes("analysis")) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * @param {{ subjectId?: string, gameMode?: string, question?: unknown }} input
 * @returns {LearningTimeCreditTier}
 */
export function resolveQuestionTimeCreditTier({ subjectId, gameMode, question }) {
  const mode = norm(gameMode);
  if (mode === "challenge" || mode === "speed") {
    return "legacy_game";
  }

  const subject = normalizeTimeCreditSubjectId(subjectId);

  if (matchesLongReading(subject, question)) {
    return "long_reading";
  }

  if (matchesHard(subject, question)) {
    return "hard";
  }

  return "default";
}
