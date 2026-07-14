/**
 * Ready catalog integrity checks — Wave F.
 * @module lib/worksheets/worksheet-ready-catalog-integrity.server
 */

import {
  READY_WORKSHEET_CATALOG,
  countReadyCatalogBySubject,
} from "./worksheet-ready-catalog.js";
import { isWorksheetPublicLevelKey, findForbiddenPublicLevelLabels, auditPublicPayloadMetaForForbiddenLevelLabels } from "./worksheet-level-display.js";
import { isCoreWorksheetSubject } from "./worksheet-print-allowlist.js";
import { worksheetTopicOptionsForGrade } from "./worksheet-topic-options.js";
import { generateWorksheetForParent, publicWorksheetPayload } from "./worksheet-generate.server.js";
import {
  auditWorksheetPayloadForAnswerLeaks,
  auditWorksheetPayloadForMetadataLeaks,
} from "./worksheet-payload-build.server.js";
import {
  worksheetGradeLabelHe,
  worksheetLevelLabelHe,
  worksheetSubjectLabelHe,
  worksheetTopicLabelHe,
} from "./worksheet-meta-labels.server.js";

const MIN_BY_SUBJECT = {
  math: 15,
  geometry: 5,
  hebrew: 5,
  english: 5,
};

/**
 * @returns {{ pass: boolean, errors: string[] }}
 */
export function validateReadyCatalogShape() {
  /** @type {string[]} */
  const errors = [];
  const slugs = new Set();

  if (READY_WORKSHEET_CATALOG.length < 30) {
    errors.push(`catalog too small: ${READY_WORKSHEET_CATALOG.length} < 30`);
  }

  const bySubject = countReadyCatalogBySubject();
  for (const [subjectId, min] of Object.entries(MIN_BY_SUBJECT)) {
    const n = bySubject[subjectId] || 0;
    if (n < min) errors.push(`${subjectId}: ${n} < ${min}`);
  }

  for (const entry of READY_WORKSHEET_CATALOG) {
    if (slugs.has(entry.slug)) errors.push(`duplicate slug: ${entry.slug}`);
    slugs.add(entry.slug);

    if (!isCoreWorksheetSubject(entry.subjectId)) {
      errors.push(`invalid subject: ${entry.slug}`);
    }
    if (!isWorksheetPublicLevelKey(entry.levelKey)) {
      errors.push(`invalid levelKey: ${entry.slug} → ${entry.levelKey}`);
    }
    if (findForbiddenPublicLevelLabels(JSON.stringify(entry)).length) {
      errors.push(`forbidden level label in entry: ${entry.slug}`);
    }
    if (!/^g[1-6]$/.test(entry.gradeKey)) {
      errors.push(`invalid gradeKey: ${entry.slug}`);
    }
    if (!Number.isFinite(entry.count) || entry.count < 1 || entry.count > 20) {
      errors.push(`invalid count: ${entry.slug}`);
    }
    if (!Number.isFinite(entry.seed)) {
      errors.push(`invalid seed: ${entry.slug}`);
    }

    const allowedTopics = worksheetTopicOptionsForGrade(entry.subjectId, entry.gradeKey).map(
      (t) => t.key
    );
    if (!allowedTopics.includes(entry.topicKey)) {
      errors.push(`topic not in grade curriculum: ${entry.slug} (${entry.topicKey})`);
    }
  }

  return { pass: errors.length === 0, errors };
}

/**
 * @param {import("./worksheet-ready-catalog.js").ReadyWorksheetCatalogEntry} entry
 * @returns {Promise<{ pass: boolean, error?: string }>}
 */
export async function validateReadyCatalogEntryGenerates(entry) {
  const result = await generateWorksheetForParent({
    subjectId: entry.subjectId,
    gradeKey: entry.gradeKey,
    topicKey: entry.topicKey,
    levelKey: entry.levelKey,
    count: entry.count,
    seed: entry.seed,
    inkSave: entry.inkSave === true,
    titleHe: entry.titleHe,
    mathPracticeFormat: entry.mathPracticeFormat,
  });

  if (!result.ok) {
    return { pass: false, error: `${entry.slug}: ${result.code}` };
  }

  const pub = publicWorksheetPayload(result.worksheetPayload);
  if (auditPublicPayloadMetaForForbiddenLevelLabels(pub).length) {
    return { pass: false, error: `${entry.slug}: forbidden level in public payload meta` };
  }
  if (pub.meta.levelHe !== worksheetLevelLabelHe(entry.subjectId, entry.levelKey)) {
    return { pass: false, error: `${entry.slug}: levelHe mismatch` };
  }

  const answerAudit = auditWorksheetPayloadForAnswerLeaks(result.worksheetPayload);
  if (!answerAudit.pass) {
    return { pass: false, error: `${entry.slug}: answer leak` };
  }
  const metaAudit = auditWorksheetPayloadForMetadataLeaks(result.worksheetPayload);
  if (!metaAudit.pass) {
    return { pass: false, error: `${entry.slug}: metadata leak` };
  }
  if (!result.worksheetPayload.questions.length) {
    return { pass: false, error: `${entry.slug}: no printable questions` };
  }

  return { pass: true };
}

/**
 * @returns {Promise<{ pass: boolean, errors: string[] }>}
 */
export async function validateReadyCatalogGeneratesAll() {
  /** @type {string[]} */
  const errors = [];
  for (const entry of READY_WORKSHEET_CATALOG) {
    const check = await validateReadyCatalogEntryGenerates(entry);
    if (!check.pass) errors.push(check.error || entry.slug);
  }
  return { pass: errors.length === 0, errors };
}

/**
 * @returns {Array<Record<string, string | number>>}
 */
export function listReadyCatalogSummaryRows() {
  return READY_WORKSHEET_CATALOG.map((entry) => ({
    slug: entry.slug,
    subjectId: entry.subjectId,
    subjectHe: worksheetSubjectLabelHe(entry.subjectId),
    gradeKey: entry.gradeKey,
    gradeHe: worksheetGradeLabelHe(entry.subjectId, entry.gradeKey),
    topicKey: entry.topicKey,
    topicHe: worksheetTopicLabelHe(entry.subjectId, entry.topicKey),
    levelKey: entry.levelKey,
    levelHe: worksheetLevelLabelHe(entry.subjectId, entry.levelKey),
    count: entry.count,
  }));
}
