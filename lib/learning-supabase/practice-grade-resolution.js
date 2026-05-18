/**
 * Practice vs registered grade — single source for learning writes and parent-report aggregation.
 */

import { normalizeGradeLevelToKey } from "../learning-student-defaults.js";

const GRADE_ORDER = Object.freeze(["g1", "g2", "g3", "g4", "g5", "g6"]);

/** @param {unknown} value */
export function normalizePracticeGradeKey(value) {
  return normalizeGradeLevelToKey(value) || null;
}

/** @param {string|null|undefined} key */
function gradeIndex(key) {
  const k = normalizePracticeGradeKey(key);
  if (!k) return -1;
  return GRADE_ORDER.indexOf(k);
}

/**
 * @param {string|null|undefined} registeredKey
 * @param {string|null|undefined} contentKey
 * @returns {"same"|"lower"|"higher"|"unknown"}
 */
export function practiceGradeRelation(registeredKey, contentKey) {
  const reg = normalizePracticeGradeKey(registeredKey);
  const act = normalizePracticeGradeKey(contentKey);
  if (!act) return "unknown";
  if (!reg) return "unknown";
  const ri = gradeIndex(reg);
  const ai = gradeIndex(act);
  if (ri < 0 || ai < 0) return "unknown";
  if (ai === ri) return "same";
  if (ai < ri) return "lower";
  return "higher";
}

/**
 * @param {Record<string, unknown>|null|undefined} obj
 * @param {string[]} fieldNames
 */
function firstGradeFromObject(obj, fieldNames) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  for (const name of fieldNames) {
    const key = normalizePracticeGradeKey(obj[name]);
    if (key) return key;
  }
  return null;
}

/**
 * Prefer explicit content/practice fields; avoid treating profile-only `gradeLevel` as content evidence.
 * @param {Record<string, unknown>|null|undefined} payload
 * @param {Record<string, unknown>|null|undefined} sessionMeta
 * @param {string|null|undefined} registeredGradeKey
 */
export function resolveContentGradeFromAnswerPayload(payload, sessionMeta, registeredGradeKey) {
  const reg = normalizePracticeGradeKey(registeredGradeKey);
  const fromPayload = firstGradeFromObject(payload, [
    "contentGradeLevel",
    "contentGrade",
    "practiceGradeLevel",
    "practiceGrade",
    "questionGradeLevel",
    "questionGrade",
  ]);
  if (fromPayload) return fromPayload;

  const clientMeta =
    payload?.clientMeta && typeof payload.clientMeta === "object" && !Array.isArray(payload.clientMeta)
      ? payload.clientMeta
      : null;
  const fromClientMeta = firstGradeFromObject(clientMeta, [
    "contentGradeLevel",
    "contentGrade",
    "gradeKey",
    "grade",
    "gradeLevel",
  ]);
  if (fromClientMeta) return fromClientMeta;

  const sessionContent = resolveContentGradeFromSessionMetadata(sessionMeta, reg);
  if (sessionContent) return sessionContent;

  const legacyGradeLevel = normalizePracticeGradeKey(payload?.gradeLevel);
  if (legacyGradeLevel && reg && legacyGradeLevel !== reg) return legacyGradeLevel;

  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} sessionMeta
 * @param {string|null|undefined} registeredGradeKey
 */
export function resolveContentGradeFromSessionMetadata(sessionMeta, registeredGradeKey) {
  const reg = normalizePracticeGradeKey(registeredGradeKey);
  const fromMeta = firstGradeFromObject(sessionMeta, [
    "contentGradeLevel",
    "contentGrade",
    "practiceGradeLevel",
    "practiceGrade",
    "clientReportedGradeLevel",
  ]);
  if (fromMeta) return fromMeta;

  const metaGrade = normalizePracticeGradeKey(sessionMeta?.gradeLevel);
  if (metaGrade && reg && metaGrade !== reg) return metaGrade;

  return null;
}

/**
 * @param {string|null|undefined} clientGradeHint
 * @param {string|null|undefined} registeredGradeKey
 */
export function resolveContentGradeForSessionWrite(clientGradeHint, registeredGradeKey) {
  const reg = normalizePracticeGradeKey(registeredGradeKey);
  const client = normalizePracticeGradeKey(clientGradeHint);
  if (client) return client;
  return reg;
}

/**
 * @param {string|null|undefined} registeredGradeKey
 * @param {string|null|undefined} contentGradeKey
 */
export function buildGradeEvidenceFields(registeredGradeKey, contentGradeKey) {
  const registeredGradeLevel = normalizePracticeGradeKey(registeredGradeKey);
  const contentGradeLevel = normalizePracticeGradeKey(contentGradeKey);
  const gradeRelation = practiceGradeRelation(registeredGradeLevel, contentGradeLevel);
  return {
    registeredGradeLevel,
    contentGradeLevel,
    gradeRelation,
    gradeDelta:
      gradeRelation === "same"
        ? 0
        : gradeRelation === "lower"
        ? -1
        : gradeRelation === "higher"
        ? 1
        : null,
  };
}
