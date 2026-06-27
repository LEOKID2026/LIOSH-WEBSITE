#!/usr/bin/env node
/**
 * P2 Moledet: bank row → served params → mistake → probe → match.
 * Uses direct bank import (avoids geography-questions directory import under Node ESM).
 */
import assert from "node:assert/strict";
import * as geoPools from "../data/geography-questions/index.js";
const G4_EASY_QUESTIONS = geoPools.G4_EASY_QUESTIONS;
import { moledetDiagnosticContractFromBankRow } from "../utils/moledet-geography-diagnostic-metadata-bridge.js";
import { mergeDiagnosticContractIntoParams } from "../utils/diagnostic-question-contract.js";
import {
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../utils/diagnostic-mistake-metadata.js";
import { normalizeMistakeEvent } from "../utils/mistake-event.js";
import { inferNormalizedTags } from "../utils/fast-diagnostic-engine/infer-tags.js";
import { buildPendingProbeFromMistake } from "../utils/active-diagnostic-runtime/build-pending-probe.js";
import { bankQuestionProbeMatch } from "../utils/active-diagnostic-runtime/probe-match.js";

const TOPICS = ["homeland", "community", "citizenship", "geography", "values", "maps"];
const gradeKey = "g4";
const levelKey = "easy";

let pass = 0;
for (const topic of TOPICS) {
  const pool = G4_EASY_QUESTIONS[topic];
  assert.ok(Array.isArray(pool) && pool.length > 0, `pool empty ${topic}`);
  const row = pool[0];
  const contract = moledetDiagnosticContractFromBankRow(
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
  const normalized = normalizeMistakeEvent(wrongEntry, "moledet-geography");
  assert.equal(normalized.diagnosticSkillId, contract.diagnosticSkillId);

  const tags = inferNormalizedTags(normalized, "moledet-geography");
  assert.ok(tags.length > 0, `${topic}: inferred tags`);

  const probe = buildPendingProbeFromMistake(
    normalized,
    { fallbackTopicId: topic, fallbackGrade: gradeKey, fallbackLevel: levelKey },
    "moledet-geography"
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

console.log(`PASS: moledet-diagnostic-probe-e2e (${pass}/${TOPICS.length} topics)`);
