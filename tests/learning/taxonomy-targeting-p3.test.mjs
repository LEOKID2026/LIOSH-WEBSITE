import test from "node:test";
import nodeAssert from "node:assert/strict";

import {
  ALL_TAXONOMY_ROWS,
  TAXONOMY_BY_ID,
} from "../../utils/diagnostic-engine-v2/taxonomy-registry.js";
import {
  TAXONOMY_EVIDENCE_RULES,
  eventMatchesEvidenceRule,
} from "../../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import {
  evaluateEvidenceRecurrence,
} from "../../utils/diagnostic-engine-v2/evidence-recurrence.js";
import {
  taxonomyIdsForReportBucket,
  taxonomyTopicCoverageInventory,
} from "../../utils/diagnostic-engine-v2/topic-taxonomy-bridge.js";
import {
  RULE_PRIMARY_PRODUCER,
} from "../../lib/learning/taxonomy-rule-primary-producers.js";
import {
  TAG_PRODUCER_REGISTRY,
  getTagProducer,
} from "../../lib/learning/taxonomy-tag-producer-registry.js";
import {
  REAL_RUNTIME_SCENARIOS,
  classifyRealRuntimeScenario,
} from "../../lib/learning/fixtures/taxonomy-real-runtime-fixtures.js";
import {
  buildP3CoverageSummary,
  buildSubjectTopicCoverageMatrix,
  buildTaxonomyRuleReachabilityMatrix,
  P3_COVERAGE_CLASSIFICATIONS,
} from "../../lib/learning/taxonomy-coverage-matrix.js";
import {
  assessSubskillCandidateSafety,
  SUBSKILL_SAFETY_CONTRACT_VERSION,
} from "../../utils/subskill-candidate-safety.js";
import {
  buildActionDecisionContractV2,
  validateActionDecisionContractV2,
} from "../../utils/action-decision-contract/action-decision-contract-v2.js";
import {
  validatePrerequisitePrecision,
} from "../../utils/action-decision-contract/prerequisite-precision.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import {
  UNSUPPORTED_EXPECTED_ERROR_TYPES,
} from "../../utils/question-metadata-qa/question-metadata-taxonomy.js";
import {
  runP3RawMissingMetadataScenario,
  runP3RawRuleScenario,
} from "../engine-decision-audit/p3-raw-evidence-harness.mjs";

const RAW_RULES = [
  "M-09",
  "G-02",
  "H-04",
  "E-03",
  "S-03",
  "MG-03",
  "HI-03",
];
const RAW_PROOF_TOPICS = [
  { subjectId: "math", topicKey: "subtraction" },
  { subjectId: "geometry", topicKey: "angles" },
  { subjectId: "hebrew", topicKey: "comprehension" },
  { subjectId: "english", topicKey: "translation" },
  { subjectId: "science", topicKey: "body" },
  { subjectId: "moledet-geography", topicKey: "citizenship" },
  { subjectId: "history", topicKey: "hellenism_jews" },
];
let p3AssertionCount = 0;
const assert = new Proxy(nodeAssert, {
  get(target, property) {
    const value = target[property];
    if (typeof value !== "function") return value;
    return (...args) => {
      p3AssertionCount += 1;
      return value(...args);
    };
  },
});

function canonical(overrides = {}) {
  return {
    actionState: "intervene",
    recommendation: {
      allowed: true,
      intensityCap: "RI2",
      reasonCodes: ["test:authorized"],
    },
    ...overrides,
  };
}

function actionContext(overrides = {}) {
  return {
    authority: { actionEligible: true },
    evidenceEligibility: { action: true },
    signals: {
      trend: { direction: "stable", eligible: true },
      timing: { eligible: true, fastWrongCount: 0 },
      assistance: { evidenceMode: "independent", eligible: true },
      grade: {
        relation: "same",
        foundationRisk: false,
        caveatNeeded: false,
        contentGradeKey: "g4",
      },
      pattern: { eligible: false },
      subskill: { eligible: false, safe: false, candidate: null },
      prerequisite: {
        prerequisiteSkillIds: [],
        independentEvidenceCount: 8,
        probeEvidenceSupported: false,
      },
      sessions: { crossSessionConsistent: false },
      v3: { eligible: true, recommendedNextStep: "practice_more" },
      riskFlags: { values: {} },
    },
    reconciler: { reasonCodes: [] },
    ...overrides,
  };
}

