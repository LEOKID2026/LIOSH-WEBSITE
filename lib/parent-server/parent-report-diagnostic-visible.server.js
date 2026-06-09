/**
 * Parent-visible diagnostic metadata impact (Q2 visible wiring).
 * Reads internal _evidenceQuality in-process only — never exposed on public API.
 */
import { topicLabelHe } from "../teacher-portal/teacher-ui.he.js";
import { TAXONOMY_BY_ID } from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { taxonomyIdsForReportBucket } from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  allowsStrongParentTopicInsight,
  shouldSuppressClientPatternDiagnostics,
} from "../learning/evidence-quality.js";
import { isDiagnosticMetadataSubskillEnabled, isActiveMetadataParentGatingEnabled } from "../learning/diagnostic-metadata-subskill-flag.js";
import { subjectQuestionCountsFromPayload } from "../../utils/parent-report-language/subject-evidence-policy.js";

const MIN_TOPIC_ANSWERS = 3;
const MIN_SUBSKILL_EVIDENCE = 12;
const DOMINANCE_RATIO = 0.6;

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 */
function getInternalEq(payload) {
  const eq = payload?.meta?._evidenceQuality;
  return eq && typeof eq === "object" ? eq : null;
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 * @returns {Array<Record<string, unknown>>}
 */
export function getActiveGatingDecisions(payload) {
  const decisions = getInternalEq(payload)?.gatingDecisions;
  return Array.isArray(decisions) ? decisions : [];
}

/**
 * @param {Record<string, unknown>|null|undefined} payload
 */
export function hasActiveGatingSuppressions(payload) {
  if (!isActiveMetadataParentGatingEnabled()) return false;
  return getActiveGatingDecisions(payload).some((d) => d?.action === "suppress_strong_diagnosis");
}

/**
 * @param {string} subject
 * @param {string} topic
 * @param {Record<string, unknown>} entry
 */
function resolveSubskillLabelHe(subject, topic, entry) {
  const ids = taxonomyIdsForReportBucket(subject, topic) || [];
  for (const id of ids) {
    const row = TAXONOMY_BY_ID[id];
    if (row?.subskillHe) return row.subskillHe;
  }
  const subSkill = pickStr(entry.subSkill);
  if (!subSkill) return null;
  return null;
}

/**
 * @param {Record<string, object>} bySubSkill
 * @param {string} subject
 * @param {string} topic
 */
function subskillGroupsForTopic(bySubSkill, subject, topic) {
  return Object.entries(bySubSkill).filter(([, row]) => {
    if (!row || typeof row !== "object") return false;
    return (
      row.subject === subject &&
      row.topic === topic &&
      row.groupingLevel === "subSkill"
    );
  });
}

/**
 * @param {Array<[string, Record<string, unknown>]>} groups
 */
function eligibleSubskillGroups(groups) {
  return groups.filter(([, row]) => {
    const evidence = Number(row.evidenceCount) || 0;
    const cap = pickStr(row.metadataConfidenceCap);
    return (
      evidence >= MIN_SUBSKILL_EVIDENCE &&
      row.recurrence?.met === true &&
      (cap === "high" || cap === "medium") &&
      row.isMetadataWeak !== true
    );
  });
}

/**
 * @param {Array<[string, Record<string, unknown>]>} subskillGroups
 */
function hasConflictingSubskillGroups(subskillGroups) {
  const subskillLevel = subskillGroups.filter(([, row]) => row.groupingLevel === "subSkill");
  if (subskillLevel.length <= 1) return false;
  const withSignal = subskillLevel.filter(([, row]) => (Number(row.evidenceCount) || 0) >= 3);
  return withSignal.length >= 2;
}

/**
 * @param {Array<[string, Record<string, unknown>]>} eligible
 */
function pickDominantSubskillGroup(eligible) {
  if (!eligible.length) return null;
  if (eligible.length === 1) return eligible[0];
  const sorted = [...eligible].sort(
    (a, b) => (Number(b[1].evidenceCount) || 0) - (Number(a[1].evidenceCount) || 0)
  );
  const top = Number(sorted[0][1].evidenceCount) || 0;
  const second = Number(sorted[1]?.[1]?.evidenceCount) || 0;
  if (top <= 0 || second / top >= 1 - DOMINANCE_RATIO) return null;
  return sorted[0];
}

/**
 * Public-safe practice focus hints (mode B+).
 * @param {Record<string, unknown>} payload
 * @returns {Array<{ topicLabelHe: string, focusLabelHe: string }>}
 */
export function computeParentVisiblePracticeFocus(payload) {
  if (!isDiagnosticMetadataSubskillEnabled()) return [];

  const subjectQuestionCounts = subjectQuestionCountsFromPayload(payload);
  const bySubSkill = getInternalEq(payload)?.bySubSkill;
  if (!bySubSkill || typeof bySubSkill !== "object") return [];

  /** @type {Map<string, Array<[string, Record<string, unknown>]>>} */
  const byTopicKey = new Map();
  for (const [groupKey, row] of Object.entries(bySubSkill)) {
    if (!row || typeof row !== "object") continue;
    const subject = pickStr(row.subject);
    const topic = pickStr(row.topic);
    if (!subject || !topic) continue;
    const topicKey = `${subject}::${topic}`;
    if (!byTopicKey.has(topicKey)) byTopicKey.set(topicKey, []);
    byTopicKey.get(topicKey).push([groupKey, row]);
  }

  /** @type {Array<{ topicLabelHe: string, focusLabelHe: string }>} */
  const out = [];
  for (const [topicKey, groups] of byTopicKey.entries()) {
    const [subject, topic] = topicKey.split("::");
    const canonical = subject === "moledet_geography" ? "moledet-geography" : subject;
    if ((Number(subjectQuestionCounts[canonical]) || 0) <= 0) continue;
    const subskillGroups = subskillGroupsForTopic(bySubSkill, subject, topic);
    if (hasConflictingSubskillGroups(subskillGroups)) continue;

    const eligible = eligibleSubskillGroups(subskillGroups.length ? subskillGroups : groups);
    if (!eligible.length) continue;

    const dominant = pickDominantSubskillGroup(eligible);
    if (!dominant) continue;

    const topicLine = topicLabelHe(subject, topic);
    const focusLine = resolveSubskillLabelHe(subject, topic, dominant[1]);
    if (!topicLine || !focusLine) continue;

    out.push({ topicLabelHe: topicLine, focusLabelHe: focusLine });
  }

  return out.slice(0, 2);
}

/**
 * @param {Array<{ topicLabelHe: string, focusLabelHe: string }>} practiceFocus
 * @returns {string[]}
 */
export function buildPracticeFocusInsightLines(practiceFocus) {
  const lines = [];
  for (const item of practiceFocus || []) {
    if (!item?.topicLabelHe || !item?.focusLabelHe) continue;
    lines.push(`נושא לחיזוק: ${item.topicLabelHe}`);
    lines.push(`מוקד לתרגול: ${item.focusLabelHe}`);
  }
  return lines;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {Array<{ subject: string, topicKey: string, answers: number }>} weakTopics
 */
export function shouldSoftenStudentLevelParentInsights(payload, weakTopics) {
  if (!hasActiveGatingSuppressions(payload)) return false;
  const suppressed = new Set(
    getActiveGatingDecisions(payload)
      .filter((d) => d?.action === "suppress_strong_diagnosis" && d?.topicKey)
      .map((d) => String(d.topicKey))
  );
  if (!suppressed.size) return false;

  const actionable = (weakTopics || []).filter((w) => w.answers >= MIN_TOPIC_ANSWERS);
  if (actionable.length) {
    return actionable.every((w) => suppressed.has(`${w.subject}::${w.topicKey}`));
  }

  return suppressed.size > 0;
}

/**
 * @param {Record<string, unknown>} payload
 * @param {string} subject
 * @param {string} topicKey
 */
export function isTopicStrongInsightSuppressed(payload, subject, topicKey) {
  return !allowsStrongParentTopicInsight(payload, subject, topicKey);
}

/**
 * Safe parentFacing flags derived server-side (no internal metadata).
 * @param {Record<string, unknown>} payload
 * @param {Array<{ topicLabelHe: string, focusLabelHe: string }>} practiceFocus
 */
export function buildParentFacingDiagnosticFlags(payload, practiceFocus) {
  return {
    diagnosisSuppressed: shouldSuppressClientPatternDiagnostics(payload),
    gatingApplied: hasActiveGatingSuppressions(payload),
    practiceFocus: practiceFocus || [],
  };
}
