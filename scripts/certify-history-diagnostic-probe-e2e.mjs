#!/usr/bin/env node
/**
 * History G6: bank row → served params → mistake → probe → match (fixture pool).
 */
import assert from "node:assert/strict";
import { historyDiagnosticContractFromBankRow } from "../utils/history-diagnostic-metadata-bridge.js";
import { mergeDiagnosticContractIntoParams } from "../utils/diagnostic-question-contract.js";
import {
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../utils/diagnostic-mistake-metadata.js";
import { normalizeMistakeEvent } from "../utils/mistake-event.js";
import { inferNormalizedTags } from "../utils/fast-diagnostic-engine/infer-tags.js";
import { buildPendingProbeFromMistake } from "../utils/active-diagnostic-runtime/build-pending-probe.js";
import { bankQuestionProbeMatch } from "../utils/active-diagnostic-runtime/probe-match.js";

const TOPICS = [
  "what_is_history",
  "classical_greece",
  "hellenism_jews",
  "hasmonaeans",
  "rome_jews",
];
const gradeKey = "g6";
const levelKey = "easy";

/** Minimal fixture rows per topic — no full bank required for probe wiring cert. */
const FIXTURE_POOL = {
  what_is_history: [
    {
      question: "מהו מקור ראשוני?",
      skillId: "hist_concepts",
      subtopicKey: "hist_sub_intro_sources_timeline",
      patternFamily: "hist_concepts",
      expectedErrorTags: ["concept_confusion"],
    },
    {
      question: "מהו מקור משני?",
      skillId: "hist_concepts",
      subtopicKey: "hist_sub_intro_sources_timeline",
      patternFamily: "hist_simple_source",
      expectedErrorTags: ["source_reading"],
    },
  ],
  classical_greece: [
    {
      question: "מהי דמוקרטיה באתונה?",
      skillId: "hist_governance_institutions",
      subtopicKey: "hist_sub_athens_democracy",
      patternFamily: "hist_governance_institutions",
      expectedErrorTags: ["concept_confusion"],
    },
    {
      question: "השווה בין אתונה לספרטה",
      skillId: "hist_comparison",
      subtopicKey: "hist_sub_athens_sparta_compare",
      patternFamily: "hist_comparison",
      expectedErrorTags: ["comparison_error"],
    },
  ],
  hellenism_jews: [
    {
      question: "מי היה אלכסנדר מוקדון?",
      skillId: "hist_figures_roles",
      subtopicKey: "hist_sub_alexander_hellenism",
      patternFamily: "hist_figures_roles",
      expectedErrorTags: ["fact_recall_gap"],
    },
    {
      question: "מה היו תוצאות המפגש בין הלניזם ליהדות?",
      skillId: "hist_cause_effect",
      subtopicKey: "hist_sub_hellenism_meets_judaism",
      patternFamily: "hist_cause_effect",
      expectedErrorTags: ["cause_effect_error"],
    },
  ],
  hasmonaeans: [
    {
      question: "סדר את אירועי מרד המקבים",
      skillId: "hist_timeline_sequence",
      subtopicKey: "hist_sub_antiochus_maccabees",
      patternFamily: "hist_timeline_sequence",
      expectedErrorTags: ["sequence_error"],
    },
    {
      question: "מהי ממלכת החשמונאים?",
      skillId: "hist_governance_institutions",
      subtopicKey: "hist_sub_hasmonaean_kingdom",
      patternFamily: "hist_governance_institutions",
      expectedErrorTags: ["concept_confusion"],
    },
  ],
  rome_jews: [
    {
      question: "מה קרה בחורבן בית המקדש?",
      skillId: "hist_timeline_sequence",
      subtopicKey: "hist_sub_great_revolt_destruction",
      patternFamily: "hist_timeline_sequence",
      expectedErrorTags: ["sequence_error"],
    },
    {
      question: "מה השפיע על היום ממרכז יבנה?",
      skillId: "hist_past_present_link",
      subtopicKey: "hist_sub_yavne_bar_kokhba_babylon",
      patternFamily: "hist_past_present_link",
      expectedErrorTags: ["past_present_link"],
    },
  ],
};

let pass = 0;
for (const topic of TOPICS) {
  const pool = FIXTURE_POOL[topic];
  assert.ok(Array.isArray(pool) && pool.length > 0, `pool empty ${topic}`);
  const row = pool[0];
  const contract = historyDiagnosticContractFromBankRow(
    /** @type {Record<string, unknown>} */ (row),
    topic
  );

  const served = {
    topic,
    operation: topic,
    question: row.question,
    exerciseText: row.question,
    params: mergeDiagnosticContractIntoParams(
      { kind: topic, gradeKey, levelKey },
      contract
    ),
    id: `${topic}:${String(row.question).trim().slice(0, 40)}`,
  };
  assert.ok(served.params?.diagnosticSkillId, `${topic}: served diagnosticSkillId`);
  assert.ok(served.params?.expectedErrorTags?.length, `${topic}: served tags`);

  let wrongEntry = {
    topic,
    bucketKey: topic,
    grade: gradeKey,
    level: levelKey,
    isCorrect: false,
    params: { ...served.params },
  };
  wrongEntry = mergeDiagnosticIntoMistakeEntry(
    wrongEntry,
    extractDiagnosticMetadataFromQuestion(served, {})
  );
  const normalized = normalizeMistakeEvent(wrongEntry, "history");
  assert.equal(normalized.diagnosticSkillId, contract.diagnosticSkillId);

  const tags = inferNormalizedTags(normalized, "history");
  assert.ok(tags.length > 0, `${topic}: inferred tags`);

  const probe = buildPendingProbeFromMistake(
    normalized,
    { fallbackTopicId: topic, fallbackGrade: gradeKey, fallbackLevel: levelKey },
    "history"
  );
  assert.ok(probe, `${topic}: pending probe`);

  const followUp = pool[1] || pool[0];
  const bankItem = {
    ...followUp,
    topic,
    id: `${topic}:${String(followUp.question).trim().slice(0, 40)}`,
    diagnosticSkillId: contract.diagnosticSkillId,
    patternFamily: contract.patternFamily,
    conceptTag: contract.conceptTag,
    expectedErrorTags: contract.expectedErrorTags,
  };
  const match = bankQuestionProbeMatch(bankItem, probe);
  assert.ok(match.matches, `${topic}: probe match (${match.reason})`);
  pass++;
}

console.log(`PASS: history-diagnostic-probe-e2e (${pass}/${TOPICS.length} topics)`);
