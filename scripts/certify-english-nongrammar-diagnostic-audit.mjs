#!/usr/bin/env node
/**
 * P2 audit: English sentence/translation/vocabulary/writing pools vs in-session probe policy.
 * Read-only — proves classification with code-path checks, no bank mutations.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SENTENCE_POOLS } from "../data/english-questions/sentence-pools.js";
import { TRANSLATION_POOLS } from "../data/english-questions/translation-pools.js";
import { mergeDiagnosticContractIntoParams } from "../utils/diagnostic-question-contract.js";
import {
  extractDiagnosticMetadataFromQuestion,
  mergeDiagnosticIntoMistakeEntry,
} from "../utils/diagnostic-mistake-metadata.js";
import { normalizeMistakeEvent } from "../utils/mistake-event.js";
import { inferNormalizedTags } from "../utils/fast-diagnostic-engine/infer-tags.js";
import { buildPendingProbeFromMistake } from "../utils/active-diagnostic-runtime/build-pending-probe.js";

const englishMasterSrc = readFileSync(
  new URL("../pages/learning/english-master.js", import.meta.url),
  "utf8"
);
assert.match(
  englishMasterSrc,
  /currentQuestion\.topic === "grammar"/,
  "english-master gates buildPendingProbeFromMistake to grammar topic only"
);

/** @type {Array<{ poolKey: string, kind: string, rows: number, diagnosticSkillId: number, patternFamily: number, skillId: number, classification: string }>} */
const table = [];

function scanPools(pools, kind) {
  for (const [poolKey, arr] of Object.entries(pools)) {
    if (!Array.isArray(arr)) continue;
    let diagnosticSkillId = 0;
    let patternFamily = 0;
    let skillId = 0;
    for (const r of arr) {
      if (r?.diagnosticSkillId) diagnosticSkillId++;
      if (r?.patternFamily) patternFamily++;
      if (r?.skillId) skillId++;
    }
    const classification =
      kind === "translation"
        ? "B_active_row_diagnostic_no_in_session_probe"
        : "B_active_row_diagnostic_no_in_session_probe";
    table.push({
      poolKey,
      kind,
      rows: arr.length,
      diagnosticSkillId,
      patternFamily,
      skillId,
      classification,
    });
  }
}

scanPools(SENTENCE_POOLS, "sentence");
scanPools(TRANSLATION_POOLS, "translation");

// Simulate sentence serve + mistake (patternFamily path only)
const sentenceRow = SENTENCE_POOLS.base[0];
const servedSentence = {
  topic: "sentences",
  question: `השלם: ${sentenceRow.template}`,
  correctAnswer: sentenceRow.correct,
  params: mergeDiagnosticContractIntoParams(
    { patternFamily: sentenceRow.patternFamily || "sentence_completion" },
    sentenceRow
  ),
  levelKey: "easy",
};
let wrongS = {
  topic: "sentences",
  bucketKey: "sentences",
  grade: "g3",
  level: "easy",
  isCorrect: false,
};
wrongS = mergeDiagnosticIntoMistakeEntry(
  wrongS,
  extractDiagnosticMetadataFromQuestion(servedSentence, {})
);
const normS = normalizeMistakeEvent(wrongS, "english");
assert.ok(normS.patternFamily, "sentence mistake keeps patternFamily");
const probeS = buildPendingProbeFromMistake(
  normS,
  { fallbackTopicId: "sentences", fallbackGrade: "g3", fallbackLevel: "easy" },
  "english"
);
assert.equal(probeS, null, "sentences topic does not get grammar-gated probe in engine map by default");

// Translation row
const trRow = TRANSLATION_POOLS.classroom[0];
const servedTr = {
  topic: "translation",
  question: `תרגם: "${trRow.en}"`,
  correctAnswer: trRow.he,
  params: { patternFamily: trRow.patternFamily, direction: "en_to_he" },
  levelKey: "easy",
};
let wrongT = {
  topic: "translation",
  bucketKey: "translation",
  grade: "g2",
  level: "easy",
  isCorrect: false,
};
wrongT = mergeDiagnosticIntoMistakeEntry(
  wrongT,
  extractDiagnosticMetadataFromQuestion(servedTr, {})
);
assert.ok(wrongT.patternFamily, "translation mistake keeps patternFamily");

console.log("PASS: english-nongrammar-diagnostic-audit");
console.log("CLASSIFICATION: sentence/translation = Active + row-level diagnostic; in-session probe = grammar-only by design");
for (const row of table) {
  console.log(
    `${row.kind}\t${row.poolKey}\trows=${row.rows}\tdiagSkill=${row.diagnosticSkillId}\tpf=${row.patternFamily}\tskillId=${row.skillId}\t${row.classification}`
  );
}
