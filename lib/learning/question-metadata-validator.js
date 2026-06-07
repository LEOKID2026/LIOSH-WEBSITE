/**
 * Q2-D — Question metadata validator (read-only).
 * Coverage thresholds + quality checks before any Q2-E consumption.
 *
 * @see docs/diagnostics/QUESTION_METADATA_Q2_D_VALIDATOR.md
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { QUESTION_METADATA_CONTRACT_VERSION } from "./question-metadata-normalizer.js";
import { isFallbackOnlySkillId } from "./question-metadata-fallback.js";

export { isFallbackOnlySkillId };

/** @typedef {{ subject: string, phase: string, minTotal: number, minCoveragePct: number, label: string }} SubjectThreshold */

export const QUESTION_METADATA_SUBJECT_THRESHOLDS = Object.freeze({
  math: {
    subject: "math",
    phase: "Q2-C1",
    label: "Math",
    minTotal: 1,
    minCoveragePct: 100,
    sampleKind: "generator",
  },
  geometry: {
    subject: "geometry",
    phase: "Q2-C1",
    label: "Geometry",
    minTotal: 1,
    minCoveragePct: 100,
    sampleKind: "generator",
  },
  science: {
    subject: "science",
    phase: "Q2-C2",
    label: "Science",
    minTotal: 1000,
    minCoveragePct: 100,
    sampleKind: "bank",
  },
  english: {
    subject: "english",
    phase: "Q2-C3",
    label: "English",
    minTotal: 1000,
    minCoveragePct: 100,
    sampleKind: "bank+generator",
  },
  hebrew: {
    subject: "hebrew",
    phase: "Q2-C4",
    label: "Hebrew",
    minTotal: 50,
    minCoveragePct: 100,
    sampleKind: "bank+generator",
  },
  moledet: {
    subject: "moledet_geography",
    phase: "Q2-C5",
    label: "Moledet/Geography",
    minTotal: 3000,
    minCoveragePct: 100,
    sampleKind: "bank+generator+freeze",
  },
});

const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const ANSWER_FORMATS = new Set(["mcq", "numeric", "text", "drag", "matching"]);

const FORBIDDEN_CANONICAL_KEYS = new Set([
  "isDiagnosticEligible",
  "evidenceCategory",
  "evidenceQuality",
  "_evidenceQuality",
]);

/** Q2-E.1 approved internal consumption (parent context only, flag-gated). */
export const Q2_E_APPROVED_CONSUMPTION_SUFFIXES = [
  "lib/learning/question-metadata-resolve-at-answer.js",
  "lib/learning/evidence-quality.js",
  "lib/parent-server/report-data-aggregate.server.js",
];

/** Paths that must NOT consume canonicalMetadata outside approved Q2-E files. */
export const NO_CONSUMPTION_SCAN_PATHS = [
  "lib/learning/evidence-quality.js",
  "lib/parent-server/report-data-aggregate.server.js",
  "lib/parent-server/parent-report-parent-facing.server.js",
  "lib/parent-server/parent-facing-report-authority.js",
  "lib/guardian-server/guardian-report.server.js",
  "lib/teacher-server/teacher-report.server.js",
  "lib/teacher-server/teacher-class-report.server.js",
  "lib/school-server",
  "pages/api/parent",
  "pages/api/guardian",
  "pages/api/teacher",
  "pages/api/school",
];

/** Consumption patterns forbidden outside metadata/normalizer/canonical modules. */
export const FORBIDDEN_CONSUMPTION_PATTERNS = [
  /params\.canonicalMetadata\.skillId/,
  /params\.canonicalMetadata\.subSkill/,
  /canonicalMetadata\.skillId/,
  /canonicalMetadata\.subSkill/,
  /normalizeQuestionMetadata\([^)]*\)[\s\S]{0,80}report/,
];

const ALLOWED_CONSUMPTION_PREFIXES = [
  "lib/learning/question-metadata",
  "lib/learning/math-geometry-canonical-metadata",
  "lib/learning/science-canonical-metadata",
  "lib/learning/english-canonical-metadata",
  "lib/learning/hebrew-canonical-metadata",
  "lib/learning/moledet-geography-canonical-metadata",
  "scripts/tests/question-metadata",
  "tests/learning/",
  "docs/diagnostics/",
];

const CROSS_CONTEXT_SCAN_DIRS = [
  "lib/parent-server",
  "lib/teacher-server",
  "lib/guardian-server",
  "lib/school-server",
  "lib/learning",
  "pages/api",
];

