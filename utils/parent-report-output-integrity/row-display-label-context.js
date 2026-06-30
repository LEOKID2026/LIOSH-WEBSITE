/**
 * Context-aware parent-facing row labels.
 * - TABLE: clean topic name (grade in separate column)
 * - NARRATIVE: short "{topic} - כיתה {grade}" + optional relation subline
 */

import { formatParentReportGradeLabel } from "../math-report-generator.js";
import { splitTopicRowKey } from "../parent-report-row-diagnostics.js";
import { parseCanonicalTopicFromRowKey } from "./row-identity-v1.js";

export const ROW_LABEL_DISPLAY_CONTEXT = Object.freeze({
  TABLE: "table",
  NARRATIVE: "narrative",
  CHART: "chart",
  AGGREGATE: "aggregate",
});

/** Banned in titles — relation belongs in subline only. */
export const LONG_NARRATIVE_TITLE_RE = /תרגול ב|מעל הכיתה הרשומה|בסיס\/כיתה נמוכה/u;

/**
 * @param {string} displayName
 */
export function cleanTopicLabelHe(displayName) {
  return String(displayName || "").trim() || "נושא";
}

/**
 * @param {string|null|undefined} gradeRelation
 */
export function gradeRelationSublineFromRelation(gradeRelation) {
  const rel = String(gradeRelation || "").trim();
  if (rel === "higher" || rel === "above_registered_grade") return "מעל הכיתה הרשומה";
  if (rel === "lower" || rel === "below_registered_grade") return "מתחת לכיתה הרשומה";
  if (rel === "same" || rel === "at_registered_grade") return "ברמת הכיתה הרשומה";
  if (rel === "outside_regular_grade_band") return "מחוץ לשכבת הכיתה הרשומה";
  return "";
}

/**
 * @param {{
 *   displayName: string;
 *   contentGradeKey?: string|null;
 *   registeredGradeKey?: string|null;
 *   gradeRelation?: string|null;
 *   topicRowKey?: string|null;
 *   requiresGradeContext?: boolean;
 *   includeGradeInTitle?: boolean;
 * }} args
 * @returns {{ titleHe: string; gradeRelationSublineHe: string|null }}
 */
export function resolveNarrativeDisplayLabels(args) {
  const name = cleanTopicLabelHe(args?.displayName);
  let gk =
    args?.contentGradeKey != null && String(args.contentGradeKey).trim()
      ? String(args.contentGradeKey).trim()
      : null;
  if (!gk && args?.topicRowKey) {
    const p = splitTopicRowKey(String(args.topicRowKey));
    gk = p?.gradeKey != null && String(p.gradeKey).trim() ? String(p.gradeKey).trim() : null;
  }
  if (!gk && args?.topicRowKey) {
    gk = parseCanonicalTopicFromRowKey(String(args.topicRowKey)).contentGradeKey;
  }

  const includeGrade =
    args?.includeGradeInTitle === true ||
    args?.requiresGradeContext === true ||
    Boolean(gk);

  if (!gk || !includeGrade) {
    return { titleHe: name, gradeRelationSublineHe: null };
  }

  const gradeLabel = formatParentReportGradeLabel(gk);
  if (!gradeLabel || gradeLabel === "לא זמין") {
    return { titleHe: name, gradeRelationSublineHe: null };
  }
  const gradeShort = gradeLabel.replace(/^כיתה\s+/u, "").trim();
  const titleHe = `${name} - כיתה ${gradeShort}`;
  const sub = gradeRelationSublineFromRelation(args?.gradeRelation);
  return { titleHe, gradeRelationSublineHe: sub || null };
}

/**
 * @param {{
 *   displayName: string;
 *   contentGradeKey?: string|null;
 *   registeredGradeKey?: string|null;
 *   gradeRelation?: string|null;
 *   topicRowKey?: string|null;
 *   requiresGradeContext?: boolean;
 * }} args
 */
export function narrativeTopicRowLabelHe(args) {
  const { titleHe } = resolveNarrativeDisplayLabels({ ...args, includeGradeInTitle: true });
  return titleHe;
}

/**
 * @param {string} subjectId
 * @param {Record<string, unknown>} topicMap
 * @returns {Set<string>} keys `${subjectId}|${canonicalTopicKey}` with 2+ content grades
 */
export function buildDuplicateCanonicalTopicKeys(subjectId, topicMap) {
  /** @type {Map<string, Set<string>>} */
  const gradesByCanon = new Map();
  for (const [topicRowKey, row] of Object.entries(topicMap || {})) {
    const parsed = parseCanonicalTopicFromRowKey(topicRowKey);
    const canon = parsed.canonicalTopicKey || topicRowKey;
    const gk =
      (row && typeof row === "object" && (row.contentGradeKey || row.gradeKey)) ||
      parsed.contentGradeKey ||
      null;
    const g = gk != null ? String(gk).trim() : "";
    if (!gradesByCanon.has(canon)) gradesByCanon.set(canon, new Set());
    if (g) gradesByCanon.get(canon).add(g);
  }
  const out = new Set();
  for (const [canon, grades] of gradesByCanon) {
    if (grades.size >= 2) out.add(`${subjectId}|${canon}`);
  }
  return out;
}

/**
 * @param {unknown} baseReport
 * @returns {Set<string>}
 */
export function buildDuplicateCanonicalTopicKeysFromBaseReport(baseReport) {
  const all = new Set();
  const maps = [
    ["math", "mathOperations"],
    ["geometry", "geometryTopics"],
    ["english", "englishTopics"],
    ["science", "scienceTopics"],
    ["hebrew", "hebrewTopics"],
    ["moledet-geography", "moledetGeographyTopics"],
  ];
  for (const [sid, mk] of maps) {
    const tm = baseReport?.[mk];
    if (!tm) continue;
    for (const k of buildDuplicateCanonicalTopicKeys(sid, tm)) all.add(k);
  }
  return all;
}

/**
 * @param {ROW_LABEL_DISPLAY_CONTEXT[keyof ROW_LABEL_DISPLAY_CONTEXT]} context
 * @param {Parameters<typeof resolveNarrativeDisplayLabels>[0]} fields
 */
export function resolveRowDisplayLabelHe(context, fields) {
  if (context === ROW_LABEL_DISPLAY_CONTEXT.TABLE) {
    return cleanTopicLabelHe(fields?.displayName);
  }
  return resolveNarrativeDisplayLabels({ ...fields, includeGradeInTitle: true }).titleHe;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function narrativeTitleFromRow(row) {
  if (!row || typeof row !== "object") return "";
  return (
    String(row.narrativeTitleHe || row.narrativeTopicLabelHe || row.labelHe || "").trim() ||
    cleanTopicLabelHe(row.displayName)
  );
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function gradeRelationSublineFromRow(row) {
  if (!row || typeof row !== "object") return null;
  const sub = String(row.gradeRelationSublineHe || row.rowIdentityV1?.gradeRelationSublineHe || "").trim();
  return sub || null;
}

export default {
  ROW_LABEL_DISPLAY_CONTEXT,
  LONG_NARRATIVE_TITLE_RE,
  cleanTopicLabelHe,
  gradeRelationSublineFromRelation,
  resolveNarrativeDisplayLabels,
  narrativeTopicRowLabelHe,
  buildDuplicateCanonicalTopicKeys,
  buildDuplicateCanonicalTopicKeysFromBaseReport,
  resolveRowDisplayLabelHe,
  narrativeTitleFromRow,
  gradeRelationSublineFromRow,
};
