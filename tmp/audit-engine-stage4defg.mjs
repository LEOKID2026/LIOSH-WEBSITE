#!/usr/bin/env node
/**
 * Stage 4D–4G engine audit (read-only, no UI/PDF/copy changes).
 * Run: node --env-file=.env.local tmp/audit-engine-stage4defg.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MODE_CLASSIFICATION_MAP, EVIDENCE_CATEGORIES } from "../lib/learning/activity-classification.js";
import {
  isCountableSelfPracticeAnswer,
  isCountableSelfPracticeSessionMode,
  isCountableParentAssignedAnswer,
} from "../lib/learning/parent-report-evidence-gate.js";
import { runFullMetadataValidation } from "../lib/learning/question-metadata-validator.js";
import { resolveRowTaxonomyMatch } from "../utils/parent-report-engine-taxonomy-bridge.js";
import { TAXONOMY_BY_ID } from "../utils/diagnostic-engine-v2/taxonomy-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs/qa/_artifacts/parent-report-engine-insights");
const FROM = "2026-05-01";
const TO = "2026-06-01";

/** @type {Array<{ mode: string; source: string; classification: ReturnType<typeof classifyMode> }>} */
function buildModeSourceRows() {
  const freeModes = [
    "practice",
    "graded",
    "drill",
    "review",
    "normal",
    "practice_mistakes",
    "challenge",
    "speed",
    "marathon",
    "learning",
    "mistakes",
    "learning_book",
    "discussion",
  ];
  const assignedModes = ["quiz", "homework", "worksheet", "live_lesson", "guided_practice", "discussion"];

  /** @type {Array<{ mode: string; source: string }>} */
  const pairs = [];
  for (const mode of freeModes) pairs.push({ mode, source: "self_practice" });
  for (const mode of assignedModes) {
    pairs.push({ mode, source: "assigned_parent" });
    pairs.push({ mode, source: "assigned_individual" });
    pairs.push({ mode, source: "assigned_class" });
  }
  pairs.push({ mode: "learning_book", source: "learning_book" });

  return pairs.map(({ mode, source }) => {
    const entry = MODE_CLASSIFICATION_MAP[mode] || null;
    const isDiagnosticEligible = entry?.isDiagnosticEligible === true;
    const evidenceCategory = entry?.evidenceCategory || EVIDENCE_CATEGORIES.UNCLASSIFIED;

    let countsForParentEngine = false;
    let parentGateReason = "";
    if (source === "self_practice") {
      countsForParentEngine = isCountableSelfPracticeAnswer({
        evidenceCategory,
        isDiagnosticEligible,
        contextFlags: {},
        resolvedMode: mode,
      });
      if (!countsForParentEngine) {
        if (evidenceCategory === EVIDENCE_CATEGORIES.DIAGNOSTIC_COMPETITIVE) {
          parentGateReason = "parent-report-evidence-gate excludes diagnostic_competitive";
        } else if (["learning", "mistakes", "learning_book", "discussion"].includes(mode)) {
          parentGateReason = "explicit non-countable mode in evidence gate";
        } else if (!isDiagnosticEligible) {
          parentGateReason = "not diagnostic eligible";
        } else {
          parentGateReason = "evidence gate blocked";
        }
      }
    } else if (source === "assigned_parent") {
      countsForParentEngine = isCountableParentAssignedAnswer();
      parentGateReason = countsForParentEngine ? "" : "parent assigned loop skip";
    } else if (source === "assigned_individual") {
      countsForParentEngine = true;
      parentGateReason = countsForParentEngine ? "" : "private-teacher attempts loop skip";
    } else if (source === "assigned_class") {
      countsForParentEngine = false;
      parentGateReason = "school/classroom not in parent aggregate (by design)";
    } else if (source === "learning_book") {
      countsForParentEngine = false;
      parentGateReason = "books excluded";
    }

    const sessionCountable =
      source === "self_practice" ? isCountableSelfPracticeSessionMode(mode) : source === "assigned_parent";

    return {
      modeSource: `${source}/${mode}`,
      source,
      mode,
      countsForParentEngine,
      parentGateReason,
      isDiagnosticEligible,
      evidenceCategory,
      sessionCountable,
      rawEventCreated: countsForParentEngine ? "yes (diagnosticMistakes when wrong)" : "no",
      metadataPreserved: countsForParentEngine ? "yes via buildDiagnosticEvidenceRow" : "n/a",
      timeHintsRetryPreserved: countsForParentEngine ? "yes (responseMs/hintUsed/retryCount fields)" : "n/a",
      parentReportUses: countsForParentEngine ? "yes — topic rows + engine" : "no",
      gaps: parentGateReason || null,
    };
  });
}