function wrongEvents(count, options = {}) {
  return Array.from({ length: count }, (_, index) => ({
    isCorrect: false,
    timestamp:
      options.sameDay === true
        ? Date.UTC(2026, 6, 1, 10, index)
        : Date.UTC(2026, 6, 1 + (index % 3), 10, index),
    sessionId:
      options.sameSession === true
        ? "p3-session-single"
        : `p3-session-${index % 2}`,
    questionLabel: `p3-event-${index}`,
    userAnswer: `wrong-${index}`,
    misconceptionTag: options.tag || "add_instead_of_sub",
    hintUsed: options.guidedOnly === true,
    afterStepByStep: options.guidedOnly === true,
    mode: options.guidedOnly === true ? "guided_practice" : "practice",
    metadata: {
      metadataSource:
        options.taxonomyOnly === true
          ? "taxonomy_topic_enrichment"
          : "question_metadata_normalizer",
      ...(options.probeConfirmed === true
        ? { probeConfirmed: true }
        : {}),
    },
  }));
}

function safety(overrides = {}) {
  const wrongs = overrides.wrongs || wrongEvents(6);
  return assessSubskillCandidateSafety({
    subjectId: "math",
    row: {
      questions: 20,
      accuracy: 55,
      gradeRelation: "same",
      ...(overrides.row || {}),
    },
    wrongs,
    taxonomyMatch: {
      subskillCandidate: {
        taxonomyId: "M-09",
        subskillHe: "השלמה לעשר",
      },
      normalizedBucketKey: "subtraction",
      matchStrength: "strong",
    },
    candidateIdsRaw: ["M-09"],
    candidateIdsOrdered: ["M-09"],
    chosenId: "M-09",
    recurrenceMatched: true,
    disambiguationApplied: true,
    disambiguationWinnerId: "M-09",
    ...(overrides.ctx || {}),
  });
}

test("P3 inventory: all 76 taxonomy rules have registry, evidence, producer, and real-runtime proof", () => {
  const ruleIds = Object.keys(TAXONOMY_EVIDENCE_RULES).sort();
  assert.equal(ruleIds.length, 76);
  assert.equal(ALL_TAXONOMY_ROWS.length, 76);
  assert.equal(Object.keys(RULE_PRIMARY_PRODUCER).length, 76);
  assert.equal(REAL_RUNTIME_SCENARIOS.length, 76);
  const reachability = buildTaxonomyRuleReachabilityMatrix();
  assert.equal(
    reachability.filter((row) => row.status === "active_reachable").length,
    76,
  );
});

test("P3 producers: every primary tag is consumed by its evidence rule", () => {
  for (const [id, producer] of Object.entries(RULE_PRIMARY_PRODUCER)) {
    assert.equal(producer.active, true, id);
    assert.ok(
      TAXONOMY_EVIDENCE_RULES[id].requiredTags.includes(producer.tag),
      `${id}:${producer.tag}`,
    );
  }
});

test("P3B producer coverage uses one registry and marks partial required-tag coverage", () => {
  let registryActivePrimary = 0;
  let fallbackOnlyPrimary = 0;
  let fullRequiredTagCoverage = 0;
  let partialRequiredTagCoverage = 0;
  const orphanRequiredTags = new Set();
  for (const [id, evidenceRule] of Object.entries(TAXONOMY_EVIDENCE_RULES)) {
    const primary = RULE_PRIMARY_PRODUCER[id];
    if (TAG_PRODUCER_REGISTRY[primary.tag]?.active === true) {
      registryActivePrimary += 1;
    } else if (getTagProducer(primary.tag)?.active === true) {
      fallbackOnlyPrimary += 1;
    }
    const missing = evidenceRule.requiredTags.filter(
      (tag) => getTagProducer(tag)?.active !== true,
    );
    if (missing.length === 0) fullRequiredTagCoverage += 1;
    else {
      partialRequiredTagCoverage += 1;
      missing.forEach((tag) => orphanRequiredTags.add(tag));
    }
  }
  assert.equal(registryActivePrimary, 76);
  assert.equal(fallbackOnlyPrimary, 0);
  assert.equal(fullRequiredTagCoverage, 30);
  assert.equal(partialRequiredTagCoverage, 46);
  assert.equal(orphanRequiredTags.size, 54);
  assert.equal(orphanRequiredTags.has("perimeter_formula_error"), true);
});