/** Line-level product-code guard (exclude validator/docs/tests). */
const CROSS_CONTEXT_BAD_LINE =
  /canonicalMetadata.*(parity|mergeContext|cross[-_]?context)|(parity|mergeContext|cross[-_]?context).*canonicalMetadata/i;

const NON_DIAGNOSTIC_KINDS = new Set([
  "book_context",
  "book",
  "step_by_step",
  "step-by-step",
  "guided_practice",
  "discussion",
  "review_mistakes",
  "mistakes_review",
  "empty_pool",
]);

/**
 * @param {unknown} v
 */
function pickStr(v) {
  if (v == null || v === "") return "";
  return String(v).trim();
}

/**
 * @param {string} answerMode
 * @returns {"mcq"|"numeric"|"text"|null}
 */
export function expectedAnswerFormatFromMode(answerMode) {
  const m = pickStr(answerMode).toLowerCase();
  if (m === "typing" || m === "text" || m === "open") return "text";
  if (m === "numeric" || m === "number") return "numeric";
  if (m === "choice" || m === "mcq" || !m) return "mcq";
  return "mcq";
}

/**
 * Validate a canonical metadata block (field presence + safety).
 *
 * @param {Record<string, unknown>|null|undefined} cm
 * @param {{
 *   subject?: string,
 *   topic?: string,
 *   answerMode?: string,
 *   isEmptyPool?: boolean,
 *   hasVisualAsset?: boolean,
 *   explicitAudio?: boolean,
 *   sourceHasErrorTags?: boolean,
 *   hasExplicitDiagnostic?: boolean,
 *   subSkillDerivable?: boolean,
 *   questionTypeDerivable?: boolean,
 * }} [ctx]
 * @returns {string[]}
 */
export function validateCanonicalMetadataBlock(cm, ctx = {}) {
  /** @type {string[]} */
  const issues = [];

  if (!cm || typeof cm !== "object") {
    return ctx.isEmptyPool ? [] : ["canonicalMetadata missing"];
  }

  for (const key of Object.keys(cm)) {
    if (FORBIDDEN_CANONICAL_KEYS.has(key)) {
      issues.push(`forbidden canonical field: ${key}`);
    }
  }

  if (ctx.isEmptyPool) {
    if (cm.metadataConfidence !== "low") {
      issues.push("empty pool must have low metadataConfidence");
    }
    if (cm.diagnosticEligibleByMetadata === true) {
      issues.push("empty pool must not be diagnosticEligibleByMetadata");
    }
    return issues;
  }

  if (pickStr(cm.contractVersion) !== QUESTION_METADATA_CONTRACT_VERSION) {
    issues.push(`contractVersion must be ${QUESTION_METADATA_CONTRACT_VERSION}`);
  }
  if (!pickStr(cm.subject)) issues.push("subject required");
  if (ctx.subject && pickStr(cm.subject) && pickStr(cm.subject) !== ctx.subject) {
    issues.push(`subject mismatch expected ${ctx.subject}`);
  }
  if (!pickStr(cm.topic) && pickStr(ctx.topic)) {
    issues.push("topic required when derivable");
  }
  if (!pickStr(cm.skillId)) issues.push("skillId required");
  if (ctx.subSkillDerivable !== false && !pickStr(cm.subSkill)) {
    issues.push("subSkill required when derivable");
  }
  if (ctx.questionTypeDerivable !== false && !pickStr(cm.questionType)) {
    // questionType may be omitted when unclear — not a hard fail
  }
  if (!pickStr(cm.answerFormat) || !ANSWER_FORMATS.has(pickStr(cm.answerFormat))) {
    issues.push("answerFormat must be mcq|numeric|text|drag|matching");
  }
  if (!pickStr(cm.metadataConfidence) || !CONFIDENCE_LEVELS.has(pickStr(cm.metadataConfidence))) {
    issues.push("metadataConfidence must be high|medium|low");
  }
  if ("diagnosticEligibleByMetadata" in cm && typeof cm.diagnosticEligibleByMetadata !== "boolean") {
    issues.push("diagnosticEligibleByMetadata must be boolean when present");
  }

  if (cm.requiresAudio === true && !ctx.explicitAudio) {
    issues.push("requiresAudio true without explicit audio item");
  }
  if (cm.requiresAudio !== false && cm.requiresAudio != null && cm.requiresAudio !== true) {
    issues.push("requiresAudio must be false unless explicitly audio");
  }
  if (cm.requiresVisual === true && !ctx.hasVisualAsset) {
    issues.push("requiresVisual true without visual asset");
  }

  if (pickStr(ctx.answerMode)) {
    const expected = expectedAnswerFormatFromMode(ctx.answerMode);
    if (expected && pickStr(cm.answerFormat) !== expected) {
      issues.push(`answerFormat ${cm.answerFormat} does not match answerMode ${ctx.answerMode}`);
    }
  }

  issues.push(...validateConfidenceQuality(cm, ctx));

  if (ctx.sourceHasErrorTags && (!Array.isArray(cm.possibleErrorPatterns) || cm.possibleErrorPatterns.length === 0)) {
    issues.push("possibleErrorPatterns should be preserved when source tags exist");
  }

  return issues;
}

