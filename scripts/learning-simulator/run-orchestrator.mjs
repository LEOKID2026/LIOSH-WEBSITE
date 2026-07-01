#!/usr/bin/env node
/**
 * Unified learning-simulator QA orchestrator.
 * Usage: tsx scripts/learning-simulator/run-orchestrator.mjs <quick|full>
 * npm: qa:learning-simulator:quick | qa:learning-simulator / :full / :release (release === full).
 * Full adds parent narrative safety artifacts (`test:parent-report-narrative-safety-artifacts`) — not in quick.
 *
 * Env:
 *   LS_CONTINUE_ON_FAIL=1 — run all steps even after a failure (still exits non-zero if any failed).
 *   LS_SKIP_NEXT_CLEAN=1 — skip removing `.next` before the final `npm run build` (default: clean for cold build).
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "reports", "learning-simulator", "orchestrator");
const OUT_JSON = join(OUT_DIR, "run-summary.json");
const OUT_MD = join(OUT_DIR, "run-summary.md");

const ARTIFACTS = {
  coverageMatrix: "reports/learning-simulator/coverage-matrix.json",
  coverageMatrixMd: "reports/learning-simulator/coverage-matrix.md",
  schemaValidation: "reports/learning-simulator/schema-validation.json",
  schemaValidationMd: "reports/learning-simulator/schema-validation.md",
  aggregateSummary: "reports/learning-simulator/aggregate/run-summary.json",
  aggregateSummaryMd: "reports/learning-simulator/aggregate/run-summary.md",
  reportAssertions: "reports/learning-simulator/reports/run-summary.json",
  behaviorSummary: "reports/learning-simulator/behavior/run-summary.json",
  behaviorFailures: "reports/learning-simulator/behavior/failures.json",
  questionIntegrity: "reports/learning-simulator/questions/run-summary.json",
  questionFailures: "reports/learning-simulator/questions/failures.json",
  coverageCatalog: "reports/learning-simulator/coverage-catalog.json",
  coverageCatalogMd: "reports/learning-simulator/coverage-catalog.md",
  unsupportedCells: "reports/learning-simulator/unsupported-cells.json",
  unsupportedCellsMd: "reports/learning-simulator/unsupported-cells.md",
  scenarioCoverage: "reports/learning-simulator/scenario-coverage.json",
  scenarioCoverageMd: "reports/learning-simulator/scenario-coverage.md",
  matrixSmoke: "reports/learning-simulator/matrix-smoke.json",
  matrixSmokeMd: "reports/learning-simulator/matrix-smoke.md",
  criticalMatrixDeep: "reports/learning-simulator/critical-matrix-deep.json",
  criticalMatrixDeepMd: "reports/learning-simulator/critical-matrix-deep.md",
  profileStress: "reports/learning-simulator/profile-stress.json",
  profileStressMd: "reports/learning-simulator/profile-stress.md",
  contentGapAudit: "reports/learning-simulator/content-gap-audit.json",
  contentGapAuditMd: "reports/learning-simulator/content-gap-audit.md",
  contentGapBacklog: "reports/learning-simulator/content-gap-backlog.json",
  contentGapBacklogMd: "reports/learning-simulator/content-gap-backlog.md",
  deepSummary: "reports/learning-simulator/deep/run-summary.json",
  deepFailures: "reports/learning-simulator/deep/failures.json",
  renderReleaseGate: "reports/learning-simulator/render-release-gate.json",
  renderReleaseGateMd: "reports/learning-simulator/render-release-gate.md",
  renderReleaseGateAudit: "reports/learning-simulator/render-release-gate-audit.json",
  pdfExportGate: "reports/learning-simulator/pdf-export-gate.json",
  pdfExportGateMd: "reports/learning-simulator/pdf-export-gate.md",
  pdfExportAudit: "reports/learning-simulator/pdf-export-audit.json",
  releaseReadinessSummary: "reports/learning-simulator/release-readiness-summary.json",
  releaseReadinessSummaryMd: "reports/learning-simulator/release-readiness-summary.md",
  engineTruthSummary: "reports/learning-simulator/engine-truth/engine-truth-summary.json",
  engineTruthSummaryMd: "reports/learning-simulator/engine-truth/engine-truth-summary.md",
  engineCompletionSummary: "reports/learning-simulator/engine-completion/engine-completion-summary.json",
  realScenarioFrameworkValidation: "reports/learning-simulator/engine-completion/real-scenario-framework-validation.json",
  parentNarrativeSafetyArtifacts: "reports/parent-report-narrative-safety-artifacts/summary.json",
  parentNarrativeSafetyArtifactsMd: "reports/parent-report-narrative-safety-artifacts/summary.md",
  questionMetadataSummary: "reports/question-metadata-qa/summary.json",
  questionMetadataSummaryMd: "reports/question-metadata-qa/summary.md",
  adaptivePlannerArtifactSummary: "reports/adaptive-learning-planner/artifact-summary.json",
  adaptivePlannerArtifactSummaryMd: "reports/adaptive-learning-planner/artifact-summary.md",
  adaptivePlannerMetadataSnapshot: "reports/adaptive-learning-planner/metadata-index-snapshot.json",
};

/** Stages in order for quick gate */
const QUICK_STEPS = [
  { id: "matrix", script: "qa:learning-simulator:matrix", label: "Coverage matrix" },
  { id: "schema", script: "qa:learning-simulator:schema", label: "Schema validation (profiles + scenarios)" },
  { id: "aggregate", script: "qa:learning-simulator:aggregate", label: "Aggregate simulator (quick scenarios)" },
  { id: "reports", script: "qa:learning-simulator:reports", label: "Parent report assertions (Phase 3)" },
  {
    id: "engineTruth",
    script: "qa:learning-simulator:engine",
    label: "Engine truth audit (aggregation ↔ diagnosis V2 ↔ report model)",
  },
  { id: "behavior", script: "qa:learning-simulator:behavior", label: "Behavior checks (Phase 5)" },
  { id: "questions", script: "qa:learning-simulator:questions", label: "Question integrity (Phase 4)" },
];

