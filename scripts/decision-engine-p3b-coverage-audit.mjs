#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  STATIC_QUESTION_BANK_MODULES,
  GEOMETRY_CONCEPTUAL_BANK,
} from "../utils/question-metadata-qa/question-bank-discovery.js";
import {
  scanGeometryConceptualBank,
  scanQuestionBankModule,
} from "../utils/question-metadata-qa/question-metadata-scanner.js";
import {
  taxonomyTopicCoverageInventory,
} from "../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  TAXONOMY_BY_ID,
} from "../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  REAL_RUNTIME_SCENARIOS,
} from "../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";
import {
  realTopicProofRule,
  topicGradeAvailability,
} from "../lib/learning/p3b-real-topic-proof-registry.js";
import {
  runP3RawMissingMetadataScenario,
  runP3RawRuleScenario,
  runP3RawTopicProducerScenario,
} from "../tests/engine-decision-audit/p3-raw-evidence-harness.mjs";
import {
  getP3BTopicClosureProducer,
} from "../lib/learning/p3b-topic-closure-producers.js";
import {
  summarizeQuestionMetadataCompleteness,
} from "../lib/learning/question-metadata-completeness.js";
import {
  TAXONOMY_REQUIRED_TAG_STATUS,
} from "../utils/diagnostic-engine-v2/taxonomy-required-tag-status.js";
import {
  CURRICULUM_PREREQUISITE_RELATIONS,
  CURRICULUM_SKILL_ENTITY_REGISTRY,
} from "../utils/curriculum-skill-entity-registry.js";
import {
  TAXONOMY_RECURRENCE_POLICY,
  TAXONOMY_RECURRENCE_POLICY_VERSION,
} from "../utils/diagnostic-engine-v2/taxonomy-recurrence-policy.js";
import {
  DIAGNOSTIC_EVIDENCE_ELIGIBILITY_VERSION,
} from "../utils/diagnostic-evidence-eligibility.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "artifacts", "qa", "decision-engine-p3b");

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function recordMatchesTopic(record, topicKey) {
  const topic = normalize(topicKey);
  const haystack = [
    record.skillId,
    record.subskillId,
    record.objectPath,
    record.sourceFile,
  ]
    .map(normalize)
    .join("::");
  return !!topic && haystack.includes(topic);
}

async function scanRecords() {
  const records = [];
  const loadErrors = [];
  for (const mod of STATIC_QUESTION_BANK_MODULES) {
    try {
      const result = await scanQuestionBankModule(
        ROOT,
        mod.path,
        mod.subjectId,
      );
      records.push(...result.records);
    } catch (error) {
      loadErrors.push({ source: mod.path, error: String(error?.message || error) });
    }
  }
  try {
    const geometry = await scanGeometryConceptualBank(
      ROOT,
      GEOMETRY_CONCEPTUAL_BANK.path,
      GEOMETRY_CONCEPTUAL_BANK.subjectId,
    );
    records.push(...geometry.records);
  } catch (error) {
    loadErrors.push({
      source: GEOMETRY_CONCEPTUAL_BANK.path,
      error: String(error?.message || error),
    });
  }
  return { records, loadErrors };
}

function wrongTopicProof(row) {
  const wrongScenario = REAL_RUNTIME_SCENARIOS.find(
    (scenario) =>
      TAXONOMY_BY_ID[scenario.ruleId]?.subjectId === row.subjectId &&
      !row.taxonomyIds.includes(scenario.ruleId),
  );
  if (!wrongScenario) {
    return {
      status: "unsupported",
      reasonCode: "wrong_topic:no_non_candidate_rule_fixture",
    };
  }
  const result = runP3RawRuleScenario(wrongScenario.ruleId, {
    topicKeyOverride: row.topicKey,
  });
  return {
    status:
      result.de2.taxonomyId !== wrongScenario.ruleId ? "passed" : "failed",
    sourceRuleId: wrongScenario.ruleId,
    selectedTaxonomyId: result.de2.taxonomyId,
  };
}

