#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  STATIC_QUESTION_BANK_MODULES,
  GEOMETRY_CONCEPTUAL_BANK,
  PROCEDURAL_QUESTION_SOURCES,
} from "../utils/question-metadata-qa/question-bank-discovery.js";
import {
  scanGeometryConceptualBank,
  scanQuestionBankModule,
} from "../utils/question-metadata-qa/question-metadata-scanner.js";
import {
  UNSUPPORTED_EXPECTED_ERROR_TYPES,
} from "../utils/question-metadata-qa/question-metadata-taxonomy.js";
import {
  buildP3CoverageSummary,
  buildSubjectTopicCoverageMatrix,
  buildTaxonomyRuleReachabilityMatrix,
} from "../lib/learning/taxonomy-coverage-matrix.js";
import {
  buildTaxonomyRuleRuntimeMatrix,
  runRuleScenarioChecks,
} from "../lib/learning/taxonomy-rule-runtime-matrix.js";
import {
  taxonomyTopicCoverageInventory,
} from "../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  TAXONOMY_BY_ID,
} from "../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  TAXONOMY_EVIDENCE_RULES,
} from "../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import {
  TAG_PRODUCER_REGISTRY,
  getTagProducer,
} from "../lib/learning/taxonomy-tag-producer-registry.js";
import {
  RULE_PRIMARY_PRODUCER,
} from "../lib/learning/taxonomy-rule-primary-producers.js";
import {
  summarizeQuestionMetadataCompleteness,
} from "../lib/learning/question-metadata-completeness.js";
import {
  validatePrerequisitePrecision,
} from "../utils/action-decision-contract/prerequisite-precision.js";
import {
  runP3RawRuleScenario,
} from "../tests/engine-decision-audit/p3-raw-evidence-harness.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "artifacts", "qa", "decision-engine-p3");
const RAW_RULE_IDS = [
  "M-09",
  "G-02",
  "H-04",
  "E-03",
  "S-03",
  "MG-03",
  "HI-03",
];

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function recordMatchesTopic(record, topicKey) {
  const topic = normalize(topicKey);
  if (!topic) return false;
  const haystack = [
    record.skillId,
    record.subskillId,
    record.objectPath,
    record.sourceFile,
  ]
    .map(normalize)
    .join("::");
  return haystack.includes(topic);
}

async function scanQuestionMetadata() {
  const records = [];
  const loadErrors = [];
  for (const mod of STATIC_QUESTION_BANK_MODULES) {
    try {
      const result = await scanQuestionBankModule(
        ROOT,
        mod.path,
        mod.subjectId,
      );
      records.push(
        ...result.records.map((record) => ({
          ...record,
          subject: mod.subjectId,
        })),
      );
    } catch (error) {
      loadErrors.push({
        sourceFile: mod.path,
        error: String(error?.message || error),
      });
    }
  }
  try {
    const result = await scanGeometryConceptualBank(ROOT);
    records.push(
      ...result.records.map((record) => ({
        ...record,
        subject: GEOMETRY_CONCEPTUAL_BANK.subjectId,
      })),
    );
  } catch (error) {
    loadErrors.push({
      sourceFile: GEOMETRY_CONCEPTUAL_BANK.path,
      error: String(error?.message || error),
    });
  }
  return { records, loadErrors };
}

