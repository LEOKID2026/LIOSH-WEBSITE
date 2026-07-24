import {
  prerequisiteRelationsForSkill,
} from "../../utils/curriculum-skill-entity-registry.js";
import {
  UNSUPPORTED_EXPECTED_ERROR_TYPES,
} from "../../utils/question-metadata-qa/question-metadata-taxonomy.js";

const INVALID_ISSUES = new Set([
  "invalid_difficulty",
  "invalid_cognitive_level",
  "taxonomy_unknown_skillId",
  "taxonomy_unknown_subskillId",
  "taxonomy_unknown_prerequisite_skillId",
  "taxonomy_unknown_expected_error_type",
  "missing_subject",
  "missing_skillId",
  "missing_correct_answer",
]);

function isTopicLevelSubskill(record) {
  const subskill = String(record?.subskillId || "").trim().toLowerCase();
  const skill = String(record?.skillId || "").trim().toLowerCase();
  if (!subskill) return true;
  return (
    subskill === skill ||
    subskill === "general" ||
    subskill.endsWith("_general") ||
    subskill.includes("topic_level")
  );
}

export function classifyQuestionMetadataCompleteness(record) {
  const issues = new Set(record?.issues || []);
  const subjectId = record?.subjectHint || record?.subject;
  const relations = prerequisiteRelationsForSkill(
    subjectId,
    record?.skillId,
    record?.subskillId,
  );
  const declaredPrerequisites = new Set(
    Array.isArray(record?.prerequisiteSkillIds)
      ? record.prerequisiteSkillIds
      : [],
  );
  const missingPrerequisiteIds = relations
    .map((relation) => relation.prerequisiteSkillId)
    .filter((id) => !declaredPrerequisites.has(id));
  const unsupportedTags = (record?.expectedErrorTypes || []).filter((tag) =>
    UNSUPPORTED_EXPECTED_ERROR_TYPES.has(tag),
  );
  const invalidMetadata = [...issues].some((issue) =>
    INVALID_ISSUES.has(issue),
  );
  const patternMissing =
    !Array.isArray(record?.expectedErrorTypes) ||
    record.expectedErrorTypes.length === 0;
  const subskillMissing = !String(record?.subskillId || "").trim();
  const topicLevelOnly = !subskillMissing && isTopicLevelSubskill(record);
  const prerequisiteStatus =
    relations.length === 0
      ? "not_applicable"
      : missingPrerequisiteIds.length > 0
        ? "missing"
        : "complete";
  const coreComplete =
    !!String(subjectId || "").trim() &&
    !!String(record?.skillId || "").trim() &&
    !!String(record?.subskillId || "").trim() &&
    !!String(record?.difficulty || "").trim() &&
    !!String(record?.cognitiveLevel || "").trim() &&
    !patternMissing &&
    record?.hasCorrectAnswer === true &&
    record?.hasExplanation === true;
  return {
    recordId: record?.id || null,
    sourceFile: record?.sourceFile || null,
    subjectId: subjectId || null,
    skillId: record?.skillId || null,
    subskillId: record?.subskillId || null,
    metadataComplete:
      coreComplete &&
      !invalidMetadata &&
      unsupportedTags.length === 0 &&
      prerequisiteStatus !== "missing",
    topicLevelOnly,
    patternMissing,
    subskillMissing,
    prerequisiteStatus,
    prerequisiteNotApplicable: prerequisiteStatus === "not_applicable",
    prerequisiteMissing: prerequisiteStatus === "missing",
    missingPrerequisiteIds,
    unsupportedTag: unsupportedTags.length > 0,
    unsupportedTags,
    invalidMetadata,
    issueCodes: [...issues].sort(),
  };
}

export function summarizeQuestionMetadataCompleteness(records) {
  const rows = (records || []).map(classifyQuestionMetadataCompleteness);
  const count = (predicate) => rows.filter(predicate).length;
  return {
    records: rows.length,
    metadataComplete: count((row) => row.metadataComplete),
    topicLevelOnly: count((row) => row.topicLevelOnly),
    patternMissing: count((row) => row.patternMissing),
    subskillMissing: count((row) => row.subskillMissing),
    prerequisiteNotApplicable: count(
      (row) => row.prerequisiteNotApplicable,
    ),
    prerequisiteMissing: count((row) => row.prerequisiteMissing),
    prerequisiteComplete: count(
      (row) => row.prerequisiteStatus === "complete",
    ),
    unsupportedTag: count((row) => row.unsupportedTag),
    invalidMetadata: count((row) => row.invalidMetadata),
    rows,
  };
}