function buildTopicProof(row) {
  if (row.topicKey === "mixed") {
    const result = runP3RawMissingMetadataScenario(
      row.subjectId,
      row.topicKey,
    );
    const target = result.actionDecisionContract.target;
    return {
      status:
        !target.subskillId && !target.subskill ? "mixed_safe_fallback" : "failed",
      proofType: "mixed_safety",
      ruleId: null,
      producer: null,
      taxonomyId: result.de2.taxonomyId,
      action: result.actionDecisionContract.action,
      target,
      reasonCode: "topic:mixed_specificity_blocked",
    };
  }
  const closureProducer = getP3BTopicClosureProducer(
    row.subjectId,
    row.topicKey,
  );
  if (closureProducer) {
    const result = runP3RawTopicProducerScenario(closureProducer);
    const targetTopic = result.actionDecisionContract?.target?.topic;
    const passed =
      result.de2.taxonomyId === closureProducer.ruleId &&
      result.de2.recurrence?.full === true &&
      targetTopic === closureProducer.canonicalTopic;
    return {
      status: passed ? "passed" : "failed",
      proofType: "real_topic_question_producer",
      ruleId: closureProducer.ruleId,
      producer: result.producer,
      taxonomyId: result.de2.taxonomyId,
      recurrenceFull: result.de2.recurrence?.full === true,
      canonicalActionState: result.de2.canonicalState?.actionState,
      action: result.actionDecisionContract?.action,
      target: result.actionDecisionContract?.target,
      canonicalTopic: closureProducer.canonicalTopic,
      reasonCode: passed
        ? "topic:real_question_to_action_proven"
        : "topic:real_question_to_action_failed",
    };
  }
  const ruleId = realTopicProofRule(row);
  if (!ruleId) {
    return {
      status: "unsupported",
      proofType: "none",
      ruleId: null,
      producer: null,
      reasonCode: "topic:no_topic_specific_real_producer_fixture",
      candidateRuleIds: row.taxonomyIds,
    };
  }
  const result = runP3RawRuleScenario(ruleId, {
    topicKeyOverride: row.topicKey,
  });
  const passed =
    result.de2.taxonomyId === ruleId &&
    result.de2.recurrence?.full === true &&
    result.actionDecisionContract?.target?.topic === row.topicKey;
  return {
    status: passed ? "passed" : "failed",
    proofType: "real_topic_producer",
    ruleId,
    producer: result.producer,
    taxonomyId: result.de2.taxonomyId,
    recurrenceFull: result.de2.recurrence?.full === true,
    canonicalActionState: result.de2.canonicalState?.actionState,
    action: result.actionDecisionContract.action,
    target: result.actionDecisionContract.target,
    reasonCode: passed
      ? "topic:real_raw_to_action_proven"
      : "topic:real_raw_to_action_failed",
  };
}