/** Inserted after engine truth on full orchestrator only (deterministic; keeps quick fast). */
const ENGINE_LAYER_FRAMEWORK_STEPS = [
  {
    id: "coverageCatalogFrameworkPrereq",
    script: "qa:learning-simulator:coverage",
    label: "Coverage catalog (819 cells) — prereq for framework stress scenarios",
  },
  {
    id: "diagnosticFramework",
    script: "qa:learning-simulator:diagnostic-framework",
    label: "Professional diagnostic framework QA (mock contracts)",
  },
  {
    id: "frameworkRealScenarios",
    script: "qa:learning-simulator:framework-real-scenarios",
    label: "Professional framework real scenario validation",
  },
  {
    id: "engineCompletionSummary",
    script: "qa:learning-simulator:engine-completion-summary",
    label: "Engine completion summary artifact",
  },
];

/** After framework completion; engine-only professional layers + metadata QA. */
const ENGINE_PROFESSIONALIZATION_STEPS = [
  {
    id: "questionMetadataBank",
    script: "qa:question-metadata",
    label: "Question bank metadata gate (static scan + taxonomy blocking policy)",
  },
  {
    id: "questionSkillMetadata",
    script: "qa:learning-simulator:question-skill-metadata",
    label: "Question skill metadata QA",
  },
  {
    id: "misconceptions",
    script: "qa:learning-simulator:misconceptions",
    label: "Misconception engine QA",
  },
  { id: "masteryEngine", script: "qa:learning-simulator:mastery", label: "Mastery engine QA" },
  {
    id: "dependenciesEngine",
    script: "qa:learning-simulator:dependencies",
    label: "Dependency engine QA",
  },
  {
    id: "calibrationEngine",
    script: "qa:learning-simulator:calibration",
    label: "Calibration engine QA",
  },
  {
    id: "reliabilityEngine",
    script: "qa:learning-simulator:reliability",
    label: "Reliability engine QA",
  },
  { id: "probeEngine", script: "qa:learning-simulator:probes", label: "Probe engine QA" },
  {
    id: "crossSubjectEngine",
    script: "qa:learning-simulator:cross-subject",
    label: "Cross-subject engine QA",
  },
  {
    id: "professionalEngineOutput",
    script: "qa:learning-simulator:professional-engine-output",
    label: "Professional engine output QA",
  },
  {
    id: "professionalEngineValidation",
    script: "qa:learning-simulator:professional-engine",
    label: "Professional engine synthetic validation",
  },
  {
    id: "adaptivePlannerArtifacts",
    script: "test:adaptive-planner:artifacts",
    label: "Adaptive planner artifacts (metadata-backed non-live safety gate)",
  },
  {
    id: "adaptivePlannerMetadataIndex",
    script: "build:adaptive-planner:metadata-index",
    label: "Adaptive planner metadata index snapshot",
  },
  {
    id: "adaptivePlannerRuntimeBridge",
    script: "test:adaptive-planner:runtime",
    label: "Adaptive planner runtime bridge (practice snapshot → recommendation)",
  },
  {
    id: "adaptivePlannerRecommendationUi",
    script: "test:adaptive-planner:recommendation-ui",
    label: "Adaptive planner recommendation UI mapping (Phase 3 gates)",
  },
  {
    id: "adaptivePlannerRecommendedPractice",
    script: "test:adaptive-planner:recommended-practice",
    label: "Adaptive planner recommended practice (Phase 4 adapter + button rules)",
  },
  {
    id: "adaptivePlannerAiExplainer",
    script: "test:adaptive-planner:ai-explainer",
    label: "Adaptive planner AI explainer guards (Phase 5)",
  },
];

