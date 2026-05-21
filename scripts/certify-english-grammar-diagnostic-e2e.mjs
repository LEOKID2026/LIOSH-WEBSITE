#!/usr/bin/env node
/**
 * Live E2E certification: English grammar P0 bank metadata → mistake → tags → probe → match.
 * Read-only / fixture — no UI, no bank mutations.
 * Run: npm run test:english-grammar-diagnostic-e2e
 */
import assert from "node:assert/strict";
import { GRAMMAR_POOLS } from "../data/english-questions/grammar-pools.js";
import { ENGLISH_GRAMMAR_POOL_DIAGNOSTIC_BY_POOL } from "../utils/english-grammar-diagnostic-metadata-enrich.js";
import { mergeDiagnosticContractIntoParams } from "../utils/diagnostic-question-contract.js";
import {
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../utils/diagnostic-mistake-metadata.js";
import { normalizeMistakeEvent } from "../utils/mistake-event.js";
import { inferNormalizedTags } from "../utils/fast-diagnostic-engine/infer-tags.js";
import { buildPendingProbeFromMistake } from "../utils/active-diagnostic-runtime/build-pending-probe.js";
import { bankQuestionProbeMatch } from "../utils/active-diagnostic-runtime/probe-match.js";
import {
  PROBE_BY_DIAGNOSTIC_SKILL_ID,
  PROBE_BY_ERROR_TAG,
  resolveProbeHintFromMap,
} from "../utils/fast-diagnostic-engine/probe-map-he.js";

const POOL_KEYS = Object.keys(ENGLISH_GRAMMAR_POOL_DIAGNOSTIC_BY_POOL);

/** @param {Record<string, unknown>} row */
function pickSampleRow(poolKey) {
  const pool = GRAMMAR_POOLS[poolKey];
  assert.ok(Array.isArray(pool) && pool.length > 0, `empty pool ${poolKey}`);
  const row = pool.find(
    (r) =>
      r &&
      typeof r === "object" &&
      r.diagnosticSkillId &&
      Array.isArray(r.expectedErrorTags) &&
      r.expectedErrorTags.length > 0
  );
  assert.ok(row, `no enriched row in ${poolKey}`);
  return /** @type {Record<string, unknown>} */ (row);
}

/**
 * Mirrors english-master grammar serve path (params merge only).
 * @param {Record<string, unknown>} grammarQ
 */
function buildServedQuestion(grammarQ, poolKey) {
  const params = mergeDiagnosticContractIntoParams(
    {
      patternFamily: grammarQ.patternFamily || "grammar_mcq",
      distractorFamily: grammarQ.distractorFamily || "grammar_forms",
    },
    grammarQ
  );
  return {
    topic: poolKey,
    question: grammarQ.question,
    correctAnswer: grammarQ.correct,
    params,
    levelKey: String(grammarQ.difficulty || "medium"),
  };
}

/**
 * Mirrors english-master wrong-entry + extract path.
 * @param {ReturnType<typeof buildServedQuestion>} served
 */
function buildWrongMistakeEntry(served) {
  let wrongEntry = {
    topic: served.topic,
    topicOrOperation: served.topic,
    bucketKey: served.topic,
    grade: "g4",
    level: served.levelKey,
    mode: "learning",
    exerciseText: served.question,
    userAnswer: "wrong_fixture",
    isCorrect: false,
    patternFamily:
      served.params?.patternFamily != null ? String(served.params.patternFamily) : null,
    conceptTag: served.params?.conceptTag != null ? String(served.params.conceptTag) : null,
  };
  wrongEntry = mergeDiagnosticIntoMistakeEntry(
    wrongEntry,
    extractDiagnosticMetadataFromQuestion(served, { responseMs: 3000, hintUsed: false })
  );
  return wrongEntry;
}

let pass = 0;
const failures = [];

for (const poolKey of POOL_KEYS) {
  const contract = ENGLISH_GRAMMAR_POOL_DIAGNOSTIC_BY_POOL[poolKey];
  try {
    const row = pickSampleRow(poolKey);
    assert.equal(row.diagnosticSkillId, contract.diagnosticSkillId, `${poolKey} skillId`);

    const served = buildServedQuestion(row, poolKey);
    const wrongEntry = buildWrongMistakeEntry(served);

    assert.ok(
      Array.isArray(wrongEntry.expectedErrorTags) && wrongEntry.expectedErrorTags.length > 0,
      `${poolKey}: expectedErrorTags on mistake`
    );
    assert.equal(
      wrongEntry.diagnosticSkillId,
      contract.diagnosticSkillId,
      `${poolKey}: diagnosticSkillId on mistake`
    );

    const normalized = normalizeMistakeEvent(wrongEntry, "english");
    assert.deepEqual(
      normalized.expectedErrorTags,
      wrongEntry.expectedErrorTags,
      `${poolKey}: normalize keeps tags`
    );
    assert.equal(normalized.diagnosticSkillId, contract.diagnosticSkillId);

    const tags = inferNormalizedTags(normalized, "english");
    const primaryTag = contract.expectedErrorTags[0];
    assert.ok(
      tags.includes(primaryTag) || tags.includes("grammar_pattern_error"),
      `${poolKey}: infer includes ${primaryTag} or grammar_pattern_error}, got ${tags.join(",")}`
    );

    const hintByTag = resolveProbeHintFromMap({ dominantTag: primaryTag, dominantDiagnosticSkillId: "" });
    const hintBySkill = resolveProbeHintFromMap({
      dominantTag: "",
      dominantDiagnosticSkillId: contract.diagnosticSkillId,
    });
    assert.ok(
      hintByTag || hintBySkill,
      `${poolKey}: probe map resolves (tag=${!!hintByTag}, skill=${!!hintBySkill})`
    );

    const probe = buildPendingProbeFromMistake(
      normalized,
      { fallbackTopicId: poolKey, fallbackGrade: "g4", fallbackLevel: served.levelKey },
      "english"
    );
    assert.ok(probe, `${poolKey}: buildPendingProbeFromMistake`);
    assert.equal(probe.diagnosticSkillId, contract.diagnosticSkillId);

    const pool = GRAMMAR_POOLS[poolKey];
    const followUp = pool.find(
      (r) => r && r !== row && r.diagnosticSkillId === contract.diagnosticSkillId
    );
    assert.ok(followUp, `${poolKey}: follow-up row in pool`);
    const match = bankQuestionProbeMatch(followUp, probe);
    assert.ok(match.matches, `${poolKey}: bankQuestionProbeMatch (${match.reason})`);

    pass += 1;
  } catch (err) {
    failures.push({ poolKey, message: err instanceof Error ? err.message : String(err) });
  }
}

// Probe map completeness for all P0 skill ids
for (const [poolKey, contract] of Object.entries(ENGLISH_GRAMMAR_POOL_DIAGNOSTIC_BY_POOL)) {
  const sid = contract.diagnosticSkillId;
  const primaryTag = contract.expectedErrorTags[0];
  const hasSkill = !!PROBE_BY_DIAGNOSTIC_SKILL_ID[sid];
  const hasTag = !!PROBE_BY_ERROR_TAG[primaryTag];
  const hasGeneric = !!PROBE_BY_ERROR_TAG.grammar_pattern_error;
  assert.ok(
    hasSkill || hasTag || hasGeneric,
    `probe map coverage for ${poolKey}: skill=${hasSkill} tag=${hasTag}`
  );
}

if (failures.length) {
  console.error("FAIL: english-grammar-diagnostic-e2e");
  for (const f of failures) console.error(`  ${f.poolKey}: ${f.message}`);
  process.exit(1);
}

console.log(`PASS: english-grammar-diagnostic-e2e (${pass}/${POOL_KEYS.length} pools)`);
process.exit(0);
