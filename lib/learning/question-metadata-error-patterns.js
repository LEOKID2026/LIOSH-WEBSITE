/**
 * Q2-E.2 — Internal error-pattern recurrence from canonical possibleErrorPatterns.
 * Parent-context diagnostic wrongs only; does not create evidence.
 */

import { passesRecurrenceRules } from "../../utils/diagnostic-engine-v2/recurrence.js";
import { buildSubSkillGroupKey } from "./question-metadata-resolve-at-answer.js";

const TRACE_ID_CAP = 50;

const PATTERN_RECURRENCE_RULES = Object.freeze({
  minWrong: 2,
  minDistinctDays: 2,
  minDistinctPatternFamilies: 0,
});

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {unknown} patterns
 * @returns {string[]}
 */
export function normalizePossibleErrorPatterns(patterns) {
  if (!Array.isArray(patterns)) return [];
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const raw of patterns) {
    const tag = pickStr(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} mistake
 * @returns {string|null}
 */
function mistakeEvidenceId(mistake) {
  if (mistake?.id) return String(mistake.id);
  if (mistake?.answerId) return String(mistake.answerId);
  if (mistake?.questionId) return String(mistake.questionId);
  return null;
}

/**
 * @param {Array<Record<string, unknown>>} mistakes
 * @returns {object}
 */
function buildPatternRecurrenceSummary(mistakes) {
  const wrongRows = mistakes.map((m) => ({
    isCorrect: false,
    answeredAt: m.answeredAt || m.answered_at || m.timestamp,
    timestamp: m.timestampMs || (m.answeredAt ? Date.parse(String(m.answeredAt)) : null),
  }));
  const recurrenceMet = passesRecurrenceRules(wrongRows, PATTERN_RECURRENCE_RULES);
  const ids = mistakes.map(mistakeEvidenceId).filter(Boolean).slice(0, TRACE_ID_CAP);

  return {
    wrongCount: mistakes.length,
    recurrenceMet,
    supportingEvidenceIds: ids,
  };
}

/**
 * Build internal error-pattern summaries from diagnostic wrong rows with canonical tags.
 *
 * @param {Array<Record<string, unknown>>} recentMistakes
 * @returns {{
 *   global: Record<string, object>,
 *   bySubSkillGroup: Record<string, Record<string, object>>,
 * }}
 */
export function computeInternalErrorPatternSummaries(recentMistakes) {
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const globalBuckets = new Map();
  /** @type {Map<string, Map<string, Array<Record<string, unknown>>>>} */
  const groupBuckets = new Map();

  for (const mistake of recentMistakes || []) {
    if (!mistake || typeof mistake !== "object") continue;
    const cm = mistake._canonicalMeta;
    if (!cm || typeof cm !== "object") continue;

    const patterns = normalizePossibleErrorPatterns(
      /** @type {Record<string, unknown>} */ (cm).possibleErrorPatterns
    );
    if (patterns.length === 0) continue;

    const subject = pickStr(mistake.subject) || "unknown";
    const topic = pickStr(mistake.topic) || "general";
    const groupKey = buildSubSkillGroupKey(
      /** @type {Record<string, unknown>} */ (cm),
      subject,
      topic
    );

    for (const pattern of patterns) {
      const globalKey = `${subject}::${topic}::${pattern}`;

      if (!globalBuckets.has(globalKey)) globalBuckets.set(globalKey, []);
      globalBuckets.get(globalKey).push(mistake);

      if (!groupBuckets.has(groupKey)) groupBuckets.set(groupKey, new Map());
      const groupMap = groupBuckets.get(groupKey);
      if (!groupMap.has(pattern)) groupMap.set(pattern, []);
      groupMap.get(pattern).push(mistake);
    }
  }

  /** @type {Record<string, object>} */
  const global = {};
  for (const [key, mistakes] of globalBuckets.entries()) {
    const parts = key.split("::");
    const subject = parts[0] || "unknown";
    const topic = parts[1] || "general";
    const pattern = parts.slice(2).join("::") || "unknown";
    const summary = buildPatternRecurrenceSummary(mistakes);
    global[key] = {
      pattern,
      subject,
      topic,
      subSkillGroupKey: buildSubSkillGroupKey(
        /** @type {Record<string, unknown>} */ (mistakes[0]._canonicalMeta),
        subject,
        topic
      ),
      ...summary,
    };
  }

  /** @type {Record<string, Record<string, object>>} */
  const bySubSkillGroup = {};
  for (const [groupKey, patternMap] of groupBuckets.entries()) {
    /** @type {Record<string, object>} */
    const patterns = {};
    for (const [pattern, mistakes] of patternMap.entries()) {
      patterns[pattern] = {
        pattern,
        ...buildPatternRecurrenceSummary(mistakes),
      };
    }
    bySubSkillGroup[groupKey] = patterns;
  }

  return { global, bySubSkillGroup };
}