/** Full gate only: matrix smoke → catalog → classification → scenario map (after Phase 4 artifacts exist). */
const FULL_MATRIX_QA = [
  { id: "matrixSmoke", script: "qa:learning-simulator:matrix-smoke", label: "Matrix smoke (sampled cells → aggregate)" },
  { id: "unsupportedCells", script: "qa:learning-simulator:unsupported", label: "Unsupported cells classification" },
  {
    id: "contentGapAudit",
    script: "qa:learning-simulator:content-gaps",
    label: "Content gap audit (informational)",
  },
  {
    id: "contentBacklog",
    script: "qa:learning-simulator:content-backlog",
    label: "Content gap backlog (documentation)",
  },
  { id: "scenarioCoverage", script: "qa:learning-simulator:scenario-coverage", label: "Scenario coverage (fixtures + smoke)" },
  { id: "criticalDeep", script: "qa:learning-simulator:critical-deep", label: "Critical matrix deep assertions" },
  {
    id: "profileStress",
    script: "qa:learning-simulator:profile-stress",
    label: "Profile stress (synthetic profiles)",
  },
  {
    id: "scenarioCoverageFinal",
    script: "qa:learning-simulator:scenario-coverage",
    label: "Scenario coverage (+ critical deep + profile stress)",
  },
];

const FULL_SUFFIX = [
  {
    id: "renderReleaseGate",
    script: "qa:learning-simulator:render",
    label: "Render release gate (browser/SSR smoke for learning + parent-report)",
  },
  {
    id: "pdfExportGate",
    script: "qa:learning-simulator:pdf-export",
    label: "PDF export gate (parent-report file download)",
  },
  { id: "deep", script: "qa:learning-simulator:deep", label: "Deep longitudinal simulator" },
  { id: "build", script: "build", label: "Next.js production build" },
  { id: "parentReportPhase1", script: "test:parent-report-phase1", label: "Parent report phase1 selftest" },
  {
    id: "parentReportNarrativeSafetyArtifacts",
    script: "test:parent-report-narrative-safety-artifacts",
    label: "Parent narrative safety (artifact JSON)",
  },
  { id: "intelligenceUsage", script: "test:intelligence-layer-v1-usage", label: "Intelligence layer v1 usage selftest" },
  {
    id: "releaseReadinessSummary",
    script: "qa:learning-simulator:release-summary",
    label: "Release readiness summary (master QA artifact)",
  },
];

/** @param {string} root */
async function loadParentNarrativeSafetySummaryJson(root) {
  const p = join(root, "reports", "parent-report-narrative-safety-artifacts", "summary.json");
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return null;
  }
}

/** @param {string} root */
async function loadAdaptivePlannerArtifactSummaryJson(root) {
  const p = join(root, "reports", "adaptive-learning-planner", "artifact-summary.json");
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return null;
  }
}

