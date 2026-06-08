/**
 * Central launch-readiness policy SSOT (Phase 1).
 * Registry metadata (diagnosticContribution, marketingEligible) is NOT consumed by parent-server.
 */
import registryDocument from "../../data/launch-readiness/topic-launch-registry.json" with { type: "json" };
import { LAUNCH_SURFACES, topicCellKey } from "./launch-surfaces.js";

/** @typedef {import('./launch-surfaces.js').LaunchLevel} LaunchLevel */
/** @typedef {import('./launch-surfaces.js').DiagnosticContribution} DiagnosticContribution */

/**
 * @typedef {object} TopicLaunchRow
 * @property {string} subject
 * @property {string} grade
 * @property {string} topic
 * @property {string} cellKey
 * @property {LaunchLevel} launchLevel
 * @property {{ selfPractice: boolean, parentAssign: boolean, teacherAssign: boolean, learningBookEntry: boolean }} surfaces
 * @property {DiagnosticContribution} diagnosticContribution
 * @property {boolean} [bookFirstRecommended]
 * @property {string[]} [bookFirstSoftGateTopics]
 * @property {boolean} [audioRequired]
 * @property {boolean} [marketingEligible]
 * @property {string} [marketingNoteInternal]
 * @property {string} [reason]
 */

const REGISTRY_ROWS = Array.isArray(registryDocument?.rows) ? registryDocument.rows : [];

/** @type {Map<string, TopicLaunchRow>} */
const ROW_BY_CELL = new Map(
  REGISTRY_ROWS.map((row) => [topicCellKey(row.subject, row.grade, row.topic), row])
);

/**
 * @returns {readonly TopicLaunchRow[]}
 */
export function getAllTopicLaunchRows() {
  return REGISTRY_ROWS;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 * @returns {TopicLaunchRow|null}
 */
export function getTopicLaunchRow(subject, grade, topic) {
  const key = topicCellKey(subject, grade, topic);
  return ROW_BY_CELL.get(key) ?? null;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 * @returns {LaunchLevel|null}
 */
export function getTopicLaunchLevel(subject, grade, topic) {
  return getTopicLaunchRow(subject, grade, topic)?.launchLevel ?? null;
}

/**
 * Registry metadata only — not consumed by parent report aggregation in Phase 1.
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 * @returns {DiagnosticContribution|null}
 */
export function getDiagnosticContributionMetadata(subject, grade, topic) {
  return getTopicLaunchRow(subject, grade, topic)?.diagnosticContribution ?? null;
}

/**
 * Internal marketing metadata only — not wired to public UI in Phase 1.
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 */
export function getMarketingMetadata(subject, grade, topic) {
  const row = getTopicLaunchRow(subject, grade, topic);
  if (!row) return null;
  return {
    marketingEligible: Boolean(row.marketingEligible),
    marketingNoteInternal: row.marketingNoteInternal ?? null,
  };
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 * @param {string} surface
 */
export function isTopicAllowedOnSurface(subject, grade, topic, surface) {
  const row = getTopicLaunchRow(subject, grade, topic);
  if (!row) {
    return surface === LAUNCH_SURFACES.SELF_PRACTICE;
  }
  if (row.launchLevel === "HIDE") return false;

  const s = String(surface || "");
  if (s === LAUNCH_SURFACES.SELF_PRACTICE) return Boolean(row.surfaces?.selfPractice);
  if (s === LAUNCH_SURFACES.PARENT_ASSIGN) return Boolean(row.surfaces?.parentAssign);
  if (s === LAUNCH_SURFACES.TEACHER_ASSIGN) return Boolean(row.surfaces?.teacherAssign);
  if (s === LAUNCH_SURFACES.LEARNING_BOOK_ENTRY) return Boolean(row.surfaces?.learningBookEntry);
  return false;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} topic
 */
export function isTopicHiddenFromLaunch(subject, grade, topic) {
  const level = getTopicLaunchLevel(subject, grade, topic);
  if (level == null) return false;
  return level === "HIDE";
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string[]} curriculumTopics
 */
export function listVisibleTopicsForSelfPractice(subject, grade, curriculumTopics) {
  const list = Array.isArray(curriculumTopics) ? curriculumTopics : [];
  return list.filter(
    (topic) =>
      topic !== "mixed" &&
      isTopicAllowedOnSurface(subject, grade, topic, LAUNCH_SURFACES.SELF_PRACTICE)
  );
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string[]} curriculumTopics
 */
export function listVisibleTopicsForAssign(subject, grade, curriculumTopics) {
  const list = Array.isArray(curriculumTopics) ? curriculumTopics : [];
  return list.filter((topic) =>
    isTopicAllowedOnSurface(subject, grade, topic, LAUNCH_SURFACES.PARENT_ASSIGN)
  );
}

export function getRegistryMeta() {
  return {
    generatedAt: registryDocument?.generatedAt ?? null,
    registryVersion: registryDocument?.registryVersion ?? null,
    rowCount: REGISTRY_ROWS.length,
  };
}