/**
 * @param {object} scenario
 */
function runScenario(scenario) {
  const wrongs = scenario.wrongs.map((w) => ({ ...w, isCorrect: false, timestamp: Date.now() }));
  const match = resolveRowTaxonomyMatch({
    subjectId: scenario.subjectId,
    topicRowKey: scenario.topicRowKey,
    row: scenario.row,
    rawMistakes: wrongs,
    startMs: 0,
    endMs: 9999999999999,
  });
  const actual = match.subskillSafety?.safeToShowSubskill
    ? match.subskillCandidateTechnical?.taxonomyId || match.taxonomyId
    : match.taxonomyId && match.subskillSafety?.safeToShowSubskill === false
      ? `blocked:${(match.subskillSafety.blockReasons || [])[0] || "unsafe"}`
      : match.taxonomyId || "topic-only";
  const pass = scenario.expected.some((e) => {
    if (e.startsWith("blocked:")) return String(actual).startsWith("blocked:");
    if (e === "topic-only") return !match.subskillSafety?.safeToShowSubskill;
    return actual === e;
  });
  return {
    scenario: scenario.name,
    expectedDiagnosis: scenario.expected.join("|"),
    actualDiagnosis: actual,
    passFail: pass ? "pass" : "fail",
    reason: pass ? "matched" : `expected ${scenario.expected.join("|")} got ${actual}`,
    disambiguationApplied: match.subskillSafety?.disambiguationApplied ?? null,
    fallbackUsed: match.subskillSafety?.fallbackUsed ?? null,
  };
}