test("P3 unsupported metadata tags are explicitly marked, not counted as taxonomy", () => {
  assert.deepEqual(
    [...UNSUPPORTED_EXPECTED_ERROR_TYPES].sort(),
    ["comparatives_error", "modal_error", "passive_error"],
  );
  const activeTags = new Set(
    Object.values(TAXONOMY_EVIDENCE_RULES).flatMap(
      (rule) => rule.requiredTags,
    ),
  );
  for (const tag of UNSUPPORTED_EXPECTED_ERROR_TYPES) {
    assert.equal(activeTags.has(tag), false, tag);
  }
});

test("P3 real producers: positive and negative answers separate every active rule", () => {
  for (const scenario of REAL_RUNTIME_SCENARIOS) {
    const positive = classifyRealRuntimeScenario(scenario, true);
    const negative = classifyRealRuntimeScenario(scenario, false);
    assert.equal(positive.detectedMisconception, scenario.expectedTag, scenario.ruleId);
    assert.notEqual(negative.detectedMisconception, scenario.expectedTag, scenario.ruleId);
  }
});

test("P3 falsification: every rule is rejected on an unrelated topic in the same subject", () => {
  const mappings = taxonomyTopicCoverageInventory();
  for (const scenario of REAL_RUNTIME_SCENARIOS) {
    const subjectId = TAXONOMY_BY_ID[scenario.ruleId].subjectId;
    const wrongTopic = mappings.find(
      (row) =>
        row.subjectId === subjectId &&
        row.topicKey !== "mixed" &&
        !row.taxonomyIds.includes(scenario.ruleId),
    );
    assert.ok(wrongTopic, `${scenario.ruleId}:wrong-topic-fixture`);
    const result = runP3RawRuleScenario(scenario.ruleId, {
      topicKeyOverride: wrongTopic.topicKey,
    });
    assert.notEqual(
      result.de2.taxonomyId,
      scenario.ruleId,
      `${scenario.ruleId}:${wrongTopic.topicKey}`,
    );
  }
});

test("P3 wrong-grade audit: taxonomy rows declare no grade constraints, so grade falsification is unavailable", () => {
  const rowsWithGradeConstraint = ALL_TAXONOMY_ROWS.filter(
    (row) =>
      Array.isArray(row.gradeKeys) ||
      row.minGrade != null ||
      row.maxGrade != null,
  );
  assert.equal(rowsWithGradeConstraint.length, 0);
});

test("P3 raw evidence: representative rule in every engine subject reaches a differentiated action", () => {
  for (const id of RAW_RULES) {
    const result = runP3RawRuleScenario(id);
    assert.equal(result.de2.taxonomyId, id, id);
    assert.equal(result.de2.recurrence.full, true, id);
    assert.equal(result.de2.canonicalState.actionState, "intervene", id);
    assert.equal(result.actionDecisionContract.eligible, true, id);
    assert.ok(
      ["targeted_practice", "reduce_reading_load"].includes(
        result.actionDecisionContract.action,
      ),
      `${id}:${result.actionDecisionContract.action}`,
    );
    assert.equal(
      validateActionDecisionContractV2(result.actionDecisionContract).ok,
      true,
      id,
    );
  }
});

test("P3 cross-subject semantics: Hebrew comprehension maps to reading adaptation, not math/procedure", () => {
  const result = runP3RawRuleScenario("H-04");
  assert.equal(result.v3.dominantErrorType, "reading_comprehension_issue");
  assert.equal(result.actionDecisionContract.action, "reduce_reading_load");
  assert.equal(result.actionDecisionContract.family, "practice_mode_adaptation");
});

test("P3 speed evidence: fast wrong raw answers select remove_timer within canonical cap", () => {
  const result = runP3RawRuleScenario("M-09", { responseMs: 300 });
  assert.equal(result.v3.recommendedNextStep, "remove_timer");
  assert.equal(result.actionDecisionContract.action, "remove_timer");
  assert.equal(result.actionDecisionContract.intensity, "RI1");
  assert.equal(result.actionDecisionContract.authorityTrace.intensityCap, "RI3");
});