/** @param {Record<string, unknown>|null} raw */
function summarizeAdaptivePlannerForOrchestrator(raw) {
  if (!raw || typeof raw !== "object") return null;
  const safety = Number(raw.safetyViolationCount ?? 0);
  return {
    plannerRuns: raw.plannerInputsBuilt ?? raw.candidatePayloads,
    safetyViolationCount: safety,
    inputsWithAvailableMetadata: raw.inputsWithAvailableMetadata,
    availableQuestionMetadataMissing: raw.afterAvailableQuestionMetadataMissingCount,
    metadataSubjectFallbackCount: raw.metadataSubjectFallbackCount,
    byPlannerStatus: raw.byPlannerStatus || {},
    byNextAction: raw.byNextAction || {},
    metadataIndexSource: raw.metadataIndexSource,
    summaryJsonPath: "reports/adaptive-learning-planner/artifact-summary.json",
    summaryMdPath: "reports/adaptive-learning-planner/artifact-summary.md",
    gatePass: safety === 0,
  };
}

/** @param {Record<string, unknown>|null} raw */
function summarizeNarrativeSafetyForOrchestrator(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    status: raw.status,
    narrativesChecked: raw.narrativesChecked,
    artifactFileCount: raw.artifactFileCount,
    blockCount: raw.blockCount,
    warningCount: raw.warningCount,
    infoCautionCount: raw.infoCautionCount,
    cleanPassCount: raw.cleanPassCount,
    passTotalCount: raw.passTotalCount,
    topIssueCodes: Array.isArray(raw.topIssueCodes) ? raw.topIssueCodes.slice(0, 12) : [],
    summaryJsonPath: "reports/parent-report-narrative-safety-artifacts/summary.json",
    summaryMdPath: "reports/parent-report-narrative-safety-artifacts/summary.md",
  };
}

/** Remove `.next` so the orchestrator's production build is cold (avoids Windows stale chunk / prerender flakes). */
function cleanNextDir(root) {
  const nextDir = join(root, ".next");
  if (!existsSync(nextDir)) return;
  try {
    rmSync(nextDir, { recursive: true, force: true });
  } catch (e) {
    console.warn(`  Orchestrator: could not remove .next (${e?.message || e}); continuing`);
  }
}

/**
 * @param {string} cwd
 * @param {string} npmScript
 * @param {Record<string, string|undefined>} [envExtra] merged over process.env (e.g. PDF gate after render kills dev)
 */
function runStep(cwd, npmScript, envExtra) {
  const start = Date.now();
  const env = envExtra ? { ...process.env, ...envExtra } : process.env;
  const r = spawnSync("npm", ["run", npmScript], {
    cwd,
    encoding: "utf8",
    shell: true,
    stdio: "inherit",
    env,
  });
  const durationMs = Date.now() - start;
  const exitCode = typeof r.status === "number" ? r.status : 1;
  return { exitCode, durationMs, pass: exitCode === 0 };
}

function buildArtifactLinks(mode) {
  return mode === "full"
    ? {
        ...ARTIFACTS,
        orchestratorSummary: "reports/learning-simulator/orchestrator/run-summary.json",
      }
    : {
        coverageMatrix: ARTIFACTS.coverageMatrix,
        schemaValidation: ARTIFACTS.schemaValidation,
        aggregateSummary: ARTIFACTS.aggregateSummary,
        reportAssertions: ARTIFACTS.reportAssertions,
        behaviorSummary: ARTIFACTS.behaviorSummary,
        questionIntegrity: ARTIFACTS.questionIntegrity,
        orchestratorSummary: "reports/learning-simulator/orchestrator/run-summary.json",
      };
}

/**
 * Persist orchestrator JSON so downstream steps (e.g. release-readiness-summary) read this run, not a stale prior run-summary.
 * @param {object} args
 */
