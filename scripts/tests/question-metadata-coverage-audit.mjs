/**
 * Q2-A — read-only question metadata coverage audit.
 * Scans static banks and generator utilities; prints summary only.
 * Does NOT read DB, write data, or change product behavior.
 *
 * Run: node scripts/tests/question-metadata-coverage-audit.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {Record<string, { label: string, paths: string[], rating: string }>} */
const SUBJECT_SCOPES = {
  math: {
    label: "Math",
    paths: [
      "utils/math-question-generator.js",
      "utils/math-question-metadata.js",
      "lib/learning/math-geometry-canonical-metadata.js",
    ],
    rating: "high",
  },
  geometry: {
    label: "Geometry",
    paths: [
      "utils/geometry-question-generator.js",
      "utils/geometry-diagnostic-metadata-bridge.js",
      "utils/geometry-conceptual-bank.js",
      "lib/learning/math-geometry-canonical-metadata.js",
    ],
    rating: "high",
  },
  science: {
    label: "Science",
    paths: [
      "data/science-questions.js",
      "lib/learning/science-canonical-metadata.js",
    ],
    rating: "high-bank",
  },
  english: {
    label: "English",
    paths: [
      "utils/english-question-generator.js",
      "data/english-questions",
      "lib/learning/english-canonical-metadata.js",
    ],
    rating: "high-bank",
  },
  hebrew: {
    label: "Hebrew",
    paths: [
      "utils/hebrew-question-generator.js",
      "utils/hebrew-rich-question-bank.js",
      "utils/hebrew-rich-diagnostic-metadata-enrich.js",
      "lib/learning/hebrew-canonical-metadata.js",
    ],
    rating: "high-bank",
  },
  moledet: {
    label: "Moledet/Geography",
    paths: [
      "utils/moledet-geography-question-generator.js",
      "utils/moledet-geography-diagnostic-metadata-bridge.js",
      "data/geography-questions",
      "lib/learning/moledet-geography-canonical-metadata.js",
    ],
    rating: "high-bank",
  },
};

/** @type {{ key: string, label: string, patterns: RegExp[] }[]} */
const SIGNAL_PATTERNS = [
  { key: "diagnosticSkillId", label: "diagnosticSkillId / skillId", patterns: [/diagnosticSkillId/g, /\bskillId\b/g] },
  { key: "patternFamily", label: "patternFamily", patterns: [/patternFamily/g] },
  { key: "subtype", label: "subtype / subSkill", patterns: [/\bsubtype\b/g, /\bsubskillId\b/g, /\bsubtopicId\b/g] },
  { key: "cognitiveLevel", label: "cognitiveLevel / difficultyDepth", patterns: [/cognitiveLevel/g, /difficultyBand/g] },
  { key: "expectedErrorTags", label: "expectedErrorTags / patterns", patterns: [/expectedErrorTags/g, /expectedErrorTypes/g, /distractorFamily/g] },
  { key: "questionEngine", label: "questionEngine (Phase 8)", patterns: [/questionEngine/g, /QUESTION_ENGINE_VERSION/g] },
  {
    key: "canonicalMetadata",
    label: "canonicalMetadata (Q2-C1–C5)",
    patterns: [
      /canonicalMetadata/g,
      /attachCanonicalMetadataToMathGeometryQuestion/g,
      /attachCanonicalMetadataToEnglishQuestion/g,
      /enrichEnglishPoolRowWithCanonicalMetadata/g,
      /attachCanonicalMetadataToHebrewQuestion/g,
      /enrichHebrewPoolRowWithCanonicalMetadata/g,
      /attachCanonicalMetadataToMoledetQuestion/g,
      /enrichMoledetBankRowWithCanonicalMetadata/g,
    ],
  },
  {
    key: "problemClass",
    label: "problemClass (Q2-C1/C4/C5)",
    patterns: [/problemClass/g, /inferMathProblemClass/g, /inferGeometryProblemClass/g],
  },
];

