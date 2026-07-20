/**
 * Enriched ready catalog rows — questions + writing (305 metadata).
 * @module lib/worksheets/worksheet-public-catalog.server
 */

import { READY_WORKSHEET_CATALOG } from "./worksheet-ready-catalog.js";
import { buildWritingCatalogItems } from "../writing/writing-catalog.server.js";
import {
  worksheetGradeLabelHe,
  worksheetLevelLabelHe,
  worksheetSubjectLabelHe,
  worksheetTopicLabelHe,
} from "./worksheet-meta-labels.server.js";
import { mathPracticeFormatTitleHe } from "./worksheet-math-practice-format.js";

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function buildQuestionCatalogItems() {
  return READY_WORKSHEET_CATALOG.map((entry) => ({
    worksheetType: "questions",
    slug: entry.slug,
    subjectId: entry.subjectId,
    subjectHe: worksheetSubjectLabelHe(entry.subjectId),
    gradeKey: entry.gradeKey,
    gradeHe: worksheetGradeLabelHe(entry.subjectId, entry.gradeKey),
    topicKey: entry.topicKey,
    topicHe:
      entry.titleHe ||
      (entry.mathPracticeFormat
        ? mathPracticeFormatTitleHe(
            entry.mathPracticeFormat,
            entry.topicKey,
            entry.gradeKey
          )
        : worksheetTopicLabelHe(entry.subjectId, entry.topicKey)),
    levelKey: entry.levelKey,
    levelHe: worksheetLevelLabelHe(entry.subjectId, entry.levelKey),
    count: entry.count,
    inkSave: entry.inkSave === true,
    publicAccess: true,
    locked: false,
  }));
}

/**
 * Unified catalog — 35 question + 270 writing = 305 items.
 * @returns {Array<Record<string, unknown>>}
 */
export function buildUnifiedWorksheetCatalogItems() {
  return [...buildQuestionCatalogItems(), ...buildWritingCatalogItems()];
}

/** Question-only catalog (35 items) — backward compatible with existing tests. */
export function buildReadyWorksheetCatalogItems() {
  return buildQuestionCatalogItems();
}
