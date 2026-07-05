#!/usr/bin/env node
/**
 * Resolver proof: owner copy templates via resolve-topic-owner-copy (not guard fixtures only).
 * Run: node scripts/parent-report-owner-copy-resolver-proof.mjs
 */
import assert from "node:assert/strict";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const u = (rel) => pathToFileURL(join(ROOT, rel)).href;

const { EDC_CONTRACT_KEY } = await import(u("utils/learning-pattern-decision/engine-decision-codes.js"));
const {
  resolveTopicOwnerCopyHe,
  resolveTopicExplainOwnerSectionsHe,
} = await import(u("utils/learning-pattern-decision/resolve-topic-owner-copy.js"));
const {
  renderOwnerSubjectCopyTemplateHe,
  buildSubjectOwnerCopySlots,
  SUBJECT_OWNER_COPY_TEMPLATE_IDS,
} = await import(u("utils/parent-report-language/parent-report-owner-copy-templates-he.js"));

const FORBIDDEN = [
  "remediate same level",
  "undefined",
  "null",
  "unknown",
  "engineDecision",
  "clear_topic_gap",
  "topic_needs_strengthening",
  "recommendedAction",
  "parentSafeFinding",
];

/** @param {string} text @param {string} label @param {{ allowEarly?: boolean }} [opts] */
function assertClean(text, label, opts = {}) {
  const s = String(text || "");
  assert.ok(s.trim(), `${label} must not be empty`);
  for (const frag of FORBIDDEN) {
    assert.doesNotMatch(s, new RegExp(frag, "i"), `${label} forbidden: ${frag}`);
  }
  if (!opts.allowEarly) {
    assert.doesNotMatch(s, /עדיין מוקדם/u, `${label} must not contain עדיין מוקדם`);
  }
}

/** @param {Record<string, unknown>} body @param {Record<string, unknown>} contract */
function rowWithLpd(body, contract) {
  const lpdBody = body.learningPatternDecision && typeof body.learningPatternDecision === "object"
    ? body.learningPatternDecision
    : {};
  return {
    subjectLabelHe: "מתמטיקה",
    ...body,
    learningPatternDecision: {
      ...lpdBody,
      [EDC_CONTRACT_KEY]: contract,
    },
  };
}

const initialRow = rowWithLpd(
  {
    label: "חילוק עם שארית",
    displayName: "חילוק עם שארית",
    questions: 2,
    correct: 1,
    wrong: 1,
    accuracy: 50,
    learningPatternDecision: {
      templateId: "initial_topic_data",
      topicStatus: "initial_data",
      findingType: "initial_topic_data",
      evidenceStrength: "low",
      practicedQuestions: 2,
    },
    contractsV1: { narrative: { wordingEnvelope: "WE0" } },
  },
  { engineDecision: "early_direction_only", detectedPattern: null },
);

const initialTopicDataProof = {
  "initial_topic_data": resolveTopicOwnerCopyHe(initialRow, "initial_topic_data"),
  "initial_topic_data:TOPIC_EXPLAIN_IDENTIFIED": resolveTopicOwnerCopyHe(
    initialRow,
    "initial_topic_data:TOPIC_EXPLAIN_IDENTIFIED",
  ),
  "initial_topic_data:TOPIC_EXPLAIN_DATA": resolveTopicOwnerCopyHe(
    initialRow,
    "initial_topic_data:TOPIC_EXPLAIN_DATA",
  ),
  "initial_topic_data:TOPIC_EXPLAIN_MEANING": resolveTopicOwnerCopyHe(
    initialRow,
    "initial_topic_data:TOPIC_EXPLAIN_MEANING",
  ),
  "initial_topic_data:TOPIC_EXPLAIN_HOME_ACTION": resolveTopicOwnerCopyHe(
    initialRow,
    "initial_topic_data:TOPIC_EXPLAIN_HOME_ACTION",
  ),
  viaExplainSections: resolveTopicExplainOwnerSectionsHe(initialRow),
};

for (const [k, v] of Object.entries(initialTopicDataProof)) {
  if (k === "viaExplainSections") {
    for (const [sec, text] of Object.entries(v || {})) {
      if (text) assertClean(text, `initial ${sec}`, { allowEarly: sec === "meaning" });
    }
    continue;
  }
  assertClean(v, k, { allowEarly: k.includes("MEANING") });
}

const practiceRow = rowWithLpd(
  {
    label: "סדרות",
    displayName: "סדרות",
    questions: 3,
    correct: 2,
    wrong: 1,
    accuracy: 67,
    learningPatternDecision: {
      templateId: "practice_focus",
      topicStatus: "practice_focus",
      findingType: "practice_focus",
      evidenceStrength: "emerging",
      practicedQuestions: 3,
    },
  },
  { engineDecision: "early_direction_only", detectedPattern: null },
);

const practiceFocusProof = {
  practice_focus: resolveTopicOwnerCopyHe(practiceRow, "practice_focus"),
  "practice_focus:TOPIC_EXPLAIN_IDENTIFIED": resolveTopicOwnerCopyHe(
    practiceRow,
    "practice_focus:TOPIC_EXPLAIN_IDENTIFIED",
  ),
  "practice_focus:TOPIC_EXPLAIN_DATA": resolveTopicOwnerCopyHe(
    practiceRow,
    "practice_focus:TOPIC_EXPLAIN_DATA",
  ),
  "practice_focus:TOPIC_EXPLAIN_MEANING": resolveTopicOwnerCopyHe(
    practiceRow,
    "practice_focus:TOPIC_EXPLAIN_MEANING",
  ),
  viaExplainSections: resolveTopicExplainOwnerSectionsHe(practiceRow),
};

for (const [k, v] of Object.entries(practiceFocusProof)) {
  if (k === "viaExplainSections") {
    for (const [sec, text] of Object.entries(v || {})) {
      if (text) {
        assertClean(text, `practice_focus ${sec}`);
        assert.doesNotMatch(text, /זוהה דפוס ברור|יש דפוס ברור/u, `practice_focus ${sec}`);
      }
    }
    continue;
  }
  assertClean(v, k);
  assert.doesNotMatch(String(v), /זוהה דפוס ברור|יש דפוס ברור/u, `${k}`);
}

const aaa7SubjectOpeningProof = renderOwnerSubjectCopyTemplateHe(
  SUBJECT_OWNER_COPY_TEMPLATE_IDS.OPENING,
  buildSubjectOwnerCopySlots(
    {
      subjectDecision: "focused_strengthening_needed",
      recommendedSubjectAction: "remediate_priority_topics_same_level",
      blockedLegacySummary: true,
      priorityTopics: [
        {
          topicLabelKey: "חיבור",
          questions: 10,
          correct: 2,
          wrong: 8,
          accuracy: 20,
          detectedPattern: null,
          evidenceStrength: "supported",
        },
      ],
    },
    "מתמטיקה",
  ),
);
assert.match(String(aaa7SubjectOpeningProof), /מומלץ לחזק את הנושא לפני שממשיכים/u);

console.log(
  JSON.stringify(
    {
      aaa7SubjectOpeningProof,
      initialTopicDataProof,
      practiceFocusProof,
    },
    null,
    2,
  ),
);

console.error("\nparent-report-owner-copy-resolver-proof: OK\n");
