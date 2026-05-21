#!/usr/bin/env node
/**
 * Critical Matrix Deep — compact risk-based report + behavior assertions on selected covered cells.
 * npm run qa:learning-simulator:critical-deep
 *
 * Reads coverage-catalog.json (+ coverage-matrix.json). Writes critical-matrix-deep.json|.md
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

import { buildStorageForScenario } from "./lib/aggregate-runner.mjs";
import { validateDeepHorizonEvidence } from "./lib/deep-runner.mjs";
import { groupByGradeSubject, selectCriticalCells } from "./lib/critical-matrix-deep-lib.mjs";
import { buildReportsFromAggregateStorage } from "./lib/report-runner.mjs";
import { evaluateAssertions } from "./lib/report-assertion-engine.mjs";
import { computeBehaviorOracle } from "./lib/behavior-oracle.mjs";
import { evaluateScenarioBehavior, summarizeFailureCauses } from "./lib/behavior-assertion-engine.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "reports", "learning-simulator");
const OUT_JSON = join(OUT_DIR, "critical-matrix-deep.json");
const OUT_MD = join(OUT_DIR, "critical-matrix-deep.md");

const PROFILE_TYPES = /** @type {const} */ (["strong_on_target_cell", "weak_on_target_cell", "thin_data_on_target_cell"]);

