/**
 * Ensure normal MCQ rows expose exactly four unique child-visible options.
 * Used at generator output / student-display sanitization — not UI copy.
 */
import { isComparisonSignMcq } from "./comparison-sign-mcq.js";
import { normalizeOptionForCompare } from "./question-quality.js";

export const NORMAL_MCQ_OPTION_COUNT = 4;

/** @param {string[]} arr */
function shuffleMcqOptions(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const GEOMETRY_HEBREW_LABEL_KINDS = new Set([
  "parallel_perpendicular",
  "triangles",
  "transformations",
  "concept_transform",
  "shapes_basic_square",
  "shapes_basic_rectangle",
  "shapes_basic_properties_square",
  "shapes_basic_properties_rectangle",
  "shapes_basic_properties_angles",
]);

const GEOMETRY_INDEX_LABEL_KINDS = new Set([
  "quadrilaterals",
  "solids",
]);

const ENGLISH_GRAMMAR_FALLBACK = [
  "am",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
];

const HEBREW_FALLBACK_DISTRACTORS = [
  "לא תמיד",
  "רק לפעמים",
  "בדרך כלל לא",
  "תלוי במצב",
  "אפשר גם אחרת",
  "לא בהכרח",
  "לעיתים קרובות",
  "לרוב לא",
];

/** @param {unknown} q */
function readAnswers(q) {
  const raw = Array.isArray(q?.answers)
    ? q.answers
    : Array.isArray(q?.options)
      ? q.options
      : Array.isArray(q?.choices)
        ? q.choices
        : [];
  return raw.map((a) => String(a ?? "").trim()).filter(Boolean);
}

/** @param {string[]} answers */
function uniqueAnswerKeys(answers) {
  const keys = answers.map((a) => normalizeOptionForCompare(a)).filter(Boolean);
  return new Set(keys);
}

/** @param {unknown} q */
export function isGeometryVariableLabelMcq(q) {
  const params = q?.params && typeof q.params === "object" ? q.params : {};
  const baseKind = String(params.kind || "").replace(/^story_/, "");
  if (GEOMETRY_HEBREW_LABEL_KINDS.has(baseKind)) return true;
  if (GEOMETRY_INDEX_LABEL_KINDS.has(baseKind)) return true;
  return false;
}

/** @param {unknown} q */
export function shouldEnforceFourMcqOptions(q) {
  if (!q || typeof q !== "object") return false;
  const answers = readAnswers(q);
  if (answers.length === 0) return false;

  const params = q.params && typeof q.params === "object" ? q.params : {};
  const mode = String(params.answerMode ?? q.answerMode ?? q.qType ?? "").toLowerCase();
  if (mode === "typing" || mode === "numeric" || mode === "text" || mode === "open") return false;
  if (params.kind === "empty_pool" || params.patternFamily === "no_questions") return false;

  if (isGeometryVariableLabelMcq(q)) return false;
  if (isComparisonSignMcq(q)) return false;

  return true;
}

/** @param {string} correct @param {Set<string>} usedKeys @param {string[]} pool */
function pickFromPool(correct, usedKeys, pool) {
  const correctKey = normalizeOptionForCompare(correct);
  for (const cand of pool) {
    const text = String(cand ?? "").trim();
    if (!text) continue;
    const key = normalizeOptionForCompare(text);
    if (!key || key === correctKey || usedKeys.has(key)) continue;
    return text;
  }
  return null;
}

/** @param {string} correct @param {Set<string>} usedKeys */
function synthesizeEnglishDistractor(correct, usedKeys) {
  const fromGrammar = pickFromPool(correct, usedKeys, ENGLISH_GRAMMAR_FALLBACK);
  if (fromGrammar) return fromGrammar;

  const ca = String(correct ?? "").trim();
  if (!ca) return null;
  const variants = [
    `${ca}s`,
    `${ca}ed`,
    `${ca}ing`,
    `will ${ca}`,
    `did ${ca}`,
    `doesn't ${ca}`,
    `don't ${ca}`,
    `${ca}n't`,
  ];
  return pickFromPool(correct, usedKeys, variants);
}

/** @param {string} correct @param {Set<string>} usedKeys @param {{ subject?: string }} ctx */
function synthesizeDistractor(correct, usedKeys, ctx = {}) {
  const subject = String(ctx.subject || "").toLowerCase();
  if (subject === "english" || subject === "eng") {
    const en = synthesizeEnglishDistractor(correct, usedKeys);
    if (en) return en;
  }
  const he = pickFromPool(correct, usedKeys, HEBREW_FALLBACK_DISTRACTORS);
  if (he) return he;

  const ca = String(correct ?? "").trim();
  if (!ca) return null;
  const numeric = Number(ca);
  if (Number.isFinite(numeric)) {
    for (const delta of [1, 2, 3, 5, 10, -1, -2]) {
      const cand = String(numeric + delta);
      const key = normalizeOptionForCompare(cand);
      if (key && key !== normalizeOptionForCompare(correct) && !usedKeys.has(key)) {
        return cand;
      }
    }
  }

  const suffixes = [" (לא)", " - אחר", " - לא", " · א", " · ב"];
  for (const suf of suffixes) {
    const cand = `${ca}${suf}`;
    const key = normalizeOptionForCompare(cand);
    if (key && !usedKeys.has(key)) return cand;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} q
 * @param {{ subject?: string, fallbackPool?: string[] }} [ctx]
 */
export function ensureMcqFourOptions(q, ctx = {}) {
  if (!q || typeof q !== "object") return q;
  if (!shouldEnforceFourMcqOptions(q)) return q;

  let answers = readAnswers(q);
  if (answers.length === 0) return q;

  let ci =
    Number.isFinite(Number(q.correctIndex)) && Number(q.correctIndex) >= 0
      ? Number(q.correctIndex)
      : Number.isFinite(Number(q.correct)) && Number(q.correct) >= 0
        ? Number(q.correct)
        : -1;
  let correct =
    q.correctAnswer != null && String(q.correctAnswer).trim()
      ? String(q.correctAnswer).trim()
      : ci >= 0 && ci < answers.length
        ? answers[ci]
        : answers[0];

  // Niqqud codepoints — used for a lighter key that preserves punctuation.
  const NIQQUD_RE_LOCAL = /[\u0591-\u05C7]/g;

  /** @type {string[]} */
  const deduped = [];
  const usedKeys = new Set();
  const pushUnique = (text) => {
    const t = String(text ?? "").trim();
    if (!t) return false;
    // Use a lightweight key: lowercase + strip niqqud + collapse whitespace.
    // We intentionally do NOT strip punctuation from edges (unlike normalizeOptionForCompare)
    // because MCQ options that differ only in punctuation (e.g. "היום חם." vs "היום חם?"
    // vs "היום חם" in a grammar question) are semantically distinct and must all be kept.
    // For purely-punctuation options such as "." or "?" we fall back to the raw lowercase
    // text so they are never silently dropped.
    const lightKey = t.toLowerCase().replace(NIQQUD_RE_LOCAL, "").replace(/\s+/g, " ");
    const key = lightKey || t.toLowerCase();
    if (usedKeys.has(key)) return false;
    usedKeys.add(key);
    deduped.push(t);
    return true;
  };

  pushUnique(correct);
  for (let i = 0; i < answers.length; i++) {
    if (i === ci) continue;
    pushUnique(answers[i]);
  }
  for (let i = 0; i < answers.length; i++) {
    pushUnique(answers[i]);
  }

  const fallbackPool = Array.isArray(ctx.fallbackPool) ? ctx.fallbackPool : [];
  let guard = 0;
  while (deduped.length < NORMAL_MCQ_OPTION_COUNT && guard < 80) {
    guard += 1;
    const fromPool = pickFromPool(correct, usedKeys, fallbackPool);
    if (fromPool && pushUnique(fromPool)) continue;
    const synth = synthesizeDistractor(correct, usedKeys, ctx);
    if (synth && pushUnique(synth)) continue;
    break;
  }

  if (deduped.length > NORMAL_MCQ_OPTION_COUNT) {
    const correctKey = normalizeOptionForCompare(correct);
    const kept = deduped.filter((a, idx) => {
      if (normalizeOptionForCompare(a) === correctKey) return true;
      return idx < NORMAL_MCQ_OPTION_COUNT;
    });
    while (kept.length > NORMAL_MCQ_OPTION_COUNT) {
      for (let i = kept.length - 1; i >= 0; i--) {
        if (normalizeOptionForCompare(kept[i]) !== correctKey) {
          kept.splice(i, 1);
          if (kept.length <= NORMAL_MCQ_OPTION_COUNT) break;
        }
      }
    }
    answers = kept.slice(0, NORMAL_MCQ_OPTION_COUNT);
  } else {
    answers = deduped;
  }

  if (answers.length !== NORMAL_MCQ_OPTION_COUNT) return q;

  answers = shuffleMcqOptions(answers);

  // Use the same lighter key as pushUnique so that punctuation-distinguishing options
  // (e.g. "שלי?" vs "שלי.") are not accidentally conflated when locating the correct answer.
  const correctLightKey = (correct.toLowerCase().replace(NIQQUD_RE_LOCAL, "").replace(/\s+/g, " ")) || correct.toLowerCase();
  const newIdx = answers.findIndex((a) => {
    const ak = (a.toLowerCase().replace(NIQQUD_RE_LOCAL, "").replace(/\s+/g, " ")) || a.toLowerCase();
    return ak === correctLightKey;
  });
  const out = { ...q };
  out.answers = answers;
  if (Array.isArray(q.options)) out.options = answers;
  if (Array.isArray(q.choices)) out.choices = answers;
  out.correctAnswer = newIdx >= 0 ? answers[newIdx] : correct;
  if (q.correct != null) out.correct = newIdx >= 0 ? newIdx : q.correct;
  if (q.correctIndex != null) out.correctIndex = newIdx >= 0 ? newIdx : q.correctIndex;
  if (out.params && typeof out.params === "object") {
    out.params = { ...out.params, optionCount: NORMAL_MCQ_OPTION_COUNT };
  }
  return out;
}