function buildOrchestratorPayload(args) {
  const {
    mode,
    startedAt,
    finishedAt,
    totalDurationMs,
    stepResults,
    failedStep,
    continueOnFail,
    parentNarrativeSafety,
    adaptivePlanner,
    snapshotAfterBuild,
  } = args;
  const anyFail = stepResults.some((s) => !s.pass);
  const pass = !anyFail;
  return {
    mode,
    startedAt,
    finishedAt,
    totalDurationMs,
    pass,
    failedStep: failedStep
      ? { id: failedStep.id, label: failedStep.label, script: failedStep.script, exitCode: failedStep.exitCode }
      : null,
    steps: stepResults,
    artifactLinks: buildArtifactLinks(mode),
    nextAction: failedStep ? nextActionHint(failedStep) : null,
    options: { continueOnFail },
    ...(mode === "full" ? { parentNarrativeSafety, adaptivePlanner } : {}),
    ...(snapshotAfterBuild ? { snapshotAfterBuild: true } : {}),
  };
}

function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function nextActionHint(failedStep) {
  if (!failedStep) return "—";
  const id = failedStep.id;
  const hints = {
    matrix: "Ensure curriculum/matrix sources resolve; run from repo root. See coverage-matrix artifacts.",
    schema: "Fix profile/scenario fixtures or matrix refs per schema-validation.json errors.",
    aggregate: "Check scenario/session builders and aggregate per-student artifacts under reports/learning-simulator/aggregate/per-student/.",
    reports: "Inspect reports/learning-simulator/reports/run-summary.json and per-student *.report.json / *.assertions.json.",
    engineTruth:
      "Inspect reports/learning-simulator/engine-truth/engine-truth-summary.json; fix aggregation/diagnosis/report sync or golden expectations in scripts/learning-simulator/lib/engine-truth-*.mjs.",
    diagnosticFramework:
      "Inspect utils/learning-diagnostics/diagnostic-framework-v1.js and scripts/learning-simulator/run-diagnostic-framework-qa.mjs.",
    frameworkRealScenarios:
      "Inspect reports/learning-simulator/engine-completion/real-scenario-framework-validation.json; fix enrichment or scenario harness.",
    engineCompletionSummary:
      "Inspect reports/learning-simulator/engine-completion/engine-completion-summary.json.",
    behavior: "Inspect reports/learning-simulator/behavior/failures.json and per-student *.behavior.json.",
    questions: "Inspect reports/learning-simulator/questions/failures.json; fix generators or mark cells unsupported intentionally.",
    deep: "Inspect reports/learning-simulator/deep/failures.json and deep per-student artifacts.",
    build: "Fix TypeScript/lint/build errors reported above.",
    parentReportPhase1: "Fix parent-report phase1 selftest failures (scripts/parent-report-phase1-selftest.mjs).",
    intelligenceUsage: "Fix intelligence-layer usage contract (scripts/intelligence-layer-v1-usage-selftest.mjs).",
    coverageCatalog: "Re-run after matrix + questions; inspect coverage-catalog.json for unexpected uncovered statuses.",
    unsupportedCells: "Inspect unsupported-cells.json — gate fails on uncovered cells or unknown_needs_review classification.",
    scenarioCoverage: "Inspect scenario-coverage.json for scenario→matrix mapping issues.",
    matrixSmoke: "Inspect matrix-smoke.json — gate fails if any smoke scenario fails or cells lack sessions.",
    criticalDeep: "Inspect critical-matrix-deep.json — gate fails if report/behavior assertions fail on selected cells.",
    scenarioCoverageFinal: "Regenerates scenario map including critical-matrix-deep + profile-stress scenarios.",
    profileStress: "Inspect profile-stress.json — gate fails if synthetic profile contracts fail.",
    contentGapAudit:
      "Inspect content-gap-audit.json — fails only if classification unknown or artifact write failed.",
    contentBacklog:
      "Inspect content-gap-backlog.json — fails if backlog count ≠ audit gap count or unmapped cell.",
    renderReleaseGate:
      "Inspect render-release-gate.json and failures under reports/learning-simulator/render-release-gate/failures/; fix crashes/console errors or SSR fallback.",
    pdfExportGate:
      "Inspect pdf-export-gate.json and reports/learning-simulator/pdf-export/; verify html2pdf download with ?qa_pdf=file or fix Playwright/console errors.",
    releaseReadinessSummary:
      "Inspect release-readiness-summary.json — missing artifacts, uncovered cells, or gate regressions; re-run full QA after fixes.",
    adaptivePlannerArtifacts:
      "Inspect reports/adaptive-learning-planner/artifact-summary.json — safetyViolationCount must be 0; re-run `npm run test:adaptive-planner:artifacts` or full QA.",
    questionMetadataBank:
      "Inspect reports/question-metadata-qa/summary.json — gate.blockingIssueCount or scan errors. Fix invalid difficulty/cognitive/errors, missing correct answer, duplicate declared IDs, or load failures. See utils/question-metadata-qa/question-metadata-gate-policy.js.",
    parentReportNarrativeSafetyArtifacts:
      "Ensure generated JSON exists under reports/parent-report-persona-corpus/json, reports/learning-simulator/parent-report-review-pack/reports, and/or reports/learning-simulator/reports/per-student (run review-pack / aggregate as needed). Inspect reports/parent-report-narrative-safety-artifacts/summary.md — blocks fail the gate; no_artifacts_found means nothing was validated.",
  };
  return hints[id] || `Review logs for stage "${id}" and related artifacts under reports/learning-simulator/.`;
}

