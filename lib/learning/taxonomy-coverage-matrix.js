import {
  taxonomyTopicCoverageInventory,
} from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  TAXONOMY_EVIDENCE_RULES,
} from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import {
  TAXONOMY_BY_ID,
} from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  RULE_PRIMARY_PRODUCER,
} from "./taxonomy-rule-primary-producers.js";
import {
  REAL_RUNTIME_SCENARIOS,
} from "./fixtures/taxonomy-real-runtime-fixtures.js";

export const P3_COVERAGE_CLASSIFICATIONS = Object.freeze([
  "full",
  "partial",
  "topic-level only",
  "metadata missing",
  "taxonomy missing",
  "subskill unsafe",
  "unsupported",
  "not applicable",
]);

export function buildTaxonomyRuleReachabilityMatrix() {
  const realScenarioIds = new Set(
    REAL_RUNTIME_SCENARIOS.map((scenario) => scenario.ruleId),
  );
  return Object.keys(TAXONOMY_EVIDENCE_RULES)
    .sort()
    .map((taxonomyId) => {
      const producer = RULE_PRIMARY_PRODUCER[taxonomyId] || null;
      const taxonomy = TAXONOMY_BY_ID[taxonomyId] || null;
      const rule = TAXONOMY_EVIDENCE_RULES[taxonomyId];
      const realRuntimeProof = realScenarioIds.has(taxonomyId);
      const active =
        !!taxonomy &&
        producer?.active === true &&
        realRuntimeProof;
      return {
        taxonomyId,
        subjectId: taxonomy?.subjectId || null,
        topicHe: taxonomy?.topicHe || null,
        subskillHe: taxonomy?.subskillHe || null,
        evidenceSource: rule.evidenceSource,
        requiredTags: [...rule.requiredTags],
        producer,
        realRuntimeProof,
        status: active
          ? "active_reachable"
          : producer?.active
            ? "test_only_or_metadata_gap"
            : producer
              ? "unreachable"
              : "unmarked",
      };
    });
}

export function buildSubjectTopicCoverageMatrix(rawProofs = []) {
  const proofTopicKeys = new Set(
    rawProofs
      .filter(
        (proof) =>
          proof &&
          typeof proof === "object" &&
          proof.subjectId &&
          proof.topicKey,
      )
      .map((proof) => `${proof.subjectId}::${proof.topicKey}`),
  );
  const reachabilityById = new Map(
    buildTaxonomyRuleReachabilityMatrix().map((row) => [
      row.taxonomyId,
      row,
    ]),
  );
  return taxonomyTopicCoverageInventory().map((mapping) => {
    const ruleRows = mapping.taxonomyIds.map((id) =>
      reachabilityById.get(id),
    );
    const allReachable =
      ruleRows.length > 0 &&
      ruleRows.every((row) => row?.status === "active_reachable");
    const hasRawProof = proofTopicKeys.has(
      `${mapping.subjectId}::${mapping.topicKey}`,
    );
    return {
      subjectId: mapping.subjectId,
      grade: "varies_by_question_source",
      topicKey: mapping.topicKey,
      mode: "practice_or_diagnostic",
      taxonomyIds: [...mapping.taxonomyIds],
      metadataCoverage: allReachable ? "partial" : "metadata missing",
      patternCoverage: allReachable ? "full" : "partial",
      taxonomyCoverage: allReachable ? "full" : "taxonomy missing",
      safeSubskillCoverage:
        mapping.topicKey === "mixed"
          ? "subskill unsafe"
          : hasRawProof
            ? "full"
            : "partial",
      prerequisiteCoverage: "partial",
      rawToActionProof:
        hasRawProof
          ? "full"
          : allReachable
            ? "partial"
            : "unsupported",
      producerCoverage: allReachable ? "full" : "partial",
      consumerCoverage: "full",
    };
  });
}

export function buildP3CoverageSummary(rawProofs = []) {
  const rules = buildTaxonomyRuleReachabilityMatrix();
  const topics = buildSubjectTopicCoverageMatrix(rawProofs);
  const percentage = (num, den) =>
    den > 0 ? Math.round((num / den) * 10_000) / 100 : 0;
  return {
    rules: {
      total: rules.length,
      activeReachable: rules.filter(
        (row) => row.status === "active_reachable",
      ).length,
      activeReachablePercent: percentage(
        rules.filter((row) => row.status === "active_reachable").length,
        rules.length,
      ),
    },
    topics: {
      total: topics.length,
      metadataProducer: topics.filter(
        (row) => ["full", "partial"].includes(row.metadataCoverage),
      ).length,
      metadataProducerPercent: percentage(
        topics.filter((row) =>
          ["full", "partial"].includes(row.metadataCoverage),
        ).length,
        topics.length,
      ),
      fullMetadataCoverage: topics.filter(
        (row) => row.metadataCoverage === "full",
      ).length,
      activeTaxonomy: topics.filter(
        (row) => row.taxonomyCoverage === "full",
      ).length,
      activeTaxonomyPercent: percentage(
        topics.filter((row) => row.taxonomyCoverage === "full").length,
        topics.length,
      ),
      safeSubskillPath: topics.filter(
        (row) => row.safeSubskillCoverage === "full",
      ).length,
      safeSubskillPathPercent: percentage(
        topics.filter((row) => row.safeSubskillCoverage === "full").length,
        topics.length,
      ),
      explicitPrerequisite: 0,
      explicitPrerequisitePercent: 0,
      rawToActionProof: topics.filter(
        (row) => row.rawToActionProof === "full",
      ).length,
      rawToActionProofPercent: percentage(
        topics.filter((row) => row.rawToActionProof === "full").length,
        topics.length,
      ),
      unsupportedCells: topics.reduce(
        (count, row) =>
          count +
          [
            row.metadataCoverage,
            row.patternCoverage,
            row.taxonomyCoverage,
            row.safeSubskillCoverage,
            row.prerequisiteCoverage,
            row.rawToActionProof,
          ].filter((value) =>
            ["metadata missing", "taxonomy missing", "unsupported"].includes(
              value,
            ),
          ).length,
        0,
      ),
    },
  };
}