test("P3 pattern isolation: a subtraction producer cannot classify under addition topic", () => {
  const result = runP3RawRuleScenario("M-09", {
    topicKeyOverride: "addition",
  });
  assert.notEqual(result.de2.taxonomyId, "M-09");
  assert.notEqual(
    result.actionDecisionContract.target.subskillId,
    "M-09",
  );
});

test("P3 pattern isolation: taxonomy event does not match another subject rule", () => {
  const event = wrongEvents(1)[0];
  assert.equal(
    eventMatchesEvidenceRule(event, TAXONOMY_EVIDENCE_RULES["H-04"]),
    false,
  );
});

test("P3 recurrence: insufficient volume does not confirm, sufficient tagged volume does", () => {
  const row = TAXONOMY_BY_ID["M-09"];
  assert.equal(evaluateEvidenceRecurrence(wrongEvents(2), row).recurrenceMet, false);
  assert.equal(evaluateEvidenceRecurrence(wrongEvents(3), row).recurrenceMet, true);
});

test("P3 recurrence: evidence order permutation does not alter taxonomy or action", () => {
  const normal = runP3RawRuleScenario("M-09");
  const reversed = runP3RawRuleScenario("M-09", {
    reverseEvidence: true,
  });
  assert.equal(reversed.de2.taxonomyId, normal.de2.taxonomyId);
  assert.deepEqual(
    reversed.actionDecisionContract,
    normal.actionDecisionContract,
  );
});

test("P3 missing metadata fails safely without specific diagnosis or target", () => {
  const result = runP3RawMissingMetadataScenario();
  assert.equal(result.de2.taxonomyId, null);
  assert.ok(
    ["withhold", "probe_only"].includes(
      result.de2.canonicalState.actionState,
    ),
  );
  assert.equal(result.actionDecisionContract.intervention, false);
  assert.equal(result.actionDecisionContract.target.subskillId, null);
});

test("P3 malformed metadata does not throw and cannot match taxonomy", () => {
  const malformed = normalizeMistakeEvent(
    {
      topic: "subtraction",
      isCorrect: false,
      metadata: "not-an-object",
      possibleErrorPatterns: { invalid: true },
      timestamp: Date.now(),
    },
    "math",
  );
  assert.equal(
    eventMatchesEvidenceRule(
      malformed,
      TAXONOMY_EVIDENCE_RULES["M-09"],
    ),
    false,
  );
  assert.doesNotThrow(() =>
    evaluateEvidenceRecurrence(
      [malformed, null, /** @type {any} */ ({})],
      TAXONOMY_BY_ID["M-09"],
    ),
  );
});

test("P3 subskill: single candidate without recurrence is blocked", () => {
  const result = safety({ ctx: { recurrenceMatched: false } });
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(result.blockReasons.includes("recurrence_or_probe_required"));
});

test("P3 subskill: probe-confirmed evidence may support a candidate", () => {
  const result = safety({
    wrongs: wrongEvents(3, {
      guidedOnly: true,
      probeConfirmed: true,
    }),
    ctx: {
      recurrenceMatched: false,
      probeEvidenceSupported: true,
      independentEvidenceCount: 0,
    },
  });
  assert.equal(result.safeToShowSubskill, true);
  assert.equal(result.probeEvidenceSupported, true);
});

test("P3 subskill: guided-only recurrence is insufficient for independent targeting", () => {
  const result = safety({
    wrongs: wrongEvents(6, { guidedOnly: true }),
    ctx: { independentEvidenceCount: 0 },
  });
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(
    result.blockReasons.includes("insufficient_independent_evidence"),
  );
});

test("P3B subskill: single-session recurrence remains topic-level", () => {
  const result = safety({
    wrongs: wrongEvents(6, { sameDay: true, sameSession: true }),
  });
  assert.equal(result.distinctDays, 1);
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(result.blockReasons.includes("below_recurrence_min_sessions"));
});

test("P3 subskill: cross-session recurrence is safe when all other gates pass", () => {
  const result = safety();
  assert.equal(result.contractVersion, SUBSKILL_SAFETY_CONTRACT_VERSION);
  assert.equal(result.distinctDays, 3);
  assert.equal(result.safeToShowSubskill, true);
});

test("P3 subskill: taxonomy-only partial metadata is blocked", () => {
  const result = safety({
    wrongs: wrongEvents(6, { taxonomyOnly: true }),
  });
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(
    result.blockReasons.includes("taxonomy_fallback_metadata_only"),
  );
});

