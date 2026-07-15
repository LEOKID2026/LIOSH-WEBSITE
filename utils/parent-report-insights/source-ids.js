/**
 * Stable internal source references for grounding AI strengths/focusAreas to Insight Packet items.
 *
 * Format:
 *  - Subject scope: `subject:<subjectKey>`        e.g. `subject:math`
 *  - Topic   scope: `topic:<subjectKey>:<bucket>[:grade:gN]` e.g. `topic:math:fractions:grade:g4`
 *
 * Grade-scoped rows MUST include `:grade:` - never collapse duplicate display labels.
 */

import { buildRowSourceId } from "../parent-report-output-integrity/row-identity-v1.js";

const SAFE_KEY_PART = /^[a-z][a-z0-9_-]*$/i;

function normalizeKeyPart(value) {
  if (value == null) return "";
  const trimmed = String(value).trim().toLowerCase();
  return SAFE_KEY_PART.test(trimmed) ? trimmed : "";
}

export function buildSubjectSourceId(subjectKey) {
  const s = normalizeKeyPart(subjectKey);
  return s ? `subject:${s}` : "";
}

/**
 * @param {string} subjectKey
 * @param {string} topicRowKey - full row key (may include `::grade:gN`)
 * @param {string|null} [contentGradeKey]
 */
export function buildTopicRowSourceId(subjectKey, topicRowKey, contentGradeKey = null) {
  return buildRowSourceId(subjectKey, topicRowKey, contentGradeKey);
}

/** @deprecated Prefer `buildTopicRowSourceId` with full topicRowKey. */
export function buildTopicSourceId(subjectKey, topicKey) {
  return buildTopicRowSourceId(subjectKey, topicKey, null);
}

export const SOURCE_ID_PATTERN =
  /^(subject:[a-z][a-z0-9_-]*|topic:[a-z][a-z0-9_-]+(?::[a-z][a-z0-9_-]+)*(?::grade:g[1-6])?)$/;

export function isValidSourceId(id) {
  return typeof id === "string" && SOURCE_ID_PATTERN.test(id);
}

export function parseSourceId(id) {
  if (!isValidSourceId(id)) return null;
  if (id.startsWith("subject:")) {
    return { scope: "subject", subjectKey: id.slice("subject:".length), topicKey: null, contentGradeKey: null };
  }
  const rest = id.slice("topic:".length);
  const gradeIdx = rest.indexOf(":grade:");
  if (gradeIdx > 0) {
    const head = rest.slice(0, gradeIdx);
    const contentGradeKey = rest.slice(gradeIdx + ":grade:".length);
    const colonIdx = head.indexOf(":");
    if (colonIdx <= 0) return null;
    return {
      scope: "topic",
      subjectKey: head.slice(0, colonIdx),
      topicKey: head.slice(colonIdx + 1),
      contentGradeKey: contentGradeKey || null,
    };
  }
  const colonIdx = rest.indexOf(":");
  if (colonIdx <= 0) return null;
  return {
    scope: "topic",
    subjectKey: rest.slice(0, colonIdx),
    topicKey: rest.slice(colonIdx + 1),
    contentGradeKey: null,
  };
}
