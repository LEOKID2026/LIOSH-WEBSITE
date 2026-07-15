/**
 * Attach rowIdentityV1 to topic-map rows and build grade-aware aggregate copy.
 */

import { buildGradeEvidenceFields } from "../../lib/learning-supabase/practice-grade-resolution.js";
import {
  buildDuplicateCanonicalTopicKeysFromBaseReport,
  cleanTopicLabelHe,
  resolveNarrativeDisplayLabels,
} from "./row-display-label-context.js";
import {
  buildRowIdentityV1,
  parseCanonicalTopicFromRowKey,
} from "./row-identity-v1.js";

const SUBJECT_TOPIC_MAP_KEYS = [
  ["math", "mathOperations"],
  ["geometry", "geometryTopics"],
  ["english", "englishTopics"],
  ["science", "scienceTopics"],
  ["history", "historyTopics"],
  ["hebrew", "hebrewTopics"],
  ["moledet-geography", "moledetGeographyTopics"],
];

/**
 * @param {string} subjectId
 * @param {string} topicRowKey
 * @param {Record<string, unknown>} row
 * @param {string|null} registeredGradeKey
 * @param {Set<string>} duplicateCanonicalKeys
 */
export function attachRowIdentityToTopicMapRow(
  subjectId,
  topicRowKey,
  row,
  registeredGradeKey,
  duplicateCanonicalKeys,
) {
  if (!row || typeof row !== "object") return row;
  const contentGradeKey =
    row.contentGradeKey || row.gradeKey || parseCanonicalTopicFromRowKey(topicRowKey).contentGradeKey;
  const ge = buildGradeEvidenceFields(registeredGradeKey, contentGradeKey);
  const parsed = parseCanonicalTopicFromRowKey(topicRowKey);
  const requiresGradeContext = duplicateCanonicalKeys.has(`${subjectId}|${parsed.canonicalTopicKey}`);
  const displayName = cleanTopicLabelHe(row.displayName);
  const identity = buildRowIdentityV1({
    subjectId,
    topicRowKey,
    displayName,
    contentGradeKey: ge.contentGradeLevel,
    registeredGradeKey: ge.registeredGradeLevel,
    gradeRelation: ge.gradeRelation,
    questions: row.questions,
    accuracy: row.accuracy,
    correct: row.correct,
    timeSpentMinutes: row.timeMinutes,
    latestActivityAt: row.latestActivityAt || row.lastAnswerAt || null,
  });
  const labels = resolveNarrativeDisplayLabels({
    displayName,
    contentGradeKey: identity.contentGradeKey,
    registeredGradeKey: identity.registeredGradeKey,
    gradeRelation: identity.gradeRelation,
    topicRowKey,
    requiresGradeContext,
    includeGradeInTitle: Boolean(identity.contentGradeKey),
  });
  row.rowIdentityV1 = {
    ...identity,
    cleanTopicLabelHe: displayName,
    narrativeTitleHe: labels.titleHe,
    narrativeTopicLabelHe: labels.titleHe,
    gradeRelationSublineHe: labels.gradeRelationSublineHe,
    requiresGradeContextInNarrative: requiresGradeContext,
  };
  row.rowSourceId = identity.sourceId;
  row.cleanTopicLabelHe = displayName;
  row.narrativeTitleHe = labels.titleHe;
  row.narrativeTopicLabelHe = labels.titleHe;
  row.gradeRelationSublineHe = labels.gradeRelationSublineHe;
  row.parentFacingLabelHe = labels.titleHe;
  row.topicRowKey = topicRowKey;
  row.subjectId = subjectId;
  return row;
}

/**
 * @param {string} subjectId
 * @param {Record<string, unknown>} topicMap
 * @param {string|null} registeredGradeKey
 * @param {Set<string>} duplicateCanonicalKeys
 */
export function attachRowIdentityToTopicMap(subjectId, topicMap, registeredGradeKey, duplicateCanonicalKeys) {
  if (!topicMap || typeof topicMap !== "object") return topicMap;
  for (const [topicRowKey, row] of Object.entries(topicMap)) {
    attachRowIdentityToTopicMapRow(subjectId, topicRowKey, row, registeredGradeKey, duplicateCanonicalKeys);
  }
  return topicMap;
}

/**
 * @param {unknown} baseReport
 */
export function hardenBaseReportWithRowIdentity(baseReport) {
  if (!baseReport || typeof baseReport !== "object") return baseReport;
  const registeredGradeKey = baseReport.registeredGradeKey ?? null;
  const duplicateKeys = buildDuplicateCanonicalTopicKeysFromBaseReport(baseReport);
  baseReport._duplicateCanonicalTopicKeys = duplicateKeys;
  for (const [subjectId, mapKey] of SUBJECT_TOPIC_MAP_KEYS) {
    if (baseReport[mapKey]) {
      attachRowIdentityToTopicMap(subjectId, baseReport[mapKey], registeredGradeKey, duplicateKeys);
    }
  }
  return baseReport;
}

/**
 * @param {unknown} baseReport
 * @param {object} unit
 */
