/**
 * English pool taxonomy allowlists built from static banks (no scanner import — avoids circular deps).
 * Keep walking / effective-id logic aligned with `question-metadata-scanner.js`.
 */
import * as grammarPoolsMod from "../../data/english-questions/grammar-pools.js";
import * as translationPoolsMod from "../../data/english-questions/translation-pools.js";
import * as sentencePoolsMod from "../../data/english-questions/sentence-pools.js";
import { resolveModuleExport } from "../resolve-module-export.js";

const GRAMMAR_POOLS = resolveModuleExport(grammarPoolsMod, "GRAMMAR_POOLS");
const TRANSLATION_POOLS = resolveModuleExport(translationPoolsMod, "TRANSLATION_POOLS");
const SENTENCE_POOLS = resolveModuleExport(sentencePoolsMod, "SENTENCE_POOLS");

function isPlainObject(o) {
  return o !== null && typeof o === "object" && !Array.isArray(o);
}

/** @param {unknown} q */
function looksLikeQuestionRow(q) {
  if (!isPlainObject(q)) return false;
  const hasStem = !!(q.question || q.stem || q.prompt || q.template);
  const hasChoice =
    Array.isArray(q.answers) ||
    Array.isArray(q.options) ||
    q.correct !== undefined ||
    q.correctIndex !== undefined ||
    q.correctAnswer !== undefined;
  return hasStem && hasChoice;
}

function pickStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/** @param {Record<string, unknown>} q */
function extractParams(q) {
  const p = q.params;
  return isPlainObject(p) ? /** @type {Record<string, unknown>} */ (p) : {};
}

/** @param {Record<string, unknown>} q */
function effectiveSkillId(q, params) {
  return (
    pickStr(q.diagnosticSkillId) ||
    pickStr(q.skillId) ||
    pickStr(params.diagnosticSkillId) ||
    pickStr(params.skillId) ||
    pickStr(q.conceptTag) ||
    pickStr(params.conceptTag) ||
    pickStr(q.patternFamily) ||
    pickStr(params.patternFamily) ||
    pickStr(q.topic) ||
    ""
  );
}

/** @param {Record<string, unknown>} q */
function effectiveSubskillId(q, params) {
  return (
    pickStr(q.subtype) ||
    pickStr(params.subtype) ||
    pickStr(q.patternFamily) ||
    pickStr(params.patternFamily) ||
    pickStr(q.conceptTag) ||
    pickStr(params.conceptTag) ||
    ""
  );
}

/**
 * @param {unknown} val
 * @param {string} pathPrefix
 * @param {string} poolBucketKey - inner pool id (e.g. `be_basic`) for taxonomy allowlist
 * @param {(q: Record<string, unknown>, poolBucketKey: string) => void} onRow
 */
function walkPoolQuestionRows(val, pathPrefix, poolBucketKey, onRow) {
  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i += 1) {
      const el = val[i];
      if (looksLikeQuestionRow(el)) {
        onRow(/** @type {Record<string, unknown>} */ (el), poolBucketKey);
      } else if (isPlainObject(el) && !looksLikeQuestionRow(el)) {
        walkPoolQuestionRows(el, `${pathPrefix}[${i}]`, poolBucketKey, onRow);
      }
    }
    return;
  }
  if (!isPlainObject(val)) return;

  const values = Object.values(val);
  const allArrays = values.length > 0 && values.every((v) => Array.isArray(v));
  if (allArrays) {
    for (const k of Object.keys(val)) {
      const arr = val[k];
      walkPoolQuestionRows(arr, `${pathPrefix}.${k}`, k, onRow);
    }
    return;
  }

  if (looksLikeQuestionRow(val)) {
    onRow(/** @type {Record<string, unknown>} */ (val), poolBucketKey);
  }
}

function buildEnglishSubskillAllowlist() {
  /** @type {Record<string, Set<string>>} */
  const m = {};

  /** @param {Record<string, unknown>} q */
  function collect(q, poolBucketKey) {
    const params = extractParams(q);
    const sk = effectiveSkillId(q, params);
    const sub = effectiveSubskillId(q, params);
    if (!sk) return;
    if (!m[sk]) m[sk] = new Set();
    if (sub) m[sk].add(sub);
    if (poolBucketKey) m[sk].add(poolBucketKey);
  }

  walkPoolQuestionRows(GRAMMAR_POOLS, "GRAMMAR_POOLS", "", collect);
  walkPoolQuestionRows(TRANSLATION_POOLS, "TRANSLATION_POOLS", "", collect);
  walkPoolQuestionRows(SENTENCE_POOLS, "SENTENCE_POOLS", "", collect);

  return m;
}

export const ENGLISH_SUBSKILL_ALLOWLIST_BY_SKILL = buildEnglishSubskillAllowlist();

/** Skill ids observed from English static pools (scanner-effective ids). */
export const ENGLISH_SKILL_IDS = new Set(Object.keys(ENGLISH_SUBSKILL_ALLOWLIST_BY_SKILL));
