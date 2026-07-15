/**
 * Static inventory + mapping plan for `utils/math-question-generator.js` (procedural math).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GRADES } from "../math-constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATOR_PATH = join(__dirname, "..", "math-question-generator.js");

/**
 * Extract `kind: "..."` string literals from generator source (heuristic).
 * @param {string} source
 */
export function extractKindLiteralsFromSource(source) {
  /** @type {Set<string>} */
  const set = new Set();
  const re = /kind:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    set.add(m[1]);
  }
  return [...set].sort();
}

/**
 * @param {string} [generatorPath]
 */
export function buildMathGeneratorMetadataMap(generatorPath = GENERATOR_PATH) {
  const source = readFileSync(generatorPath, "utf8");
  const kindLiterals = extractKindLiteralsFromSource(source);

  /** @type {string[]} */
  const operationsUnion = [];
  for (const g of Object.keys(GRADES)) {
    const gr = /** @type {{ operations?: string[] }} */ (GRADES[g]);
    for (const op of gr.operations || []) {
      if (!operationsUnion.includes(op)) operationsUnion.push(op);
    }
  }
  operationsUnion.sort();

  const diagnosticIdMatches = [
    ...source.matchAll(/diagnosticSkillId:\s*pb\.diagnosticSkillId\s*\|\|\s*["']([^"']+)["']/g),
    ...source.matchAll(/diagnosticSkillId:\s*["']([^"']+)["']/g),
  ];
  const diagnosticIds = [
    ...new Set(diagnosticIdMatches.map((m) => m[1]).filter((x) => x && !x.includes("pb."))),
  ].sort();

  const safeApply = {
    approach:
      "Runtime: `attachProfessionalMathMetadata` merges subject/skillId/subskillId/difficulty/cognitiveLevel/expectedErrorTypes and fills params.diagnosticSkillId / subtype / patternFamily when missing.",
    riskLevel: "low",
    notes: "Does not replace numeric correctAnswer, answers[], or question text after generation - only enriches metadata fields.",
  };

  /** @type {{ pattern: string, risk: string }[]} */
  const riskyMappings = [
    {
      pattern: "Blanket patternFamily `math_${kind}` when absent",
      risk: "low - additive only; existing probe patternFamily preserved.",
    },
    {
      pattern: "diagnosticSkillId default from resolveMathSkillId → math_${kind}",
      risk: "low - aligns scanner effectiveSkillId with generator kind.",
    },
  ];

  const proposedMappingSummary = {
    skillId:
      "Prefer params.diagnosticSkillId (probes / fractions); else `math_${kind}`; else `math_op_${selectedOp}`.",
    subskillId: "params.subtype || patternFamily || kind || selectedOp",
    difficulty: "mapMathLevelKeyToDifficulty(easy|medium|hard) → canonical basic|standard|advanced",
    cognitiveLevel: "inferMathCognitiveLevel from probePower, kind prefix, word_problems, level",
    expectedErrorTypes: "union of expectedErrorTags (filtered to taxonomy) + heuristics by kind/operation",
    prerequisiteSkillIds: "empty in fast-track (curriculum graph not auto-inferred)",
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    generator: {
      path: "utils/math-question-generator.js",
      absPath: generatorPath,
      bytes: source.length,
    },
    discovery: {
      gradeKeys: Object.keys(GRADES).sort(),
      operationUnion: operationsUnion,
      kindLiteralsDiscovered: kindLiterals,
      kindLiteralCount: kindLiterals.length,
      diagnosticSkillIdStringsSample: diagnosticIds.slice(0, 40),
      diagnosticSkillIdCount: diagnosticIds.length,
    },
    emittedFieldsAfterIntegration: [
      "subject",
      "skillId",
      "subskillId",
      "difficulty",
      "cognitiveLevel",
      "expectedErrorTypes",
      "prerequisiteSkillIds",
      "params.subjectId",
      "params.diagnosticSkillId (if missing)",
      "params.subtype (if missing)",
      "params.patternFamily (if missing)",
    ],
    missingMetadataBeforeIntegration: [
      "Root-level subject / skill / difficulty not present on all generator outputs",
      "expectedErrorTypes as normalized array for scanner completeness",
    ],
    proposedMappingSummary,
    safeApply,
    confidenceBreakdown: {
      high: "Probe + fraction rows already carry diagnosticSkillId / expectedErrorTags",
      medium: "Standard op/kind rows use deterministic math_${kind} skill id",
      low: "Edge kinds with minimal params - still safe id pattern math_*",
    },
    riskyMappings,
    needsHumanReview: [
      "Prerequisite skill chains for reports (left empty in fast-track)",
      "Tuning cognitive heuristics per classroom if needed",
    ],
  };
}