export function parentFacingDisplayLabelsForV2Unit(baseReport, unit) {
  const subjectId = String(unit?.subjectId || "");
  const topicRowKey = String(unit?.topicRowKey || "");
  const parsed = parseCanonicalTopicFromRowKey(topicRowKey);
  const dup =
    baseReport?._duplicateCanonicalTopicKeys || buildDuplicateCanonicalTopicKeysFromBaseReport(baseReport);
  const requiresGradeContext = dup.has(`${subjectId}|${parsed.canonicalTopicKey}`);
  const gk = unit?.contentGradeKey || parsed.contentGradeKey || null;
  const ge = buildGradeEvidenceFields(baseReport?.registeredGradeKey, gk);
  return resolveNarrativeDisplayLabels({
    displayName: String(unit?.displayName || ""),
    contentGradeKey: ge.contentGradeLevel,
    registeredGradeKey: ge.registeredGradeLevel,
    gradeRelation: ge.gradeRelation,
    topicRowKey,
    requiresGradeContext,
    includeGradeInTitle: Boolean(gk),
  });
}

/** @param {unknown} baseReport @param {object} unit */
export function parentFacingLabelForV2Unit(baseReport, unit) {
  return parentFacingDisplayLabelsForV2Unit(baseReport, unit).titleHe;
}

/**
 * @param {object} unit
 */
function unitMetrics(unit) {
  const v = unit?.evidenceTrace?.[0]?.value;
  return {
    questions: Number(v?.questions) || 0,
    accuracy: Number(v?.accuracy) || 0,
  };
}

/**
 * Detect same canonical topic at multiple grades with contradictory signals.
 * @param {object[]} units
 * @param {unknown} baseReport
 */
export function detectGradeSplitContradictions(units, baseReport) {
  /** @type {Map<string, object[]>} */
  const groups = new Map();
  for (const u of units || []) {
    const sid = String(u?.subjectId || "");
    const parsed = parseCanonicalTopicFromRowKey(String(u?.topicRowKey || ""));
    const key = `${sid}|${parsed.canonicalTopicKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(u);
  }
  /** @type {string[]} */
  const notices = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const grades = new Set(
      group.map((u) => parseCanonicalTopicFromRowKey(String(u?.topicRowKey || "")).contentGradeKey).filter(Boolean),
    );
    if (grades.size < 2) continue;
    let hasStrong = false;
    let hasWeak = false;
    for (const u of group) {
      const { questions, accuracy } = unitMetrics(u);
      if (questions >= 40 && accuracy >= 78) hasStrong = true;
      if (questions >= 8 && accuracy < 55) hasWeak = true;
    }
    if (!hasStrong || !hasWeak) continue;
    const displayName = String(group[0]?.displayName || "נושא");
    const subjectLabel =
      { math: "מתמטיקה", geometry: "גאומטריה", english: "אנגלית", science: "מדעים", hebrew: "עברית", "moledet-geography": "מולדת" }[
        String(group[0]?.subjectId || "")
      ] || String(group[0]?.subjectId || "");
    const parts = group
      .map((u) => {
        const { questions, accuracy } = unitMetrics(u);
        const label = parentFacingLabelForV2Unit(baseReport, u);
        const band = questions >= 40 && accuracy >= 78 ? "יציב" : accuracy < 55 ? "כדאי לחזק" : "ביניים";
        return `${label}: ${questions} שאלות, דיוק ${accuracy}% (${band})`;
      })
      .join("; ");
    notices.push(
      `ב${subjectLabel}, באותו נושא (${displayName}) נראו תוצאות שונות לפי רמת הכיתה - ${parts}. לא מאחדים לשורה אחת.`,
    );
  }
  return notices;
}

/**
 * @param {unknown} baseReport
 * @param {object} unit
 */
export function executiveLineFromV2Unit(baseReport, unit) {
  const label = parentFacingLabelForV2Unit(baseReport, unit);
  const sid = String(unit?.subjectId || "");
  const subjectLabel =
    { math: "מתמטיקה", geometry: "גאומטריה", english: "אנגלית", science: "מדעים", hebrew: "עברית", "moledet-geography": "מולדת" }[
      sid
    ] || sid;
  return `${label} (${subjectLabel})`;
}

/**
 * @param {unknown} baseReport
 * @param {object} unit
 */
export function homePlanLineFromV2Unit(baseReport, unit, actionHe) {
  const label = parentFacingLabelForV2Unit(baseReport, unit);
  const sid = String(unit?.subjectId || "");
  const subjectLabel =
    { math: "מתמטיקה", geometry: "גאומטריה", english: "אנגלית", science: "מדעים", hebrew: "עברית", "moledet-geography": "מולדת" }[
      sid
    ] || sid;
  return `${label} (${subjectLabel}): ${String(actionHe || "").trim()}`;
}

export default {
  attachRowIdentityToTopicMapRow,
  attachRowIdentityToTopicMap,
  hardenBaseReportWithRowIdentity,
  parentFacingLabelForV2Unit,
  detectGradeSplitContradictions,
  executiveLineFromV2Unit,
  homePlanLineFromV2Unit,
};
