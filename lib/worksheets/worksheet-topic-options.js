/**
 * Topic options for parent worksheet hub — core four subjects only.
 * @module lib/worksheets/worksheet-topic-options
 */

import { topicOptionsForSubject } from "../teacher-portal/teacher-class-topic-options.js";
import { listGeometryTopicsForGrade } from "./worksheet-geometry-allowlist.js";
import { TOPICS as GEOMETRY_TOPICS } from "../../utils/geometry-constants.js";

/** @typedef {import("./worksheet-question-types.js").WorksheetSubjectId} WorksheetSubjectId */

/**
 * @param {WorksheetSubjectId} subjectId
 * @param {string} gradeKey
 * @returns {{ key: string, label: string }[]}
 */
export function worksheetTopicOptionsForGrade(subjectId, gradeKey) {
  if (subjectId === "geometry") {
    return listGeometryTopicsForGrade(gradeKey)
      .filter((key) => key !== "mixed")
      .map((key) => ({
        key,
        label: GEOMETRY_TOPICS[key]?.name || key,
      }));
  }

  return topicOptionsForSubject(subjectId, gradeKey).filter(({ key }) => key !== "mixed");
}

/**
 * @param {WorksheetSubjectId} subjectId
 * @param {string} gradeKey
 * @returns {string}
 */
export function defaultWorksheetTopicForGrade(subjectId, gradeKey) {
  const opts = worksheetTopicOptionsForGrade(subjectId, gradeKey);
  return opts[0]?.key || "";
}
