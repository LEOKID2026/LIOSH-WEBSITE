/**
 * Subject adapters for learning-simulator question integrity (Phase 4).
 * Generators: math, geometry, hebrew, moledet_geography (utils).
 * Banks: science (declared MCQ JSON), english (declared pools — no Next page import).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");

export function modUrl(rel) {
  return pathToFileURL(join(ROOT, rel)).href;
}

export function parseGradeNum(gradeKey) {
  const n = parseInt(String(gradeKey || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(6, Math.max(1, n));
}

/** Deterministic RNG replacement for Math.random (audit-style). */
export function withSeededRandom(seed, fn) {
  const orig = Math.random;
  let s = seed >>> 0;
  Math.random = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

function hashSeed(parts) {
  let h = 2166136261;
  for (const p of parts) {
    const s = String(p ?? "");
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

let mathCache = null;
async function loadMath() {
  if (!mathCache) {
    const gen = await import(modUrl("utils/math-question-generator.js"));
    const storage = await import(modUrl("utils/math-storage.js"));
    const constants = await import(modUrl("utils/math-constants.js"));
    mathCache = {
      generateQuestion: gen.generateQuestion,
      getLevelConfig: storage.getLevelConfig,
      GRADES: constants.GRADES,
    };
  }
  return mathCache;
}

let geoCache = null;
async function loadGeometry() {
  if (!geoCache) {
    const gen = await import(modUrl("utils/geometry-question-generator.js"));
    const constants = await import(modUrl("utils/geometry-constants.js"));
    geoCache = {
      generateQuestion: gen.generateQuestion,
      GRADES: constants.GRADES,
      LEVELS: constants.LEVELS,
    };
  }
  return geoCache;
}

let hebrewCache = null;
async function loadHebrew() {
  if (!hebrewCache) {
    const gen = await import(modUrl("utils/hebrew-question-generator.js"));
    const storage = await import(modUrl("utils/hebrew-storage.js"));
    const constants = await import(modUrl("utils/hebrew-constants.js"));
    hebrewCache = {
      generateQuestion: gen.generateQuestion,
      getLevelConfig: storage.getLevelConfig,
      GRADES: constants.GRADES,
    };
  }
  return hebrewCache;
}

let moledetCache = null;
async function loadMoledet() {
  if (!moledetCache) {
    const gen = await import(modUrl("utils/moledet-geography-question-generator.js"));
    const storage = await import(modUrl("utils/moledet-geography-storage.js"));
    const constants = await import(modUrl("utils/moledet-geography-constants.js"));
    moledetCache = {
      generateQuestion: gen.generateQuestion,
      getLevelConfig: storage.getLevelConfig,
      GRADES: constants.GRADES,
    };
  }
  return moledetCache;
}

let moledetBankCache = null;
async function loadMoledetBank() {
  if (!moledetBankCache) {
    const mod = await import(modUrl("data/geography-questions/index.js"));
    const src = mod && typeof mod === "object" ? mod : {};
    const base = src.default && typeof src.default === "object" ? src.default : {};
    const pick = (name) => src[name] ?? base[name] ?? null;
    moledetBankCache = {
      G2_EASY_QUESTIONS: pick("G2_EASY_QUESTIONS"),
      G2_MEDIUM_QUESTIONS: pick("G2_MEDIUM_QUESTIONS"),
      G2_HARD_QUESTIONS: pick("G2_HARD_QUESTIONS"),
      G3_EASY_QUESTIONS: pick("G3_EASY_QUESTIONS"),
      G3_MEDIUM_QUESTIONS: pick("G3_MEDIUM_QUESTIONS"),
      G3_HARD_QUESTIONS: pick("G3_HARD_QUESTIONS"),
      G4_EASY_QUESTIONS: pick("G4_EASY_QUESTIONS"),
      G4_MEDIUM_QUESTIONS: pick("G4_MEDIUM_QUESTIONS"),
      G4_HARD_QUESTIONS: pick("G4_HARD_QUESTIONS"),
      G5_EASY_QUESTIONS: pick("G5_EASY_QUESTIONS"),
      G5_MEDIUM_QUESTIONS: pick("G5_MEDIUM_QUESTIONS"),
      G5_HARD_QUESTIONS: pick("G5_HARD_QUESTIONS"),
      G6_EASY_QUESTIONS: pick("G6_EASY_QUESTIONS"),
      G6_MEDIUM_QUESTIONS: pick("G6_MEDIUM_QUESTIONS"),
      G6_HARD_QUESTIONS: pick("G6_HARD_QUESTIONS"),
    };
  }
  return moledetBankCache;
}

function pickMoledetBankRows(bank, grade, level, topic) {
  const key = `${String(grade).toUpperCase()}_${String(level).toUpperCase()}_QUESTIONS`;
  const gradeLevel = bank[key];
  if (!gradeLevel || typeof gradeLevel !== "object") return [];
  const rows = gradeLevel[topic];
  return Array.isArray(rows) ? rows : [];
}

function normalizeMoledetBankRow(row, topic) {
  if (!row || typeof row !== "object") return null;
  const answers = Array.isArray(row.answers)
    ? [...row.answers]
    : Array.isArray(row.options)
      ? [...row.options]
      : null;
  if (!answers || answers.length < 2) return null;
  const ciRaw =
    Number.isFinite(Number(row.correctIndex)) && Number(row.correctIndex) >= 0
      ? Number(row.correctIndex)
      : Number.isFinite(Number(row.correct)) && Number(row.correct) >= 0
        ? Number(row.correct)
        : 0;
  const ci = ciRaw >= 0 && ciRaw < answers.length ? ciRaw : 0;
  const correctAnswer = answers[ci];
  return {
    question: String(row.question || row.stem || row.exerciseText || ""),
    exerciseText: String(row.exerciseText || row.question || row.stem || ""),
    answers,
    correctAnswer,
    correctIndex: ci,
    topic,
    operation: topic,
    params: row.params && typeof row.params === "object" ? row.params : {},
  };
}

let scienceBankCache = null;
async function loadScienceBank() {
  if (!scienceBankCache) {
    const a = await import(modUrl("data/science-questions.js"));
    scienceBankCache = a.SCIENCE_QUESTIONS || [];
  }
  return scienceBankCache;
}

let englishPoolsCache = null;
async function loadEnglishPools() {
  if (!englishPoolsCache) {
    const g = await import(modUrl("data/english-questions/grammar-pools.js"));
    const s = await import(modUrl("data/english-questions/sentence-pools.js"));
    const t = await import(modUrl("data/english-questions/translation-pools.js"));
    englishPoolsCache = {
      grammar: g.GRAMMAR_POOLS,
      sentences: s.SENTENCE_POOLS,
      translation: t.TRANSLATION_POOLS,
    };
  }
  return englishPoolsCache;
}

const LEVEL_RANK = { easy: 0, medium: 1, hard: 2 };

function englishFlattenPools(poolRoot) {
  const out = [];
  if (!poolRoot || typeof poolRoot !== "object") return out;
  for (const arr of Object.values(poolRoot)) {
    if (Array.isArray(arr)) out.push(...arr);
  }
  return out;
}

export function englishItemsForMatrixTopic(topic, pools) {
  const t = String(topic || "").toLowerCase();
  if (t === "grammar") return englishFlattenPools(pools.grammar);
  if (t === "sentences") return englishFlattenPools(pools.sentences);
  if (t === "translation") return englishFlattenPools(pools.translation);
  if (t === "vocabulary" || t === "writing") {
    const tr = englishFlattenPools(pools.translation);
    const se = englishFlattenPools(pools.sentences);
    return [...tr, ...se];
  }
  return [];
}

export function filterEnglishByGrade(items, gNum) {
  return items.filter((it) => {
    const lo = Number(it.minGrade);
    const hi = Number(it.maxGrade);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return true;
    return gNum >= lo && gNum <= hi;
  });
}

/** Translation flashcards (en/he only) are not MCQ — exclude from bank integrity. */
export function isEnglishMcqLike(it) {
  if (!it || typeof it !== "object") return false;
  const stem = it.question ?? it.template ?? "";
  const opts = it.options ?? it.answers;
  return String(stem).trim().length >= 2 && Array.isArray(opts) && opts.length >= 2;
}

function pickEnglishBankItem(items, seed) {
  if (!items.length) return null;
  const idx = seed % items.length;
  return { item: items[idx], index: idx };
}

/**
 * Normalize english pool row to generic question shape for integrity checks.
 */
export function normalizeEnglishBankItem(item) {
  if (!item || typeof item !== "object") return null;
  const stem = item.question || item.template || item.stem || "";
  const answers = item.options || item.answers;
  const correct = item.correct ?? item.correctAnswer;
  return {
    question: stem,
    correctAnswer: correct,
    answers,
    options: answers,
    params: {
      kind: "english_bank",
      patternFamily: item.patternFamily,
      source: "english-questions-pools",
    },
    _englishBank: true,
  };
}

/**
 * @param {{ grade: string, subjectCanonical: string, level: string, topic: string }} cell
 * @param {number} sampleIndex
 */
export async function generateForMatrixCell(cell, sampleIndex = 0) {
  const { grade, subjectCanonical, level, topic } = cell;
  const seed = hashSeed([grade, subjectCanonical, level, topic, sampleIndex, "v4"]);
  const gNum = parseGradeNum(grade);

  if (topic === "mixed") {
    return {
      ok: false,
      mode: "none",
      unsupported: true,
      reason: "topic `mixed` is intentionally multi-topic — not a single integrity cell",
      raw: null,
    };
  }

  if (subjectCanonical === "math") {
    const m = await loadMath();
    const ops = (m.GRADES[grade]?.operations || []).filter((o) => o !== "mixed");
    if (!ops.includes(topic)) {
      return {
        ok: false,
        mode: "generator",
        unsupported: true,
        reason: `math operation "${topic}" not in curriculum operations for ${grade}`,
        raw: null,
      };
    }
    const lc = m.getLevelConfig(gNum, level);
    return withSeededRandom(seed, () => {
      try {
        const q = m.generateQuestion(lc, topic, grade, null);
        return { ok: true, mode: "generator", unsupported: false, raw: q, seed };
      } catch (e) {
        return { ok: false, mode: "generator", unsupported: false, error: String(e?.message || e), raw: null, seed };
      }
    });
  }

  if (subjectCanonical === "geometry") {
    const g = await loadGeometry();
    const topics = (g.GRADES[grade]?.topics || []).filter((t) => t !== "mixed");
    if (!topics.includes(topic)) {
      return {
        ok: false,
        mode: "generator",
        unsupported: true,
        reason: `geometry topic "${topic}" not available for ${grade}`,
        raw: null,
      };
    }
    const levObj = g.LEVELS[level];
    if (!levObj) {
      return { ok: false, mode: "generator", unsupported: true, reason: `unknown geometry level ${level}`, raw: null };
    }
    return withSeededRandom(seed, () => {
      try {
        const q = g.generateQuestion(levObj, topic, grade, null);
        return { ok: true, mode: "generator", unsupported: false, raw: q, seed };
      } catch (e) {
        return { ok: false, mode: "generator", unsupported: false, error: String(e?.message || e), raw: null, seed };
      }
    });
  }

  if (subjectCanonical === "hebrew") {
    const h = await loadHebrew();
    const topics = h.GRADES[grade]?.topics || [];
    if (!topics.includes(topic)) {
      return {
        ok: false,
        mode: "generator",
        unsupported: true,
        reason: `hebrew topic "${topic}" not listed for ${grade}`,
        raw: null,
      };
    }
    const lc = h.getLevelConfig(gNum, level);
    return withSeededRandom(seed, () => {
      try {
        const q = h.generateQuestion(lc, topic, grade, null);
        return { ok: true, mode: "generator", unsupported: false, raw: q, seed };
      } catch (e) {
        return { ok: false, mode: "generator", unsupported: false, error: String(e?.message || e), raw: null, seed };
      }
    });
  }

  if (subjectCanonical === "moledet_geography") {
    const { isMoledetGeographyGradeAllowed } = await import(
      modUrl("utils/moledet-geography-curriculum-gates.js")
    );
    if (!isMoledetGeographyGradeAllowed(grade)) {
      return {
        ok: false,
        mode: "generator",
        unsupported: true,
        reason: `moledet_geography grade "${grade}" is enrichment-only (launch band G2–G6)`,
        raw: null,
      };
    }
    const mg = await loadMoledet();
    const moledetBank = await loadMoledetBank();
    const topics = mg.GRADES[grade]?.topics || [];
    if (!topics.includes(topic)) {
      return {
        ok: false,
        mode: "generator",
        unsupported: true,
        reason: `moledet_geography topic "${topic}" not listed for ${grade}`,
        raw: null,
      };
    }
    const lc = mg.getLevelConfig(gNum, level);
    return withSeededRandom(seed, () => {
      try {
        const q = mg.generateQuestion(lc, topic, grade, null);
        if (q?.emptyPool && q?.params?.poolFallbackCode === "empty_pool") {
          const bank = moledetBank;
          if (bank) {
            const rows = pickMoledetBankRows(bank, grade, level, topic);
            if (rows.length) {
              const picked = rows[seed % rows.length];
              const normalized = normalizeMoledetBankRow(picked, topic);
              if (normalized) {
                return {
                  ok: true,
                  mode: "bank",
                  unsupported: false,
                  raw: normalized,
                  seed,
                  meta: {
                    poolCount: rows.length,
                    levelNote: "moledet bank fallback used when generator returned empty_pool under QA runtime",
                  },
                };
              }
            }
          }
        }
        return {
          ok: true,
          mode: "generator",
          unsupported: false,
          raw: q,
          seed,
          meta: {
            poolFallbackCode: q?.params?.poolFallbackCode,
            resolvedTopic: q?.topic || q?.operation,
          },
        };
      } catch (e) {
        return { ok: false, mode: "generator", unsupported: false, error: String(e?.message || e), raw: null, seed };
      }
    });
  }

  if (subjectCanonical === "science") {
    const bank = await loadScienceBank();
    const reqRank = LEVEL_RANK[level] ?? 0;
    const candidates = bank.filter((q) => {
      if (String(q.topic) !== String(topic)) return false;
      if (!Array.isArray(q.grades) || !q.grades.includes(grade)) return false;
      const lo = LEVEL_RANK[String(q.minLevel || "easy")] ?? 0;
      const hi = LEVEL_RANK[String(q.maxLevel || "hard")] ?? 2;
      return reqRank >= lo && reqRank <= hi;
    });
    if (!candidates.length) {
      return {
        ok: false,
        mode: "bank",
        unsupported: true,
        reason: "no science MCQ bank items matched grade/topic/level band",
        raw: null,
      };
    }
    const pick = candidates[seed % candidates.length];
    const normalized = {
      question: pick.stem,
      correctAnswer: pick.options?.[pick.correctIndex],
      answers: pick.options,
      options: pick.options,
      params: pick.params || {},
      explanation: pick.explanation,
      _scienceBankId: pick.id,
    };
    return { ok: true, mode: "bank", unsupported: false, raw: normalized, seed, meta: { bankSize: candidates.length } };
  }

  if (subjectCanonical === "english") {
    const pools = await loadEnglishPools();
    const items = filterEnglishByGrade(englishItemsForMatrixTopic(topic, pools), gNum).filter(isEnglishMcqLike);
    if (!items.length) {
      return {
        ok: false,
        mode: "bank",
        unsupported: true,
        reason: `no MCQ-shaped english pool rows for topic "${topic}" and ${grade} (translation flashcards excluded)`,
        raw: null,
      };
    }
    const picked = pickEnglishBankItem(items, seed);
    const raw = normalizeEnglishBankItem(picked.item);
    if (!raw) {
      return { ok: false, mode: "bank", unsupported: false, error: "normalizeEnglishBankItem failed", raw: null };
    }
    return {
      ok: true,
      mode: "bank",
      unsupported: false,
      raw,
      seed,
      meta: { poolIndex: picked.index, poolCount: items.length, levelNote: "english pools encode grade; difficulty tier may not match matrix level exactly" },
    };
  }

  return {
    ok: false,
    mode: "none",
    unsupported: true,
    reason: `subject "${subjectCanonical}" has no adapter`,
    raw: null,
  };
}

export const SUPPORTED_SUBJECTS = ["math", "geometry", "science", "english", "hebrew", "moledet_geography"];