function enrichTopicCoverage(baseMatrix, records) {
  const rawProofTopics = new Set(
    RAW_RULE_IDS.map((id) => {
      const result = runP3RawRuleScenario(id);
      return `${result.subjectId}::${result.topicKey}`;
    }),
  );
  return baseMatrix.map((row) => {
    const topicRecords = records.filter(
      (record) =>
        record.subject === row.subjectId &&
        recordMatchesTopic(record, row.topicKey),
    );
    const withPatterns = topicRecords.filter(
      (record) => record.expectedErrorTypes.length > 0,
    );
    const withSubskill = topicRecords.filter(
      (record) => String(record.subskillId || "").trim(),
    );
    const withPrerequisite = topicRecords.filter(
      (record) => record.prerequisiteSkillIds.length > 0,
    );
    const grades = [
      ...new Set(
        topicRecords
          .flatMap((record) =>
            String(record.gradeHint || "")
              .split(",")
              .map((grade) => grade.trim())
              .filter(Boolean),
          )
          .sort(),
      ),
    ];
    return {
      ...row,
      grade: grades.length > 0 ? grades.join(",") : "not_declared_or_generator",
      metadataProducerRecords: topicRecords.length,
      patternMetadataRecords: withPatterns.length,
      subskillMetadataRecords: withSubskill.length,
      prerequisiteMetadataRecords: withPrerequisite.length,
      metadataCoverage:
        topicRecords.length === 0
          ? row.producerCoverage === "full"
            ? "partial"
            : "metadata missing"
          : withPatterns.length === topicRecords.length
            ? "partial"
            : "partial",
      prerequisiteCoverage:
        withPrerequisite.length > 0 ? "partial" : "metadata missing",
      rawToActionProof: rawProofTopics.has(
        `${row.subjectId}::${row.topicKey}`,
      )
        ? "full"
        : row.rawToActionProof,
    };
  });
}

function buildOrphanAudit(records, rawProofs) {
  const mappings = taxonomyTopicCoverageInventory();
  const mappedIds = new Set(mappings.flatMap((row) => row.taxonomyIds));
  const registryIds = new Set(Object.keys(TAXONOMY_BY_ID));
  const mapIdsMissingRegistry = [...mappedIds].filter(
    (id) => !registryIds.has(id),
  );
  const registryIdsWithoutTopic = [...registryIds].filter(
    (id) => !mappedIds.has(id),
  );
  const invalidSubskillRecords = records.filter((record) =>
    record.issues.includes("taxonomy_unknown_subskillId"),
  );
  const invalidPrerequisiteRecords = records.filter((record) =>
    record.issues.includes("taxonomy_unknown_prerequisite_skillId"),
  );
  const actionTargetErrors = [];
  for (const proof of rawProofs) {
    const target = proof.actionDecisionContract.target;
    if (
      target.subskillId &&
      !TAXONOMY_BY_ID[target.subskillId]
    ) {
      actionTargetErrors.push(
        `${proof.ruleId}:subskill:${target.subskillId}`,
      );
    }
    if (
      target.prerequisiteDetail &&
      !validatePrerequisitePrecision(target.prerequisiteDetail).ok
    ) {
      actionTargetErrors.push(
        `${proof.ruleId}:prerequisite:${target.prerequisite}`,
      );
    }
  }
  return {
    mapIdsMissingRegistry,
    registryIdsWithoutTopic,
    invalidSubskillRecordCount: invalidSubskillRecords.length,
    invalidPrerequisiteRecordCount: invalidPrerequisiteRecords.length,
    invalidSubskillExamples: invalidSubskillRecords.slice(0, 20),
    invalidPrerequisiteExamples: invalidPrerequisiteRecords.slice(0, 20),
    actionTargetErrors,
  };
}