test("P3 subskill: unresolved competing candidates are blocked regardless of input order", () => {
  for (const candidateIds of [
    ["M-04", "M-05"],
    ["M-05", "M-04"],
  ]) {
    const result = safety({
      ctx: {
        candidateIdsRaw: candidateIds,
        candidateIdsOrdered: candidateIds,
        chosenId: candidateIds[0],
        disambiguationApplied: false,
        disambiguationWinnerId: null,
      },
    });
    assert.equal(result.safeToShowSubskill, false);
    assert.ok(result.blockReasons.includes("multi_candidate_unresolved"));
  }
});

test("P3 subskill: mastery counter-evidence blocks weakness targeting", () => {
  const result = safety({
    row: { accuracy: 92 },
    ctx: { counterEvidenceStrong: true },
  });
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(result.blockReasons.includes("mastery_control_row"));
  assert.ok(result.blockReasons.includes("counter_evidence_strong"));
});

test("P3 subskill: disappeared pattern is not retained as an active target", () => {
  const result = safety({ ctx: { patternActiveRecently: false } });
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(result.blockReasons.includes("pattern_not_recently_active"));
});

test("P3 subskill: above-grade mismatch blocks specific weakness target", () => {
  const result = safety({ row: { gradeRelation: "higher" } });
  assert.equal(result.safeToShowSubskill, false);
  assert.ok(
    result.blockReasons.includes("above_grade_subskill_claim_blocked"),
  );
});

test("P3B prerequisite: explicit registered curriculum skill has exact precision", () => {
  const context = actionContext();
  context.signals.grade = {
    relation: "lower",
    foundationRisk: true,
    contentGradeKey: "g3",
  };
  context.signals.v3 = {
    eligible: true,
    recommendedNextStep: "strengthen_prerequisite",
    prerequisiteSkill: "sci_body_fact_recall",
  };
  const contract = buildActionDecisionContractV2({
    subjectId: "science",
    topicKey: "body",
    engineDecision: "clear_topic_gap",
    metrics: { questions: 20, correct: 5, wrong: 15, accuracy: 25 },
    canonicalState: canonical(),
    unifiedDecisionContext: context,
  });
  assert.equal(contract.action, "strengthen_prerequisite");
  assert.equal(contract.target.prerequisite, "sci_body_fact_recall");
  assert.equal(contract.target.prerequisiteDetail.precision, "exact_skill");
  assert.equal(validatePrerequisitePrecision(contract.target.prerequisiteDetail).ok, true);
});

test("P3 prerequisite: contentGradeKey remains a foundation area, never an exact skill", () => {
  const context = actionContext();
  context.signals.grade = {
    relation: "lower",
    foundationRisk: true,
    contentGradeKey: "g2",
  };
  context.signals.v3 = {
    eligible: true,
    recommendedNextStep: "strengthen_prerequisite",
    prerequisiteSkill: null,
  };
  const contract = buildActionDecisionContractV2({
    subjectId: "math",
    topicKey: "subtraction",
    engineDecision: "clear_topic_gap",
    metrics: { questions: 20, correct: 5, wrong: 15, accuracy: 25 },
    canonicalState: canonical(),
    unifiedDecisionContext: context,
  });
  assert.equal(contract.target.prerequisite, "subtraction");
  assert.equal(
    contract.target.prerequisiteDetail.precision,
    "grade_foundation_area",
  );
  assert.notEqual(contract.target.prerequisite, "g2");
});

test("P3 prerequisite: unregistered curriculum skill falls back explicitly instead of masquerading as exact", () => {
  const context = actionContext();
  context.signals.grade = {
    relation: "lower",
    foundationRisk: true,
    contentGradeKey: "g3",
  };
  context.signals.prerequisite.prerequisiteSkillIds = [
    "sci_unregistered_skill",
  ];
  context.signals.v3 = {
    eligible: true,
    recommendedNextStep: "strengthen_prerequisite",
    prerequisiteSkill: null,
  };
  const contract = buildActionDecisionContractV2({
    subjectId: "science",
    topicKey: "body",
    engineDecision: "clear_topic_gap",
    metrics: { questions: 20, correct: 5, wrong: 15, accuracy: 25 },
    canonicalState: canonical(),
    unifiedDecisionContext: context,
  });
  assert.equal(
    contract.target.prerequisiteDetail.precision,
    "grade_foundation_area",
  );
  assert.equal(
    contract.target.prerequisiteDetail.reasonCode,
    "prerequisite:declared_skill_unregistered_grade_fallback",
  );
  assert.deepEqual(
    contract.target.prerequisiteDetail.unsupportedDeclaredSkillIds,
    ["sci_unregistered_skill"],
  );
});

