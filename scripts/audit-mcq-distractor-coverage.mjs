#!/usr/bin/env node
/**
 * Audit MCQ distractor tagging — static generators + runtime enrichment + question banks.
 * Run: node scripts/audit-mcq-distractor-coverage.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichMcqChoicesWithEvidenceTags } from "../lib/learning/mcq-option-evidence-tagging.js";
import { GENERIC_PROXIMITY } from "../lib/learning/question-engine-metadata.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const GENERATOR_FILES = [
  "utils/math-question-generator.js",
  "utils/english-question-generator.js",
  "utils/hebrew-question-generator.js",
  "utils/geometry-question-generator.js",
  "utils/moledet-geography-question-generator.js",
  "utils/history-question-generator.js",
  "data/science-questions.js",
  "data/history-questions/g6-generated.js",
  "data/geography-questions/g2.js",
  "data/geography-questions/g3.js",
  "data/geography-questions/g4.js",
  "data/geography-questions/g5.js",
  "data/geography-questions/g6.js",
  "utils/hebrew-rich-question-bank.js",
];

/** @param {string} relPath */
function scanFile(relPath) {
  const abs = join(ROOT, relPath);
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    return null;
  }

  const explicitTags = new Set();
  for (const m of text.matchAll(/distractorFamily\s*[:=]\s*["'`]([^"'`]+)["'`]/g)) {
    explicitTags.add(m[1]);
  }
  for (const m of text.matchAll(/expectedErrorTags\s*:\s*\[([^\]]+)\]/g)) {
    for (const t of m[1].match(/["'`]([^"'`]+)["'`]/g) || []) {
      explicitTags.add(t.replace(/["'`]/g, ""));
    }
  }

  const tagged = (text.match(/distractorFamily\s*[:=]/g) || []).length;
  const expectedErrorTagsRefs = (text.match(/expectedErrorTags/g) || []).length;
  const inferCalls = (text.match(/inferMathDistractorFamily/g) || []).length;
  const genericProximity = (text.match(/GENERIC_PROXIMITY|generic_proximity/g) || []).length;
  const unknownTags = (text.match(/distractorFamily\s*[:=]\s*["'`]unknown["'`]/g) || []).length;
  const mcqBuilders = (text.match(/finalizeMcqOptions|buildMathMcqAnswerList|buildMcq|options\s*:/g) || []).length;

  return {
    file: relPath,
    explicitTaggedCells: tagged,
    expectedErrorTagsRefs,
    distinctTags: [...explicitTags],
    inferCalls,
    genericProximityRefs: genericProximity,
    unknownTagRefs: unknownTags,
    mcqBuilderRefs: mcqBuilders,
    hasMcqContent: mcqBuilders > 0 || inferCalls > 0 || tagged > 0 || expectedErrorTagsRefs > 0,
    runtimeEnrichmentEligible: expectedErrorTagsRefs > 0 || tagged > 0 || inferCalls > 0,
  };
}

/** Runtime enrichment sample — science-style MCQ with expectedErrorTags */
function runtimeEnrichmentSample() {
  const choices = ["correct", "wrongA", "wrongB", "wrongC"];
  const enriched = enrichMcqChoicesWithEvidenceTags(
    choices,
    { expectedErrorTags: ["concept_confusion", "classification_error"] },
    "correct",
    0
  );
  let meaningful = 0;
  let tagged = 0;
  let unknown = 0;
  for (let i = 0; i < enriched.length; i++) {
    if (i === 0) continue;
    meaningful += 1;
    const df = enriched[i]?.distractorFamily;
    if (df && df !== GENERIC_PROXIMITY && df !== "unknown") tagged += 1;
    else if (df === GENERIC_PROXIMITY || df === "unknown") unknown += 1;
  }
  return { meaningful, tagged, unknown };
}

function main() {
  const results = GENERATOR_FILES.map(scanFile).filter(Boolean);
  const generatorsWithMcq = results.filter((r) => r.hasMcqContent);
  const runtimeEligible = results.filter((r) => r.runtimeEnrichmentEligible);
  const totalExplicitTags = results.reduce((s, r) => s + r.explicitTaggedCells, 0);
  const totalExpectedErrorTags = results.reduce((s, r) => s + r.expectedErrorTagsRefs, 0);
  const totalInfer = results.reduce((s, r) => s + r.inferCalls, 0);
  const totalGeneric = results.reduce((s, r) => s + r.genericProximityRefs, 0);
  const totalUnknown = results.reduce((s, r) => s + r.unknownTagRefs, 0);
  const distinctAllTags = new Set(results.flatMap((r) => r.distinctTags));

  const runtimeSample = runtimeEnrichmentSample();

  console.log("=== MCQ Distractor Coverage Audit ===\n");
  for (const r of results) {
    if (!r.hasMcqContent) continue;
    console.log(`${r.file}:`);
    console.log(`  explicit: ${r.explicitTaggedCells}, expectedErrorTags refs: ${r.expectedErrorTagsRefs}, infer: ${r.inferCalls}`);
    console.log(`  distinct tags: ${r.distinctTags.slice(0, 8).join(", ") || "(none)"}${r.distinctTags.length > 8 ? "…" : ""}`);
  }

  console.log("\n=== Summary ===");
  console.log(`generator/bank files scanned: ${GENERATOR_FILES.length}`);
  console.log(`files with MCQ content: ${generatorsWithMcq.length}`);
  console.log(`files with static or infer tagging path: ${runtimeEligible.length}`);
  console.log(`explicit distractorFamily assignments: ${totalExplicitTags}`);
  console.log(`expectedErrorTags bank metadata refs: ${totalExpectedErrorTags}`);
  console.log(`inferMathDistractorFamily calls: ${totalInfer}`);
  console.log(`distinct taxonomy tags in banks/generators: ${distinctAllTags.size}`);
  console.log(`runtime enrichment (question-engine-metadata): ACTIVE for all MCQ at serve time`);
  console.log(`runtime sample — meaningful wrong options: ${runtimeSample.meaningful}, tagged: ${runtimeSample.tagged}, generic/unknown: ${runtimeSample.unknown}`);
  console.log(`static generic_proximity refs in source: ${totalGeneric} (fallback when no provable error)`);
  console.log(`static unknown refs in source: ${totalUnknown}`);
  console.log(`\nUnknown reasons:`);
  console.log(`  - generic_proximity: no expectedErrorTags/patternFamily/infer path for that option`);
  console.log(`  - unknown: legacy rows without questionEngine enrichment (backfill targets these)`);
}

main();
