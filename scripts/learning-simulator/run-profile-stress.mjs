#!/usr/bin/env node
/**
 * Profile stress — expanded synthetic profiles on a compact covered-cell subset.
 * npm run qa:learning-simulator:profile-stress
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildStorageForScenario } from "./lib/aggregate-runner.mjs";
import { validateDeepHorizonEvidence } from "./lib/deep-runner.mjs";
import { buildReportsFromAggregateStorage } from "./lib/report-runner.mjs";
import { evaluateAssertions } from "./lib/report-assertion-engine.mjs";
import { computeBehaviorOracle } from "./lib/behavior-oracle.mjs";
import { evaluateScenarioBehavior, summarizeFailureCauses } from "./lib/behavior-assertion-engine.mjs";
import { writeProfileTaxonomyAudit } from "./lib/profile-taxonomy.mjs";
import {
  medianNumeric,
  PACE_PROFILE_ORACLE_THRESHOLDS,
  writePaceProfileOracleAudit,
} from "./lib/pace-profile-oracle.mjs";
import {
  buildEligiblePool,
  buildProfileForStressType,
  CANONICAL_PROFILE_TYPES,
  collectMatrixRefsForStress,
  expectedAssertionsForStressType,
  loadBacklogCellKeys,
  loadBaseProfiles,
  SCENARIOS_PER_TYPE,
  slotGradeSubject,
} from "./lib/profile-stress-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT_DIR = join(ROOT, "reports", "learning-simulator");
const OUT_JSON = join(OUT_DIR, "profile-stress.json");
const OUT_MD = join(OUT_DIR, "profile-stress.md");

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
    generator: "profile-stress-v1",
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

function corpusLooksSafe(corpus) {
  const s = String(corpus || "");
  return !/\bDEBUG\b|\[object Object\]|undefined|null pointer|error\.stack/i.test(s);
}

function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

/** @param {Record<string, number>} counts @param {{ assertions?: { assertionId: string, pass: boolean }[] }} behaviorOutcome */
function rollUpNamedBehaviorAssertions(counts, behaviorOutcome) {
  for (const a of behaviorOutcome.assertions || []) {
    const id = a.assertionId;
    if (!Object.prototype.hasOwnProperty.call(counts, id)) continue;
    if (a.pass) counts[id] += 1;
  }
}