function buildMarkdown(payload) {
  const lines = [
    "# Learning simulator orchestrator",
    "",
    `- **Mode:** ${payload.mode}`,
    `- **Overall:** ${payload.pass ? "**PASS**" : "**FAIL**"}`,
    `- **Started:** ${payload.startedAt}`,
    `- **Finished:** ${payload.finishedAt}`,
    `- **Total duration:** ${payload.totalDurationMs} ms`,
    "",
    "## Steps",
    "",
    "| # | Stage | Script | Duration (ms) | Result |",
    "| --- | --- | --- | ---: | --- |",
  ];

  let i = 1;
  for (const s of payload.steps) {
    lines.push(
      `| ${i++} | ${mdEscape(s.label)} | \`${mdEscape(s.script)}\` | ${s.durationMs} | ${s.pass ? "PASS" : "FAIL"} |`
    );
  }

  lines.push("", "## Key artifact paths (repo-relative)", "");
  for (const [k, v] of Object.entries(payload.artifactLinks || {})) {
    lines.push(`- **${k}:** \`${mdEscape(v)}\``);
  }

  const ap = payload.adaptivePlanner;
  if (ap && typeof ap === "object") {
    lines.push(
      "",
      "## Adaptive planner (artifacts — non-live)",
      "",
      `Human-readable report: **\`${mdEscape(ap.summaryMdPath)}\`**.`,
      "",
      "| Field | Value |",
      "| --- | --- |",
      `| planner runs | ${mdEscape(ap.plannerRuns)} |`,
      `| safetyViolationCount | ${mdEscape(ap.safetyViolationCount)} |`,
      `| inputsWithAvailableMetadata | ${mdEscape(ap.inputsWithAvailableMetadata)} |`,
      `| availableQuestionMetadata_missing (after index) | ${mdEscape(ap.availableQuestionMetadataMissing)} |`,
      `| metadataSubjectFallbackCount | ${mdEscape(ap.metadataSubjectFallbackCount)} |`,
      `| metadata index source | ${mdEscape(ap.metadataIndexSource || "—")} |`,
      "",
      "*Fails this orchestrator step only when `safetyViolationCount > 0`, script non-zero exit, or missing `artifact-summary.json` after the step. Soft metrics (fallback counts, English tagging, `needs_human_review`) are warnings in logs / release summary only.*",
      ""
    );
  }

  const ns = payload.parentNarrativeSafety;
  if (ns && typeof ns === "object") {
    lines.push(
      "",
      "## Parent narrative safety (artifacts)",
      "",
      `Full gate validates parent-visible Hebrew copy in saved report JSON. Human-readable report: **\`${mdEscape(ns.summaryMdPath)}\`**.`,
      "",
      "| Field | Value |",
      "| --- | --- |",
      `| status | ${mdEscape(ns.status)} |`,
      `| narrativesChecked | ${mdEscape(ns.narrativesChecked)} |`,
      `| artifactFileCount | ${mdEscape(ns.artifactFileCount)} |`,
      `| blockCount | ${mdEscape(ns.blockCount)} |`,
      `| warningCount | ${mdEscape(ns.warningCount)} |`,
      `| infoCautionCount | ${mdEscape(ns.infoCautionCount)} |`,
      `| cleanPassCount | ${mdEscape(ns.cleanPassCount)} |`,
      ""
    );
    const tic = ns.topIssueCodes;
    if (Array.isArray(tic) && tic.length) {
      lines.push("Top warning issue codes:", "", "| code | count |", "| --- | --- |");
      for (const row of tic) {
        const code = Array.isArray(row) ? row[0] : row?.[0];
        const cnt = Array.isArray(row) ? row[1] : row?.[1];
        lines.push(`| ${mdEscape(code)} | ${mdEscape(cnt)} |`);
      }
      lines.push("");
    }
    lines.push(
      "*Blocks fail this orchestrator step. `warnings_only` passes at this stage (review MD). `no_artifacts_found` fails — no JSON matched configured artifact paths.*",
      ""
    );
  }

  if (!payload.pass && payload.failedStep) {
    lines.push(
      "",
      "## Failed stage",
      "",
      `- **Stage:** ${mdEscape(payload.failedStep.label)} (\`${mdEscape(payload.failedStep.script)}\`)`,
      "",
      "### Suggested next action",
      "",
      payload.nextAction || "",
      ""
    );
  }

  lines.push(
    "",
    "---",
    "",
    "See `docs/learning-simulator-qa.md` for what each gate proves and current limits.",
    ""
  );

  return lines.join("\n");
}

