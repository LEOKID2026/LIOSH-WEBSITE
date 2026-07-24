import test from "node:test";
import assert from "node:assert/strict";

import { SCIENCE_QUESTIONS } from "../../data/science-questions.js";
import { HEBREW_RICH_POOL } from "../../utils/hebrew-rich-question-bank.js";
import {
  GEOMETRY_CONCEPTUAL_ITEMS,
} from "../../utils/geometry-conceptual-bank.js";
import {
  CURRICULUM_SKILL_ENTITY_REGISTRY,
  isRegisteredCurriculumSkill,
} from "../../utils/curriculum-skill-entity-registry.js";
import {
  resolvePrerequisitePrecision,
  validatePrerequisitePrecision,
} from "../../utils/action-decision-contract/prerequisite-precision.js";
import {
  hasContentForSkill,
  hasExactSkillConsumer,
} from "../../lib/learning/prerequisite-content-source.js";
import {
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../../utils/diagnostic-mistake-metadata.js";
import { normalizeMistakeEvent } from "../../utils/mistake-event.js";
import {
  buildDiagnosticEvidenceContractV3,
} from "../../utils/diagnostic-engine-v3/evidence-contract-v3.js";
import {
  buildActionDecisionContractV2,
} from "../../utils/action-decision-contract/action-decision-contract-v2.js";

function declarations() {
  const rows = [];
  for (const question of SCIENCE_QUESTIONS) {
    for (const id of question?.params?.prerequisiteSkillIds || []) {
      rows.push({
        subjectId: "science",
        topicKey: question.topic,
        id,
        question,
      });
    }
  }
  for (const question of HEBREW_RICH_POOL) {
    for (const id of question?.prerequisiteSkillIds || []) {
      rows.push({
        subjectId: "hebrew",
        topicKey: question.topic,
        id,
        question,
      });
    }
  }
  for (const question of GEOMETRY_CONCEPTUAL_ITEMS) {
    for (const id of question?.prerequisiteSkillIds || []) {
      rows.push({
        subjectId: "geometry",
        topicKey: question.topics?.[0] || "general",
        id,
        question,
      });
    }
  }
  return rows;
}

test("P3B all 12 current prerequisite declarations resolve to curriculum entities", () => {
  const rows = declarations();
  assert.equal(rows.length, 12);
  assert.equal(new Set(rows.map((row) => row.id)).size, 4);
  assert.equal(Object.keys(CURRICULUM_SKILL_ENTITY_REGISTRY).length, 8);
  for (const row of rows) {
    assert.equal(
      isRegisteredCurriculumSkill(row.id, row.subjectId),
      true,
      `${row.subjectId}:${row.id}`,
    );
  }
});

test("P3B real declared prerequisites resolve to exact_skill only when BOTH real bank content exists AND the subject has a wired runtime consumer; otherwise fall back", () => {
  // docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md (round 4):
  // exact_skill requires three independent things to be true — registered,
  // real bank content of its OWN (a declared prerequisite id is not
  // automatically backed by content just because the declaring question
  // exists — e.g. geometry's "tri_sum_180" is registered but no geometry
  // question is itself tagged with that diagnosticSkillId), and the
  // subject's master actually consuming contentOverrideTarget at runtime
  // (currently only geometry — see hasExactSkillConsumer). Expectations
  // below are computed from the same two independently-checkable real-data
  // facts, not assumed per subject.
  for (const row of declarations()) {
    const detail = resolvePrerequisitePrecision({
      subjectId: row.subjectId,
      topicKey: row.topicKey,
      grade: { relation: "lower", contentGradeKey: "g2" },
      v3: { prerequisiteSkill: row.id },
      prerequisiteSignal: { prerequisiteSkillIds: [row.id] },
    });
    const expectExact =
      hasExactSkillConsumer(row.subjectId) && hasContentForSkill(row.id, row.subjectId);
    if (expectExact) {
      assert.equal(detail.precision, "exact_skill", row.id);
      assert.equal(detail.entityType, "curriculum_skill", row.id);
      assert.equal(detail.id, row.id);
    } else {
      assert.equal(detail.precision, "grade_foundation_area", row.id);
      assert.notEqual(detail.id, row.id, row.id);
    }
    assert.equal(validatePrerequisitePrecision(detail).ok, true, row.id);
  }
});

test("P3B taxonomy rule IDs and grade keys are never exact prerequisite skills", () => {
  for (const id of ["M-01", "G-03", "g2"]) {
    const detail = resolvePrerequisitePrecision({
      subjectId: "math",
      topicKey: "subtraction",
      grade: { relation: "lower", contentGradeKey: "g2" },
      v3: { prerequisiteSkill: id },
      prerequisiteSignal: { prerequisiteSkillIds: [id] },
    });
    assert.notEqual(detail.precision, "exact_skill", id);
    assert.notEqual(detail.id, id, id);
  }
});

test("P3B all 12 real bank declarations propagate through mistake capture and V3", () => {
  for (const row of declarations()) {
    const patch = extractDiagnosticMetadataFromQuestion(row.question);
    assert.deepEqual(patch.prerequisiteSkillIds, [row.id], row.id);
    const stored = mergeDiagnosticIntoMistakeEntry(
      {
        subject: row.subjectId,
        topic: row.topicKey,
        bucketKey: row.topicKey,
        mode: "practice",
        timestamp: Date.UTC(2026, 6, 23),
        isCorrect: false,
        userAnswer: "wrong",
      },
      patch,
    );
    const event = normalizeMistakeEvent(stored, row.subjectId);
    assert.deepEqual(event.prerequisiteSkillIds, [row.id], row.id);
    assert.deepEqual(
      event.metadata.prerequisiteSkillIds,
      [row.id],
      row.id,
    );
    const v3 = buildDiagnosticEvidenceContractV3({
      subjectId: row.subjectId,
      event,
      isCorrect: false,
      activityMode: "practice",
    });
    assert.equal(v3.prerequisiteSkill, row.id, row.id);
  }
});

test("P3B real bank prerequisite reaches ActionDecisionContractV2 exactly", () => {
  const row = declarations().find(
    (candidate) => candidate.id === "sci_body_fact_recall",
  );
  const patch = extractDiagnosticMetadataFromQuestion(row.question);
  const event = normalizeMistakeEvent(
    mergeDiagnosticIntoMistakeEntry(
      {
        subject: "science",
        topic: "body",
        bucketKey: "body",
        mode: "practice",
        timestamp: Date.UTC(2026, 6, 23),
        isCorrect: false,
        userAnswer: "wrong",
      },
      patch,
    ),
    "science",
  );
  const v3 = buildDiagnosticEvidenceContractV3({
    subjectId: "science",
    event,
    isCorrect: false,
    activityMode: "practice",
  });
  const contract = buildActionDecisionContractV2({
    subjectId: "science",
    topicKey: "body",
    engineDecision: "clear_topic_gap",
    metrics: { questions: 20, correct: 5, wrong: 15, accuracy: 25 },
    canonicalState: {
      actionState: "intervene",
      recommendation: {
        allowed: true,
        intensityCap: "RI2",
        reasonCodes: ["test:authorized"],
      },
    },
    unifiedDecisionContext: {
      authority: { actionEligible: true },
      evidenceEligibility: { action: true },
      signals: {
        trend: { direction: "stable", eligible: true },
        timing: { eligible: true, fastWrongCount: 0 },
        assistance: { evidenceMode: "independent", eligible: true },
        grade: {
          relation: "lower",
          foundationRisk: true,
          caveatNeeded: false,
          contentGradeKey: "g2",
        },
        pattern: { eligible: false },
        subskill: { eligible: false, safe: false, candidate: null },
        prerequisite: {
          prerequisiteSkillIds: event.prerequisiteSkillIds,
          independentEvidenceCount: 8,
          probeEvidenceSupported: false,
        },
        sessions: { crossSessionConsistent: true },
        v3: {
          eligible: true,
          recommendedNextStep: "strengthen_prerequisite",
          prerequisiteSkill: v3.prerequisiteSkill,
        },
        riskFlags: { values: {} },
      },
      reconciler: { reasonCodes: [] },
    },
  });
  // science has no wired runtime consumer yet (see hasExactSkillConsumer) —
  // the contract must fall back to grade_foundation_area, never claim
  // exact_skill for "sci_body_fact_recall" here even though it's registered
  // and has real bank content (proven by the P3B tests above).
  assert.equal(contract.action, "strengthen_prerequisite");
  assert.equal(contract.target.prerequisite, "body");
  assert.equal(contract.target.prerequisiteDetail.precision, "grade_foundation_area");
  assert.equal(
    contract.target.prerequisiteDetail.entityType,
    "topic_foundation_area",
  );
});
