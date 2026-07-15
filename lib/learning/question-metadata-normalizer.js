/**
 * Q2-B — Pure question metadata normalizer (legacy → canonical contract).
 * No report, aggregate, classification, or API behavior changes.
 *
 * @see docs/diagnostics/QUESTION_METADATA_CONTRACT.md
 */

export const QUESTION_METADATA_CONTRACT_VERSION = "question-metadata-contract-v1";

const PHASE8_CONFIDENCE_MAP = Object.freeze({
  full: "high",
  partial: "medium",
  minimal: "low",
  unknown: "low",
});

const CONTRACT_CONFIDENCE = new Set(["high", "medium", "low"]);

const ANSWER_FORMAT_MAP = Object.freeze({
  mcq: "mcq",
  numeric: "numeric",
  number: "numeric",
  open: "text",
  text: "text",
  audio: "text",
});

const COGNITIVE_TO_DEPTH = Object.freeze({
  recall: "recall",
  understanding: "simple_application",
  application: "simple_application",
  analysis: "inference",
  evaluation: "inference",
});

const DIFFICULTY_BAND_TO_DEPTH = Object.freeze({
  easy: "recall",
  medium: "simple_application",
  hard: "multi_step",
});

const ENGLISH_TOPIC_QUESTION_TYPE = Object.freeze({
  grammar: "grammar",
  vocabulary: "vocabulary",
  translation: "translation",
  reading: "reading_comprehension",
  reading_comprehension: "reading_comprehension",
});

/**
 * @param {unknown} v
 * @returns {string|null}
 */
