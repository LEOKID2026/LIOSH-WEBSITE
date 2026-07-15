/**
 * Mixed-practice topic subset for printable worksheets (parent hub).
 * @module lib/worksheets/worksheet-mixed-topics
 */

import { worksheetTopicOptionsForGrade } from "./worksheet-topic-options.js";
import { listGeometryMixedPoolTopics } from "./worksheet-geometry-allowlist.js";
import { listHebrewTopicsForGrade } from "./worksheet-hebrew-allowlist.js";
import { listEnglishTopicsForGrade } from "./worksheet-english-allowlist.js";
import { listMixedPracticeSlotsForGrade } from "./worksheet-math-practice-format.js";
import { GRADES as MATH_GRADES } from "../../utils/math-constants.js";

/** @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId */

/**
 * Hebrew-labeled concrete topics available for mixed (never includes "mixed").
 * @param {WorksheetSubjectId|string} subjectId
 * @param {string} gradeKey
 * @returns {{ key: string, label: string }[]}
 */
export function listWorksheetMixedTopicOptions(subjectId, gradeKey) {
  return worksheetTopicOptionsForGrade(subjectId, gradeKey).filter(
    (t) => t.key && t.key !== "mixed"
  );
}

/**
 * Full mixed pool keys for a subject/grade (concrete topics only).
 * @param {WorksheetSubjectId|string} subjectId
 * @param {string} gradeKey
 * @returns {string[]}
 */
export function listWorksheetMixedPoolTopicKeys(subjectId, gradeKey) {
  const sid = String(subjectId || "");
  if (sid === "geometry") return listGeometryMixedPoolTopics(gradeKey);
  if (sid === "hebrew") {
    return listHebrewTopicsForGrade(gradeKey).filter((t) => t && t !== "mixed");
  }
  if (sid === "english") {
    return listEnglishTopicsForGrade(gradeKey).filter((t) => t && t !== "mixed");
  }
  if (sid === "math") {
    const gradeOps = new Set(MATH_GRADES[gradeKey]?.operations || []);
    /** @type {string[]} */
    const keys = [];
    const seen = new Set();
    for (const slot of listMixedPracticeSlotsForGrade(gradeKey)) {
      if (!gradeOps.has(slot.topicKey) || seen.has(slot.topicKey)) continue;
      seen.add(slot.topicKey);
      keys.push(slot.topicKey);
    }
    return keys;
  }
  return listWorksheetMixedTopicOptions(sid, gradeKey).map((t) => t.key);
}

/**
 * Normalize optional mixedTopicKeys from client.
 * - undefined/null → null (means: use full pool, legacy mixed)
 * - empty / no intersection → MIXED_TOPICS_EMPTY
 * - all pool topics → null (identical to legacy mixed)
 * - otherwise → unique intersection with grade pool
 *
 * @param {WorksheetSubjectId|string} subjectId
 * @param {string} gradeKey
 * @param {unknown} rawKeys
 * @returns {{ ok: true, mixedTopicKeys: string[] | null } | { ok: false, error: string }}
 */
export function normalizeWorksheetMixedTopicKeys(subjectId, gradeKey, rawKeys) {
  if (rawKeys === undefined || rawKeys === null) {
    return { ok: true, mixedTopicKeys: null };
  }
  if (!Array.isArray(rawKeys)) {
    return { ok: false, error: "INVALID_MIXED_TOPIC_KEYS" };
  }
  if (rawKeys.length === 0) {
    return { ok: false, error: "MIXED_TOPICS_EMPTY" };
  }

  const pool = listWorksheetMixedPoolTopicKeys(subjectId, gradeKey);
  const poolSet = new Set(pool);
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const raw of rawKeys) {
    const key = String(raw || "")
      .trim()
      .toLowerCase();
    if (!key || key === "mixed" || seen.has(key) || !poolSet.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  if (!out.length) {
    return { ok: false, error: "MIXED_TOPICS_EMPTY" };
  }

  if (out.length === poolSet.size) {
    return { ok: true, mixedTopicKeys: null };
  }
  return { ok: true, mixedTopicKeys: out };
}

/**
 * Filter a concrete mixed pool by optional selection.
 * @param {string[]} fullPool
 * @param {string[] | null | undefined} mixedTopicKeys
 * @returns {string[]}
 */
export function filterMixedPoolBySelection(fullPool, mixedTopicKeys) {
  if (!mixedTopicKeys || !mixedTopicKeys.length) return fullPool.slice();
  const allow = new Set(mixedTopicKeys.map((k) => String(k).toLowerCase()));
  return fullPool.filter((k) => allow.has(String(k).toLowerCase()));
}

/**
 * Client/UI error message for mixed topic validation.
 * @param {string} code
 * @returns {string}
 */
export function worksheetMixedTopicsErrorHe(code) {
  if (code === "MIXED_TOPICS_EMPTY") {
    return "יש לבחור לפחות נושא אחד לתרגול.";
  }
  if (code === "INVALID_MIXED_TOPIC_KEYS") {
    return "בחירת הנושאים לתרגול מעורב אינה תקינה.";
  }
  return "";
}