function topicMarkdown(rows) {
  const lines = [
    "| Subject | Topic | Grades | Grade evidence | Raw→Action | Rule | Wrong-topic | Reason |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.subjectId} | ${row.topicKey} | ${row.gradeKeys.join(",") || "unproven"} | ${row.gradeEvidence} | ${row.rawToAction.status} | ${row.rawToAction.ruleId || "—"} | ${row.wrongTopic.status} | ${row.rawToAction.reasonCode} |`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function summarizeBySubject(rows) {
  const out = {};
  for (const row of rows) {
    const summary = out[row.subjectId] || {
      topics: 0,
      rawToActionPassed: 0,
      mixedSafeFallback: 0,
      explicitlyUnsupported: 0,
      withDeclaredGradeEvidence: 0,
    };
    summary.topics += 1;
    if (row.rawToAction.status === "passed") summary.rawToActionPassed += 1;
    if (row.rawToAction.status === "mixed_safe_fallback") {
      summary.mixedSafeFallback += 1;
    }
    if (row.rawToAction.status === "unsupported") {
      summary.explicitlyUnsupported += 1;
    }
    if (row.gradeKeys.length > 0) {
      summary.withDeclaredGradeEvidence += 1;
    }
    out[row.subjectId] = summary;
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const { records, loadErrors } = await scanRecords();
  const inventory = taxonomyTopicCoverageInventory();
  const topicRows = inventory.map((row) => {
    const matchedRecords = records.filter(
      (record) =>
        normalize(record.subjectHint || record.subject) ===
          normalize(row.subjectId) &&
        recordMatchesTopic(record, row.topicKey),
    );
    const gradeAvailability = topicGradeAvailability(
      row.subjectId,
      row.topicKey,
    );
    const grades = gradeAvailability.gradeKeys;
    return {
      ...row,
      gradeKeys: grades,
      gradeEvidence: gradeAvailability.status,
      gradeEvidenceSource: gradeAvailability.source,
      gradeReasonCode: gradeAvailability.reasonCode,
      sourceTopicKey: gradeAvailability.sourceTopicKey || null,
      sourceTopicGradeKeys:
        gradeAvailability.sourceTopicGradeKeys || [],
      metadataRecordCount: matchedRecords.length,
      metadataSources: [...new Set(matchedRecords.map((record) => record.sourceFile))].sort(),
      taxonomyGradeConstraintStatus:
        grades.length > 0
          ? "topic_availability_only_not_rule_validity"
          : "unsupported_no_grade_constraint",
      provenModes: ["practice"],
      unprovenModes: [
        "graded",
        "drill",
        "review",
        "quiz",
        "homework",
        "worksheet",
        "challenge",
        "speed",
        "marathon",
      ],
      rawToAction: buildTopicProof(row),
      wrongTopic: wrongTopicProof(row),
    };
  });
  const metadataCompleteness =
    summarizeQuestionMetadataCompleteness(records);
  const requiredTagRows = Object.values(TAXONOMY_REQUIRED_TAG_STATUS);
  const recurrencePolicies = Object.values(TAXONOMY_RECURRENCE_POLICY);
  const recurrenceFamilies = Object.fromEntries(
    [...new Set(recurrencePolicies.map((policy) => policy.family))]
      .sort()
      .map((family) => [
        family,
        recurrencePolicies.filter((policy) => policy.family === family).length,
      ]),
  );
  const summary = {
    officialP3Baseline: {
      topLevelTests: 36,
      assertions: 988,
    },
    topics: {
      total: topicRows.length,
      rawToActionPassed: topicRows.filter(
        (row) => row.rawToAction.status === "passed",
      ).length,
      mixedSafeFallback: topicRows.filter(
        (row) => row.rawToAction.status === "mixed_safe_fallback",
      ).length,
      explicitlyUnsupported: topicRows.filter(
        (row) => row.rawToAction.status === "unsupported",
      ).length,
      failed: topicRows.filter((row) => row.rawToAction.status === "failed")
        .length,
      wrongTopicPassed: topicRows.filter(
        (row) => row.wrongTopic.status === "passed",
      ).length,
      withDeclaredGradeEvidence: topicRows.filter(
        (row) => row.gradeKeys.length > 0,
      ).length,
      withoutDeclaredGradeEvidence: topicRows.filter(
        (row) => row.gradeKeys.length === 0,
      ).length,
      unexplainedUnsupported: topicRows.filter(
        (row) =>
          row.rawToAction.status === "unsupported" &&
          !row.rawToAction.reasonCode,
      ).length,
    },
    bySubject: summarizeBySubject(topicRows),
    tags: {
      totalRequired: requiredTagRows.length,
      active: requiredTagRows.filter((row) => row.status === "active").length,
      explicitlyUnsupported: requiredTagRows.filter(
        (row) => row.status === "unsupported_unproduced",
      ).length,
      unclassified: requiredTagRows.filter(
        (row) =>
          row.status !== "active" &&
          row.status !== "unsupported_unproduced",
      ).length,
    },
    prerequisites: {
      entities: Object.keys(CURRICULUM_SKILL_ENTITY_REGISTRY).length,
      relations: CURRICULUM_PREREQUISITE_RELATIONS.length,
      declarationsScanned: records.filter(
        (record) => record.prerequisiteSkillIds.length > 0,
      ).length,
      missingWhereApplicable: metadataCompleteness.prerequisiteMissing,
      notApplicable: metadataCompleteness.prerequisiteNotApplicable,
    },
    recurrence: {
      contractVersion: TAXONOMY_RECURRENCE_POLICY_VERSION,
      rules: recurrencePolicies.length,
      families: recurrenceFamilies,
      minimumSessionsForSubskill: 2,
      stalePatternBehavior: "topic_level_only",
      counterEvidenceBehavior: "block_subskill",
    },
    evidenceEligibility: {
      contractVersion: DIAGNOSTIC_EVIDENCE_ELIGIBILITY_VERSION,
      consumers: [
        "DE2",
        "V3",
        "LPD",
        "unifiedDecisionContext",
        "subskillSafety",
      ],
    },
    metadata: {
      records: metadataCompleteness.records,
      metadataComplete: metadataCompleteness.metadataComplete,
      topicLevelOnly: metadataCompleteness.topicLevelOnly,
      patternMissing: metadataCompleteness.patternMissing,
      subskillMissing: metadataCompleteness.subskillMissing,
      unsupportedTag: metadataCompleteness.unsupportedTag,
      invalidMetadata: metadataCompleteness.invalidMetadata,
    },
    loadErrors: loadErrors.length,
  };
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary,
    topicRows,
    requiredTagRows,
    prerequisiteEntities: CURRICULUM_SKILL_ENTITY_REGISTRY,
    prerequisiteRelations: CURRICULUM_PREREQUISITE_RELATIONS,
    recurrencePolicies: TAXONOMY_RECURRENCE_POLICY,
    metadataCompleteness,
    loadErrors,
  };
  await writeFile(
    join(OUT_DIR, "p3b-coverage-closure.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(OUT_DIR, "p3b-topic-grade-matrix.md"),
    topicMarkdown(topicRows),
    "utf8",
  );
  console.log(JSON.stringify(summary, null, 2));
  if (
    loadErrors.length > 0 ||
    summary.topics.failed > 0 ||
    summary.tags.unclassified > 0
  ) {
    process.exitCode = 1;
  }
}

await main();