function meanNumeric(arr) {
  const a = arr.filter((x) => Number.isFinite(x));
  if (!a.length) return null;
  return Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 100) / 100;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const runId = `profile-stress-${Date.now().toString(36)}`;
  const generatedAt = new Date().toISOString();

  await writeProfileTaxonomyAudit(ROOT, OUT_DIR);

  let catalogRaw;
  try {
    catalogRaw = JSON.parse(await readFile(join(OUT_DIR, "coverage-catalog.json"), "utf8"));
  } catch {
    console.error("Missing coverage-catalog.json — run npm run qa:learning-simulator:coverage first.");
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

  const backlogKeys = await loadBacklogCellKeys(ROOT);
  const catalogRows = catalogRaw.rows || [];
  const pool = buildEligiblePool(catalogRows, backlogKeys);

  if (!pool.length) {
    console.error("Profile stress: empty eligible pool (need covered cells outside content backlog).");
    process.exit(1);
    return;
  }

  const BASE = await loadBaseProfiles(ROOT);

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
    profile_behavior_contract: 0,
    non_generic_report_ok: 0,
    trend_guard_ok: 0,
    evidence_level_ok: 0,
    fast_wrong_has_low_accuracy: 0,
    fast_wrong_has_fast_pace: 0,
    fast_wrong_not_confused_with_slow_correct: 0,
    slow_correct_has_high_accuracy: 0,
    slow_correct_has_slow_pace: 0,
    slow_correct_not_confused_with_fast_wrong: 0,
    pace_accuracy_separation_ok: 0,
    profile_stress_not_overconfident_summary: 0,
  };

  /** @type {{ scenarioId: string, spq: number, overallAccuracyPct: number | null, mistakeRateApprox: number | null }[]} */
  const paceFastWrongSamples = [];
  /** @type {{ scenarioId: string, spq: number, overallAccuracyPct: number | null, mistakeRateApprox: number | null }[]} */
  const paceSlowCorrectSamples = [];

  const anchorDate = "2026-05-02T08:00:00.000Z";
  /** @type {Set<string>} */
  const gradesCovered = new Set();
  /** @type {Set<string>} */
  const subjectsCovered = new Set();
  /** @type {Set<string>} */
  const levelsCovered = new Set();
  /** @type {Set<string>} */
  const cellsTouchedTotal = new Set();

  for (let ti = 0; ti < CANONICAL_PROFILE_TYPES.length; ti += 1) {
    const profileStressType = CANONICAL_PROFILE_TYPES[ti];
    for (let slot = 0; slot < SCENARIOS_PER_TYPE; slot += 1) {
      const { grade, subject } = slotGradeSubject(slot, ti);
      const { matrixCoverageRefs, rows, stressSubject, stressTopic } = collectMatrixRefsForStress(
        pool,
        profileStressType,
        grade,
        subject
      );

      if (!matrixCoverageRefs.length || !rows.length) {
        failures.push({
          scenarioId: `(build)_${profileStressType}_${grade}_${slot}`,
          phase: "cell_selection",
          errors: ["no matrix refs for stress scenario"],
        });
        continue;
      }

      const gradeEffective = rows[0]?.grade || grade;
      const idSubj = profileStressType === "mixed_strengths" ? "mixed" : subject;
      const scenarioId = `profile_stress_${profileStressType}_${gradeEffective}_${idSubj}_s${slot}`;
      const levels = [...new Set(rows.map((r) => r.level))].sort();
      const topics = [...new Set(rows.map((r) => r.topic))].sort();
      for (const r of rows) {
        gradesCovered.add(r.grade);
        subjectsCovered.add(r.subject);
        levelsCovered.add(r.level);
        cellsTouchedTotal.add(r.cellKey);
      }

      const refCount = matrixCoverageRefs.length;
      const isThin = profileStressType === "thin_data";
      const horizonDays = isThin ? 3 : 14;
      const targetSessions = isThin ? Math.max(2, Math.min(5, refCount)) : Math.max(refCount * 3, 36);

      const subjects =
        profileStressType === "mixed_strengths"
          ? [...new Set(rows.map((r) => r.subject))].sort()
          : [rows[0].subject];

      const scenario = {
        scenarioId,
        mode: "aggregate",
        tier: "quick",
        grade: gradeEffective,
        subjects,
        levels,
        topicTargets: [],
        profileRef: `synthetic_profile_stress_${profileStressType}`,
        timeHorizonDays: horizonDays,
        sessionPlan: {
          targetSessions,
          spanDaysApprox: horizonDays,
          notes: "Profile stress harness — compact refs, synthetic profile.",
        },
        matrixCoverageRefs,
        expected: expectedAssertionsForStressType(profileStressType),
        seed: hashSeed(scenarioId),
        anchorDate,
        artifactOptions: {},
        profileStressType,
        ...(isThin ? { criticalDeepProfileType: "thin_data_on_target_cell" } : {}),
        stressMatrixSubject: stressSubject === "mixed" ? null : stressSubject,
        stressMatrixTopic: stressTopic,
      };

      const profile = buildProfileForStressType(profileStressType, BASE, {
        grade,
        subject: subjects[0],
        topic: stressTopic || SUBJECT_FALLBACK_TOPIC(subjects[0]),
      });

      if (!profile) {
        failures.push({ scenarioId, phase: "profile", errors: [`unknown profileStressType ${profileStressType}`] });
        continue;
      }

      if (profileStressType === "mixed_strengths") {
        const mathRow = rows.find((r) => r.subject === "math");
        const hebrewRow = rows.find((r) => r.subject === "hebrew");
        if (mathRow?.topic) {
          const prev = profile.topicStrengths && typeof profile.topicStrengths === "object" ? profile.topicStrengths : {};
          const mathStrengths = prev.math && typeof prev.math === "object" ? prev.math : {};
          profile.topicStrengths = { ...prev, math: { ...mathStrengths, [mathRow.topic]: 0.82 } };
        }
        if (hebrewRow?.topic) {
          const prev = profile.topicWeaknesses && typeof profile.topicWeaknesses === "object" ? profile.topicWeaknesses : {};
          const hebWeak = prev.hebrew && typeof prev.hebrew === "object" ? prev.hebrew : {};
          profile.topicWeaknesses = { ...prev, hebrew: { ...hebWeak, [hebrewRow.topic]: 0.72 } };
          if (profile.accuracyPolicy?.kind === "byTopic") {
            const low = profile.accuracyPolicy.lowTopics && typeof profile.accuracyPolicy.lowTopics === "object"
              ? profile.accuracyPolicy.lowTopics
              : {};
            profile.accuracyPolicy = { ...profile.accuracyPolicy, lowTopics: { ...low, [hebrewRow.topic]: 0.45 } };
          }
        }
      }

      const built = await buildStorageForScenario(scenario, profile, matrixRows);
      const deepVal = validateDeepHorizonEvidence(scenario, built.stats || {});

      let storageOk = built.ok && built.storage && deepVal.ok;
      /** @type {string[]} */
      const errors = [...(built.errors || []), ...(deepVal.ok ? [] : deepVal.errors || [])];

      if (!storageOk) {
        failures.push({ scenarioId, phase: "storage", errors });
        scenariosOut.push({
          scenarioId,
          profileType: profileStressType,
          grade: gradeEffective,
          subject: subjects.join("+"),
          levels,
          topics,
          cellsTouched: rows.map((r) => r.cellKey),
          sessionsCreated: built.stats?.sessionCount ?? 0,
          questionsOrRowsCreated: built.stats?.questionTotal ?? 0,
          reportBuilt: false,
          behaviorEvaluated: false,
          assertionsPassed: 0,
          assertionsFailed: 0,
          errors,
          status: "failed",
        });
        continue;
      }

      assertionCounts.storage_pipeline_ok += 1;
      assertionCounts.no_crash += 1;

      let reportBuilt = { ok: false };
      try {
        reportBuilt = await buildReportsFromAggregateStorage({ storage: built.storage, scenario });
      } catch (e) {
        errors.push(`report exception: ${e?.message || e}`);
        reportBuilt = { ok: false, error: String(e) };
      }

      if (!reportBuilt.ok || !reportBuilt.facets) {
        failures.push({ scenarioId, phase: "report_build", errors: [reportBuilt.error || "report_build failed"] });
        scenariosOut.push({
          scenarioId,
          profileType: profileStressType,
          grade: gradeEffective,
          subject: subjects.join("+"),
          levels,
          topics,
          cellsTouched: rows.map((r) => r.cellKey),
          sessionsCreated: built.stats?.sessionCount ?? 0,
          questionsOrRowsCreated: built.stats?.questionTotal ?? 0,
          reportBuilt: false,
          behaviorEvaluated: false,
          assertionsPassed: 0,
          assertionsFailed: 0,
          errors,
          status: "failed",
        });
        continue;
      }

      assertionCounts.report_build_ok += 1;

      const slimReport = slimReportPayload(scenarioId, reportBuilt, "(memory)", "(memory)");
      const oracle = computeBehaviorOracle(built.storage, built.meta || {}, slimReport);

      const assertionOutcome = evaluateAssertions(
        scenario.expected || {},
        reportBuilt.facets,
        reportBuilt.corpus,
        reportBuilt.baseReport,
        built.storage
      );

      const internalOk = corpusLooksSafe(reportBuilt.corpus);
      if (internalOk) assertionCounts.no_internal_terms += 1;

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

      const behaviorOutcome = evaluateScenarioBehavior(scenario, oracle, slimReport);
      if (behaviorOutcome.passed) assertionCounts.behavior_summary_ok += 1;

      rollUpNamedBehaviorAssertions(assertionCounts, behaviorOutcome);

      const spqVal = oracle.paceOracle?.meanSecondsPerQuestion ?? null;
      const accVal = oracle.evidence?.overallAccuracyPct ?? null;
      const mrateVal = oracle.evidence?.mistakeRateApprox ?? null;
      if (profileStressType === "fast_wrong" && spqVal != null) {
        paceFastWrongSamples.push({
          scenarioId,
          spq: spqVal,
          overallAccuracyPct: accVal,
          mistakeRateApprox: mrateVal,
        });
      }
      if (profileStressType === "slow_correct" && spqVal != null) {
        paceSlowCorrectSamples.push({
          scenarioId,
          spq: spqVal,
          overallAccuracyPct: accVal,
          mistakeRateApprox: mrateVal,
        });
      }

      const reportAssertionsPass = assertionOutcome.overallPass && internalOk;
      const behaviorPass = behaviorOutcome.passed;
      const contractPass = reportAssertionsPass && behaviorPass;
      if (contractPass) assertionCounts.profile_behavior_contract += 1;

      const rowPass = contractPass;

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
        profileType: profileStressType,
        grade: gradeEffective,
        subject: subjects.join("+"),
        levels,
        topics,
        cellsTouched: rows.map((r) => r.cellKey),
        sessionsCreated: built.stats?.sessionCount ?? 0,
        questionsOrRowsCreated: built.stats?.questionTotal ?? 0,
        reportBuilt: true,
        behaviorEvaluated: true,
        assertionsPassed: assertionOutcome.counts.passed + (internalOk ? 1 : 0),
        assertionsFailed: assertionOutcome.counts.failed + (internalOk ? 0 : 1),
        errors: rowPass ? [] : errors,
        status: rowPass ? "ok" : "failed",
        paceEvidence:
          profileStressType === "fast_wrong" || profileStressType === "slow_correct"
            ? {
                meanSecondsPerQuestion: spqVal,
                overallAccuracyPct: accVal,
                mistakeRateApprox: mrateVal,
                mistakeEventCount: oracle.evidence?.mistakeEventCount ?? null,
                questionTotal: oracle.evidence?.questionTotal ?? null,
              }
            : undefined,
        checks: {
          storage_pipeline_ok: true,
          report_build_ok: true,
          behavior_summary_ok: behaviorPass,
          no_crash: true,
          no_internal_terms: internalOk,
          profile_behavior_contract: contractPass,
        },
      });
    }
  }

  const byType = {};
  for (const t of CANONICAL_PROFILE_TYPES) byType[t] = 0;
  for (const s of scenariosOut) {
    if (s.profileType && byType[s.profileType] !== undefined) byType[s.profileType] += 1;
  }

  const fastSpqs = paceFastWrongSamples.map((x) => x.spq);
  const slowSpqs = paceSlowCorrectSamples.map((x) => x.spq);
  const medFast = medianNumeric(fastSpqs);
  const medSlow = medianNumeric(slowSpqs);
  const medianGap = medFast != null && medSlow != null ? Math.round((medSlow - medFast) * 100) / 100 : null;
  const pace_accuracy_separation_ok =
    medFast != null &&
    medSlow != null &&
    medSlow - medFast >= PACE_PROFILE_ORACLE_THRESHOLDS.MIN_COHORT_MEDIAN_SPQ_GAP;

  assertionCounts.pace_accuracy_separation_ok = pace_accuracy_separation_ok ? 1 : 0;

  if (!pace_accuracy_separation_ok) {
    failures.push({
      scenarioId: "_cohort_pace_accuracy_separation",
      phase: "pace_oracle_cohort",
      errors: [
        `median SPQ gap ${medianGap} < min ${PACE_PROFILE_ORACLE_THRESHOLDS.MIN_COHORT_MEDIAN_SPQ_GAP} (fast median=${medFast}, slow median=${medSlow})`,
      ],
    });
  }

  const okAll =
    failures.length === 0 &&
    scenariosOut.every((s) => s.status === "ok") &&
    pace_accuracy_separation_ok;

  const rnd = (x) => (x != null && Number.isFinite(x) ? Math.round(x * 100) / 100 : x);

  const paceProfileOracleBlock = {
    thresholds: PACE_PROFILE_ORACLE_THRESHOLDS,
    fastWrongCohort: {
      n: paceFastWrongSamples.length,
      medianSpq: rnd(medFast),
      meanSpq: rnd(meanNumeric(fastSpqs)),
      meanAccuracyPct: rnd(meanNumeric(paceFastWrongSamples.map((x) => x.overallAccuracyPct).filter((x) => x != null))),
    },
    slowCorrectCohort: {
      n: paceSlowCorrectSamples.length,
      medianSpq: rnd(medSlow),
      meanSpq: rnd(meanNumeric(slowSpqs)),
      meanAccuracyPct: rnd(meanNumeric(paceSlowCorrectSamples.map((x) => x.overallAccuracyPct).filter((x) => x != null))),
    },
    cohortAssertions: {
      pace_accuracy_separation_ok,
      medianSpqGap: rnd(medianGap),
    },
  };

  await writePaceProfileOracleAudit(OUT_DIR, {
    generatedAt,
    sourceRunId: runId,
    thresholds: PACE_PROFILE_ORACLE_THRESHOLDS,
    fastWrongCohort: paceProfileOracleBlock.fastWrongCohort,
    slowCorrectCohort: paceProfileOracleBlock.slowCorrectCohort,
    cohortAssertions: paceProfileOracleBlock.cohortAssertions,
    assertionInventory: {
      perScenario: [
        "fast_wrong_has_low_accuracy",
        "fast_wrong_has_fast_pace",
        "fast_wrong_not_confused_with_slow_correct",
        "slow_correct_has_high_accuracy",
        "slow_correct_has_slow_pace",
        "slow_correct_not_confused_with_fast_wrong",
        "profile_stress_not_overconfident_summary (fast_wrong only)",
      ],
      cohort: ["pace_accuracy_separation_ok"],
    },
    oraclePriorWeakness: [
      "meanSecondsPerQuestion alone without cohort separation could allow overlapping distributions.",
      "Session duration averaging without SPQ obscured pace interpretation.",
    ],
    simulationNotes: [
      "**fast_wrong**: cloned from `p_random_guessing_student` with `responseTimePolicy` mean ~9s (narrow std) so aggregate `meanSecondsPerQuestion` stays low vs slow_correct.",
      "**slow_correct**: cloned from `p_strong_all_subjects` with tighter high accuracy band and `responseTimePolicy` mean ~66s so aggregate SPQ stays high.",
      "Session `duration` comes from `computeDurationSec` (answer-policy-engine): proportional to configured seconds mean × 60 before aggregation.",
    ],
    evidenceFields: [
      "`oracle.paceOracle.meanSecondsPerQuestion` — global Σ(duration)/Σ(questions) across math/topic tracks.",
      "`oracle.evidence.overallAccuracyPct`, `mistakeRateApprox`, `mistakeEventCount` — from aggregate meta stats.",
      "`reportSignals.overallAccuracy` — structured parent-report summary for confusion checks (no Hebrew parsing).",
    ],
    weaknessesAddressed: [
      "Same-topic matrix refs prevent bucket mismatch between weakness profile and topic metrics.",
      "Cohort median SPQ gap enforces separation beyond per-scenario thresholds.",
    ],
    recommendedNext: [
      "If cohort gap tightens (curriculum volume shifts), revisit `PACE_PROFILE_ORACLE_THRESHOLDS` in pace-profile-oracle.mjs only.",
    ],
  });

  const payload = {
    runId,
    generatedAt,
    generator: "profile-stress-v1",
    versions: { profileStress: "1.1.0" },
    profileTypesTested: CANONICAL_PROFILE_TYPES,
    scenarioCount: scenariosOut.length,
    cellsTouchedTotal: cellsTouchedTotal.size,
    gradesCovered: [...gradesCovered].sort(),
    subjectsCovered: [...subjectsCovered].sort(),
    levelsCovered: [...levelsCovered].sort(),
    assertionCounts,
    paceProfileOracle: paceProfileOracleBlock,
    failures,
    scenarios: scenariosOut.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId)),
    eligiblePoolSize: pool.length,
  };

  const md = [
    "# Profile stress (simulator)",
    "",
    `- Run id: ${runId}`,
    `- Generated at: ${generatedAt}`,
    `- Eligible pool (covered, non-mixed, not backlog): **${payload.eligiblePoolSize}**`,
    `- Scenarios: **${payload.scenarioCount}** (${CANONICAL_PROFILE_TYPES.length} profile types × ${SCENARIOS_PER_TYPE} slots)`,
    `- Distinct matrix cells touched: **${payload.cellsTouchedTotal}**`,
    `- Failures: **${payload.failures.length}**`,
    "",
    "## Profile types",
    "",
    ...CANONICAL_PROFILE_TYPES.map((t) => `- ${mdEscape(t)}: ${byType[t] ?? 0}`),
    "",
    "## Coverage",
    "",
    `- Grades: ${payload.gradesCovered.join(", ")}`,
    `- Subjects: ${payload.subjectsCovered.join(", ")}`,
    `- Levels: ${payload.levelsCovered.join(", ")}`,
    "",
    "## Assertion rollup",
    "",
    "```json",
    JSON.stringify(assertionCounts, null, 2),
    "```",
    "",
    "## Pace profile oracle (fast_wrong vs slow_correct)",
    "",
    `- Thresholds (deterministic): see \`scripts/learning-simulator/lib/pace-profile-oracle.mjs\` and \`reports/learning-simulator/pace-profile-oracle-audit.md\`.`,
    `- **Median SPQ fast_wrong:** ${medFast ?? "—"} · **Median SPQ slow_correct:** ${medSlow ?? "—"} · **Gap:** ${medianGap ?? "—"} (min ${PACE_PROFILE_ORACLE_THRESHOLDS.MIN_COHORT_MEDIAN_SPQ_GAP})`,
    `- **pace_accuracy_separation_ok:** ${pace_accuracy_separation_ok ? "PASS" : "FAIL"}`,
    `- Mean SPQ fast: **${paceProfileOracleBlock.fastWrongCohort.meanSpq ?? "—"}** · slow: **${paceProfileOracleBlock.slowCorrectCohort.meanSpq ?? "—"}**`,
    `- Mean accuracy % fast: **${paceProfileOracleBlock.fastWrongCohort.meanAccuracyPct ?? "—"}** · slow: **${paceProfileOracleBlock.slowCorrectCohort.meanAccuracyPct ?? "—"}**`,
    "",
    "## Failures",
    "",
    ...(payload.failures.length
      ? payload.failures.map((f) => `### ${mdEscape(f.scenarioId)}\n\n\`\`\`json\n${JSON.stringify(f, null, 2)}\n\`\`\`\n`)
      : ["- (none)", ""]),
    "",
    "## Recommended next profile gaps",
    "",
    "- If cohort SPQ gap shrinks, tune `PACE_PROFILE_ORACLE_THRESHOLDS` (simulator-only).",
    "- Optionally raise slots per type if CI budget allows (still cap total scenarios).",
    "",
    `Full JSON: \`${OUT_JSON.replace(/\\/g, "/")}\``,
    "",
  ].join("\n");

  await writeFile(OUT_JSON, JSON.stringify(payload, null, 2), "utf8");
  await writeFile(OUT_MD, md, "utf8");

  console.log(JSON.stringify({ ok: okAll, scenarios: scenariosOut.length, failures: failures.length, outJson: OUT_JSON }, null, 2));

  process.exit(okAll ? 0 : 1);
}

function SUBJECT_FALLBACK_TOPIC(subj) {
  const map = {
    math: "fractions",
    geometry: "area",
    science: "experiments",
    english: "grammar",
    hebrew: "comprehension",
    moledet_geography: "maps",
  };
  return map[subj] || "fractions";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
