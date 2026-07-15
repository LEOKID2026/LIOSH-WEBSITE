/**
 * Enriched ready catalog rows — shared shape for parent and public APIs.
 * @module lib/worksheets/worksheet-public-catalog.server
 */

import { READY_WORKSHEET_CATALOG } from "./worksheet-ready-catalog.js";
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
export function buildReadyWorksheetCatalogItems() {
  return READY_WORKSHEET_CATALOG.map((entry) => ({
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
  }));
}