function pickStr(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {Record<string, unknown>}
 */
function getParams(record) {
  const p = record.params;
  return p && typeof p === "object" && !Array.isArray(p) ? p : {};
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null} engine
 * @returns {string|null}
 */
function resolveSkillId(record, params, engine) {
  return (
    pickStr(engine?.skillId) ||
    pickStr(params.diagnosticSkillId) ||
    pickStr(record.diagnosticSkillId) ||
    pickStr(record.skillId) ||
    pickStr(record.skill_key) ||
    pickStr(record.skillKey) ||
    (pickStr(params.kind) && pickStr(record.subject) === "math"
      ? `math_${pickStr(params.kind)}`
      : null)
  );
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null} engine
 * @returns {string|null}
 */
function resolveSubSkill(record, params, engine) {
  return (
    pickStr(engine?.subtopic) ||
    pickStr(params.subtype) ||
    pickStr(params.patternFamily) ||
    pickStr(record.subskillId) ||
    pickStr(record.subtopicId) ||
    pickStr(record.subtopic) ||
    pickStr(params.subtopicId) ||
    null
  );
}

/**
 * @param {unknown} raw
 * @returns {"high"|"medium"|"low"|null}
 */
export function mapPhase8MetadataConfidence(raw) {
  const s = pickStr(raw);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (CONTRACT_CONFIDENCE.has(lower)) {
    return /** @type {"high"|"medium"|"low"} */ (lower);
  }
  return PHASE8_CONFIDENCE_MAP[lower] ?? "low";
}

/**
 * @param {unknown} engineQuestionType
 * @returns {"mcq"|"numeric"|"text"|null}
 */
export function mapEngineQuestionTypeToAnswerFormat(engineQuestionType) {
  const t = pickStr(engineQuestionType);
  if (!t) return null;
  return ANSWER_FORMAT_MAP[t.toLowerCase()] ?? null;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null} engine
 * @returns {string|null}
 */
function resolveDifficulty(record, params, engine) {
  const raw =
    pickStr(engine?.difficulty) ||
    pickStr(record.difficulty) ||
    pickStr(record.difficulty_level) ||
    pickStr(record.difficultyLevel) ||
    pickStr(record.level) ||
    pickStr(params.difficulty);
  return normalizeDifficultyBand(raw);
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export function normalizeDifficultyBand(raw) {
  const x = pickStr(raw);
  if (!x) return null;
  const lower = x.toLowerCase();
  if (lower === "easy" || lower === "basic" || lower === "intro" || lower === "low") return "basic";
  if (lower === "hard" || lower === "advanced" || lower === "high" || lower === "challenge") {
    return "hard";
  }
  if (lower === "medium" || lower === "standard") return "medium";
  if (lower === "basic" || lower === "medium" || lower === "hard") return lower;
  return null;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} params
 * @returns {"recall"|"simple_application"|"multi_step"|"inference"|null}
 */
export function deriveDifficultyDepth(record, params) {
  const kind = pickStr(params.kind) || "";
  if (kind.includes("multi") || kind.startsWith("wp_multi")) return "multi_step";

  const cognitive =
    pickStr(record.cognitiveLevel) ||
    pickStr(params.cognitiveLevel) ||
    null;
  if (cognitive) {
    const mapped = COGNITIVE_TO_DEPTH[cognitive.toLowerCase()];
    if (mapped) return /** @type {ReturnType<typeof deriveDifficultyDepth>} */ (mapped);
  }

  const band = pickStr(record.difficultyBand) || pickStr(params.difficultyBand);
  if (band) {
    const mapped = DIFFICULTY_BAND_TO_DEPTH[band.toLowerCase()];
    if (mapped) return /** @type {ReturnType<typeof deriveDifficultyDepth>} */ (mapped);
  }

  const probe = pickStr(params.probePower)?.toLowerCase();
  if (probe === "high") return "inference";
  if (probe === "medium") return "simple_application";
  if (probe === "low") return "recall";

  return null;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null} engine
 * @param {string|null} subject
 * @param {string|null} topic
 * @returns {string|null}
 */
export function derivePedagogicalQuestionType(record, params, engine, subject, topic) {
  const explicit =
    pickStr(record.questionType) && !["mcq", "numeric", "open", "audio", "unknown"].includes(
      String(record.questionType).toLowerCase()
    )
      ? pickStr(record.questionType)
      : null;
  if (explicit) return explicit;

  const kind = pickStr(params.kind) || pickStr(engine?.generatorKind) || "";
  if (kind.startsWith("wp_") || topic === "word_problems") return "word_problem";
  if (record.shape != null && String(record.shape).trim()) {
    return subject === "geometry" ? "diagram" : "visual";
  }
  if (record.passage != null || record.passageVisible === true) return "reading_comprehension";

  const topicKey = pickStr(topic)?.toLowerCase();
  if (topicKey && ENGLISH_TOPIC_QUESTION_TYPE[topicKey]) {
    return ENGLISH_TOPIC_QUESTION_TYPE[topicKey];
  }
  if (subject === "hebrew" && topicKey === "reading") return "reading_comprehension";

  const engineType = pickStr(engine?.questionType)?.toLowerCase();
  if (engineType === "audio") return "audio";

  if (subject === "math" || subject === "geometry" || subject === "science" || subject === "history") {
    return "technical";
  }

  return engineType === "mcq" ? "technical" : null;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {boolean}
 */
export function deriveRequiresVisual(record) {
  if (record.shape != null && String(record.shape).trim()) return true;
  if (record.requiresVisual === true) return true;
  const params = getParams(record);
  if (params.requiresVisual === true) return true;
  if (pickStr(record.subject) === "geometry" && pickStr(params.kind)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>|null} engine
 * @returns {boolean}
 */
export function deriveRequiresAudio(record, engine) {
  if (record.requiresAudio === true) return true;
  const params = getParams(record);
  if (params.requiresAudio === true) return true;
  const t =
    pickStr(record.type) ||
    pickStr(record.questionType) ||
    pickStr(engine?.questionType);
  return t != null && t.toLowerCase() === "audio";
}

/**
 * @param {string|null} skillId
 * @param {Record<string, unknown>} params
 * @returns {boolean}
 */
export function computeDiagnosticEligibleByMetadataHint(skillId, params) {
  if (!skillId) return false;
  const kind = pickStr(params.kind) || "";
  if (kind.startsWith("learning_") || kind === "book_context") return false;
  return true;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} params
 * @param {Record<string, unknown>|null} engine
 * @returns {string[]|null}
 */
function mergePossibleErrorPatterns(record, params, engine) {
  /** @type {Set<string>} */
  const tags = new Set();

  const add = (/** @type {unknown} */ v) => {
    const s = pickStr(v);
    if (s) tags.add(s);
  };

  const addArr = (/** @type {unknown} */ arr) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) add(item);
  };

  addArr(params.expectedErrorTags);
  addArr(params.expectedErrorTypes);
  addArr(record.expectedErrorTags);
  addArr(record.expectedErrorTypes);
  add(params.distractorFamily);
  add(engine?.distractorFamily);
  add(engine?.misconceptionTag);
  if (engine?.selectedAnswer && typeof engine.selectedAnswer === "object") {
    add(/** @type {Record<string, unknown>} */ (engine.selectedAnswer).distractorFamily);
  }

  return tags.size ? [...tags] : null;
}

/**
 * @param {Record<string, unknown>} obj
 */
function compactCanonical(obj) {
  /** @type {Record<string, unknown>} */
  const out = { contractVersion: obj.contractVersion };
  for (const [k, v] of Object.entries(obj)) {
    if (k === "contractVersion") continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Normalize a generator question, frozen snapshot, or answer payload fragment
 * into canonical question metadata (pure function).
 *
 * `diagnosticEligibleByMetadata` is a QA/debug hint only - it does NOT override
 * `activity-classification.js` or product `isDiagnosticEligible`.
 *
 * @param {Record<string, unknown>|null|undefined} record
 * @param {{ includeLegacy?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function normalizeQuestionMetadata(record, options = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { contractVersion: QUESTION_METADATA_CONTRACT_VERSION };
  }

  const params = getParams(record);
  const engine =
    record.questionEngine && typeof record.questionEngine === "object" && !Array.isArray(record.questionEngine)
      ? record.questionEngine
      : null;

  const subject = pickStr(record.subject);
  const topic = pickStr(record.topic);
  const grade =
    pickStr(record.grade) ||
    pickStr(record.gradeLevel) ||
    pickStr(record.grade_level);

  const skillId = resolveSkillId(record, params, engine);
  const subSkill = resolveSubSkill(record, params, engine);

  const metadataConfidence = mapPhase8MetadataConfidence(
    engine?.metadataConfidence ?? record.metadataConfidence
  );

  const canonical = compactCanonical({
    contractVersion: QUESTION_METADATA_CONTRACT_VERSION,
    subject,
    topic,
    grade,
    skillId,
    subSkill,
    questionType: derivePedagogicalQuestionType(record, params, engine, subject, topic),
    difficulty: resolveDifficulty(record, params, engine),
    difficultyDepth: deriveDifficultyDepth(record, params),
    requiresVisual: deriveRequiresVisual(record),
    requiresAudio: deriveRequiresAudio(record, engine),
    answerFormat: mapEngineQuestionTypeToAnswerFormat(engine?.questionType),
    metadataConfidence,
    diagnosticEligibleByMetadata: computeDiagnosticEligibleByMetadataHint(skillId, params),
    possibleErrorPatterns: mergePossibleErrorPatterns(record, params, engine),
    notes: pickStr(params.explanationHe) || pickStr(record.notes) || null,
  });

  if (options.includeLegacy === true) {
    canonical._legacy = {
      diagnosticSkillId: pickStr(params.diagnosticSkillId) || pickStr(record.diagnosticSkillId),
      skill_key: pickStr(record.skill_key) || pickStr(record.skillKey),
      subtopic: pickStr(record.subtopic),
      subtopicId: pickStr(record.subtopicId) || pickStr(params.subtopicId),
      subskillId: pickStr(record.subskillId),
      engineSubtopic: pickStr(engine?.subtopic),
      engineQuestionType: pickStr(engine?.questionType),
      phase8MetadataConfidence: pickStr(engine?.metadataConfidence),
      paramsKind: pickStr(params.kind),
    };
  }

  return canonical;
}