/**
 * @param {Record<string, unknown>} cm
 * @param {Record<string, unknown>} [ctx]
 * @returns {string[]}
 */
export function validateConfidenceQuality(cm, ctx = {}) {
  /** @type {string[]} */
  const issues = [];
  const skillId = pickStr(cm.skillId);
  const confidence = pickStr(cm.metadataConfidence);
  const subSkill = pickStr(cm.subSkill);
  const hasPatterns = Array.isArray(cm.possibleErrorPatterns) && cm.possibleErrorPatterns.length > 0;
  const fallback = isFallbackOnlySkillId(skillId);

  if (confidence === "high") {
    if (fallback && !ctx.hasExplicitDiagnostic) {
      issues.push("high metadataConfidence with fallback-only skillId");
    }
    if (!subSkill) {
      issues.push("high metadataConfidence requires subSkill");
    }
    if (!hasPatterns && !ctx.hasExplicitDiagnostic) {
      issues.push("high metadataConfidence without error patterns or explicit diagnostic");
    }
  }

  if (confidence === "high" && fallback && /^heb_/.test(skillId)) {
    issues.push("heb_ fallback skillId must not be high confidence");
  }

  return issues;
}

/**
 * @param {Record<string, unknown>} cm
 * @param {string} [kind]
 * @returns {string[]}
 */
export function validateNonDiagnosticMetadataSafety(cm, kind) {
  /** @type {string[]} */
  const issues = [];
  const k = pickStr(kind).toLowerCase();
  if (!NON_DIAGNOSTIC_KINDS.has(k)) return issues;

  if (cm.isDiagnosticEligible === true) {
    issues.push("non-diagnostic kind must not set isDiagnosticEligible on metadata");
  }
  if (cm.evidenceCategory) {
    issues.push("non-diagnostic kind must not set evidenceCategory on metadata");
  }
  return issues;
}

/**
 * Extract canonical block from heterogeneous row/question shapes.
 *
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>|null}
 */
export function extractCanonicalMetadata(row) {
  if (!row || typeof row !== "object") return null;
  if (row.canonicalMetadata && typeof row.canonicalMetadata === "object") {
    return /** @type {Record<string, unknown>} */ (row.canonicalMetadata);
  }
  if (
    row.params &&
    typeof row.params === "object" &&
    !Array.isArray(row.params) &&
    row.params.canonicalMetadata &&
    typeof row.params.canonicalMetadata === "object"
  ) {
    return /** @type {Record<string, unknown>} */ (row.params.canonicalMetadata);
  }
  return null;
}

/**
 * @param {string} root
 */
export function runNoConsumptionChecks(root) {
  /** @type {{ path: string, pattern: string }[]} */
  const violations = [];

  for (const rel of NO_CONSUMPTION_SCAN_PATHS) {
    const abs = join(root, rel);
    const files = collectFiles(abs);
    for (const file of files) {
      const relFile = file.replace(/\\/g, "/");
      if (Q2_E_APPROVED_CONSUMPTION_SUFFIXES.some((suffix) => relFile.endsWith(suffix))) {
        continue;
      }
      const text = readText(file);
      if (!text || !text.includes("canonicalMetadata")) continue;
      violations.push({ path: relFile, pattern: "canonicalMetadata reference outside Q2-E allow-list" });
    }
  }

  return {
    pass: violations.length === 0,
    violations,
  };
}

/**
 * @param {string} root
 */
export function runCrossContextChecks(root) {
  /** @type {string[]} */
  const hits = [];

  for (const rel of CROSS_CONTEXT_SCAN_DIRS) {
    for (const file of collectFiles(join(root, rel))) {
      const norm = file.replace(/\\/g, "/");
      if (
        norm.includes("question-metadata-validator") ||
        norm.includes("canonical-metadata") ||
        norm.includes("question-metadata-normalizer")
      ) {
        continue;
      }
      const text = readText(file);
      if (!text.includes("canonicalMetadata")) continue;
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!CROSS_CONTEXT_BAD_LINE.test(trimmed)) continue;
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.includes("must not")) {
          continue;
        }
        hits.push(`${norm}: ${trimmed.slice(0, 100)}`);
      }
    }
  }

  return { pass: hits.length === 0, hits };
}

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
 */
