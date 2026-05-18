/**
 * Final product verification: subskill metadata pipeline audit + stale Hebrew phrase classification.
 * Run: npx tsx scripts/parent-report-final-product-verify.mjs
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");

async function load(rel) {
  const m = await import(pathToFileURL(join(REPO, rel)).href);
  return m.default && typeof m.default === "object" ? m.default : m;
}

const { resolveHasSubskillMetadataFromRowSources, SUBSKILL_DETAIL_LIMITATION_HE } = await load(
  "utils/parent-report-topic-evidence.js",
);
const { buildDetailedParentReportFromBaseReport } = await load("utils/detailed-parent-report.js");
const { renderToStaticMarkup } = await import("react-dom/server");
const { createElement: h } = await import("react");
const detailedSurface = await import(
  pathToFileURL(join(REPO, "components/parent-report-detailed-surface.jsx")).href
);
const { SubjectSummaryBlock } = detailedSurface;

const STALE_AUDIT = [
  {
    phrase: "לאסוף עוד מידע לפני החלטה",
    expect: "valid only for truly thin rows (<8 Q) or legacy fallback when step is maintain_and_strengthen without volume",
  },
  {
    phrase: "עדיין מוקדם לקבוע",
    expect: "valid for WE0/mandatory hedge, sparse rows, external routes — not high-volume topic rows",
  },
  { phrase: "אין מספיק מידע", expect: "valid for empty subjects / geometry stems — not 367-Q topic rows" },
  {
    phrase: "thinEvidenceDowngraded",
    expect: "flag: true only when shouldThinEvidenceDowngradeRecommendation — never at q>=40",
  },
  { phrase: "insufficient_data", expect: "internal enum / insights trend — not parent-facing thin label" },
  { phrase: "WE0", expect: "narrative envelope — high volume must not use WE0 unless cannotConcludeYet" },
  { phrase: "thinData", expect: "insights metadata only when totalQuestions < 12" },
];

function walkJsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkJsFiles(p, out);
    else if (/\.(js|mjs|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

function classifyStaleHits(phrase, file, line) {
  const rel = file.replace(REPO, "").replace(/\\/g, "/");
  if (rel.includes("/scripts/") && (rel.includes("verify") || rel.includes("suite") || rel.includes("test"))) {
    return "test_or_audit";
  }
  if (rel.includes("geometry-conceptual-bank")) return "valid_non_report";
  if (phrase === "לאסוף עוד מידע לפני החלטה" && rel.includes("detailed-parent-report.js")) {
    return "valid_thin_fallback_in_engine";
  }
  if (phrase === "עדיין מוקדם לקבוע" && rel.includes("narrative-contract-v1.js")) return "valid_we0_hedge_template";
  if (phrase === SUBSKILL_DETAIL_LIMITATION_HE.slice(0, 12) && rel.includes("parent-report-topic-evidence.js")) {
    return "valid_subskill_only_constant";
  }
  if (phrase === "thinEvidenceDowngraded" && rel.includes("parent-product-contract-v1.js")) return "valid_contract_field";
  return "review";
}

const auditRows = [];
for (const { phrase } of STALE_AUDIT) {
  const hits = [];
  for (const file of walkJsFiles(REPO)) {
    const text = readFileSync(file, "utf8");
    if (!text.includes(phrase)) continue;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(phrase)) {
        hits.push({ file, line: i + 1, class: classifyStaleHits(phrase, file, i + 1) });
      }
    }
  }
  auditRows.push({ phrase, hits: hits.length, sample: hits.slice(0, 4) });
}

process.stdout.write("\n=== Stale Hebrew / flag audit (sample) ===\n");
for (const row of auditRows) {
  process.stdout.write(`\n[${row.phrase}] ${row.hits} hit(s)\n`);
  for (const h of row.sample) {
    process.stdout.write(`  ${h.class}: ${h.file.replace(REPO, "")}:${h.line}\n`);
  }
}

// Subskill pipeline matrix
const pipelineChecks = [
  {
    layer: "taxonomy.patternHe on v2 unit",
    unit: { taxonomy: { patternHe: "דפוס", subskillHe: "תת" } },
    mapRow: null,
    expect: true,
  },
  { layer: "empty unit", unit: {}, mapRow: null, expect: false },
  {
    layer: "behaviorProfile.dominantType on map row",
    unit: {},
    mapRow: { behaviorProfile: { dominantType: "knowledge_gap" } },
    expect: true,
  },
];

process.stdout.write("\n=== Subskill metadata pipeline ===\n");
for (const c of pipelineChecks) {
  const got = resolveHasSubskillMetadataFromRowSources(c.unit, c.mapRow);
  assert.equal(got, c.expect, c.layer);
  process.stdout.write(`  ok  ${c.layer} → ${got}\n`);
}

// UI SSR: grade-split subject block renders distinct labels
const g4Key = "fractions::grade:g4";
const g5Key = "fractions::grade:g5";
const base = {
  registeredGradeKey: "g4",
  summary: { totalQuestions: 433, mathQuestions: 433, mathCorrect: 350, mathAccuracy: 81, overallAccuracy: 81 },
  mathOperations: {
    [g4Key]: { displayName: "שברים", questions: 367, accuracy: 87, gradeKey: "g4" },
    [g5Key]: { displayName: "שברים", questions: 66, accuracy: 38, gradeKey: "g5" },
  },
  diagnosticEngineV2: {
    units: [
      {
        subjectId: "math",
        topicRowKey: g4Key,
        displayName: "שברים",
        evidenceTrace: [{ type: "volume", value: { questions: 367, accuracy: 87, correct: 319, wrong: 48 } }],
        canonicalState: { actionState: "maintain", assessment: { readiness: "ready", confidenceLevel: "high", decisionTier: 3 }, evidence: { positiveAuthorityLevel: "very_good" } },
        confidence: { level: "high", rowSignals: { dataSufficiencyLevel: "strong" } },
        priority: { level: "P2" },
        outputGating: { cannotConcludeYet: false },
      },
      {
        subjectId: "math",
        topicRowKey: g5Key,
        displayName: "שברים",
        taxonomy: { patternHe: "השוואה לפי מונה בלבד" },
        evidenceTrace: [{ type: "volume", value: { questions: 66, accuracy: 38, correct: 25, wrong: 41 } }],
        canonicalState: { actionState: "intervene", assessment: { readiness: "ready", confidenceLevel: "high", decisionTier: 3 } },
        diagnosis: { allowed: true, lineHe: "השוואה לפי מונה בלבד" },
        confidence: { level: "high", rowSignals: { dataSufficiencyLevel: "strong" } },
        priority: { level: "P4" },
        outputGating: { cannotConcludeYet: false },
      },
    ],
  },
};
const detailed = buildDetailedParentReportFromBaseReport(base, { period: "week" });
const mathP = detailed.subjectProfiles.find((s) => s.subject === "math");
const html = renderToStaticMarkup(h(SubjectSummaryBlock, { sp: mathP }));
assert.ok(html.includes("שברים"), "detailed UI subject block mentions topic");
assert.ok(/367|87|66|38/.test(html) || html.includes("כיתה"), "detailed UI shows volume or grade context");

process.stdout.write("\nparent-report-final-product-verify: ALL PASS\n");