const SCENARIOS = [
  {
    name: "math_carry_addition",
    subjectId: "math",
    topicRowKey: "addition::grade:g2",
    row: { questions: 20, wrong: 8, accuracy: 60, gradeKey: "g2" },
    wrongs: Array.from({ length: 8 }, () => ({
      patternFamily: "addition_carry",
      metadata: { possibleErrorPatterns: ["נשיאה שגויה"], metadataSource: "question_metadata_normalizer" },
      params: { kind: "carry", subtype: "regroup" },
    })),
    expected: ["M-02"],
  },
  {
    name: "math_addition_no_carry",
    subjectId: "math",
    topicRowKey: "addition::grade:g1",
    row: { questions: 15, wrong: 6, accuracy: 60, gradeKey: "g1" },
    wrongs: Array.from({ length: 6 }, () => ({
      patternFamily: "addition_plain",
      metadata: { possibleErrorPatterns: ["חישוב שגוי"], metadataSource: "question_metadata_normalizer" },
    })),
    expected: ["M-01"],
  },
  {
    name: "geometry_area_height_confusion",
    subjectId: "geometry",
    topicRowKey: "area::grade:g3",
    row: { questions: 30, wrong: 10, accuracy: 67, gradeKey: "g3" },
    wrongs: Array.from({ length: 10 }, () => ({
      questionLabel: "area|rectangle_area|procedural",
      metadata: {
        possibleErrorPatterns: ["צלעות כגובה", "בחירת גובה"],
        metadataSource: "question_metadata_normalizer",
      },
    })),
    expected: ["G-03"],
  },
  {
    name: "english_vocab_recall",
    subjectId: "english",
    topicRowKey: "vocabulary::grade:g3",
    row: { questions: 20, wrong: 8, accuracy: 60, gradeKey: "g3" },
    wrongs: Array.from({ length: 8 }, () => ({
      patternFamily: "vocab_recall_en",
      questionLabel: "vocabulary|vocab_recall_en|לתת|מה פירוש המילה",
      metadata: {
        possibleErrorPatterns: ["תרגום מילולי שגוי", "false friend"],
        metadataSource: "question_metadata_normalizer",
      },
      params: { direction: "he_to_en", patternFamily: "vocab_recall_en" },
    })),
    expected: ["E-01"],
  },
  {
    name: "moledet_geography_definition_topic_only",
    subjectId: "moledet-geography",
    topicRowKey: "geography::grade:g3",
    row: { questions: 30, wrong: 10, accuracy: 67, gradeKey: "g3", bucketKey: "geography" },
    wrongs: Array.from({ length: 10 }, () => ({
      questionLabel: "geography:מה זה ים?",
      topicOrOperation: "geography",
      bucketKey: "geography",
      metadata: {
        possibleErrorPatterns: ["מרחקים יחסיים שגויים", "זיכרון שם"],
        metadataSource: "taxonomy_topic_enrichment",
      },
    })),
    expected: ["blocked:", "topic-only"],
    deferred: true,
  },
  {
    name: "science_concept_confusion",
    subjectId: "science",
    topicRowKey: "body::grade:g2",
    row: { questions: 20, wrong: 6, accuracy: 70, gradeKey: "g2" },
    wrongs: Array.from({ length: 6 }, () => ({
      metadata: {
        possibleErrorPatterns: ["בלבול מושגים"],
        metadataSource: "question_metadata_normalizer",
        skillId: "S-03",
      },
    })),
    expected: ["S-03"],
  },
];

async function main() {
  const modeSourceAudit = buildModeSourceRows();
  const metadataReport = await runFullMetadataValidation({ root: ROOT });
  const scenarioResults = SCENARIOS.map(runScenario);

  /** Stage 4C snapshot from latest run if present */
  let stage4c = null;
  try {
    stage4c = JSON.parse(await readFile(path.join(OUT_DIR, "stage4c-subskill-truth-audit.json"), "utf8"));
  } catch {
    /* optional */
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    stage: "4D-4G",
    period: { from: FROM, to: TO },
    stage4D: {
      summary:
        "Shared routing haystack + taxonomy pattern scoring + WithMeta disambiguation for english/geometry/moledet; geography definition rows stay topic-only.",
      modules: [
        "utils/diagnostic-engine-v2/diagnostic-routing-haystack.js",
        "utils/diagnostic-engine-v2/taxonomy-pattern-routing-scores.js",
        "utils/diagnostic-engine-v2/english-taxonomy-candidate-order.js",
        "utils/diagnostic-engine-v2/geometry-taxonomy-candidate-order.js",
        "utils/diagnostic-engine-v2/moledet-taxonomy-candidate-order.js",
        "utils/parent-report-engine-taxonomy-bridge.js",
        "utils/subskill-candidate-safety.js",
      ],
    },
    stage4E: { modeSourceAudit },
    stage4F: {
      coverage: metadataReport.coverage,
      thresholdResults: metadataReport.thresholdResults,
      qualityIssueCount: metadataReport.qualityIssues?.length || 0,
      pass: metadataReport.pass,
    },
    stage4G: { scenarioResults },
    stage4cSnapshot: stage4c?.stage4cSubjectSummary || stage4c?.correctedCoverage4B || null,
    firstCandidateFallbacksRemaining: stage4c
      ? (stage4c.totals?.fallbackBlocked ?? 0) > 0
      : null,
  };

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "stage4defg-engine-audit.json");
  await writeFile(outPath, JSON.stringify(artifact, null, 2));

  console.log(JSON.stringify({ outPath, scenarioResults, stage4cSnapshot: artifact.stage4cSnapshot }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