function readText(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * @param {unknown[]} rows
 */
function countWithCanonical(rows) {
  let total = 0;
  let withCanonical = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    total += 1;
    const cm = extractCanonicalMetadata(/** @type {Record<string, unknown>} */ (row));
    if (cm && pickStr(cm.skillId)) withCanonical += 1;
  }
  return { total, withCanonical };
}

/**
 * Collect runtime coverage samples across subjects (read-only imports).
 */
export async function collectSubjectCoverageSamples() {
  /** @type {Record<string, { total: number, withCanonical: number, samples: Record<string, unknown>[], phase: string }>} */
  const out = {};

  const { attachProfessionalMathMetadata } = await import(
    "../../utils/math-question-metadata.js"
  );
  const { attachCanonicalMetadataToMathGeometryQuestion } = await import(
    "./math-geometry-canonical-metadata.js"
  );
  const { enrichGeometryProceduralParams } = await import(
    "../../utils/geometry-diagnostic-metadata-bridge.js"
  );

  const mathOut = attachProfessionalMathMetadata(
    { operation: "fractions", params: { kind: "frac_add_like" }, answers: ["a", "b"], correctAnswer: "a" },
    { selectedOp: "fractions", gradeKey: "g4", mathLevelKey: "medium" }
  );
  out.math = {
    phase: "Q2-C1",
    ...countWithCanonical([mathOut]),
    samples: [mathOut],
  };

  const geoParams = enrichGeometryProceduralParams(
    { kind: "square_area" },
    { topic: "area", gradeKey: "g4", levelKey: "medium" }
  );
  const geoOut = attachCanonicalMetadataToMathGeometryQuestion(
    { topic: "area", shape: "square", params: geoParams, answers: ["1", "2"], correctAnswer: "1" },
    { subject: "geometry", gradeKey: "g4", topic: "area" }
  );
  out.geometry = {
    phase: "Q2-C1",
    ...countWithCanonical([geoOut]),
    samples: [geoOut],
  };

  const { SCIENCE_QUESTIONS } = await import("../../data/science-questions.js");
  const sci = countWithCanonical(SCIENCE_QUESTIONS);
  out.science = {
    phase: "Q2-C2",
    ...sci,
    samples: SCIENCE_QUESTIONS.slice(0, 5),
  };

  const { GRAMMAR_POOLS, SENTENCE_POOLS, TRANSLATION_POOLS } = await import(
    "../../data/english-questions/index.js"
  );
  const { generateQuestion: generateEnglishQuestion } = await import(
    "../../utils/english-question-generator.js"
  );
  /** @type {unknown[]} */
  const engRows = [];
  for (const pools of [GRAMMAR_POOLS, SENTENCE_POOLS, TRANSLATION_POOLS]) {
    for (const rows of Object.values(pools)) {
      if (Array.isArray(rows)) engRows.push(...rows);
    }
  }
  const engGen = [
    generateEnglishQuestion(1, "grammar", "g3", null, "easy", null),
    generateEnglishQuestion(1, "vocabulary", "g3", null, "easy", null),
  ];
  out.english = {
    phase: "Q2-C3",
    total: engRows.length + engGen.length,
    withCanonical:
      countWithCanonical(engRows).withCanonical + countWithCanonical(engGen).withCanonical,
    samples: [...engRows.slice(0, 2), ...engGen],
  };

  const { HEBREW_RICH_POOL } = await import("../../utils/hebrew-rich-question-bank.js");
  const { generateQuestion: generateHebrewQuestion } = await import(
    "../../utils/hebrew-question-generator.js"
  );
  const hebGen = generateHebrewQuestion({ name: "קל" }, "comprehension", "g3", null, {});
  out.hebrew = {
    phase: "Q2-C4",
    total: HEBREW_RICH_POOL.length + 1,
    withCanonical:
      countWithCanonical(HEBREW_RICH_POOL).withCanonical + (extractCanonicalMetadata(hebGen) ? 1 : 0),
    samples: [HEBREW_RICH_POOL[0], hebGen],
  };

  const geoIndex = await import("../../data/geography-questions/index.js");
  const { generateQuestion: generateMoledetQuestion } = await import(
    "../../utils/moledet-geography-question-generator.js"
  );
  const { buildMoledetFrozenParamsFromBankRow } = await import(
    "./moledet-geography-canonical-metadata.js"
  );

  /** @type {unknown[]} */
  const molRows = [];
  for (const key of Object.keys(geoIndex)) {
    const pool = geoIndex[key];
    if (!pool || typeof pool !== "object") continue;
    for (const rows of Object.values(pool)) {
      if (Array.isArray(rows)) molRows.push(...rows);
    }
  }
  const molSample = molRows[0];
  const molFrozenParams =
    molSample && typeof molSample === "object"
      ? buildMoledetFrozenParamsFromBankRow(
          /** @type {Record<string, unknown>} */ (molSample),
          "homeland",
          "g3",
          "easy"
        )
      : null;
  const molGen = generateMoledetQuestion({ name: "קל" }, "homeland", "g3", null, null);

  out.moledet = {
    phase: "Q2-C5",
    total: molRows.length + 1 + (molFrozenParams ? 1 : 0),
    withCanonical:
      countWithCanonical(molRows).withCanonical +
      (extractCanonicalMetadata(molGen) ? 1 : 0) +
      (molFrozenParams?.canonicalMetadata ? 1 : 0),
    samples: [
      molSample,
      molGen,
      molFrozenParams ? { params: molFrozenParams } : null,
    ].filter(Boolean),
  };

  return out;
}