async function main() {
  const modeArg = (process.argv[2] || "full").toLowerCase();
  const mode = modeArg === "quick" ? "quick" : "full";
  const continueOnFail = process.env.LS_CONTINUE_ON_FAIL === "1";

  let steps = [...QUICK_STEPS];
  if (mode === "full") {
    const etIdx = QUICK_STEPS.findIndex((s) => s.id === "engineTruth");
    const quickWithFramework =
      etIdx >= 0
        ? [
            ...QUICK_STEPS.slice(0, etIdx + 1),
            ...ENGINE_LAYER_FRAMEWORK_STEPS,
            ...ENGINE_PROFESSIONALIZATION_STEPS,
            ...QUICK_STEPS.slice(etIdx + 1),
          ]
        : [...QUICK_STEPS];
    steps = [...quickWithFramework, ...FULL_MATRIX_QA, ...FULL_SUFFIX];
  }

  await mkdir(OUT_DIR, { recursive: true });

  const startedAt = new Date().toISOString();
  const t0All = Date.now();

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Learning simulator orchestrator — mode: ${mode.toUpperCase()}`);
  console.log(`  Steps: ${steps.length}${continueOnFail ? " (continue on failure)" : " (stop on first failure)"}`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");

  /** @type {object[]} */
  const stepResults = [];
  let failedStep = null;
  /** @type {null | Record<string, unknown>} */
  let parentNarrativeSafety = null;
  /** @type {null | Record<string, unknown>} */
  let adaptivePlanner = null;

  for (const step of steps) {
    console.log(`▶ ${step.label}`);
    console.log(`  npm run ${step.script}`);
    if (step.id === "build" && process.env.LS_SKIP_NEXT_CLEAN !== "1") {
      console.log("  Pre-build: removing .next for cold production build (cache reliability)");
      cleanNextDir(ROOT);
    }
    const pdfEnv =
      step.id === "pdfExportGate"
        ? {
            /** Render step tears down dev; shelled env may also set PDF_GATE_AUTO_SERVER=0 — force auto-start for this step. */
            PDF_GATE_AUTO_SERVER: "1",
          }
        : undefined;
    const { exitCode, durationMs, pass } = runStep(ROOT, step.script, pdfEnv);
    let effectivePass = pass;

    if (step.id === "parentReportNarrativeSafetyArtifacts") {
      const raw = await loadParentNarrativeSafetySummaryJson(ROOT);
      parentNarrativeSafety = summarizeNarrativeSafetyForOrchestrator(raw);
      if (!raw) {
        console.error(
          "  Orchestrator: missing reports/parent-report-narrative-safety-artifacts/summary.json after narrative safety step."
        );
        effectivePass = false;
      } else if (raw.status === "no_artifacts_found") {
        console.error(
          "  Orchestrator: parent narrative safety matched no artifact JSON — gate cannot validate parent-facing copy. Generate fixtures under reports/ (see docs/learning-simulator-qa.md)."
        );
        effectivePass = false;
      } else if (Number(raw.blockCount) > 0) {
        effectivePass = false;
      }
    }

    if (step.id === "adaptivePlannerArtifacts") {
      const raw = await loadAdaptivePlannerArtifactSummaryJson(ROOT);
      adaptivePlanner = summarizeAdaptivePlannerForOrchestrator(raw);
      if (!raw) {
        console.error(
          "  Orchestrator: missing reports/adaptive-learning-planner/artifact-summary.json after adaptive planner artifacts step."
        );
        effectivePass = false;
      } else if (Number(raw.safetyViolationCount ?? 0) > 0) {
        console.error(
          `  Orchestrator: adaptive planner safetyViolationCount=${raw.safetyViolationCount} — see reports/adaptive-learning-planner/artifact-summary.md`
        );
        effectivePass = false;
      } else {
        const miss = Number(raw.afterAvailableQuestionMetadataMissingCount ?? 0);
        const fb = Number(raw.metadataSubjectFallbackCount ?? 0);
        const en = Number(raw.englishSkillTaggingIncompleteCount ?? 0);
        const hr = Number(raw.needsHumanReviewCount ?? 0);
        if (miss > 0) {
          console.warn(`  Orchestrator (adaptive planner): availableQuestionMetadata_missing count=${miss} (warning only)`);
        }
        if (fb > 0) {
          console.warn(`  Orchestrator (adaptive planner): metadataSubjectFallbackCount=${fb} (warning only)`);
        }
        if (en > 0) {
          console.warn(`  Orchestrator (adaptive planner): englishSkillTaggingIncompleteCount=${en} (warning only)`);
        }
        if (hr > 0) {
          console.warn(`  Orchestrator (adaptive planner): needs_human_review outputs=${hr} (warning only)`);
        }
      }
    }

    const row = {
      id: step.id,
      label: step.label,
      script: step.script,
      exitCode,
      durationMs,
      pass: effectivePass,
      ...(step.id === "parentReportNarrativeSafetyArtifacts" && parentNarrativeSafety
        ? { narrativeSafety: parentNarrativeSafety }
        : {}),
      ...(step.id === "adaptivePlannerArtifacts" && adaptivePlanner ? { adaptivePlanner } : {}),
    };
    stepResults.push(row);
    console.log(`  → exit ${exitCode}, ${durationMs} ms ${effectivePass ? "✓" : "✗"}`);
    console.log("");

    if (!effectivePass && !failedStep) failedStep = row;

    if (step.id === "build" && effectivePass && mode === "full") {
      const snap = buildOrchestratorPayload({
        mode,
        startedAt,
        finishedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - t0All,
        stepResults,
        failedStep,
        continueOnFail,
        parentNarrativeSafety,
        adaptivePlanner,
        snapshotAfterBuild: true,
      });
      await writeFile(OUT_JSON, JSON.stringify(snap, null, 2), "utf8");
      console.log("  Orchestrator: refreshed run-summary.json after successful build (release-readiness gate)");
      console.log("");
    }

    if (!effectivePass && !continueOnFail) {
      console.error(`Orchestrator: stopping after failure (${step.id}).`);
      break;
    }
  }

  const finishedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - t0All;
  const payload = buildOrchestratorPayload({
    mode,
    startedAt,
    finishedAt,
    totalDurationMs,
    stepResults,
    failedStep,
    continueOnFail,
    parentNarrativeSafety,
    adaptivePlanner,
    snapshotAfterBuild: false,
  });
  const pass = payload.pass;

  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(payload), "utf8");

  console.log("───────────────────────────────────────────────────────────────");
  console.log(`  Finished: ${pass ? "PASS" : "FAIL"}  |  ${totalDurationMs} ms total`);
  console.log(`  Summary: ${OUT_JSON}`);
  console.log("───────────────────────────────────────────────────────────────");
  console.log("");

  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