test("P3 prerequisite: raw metadata can reach an exact registered prerequisite target", () => {
  const result = runP3RawRuleScenario("S-03", {
    gradeRelation: "lower",
    registeredGradeKey: "g4",
    contentGradeKey: "g3",
    prerequisiteSkillIds: ["sci_body_fact_recall"],
  });
  assert.equal(result.actionDecisionContract.action, "strengthen_prerequisite");
  assert.equal(
    result.actionDecisionContract.target.prerequisiteDetail.precision,
    "exact_skill",
  );
  assert.equal(
    result.actionDecisionContract.target.prerequisite,
    "sci_body_fact_recall",
  );
});

test("P3 target integrity: all representative action targets point to mapped entities", () => {
  for (const id of RAW_RULES) {
    const result = runP3RawRuleScenario(id);
    const target = result.actionDecisionContract.target;
    assert.ok(
      taxonomyIdsForReportBucket(result.subjectId, target.topic).length > 0,
      `${id}:${target.topic}`,
    );
    if (target.subskillId) {
      assert.ok(TAXONOMY_BY_ID[target.subskillId], target.subskillId);
      assert.equal(
        TAXONOMY_BY_ID[target.subskillId].subjectId,
        result.subjectId,
      );
    }
    if (target.prerequisiteDetail) {
      assert.equal(
        validatePrerequisitePrecision(target.prerequisiteDetail).ok,
        true,
      );
    }
  }
});

test("P3 coverage: every subject/topic cell has an explicit supported classification", () => {
  const matrix = buildSubjectTopicCoverageMatrix(RAW_PROOF_TOPICS);
  assert.equal(matrix.length, taxonomyTopicCoverageInventory().length);
  assert.ok(new Set(matrix.map((row) => row.subjectId)).size >= 7);
  for (const row of matrix) {
    for (const key of [
      "metadataCoverage",
      "patternCoverage",
      "taxonomyCoverage",
      "safeSubskillCoverage",
      "prerequisiteCoverage",
      "rawToActionProof",
    ]) {
      assert.ok(
        P3_COVERAGE_CLASSIFICATIONS.includes(row[key]),
        `${row.subjectId}/${row.topicKey}/${key}:${row[key]}`,
      );
    }
  }
});

test("P3 coverage metrics do not claim prerequisite or full metadata coverage from rule count", () => {
  const summary = buildP3CoverageSummary(RAW_PROOF_TOPICS);
  assert.equal(summary.rules.activeReachable, 76);
  assert.equal(summary.rules.activeReachablePercent, 100);
  assert.equal(summary.topics.fullMetadataCoverage, 0);
  assert.equal(summary.topics.explicitPrerequisite, 0);
  assert.equal(summary.topics.explicitPrerequisitePercent, 0);
  assert.ok(summary.topics.rawToActionProofPercent < 100);
});

test("P3 authority: taxonomy cannot open intervention for guided or missing evidence", () => {
  const guided = runP3RawRuleScenario("M-09", { guidedOnly: true });
  const missing = runP3RawMissingMetadataScenario();
  for (const result of [guided, missing]) {
    assert.equal(result.actionDecisionContract.intervention, false);
    assert.equal(result.actionDecisionContract.intensity, "RI0");
    assert.ok(
      ["withhold", "probe_only"].includes(
        result.actionDecisionContract.authorityTrace.actionState,
      ),
    );
  }
});

test("P3 authority: selected intensity never exceeds canonical cap", () => {
  for (const id of RAW_RULES) {
    const result = runP3RawRuleScenario(id);
    const rank = { RI0: 0, RI1: 1, RI2: 2, RI3: 3 };
    assert.ok(
      rank[result.actionDecisionContract.intensity] <=
        rank[result.actionDecisionContract.authorityTrace.intensityCap],
      id,
    );
    assert.equal(
      result.actionDecisionContract.authorityTrace.soleAuthority,
      "canonicalState",
    );
  }
});

test("P3 assertion accounting", () => {
  nodeAssert.equal(p3AssertionCount, 1091);
});