/**
 * @param {Record<string, unknown>} coverage
 */
export function validateCoverageThresholds(coverage) {
  /** @type {{ subject: string, pass: boolean, message: string }[]} */
  const results = [];

  for (const [key, threshold] of Object.entries(QUESTION_METADATA_SUBJECT_THRESHOLDS)) {
    const row = coverage[key];
    if (!row) {
      results.push({ subject: key, pass: false, message: "no coverage data" });
      continue;
    }
    const pct = row.total > 0 ? (row.withCanonical / row.total) * 100 : 0;
    const pass =
      row.total >= threshold.minTotal && pct >= threshold.minCoveragePct;
    results.push({
      subject: key,
      pass,
      message: `${row.withCanonical}/${row.total} (${pct.toFixed(1)}%) phase ${threshold.phase} need >=${threshold.minCoveragePct}% & >=${threshold.minTotal} rows`,
    });
  }

  return results;
}

/**
 * Full validation orchestrator.
 *
 * @param {{ root?: string }} [opts]
 */
export async function runFullMetadataValidation(opts = {}) {
  const root = opts.root || process.cwd();
  const coverage = await collectSubjectCoverageSamples();
  const thresholdResults = validateCoverageThresholds(coverage);

  /** @type {{ subject: string, path: string, issues: string[] }[]} */
  const qualityIssues = [];

  for (const [subjectKey, bucket] of Object.entries(coverage)) {
    const threshold = QUESTION_METADATA_SUBJECT_THRESHOLDS[subjectKey];
    for (const sample of bucket.samples || []) {
      if (!sample || typeof sample !== "object") continue;
      const row = /** @type {Record<string, unknown>} */ (sample);
      const cm = extractCanonicalMetadata(row);
      if (!cm) continue;

      const params =
        row.params && typeof row.params === "object" && !Array.isArray(row.params)
          ? /** @type {Record<string, unknown>} */ (row.params)
          : {};

      const issues = validateCanonicalMetadataBlock(cm, {
        subject: pickStr(cm.subject) || threshold?.subject,
        topic: pickStr(cm.topic) || pickStr(row.topic),
        answerMode: pickStr(row.answerMode) || pickStr(params.answerMode) || pickStr(row.qType),
        isEmptyPool: params.kind === "empty_pool" || row.emptyPool === true,
        hasVisualAsset: Boolean(row.shape || row.imageUrl || row.diagram || params.requiresVisual),
        sourceHasErrorTags:
          Array.isArray(params.expectedErrorTags) && params.expectedErrorTags.length > 0,
        hasExplicitDiagnostic: Boolean(params.diagnosticSkillId || row.diagnosticSkillId),
        subSkillDerivable: true,
        questionTypeDerivable: true,
      });

      if (issues.length) {
        qualityIssues.push({
          subject: subjectKey,
          path: pickStr(row.id) || pickStr(row.question)?.slice(0, 40) || "sample",
          issues,
        });
      }
    }
  }

  const noConsumption = runNoConsumptionChecks(root);
  const crossContext = runCrossContextChecks(root);

  const failedThresholds = thresholdResults.filter((r) => !r.pass);
  const pass =
    failedThresholds.length === 0 &&
    qualityIssues.length === 0 &&
    noConsumption.pass &&
    crossContext.pass;

  return {
    pass,
    coverage,
    thresholdResults,
    qualityIssues,
    noConsumption,
    crossContext,
  };
}