/** @param {string} id */
function hashSeed(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function slimReportPayload(scenarioId, built, storagePath, metaPath) {
  const base = built.baseReport;
  return {
    scenarioId,
    generator: "critical-matrix-deep-v1",
    storageInputPath: storagePath,
    metaInputPath: metaPath,
    playerName: built.playerName,
    period: built.period,
    diagnosticPrimarySource: base?.diagnosticPrimarySource ?? null,
    summary: base?.summary
      ? {
          totalQuestions: base.summary.totalQuestions,
          overallAccuracy: base.summary.overallAccuracy,
          totalTimeMinutes: base.summary.totalTimeMinutes,
        }
      : null,
    facets: built.facets,
    corpusStats: { charLength: (built.corpus || "").length },
  };
}

function expectedForProfileType(pt) {
  const commonMustNot = ["DEBUG", "[object Object]", "NaN"];
  const nonGeneric = { noGenericOnlyReport: true };
  if (pt === "strong_on_target_cell") {
    return {
      mustNotMention: commonMustNot,
      noContradiction: true,
      noFalseStrongConclusion: true,
      noFalseWeakConclusion: true,
      evidenceLevelExpected: ["any"],
      ...nonGeneric,
    };
  }
  if (pt === "weak_on_target_cell") {
    return {
      mustNotMention: commonMustNot,
      noContradiction: true,
      noFalseStrongConclusion: true,
      evidenceLevelExpected: ["any"],
      ...nonGeneric,
    };
  }
  return {
    mustNotMention: commonMustNot,
    noContradiction: true,
    noFalseStrongConclusion: true,
    confidenceShouldBeCautious: true,
    evidenceLevelExpected: ["thin", "insufficient", "low", "medium", "any"],
    ...nonGeneric,
  };
}

function corpusLooksSafe(corpus) {
  const s = String(corpus || "");
  return !/\bDEBUG\b|\[object Object\]|undefined|null pointer|error\.stack/i.test(s);
}

function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

async function loadProfiles() {
  const url = pathToFileURL(join(ROOT, "tests", "fixtures", "learning-simulator", "profiles", "base-profiles.mjs")).href;
  const mod = await import(url);
  return mod.BASE_PROFILES || mod.default;
}

function cloneProfileForSubject(BASE_PROFILES, profileType, subject) {
  if (profileType === "strong_on_target_cell") {
    const b = structuredClone(BASE_PROFILES.p_strong_all_subjects);
    b.subjectWeights = { [subject]: 1 };
    return b;
  }
  if (profileType === "weak_on_target_cell") {
    const b = structuredClone(BASE_PROFILES.p_declining_student);
    b.subjectWeights = { [subject]: 1 };
    return b;
  }
  const b = structuredClone(BASE_PROFILES.p_thin_data);
  b.subjectWeights = { [subject]: 1 };
  return b;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const runId = `critical-deep-${Date.now().toString(36)}`;
  const generatedAt = new Date().toISOString();

  let catalogRaw;
  try {
    catalogRaw = JSON.parse(await readFile(join(OUT_DIR, "coverage-catalog.json"), "utf8"));
  } catch {
    console.error("Missing reports/learning-simulator/coverage-catalog.json — run npm run qa:learning-simulator:coverage first.");
    process.exit(1);
    return;
  }

  let matrixRows;
  try {
    const matrixRaw = JSON.parse(await readFile(join(OUT_DIR, "coverage-matrix.json"), "utf8"));
    matrixRows = matrixRaw.rows || [];
  } catch {
    console.error("Missing coverage-matrix.json — run qa:learning-simulator:matrix first.");
    process.exit(1);
    return;
  }

  const BASE_PROFILES = await loadProfiles();
  const catalogRows = catalogRaw.rows || [];
  const { selectedRows, selectionEvidence } = selectCriticalCells(catalogRows);
  const groups = groupByGradeSubject(selectedRows);

  /** @type {object[]} */
  const scenariosOut = [];
  /** @type {object[]} */
  const failures = [];

  /** @type {Record<string, number>} */
  const assertionCounts = {
    storage_pipeline_ok: 0,
    report_build_ok: 0,
    behavior_summary_ok: 0,
    no_crash: 0,
    no_internal_terms: 0,
    non_generic_report_ok: 0,
    no_false_strong_weak_ok: 0,
    trend_guard_ok: 0,
    evidence_level_ok: 0,
  };

  const anchorDate = "2026-05-02T08:00:00.000Z";

  for (const [gsKey, rows] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [grade, subject] = gsKey.split("|");
    const levels = [...new Set(rows.map((r) => r.level))].sort();
    const topics = [...new Set(rows.map((r) => r.topic))].sort();
    const matrixCoverageRefs = rows.map((r) => ({
      subjectCanonical: r.subject,
      topic: r.topic,
      level: r.level,
    }));

    for (const profileType of PROFILE_TYPES) {
      const shortPt =
        profileType === "strong_on_target_cell" ? "strong" : profileType === "weak_on_target_cell" ? "weak" : "thin";
      const scenarioId = `critical_deep_${grade}_${subject}_${shortPt}`;

      /** Thin profile: cap sessions so effectiveQ stays in thin-evidence band (refs×2 min 16 was ~200+ Q). */
      const targetSessions =
        profileType === "thin_data_on_target_cell"
          ? Math.max(2, Math.min(5, matrixCoverageRefs.length))
          : Math.max(matrixCoverageRefs.length * 4, 52);
      const horizonDays = profileType === "thin_data_on_target_cell" ? 3 : 14;

      const scenario = {
        scenarioId,
        mode: "aggregate",
        tier: "quick",
        grade,
        subjects: [subject],
        levels,
        topicTargets: [],
        profileRef: `synthetic_${profileType}`,
        timeHorizonDays: horizonDays,
        sessionPlan: {
          targetSessions,
          spanDaysApprox: horizonDays,
          notes: "Critical matrix deep — multi-topic refs within grade×subject.",
        },
        matrixCoverageRefs,
        expected: expectedForProfileType(profileType),
        seed: hashSeed(scenarioId),
        anchorDate,
        artifactOptions: {},
        criticalDeepProfileType: profileType,
      };

      const profile = cloneProfileForSubject(BASE_PROFILES, profileType, subject);
      const built = await buildStorageForScenario(scenario, profile, matrixRows);
      const deepVal = validateDeepHorizonEvidence(scenario, built.stats || {});

      let storageOk = built.ok && built.storage && deepVal.ok;
      let reportBuilt = { ok: false };
      let assertionOutcome = null;
      let behaviorOutcome = null;
      let slimReport = null;
      /** @type {string[]} */
      const errors = [...(built.errors || []), ...(deepVal.ok ? [] : deepVal.errors || [])];

      if (!storageOk) {
        failures.push({ scenarioId, phase: "storage", errors });
        scenariosOut.push({
          scenarioId,
          profileType,
          grade,
          subject,
          levels,
          topics,
          cellsTouched: rows.map((r) => r.cellKey),
          sessionsCreated: built.stats?.sessionCount ?? 0,
          questionsOrRowsCreated: built.stats?.questionTotal ?? 0,
          reportBuilt: false,
          assertionsPassed: 0,
          assertionsFailed: 0,
          errors,
          status: "failed",
        });
        continue;
      }

      assertionCounts.storage_pipeline_ok += 1;
      assertionCounts.no_crash += 1;

      try {
        reportBuilt = await buildReportsFromAggregateStorage({ storage: built.storage, scenario });
      } catch (e) {
        errors.push(`report exception: ${e?.message || e}`);
        reportBuilt = { ok: false, error: String(e) };
      }

      if (!reportBuilt.ok || !reportBuilt.facets) {
        failures.push({ scenarioId, phase: "report_build", errors: [reportBuilt.error || "report_build failed"] });
        assertionCounts.report_build_ok += 0;
        scenariosOut.push({
          scenarioId,
          profileType,
          grade,
          subject,
          levels,
          topics,
          cellsTouched: rows.map((r) => r.cellKey),
          sessionsCreated: built.stats?.sessionCount ?? 0,
          questionsOrRowsCreated: built.stats?.questionTotal ?? 0,
          reportBuilt: false,
          assertionsPassed: 0,
          assertionsFailed: 0,
          errors,
          status: "failed",
        });
        continue;
      }

      assertionCounts.report_build_ok += 1;

      slimReport = slimReportPayload(scenarioId, reportBuilt, "(memory)", "(memory)");
      const oracle = computeBehaviorOracle(built.storage, built.meta || {}, slimReport);

      assertionOutcome = evaluateAssertions(
        scenario.expected || {},
        reportBuilt.facets,
        reportBuilt.corpus,
        reportBuilt.baseReport,
        built.storage
      );

      const internalOk = corpusLooksSafe(reportBuilt.corpus);
      if (internalOk) assertionCounts.no_internal_terms += 1;

      const nf =
        assertionOutcome.results.filter((x) =>
          /noFalseStrong|noFalseWeak/.test(String(x.assertion || ""))
        );
      const nfOk = nf.every((x) => x.pass);
      if (nfOk) assertionCounts.no_false_strong_weak_ok += 1;

      const ng = assertionOutcome.results.filter((x) => x.assertion === "noGenericOnlyReport");
      if (ng.length === 0 || ng.every((x) => x.pass)) assertionCounts.non_generic_report_ok += 1;

      const trendOk =
        !scenario.expected?.trendExpected ||
        assertionOutcome.results.filter((x) => x.assertion === "trendExpected").every((x) => x.pass);
      if (trendOk) assertionCounts.trend_guard_ok += 1;

      const evOk =
        !scenario.expected?.evidenceLevelExpected ||
        assertionOutcome.results.filter((x) => x.assertion === "evidenceLevelExpected").every((x) => x.pass);
      if (evOk) assertionCounts.evidence_level_ok += 1;

      behaviorOutcome = evaluateScenarioBehavior(scenario, oracle, slimReport);
      if (behaviorOutcome.passed) assertionCounts.behavior_summary_ok += 1;

      const reportAssertionsPass = assertionOutcome.overallPass && internalOk;
      const behaviorPass = behaviorOutcome.passed;
      const rowPass = reportAssertionsPass && behaviorPass;

      if (!rowPass) {
        failures.push({
          scenarioId,
          phase: "assertions",
          reportAssertionsPass,
          behaviorPass,
          reportFailures: assertionOutcome.results.filter((r) => !r.pass).slice(0, 12),
          behaviorFailures: behaviorOutcome.assertions.filter((a) => !a.pass).slice(0, 12),
          likelyCause: summarizeFailureCauses(behaviorOutcome.assertions).dominantLikelyCause,
        });
      }

      scenariosOut.push({
        scenarioId,
        profileType,
        grade,
        subject,
        levels,
        topics,
        cellsTouched: rows.map((r) => r.cellKey),
        sessionsCreated: built.stats?.sessionCount ?? 0,
        questionsOrRowsCreated: built.stats?.questionTotal ?? 0,
        reportBuilt: true,
        assertionsPassed: assertionOutcome.counts.passed + (internalOk ? 1 : 0),
        assertionsFailed: assertionOutcome.counts.failed + (internalOk ? 0 : 1),
        errors: rowPass ? [] : errors,
        status: rowPass ? "ok" : "failed",
        checks: {
          storage_pipeline_ok: true,
          report_build_ok: true,
          behavior_summary_ok: behaviorPass,
          no_crash: true,
          no_internal_terms: internalOk,
          report_contract_pass: assertionOutcome.overallPass,
        },
      });
    }
  }

  const profilesUsed = [...new Set(scenariosOut.map((s) => s.profileType).filter(Boolean))];
  const okAll = failures.length === 0 && scenariosOut.every((s) => s.status === "ok");

  const payload = {
    runId,
    generatedAt,
    generator: "critical-matrix-deep-v1",
    versions: { criticalDeep: "1.1.0" },
    selectedCellsTotal: selectedRows.length,
    scenarioCount: scenariosOut.length,
    profilesUsed,
    cellsBySubject: selectionEvidence.bySubject,
    cellsByGrade: selectionEvidence.byGrade,
    cellsByLevel: selectionEvidence.byLevel,
    assertionCounts,
    selectionEvidence,
    failures,
    scenarios: scenariosOut.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId)),
  };

  const md = [
    "# Critical Matrix Deep Assertions",
    "",
    `- Run id: ${runId}`,
    `- Generated at: ${generatedAt}`,
    `- Selected critical cells: ${payload.selectedCellsTotal} (target band **40–80**, not full 618-cell deep suite)`,
    `- Per-grade balancing target (6–12 when total≤72): **${selectionEvidence.balancingTargetMet ? "met" : "partial / see selectionEvidence"}**`,
    `- Scenarios executed: ${payload.scenarioCount} (${PROFILE_TYPES.length} profile variants × each grade×subject group with selected cells)`,
    `- Failures: ${payload.failures.length}`,
    "",
    "## Why this is not a 618-cell run",
    "",
    "- Matrix Smoke already exercises aggregate plumbing per supported sampled cell.",
    "- This layer picks a **deterministic risk subset** (~40–80 cells) and runs **report + behavior** contracts with **strong / weak / thin** synthetic profiles per grade×subject group.",
    "",
    "## Selection summary",
    "",
    "```json",
    JSON.stringify(selectionEvidence, null, 2),
    "```",
    "",
    "## Cells by subject",
    "",
    ...Object.entries(selectionEvidence.bySubject || {}).map(([k, v]) => `- ${mdEscape(k)}: ${v}`),
    "",
    "## Cells by grade",
    "",
    ...Object.entries(selectionEvidence.byGrade || {}).map(([k, v]) => `- ${mdEscape(k)}: ${v}`),
    "",
    "## Cells by level",
    "",
    ...Object.entries(selectionEvidence.byLevel || {}).map(([k, v]) => `- ${mdEscape(k)}: ${v}`),
    "",
    "## Assertion rollup",
    "",
    "```json",
    JSON.stringify(assertionCounts, null, 2),
    "```",
    "",
    "## Failures",
    "",
    ...(payload.failures.length
      ? payload.failures.map((f) => `### ${mdEscape(f.scenarioId)}\n\n\`\`\`json\n${JSON.stringify(f, null, 2)}\n\`\`\`\n`)
      : ["- (none)", ""]),
    "",
    `Full JSON: \`${OUT_JSON.replace(/\\/g, "/")}\``,
    "",
  ].join("\n");

  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(OUT_MD, md, "utf8");

  console.log(JSON.stringify({ ok: okAll, scenarios: scenariosOut.length, failures: failures.length, outJson: OUT_JSON }, null, 2));

  process.exit(okAll ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