/**
 * @param {string} absPath
 * @returns {string[]}
 */
function collectFiles(absPath) {
  try {
    const st = statSync(absPath);
    if (st.isFile()) return [absPath];
    if (!st.isDirectory()) return [];
    /** @type {string[]} */
    const out = [];
    for (const name of readdirSync(absPath)) {
      if (name.startsWith(".")) continue;
      const child = join(absPath, name);
      const cst = statSync(child);
      if (cst.isDirectory()) out.push(...collectFiles(child));
      else if (/\.(js|mjs|ts|tsx)$/.test(name)) out.push(child);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function readText(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * @param {string} text
 * @param {RegExp[]} patterns
 */
function countSignals(text, patterns) {
  let total = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) total += m.length;
  }
  return total;
}

console.log("=== Q2-A Question Metadata Coverage Audit (read-only) ===\n");
console.log(`Root: ${ROOT}`);
console.log(`Contract: docs/diagnostics/QUESTION_METADATA_CONTRACT.md`);
console.log(`Audit doc: docs/diagnostics/QUESTION_METADATA_CURRENT_COVERAGE_AUDIT.md\n`);

/** @type {Record<string, Record<string, number>>} */
const subjectTotals = {};

for (const [subjectKey, scope] of Object.entries(SUBJECT_SCOPES)) {
  /** @type {string[]} */
  const files = [];
  for (const rel of scope.paths) {
    files.push(...collectFiles(join(ROOT, rel)));
  }
  const uniqueFiles = [...new Set(files)];

  /** @type {Record<string, number>} */
  const signals = {};
  for (const sig of SIGNAL_PATTERNS) signals[sig.key] = 0;

  for (const file of uniqueFiles) {
    const text = readText(file);
    if (!text) continue;
    for (const sig of SIGNAL_PATTERNS) {
      signals[sig.key] += countSignals(text, sig.patterns);
    }
  }

  subjectTotals[subjectKey] = signals;

  console.log(`--- ${scope.label} (${scope.rating}) ---`);
  console.log(`  Files scanned: ${uniqueFiles.length}`);
  for (const sig of SIGNAL_PATTERNS) {
    const n = signals[sig.key];
    const mark = n > 0 ? "present" : "missing";
    console.log(`  ${sig.label}: ${n} refs (${mark})`);
  }
  console.log("");
}

// Infrastructure snapshot (single-file SSOT)
const infraFiles = [
  "lib/learning/question-engine-metadata.js",
  "utils/diagnostic-question-contract.js",
  "lib/classroom-activities/assigned-activity-snapshot.server.js",
  "lib/learning/activity-classification.js",
];

console.log("--- Shared infrastructure ---");
for (const rel of infraFiles) {
  const text = readText(join(ROOT, rel));
  const exists = text.length > 0;
  console.log(`  ${rel}: ${exists ? "found" : "MISSING"}`);
  if (exists) {
    for (const sig of SIGNAL_PATTERNS) {
      const n = countSignals(text, sig.patterns);
      if (n > 0) console.log(`    ${sig.label}: ${n}`);
    }
  }
}

console.log("\n--- Contract fields not found in scanned generators (expected gaps) ---");
const gapFields = ["problemClass", "difficultyDepth", "requiresVisual", "requiresAudio", "diagnosticEligibleByMetadata"];
for (const field of gapFields) {
  let total = 0;
  for (const signals of Object.values(subjectTotals)) {
    total += signals[field] || 0;
  }
  console.log(`  ${field}: ${total === 0 ? "not in subject scans (Q2-B/C)" : `${total} refs`}`);
}

console.log("\n--- Q2-C runtime samples (read-only, all subjects) ---");
try {
  const { attachProfessionalMathMetadata } = await import(
    "../../utils/math-question-metadata.js"
  );
  const { enrichGeometryProceduralParams } = await import(
    "../../utils/geometry-diagnostic-metadata-bridge.js"
  );
  const { attachCanonicalMetadataToMathGeometryQuestion } = await import(
    "../../lib/learning/math-geometry-canonical-metadata.js"
  );

  const mathOut = attachProfessionalMathMetadata(
    { operation: "fractions", params: { kind: "frac_add_like" }, answers: ["a", "b"], correctAnswer: "a" },
    { selectedOp: "fractions", gradeKey: "g4", mathLevelKey: "medium" }
  );
  const mathCm = mathOut?.params?.canonicalMetadata;
  console.log(`  Math params.canonicalMetadata: ${mathCm ? "POPULATED" : "MISSING"}`);
  if (mathCm) {
    console.log(`    skillId=${mathCm.skillId} subSkill=${mathCm.subSkill} problemClass=${mathCm.problemClass}`);
  }

  const geoParams = enrichGeometryProceduralParams(
    { kind: "square_area" },
    { topic: "area", gradeKey: "g4", levelKey: "medium" }
  );
  const geoOut = attachCanonicalMetadataToMathGeometryQuestion(
    { topic: "area", shape: "square", params: geoParams, answers: ["1", "2"], correctAnswer: "1" },
    { subject: "geometry", gradeKey: "g4", topic: "area" }
  );
  const geoCm = geoOut?.params?.canonicalMetadata;
  console.log(`  Geometry params.canonicalMetadata: ${geoCm ? "POPULATED" : "MISSING"}`);
  if (geoCm) {
    console.log(`    skillId=${geoCm.skillId} requiresVisual=${geoCm.requiresVisual} problemClass=${geoCm.problemClass}`);
  }

  const { SCIENCE_QUESTIONS } = await import("../../data/science-questions.js");
  const sciTotal = SCIENCE_QUESTIONS.length;
  let sciWithCanonical = 0;
  for (const row of SCIENCE_QUESTIONS) {
    if (row?.params?.canonicalMetadata?.skillId) sciWithCanonical += 1;
  }
  console.log(`  Science bank canonicalMetadata: ${sciWithCanonical}/${sciTotal} rows`);
  const sciSample = SCIENCE_QUESTIONS.find((r) => r.id === "body_1");
  if (sciSample?.params?.canonicalMetadata) {
    const cm = sciSample.params.canonicalMetadata;
    console.log(`    sample body_1 skillId=${cm.skillId} questionType=${cm.questionType} problemClass=${cm.problemClass}`);
  }

  const { generateQuestion: generateEnglishQuestion } = await import(
    "../../utils/english-question-generator.js"
  );
  const { GRAMMAR_POOLS, SENTENCE_POOLS, TRANSLATION_POOLS } = await import(
    "../../data/english-questions/index.js"
  );

  let engPoolTotal = 0;
  let engPoolWithCanonical = 0;
  for (const pools of [GRAMMAR_POOLS, SENTENCE_POOLS, TRANSLATION_POOLS]) {
    for (const rows of Object.values(pools)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        engPoolTotal += 1;
        if (row?.canonicalMetadata?.skillId) engPoolWithCanonical += 1;
      }
    }
  }
  console.log(`  English pool row.canonicalMetadata: ${engPoolWithCanonical}/${engPoolTotal} rows`);

  const engGrammar = generateEnglishQuestion(1, "grammar", "g3", null, "easy", null);
  const engVocab = generateEnglishQuestion(1, "vocabulary", "g3", null, "easy", null);
  const engTranslation = generateEnglishQuestion(1, "translation", "g3", null, "easy", null);
  const engSentences = generateEnglishQuestion(1, "sentences", "g3", null, "easy", null);

  for (const [label, q] of [
    ["grammar", engGrammar],
    ["vocabulary", engVocab],
    ["translation", engTranslation],
    ["sentences", engSentences],
  ]) {
    const cm = q?.params?.canonicalMetadata;
    console.log(
      `  English generate ${label} params.canonicalMetadata: ${cm ? "POPULATED" : "MISSING"}`
    );
    if (cm) {
      console.log(
        `    skillId=${cm.skillId} questionType=${cm.questionType} answerFormat=${cm.answerFormat} confidence=${cm.metadataConfidence}`
      );
    }
  }

  const { generateQuestion: generateHebrewQuestion } = await import(
    "../../utils/hebrew-question-generator.js"
  );
  const { HEBREW_RICH_POOL } = await import("../../utils/hebrew-rich-question-bank.js");

  let hebPoolWithCanonical = 0;
  for (const row of HEBREW_RICH_POOL) {
    if (row?.canonicalMetadata?.skillId) hebPoolWithCanonical += 1;
  }
  console.log(
    `  Hebrew rich pool row.canonicalMetadata: ${hebPoolWithCanonical}/${HEBREW_RICH_POOL.length} rows`
  );

  const hebEasy = { name: "קל" };
  const hebComp = generateHebrewQuestion(hebEasy, "comprehension", "g3", null, {});
  const hebVocab = generateHebrewQuestion(hebEasy, "vocabulary", "g4", null, {});
  const hebGrammar = generateHebrewQuestion({ name: "בינוני" }, "grammar", "g3", null, {});

  for (const [label, q] of [
    ["comprehension", hebComp],
    ["vocabulary", hebVocab],
    ["grammar", hebGrammar],
  ]) {
    const cm = q?.params?.canonicalMetadata;
    console.log(
      `  Hebrew generate ${label} params.canonicalMetadata: ${cm ? "POPULATED" : "MISSING"}`
    );
    if (cm) {
      console.log(
        `    skillId=${cm.skillId} questionType=${cm.questionType} answerFormat=${cm.answerFormat} confidence=${cm.metadataConfidence}`
      );
    }
  }

  const { generateQuestion: generateMoledetQuestion } = await import(
    "../../utils/moledet-geography-question-generator.js"
  );
  const geo = await import("../../data/geography-questions/index.js");

  let moledetPoolTotal = 0;
  let moledetPoolWithCanonical = 0;
  for (const pool of [
    geo.G3_EASY_QUESTIONS,
    geo.G5_EASY_QUESTIONS,
    geo.G6_HARD_QUESTIONS,
  ]) {
    for (const rows of Object.values(pool)) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        moledetPoolTotal += 1;
        if (row?.params?.canonicalMetadata?.skillId) moledetPoolWithCanonical += 1;
      }
    }
  }
  console.log(
    `  Moledet bank sample params.canonicalMetadata: ${moledetPoolWithCanonical}/${moledetPoolTotal} rows (g3/g5/g6 easy-hard sample pools)`
  );

  const molEasy = { name: "קל" };
  const molHomeland = generateMoledetQuestion(molEasy, "homeland", "g3", null, null);
  const molMaps = generateMoledetQuestion(molEasy, "maps", "g5", null, null);
  const molCitizenship = generateMoledetQuestion(molEasy, "citizenship", "g5", null, null);

  for (const [label, q] of [
    ["homeland", molHomeland],
    ["maps", molMaps],
    ["citizenship", molCitizenship],
  ]) {
    const cm = q?.params?.canonicalMetadata;
    console.log(
      `  Moledet generate ${label} params.canonicalMetadata: ${cm ? "POPULATED" : "MISSING"}`
    );
    if (cm) {
      console.log(
        `    skillId=${cm.skillId} questionType=${cm.questionType} answerFormat=${cm.answerFormat} confidence=${cm.metadataConfidence}`
      );
    }
  }
} catch (err) {
  console.log(`  Q2-C1/C2/C3/C4/C5 runtime sample skipped: ${err?.message || err}`);
}

console.log("\n--- Q2-A/Q2-C assertions ---");
console.log("  Product behavior changed: NO (read-only scan + sample only)");
console.log("  DB accessed: NO");
console.log("  Q1 evidence quality touched: NO");
console.log("  Report aggregate touched: NO");
console.log("\nDone.");