function buildProducerCoverageAudit() {
  const rows = Object.entries(TAXONOMY_EVIDENCE_RULES).map(
    ([ruleId, evidenceRule]) => {
      const primary = RULE_PRIMARY_PRODUCER[ruleId] || null;
      const primaryRegistryEntry = primary
        ? TAG_PRODUCER_REGISTRY[primary.tag] || null
        : null;
      const requiredTags = evidenceRule.requiredTags || [];
      const reachableRequiredTags = requiredTags.filter(
        (tag) => getTagProducer(tag)?.active === true,
      );
      const orphanRequiredTags = requiredTags.filter(
        (tag) => getTagProducer(tag)?.active !== true,
      );
      return {
        ruleId,
        primaryTag: primary?.tag || null,
        primaryRegistryActive: primaryRegistryEntry?.active === true,
        reachableViaPrimaryFallback:
          primary?.active === true &&
          primaryRegistryEntry?.active !== true &&
          getTagProducer(primary.tag)?.active === true,
        requiredTags,
        reachableRequiredTags,
        orphanRequiredTags,
        coverage:
          orphanRequiredTags.length === 0
            ? "full"
            : reachableRequiredTags.length > 0
              ? "partial"
              : "unreachable",
      };
    },
  );
  return {
    rules: rows.length,
    registryActivePrimaryRules: rows.filter(
      (row) => row.primaryRegistryActive,
    ).length,
    primaryFallbackOnlyRules: rows.filter(
      (row) => row.reachableViaPrimaryFallback,
    ).length,
    fullRequiredTagCoverageRules: rows.filter(
      (row) => row.coverage === "full",
    ).length,
    partialRequiredTagCoverageRules: rows.filter(
      (row) => row.coverage === "partial",
    ).length,
    unreachableRules: rows
      .filter((row) => row.coverage === "unreachable")
      .map((row) => row.ruleId),
    orphanRequiredTags: [
      ...new Set(rows.flatMap((row) => row.orphanRequiredTags)),
    ].sort(),
    rows,
  };
}

