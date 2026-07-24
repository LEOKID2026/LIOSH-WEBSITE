import { taxonomyIdsForReportBucket } from "../diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  curriculumSkillEntity,
  isRegisteredCurriculumSkill,
} from "../curriculum-skill-entity-registry.js";
import {
  hasContentForSkill,
  hasExactSkillConsumer,
} from "../../lib/learning/prerequisite-content-source.js";

export const PREREQUISITE_PRECISION = Object.freeze([
  "exact_skill",
  "exact_topic",
  "grade_foundation_area",
  "generic_foundation_review",
]);

// docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (Part 2,
// round 4): a skill must be (1) registered, (2) actually servable by a real
// question bank, AND (3) actually consumed at runtime by that subject's
// master page — before exact_skill can be produced. (3) is deliberately
// checked separately from (2): a subject can have real bank content for a
// skill while its master's question-generation loop still doesn't read
// contentOverrideTarget yet (currently true for hebrew/science — see
// hasExactSkillConsumer). A contract must never promise an action nothing
// will actually execute; unsupported subjects fall through to
// grade_foundation_area/generic_foundation_review below.
function exactSkillCandidate(ids, subjectId) {
  if (!hasExactSkillConsumer(subjectId)) return null;
  for (const raw of ids) {
    const id = String(raw || "").trim();
    if (
      id &&
      isRegisteredCurriculumSkill(id, subjectId) &&
      hasContentForSkill(id, subjectId)
    ) {
      return id;
    }
  }
  return null;
}

/**
 * Resolve prerequisite precision without promoting a grade key into a skill id.
 * @param {{
 *   subjectId: string,
 *   topicKey: string,
 *   grade?: Record<string, unknown>,
 *   v3?: Record<string, unknown>,
 *   prerequisiteSignal?: Record<string, unknown>
 * }} input
 */
export function resolvePrerequisitePrecision(input) {
  const subjectId = String(input?.subjectId || "");
  const topicKey = String(input?.topicKey || "");
  const grade = input?.grade && typeof input.grade === "object" ? input.grade : {};
  const v3 = input?.v3 && typeof input.v3 === "object" ? input.v3 : {};
  const signal =
    input?.prerequisiteSignal && typeof input.prerequisiteSignal === "object"
      ? input.prerequisiteSignal
      : {};
  const declaredSkillIds = Array.isArray(signal.prerequisiteSkillIds)
    ? signal.prerequisiteSkillIds
    : [];
  const skillId = exactSkillCandidate([
    v3.prerequisiteSkill,
    ...declaredSkillIds,
  ], subjectId);
  if (skillId) {
    const entity = curriculumSkillEntity(skillId);
    return {
      id: skillId,
      label: entity.label,
      precision: "exact_skill",
      entityType: "curriculum_skill",
      confidence: entity.confidence,
      reasonCode: "prerequisite:exact_curriculum_skill",
      source: v3.prerequisiteSkill === skillId
        ? "v3.prerequisiteSkill"
        : "mistake_metadata.prerequisiteSkillIds",
      entityValidated: true,
      // docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md
      // (Part 3): registered curriculum skills declare their own real
      // content topicKey — surfaced here so the executor can actually
      // route question selection to it (previously it referenced a
      // contract.target.prerequisiteTopic field that nothing ever set).
      topicKey: entity.topicKey || null,
    };
  }

  const explicitTopic = String(signal.prerequisiteTopicKey || "").trim();
  if (
    explicitTopic &&
    taxonomyIdsForReportBucket(subjectId, explicitTopic).length > 0
  ) {
    return {
      id: explicitTopic,
      label: explicitTopic,
      precision: "exact_topic",
      entityType: "topic",
      confidence: "medium",
      reasonCode: "prerequisite:exact_mapped_topic",
      source: "mistake_metadata.prerequisiteTopicKey",
      entityValidated: true,
    };
  }

  const contentGradeKey = String(grade.contentGradeKey || "").trim();
  if (grade.relation === "lower" && contentGradeKey) {
    return {
      id: topicKey,
      label: topicKey,
      precision: "grade_foundation_area",
      entityType: "topic_foundation_area",
      gradeKey: contentGradeKey,
      confidence: "medium",
      reasonCode:
        declaredSkillIds.length > 0
          ? "prerequisite:declared_skill_unregistered_grade_fallback"
          : "prerequisite:grade_foundation_area_not_exact_skill",
      source: "de2.gradeEvidence",
      entityValidated: taxonomyIdsForReportBucket(subjectId, topicKey).length > 0,
      unsupportedDeclaredSkillIds: declaredSkillIds
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    };
  }

  return {
    id: topicKey,
    label: topicKey,
    precision: "generic_foundation_review",
    entityType: "topic_foundation_area",
    confidence: "low",
    reasonCode:
      declaredSkillIds.length > 0
        ? "prerequisite:declared_skill_unregistered_generic_fallback"
        : "prerequisite:generic_foundation_review",
    source: "canonical_foundation_risk",
    entityValidated: taxonomyIdsForReportBucket(subjectId, topicKey).length > 0,
    unsupportedDeclaredSkillIds: declaredSkillIds
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  };
}

export function validatePrerequisitePrecision(detail) {
  const value = detail && typeof detail === "object" ? detail : {};
  const errors = [];
  if (!PREREQUISITE_PRECISION.includes(String(value.precision || ""))) {
    errors.push("prerequisite_precision_invalid");
  }
  if (!String(value.id || "").trim()) errors.push("prerequisite_id_missing");
  if (!String(value.reasonCode || "").startsWith("prerequisite:")) {
    errors.push("prerequisite_reason_missing");
  }
  if (!["high", "medium", "low"].includes(String(value.confidence || ""))) {
    errors.push("prerequisite_confidence_invalid");
  }
  if (
    value.precision === "exact_skill" &&
    !isRegisteredCurriculumSkill(value.id)
  ) {
    errors.push("exact_prerequisite_skill_not_registered");
  }
  if (
    value.precision === "grade_foundation_area" &&
    value.entityType === "taxonomy_skill"
  ) {
    errors.push("grade_fallback_misrepresented_as_exact_skill");
  }
  return { ok: errors.length === 0, errors };
}