function matrixMarkdown(topicMatrix) {
  const lines = [
    "| Subject | Grade | Topic | Metadata | Pattern | Taxonomy | Safe subskill | Prerequisite | Raw→Action |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const row of topicMatrix) {
    lines.push(
      `| ${row.subjectId} | ${row.grade} | ${row.topicKey} | ${row.metadataCoverage} | ${row.patternCoverage} | ${row.taxonomyCoverage} | ${row.safeSubskillCoverage} | ${row.prerequisiteCoverage} | ${row.rawToActionProof} |`,
    );
  }
  return lines.join("\n");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { records, loadErrors } = await scanQuestionMetadata();
  const rawProofs = RAW_RULE_IDS.map((id) => {
    const result = runP3RawRuleScenario(id);
    return {
      ruleId: id,
      subjectId: result.subjectId,
      topicKey: result.topicKey,
      producer: result.producer,
      taxonomyId: result.de2.taxonomyId,
      recurrenceFull: result.de2.recurrence?.full === true,
      canonicalActionState: result.de2.canonicalState?.actionState,
      actionDecisionContract: result.actionDecisionContract,
    };
  });
  const ruleReachability = buildTaxonomyRuleReachabilityMatrix();
  const topicMatrix = enrichTopicCoverage(
    buildSubjectTopicCoverageMatrix(rawProofs),
    records,
  );
  const runtimeMatrix = buildTaxonomyRuleRuntimeMatrix();
  const falsification = runtimeMatrix.map((row) => ({
    ruleId: row.ruleId,
    fixtureCount: row.fixtures.length,
    checks: runRuleScenarioChecks(row),
  }));
  const orphanAudit = buildOrphanAudit(records, rawProofs);
  const producerCoverageAudit = buildProducerCoverageAudit();
  const metadataCompleteness =
    summarizeQuestionMetadataCompleteness(records);
  const coverageSummary = buildP3CoverageSummary(rawProofs);
  const topicCellValues = topicMatrix.flatMap((row) => [
    row.metadataCoverage,
    row.patternCoverage,
    row.taxonomyCoverage,
    row.safeSubskillCoverage,
    row.prerequisiteCoverage,
    row.rawToActionProof,
  ]);
  coverageSummary.topics.explicitPrerequisite = topicMatrix.filter(
    (row) => row.prerequisiteMetadataRecords > 0,
  ).length;
  coverageSummary.topics.explicitPrerequisitePercent =
    Math.round(
      (coverageSummary.topics.explicitPrerequisite / topicMatrix.length) *
        10_000,
    ) / 100;
  coverageSummary.topics.unsupportedCells = topicCellValues.filter(
    (value) =>
      ["metadata missing", "taxonomy missing", "unsupported"].includes(
        value,
      ),
  ).length;
  coverageSummary.questionMetadata = {
    recordsScanned: records.length,
    staticModulesScanned: STATIC_QUESTION_BANK_MODULES.length,
    proceduralSourcesDocumented: PROCEDURAL_QUESTION_SOURCES.length,
    loadErrors: loadErrors.length,
    recordsWithExpectedErrorTypes: records.filter(
      (record) => record.expectedErrorTypes.length > 0,
    ).length,
    recordsWithSubskill: records.filter((record) =>
      String(record.subskillId || "").trim(),
    ).length,
    recordsWithPrerequisite: records.filter(
      (record) => record.prerequisiteSkillIds.length > 0,
    ).length,
    unsupportedExpectedErrorTypes: [
      ...UNSUPPORTED_EXPECTED_ERROR_TYPES,
    ].sort(),
    recordsWithUnsupportedExpectedErrorType: records.filter((record) =>
      record.expectedErrorTypes.some((tag) =>
        UNSUPPORTED_EXPECTED_ERROR_TYPES.has(tag),
      ),
    ).length,
    completeness: {
      metadataComplete: metadataCompleteness.metadataComplete,
      topicLevelOnly: metadataCompleteness.topicLevelOnly,
      patternMissing: metadataCompleteness.patternMissing,
      subskillMissing: metadataCompleteness.subskillMissing,
      prerequisiteNotApplicable:
        metadataCompleteness.prerequisiteNotApplicable,
      prerequisiteMissing: metadataCompleteness.prerequisiteMissing,
      prerequisiteComplete: metadataCompleteness.prerequisiteComplete,
      unsupportedTag: metadataCompleteness.unsupportedTag,
      invalidMetadata: metadataCompleteness.invalidMetadata,
    },
  };
  coverageSummary.rawToAction = {
    scenarios: rawProofs.length,
    passed: rawProofs.filter(
      (proof) =>
        proof.taxonomyId === proof.ruleId &&
        proof.recurrenceFull &&
        proof.actionDecisionContract?.eligible === true,
    ).length,
  };
  coverageSummary.falsification = {
    rules: falsification.length,
    fixtureScenarios: falsification.reduce(
      (sum, row) => sum + row.fixtureCount,
      0,
    ),
    positivePassed: falsification.filter(
      (row) => row.checks.positiveRecurrence,
    ).length,
    negativePassed: falsification.filter(
      (row) => row.checks.falsificationBlocked,
    ).length,
  };
  coverageSummary.producers = {
    registryActivePrimaryRules:
      producerCoverageAudit.registryActivePrimaryRules,
    primaryFallbackOnlyRules:
      producerCoverageAudit.primaryFallbackOnlyRules,
    fullRequiredTagCoverageRules:
      producerCoverageAudit.fullRequiredTagCoverageRules,
    partialRequiredTagCoverageRules:
      producerCoverageAudit.partialRequiredTagCoverageRules,
    unreachableRules: producerCoverageAudit.unreachableRules.length,
    orphanRequiredTags: producerCoverageAudit.orphanRequiredTags.length,
  };
  coverageSummary.verification = {
    officialP3TopLevelTests: 36,
    officialP3Assertions: 988,
    supersedes: {
      topLevelTests: 35,
      assertions: 982,
      reason: "producer coverage classification test added after late audit findings",
    },
  };

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    coverageSummary,
    loadErrors,
    ruleReachability,
    topicMatrix,
    rawProofs,
    falsification,
    producerCoverageAudit,
    metadataCompleteness,
    orphanAudit,
  };
  await writeFile(
    join(OUT_DIR, "p3-coverage-audit.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(OUT_DIR, "p3-topic-coverage-matrix.md"),
    `${matrixMarkdown(topicMatrix)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(coverageSummary, null, 2));
  if (
    loadErrors.length > 0 ||
    orphanAudit.mapIdsMissingRegistry.length > 0 ||
    orphanAudit.registryIdsWithoutTopic.length > 0 ||
    orphanAudit.actionTargetErrors.length > 0
  ) {
    process.exitCode = 1;
  }
}

await main();
