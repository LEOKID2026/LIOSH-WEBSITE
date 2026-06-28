#!/usr/bin/env node
/**
 * Virtual Student QA Runner — CLI entry (Phases A / B / C / D / D2).
 *
 * Phase A (student): real student → real /student/login UI → real
 *   /learning/math-master → real /api/learning/session/start + answer + finish.
 *
 * Phase B (parent): real parent → real /parent/login UI → /parent/dashboard
 *   → click the real "דוח הורים" affordance for the linked student → verify
 *   the visible parent report matches the student activity from Phase A.
 *
 * Phase C (multi-subject): same student loops through scenarios across
 *   math + geometry + hebrew + english + science + moledet-geography with
 *   per-scenario before/after parent-report snapshots and explicit profile
 *   evidence (strong / average / weak / targeted).
 *
 * Phase D (multi-student): all 12 AAA QA students under one parent. One
 *   short scenario per student, sequential isolated browser contexts,
 *   cross-student bleed verification.
 *
 * Phase D2 (daily simulator — slices D2.1+D2.2+D2.3 wired): scheduled
 *   daily real-learning simulator that drives the same 12 AAA students
 *   over real calendar dates with longitudinal state outside the repo.
 *   D2.1: personas + state + planner + --dry-run artifacts.
 *   D2.2: --preflight-only (parent + 12 students UI login probes).
 *   D2.3: fast-mode full daily run on localhost (orchestrator + pacer +
 *         per-student multi-session learning + atomic state-advance).
 *   D2.4 (Vercel fast) / D2.5 (Vercel realtime) / D2.6 (Task Scheduler
 *   wrapper) are still gated.
 *
 * Artifacts:
 *   - Phases A/B/C/D: reports/virtual-student-qa/{ISO-timestamp}/
 *   - Phase D2:       reports/virtual-student-daily/YYYY-MM-DD/
 *
 * CLI:
 *   --phase a|b|c|d|d2   (default: b)
 *   --scenario <id>      (Phase A/B: which scenario to run; Phase C: filter
 *                          the suite to a single scenario id)
 *   --scenarios id1,id2  (Phase C only: comma-separated suite filter)
 *   --student <label>    (default: first configured student account)
 *   --parent <label>     (default: first configured parent account, or the
 *                          parent whose linkedStudent label matches --student)
 *   --headed             (visible browser)
 *   --base-url <url>     (override PLAYWRIGHT_BASE_URL)
 *   --plan smoke|full    (Phase D)
 *   --students AAA1,AAA5 (Phase D filter; Phase D2: D2.3+ smoke filter)
 *   --mode realtime|fast (Phase D2: daily mode; default 'realtime')
 *   --date YYYY-MM-DD    (Phase D2: target calendar date; default today
 *                          in Asia/Jerusalem)
 *   --dry-run            (Phase D2: emit plan only, no UI, no state advance)
 *   --preflight-only     (Phase D2: D2.2+ only — preflight checks, no learning)
 *   --force              (Phase D2: bypass same-day idempotency check)
 *
 * Env (Phase A — student):
 *   VIRTUAL_STUDENT_ACCOUNTS      JSON [{label, username|code, pin}]   - preferred
 *   E2E_STUDENT_USERNAME          single-student fallback
 *   E2E_STUDENT_CODE              single-student fallback (alternative to username)
 *   E2E_STUDENT_PIN               4-digit PIN (required)
 *   E2E_STUDENT_{N}_USERNAME      indexed multi-student fallback (1..9)
 *   E2E_STUDENT_{N}_PIN           indexed multi-student fallback (1..9)
 *   VIRTUAL_STUDENT_STUDENT_AUTH  'ui' (default, REAL UI form) | 'api' (TEMPORARY)
 *
 * Env (Phase B — parent):
 *   VIRTUAL_STUDENT_PARENT_ACCOUNTS JSON [{label, email, password, linkedStudent}]
 *   E2E_PARENT_EMAIL              single-parent fallback
 *   E2E_PARENT_PASSWORD           single-parent fallback
 *   VIRTUAL_STUDENT_PARENT_AUTH   'ui' (default, REAL UI form, only mode that
 *                                  can produce full PASS) | 'token' (debug-only,
 *                                  always 'partial', never PASS)
 *   NEXT_PUBLIC_LEARNING_SUPABASE_URL       required for 'token' mode only
 *   NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY  required for 'token' mode only
 *
 * Env (shared):
 *   PLAYWRIGHT_BASE_URL           dev server URL (default http://127.0.0.1:3001)
 *   VIRTUAL_STUDENT_HEADED        '1' to run headed
 *   SUPABASE_URL                  optional (Tier 2 row-count evidence)
 *   SUPABASE_SERVICE_ROLE_KEY     optional (Tier 2 row-count evidence)
 *
 * Exit codes: 0 PASS, 1 FAIL or PARTIAL, 2 misuse.
 */
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import {
  loadAccounts,
  selectAccount,
  loadParentAccounts,
  selectParentAccount,
  resolveBaseUrl,
  resolveStudentAuthMode,
  resolveParentAuthMode,
  isHeaded,
  getRepoRoot,
  resolveStateDir,
  resolveDailyMode,
  resolveDailyDate,
  resolveDailyMaxMinutes,
  resolveDailyPacerScale,
  resolveDailyDryRun,
  resolveDailyPreflightOnly,
  resolveDailyForce,
  resolveInSessionPacingEnabled,
  assertProductionRealisticPacingGuard,
  resolveTimestampStampingEnabled,
  assertProductionTimestampStampingGuard,
} from "./lib/config.mjs";
import {
  assertProductionPracticeOnlyGuard,
  resolvePracticeOnlyEnabled,
} from "./lib/practice-only-guard.mjs";
import { assertPlannerBudgetGuard } from "./lib/planner-budget.mjs";
import {
  launchBrowser,
  newStudentContext,
  attachLearningNetworkObserver,
} from "./lib/browser.mjs";
import { authenticateStudent } from "./lib/student-auth.mjs";
import { runMathScenario } from "./lib/subject-drivers/math-master.mjs";
import { verifyTier1, verifyTier2 } from "./lib/persistence-evidence.mjs";
import { authenticateParent } from "./lib/parent-auth.mjs";
import { verifyParentDashboardAndOpenReport } from "./lib/parent-dashboard.mjs";
import { verifyParentReport } from "./lib/parent-report-assertions.mjs";
import {
  makeRunArtifacts,
  makeDailyArtifacts,
  newRunId,
} from "./lib/artifacts.mjs";
import { PHASE_A_SCENARIOS } from "./scenarios/math-average-smoke.mjs";
import { PHASE_C_SCENARIOS } from "./scenarios/phase-c-suite.mjs";
import { runPhaseCSuite } from "./lib/phase-c-orchestrator.mjs";
import {
  PHASE_D_PLANS_BY_NAME,
  selectPhaseDPlan,
} from "./scenarios/phase-d-suite.mjs";
import { runPhaseDSuite } from "./lib/phase-d-orchestrator.mjs";
import {
  PERSONAS,
  PERSONA_LABELS,
} from "./scenarios/student-personas.mjs";
import {
  loadState,
  isAlreadyRunForDate,
  applyDailyResults,
  saveStateAtomically,
  appendTimelineRow,
} from "./lib/longitudinal-state.mjs";
import {
  generateDailyPlan,
  renderPlanMarkdown,
} from "./lib/daily-plan-generator.mjs";
import {
  runDailyPreflight,
  runStandaloneDailyPreflight,
  renderPreflightMarkdown,
} from "./lib/daily-preflight.mjs";
import { runPhaseD2Suite } from "./lib/phase-d2-orchestrator.mjs";
import { makeDailyPacer } from "./lib/realtime-pacer.mjs";
import { assertDailyDbSanity } from "./lib/daily-db-sanity-guard.mjs";
import { ensureQaParentPasswordSynced } from "./lib/ensure-qa-parent-password.mjs";

function parseArgs(argv) {
  const args = {
    phase: "b",
    scenario: "",
    scenarios: "",
    student: "",
    parent: "",
    headed: false,
    baseUrl: "",
    plan: "",          // Phase D: smoke | full
    students: "",      // Phase D: comma-separated subset of plan student labels
    // ---- Phase D2 (daily simulator) ----
    mode: "",          // realtime | fast (resolved with env fallback)
    date: "",          // YYYY-MM-DD (resolved with Asia/Jerusalem default)
    dryRun: false,     // emit plan only, no UI, no state advance
    preflightOnly: false, // run preflight only, no learning, no state advance
    force: false,      // bypass same-day idempotency check
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--phase") args.phase = String(argv[++i] || "b").toLowerCase();
    else if (a === "--scenario") args.scenario = String(argv[++i] || "");
    else if (a === "--scenarios") args.scenarios = String(argv[++i] || "");
    else if (a === "--student") args.student = String(argv[++i] || "");
    else if (a === "--parent") args.parent = String(argv[++i] || "");
    else if (a === "--headed") args.headed = true;
    else if (a === "--base-url") args.baseUrl = String(argv[++i] || "");
    else if (a === "--plan") args.plan = String(argv[++i] || "");
    else if (a === "--students") args.students = String(argv[++i] || "");
    else if (a === "--mode") args.mode = String(argv[++i] || "");
    else if (a === "--date") args.date = String(argv[++i] || "");
    else if (a === "--dry-run" || a === "--dry") args.dryRun = true;
    else if (a === "--preflight-only" || a === "--preflight") args.preflightOnly = true;
    else if (a === "--force") args.force = true;
  }
  if (!args.scenario) {
    if (args.phase === "c" || args.phase === "d" || args.phase === "d2") {
      args.scenario = "";
    } else args.scenario = "math-average-smoke";
  }
  if (args.phase === "d" && !args.plan) {
    args.plan = "smoke";
  }
  return args;
}

async function preflight(baseUrl, log) {
  let response;
  try {
    response = await fetch(`${baseUrl}/`, { redirect: "manual" });
  } catch (error) {
    throw new Error(
      `preflight: dev server not reachable at ${baseUrl} (${error?.message || error}). ` +
        "Start the server before running the runner."
    );
  }
  log(`preflight: GET ${baseUrl}/ -> HTTP ${response.status}`);
  if (response.status >= 500) {
    throw new Error(`preflight: dev server returned HTTP ${response.status} for ${baseUrl}/`);
  }
}

function fmtAccount(account) {
  if (!account) return null;
  return {
    label: account.label,
    hasUsername: Boolean(account.username),
    hasCode: Boolean(account.code),
  };
}

function fmtParentAccount(account) {
  if (!account) return null;
  return {
    label: account.label,
    emailMasked: maskEmail(account.email),
    linkedStudentLabel: account.linkedStudentLabel || null,
  };
}

function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at <= 1) return "***";
  return `${value.slice(0, 1)}***${value.slice(at)}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const phase =
    args.phase === "a"
      ? "a"
      : args.phase === "c"
        ? "c"
        : args.phase === "d"
          ? "d"
          : args.phase === "d2"
            ? "d2"
            : "b";

  // Phase C: route to the multi-scenario orchestrator and skip the rest of
  // this function's Phase A/B-specific logic.
  if (phase === "c") {
    return mainPhaseC(args);
  }
  // Phase D: multi-student real UI QA.
  if (phase === "d") {
    return mainPhaseD(args);
  }
  // Phase D2: scheduled daily real-learning simulator.
  if (phase === "d2") {
    return mainPhaseD2(args);
  }

  const scenario = PHASE_A_SCENARIOS[args.scenario];
  if (!scenario) {
    console.error(
      `unknown scenario '${args.scenario}'. Available: ${Object.keys(PHASE_A_SCENARIOS).join(", ")}`
    );
    process.exit(2);
  }

  const repoRoot = getRepoRoot();
  const runId = newRunId();
  const artifacts = makeRunArtifacts({ repoRoot, runId });
  const scenarioLogId = `${scenario.id}__${args.student || "default"}`;

  function log(line) {
    console.log(line);
    artifacts.appendLog(scenarioLogId, line);
  }

  log(`runId=${runId}`);
  log(`phase=${phase.toUpperCase()} scenario=${scenario.id}`);

  const baseUrl = resolveBaseUrl(args.baseUrl);
  log(`baseUrl=${baseUrl}`);

  // ---- Student account loading ------------------------------------------
  let accounts;
  try {
    accounts = loadAccounts();
  } catch (error) {
    return finalize(buildFinalizeInputForFailure({
      reason: `config: ${error.message}`,
      failureStep: "config",
      artifacts, runId, scenario, args, phase, baseUrl,
    }));
  }
  if (accounts.length === 0) {
    return finalize(buildFinalizeInputForFailure({
      reason:
        "config: no virtual-student accounts found. Set VIRTUAL_STUDENT_ACCOUNTS (JSON) " +
        "or E2E_STUDENT_USERNAME + E2E_STUDENT_PIN.",
      failureStep: "config",
      artifacts, runId, scenario, args, phase, baseUrl,
    }));
  }

  let account;
  try {
    account = selectAccount(accounts, args.student);
  } catch (error) {
    return finalize(buildFinalizeInputForFailure({
      reason: `config: ${error.message}`,
      failureStep: "config",
      artifacts, runId, scenario, args, phase, baseUrl,
    }));
  }
  log(`account=${JSON.stringify(fmtAccount(account))}`);

  const studentAuthMode = resolveStudentAuthMode();
  log(
    `studentAuthMode=${studentAuthMode}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );

  // ---- Parent account loading (Phase B only) ----------------------------
  let parentAccount = null;
  let parentAuthMode = null;
  if (phase === "b") {
    parentAuthMode = resolveParentAuthMode();
    log(
      `parentAuthMode=${parentAuthMode}` +
        (parentAuthMode === "token"
          ? " [DEBUG-ONLY: token mode never produces PASS]"
          : "")
    );
    let parents = [];
    try {
      parents = loadParentAccounts();
    } catch (error) {
      return finalize(buildFinalizeInputForFailure({
        reason: `config: ${error.message}`,
        failureStep: "config",
        artifacts, runId, scenario, args, phase, baseUrl,
        account: fmtAccount(account), studentAuthMode, parentAuthMode,
      }));
    }
    if (parents.length === 0) {
      return finalize(buildFinalizeInputForFailure({
        reason:
          "config: no virtual-student parent accounts found. Set VIRTUAL_STUDENT_PARENT_ACCOUNTS (JSON) " +
          "or E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD. (Phase B requires a real parent account.)",
        failureStep: "config",
        artifacts, runId, scenario, args, phase, baseUrl,
        account: fmtAccount(account), studentAuthMode, parentAuthMode,
      }));
    }
    try {
      parentAccount = selectParentAccount(
        parents,
        args.parent,
        account.label
      );
    } catch (error) {
      return finalize(buildFinalizeInputForFailure({
        reason: `config: ${error.message}`,
        failureStep: "config",
        artifacts, runId, scenario, args, phase, baseUrl,
        account: fmtAccount(account), studentAuthMode, parentAuthMode,
      }));
    }
    log(`parentAccount=${JSON.stringify(fmtParentAccount(parentAccount))}`);
  }

  try {
    await preflight(baseUrl, log);
  } catch (error) {
    return finalize(buildFinalizeInputForFailure({
      reason: error.message,
      failureStep: "preflight",
      artifacts, runId, scenario, args, phase, baseUrl,
      account: fmtAccount(account),
      parentAccount: fmtParentAccount(parentAccount),
      studentAuthMode,
      parentAuthMode,
    }));
  }

  const headed = args.headed || isHeaded();
  const browser = await launchBrowser({ headed });
  const context = await newStudentContext(browser);
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleNoise = [];
  const pageErrors = [];
  const NOISE_RE = /^Failed to load resource:/i;
  page.on("console", (msg) => {
    const text = String(msg.text()).slice(0, 400);
    const debug = String(process.env.VIRTUAL_STUDENT_DEBUG_CONSOLE || "").trim();
    if (debug === "1" || debug.toLowerCase() === "true") {
      log(`page-console[${msg.type()}]: ${text}`);
    }
    if (msg.type() !== "error") return;
    if (NOISE_RE.test(text)) {
      consoleNoise.push(text);
    } else {
      consoleErrors.push(text);
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err?.message || err).slice(0, 400));
  });

  const observer = attachLearningNetworkObserver(page);
  const screenshotter = (name) => artifacts.saveScreenshot(page, name);

  if (String(process.env.VIRTUAL_STUDENT_DEBUG_NET || "").trim() === "1") {
    page.on("request", (request) => {
      const u = request.url();
      if (u.includes("/api/")) log(`page-request: ${request.method()} ${u}`);
    });
    page.on("requestfailed", (request) => {
      log(`page-requestfailed: ${request.method()} ${request.url()} - ${request.failure()?.errorText || "?"}`);
    });
  }

  let driverResult = null;
  let parentAuthResult = null;
  let parentDashboardResult = null;
  let parentReportFindings = null;
  let failureReason = null;
  let failureStep = null;

  try {
    failureStep = "student-auth";
    await authenticateStudent({
      context,
      page,
      account,
      baseUrl,
      mode: studentAuthMode,
      log,
    });
    await artifacts.saveScreenshot(page, "01-after-student-auth");

    failureStep = "math-master-driver";
    driverResult = await runMathScenario({
      page,
      baseUrl,
      scenario,
      log,
      screenshotter,
    });
    failureStep = null;
  } catch (error) {
    failureReason = error?.message || String(error);
    log(`FAILURE step=${failureStep || "unknown"}: ${failureReason}`);
    await artifacts.saveScreenshot(page, `failure-${failureStep || "unknown"}`).catch(() => {});
  }

  const networkSummary = observer.summary();
  log(`network summary: ${JSON.stringify(networkSummary)}`);

  let tier1 = null;
  let tier2 = null;
  if (driverResult) {
    tier1 = verifyTier1({
      networkSummary,
      expectedAnswers: driverResult.answeredQuestions.length,
    });
    log(`tier1: passed=${tier1.passed} errors=${JSON.stringify(tier1.errors)}`);
    tier2 = await verifyTier2({
      sessionId: tier1.sessionId,
      expectedAnswers: driverResult.answeredQuestions.length,
      log,
    });
    log(`tier2: ${JSON.stringify(tier2)}`);
  }

  // ---- Phase B parent verification --------------------------------------
  // Run parent leg only if Phase A succeeded (driver completed AND tier1
  // passed). Otherwise the report has nothing to verify against.
  const phaseAOk =
    !failureReason && driverResult && tier1?.passed && (tier2?.enabled !== true || tier2.passed);

  let parentBlockReason = null;
  if (phase === "b" && !phaseAOk) {
    parentBlockReason =
      "phase-A failed; parent verification skipped (no fresh student activity to assert on)";
    log(`parent: SKIPPED — ${parentBlockReason}`);
  }

  if (phase === "b" && phaseAOk) {
    try {
      failureStep = "parent-auth";
      parentAuthResult = await authenticateParent({
        context,
        page,
        account: parentAccount,
        baseUrl,
        mode: parentAuthMode,
        log,
      });
      log(
        `parent-auth: ok mode=${parentAuthResult.mode} pass-eligible=${parentAuthResult.pass} ` +
          `partial=${parentAuthResult.partial} alreadyAuthenticated=${parentAuthResult.alreadyAuthenticated || false}`
      );
      await artifacts.saveScreenshot(page, "10-after-parent-auth");

      failureStep = "parent-dashboard";
      const expectedStudentName = (driverResult?.playerName || "").trim();
      if (!expectedStudentName) {
        throw new Error(
          "parent-dashboard: cannot verify linked student — driver did not surface playerName"
        );
      }
      log(`parent-dashboard: expecting student "${expectedStudentName}"`);
      parentDashboardResult = await verifyParentDashboardAndOpenReport({
        page,
        baseUrl,
        expectedStudentName,
        log,
        artifacts: {
          saveScreenshot: (p, n) => artifacts.saveScreenshot(p, n),
        },
      });
      await artifacts.saveScreenshot(page, "11-parent-dashboard-after-click");

      failureStep = "parent-report-assertions";
      parentReportFindings = await verifyParentReport({
        page,
        scenarioContext: {
          subject: scenario.subject,
          profile: scenario.profile,
          expectedAnsweredCount: driverResult.answeredQuestions.length,
        },
        log,
      });
      await artifacts.saveScreenshot(page, "12-parent-report-populated");
      failureStep = null;
    } catch (error) {
      failureReason = error?.message || String(error);
      log(`FAILURE step=${failureStep || "unknown"}: ${failureReason}`);
      await artifacts
        .saveScreenshot(page, `failure-${failureStep || "parent"}`)
        .catch(() => {});
    }
  }

  await artifacts.saveScreenshot(page, "99-final-state").catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  // ---- Status decision --------------------------------------------------
  const errors = [];
  if (failureReason) errors.push(`driver: ${failureReason}`);
  if (tier1 && !tier1.passed) errors.push(...tier1.errors.map((e) => `tier1: ${e}`));
  if (tier2?.enabled && tier2.passed === false) {
    errors.push(...(tier2.errors || []).map((e) => `tier2: ${e}`));
  }
  if (consoleErrors.length > 0) errors.push(...consoleErrors.map((e) => `console: ${e}`));
  if (pageErrors.length > 0) errors.push(...pageErrors.map((e) => `pageerror: ${e}`));

  // Phase B status logic.
  // - If phase=A, status follows Phase A rules (unchanged).
  // - If phase=B and phase-A failed, status = fail.
  // - If phase=B and phase-A passed but parent legs failed, status = fail.
  // - If phase=B and parent leg succeeded but used token mode, status = partial.
  // - If phase=B and parent leg succeeded with ui mode, status = pass.
  let status;
  if (phase === "a") {
    status =
      !failureReason &&
      tier1?.passed &&
      (tier2?.enabled !== true || tier2.passed) &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0
        ? "pass"
        : "fail";
  } else {
    // phase === "b"
    if (!phaseAOk || failureReason) {
      status = "fail";
    } else if (
      parentAuthResult &&
      parentDashboardResult &&
      parentReportFindings &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0
    ) {
      status = parentAuthResult.partial ? "partial" : "pass";
    } else {
      status = "fail";
    }
  }

  finalize({
    status,
    reason: errors.length > 0 ? errors.join("; ") : null,
    artifacts,
    runId,
    scenario,
    args,
    phase,
    baseUrl,
    account: fmtAccount(account),
    parentAccount: fmtParentAccount(parentAccount),
    networkSummary,
    tier1,
    tier2,
    parentAuthResult,
    parentDashboardResult,
    parentReportFindings,
    parentBlockReason,
    consoleErrors,
    consoleNoise,
    pageErrors,
    studentAuthMode,
    parentAuthMode,
    failureStep,
    driverResult,
  });
  process.exit(status === "pass" ? 0 : 1);
}

function buildFinalizeInputForFailure(input) {
  return {
    status: "fail",
    reason: input.reason,
    artifacts: input.artifacts,
    runId: input.runId,
    scenario: input.scenario,
    args: input.args,
    phase: input.phase,
    baseUrl: input.baseUrl,
    account: input.account || null,
    parentAccount: input.parentAccount || null,
    networkSummary: null,
    tier1: null,
    tier2: null,
    parentAuthResult: null,
    parentDashboardResult: null,
    parentReportFindings: null,
    parentBlockReason: null,
    consoleErrors: [],
    consoleNoise: [],
    pageErrors: [],
    studentAuthMode: input.studentAuthMode || null,
    parentAuthMode: input.parentAuthMode || null,
    failureStep: input.failureStep || "unknown",
    driverResult: null,
  };
}

function finalize(input) {
  const {
    status,
    reason,
    artifacts,
    runId,
    scenario,
    args,
    phase,
    baseUrl,
    account,
    parentAccount,
    networkSummary,
    tier1,
    tier2,
    parentAuthResult,
    parentDashboardResult,
    parentReportFindings,
    parentBlockReason,
    consoleErrors,
    consoleNoise,
    pageErrors,
    studentAuthMode,
    parentAuthMode,
    failureStep,
    driverResult,
  } = input;

  const summary = {
    runId,
    phase: String(phase).toUpperCase(),
    status,
    scenario: {
      id: scenario.id,
      subject: scenario.subject,
      profile: scenario.profile,
      grade: scenario.grade,
      operation: scenario.operation,
      questionCount: scenario.questionCount,
    },
    args: {
      phase: args.phase,
      scenario: args.scenario,
      student: args.student,
      parent: args.parent,
      headed: args.headed,
      baseUrl: args.baseUrl,
    },
    baseUrl,
    studentAuthMode: studentAuthMode || null,
    parentAuthMode: parentAuthMode || null,
    account: account || null,
    parentAccount: parentAccount || null,
    actualStudentState: driverResult
      ? {
          playerName: driverResult.playerName || null,
          accountGrade: driverResult.accountGrade ?? null,
          accountGradeRaw: driverResult.accountGradeRaw || null,
          scenarioRequestedGrade: scenario.grade,
          gradeOverridden:
            driverResult.accountGrade != null &&
            Number(driverResult.accountGrade) !== Number(scenario.grade),
        }
      : null,
    evidence: {
      network: networkSummary || null,
      tier1: tier1 || null,
      tier2: tier2 || null,
    },
    parent: {
      auth: parentAuthResult || null,
      dashboard: parentDashboardResult || null,
      report: parentReportFindings || null,
      blockReason: parentBlockReason || null,
    },
    driverResult: driverResult || null,
    consoleErrors: consoleErrors || [],
    consoleNoise: consoleNoise || [],
    pageErrors: pageErrors || [],
    failureStep: failureStep || null,
    reason: reason || null,
    artifactsRoot: artifacts.root,
  };

  artifacts.writeJsonSummary(summary);
  artifacts.writeMarkdownSummary(buildMarkdownSummary(summary));
  if (status !== "pass") {
    artifacts.writeFailureRepro(buildFailureRepro(summary));
  }

  console.log("");
  const banner =
    summary.phase === "B"
      ? "================ Virtual Student QA Phase B ================"
      : "================ Virtual Student QA Phase A ================";
  console.log(banner);
  console.log(`status     : ${status.toUpperCase()}`);
  console.log(`runId      : ${runId}`);
  console.log(`scenario   : ${scenario.id}`);
  console.log(`base URL   : ${baseUrl}`);
  console.log(
    `student    : auth=${studentAuthMode || "n/a"}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );
  if (summary.phase === "B") {
    console.log(
      `parent     : auth=${parentAuthMode || "n/a"}` +
        (parentAuthMode === "token" ? " [DEBUG-ONLY: never PASS]" : "")
    );
  }
  console.log(`artifacts  : ${artifacts.root}`);
  if (reason) console.log(`reason     : ${reason}`);
  console.log("============================================================");
}

function buildMarkdownSummary(s) {
  const lines = [];
  lines.push(`# Virtual Student QA — Phase ${s.phase}`);
  lines.push("");
  lines.push(`- **runId**: \`${s.runId}\``);
  lines.push(`- **status**: \`${s.status}\``);
  lines.push(
    `- **scenario**: \`${s.scenario.id}\` ` +
      `(subject=${s.scenario.subject}, profile=${s.scenario.profile}, grade=${s.scenario.grade}, ` +
      `operation=${s.scenario.operation}, questions=${s.scenario.questionCount})`
  );
  lines.push(`- **baseUrl**: \`${s.baseUrl}\``);
  lines.push(
    `- **studentAuthMode**: \`${s.studentAuthMode || "n/a"}\`` +
      (s.studentAuthMode === "api" ? " — **TEMPORARY:api-shortcut**" : "")
  );
  if (s.phase === "B") {
    lines.push(
      `- **parentAuthMode**: \`${s.parentAuthMode || "n/a"}\`` +
        (s.parentAuthMode === "token"
          ? " — **DEBUG-ONLY: token mode never produces PASS**"
          : "")
    );
  }
  if (s.account) {
    lines.push(
      `- **studentAccount**: label=\`${s.account.label}\` ` +
        `(usernameSet=${s.account.hasUsername}, codeSet=${s.account.hasCode})`
    );
  }
  if (s.parentAccount) {
    lines.push(
      `- **parentAccount**: label=\`${s.parentAccount.label}\` ` +
        `(emailMasked=\`${s.parentAccount.emailMasked}\`, ` +
        `linkedStudentLabel=\`${s.parentAccount.linkedStudentLabel || "(n/a)"}\`)`
    );
  }
  if (s.actualStudentState) {
    lines.push("");
    lines.push("## Actual student state (as observed by the live UI)");
    lines.push(`- playerName: \`${s.actualStudentState.playerName || "(unknown)"}\``);
    lines.push(
      `- accountGrade (live): \`${s.actualStudentState.accountGradeRaw || "(empty)"}\` ` +
        `(numeric=\`${s.actualStudentState.accountGrade ?? "(n/a)"}\`)`
    );
    lines.push(
      `- scenarioRequestedGrade: \`${s.actualStudentState.scenarioRequestedGrade}\` — ` +
        `\`gradeOverridden=${s.actualStudentState.gradeOverridden}\` ` +
        "(the page forces grade to the student's account grade; this is real product behaviour and is recorded here for traceability)"
    );
  }
  lines.push("");
  lines.push("## Persistence evidence (Tier 1 — network)");
  if (s.evidence.tier1) {
    lines.push(`- passed: \`${s.evidence.tier1.passed}\``);
    lines.push(`- learningSessionId: \`${s.evidence.tier1.sessionId || "(none)"}\``);
    lines.push(`- counts: \`${JSON.stringify(s.evidence.tier1.counts)}\``);
    if (s.evidence.tier1.errors.length > 0) {
      lines.push("- errors:");
      for (const e of s.evidence.tier1.errors) lines.push(`  - ${e}`);
    }
  } else {
    lines.push("- not evaluated (driver did not complete)");
  }
  lines.push("");
  lines.push("## Persistence evidence (Tier 2 — Supabase, optional)");
  if (s.evidence.tier2) {
    lines.push(`- enabled: \`${s.evidence.tier2.enabled}\``);
    if (s.evidence.tier2.enabled) {
      lines.push(`- passed: \`${s.evidence.tier2.passed}\``);
      if (s.evidence.tier2.counts) {
        lines.push(`- counts: \`${JSON.stringify(s.evidence.tier2.counts)}\``);
      }
      if (s.evidence.tier2.errors?.length) {
        lines.push("- errors:");
        for (const e of s.evidence.tier2.errors) lines.push(`  - ${e}`);
      }
    } else if (s.evidence.tier2.reason) {
      lines.push(`- reason: ${s.evidence.tier2.reason}`);
    }
  } else {
    lines.push("- not evaluated (driver did not complete)");
  }
  if (s.phase === "B") {
    lines.push("");
    lines.push("## Parent verification (Phase B)");
    if (s.parent.blockReason) {
      lines.push(`- skipped: ${s.parent.blockReason}`);
    } else {
      const auth = s.parent.auth;
      const dash = s.parent.dashboard;
      const rep = s.parent.report;
      lines.push("### Parent auth (real /parent/login UI)");
      if (auth) {
        lines.push(`- mode: \`${auth.mode}\``);
        lines.push(`- alreadyAuthenticated: \`${auth.alreadyAuthenticated || false}\``);
        lines.push(`- pass-eligible: \`${auth.pass}\` (partial=\`${auth.partial}\`)`);
        if (auth.note) lines.push(`- note: ${auth.note}`);
      } else {
        lines.push("- not run (earlier failure)");
      }
      lines.push("");
      lines.push("### Parent dashboard → report opener");
      if (dash) {
        lines.push(`- dashboardUrl: \`${dash.dashboardUrl}\``);
        lines.push(`- studentMatched: \`${dash.studentName}\``);
        lines.push(`- reportLinkHref: \`${dash.reportLinkHref}\``);
        lines.push(`- reportUrl (post-click): \`${dash.reportUrl}\``);
        lines.push(`- studentIdFromUrl: \`${dash.studentIdFromUrl}\``);
      } else {
        lines.push("- not run (earlier failure)");
      }
      lines.push("");
      lines.push("### Parent report DOM assertions");
      if (rep) {
        lines.push(`- headingVisible (\"דוח להורים\"): \`${rep.headingVisible}\``);
        lines.push(`- loadingTextHidden: \`${rep.loadingTextHidden}\``);
        lines.push(`- errorTextHidden: \`${rep.errorTextHidden}\``);
        lines.push(`- authRequiredHidden: \`${rep.authRequiredHidden}\``);
        lines.push(`- notEmptyState: \`${rep.notEmptyState}\``);
        lines.push(
          `- subjectVisible (\`${rep.subjectLabel}\`): \`${rep.subjectVisible}\` ` +
            `(questionCount=\`${rep.subjectQuestionCount ?? "n/a"}\`)`
        );
        lines.push(`- totalQuestions: \`${rep.totalQuestions ?? "n/a"}\``);
        lines.push(`- overallAccuracyPct: \`${rep.overallAccuracyPct ?? "n/a"}\``);
        lines.push(
          `- accuracyDirectionOk: \`${rep.accuracyDirectionOk}\` (${rep.accuracyDirectionNote || "—"})`
        );
        lines.push(`- rawKeyLeaks: \`${JSON.stringify(rep.rawKeyLeaks || [])}\``);
        lines.push(`- rtlOk: \`${rep.rtlOk}\``);
        if (rep.studentNameVisible) {
          lines.push(`- studentNameVisible: \`${rep.studentNameVisible}\``);
        }
      } else {
        lines.push("- not run (earlier failure)");
      }
    }
  }
  lines.push("");
  if (s.driverResult) {
    lines.push("## Driver result");
    lines.push(`- questions answered: ${s.driverResult.answeredQuestions.length}`);
    for (const q of s.driverResult.answeredQuestions) {
      lines.push(
        `  - q${q.index}: \`${q.exerciseText}\` → submit=\`${q.submitted}\` ` +
          `(computed=\`${q.computed}\`, intendedCorrect=\`${q.intendedCorrect}\`)`
      );
    }
    lines.push("");
  }
  if (s.consoleErrors.length > 0) {
    lines.push("## Console errors (gated)");
    for (const e of s.consoleErrors) lines.push(`- ${e}`);
    lines.push("");
  }
  if (s.consoleNoise && s.consoleNoise.length > 0) {
    lines.push("## Console noise (informational, not gated)");
    lines.push(
      "_Generic 'Failed to load resource' messages from page lifecycle (e.g. pre-login /api/student/me 401, asset 404s). Not product errors._"
    );
    for (const e of s.consoleNoise) lines.push(`- ${e}`);
    lines.push("");
  }
  if (s.pageErrors.length > 0) {
    lines.push("## Page errors");
    for (const e of s.pageErrors) lines.push(`- ${e}`);
    lines.push("");
  }
  if (s.reason) {
    lines.push("## Failure reason");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
    lines.push("");
  }
  lines.push("## Artifacts");
  lines.push(`- root: \`${s.artifactsRoot}\``);
  return lines.join("\n");
}

function buildFailureRepro(s) {
  const lines = [];
  lines.push(`# Failure repro — ${s.runId}`);
  lines.push("");
  lines.push(`Failed at step: \`${s.failureStep || "unknown"}\``);
  if (s.reason) {
    lines.push("Reason:");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
  }
  lines.push("");
  lines.push("## Reproduce");
  lines.push("");
  lines.push("Set the same env (values not shown):");
  lines.push("");
  lines.push("Student (Phase A):");
  lines.push("- `VIRTUAL_STUDENT_ACCOUNTS` _or_ `E2E_STUDENT_USERNAME` + `E2E_STUDENT_PIN`");
  lines.push("- `VIRTUAL_STUDENT_STUDENT_AUTH=ui` (default) or `=api` (debug shortcut)");
  if (s.phase === "B") {
    lines.push("");
    lines.push("Parent (Phase B):");
    lines.push("- `VIRTUAL_STUDENT_PARENT_ACCOUNTS` _or_ `E2E_PARENT_EMAIL` + `E2E_PARENT_PASSWORD`");
    lines.push(
      "- `VIRTUAL_STUDENT_PARENT_AUTH=ui` (default, only mode that can produce PASS) " +
        "or `=token` (debug-only, always partial)"
    );
    lines.push(
      "- For `token` mode only: `NEXT_PUBLIC_LEARNING_SUPABASE_URL`, `NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY`"
    );
  }
  lines.push("- `PLAYWRIGHT_BASE_URL` (or rely on default `http://127.0.0.1:3001`)");
  lines.push("");
  lines.push("Then run:");
  lines.push("");
  lines.push("```");
  const headedFlag = s.args.headed ? " --headed" : "";
  const studentFlag = s.args.student ? ` --student ${s.args.student}` : "";
  const parentFlag = s.args.parent ? ` --parent ${s.args.parent}` : "";
  const phaseFlag = ` --phase ${s.phase.toLowerCase()}`;
  lines.push(
    `node scripts/virtual-student-qa/run.mjs${phaseFlag} --scenario ${s.scenario.id}${studentFlag}${parentFlag}${headedFlag}`
  );
  lines.push("```");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Phase C — multi-subject suite orchestration
// ---------------------------------------------------------------------------

function selectPhaseCScenarios(args) {
  const all = PHASE_C_SCENARIOS;
  const filterIds = [];
  if (args.scenario) filterIds.push(args.scenario.trim());
  if (args.scenarios) {
    for (const id of String(args.scenarios).split(",")) {
      const trimmed = id.trim();
      if (trimmed) filterIds.push(trimmed);
    }
  }
  if (filterIds.length === 0) return all;
  const byId = new Map(all.map((s) => [s.id, s]));
  const picked = [];
  const missing = [];
  for (const id of filterIds) {
    if (byId.has(id)) picked.push(byId.get(id));
    else missing.push(id);
  }
  if (missing.length > 0) {
    throw new Error(
      `phase-c: unknown scenario id(s): ${missing.join(", ")}. ` +
        `Known ids: ${all.map((s) => s.id).join(", ")}`
    );
  }
  return picked;
}

async function mainPhaseC(args) {
  const repoRoot = getRepoRoot();
  const runId = newRunId();
  const artifacts = makeRunArtifacts({ repoRoot, runId });
  const phaseLogId = `phase-c-suite__${args.student || "default"}`;

  function log(line) {
    console.log(line);
    artifacts.appendLog(phaseLogId, line);
  }

  log(`runId=${runId}`);
  log(`phase=C scenarios=${args.scenario || args.scenarios || "(default suite)"}`);

  let scenarios;
  try {
    scenarios = selectPhaseCScenarios(args);
  } catch (error) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason: `config: ${error.message}`,
      failureStep: "config",
      artifacts, runId, args,
    }));
  }
  log(
    `phase-c: ${scenarios.length} scenario(s) queued: ` +
      `${scenarios.map((s) => `${s.id}[${s.subject}/${s.profile}]`).join(", ")}`
  );

  const baseUrl = resolveBaseUrl(args.baseUrl);
  log(`baseUrl=${baseUrl}`);

  // ---- Account loading --------------------------------------------------
  let accounts;
  try {
    accounts = loadAccounts();
  } catch (error) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason: `config: ${error.message}`,
      failureStep: "config",
      artifacts, runId, args, baseUrl,
    }));
  }
  if (accounts.length === 0) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason:
        "config: no virtual-student accounts found. Set VIRTUAL_STUDENT_ACCOUNTS (JSON) " +
        "or E2E_STUDENT_USERNAME + E2E_STUDENT_PIN.",
      failureStep: "config",
      artifacts, runId, args, baseUrl,
    }));
  }
  let account;
  try {
    account = selectAccount(accounts, args.student);
  } catch (error) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason: `config: ${error.message}`,
      failureStep: "config",
      artifacts, runId, args, baseUrl,
    }));
  }
  log(`account=${JSON.stringify(fmtAccount(account))}`);

  const studentAuthMode = resolveStudentAuthMode();
  log(
    `studentAuthMode=${studentAuthMode}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );

  const parentAuthMode = resolveParentAuthMode();
  log(
    `parentAuthMode=${parentAuthMode}` +
      (parentAuthMode === "token"
        ? " [DEBUG-ONLY: token mode never produces full PASS]"
        : "")
  );
  let parents = [];
  try {
    parents = loadParentAccounts();
  } catch (error) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason: `config: ${error.message}`,
      failureStep: "config",
      artifacts, runId, args, baseUrl,
      account: fmtAccount(account), studentAuthMode, parentAuthMode,
    }));
  }
  if (parents.length === 0) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason:
        "config: no virtual-student parent accounts found. Set VIRTUAL_STUDENT_PARENT_ACCOUNTS (JSON) " +
        "or E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD. (Phase C requires a real parent account.)",
      failureStep: "config",
      artifacts, runId, args, baseUrl,
      account: fmtAccount(account), studentAuthMode, parentAuthMode,
    }));
  }
  let parentAccount;
  try {
    parentAccount = selectParentAccount(parents, args.parent, account.label);
  } catch (error) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason: `config: ${error.message}`,
      failureStep: "config",
      artifacts, runId, args, baseUrl,
      account: fmtAccount(account), studentAuthMode, parentAuthMode,
    }));
  }
  log(`parentAccount=${JSON.stringify(fmtParentAccount(parentAccount))}`);

  try {
    await preflight(baseUrl, log);
  } catch (error) {
    return finalizePhaseC(buildPhaseCFailureFinalize({
      reason: error.message,
      failureStep: "preflight",
      artifacts, runId, args, baseUrl,
      account: fmtAccount(account),
      parentAccount: fmtParentAccount(parentAccount),
      studentAuthMode, parentAuthMode,
    }));
  }

  const headed = args.headed || isHeaded();
  const browser = await launchBrowser({ headed });
  const context = await newStudentContext(browser);
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleNoise = [];
  const pageErrors = [];
  const NOISE_RE = /^Failed to load resource:/i;
  page.on("console", (msg) => {
    const text = String(msg.text()).slice(0, 400);
    const debug = String(process.env.VIRTUAL_STUDENT_DEBUG_CONSOLE || "").trim();
    if (debug === "1" || debug.toLowerCase() === "true") {
      log(`page-console[${msg.type()}]: ${text}`);
    }
    if (msg.type() !== "error") return;
    if (NOISE_RE.test(text)) consoleNoise.push(text);
    else consoleErrors.push(text);
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err?.message || err).slice(0, 400));
  });

  const observer = attachLearningNetworkObserver(page);

  if (String(process.env.VIRTUAL_STUDENT_DEBUG_NET || "").trim() === "1") {
    page.on("request", (request) => {
      const u = request.url();
      if (u.includes("/api/")) log(`page-request: ${request.method()} ${u}`);
    });
  }

  let suiteResult = null;
  let failureStep = null;
  let failureReason = null;
  let actualStudentState = null;

  try {
    failureStep = "student-auth";
    await authenticateStudent({
      context, page, account, baseUrl, mode: studentAuthMode, log,
    });
    await artifacts.saveScreenshot(page, "01-after-student-auth");

    failureStep = "resolve-student-name";
    actualStudentState = await readActualStudentStateFromApi({
      page, baseUrl, log,
    });
    log(
      `phase-c: resolved student state from /api/student/me — ` +
        `name="${actualStudentState.playerName || "(empty)"}" ` +
        `grade="${actualStudentState.accountGradeRaw || "(empty)"}"`
    );
    if (!actualStudentState.playerName) {
      throw new Error(
        "phase-c: cannot proceed — /api/student/me returned an empty full_name. " +
          "Set a non-empty full_name on the test student row."
      );
    }

    failureStep = "phase-c-suite";
    suiteResult = await runPhaseCSuite({
      page, context, baseUrl, scenarios,
      parentAccount, parentAuthMode, observer, artifacts,
      studentPlayerNamePromise: Promise.resolve(actualStudentState.playerName),
      log,
    });
    failureStep = null;
  } catch (error) {
    failureReason = error?.message || String(error);
    log(`FAILURE step=${failureStep || "unknown"}: ${failureReason}`);
    await artifacts
      .saveScreenshot(page, `failure-${failureStep || "unknown"}`)
      .catch(() => {});
  }

  await artifacts.saveScreenshot(page, "99-final-state").catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  // ---- Dev-mode HMR-fetch console error suppression --------------------
  //
  // When the suite is otherwise completely clean, we tolerate exactly one
  // narrow class of console error: the parent-report page logs
  //   [parent-report] report load failed: TypeError: Failed to fetch
  // when its initial fetch is interrupted by a Next.js dev-server HMR
  // rebuild. That message is *only* the JS-level fetch primitive failing
  // (no HTTP response) — it is NOT a server 5xx and NOT a product bug.
  //
  // We re-classify that specific message as "suppressed dev-mode noise"
  // ONLY when ALL of the following hold post-run:
  //   • no scenario gate failed       (counts.fail === 0)
  //   • no scenario was partial/blocked (counts.partial === 0, counts.blocked === 0)
  //   • every scenario's Tier 1 passed (so no /api/learning/* 5xx happened
  //     on the required learning endpoints — verifyTier1 already enforces
  //     this for session/start, /answer, session/finish)
  //   • parent auth was not partial   (so login/dashboard/report worked)
  //   • there were no page errors     (no uncaught JS throws)
  //   • the runner did not record a top-level failure step
  //
  // If ANY of those conditions fail, we keep the message in consoleErrors
  // and gate the suite as fail, exactly like before. The suppressed entries
  // are still written to run-summary.{json,md} under a clearly-labelled
  // section so the user can see what was tolerated.
  const DEV_MODE_PARENT_REPORT_FETCH_RE =
    /^\[parent-report\] report load failed: TypeError: Failed to fetch/i;

  const counts = suiteResult?.summary?.counts || null;
  const parentAuthPartial = !!(
    suiteResult?.parentAuthResult && suiteResult.parentAuthResult.partial
  );
  const allScenarioGatesPassed =
    !!suiteResult &&
    counts &&
    counts.fail === 0 &&
    counts.partial === 0 &&
    counts.blocked === 0 &&
    suiteResult.scenarioRecords.every(
      (r) => r.tier1 && r.tier1.passed === true
    );
  const suppressionEligible =
    !failureReason &&
    allScenarioGatesPassed &&
    !parentAuthPartial &&
    pageErrors.length === 0;

  let consoleErrorsRetained = consoleErrors;
  const consoleSuppressedDevNoise = [];
  if (suppressionEligible) {
    consoleErrorsRetained = [];
    for (const text of consoleErrors) {
      if (DEV_MODE_PARENT_REPORT_FETCH_RE.test(text)) {
        consoleSuppressedDevNoise.push(text);
      } else {
        consoleErrorsRetained.push(text);
      }
    }
  }

  // ---- Suite-level status decision --------------------------------------
  let status = "fail";
  if (failureReason) {
    status = "fail";
  } else if (!suiteResult) {
    status = "fail";
  } else {
    const c = counts;
    if (c.fail > 0) {
      status = "fail";
    } else if (c.partial > 0 || parentAuthPartial || c.blocked > 0) {
      // Any partial scenario, debug-only parent token, or blocker → suite is
      // PARTIAL (not full PASS). Blocker is included so moledet does not
      // silently disappear from the suite-level status.
      status = "partial";
    } else if (consoleErrorsRetained.length > 0 || pageErrors.length > 0) {
      status = "fail";
    } else if (c.pass > 0) {
      status = "pass";
    } else {
      status = "fail";
    }
  }

  finalizePhaseC({
    status,
    artifacts, runId, args, baseUrl,
    account: fmtAccount(account),
    parentAccount: fmtParentAccount(parentAccount),
    studentAuthMode, parentAuthMode,
    actualStudentState,
    suiteResult,
    consoleErrors: consoleErrorsRetained,
    consoleNoise,
    pageErrors,
    consoleSuppressedDevNoise,
    failureStep, failureReason,
  });
  process.exit(status === "pass" ? 0 : 1);
}

/**
 * Read the current student's identity from /api/student/me using the page's
 * authenticated context. We need this BEFORE any subject driver runs so the
 * Phase C orchestrator can take the very first parent-report baseline
 * snapshot from a known student name.
 */
async function readActualStudentStateFromApi({ page, baseUrl, log }) {
  const url = new URL("/api/student/me", baseUrl).toString();
  let res;
  try {
    res = await page.request.get(url, { timeout: 30_000 });
  } catch (error) {
    throw new Error(
      `phase-c: /api/student/me request failed: ${error?.message || error}`
    );
  }
  const status = res.status();
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (status !== 200 || !body) {
    log(`phase-c: /api/student/me HTTP ${status} body=${JSON.stringify(body)}`);
    throw new Error(
      `phase-c: /api/student/me returned non-success: status=${status}`
    );
  }
  // Response shape: { ok: true, student: { id, full_name, grade_level, ... } }.
  // We also tolerate the older flat shapes (fullName / full_name at top level)
  // for forward compatibility with the dev-student-identity payload.
  const studentBody = body.student || body;
  const fullName = String(
    studentBody?.full_name || studentBody?.fullName || ""
  ).trim();
  const gradeRaw =
    studentBody?.grade_level ?? studentBody?.gradeLevel ?? studentBody?.grade;
  // grade_level is a string like "grade_3"; extract the trailing number.
  let gradeNumber = null;
  if (gradeRaw != null) {
    const m = String(gradeRaw).match(/(\d+)/);
    if (m) gradeNumber = Number(m[1]);
  }
  return {
    playerName: fullName,
    accountGrade: Number.isFinite(gradeNumber) ? gradeNumber : null,
    accountGradeRaw: gradeRaw == null ? "" : String(gradeRaw),
  };
}

function buildPhaseCFailureFinalize(input) {
  return {
    status: "fail",
    artifacts: input.artifacts,
    runId: input.runId,
    args: input.args,
    baseUrl: input.baseUrl || "",
    account: input.account || null,
    parentAccount: input.parentAccount || null,
    studentAuthMode: input.studentAuthMode || null,
    parentAuthMode: input.parentAuthMode || null,
    actualStudentState: null,
    suiteResult: null,
    consoleErrors: [],
    consoleNoise: [],
    pageErrors: [],
    failureStep: input.failureStep || "config",
    failureReason: input.reason,
  };
}

function finalizePhaseC(input) {
  const {
    status,
    artifacts, runId, args, baseUrl,
    account, parentAccount,
    studentAuthMode, parentAuthMode,
    actualStudentState,
    suiteResult,
    consoleErrors, consoleNoise, pageErrors,
    consoleSuppressedDevNoise,
    failureStep, failureReason,
  } = input;

  const summary = {
    runId,
    phase: "C",
    status,
    args: {
      phase: args.phase,
      scenario: args.scenario,
      scenarios: args.scenarios,
      student: args.student,
      parent: args.parent,
      headed: args.headed,
      baseUrl: args.baseUrl,
    },
    baseUrl: baseUrl || null,
    studentAuthMode: studentAuthMode || null,
    parentAuthMode: parentAuthMode || null,
    account: account || null,
    parentAccount: parentAccount || null,
    actualStudentState: actualStudentState || null,
    parent: {
      auth: suiteResult?.parentAuthResult || null,
    },
    suite: suiteResult
      ? {
          counts: suiteResult.summary.counts,
          bySubject: suiteResult.summary.bySubject,
          byProfile: suiteResult.summary.byProfile,
          resolvedStudentName: suiteResult.resolvedStudentName || null,
          scenarios: suiteResult.scenarioRecords.map((r) => ({
            id: r.scenario.id,
            subject: r.scenario.subject,
            profile: r.scenario.profile,
            status: r.status,
            blocked: r.blocked || false,
            blocker: r.blocker || null,
            driverError: r.driverError || null,
            earlyExitReason: r.earlyExitReason || null,
            tier1: r.tier1 || null,
            tier1ScenarioCounts: r.tier1ScenarioCounts || null,
            answeredQuestionsCount: r.driverResult?.answeredQuestions?.length ?? null,
            skippedAudioCount: r.driverResult?.skippedAudioQuestions?.length ?? null,
            shapeCounts: r.driverResult?.shapeCounts || null,
            tally: r.driverResult?.tally || null,
            answerFlow: r.driverResult?.answerFlow || null,
            profileEvidence: r.profileEvidence || null,
            baseline: r.baseline || null,
            after: r.after || null,
            delta: r.delta || null,
            deltaClassification: r.deltaClassification || null,
            probeFailures: r.driverResult?.probeFailures || null,
          })),
        }
      : null,
    consoleErrors: consoleErrors || [],
    consoleNoise: consoleNoise || [],
    consoleSuppressedDevNoise: consoleSuppressedDevNoise || [],
    pageErrors: pageErrors || [],
    failureStep: failureStep || null,
    reason: failureReason || null,
    artifactsRoot: artifacts.root,
  };

  artifacts.writeJsonSummary(summary);
  artifacts.writeMarkdownSummary(buildPhaseCMarkdown(summary));
  if (status !== "pass") {
    artifacts.writeFailureRepro(buildPhaseCFailureRepro(summary));
  }

  console.log("");
  console.log("================ Virtual Student QA Phase C ================");
  console.log(`status     : ${status.toUpperCase()}`);
  console.log(`runId      : ${runId}`);
  if (suiteResult) {
    const c = summary.suite.counts;
    console.log(
      `scenarios  : pass=${c.pass} partial=${c.partial} fail=${c.fail} blocked=${c.blocked} total=${c.total}`
    );
  }
  console.log(`base URL   : ${baseUrl || "(unresolved)"}`);
  console.log(
    `student    : auth=${studentAuthMode || "n/a"}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );
  console.log(
    `parent     : auth=${parentAuthMode || "n/a"}` +
      (parentAuthMode === "token" ? " [DEBUG-ONLY: never PASS]" : "")
  );
  console.log(`artifacts  : ${artifacts.root}`);
  if (failureReason) console.log(`reason     : ${failureReason}`);
  console.log("============================================================");
}

function buildPhaseCMarkdown(s) {
  const lines = [];
  lines.push("# Virtual Student QA — Phase C (multi-subject suite)");
  lines.push("");
  lines.push(`- **runId**: \`${s.runId}\``);
  lines.push(`- **status**: \`${s.status}\``);
  lines.push(`- **baseUrl**: \`${s.baseUrl || "(unresolved)"}\``);
  lines.push(
    `- **studentAuthMode**: \`${s.studentAuthMode || "n/a"}\`` +
      (s.studentAuthMode === "api" ? " — **TEMPORARY:api-shortcut**" : "")
  );
  lines.push(
    `- **parentAuthMode**: \`${s.parentAuthMode || "n/a"}\`` +
      (s.parentAuthMode === "token"
        ? " — **DEBUG-ONLY: token mode never produces full PASS**"
        : "")
  );
  if (s.account) {
    lines.push(
      `- **studentAccount**: label=\`${s.account.label}\` ` +
        `(usernameSet=${s.account.hasUsername}, codeSet=${s.account.hasCode})`
    );
  }
  if (s.parentAccount) {
    lines.push(
      `- **parentAccount**: label=\`${s.parentAccount.label}\` ` +
        `(emailMasked=\`${s.parentAccount.emailMasked}\`, ` +
        `linkedStudentLabel=\`${s.parentAccount.linkedStudentLabel || "(n/a)"}\`)`
    );
  }
  if (s.actualStudentState) {
    lines.push("");
    lines.push("## Actual student state (from /api/student/me)");
    lines.push(`- playerName: \`${s.actualStudentState.playerName || "(unknown)"}\``);
    lines.push(
      `- accountGrade: \`${s.actualStudentState.accountGradeRaw || "(empty)"}\` ` +
        `(numeric=\`${s.actualStudentState.accountGrade ?? "(n/a)"}\`)`
    );
  }
  if (s.suite) {
    lines.push("");
    lines.push("## Suite roll-up");
    lines.push(`- counts: \`${JSON.stringify(s.suite.counts)}\``);
    lines.push("");
    lines.push("### Per-subject status");
    for (const [subject, info] of Object.entries(s.suite.bySubject || {})) {
      lines.push(
        `- **${subject}**: pass=${info.pass || 0} partial=${info.partial || 0} ` +
          `fail=${info.fail || 0} blocked=${info.blocked || 0} ` +
          `(scenarios: ${info.scenarios.join(", ")})`
      );
    }
    lines.push("");
    lines.push("### Per-profile evidence (the four answer profiles)");
    for (const [profile, info] of Object.entries(s.suite.byProfile || {})) {
      lines.push(
        `- **${profile}**: ok=${info.ok || 0} fail=${info.fail || 0} unknown=${info.unknown || 0}`
      );
      for (const sc of info.scenarios || []) {
        const ir = sc.intendedRate == null ? "n/a" : `${(sc.intendedRate * 100).toFixed(0)}%`;
        const or = sc.observedRate == null ? "n/a" : `${(sc.observedRate * 100).toFixed(0)}%`;
        lines.push(`  - ${sc.id}: intendedRate=${ir} observedRate=${or}`);
      }
    }
    lines.push("");
    lines.push("## Per-scenario detail");
    for (const sc of s.suite.scenarios) {
      lines.push("");
      lines.push(`### \`${sc.id}\` — ${sc.subject} / ${sc.profile} / status=\`${sc.status}\``);
      if (sc.blocked) {
        lines.push("**BLOCKER** — recorded but not run.");
        if (sc.blocker) {
          lines.push(`- kind: \`${sc.blocker.kind}\``);
          if (sc.blocker.message) lines.push(`- message: ${sc.blocker.message}`);
          if (sc.blocker.missingTestids) {
            lines.push(`- missing testids: \`${JSON.stringify(sc.blocker.missingTestids)}\``);
          }
          if (sc.blocker.recommendedAction) {
            lines.push(`- recommendedAction: ${sc.blocker.recommendedAction}`);
          }
        }
        continue;
      }
      if (sc.driverError) {
        lines.push(`- driverError: \`${sc.driverError}\``);
      }
      if (sc.earlyExitReason) {
        lines.push(
          `- earlyExitReason: \`${sc.earlyExitReason}\` (driver stopped before reaching ` +
            `the configured questionCount; subject limitation, not a runner bug)`
        );
      }
      lines.push(`- answeredQuestions: ${sc.answeredQuestionsCount ?? "n/a"}`);
      if (sc.shapeCounts && Object.keys(sc.shapeCounts).length > 0) {
        const parts = Object.entries(sc.shapeCounts)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        lines.push(`- shapeCounts: ${parts}`);
      }
      if (sc.skippedAudioCount && sc.skippedAudioCount > 0) {
        lines.push(
          `- audioSkipped: ${sc.skippedAudioCount} question(s) advanced via the real-UI 'דילוג' button ` +
            `(no /api/learning/answer fired; product behaviour for hebrew_audio_recorded_manual mode)`
        );
      }
      if (sc.tier1) {
        lines.push(
          `- tier1: passed=\`${sc.tier1.passed}\` counts=\`${JSON.stringify(sc.tier1.counts)}\``
        );
        if (sc.tier1.errors?.length) {
          for (const e of sc.tier1.errors) lines.push(`  - tier1 error: ${e}`);
        }
      }
      if (sc.profileEvidence) {
        const pe = sc.profileEvidence;
        lines.push(
          `- profileEvidence: profile=\`${pe.profile}\` ` +
            `intendedRate=\`${pe.intendedRate == null ? "n/a" : (pe.intendedRate * 100).toFixed(0) + "%"}\` ` +
            `observedRate=\`${pe.observedRate == null ? "n/a" : (pe.observedRate * 100).toFixed(0) + "%"}\` ` +
            `signalOk=\`${pe.profileSignalOk}\``
        );
        lines.push(`  - expectation: ${pe.expectation}`);
        lines.push(`  - note: ${pe.note}`);
      }
      if (sc.baseline) {
        lines.push(
          `- baseline: total=\`${sc.baseline.totalQuestions}\` ` +
            `accuracy=\`${sc.baseline.overallAccuracyPct}%\` ` +
            `subject(${sc.subject})=\`${sc.baseline.bySubject?.[sc.subject]?.questionCount ?? "n/a"}\` ` +
            `(empty=\`${sc.baseline.isEmptyState}\`)`
        );
      }
      if (sc.after) {
        lines.push(
          `- after:    total=\`${sc.after.totalQuestions}\` ` +
            `accuracy=\`${sc.after.overallAccuracyPct}%\` ` +
            `subject(${sc.subject})=\`${sc.after.bySubject?.[sc.subject]?.questionCount ?? "n/a"}\``
        );
      }
      if (sc.deltaClassification) {
        const dc = sc.deltaClassification;
        lines.push(
          `- delta: subject=\`${dc.subject}\` before=\`${dc.before}\` after=\`${dc.after}\` ` +
            `delta=\`${dc.delta}\` expected≥\`${dc.expected}\` directionOk=\`${dc.directionOk}\``
        );
        lines.push(`  - note: ${dc.note}`);
      }
      if (sc.probeFailures && sc.probeFailures.length > 0) {
        lines.push(
          `- probeFailures: ${sc.probeFailures.length} (this scenario's MCQ ` +
            `profile control was DEGRADED for those questions; intendedCorrect ` +
            `unknown for them)`
        );
      }
    }
  }
  if (s.consoleErrors?.length > 0) {
    lines.push("");
    lines.push("## Console errors (gated)");
    for (const e of s.consoleErrors) lines.push(`- ${e}`);
  }
  if (s.consoleSuppressedDevNoise?.length > 0) {
    lines.push("");
    lines.push("## Console errors (suppressed as known dev-mode HMR noise)");
    lines.push(
      "_These messages match the narrow pattern_ " +
        "`[parent-report] report load failed: TypeError: Failed to fetch` " +
        "_— a JS-level fetch failure caused by a Next.js dev-server HMR rebuild_ " +
        "_on the parent-report page. They are reclassified as non-gating ONLY_ " +
        "_when every per-scenario gate passed, every scenario's Tier 1 (no_ " +
        "_5xx on /api/learning/{session/start, answer, session/finish}) passed,_ " +
        "_parent auth was non-partial, and there were no page errors. Listed_ " +
        "_here so they are never silently hidden._"
    );
    for (const e of s.consoleSuppressedDevNoise) lines.push(`- ${e}`);
  }
  if (s.consoleNoise?.length > 0) {
    lines.push("");
    lines.push("## Console noise (informational, not gated)");
    lines.push(
      "_Generic 'Failed to load resource' messages from page lifecycle._"
    );
    for (const e of s.consoleNoise) lines.push(`- ${e}`);
  }
  if (s.pageErrors?.length > 0) {
    lines.push("");
    lines.push("## Page errors");
    for (const e of s.pageErrors) lines.push(`- ${e}`);
  }
  if (s.reason) {
    lines.push("");
    lines.push("## Suite failure reason");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
  }
  lines.push("");
  lines.push("## Artifacts");
  lines.push(`- root: \`${s.artifactsRoot}\``);
  return lines.join("\n");
}

function buildPhaseCFailureRepro(s) {
  const lines = [];
  lines.push(`# Phase C failure repro — ${s.runId}`);
  lines.push("");
  lines.push(`Status: \`${s.status}\``);
  if (s.failureStep) lines.push(`Failed at step: \`${s.failureStep}\``);
  if (s.reason) {
    lines.push("Reason:");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
  }
  lines.push("");
  lines.push("## Reproduce");
  lines.push("");
  lines.push("Set the same env (values not shown):");
  lines.push("");
  lines.push("Student:");
  lines.push("- `VIRTUAL_STUDENT_ACCOUNTS` _or_ `E2E_STUDENT_USERNAME` + `E2E_STUDENT_PIN`");
  lines.push("- `VIRTUAL_STUDENT_STUDENT_AUTH=ui` (default) or `=api` (debug shortcut)");
  lines.push("");
  lines.push("Parent:");
  lines.push("- `VIRTUAL_STUDENT_PARENT_ACCOUNTS` _or_ `E2E_PARENT_EMAIL` + `E2E_PARENT_PASSWORD`");
  lines.push(
    "- `VIRTUAL_STUDENT_PARENT_AUTH=ui` (default — only mode that can produce PASS) " +
      "or `=token` (debug-only, always PARTIAL)"
  );
  lines.push("- `PLAYWRIGHT_BASE_URL` (or rely on default `http://127.0.0.1:3001`)");
  lines.push("");
  lines.push("Then run:");
  lines.push("");
  lines.push("```");
  const headedFlag = s.args.headed ? " --headed" : "";
  const studentFlag = s.args.student ? ` --student ${s.args.student}` : "";
  const parentFlag = s.args.parent ? ` --parent ${s.args.parent}` : "";
  const filterFlag = s.args.scenarios
    ? ` --scenarios ${s.args.scenarios}`
    : s.args.scenario
      ? ` --scenario ${s.args.scenario}`
      : "";
  lines.push(
    `node scripts/virtual-student-qa/run.mjs --phase c${filterFlag}${studentFlag}${parentFlag}${headedFlag}`
  );
  lines.push("```");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Phase D — multi-student real UI QA
// ---------------------------------------------------------------------------

const DEV_MODE_PARENT_REPORT_FETCH_RE_PHASE_D =
  /^\[parent-report\] report load failed: TypeError: Failed to fetch/i;

async function mainPhaseD(args) {
  const repoRoot = getRepoRoot();
  const runId = newRunId();
  const artifacts = makeRunArtifacts({ repoRoot, runId });
  const phaseLogId = `phase-d-${args.plan || "smoke"}`;

  function log(line) {
    console.log(line);
    artifacts.appendLog(phaseLogId, line);
  }

  log(`runId=${runId}`);
  log(`phase=D plan=${args.plan || "smoke"} students=${args.students || "(all)"}`);

  // ---- 1. Resolve plan --------------------------------------------------
  let plan;
  try {
    plan = selectPhaseDPlan({
      planName: args.plan || "smoke",
      studentLabels: args.students
        ? String(args.students).split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    });
  } catch (error) {
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason: `config: ${error.message}`,
        failureStep: "config",
        artifacts,
        runId,
        args,
      })
    );
  }
  log(
    `phase-d: ${plan.length} student(s) queued: ` +
      plan
        .map((p) => `${p.studentLabel}(g${p.grade}/${p.scenario.subject})`)
        .join(", ")
  );

  const baseUrl = resolveBaseUrl(args.baseUrl);
  log(`baseUrl=${baseUrl}`);

  // ---- 2. Account loading ----------------------------------------------
  let accounts;
  try {
    accounts = loadAccounts();
  } catch (error) {
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason: `config: ${error.message}`,
        failureStep: "config",
        artifacts,
        runId,
        args,
        baseUrl,
      })
    );
  }
  if (accounts.length === 0) {
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason:
          "config: no virtual-student accounts found. Set VIRTUAL_STUDENT_ACCOUNTS (JSON) " +
          "or E2E_STUDENT_{N}_USERNAME + E2E_STUDENT_{N}_PIN for N=1..24.",
        failureStep: "config",
        artifacts,
        runId,
        args,
        baseUrl,
      })
    );
  }
  // Build a {label → account} map. The Phase D plan's studentLabel is the
  // canonical join key; the loader sets label = explicit label / username
  // / code / fallback in that order, so e.g. AAA1 will match either an
  // explicit JSON {"label":"AAA1", ...} or {"username":"AAA1", ...}.
  const accountsByLabel = new Map();
  for (const acc of accounts) {
    accountsByLabel.set(acc.label, acc);
  }
  // Allow plan entries to also resolve via username (handy when the
  // operator only set username= in JSON without an explicit label).
  for (const acc of accounts) {
    if (acc.username && !accountsByLabel.has(acc.username)) {
      accountsByLabel.set(acc.username, acc);
    }
  }
  // Verify we have credentials for every plan entry — fail-fast on
  // misconfiguration, surfacing exactly which labels are missing.
  const missingLabels = [];
  for (const planEntry of plan) {
    if (!accountsByLabel.has(planEntry.studentLabel)) {
      missingLabels.push(planEntry.studentLabel);
    }
  }
  if (missingLabels.length > 0) {
    const known = accounts.map((a) => a.label).join(", ");
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason:
          `config: no credentials loaded for ${missingLabels.length} ` +
          `plan student(s): ${missingLabels.join(", ")}. Known account ` +
          `labels: ${known}.`,
        failureStep: "config",
        artifacts,
        runId,
        args,
        baseUrl,
      })
    );
  }
  log(
    `phase-d: matched ${plan.length} plan student(s) to credentials. ` +
      `Total accounts loaded: ${accounts.length}.`
  );

  const studentAuthMode = resolveStudentAuthMode();
  log(
    `studentAuthMode=${studentAuthMode}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );

  const parentAuthMode = resolveParentAuthMode();
  log(
    `parentAuthMode=${parentAuthMode}` +
      (parentAuthMode === "token"
        ? " [DEBUG-ONLY: token mode never produces full PASS]"
        : "")
  );

  let parents = [];
  try {
    parents = loadParentAccounts();
  } catch (error) {
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason: `config: ${error.message}`,
        failureStep: "config",
        artifacts,
        runId,
        args,
        baseUrl,
        studentAuthMode,
        parentAuthMode,
      })
    );
  }
  if (parents.length === 0) {
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason:
          "config: no virtual-student parent accounts found. Set VIRTUAL_STUDENT_PARENT_ACCOUNTS " +
          "(JSON) or E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD. (Phase D requires the real QA parent.)",
        failureStep: "config",
        artifacts,
        runId,
        args,
        baseUrl,
        studentAuthMode,
        parentAuthMode,
      })
    );
  }
  let parentAccount;
  try {
    parentAccount = selectParentAccount(parents, args.parent, "");
  } catch (error) {
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason: `config: ${error.message}`,
        failureStep: "config",
        artifacts,
        runId,
        args,
        baseUrl,
        studentAuthMode,
        parentAuthMode,
      })
    );
  }
  log(`parentAccount=${JSON.stringify(fmtParentAccount(parentAccount))}`);

  try {
    await preflight(baseUrl, log);
  } catch (error) {
    return finalizePhaseD(
      buildPhaseDFailureFinalize({
        reason: error.message,
        failureStep: "preflight",
        artifacts,
        runId,
        args,
        baseUrl,
        parentAccount: fmtParentAccount(parentAccount),
        studentAuthMode,
        parentAuthMode,
      })
    );
  }

  const headed = args.headed || isHeaded();
  const browser = await launchBrowser({ headed });

  let suiteResult = null;
  let failureStep = null;
  let failureReason = null;
  try {
    failureStep = "phase-d-suite";
    suiteResult = await runPhaseDSuite({
      browser,
      baseUrl,
      plan,
      parentAccount,
      parentAuthMode,
      studentAuthMode,
      accountsByLabel,
      artifacts,
      log,
    });
    failureStep = null;
  } catch (error) {
    failureReason = error?.message || String(error);
    log(`FAILURE step=${failureStep || "unknown"}: ${failureReason}`);
  } finally {
    try {
      await browser.close();
    } catch {
      // best-effort
    }
  }

  // ---- Aggregate console errors across parent + student contexts -------
  const aggConsoleErrors = [];
  const aggConsoleNoise = [];
  const aggPageErrors = [];
  if (suiteResult) {
    for (const e of suiteResult.parentConsoleErrors || []) {
      aggConsoleErrors.push(`[parent] ${e}`);
    }
    for (const e of suiteResult.parentConsoleNoise || []) {
      aggConsoleNoise.push(`[parent] ${e}`);
    }
    for (const e of suiteResult.parentPageErrors || []) {
      aggPageErrors.push(`[parent] ${e}`);
    }
    for (const r of suiteResult.studentRecords || []) {
      const tag = r.planEntry.studentLabel;
      for (const e of r.consoleErrors || []) aggConsoleErrors.push(`[${tag}] ${e}`);
      for (const e of r.consoleNoise || []) aggConsoleNoise.push(`[${tag}] ${e}`);
      for (const e of r.pageErrors || []) aggPageErrors.push(`[${tag}] ${e}`);
    }
  }

  // ---- Dev-mode HMR-fetch console error suppression --------------------
  // Same narrow rule as Phase C: tolerate the specific
  //   [parent-report] report load failed: TypeError: Failed to fetch
  // dev-server HMR fetch interruption ONLY when the suite is otherwise
  // completely clean. Tags are stripped before matching.
  const counts = suiteResult?.summary?.counts || null;
  const parentAuthPartial = !!(
    suiteResult?.parentAuthResult && suiteResult.parentAuthResult.partial
  );
  const allStudentGatesPassed =
    !!suiteResult &&
    counts &&
    counts.fail === 0 &&
    counts.partial === 0 &&
    counts.blocked === 0 &&
    suiteResult.studentRecords.every((r) => r.tier1 && r.tier1.passed === true);
  const suppressionEligible =
    !failureReason &&
    allStudentGatesPassed &&
    !parentAuthPartial &&
    aggPageErrors.length === 0;

  let consoleErrorsRetained = aggConsoleErrors.slice();
  const consoleSuppressedDevNoise = [];
  if (suppressionEligible) {
    consoleErrorsRetained = [];
    for (const text of aggConsoleErrors) {
      const stripped = text.replace(/^\[[^\]]+\]\s*/, "");
      if (DEV_MODE_PARENT_REPORT_FETCH_RE_PHASE_D.test(stripped)) {
        consoleSuppressedDevNoise.push(text);
      } else {
        consoleErrorsRetained.push(text);
      }
    }
  }

  // ---- Suite-level status decision -------------------------------------
  let status = "fail";
  if (failureReason) {
    status = "fail";
  } else if (!suiteResult) {
    status = "fail";
  } else {
    const c = counts;
    if (c.fail > 0) {
      status = "fail";
    } else if (c.partial > 0 || parentAuthPartial || c.blocked > 0) {
      status = "partial";
    } else if (consoleErrorsRetained.length > 0 || aggPageErrors.length > 0) {
      status = "fail";
    } else if (c.pass > 0) {
      status = "pass";
    } else {
      status = "fail";
    }
  }

  finalizePhaseD({
    status,
    artifacts,
    runId,
    args,
    baseUrl,
    parentAccount: fmtParentAccount(parentAccount),
    studentAuthMode,
    parentAuthMode,
    suiteResult,
    consoleErrors: consoleErrorsRetained,
    consoleNoise: aggConsoleNoise,
    consoleSuppressedDevNoise,
    pageErrors: aggPageErrors,
    failureStep,
    failureReason,
  });
}

function buildPhaseDFailureFinalize(input) {
  return {
    status: "fail",
    artifacts: input.artifacts,
    runId: input.runId,
    args: input.args,
    baseUrl: input.baseUrl || null,
    parentAccount: input.parentAccount || null,
    studentAuthMode: input.studentAuthMode || null,
    parentAuthMode: input.parentAuthMode || null,
    suiteResult: null,
    consoleErrors: [],
    consoleNoise: [],
    consoleSuppressedDevNoise: [],
    pageErrors: [],
    failureStep: input.failureStep || "config",
    failureReason: input.reason,
  };
}

function finalizePhaseD(input) {
  const {
    status,
    artifacts,
    runId,
    args,
    baseUrl,
    parentAccount,
    studentAuthMode,
    parentAuthMode,
    suiteResult,
    consoleErrors,
    consoleNoise,
    consoleSuppressedDevNoise,
    pageErrors,
    failureStep,
    failureReason,
  } = input;

  const summary = {
    runId,
    phase: "D",
    status,
    args: {
      phase: args.phase,
      plan: args.plan || "smoke",
      students: args.students || null,
      parent: args.parent || null,
      headed: args.headed,
      baseUrl: args.baseUrl,
    },
    baseUrl: baseUrl || null,
    studentAuthMode: studentAuthMode || null,
    parentAuthMode: parentAuthMode || null,
    parentAccount: parentAccount || null,
    parent: { auth: suiteResult?.parentAuthResult || null },
    dashboardStudentCount: suiteResult?.dashboardStudentCount ?? null,
    linkedStudents: suiteResult?.linkedStudents || [],
    suite: suiteResult
      ? {
          counts: suiteResult.summary.counts,
          byGrade: suiteResult.summary.byGrade,
          students: suiteResult.studentRecords.map((r) => ({
            studentLabel: r.planEntry.studentLabel,
            username: r.planEntry.username,
            grade: r.planEntry.grade,
            scenarioId: r.planEntry.scenario.id,
            subject: r.planEntry.scenario.subject,
            profile: r.planEntry.scenario.profile,
            questionCount: r.planEntry.scenario.questionCount,
            status: r.status,
            blocker: r.blocker || null,
            stepFailed: r.stepFailed || null,
            driverError: r.driverError || null,
            earlyExitReason: r.earlyExitReason || null,
            dashboardVisible: r.dashboardVisible,
            expectedDisplayName: r.expectedDisplayName,
            studentId: r.studentId || null,
            reportUrlAtBaseline: r.reportUrlAtBaseline || null,
            reportUrlAtAfter: r.reportUrlAtAfter || null,
            studentState: r.studentState || null,
            answeredQuestionsCount: r.driverResult?.answeredQuestions?.length ?? null,
            tally: r.driverResult?.tally || null,
            tier1: r.tier1 || null,
            tier1ScenarioCounts: r.tier1ScenarioCounts || null,
            baseline: r.baseline || null,
            after: r.after || null,
            delta: r.delta || null,
            classification: r.classification || null,
          })),
          crossStudentMatrix: suiteResult.crossStudentMatrix || [],
        }
      : null,
    consoleErrors: consoleErrors || [],
    consoleNoise: consoleNoise || [],
    consoleSuppressedDevNoise: consoleSuppressedDevNoise || [],
    pageErrors: pageErrors || [],
    failureStep: failureStep || null,
    reason: failureReason || null,
    artifactsRoot: artifacts.root,
  };

  artifacts.writeJsonSummary(summary);
  artifacts.writeMarkdownSummary(buildPhaseDMarkdown(summary));
  if (status !== "pass") {
    artifacts.writeFailureRepro(buildPhaseDFailureRepro(summary));
  }

  console.log("");
  console.log("================ Virtual Student QA Phase D ================");
  console.log(`status     : ${status.toUpperCase()}`);
  console.log(`runId      : ${runId}`);
  if (suiteResult) {
    const c = summary.suite.counts;
    console.log(
      `students   : pass=${c.pass} partial=${c.partial} fail=${c.fail} blocked=${c.blocked} total=${c.total}`
    );
    console.log(`dashboard  : parent owns ${summary.dashboardStudentCount} linked student(s)`);
  }
  console.log(`plan       : ${summary.args.plan}`);
  console.log(`base URL   : ${baseUrl || "(unresolved)"}`);
  console.log(
    `student    : auth=${studentAuthMode || "n/a"}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );
  console.log(
    `parent     : auth=${parentAuthMode || "n/a"}` +
      (parentAuthMode === "token" ? " [DEBUG-ONLY: never PASS]" : "")
  );
  console.log(`artifacts  : ${artifacts.root}`);
  if (failureReason) console.log(`reason     : ${failureReason}`);
  console.log("============================================================");
}

function buildPhaseDMarkdown(s) {
  const lines = [];
  lines.push("# Virtual Student QA — Phase D (multi-student real UI)");
  lines.push("");
  lines.push(`- **runId**: \`${s.runId}\``);
  lines.push(`- **status**: \`${s.status}\``);
  lines.push(`- **plan**: \`${s.args.plan}\``);
  lines.push(`- **baseUrl**: \`${s.baseUrl || "(unresolved)"}\``);
  lines.push(
    `- **studentAuthMode**: \`${s.studentAuthMode || "n/a"}\`` +
      (s.studentAuthMode === "api" ? " — **TEMPORARY:api-shortcut**" : "")
  );
  lines.push(
    `- **parentAuthMode**: \`${s.parentAuthMode || "n/a"}\`` +
      (s.parentAuthMode === "token"
        ? " — **DEBUG-ONLY: token mode never produces full PASS**"
        : "")
  );
  if (s.parentAccount) {
    lines.push(
      `- **parentAccount**: label=\`${s.parentAccount.label}\` ` +
        `(emailMasked=\`${s.parentAccount.emailMasked}\`)`
    );
  }
  if (s.dashboardStudentCount != null) {
    lines.push(
      `- **dashboardStudentCount**: \`${s.dashboardStudentCount}\` ` +
        `(per /api/parent/list-students)`
    );
  }
  if (Array.isArray(s.linkedStudents) && s.linkedStudents.length > 0) {
    lines.push("");
    lines.push("### Parent's linked students (from /api/parent/list-students)");
    for (const ls of s.linkedStudents) {
      lines.push(
        `- \`${ls.login_username || "(no-username)"}\` → ` +
          `full_name=\`${ls.full_name || "(empty)"}\` ` +
          `grade=\`${ls.grade_level || "(n/a)"}\` ` +
          `id=\`${ls.id}\``
      );
    }
  }
  if (s.suite) {
    lines.push("");
    lines.push("## Suite roll-up");
    lines.push(`- counts: \`${JSON.stringify(s.suite.counts)}\``);
    lines.push("");
    lines.push("### Per-grade roll-up");
    for (const [grade, info] of Object.entries(s.suite.byGrade || {})) {
      lines.push(
        `- **grade ${grade}**: pass=${info.pass || 0} partial=${info.partial || 0} ` +
          `fail=${info.fail || 0} blocked=${info.blocked || 0} ` +
          `(students: ${info.students.join(", ")})`
      );
    }
    lines.push("");
    lines.push("### Cross-student bleed matrix");
    lines.push(
      "_Each tested student's parent report should reflect ONLY their own scenario activity._ " +
        "_Any non-target subject delta != 0 surfaces here as a bleed indicator._"
    );
    lines.push("");
    lines.push("| student | grade | target | expected | targetΔ | totalΔ | ownDeltaOk | bleedOk | status |");
    lines.push("|---|---|---|---|---|---|---|---|---|");
    for (const m of s.suite.crossStudentMatrix || []) {
      lines.push(
        `| ${m.studentLabel} | ${m.grade ?? "n/a"} | ${m.targetSubject} | ` +
          `${m.expectedAnswered ?? "n/a"} | ` +
          `${m.targetSubjectDelta ?? "n/a"} | ` +
          `${m.totalDelta ?? "n/a"} | ` +
          `${m.ownDeltaOk ?? "n/a"} | ` +
          `${m.bleedOk ?? "n/a"} | ` +
          `${m.finalStatus} |`
      );
    }
    const anyBleed = (s.suite.crossStudentMatrix || []).some(
      (m) => Array.isArray(m.bleedFindings) && m.bleedFindings.length > 0
    );
    if (anyBleed) {
      lines.push("");
      lines.push("#### Bleed findings (per student)");
      for (const m of s.suite.crossStudentMatrix || []) {
        if (!m.bleedFindings || m.bleedFindings.length === 0) continue;
        lines.push(`- **${m.studentLabel}**:`);
        for (const f of m.bleedFindings) {
          lines.push(
            `  - subject=\`${f.subject}\` before=\`${f.before}\` ` +
              `after=\`${f.after}\` delta=\`${f.delta}\``
          );
          if (f.note) lines.push(`    - note: ${f.note}`);
        }
      }
    } else if ((s.suite.crossStudentMatrix || []).length > 0) {
      lines.push("");
      lines.push("_No bleed findings — every tested student's report only reflected their own scenario._");
    }
    lines.push("");
    lines.push("## Per-student detail");
    for (const st of s.suite.students) {
      lines.push("");
      lines.push(
        `### \`${st.studentLabel}\` — grade=${st.grade} — ${st.subject}/${st.profile} — status=\`${st.status}\``
      );
      if (st.blocker) {
        lines.push(`- **BLOCKER**: kind=\`${st.blocker.kind}\``);
        if (st.blocker.message) lines.push(`  - ${st.blocker.message}`);
        continue;
      }
      lines.push(
        `- dashboardVisible=\`${st.dashboardVisible}\` ` +
          `expectedDisplayName=\`${st.expectedDisplayName || "(unknown)"}\` ` +
          `studentId=\`${st.studentId || "(unknown)"}\``
      );
      if (st.studentState) {
        lines.push(
          `- /api/student/me: playerName=\`${st.studentState.playerName || "(empty)"}\` ` +
            `grade=\`${st.studentState.accountGradeRaw || "(empty)"}\``
        );
      }
      if (st.driverError) {
        lines.push(`- driverError: \`${st.driverError}\``);
      }
      if (st.stepFailed) {
        lines.push(`- stepFailed: \`${st.stepFailed}\``);
      }
      if (st.earlyExitReason) {
        lines.push(`- earlyExitReason: \`${st.earlyExitReason}\``);
      }
      lines.push(`- answeredQuestions: ${st.answeredQuestionsCount ?? "n/a"}`);
      if (st.tier1) {
        lines.push(
          `- tier1: passed=\`${st.tier1.passed}\` counts=\`${JSON.stringify(st.tier1.counts)}\``
        );
        if (st.tier1.errors?.length) {
          for (const e of st.tier1.errors) lines.push(`  - tier1 error: ${e}`);
        }
      }
      if (st.baseline) {
        lines.push(
          `- baseline: total=\`${st.baseline.totalQuestions}\` ` +
            `accuracy=\`${st.baseline.overallAccuracyPct}%\` ` +
            `subject(${st.subject})=\`${st.baseline.bySubject?.[st.subject]?.questionCount ?? "n/a"}\` ` +
            `(empty=\`${st.baseline.isEmptyState}\`)`
        );
      }
      if (st.after) {
        lines.push(
          `- after:    total=\`${st.after.totalQuestions}\` ` +
            `accuracy=\`${st.after.overallAccuracyPct}%\` ` +
            `subject(${st.subject})=\`${st.after.bySubject?.[st.subject]?.questionCount ?? "n/a"}\``
        );
      }
      if (st.classification?.subjectClassification) {
        const dc = st.classification.subjectClassification;
        lines.push(
          `- ownSubjectDelta: subject=\`${dc.subject}\` before=\`${dc.before}\` ` +
            `after=\`${dc.after}\` delta=\`${dc.delta}\` expected≥\`${dc.expected}\` ` +
            `directionOk=\`${dc.directionOk}\``
        );
        lines.push(`  - note: ${dc.note}`);
      }
      if (st.classification?.bleedFindings?.length) {
        lines.push(`- bleedFindings:`);
        for (const f of st.classification.bleedFindings) {
          lines.push(
            `  - subject=\`${f.subject}\` delta=\`${f.delta}\` (note: ${f.note})`
          );
        }
      } else if (st.classification) {
        lines.push("- bleedFindings: (none) ✓");
      }
      if (st.reportUrlAtBaseline) {
        lines.push(`- reportUrlAtBaseline: ${st.reportUrlAtBaseline}`);
      }
      if (st.reportUrlAtAfter) {
        lines.push(`- reportUrlAtAfter: ${st.reportUrlAtAfter}`);
      }
    }
  }
  if (s.consoleErrors?.length > 0) {
    lines.push("");
    lines.push("## Console errors (gated)");
    for (const e of s.consoleErrors) lines.push(`- ${e}`);
  }
  if (s.consoleSuppressedDevNoise?.length > 0) {
    lines.push("");
    lines.push("## Console errors (suppressed as known dev-mode HMR noise)");
    lines.push(
      "_Same suppression rule as Phase C: only_ `[parent-report] report load failed: TypeError: Failed to fetch` " +
        "_is reclassified as non-gating, and only when every per-student gate passed, every Tier 1 passed,_ " +
        "_parent auth was non-partial, and there were no page errors. Listed here so it is never silently hidden._"
    );
    for (const e of s.consoleSuppressedDevNoise) lines.push(`- ${e}`);
  }
  if (s.consoleNoise?.length > 0) {
    lines.push("");
    lines.push("## Console noise (informational, not gated)");
    lines.push(
      "_Generic 'Failed to load resource' messages from page lifecycle._"
    );
    for (const e of s.consoleNoise) lines.push(`- ${e}`);
  }
  if (s.pageErrors?.length > 0) {
    lines.push("");
    lines.push("## Page errors");
    for (const e of s.pageErrors) lines.push(`- ${e}`);
  }
  if (s.reason) {
    lines.push("");
    lines.push("## Suite failure reason");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
  }
  lines.push("");
  lines.push("## Artifacts");
  lines.push(`- root: \`${s.artifactsRoot}\``);
  return lines.join("\n");
}

function buildPhaseDFailureRepro(s) {
  const lines = [];
  lines.push(`# Phase D failure repro — ${s.runId}`);
  lines.push("");
  lines.push(`Failed at step: \`${s.failureStep || "unknown"}\``);
  if (s.reason) {
    lines.push("Reason:");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
  }
  lines.push("");
  lines.push("## Reproduce");
  lines.push("");
  lines.push("Set the same env (values not shown):");
  lines.push("");
  lines.push("Students (12 AAA students):");
  lines.push("- `VIRTUAL_STUDENT_ACCOUNTS` JSON [{label,username,pin}, ...]");
  lines.push("- _or_ `E2E_STUDENT_{1..12}_USERNAME` + `E2E_STUDENT_{N}_PIN`");
  lines.push("- `VIRTUAL_STUDENT_STUDENT_AUTH=ui` (default) or `=api` (debug)");
  lines.push("");
  lines.push("Parent:");
  lines.push("- `E2E_PARENT_EMAIL` + `E2E_PARENT_PASSWORD`");
  lines.push(
    "- `VIRTUAL_STUDENT_PARENT_AUTH=ui` (default — only mode that can produce PASS)"
  );
  lines.push("- `PLAYWRIGHT_BASE_URL` (or rely on default `http://127.0.0.1:3001`)");
  lines.push("");
  lines.push("Then run:");
  lines.push("");
  lines.push("```");
  const planFlag = s.args.plan ? ` --plan ${s.args.plan}` : "";
  const studentsFlag = s.args.students ? ` --students ${s.args.students}` : "";
  const headedFlag = s.args.headed ? " --headed" : "";
  lines.push(
    `node scripts/virtual-student-qa/run.mjs --phase d${planFlag}${studentsFlag}${headedFlag}`
  );
  lines.push("```");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Phase D2 — scheduled daily real-learning simulator
// ---------------------------------------------------------------------------
//
// D2.1 (this slice): personas + state + planner + dry-run artifacts.
//   - Implements the `--phase d2 --dry-run` path end-to-end:
//       resolve mode/date → load state → generate plan → write plan-only
//       artifacts under reports/virtual-student-daily/<date>/ → exit 0.
//   - DOES NOT drive any UI.
//   - DOES NOT advance longitudinal state.
//
// D2.2 / D2.3 / D2.4 / D2.5 (later slices): preflight-only, fast localhost
// full run, fast Vercel full run, realtime Vercel run. Until those slices
// land, the non-dry-run paths short-circuit with a clear message pointing
// at the gated-slice contract in the plan (no UI is driven).
//
// State-advancement safety contract (plan §17): on D2.1, state.json is
// NEVER written. The dry-run artifact captures what WOULD happen, and
// the operator can inspect it with no side effects.

async function mainPhaseD2(args) {
  const repoRoot = getRepoRoot();
  const mode = resolveDailyMode(args.mode);
  const date = resolveDailyDate(args.date);
  const dryRun = resolveDailyDryRun(args.dryRun);
  const preflightOnly = resolveDailyPreflightOnly(args.preflightOnly);
  const force = resolveDailyForce(args.force);
  const stateDir = resolveStateDir();
  const dailyMaxMinutes = resolveDailyMaxMinutes();
  const pacerScale = resolveDailyPacerScale(mode);

  const dailyArtifacts = makeDailyArtifacts({ repoRoot, date });
  const phaseLogId = `phase-d2-${date}`;

  function log(line) {
    console.log(line);
    dailyArtifacts.appendLog(phaseLogId, line);
  }

  log(`runId=phase-d2-${date}`);
  log(
    `phase=D2 mode=${mode} date=${date} ` +
      `dryRun=${dryRun} preflightOnly=${preflightOnly} force=${force}`
  );
  log(`stateDir=${stateDir}`);
  log(`dailyMaxMinutes=${dailyMaxMinutes} pacerScale=${pacerScale}`);

  const inSessionPacingEnabled = resolveInSessionPacingEnabled();
  log(`inSessionPacingEnabled=${inSessionPacingEnabled}`);
  const practiceOnlyEnabled = resolvePracticeOnlyEnabled();
  log(`practiceOnlyEnabled=${practiceOnlyEnabled}`);
  log(`timestampStampingEnabled=${resolveTimestampStampingEnabled()}`);
  try {
    assertProductionPracticeOnlyGuard({
      baseUrl: resolveBaseUrl(args.baseUrl),
      dryRun,
      preflightOnly,
      practiceOnlyEnabled,
      log,
    });
    assertProductionRealisticPacingGuard({
      baseUrl: resolveBaseUrl(args.baseUrl),
      mode,
      pacerScale,
      inSessionPacingEnabled,
      dryRun,
      preflightOnly,
    });
    assertProductionTimestampStampingGuard({
      baseUrl: resolveBaseUrl(args.baseUrl),
      dryRun,
      preflightOnly,
    });
  } catch (guardError) {
    return finalizePhaseD2({
      status: "fail",
      mode: "production-guard",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath: join(stateDir, "state.json"),
      stateFresh: false,
      stateLastRunDate: null,
      stateLastRunStatus: null,
      dailyMaxMinutes,
      pacerScale,
      dailyArtifacts,
      log,
      message:
        guardError?.message ||
        "production-guard: refused unrealistic pacing configuration",
    });
  }

  // ---- Mutually exclusive mode flags ------------------------------------
  if (dryRun && preflightOnly) {
    return finalizePhaseD2({
      status: "fail",
      mode: "config",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      reason:
        "config: --dry-run and --preflight-only are mutually exclusive. " +
        "Use one or the other.",
      dailyArtifacts,
    });
  }

  // ---- Load state (read-only — never written in D2.1 / D2.2) -----------
  // The state file is loaded to surface lastRunDate / lastRunStatus in
  // the artifact for operator context. State advancement is gated on
  // a successful FULL run (D2.3+); the preflight-only and dry-run paths
  // never call saveStateAtomically().
  let stateLoad;
  try {
    stateLoad = loadState({ stateDir, personas: PERSONAS, todayIso: date });
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "state-load",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      reason: `state-load: ${error?.message || error}`,
      dailyArtifacts,
    });
  }
  const { state, filePath: stateFilePath, fresh: stateFresh, parseErrors } =
    stateLoad;
  log(
    `state: filePath=${stateFilePath} fresh=${stateFresh} ` +
      `lastRunDate=${state.lastRunDate || "(none)"} ` +
      `lastRunStatus=${state.lastRunStatus || "(none)"}`
  );
  if (parseErrors && parseErrors.length > 0) {
    for (const e of parseErrors) log(`state-warn: ${e}`);
  }

  // ---- Preflight-only branch (D2.2) ------------------------------------
  // We branch HERE — before plan generation — because preflight-only is
  // strictly a "can-the-night-succeed?" guard and does not need a plan.
  // The user's design contract: preflight-only never advances state and
  // never drives any learning UI. Failures exit 1 cleanly.
  //
  // Preflight-only intentionally bypasses the date-safety guard below:
  // a "can my creds still log into Vercel?" probe is harmless to run on
  // any date and useful when state has time-traveled (you may want to
  // confirm Vercel is still reachable before deciding how to reset).
  if (preflightOnly) {
    return runPhaseD2PreflightOnly({
      args,
      mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      dailyArtifacts,
      log,
    });
  }

  // ---- Date-safety guard (D2.6 follow-up) -------------------------------
  // Refuse to run a learning day for a target date that is BEFORE the
  // longitudinal state's lastRunDate. Each historical day's plan is
  // seeded by date and is meant to be applied on top of cumulative
  // prior state; "going back in time" would corrupt the simulation
  // (re-entering closed days, contradicting timeline.md, producing
  // plan→state inconsistencies that survive into the parent dashboard).
  //
  // Rules:
  //   - target < state.lastRunDate  → hard FAIL here, BEFORE any
  //     plan generation, browser launch, or learning. --force does
  //     NOT bypass this guard: --force is for *same-day* reruns,
  //     not for rewinding history.
  //   - target == state.lastRunDate → defer to the existing
  //     idempotency rule + --force semantics below.
  //   - target  > state.lastRunDate → allow (the normal nightly
  //     forward progression).
  //   - state is fresh (no lastRunDate) → allow (first-ever run).
  //
  // This guard is intentionally NOT applied to dry-run (read-only,
  // useful for inspecting "what plan would have been generated for
  // a past date") or preflight-only (read-only Vercel reachability +
  // login probe, not date-sensitive). Preflight-only branches above
  // and returns before reaching this point; dry-run requires the
  // explicit !dryRun gate below because the dry-run finalize lives
  // AFTER plan generation, lower in this function.
  if (!dryRun && state.lastRunDate && date < state.lastRunDate) {
    log(
      `date-guard: target=${date} < state.lastRunDate=${state.lastRunDate}; ` +
        `refusing to advance backward in time. State left untouched.`
    );
    return finalizePhaseD2({
      status: "fail",
      mode: "date-guard",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      reason:
        `date-guard: target date=${date} is BEFORE state.lastRunDate=` +
        `${state.lastRunDate}. Running an earlier date against a ` +
        `more-advanced longitudinal state would corrupt the simulation. ` +
        `--force does NOT bypass this guard. To proceed: (a) wait until ` +
        `the wall-clock date is >= ${state.lastRunDate} and let the ` +
        `nightly trigger fire normally, or (b) reset/archive the ` +
        `longitudinal state per scripts/virtual-student-qa/docs/` +
        `SCHEDULER-SETUP.md "Resetting longitudinal state".`,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
    });
  }

  // ---- Idempotency check (full-run only) -------------------------------
  // If the canonical state already has a successful (or partial) run for
  // this date AND --force was not passed, we exit early without doing
  // anything. State is NOT advanced. This keeps the nightly Task
  // Scheduler safe even if it accidentally fires twice.
  //
  // Dry-run intentionally bypasses this check: producing a plan-only
  // artifact for an already-recorded day is harmless and useful (e.g.
  // "what plan would have been generated tonight?"). The operator's
  // mental model: --dry-run is read-only.
  // Preflight-only also bypasses this — preflight is itself read-only.
  if (!dryRun && !force && isAlreadyRunForDate(state, date)) {
    return finalizePhaseD2({
      status: "already-ran-today",
      mode: "idempotency-skip",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      reason:
        `already-ran-today: state.lastRunDate=${state.lastRunDate} ` +
        `matches target date=${date}. Pass --force to rerun.`,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
    });
  }

  // ---- Generate the daily plan -----------------------------------------
  let plan;
  try {
    plan = generateDailyPlan({
      state,
      date,
      mode,
      personas: PERSONAS,
    });
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "plan-generation",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      reason: `plan-generation: ${error?.message || error}`,
      dailyArtifacts,
    });
  }
  // Always write the plan artifact — both dry-run and full-run want it.
  try {
    dailyArtifacts.writePlanArtifact(plan);
  } catch (error) {
    log(`plan-artifact: write failed: ${error?.message || error}`);
  }
  log(
    `plan: studied=${plan.summary.studied} skipped=${plan.summary.skipped} ` +
      `totalSessions=${plan.summary.totalSessions} ` +
      `totalMinutes=${plan.summary.totalMinutes} (sum across students, NOT wall-clock) ` +
      `maxStudentPlannedMinutes=${plan.summary.maxStudentPlannedMinutes ?? 0}`
  );
  for (const [label, entry] of Object.entries(plan.students || {})) {
    if (!entry?.studied) continue;
    log(
      `plan-student: ${label} plannedMinutes=${entry.intendedMinutes} ` +
        `sessions=${entry.sessions?.length ?? 0}`
    );
  }
  let maxStudentSessions = 1;
  for (const entry of Object.values(plan.students || {})) {
    if (entry?.studied) {
      maxStudentSessions = Math.max(
        maxStudentSessions,
        entry.sessions?.length || 0
      );
    }
  }
  const pacerEstimate = makeDailyPacer({
    mode,
    scale: pacerScale,
    inSessionPacingEnabled: resolveInSessionPacingEnabled(),
  });
  const expectedParallelMs = pacerEstimate.estimateParallelDayBudgetMs({
    maxStudentPlannedMinutes: plan.summary.maxStudentPlannedMinutes ?? 0,
    maxStudentSessionCount: maxStudentSessions,
    workerCount: plan.summary.studied,
  });
  log(
    `plan-parallel-estimate: expectedWallClockMin=${(expectedParallelMs / 60_000).toFixed(0)} ` +
      `(max student planned + session gaps + overhead; workers run in Promise.all) ` +
      `parallelDayEstimateMin=${plan.summary.parallelDayEstimateMinutes ?? "?"} ` +
      `budgetOutliers=${plan.summary.budgetOutlierCount ?? 0}`
  );

  try {
    assertPlannerBudgetGuard({
      plan,
      mode,
      pacerScale,
      dryRun,
      preflightOnly,
      log,
    });
  } catch (guardError) {
    return finalizePhaseD2({
      status: "fail",
      mode: "planner-budget-guard",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath: join(stateDir, "state.json"),
      stateFresh: false,
      stateLastRunDate: null,
      stateLastRunStatus: null,
      dailyMaxMinutes,
      pacerScale,
      dailyArtifacts,
      plan,
      reason: guardError?.message || String(guardError),
    });
  }

  // ---- Dry-run path: D2.1 fully implemented ----------------------------
  if (dryRun) {
    return finalizePhaseD2({
      status: "pass",
      mode: "dry-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      dailyMaxMinutes,
      pacerScale,
      plan,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
    });
  }

  // ---- Full-run path: D2.3 (fast localhost full run) -------------------
  return runPhaseD2FullRun({
    args,
    mode,
    date,
    dryRun,
    preflightOnly,
    force,
    stateDir,
    stateFilePath,
    stateFresh,
    state,
    plan,
    dailyMaxMinutes,
    pacerScale,
    dailyArtifacts,
    log,
  });
}

/**
 * D2.3 — fast-mode full daily run.
 *
 * Order of operations:
 *   1. Resolve baseUrl + accounts + parents (same loaders as preflight).
 *   2. HTTP availability probe.
 *   3. Launch one Playwright browser shared by preflight + orchestrator.
 *   4. Run preflight (parent UI login + list-students + per-student UI
 *      logins). FAIL here returns immediately, state untouched.
 *   5. Run runPhaseD2Suite (multi-session per studied student).
 *   6. Gate: orchestrator returns stateAdvanceShouldRun. PASS / PARTIAL
 *      → invoke state-advance writer (applyDailyResults +
 *      saveStateAtomically + appendTimelineRow + state-snapshot.json).
 *      FAIL → state stays at yesterday's value.
 *   7. Finalize artifacts and exit.
 *
 * State-advance contract:
 *   The longitudinal state.json is mutated EXACTLY ONCE inside this
 *   function, only after the orchestrator returned a non-FAIL verdict.
 *   On any earlier failure path we return a fail finalize() without
 *   touching state. This is the implementation of plan §17 "state
 *   advancement only after all required checks complete".
 */
async function runPhaseD2FullRun({
  args,
  mode,
  date,
  dryRun,
  preflightOnly,
  force,
  stateDir,
  stateFilePath,
  stateFresh,
  state,
  plan,
  dailyMaxMinutes,
  pacerScale,
  dailyArtifacts,
  log,
}) {
  const baseUrl = resolveBaseUrl(args.baseUrl);
  log(`fullrun: baseUrl=${baseUrl}`);

  // ---- Account + parent loaders (same as preflight) -------------------
  let accounts;
  try {
    accounts = loadAccounts();
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "full-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      plan,
      dailyMaxMinutes,
      pacerScale,
      reason: `config: ${error?.message || error}`,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      baseUrl,
    });
  }

  const accountsByLabel = new Map();
  for (const acc of accounts) accountsByLabel.set(acc.label, acc);
  for (const acc of accounts) {
    if (acc.username && !accountsByLabel.has(acc.username)) {
      accountsByLabel.set(acc.username, acc);
    }
  }
  const expectedStudentLabels = PERSONA_LABELS.slice();
  const missingCreds = expectedStudentLabels.filter(
    (label) => !accountsByLabel.has(label)
  );
  if (missingCreds.length > 0) {
    return finalizePhaseD2({
      status: "fail",
      mode: "full-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      plan,
      dailyMaxMinutes,
      pacerScale,
      reason:
        `config: no credentials loaded for ${missingCreds.length} ` +
        `expected AAA student(s): ${missingCreds.join(", ")}.`,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      baseUrl,
    });
  }

  let parents = [];
  try {
    parents = loadParentAccounts();
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "full-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      plan,
      dailyMaxMinutes,
      pacerScale,
      reason: `config: ${error?.message || error}`,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      baseUrl,
    });
  }
  if (parents.length === 0) {
    return finalizePhaseD2({
      status: "fail",
      mode: "full-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      plan,
      dailyMaxMinutes,
      pacerScale,
      reason:
        "config: no virtual-student parent accounts found. Set " +
        "VIRTUAL_STUDENT_PARENT_ACCOUNTS or E2E_PARENT_EMAIL + E2E_PARENT_PASSWORD.",
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      baseUrl,
    });
  }
  let parentAccount;
  try {
    parentAccount = selectParentAccount(parents, args.parent, "");
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "full-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      plan,
      dailyMaxMinutes,
      pacerScale,
      reason: `config: ${error?.message || error}`,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      baseUrl,
    });
  }

  const studentAuthMode = resolveStudentAuthMode();
  const parentAuthMode = resolveParentAuthMode();
  log(
    `fullrun: studentAuthMode=${studentAuthMode}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );
  log(
    `fullrun: parentAuthMode=${parentAuthMode}` +
      (parentAuthMode === "token" ? " [DEBUG-ONLY: token never PASS]" : "")
  );

  // ---- Smoke filter parsing -------------------------------------------
  let studentLabelsFilter = null;
  if (args.students) {
    studentLabelsFilter = String(args.students)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    log(
      `fullrun: --students filter active: ${studentLabelsFilter.join(", ")}`
    );
  }

  // ---- HTTP preflight --------------------------------------------------
  try {
    await preflight(baseUrl, log);
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "full-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      plan,
      dailyMaxMinutes,
      pacerScale,
      reason: `http-preflight: ${error?.message || error}`,
      dailyArtifacts,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      baseUrl,
      parentAuthMode,
      studentAuthMode,
    });
  }

  // ---- Browser launch (shared by preflight + orchestrator) ------------
  const headed = args.headed || isHeaded();
  const browser = await launchBrowser({ headed });
  let preflightReport = null;
  let suiteResult = null;
  let stateWriteInfo = null;
  let stateWriteError = null;
  let suiteRuntimeError = null;
  try {
    // ---- 1. Preflight inside the shared browser ----------------------
    await ensureQaParentPasswordSynced({ log });
    log(
      "fullrun: running preflight (parent UI + list-students + 12 student logins)"
    );
    preflightReport = await runDailyPreflight({
      browser,
      baseUrl,
      parentAccount,
      parentAuthMode,
      studentAuthMode,
      expectedStudentLabels,
      accountsByLabel,
      log,
    });
    if (!preflightReport.passed) {
      log(
        `fullrun: preflight FAILED — ${preflightReport.errors.length} ` +
          `check(s); ${preflightReport.errors.slice(0, 3).join("; ")}`
      );
      return finalizePhaseD2({
        status: "fail",
        mode: "full-run",
        args,
        mode_: mode,
        date,
        dryRun,
        preflightOnly,
        force,
        stateDir,
        stateFilePath,
        stateFresh,
        plan,
        dailyMaxMinutes,
        pacerScale,
        dailyArtifacts,
        baseUrl,
        parentAuthMode,
        studentAuthMode,
        preflightReport,
        expectedStudentLabels,
        stateLastRunDate: state.lastRunDate,
        stateLastRunStatus: state.lastRunStatus,
        reason:
          `preflight: ${preflightReport.errors.length} check(s) failed — ` +
          preflightReport.errors.slice(0, 3).join("; "),
        suiteResult: null,
      });
    }

    // ---- 2. Pacer ----------------------------------------------------
    const pacer = makeDailyPacer({
      mode,
      scale: pacerScale,
      inSessionPacingEnabled: resolveInSessionPacingEnabled(),
      log: (line) => log(line),
    });
    log(
      `fullrun: pacer mode=${pacer.mode} scale=${pacer.scale} ` +
        `(fast=zero-pause; realtime=human-pause)`
    );

    // ---- 3. Suite ----------------------------------------------------
    suiteResult = await runPhaseD2Suite({
      browser,
      baseUrl,
      plan,
      parentAccount,
      parentAuthMode,
      studentAuthMode,
      accountsByLabel,
      artifacts: dailyArtifacts,
      log,
      pacer,
      studentLabelsFilter,
    });
    log(
      `fullrun: suite verdict=${suiteResult.verdict} ` +
        `pass=${suiteResult.summary.counts.pass} ` +
        `partial=${suiteResult.summary.counts.partial} ` +
        `fail=${suiteResult.summary.counts.fail} ` +
        `blocked=${suiteResult.summary.counts.blocked} ` +
        `studied=${suiteResult.summary.studiedCount} ` +
        `stateAdvanceShouldRun=${suiteResult.stateAdvanceShouldRun}`
    );
  } catch (error) {
    suiteRuntimeError = String(error?.message || error);
    log(`fullrun: suite-runtime fatal — ${suiteRuntimeError}`);
  } finally {
    try {
      await browser.close();
    } catch {
      // best-effort cleanup
    }
  }

  if (suiteRuntimeError) {
    return finalizePhaseD2({
      status: "fail",
      mode: "full-run",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      plan,
      dailyMaxMinutes,
      pacerScale,
      dailyArtifacts,
      baseUrl,
      parentAuthMode,
      studentAuthMode,
      preflightReport,
      expectedStudentLabels,
      stateLastRunDate: state.lastRunDate,
      stateLastRunStatus: state.lastRunStatus,
      reason: `suite-runtime: ${suiteRuntimeError}`,
      suiteResult: null,
    });
  }

  // ---- 3b. Daily DB sanity guard (post-stamp verification) ------------
  let dbSanity = null;
  if (suiteResult && suiteResult.verdict !== "fail") {
    dbSanity = await assertDailyDbSanity({
      simDate: date,
      suiteResult,
      log,
    });
    if (!dbSanity.passed && !dbSanity.skipped) {
      log(
        `db-sanity-guard: FAIL — blocking state-advance (${dbSanity.errors.length} issue(s))`
      );
      return finalizePhaseD2({
        status: "fail",
        mode: "db-sanity-guard",
        args,
        mode_: mode,
        date,
        dryRun,
        preflightOnly,
        force,
        stateDir,
        stateFilePath,
        stateFresh,
        plan,
        dailyMaxMinutes,
        pacerScale,
        dailyArtifacts,
        baseUrl,
        parentAuthMode,
        studentAuthMode,
        preflightReport,
        expectedStudentLabels,
        stateLastRunDate: state.lastRunDate,
        stateLastRunStatus: state.lastRunStatus,
        reason: dbSanity.errors.join("; "),
        suiteResult,
        dbSanity,
      });
    }
    if (dbSanity.passed) {
      log(
        `db-sanity-guard: PASS simDate=${date} sessions=${dbSanity.metrics.sessionsFound} ` +
          `answers=${dbSanity.metrics.answersFound} duration_total=${dbSanity.metrics.durationSecondsTotal}s`
      );
    }
  }

  // ---- 4. State-advance gate ------------------------------------------
  // The orchestrator returns stateAdvanceShouldRun=false on any FAIL.
  // We DEFENSIVELY also re-check verdict !== 'fail' here so a future
  // refactor that forgets to set the flag still cannot torch state.
  const advance =
    suiteResult.verdict !== "fail" && suiteResult.stateAdvanceShouldRun;
  if (advance) {
    try {
      const applied = applyDailyResults({
        state,
        date,
        mode,
        verdict: suiteResult.verdict,
        studentRecords: suiteResult.records,
      });
      const writeInfo = saveStateAtomically({ stateDir, state });
      stateWriteInfo = {
        ...writeInfo,
        rowsAppended: applied.studentTimelineRows.length,
        updatedStudents: applied.updatedStudents,
      };
      for (const row of applied.studentTimelineRows) {
        try {
          appendTimelineRow({ stateDir, row });
        } catch (timelineError) {
          // Timeline append is informative-only; do NOT roll back the
          // state.json save for a timeline.md hiccup.
          log(
            `state-advance: timeline append failed for ${row.student} — ${
              timelineError?.message || timelineError
            }`
          );
        }
      }
      try {
        dailyArtifacts.writeStateSnapshot(state);
      } catch (snapshotError) {
        log(
          `state-advance: state-snapshot artifact write failed — ${
            snapshotError?.message || snapshotError
          }`
        );
      }
      log(
        `state-advance: state.json updated atomically (rowsAppended=` +
          `${applied.studentTimelineRows.length}, ` +
          `updatedStudents=[${applied.updatedStudents.join(", ")}], ` +
          `lastRunStatus=${state.lastRunStatus})`
      );
    } catch (error) {
      stateWriteError = String(error?.message || error);
      log(`state-advance: FAILED — ${stateWriteError}`);
    }
  } else {
    log(
      `state-advance: SKIPPED (verdict=${suiteResult.verdict}, ` +
        `stateAdvanceShouldRun=${suiteResult.stateAdvanceShouldRun}). ` +
        `state.json left at lastRunDate=${state.lastRunDate || "(none)"}.`
    );
  }

  // ---- 5. Finalize ----------------------------------------------------
  return finalizePhaseD2({
    status:
      suiteResult.verdict === "fail"
        ? "fail"
        : suiteResult.verdict === "partial"
          ? "partial"
          : "pass",
    mode: "full-run",
    args,
    mode_: mode,
    date,
    dryRun,
    preflightOnly,
    force,
    stateDir,
    stateFilePath,
    stateFresh,
    plan,
    dailyMaxMinutes,
    pacerScale,
    dailyArtifacts,
    baseUrl,
    parentAuthMode,
    studentAuthMode,
    preflightReport,
    expectedStudentLabels,
    stateLastRunDate: state.lastRunDate,
    stateLastRunStatus: state.lastRunStatus,
    suiteResult,
    stateWriteInfo,
    stateWriteError,
    studentLabelsFilter,
    reason:
      suiteResult.verdict === "fail"
        ? suiteResult.error ||
          `suite: ${suiteResult.summary.counts.fail} student(s) failed`
        : null,
  });
}

/**
 * D2.2 preflight-only path.
 *
 * Lightweight runtime guard:
 *   - Loads accounts + parent + base URL.
 *   - Performs a quick HTTP availability check on the base URL.
 *   - Runs runStandaloneDailyPreflight() (the four checks from plan §2:
 *     parent UI login, list-students returns ≥12 AAA labels with
 *     metadata, 12 student UI logins).
 *   - Writes the preflight artifact (run-summary.json/.md including the
 *     preflight report and a failure-repro.md on FAIL).
 *   - Exit 0 on PASS, 1 on FAIL.
 *   - State is NEVER advanced — saveStateAtomically() is not called.
 *
 * Reuses authenticateParent / authenticateStudent / list-students fetch
 * pattern from existing A-D code; no new deep-QA logic is introduced.
 */
async function runPhaseD2PreflightOnly({
  args,
  mode,
  date,
  dryRun,
  preflightOnly,
  force,
  stateDir,
  stateFilePath,
  stateFresh,
  stateLastRunDate,
  stateLastRunStatus,
  dailyArtifacts,
  log,
}) {
  // ---- Resolve target URL + the four-check input set -------------------
  const baseUrl = resolveBaseUrl(args.baseUrl);
  log(`preflight: baseUrl=${baseUrl}`);

  let accounts;
  try {
    accounts = loadAccounts();
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason: `config: ${error?.message || error}`,
      dailyArtifacts,
    });
  }
  if (accounts.length === 0) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason:
        "config: no virtual-student accounts found. Set " +
        "VIRTUAL_STUDENT_ACCOUNTS (JSON) or " +
        "E2E_STUDENT_{1..12}_USERNAME + E2E_STUDENT_{N}_PIN.",
      dailyArtifacts,
    });
  }

  // Build {label → account} the same way Phase D's mainPhaseD does, so
  // operators can use either explicit JSON labels (AAA1..AAA12) or
  // username-based loaders.
  const accountsByLabel = new Map();
  for (const acc of accounts) accountsByLabel.set(acc.label, acc);
  for (const acc of accounts) {
    if (acc.username && !accountsByLabel.has(acc.username)) {
      accountsByLabel.set(acc.username, acc);
    }
  }
  const expectedStudentLabels = PERSONA_LABELS.slice(); // AAA1..AAA12
  const missingCreds = expectedStudentLabels.filter(
    (label) => !accountsByLabel.has(label)
  );
  if (missingCreds.length > 0) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason:
        `config: no credentials loaded for ${missingCreds.length} ` +
        `expected AAA student(s): ${missingCreds.join(", ")}. Loaded ` +
        `account labels: ${accounts.map((a) => a.label).join(", ")}.`,
      dailyArtifacts,
    });
  }

  let parents = [];
  try {
    parents = loadParentAccounts();
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason: `config: ${error?.message || error}`,
      dailyArtifacts,
    });
  }
  if (parents.length === 0) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason:
        "config: no virtual-student parent accounts found. Set " +
        "VIRTUAL_STUDENT_PARENT_ACCOUNTS or E2E_PARENT_EMAIL + " +
        "E2E_PARENT_PASSWORD.",
      dailyArtifacts,
    });
  }
  let parentAccount;
  try {
    parentAccount = selectParentAccount(parents, args.parent, "");
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason: `config: ${error?.message || error}`,
      dailyArtifacts,
    });
  }

  const studentAuthMode = resolveStudentAuthMode();
  const parentAuthMode = resolveParentAuthMode();
  log(
    `preflight: studentAuthMode=${studentAuthMode}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );
  log(
    `preflight: parentAuthMode=${parentAuthMode}` +
      (parentAuthMode === "token" ? " [DEBUG-ONLY: token never PASS]" : "")
  );

  // ---- HTTP availability check ----------------------------------------
  // Reuses the existing top-of-file preflight() helper that A-D phases
  // use to confirm the server is up before launching a browser.
  try {
    await preflight(baseUrl, log);
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason: `http-preflight: ${error?.message || error}`,
      dailyArtifacts,
    });
  }

  // ---- Run the four lightweight UI checks ------------------------------
  const headed = args.headed || isHeaded();
  let preflightReport;
  try {
    await ensureQaParentPasswordSynced({ log });
    preflightReport = await runStandaloneDailyPreflight({
      baseUrl,
      parentAccount,
      parentAuthMode,
      studentAuthMode,
      expectedStudentLabels,
      accountsByLabel,
      headed,
      log,
    });
  } catch (error) {
    return finalizePhaseD2({
      status: "fail",
      mode: "preflight-only",
      args,
      mode_: mode,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      stateLastRunDate,
      stateLastRunStatus,
      reason: `preflight-runtime: ${error?.message || error}`,
      dailyArtifacts,
    });
  }

  log(
    `preflight: overall=${preflightReport.passed ? "PASS" : "FAIL"} ` +
      `parent=${preflightReport.parent?.ok} ` +
      `list-students=${preflightReport.listStudents?.ok} ` +
      `students=${preflightReport.students.filter((s) => s.ok).length}/` +
      `${preflightReport.students.length} ` +
      `(${preflightReport.durationMs}ms)`
  );

  return finalizePhaseD2({
    status: preflightReport.passed ? "pass" : "fail",
    mode: "preflight-only",
    args,
    mode_: mode,
    date,
    dryRun,
    preflightOnly,
    force,
    stateDir,
    stateFilePath,
    stateFresh,
    stateLastRunDate,
    stateLastRunStatus,
    dailyArtifacts,
    baseUrl,
    parentAuthMode,
    studentAuthMode,
    preflightReport,
    expectedStudentLabels,
    reason: preflightReport.passed
      ? null
      : `preflight: ${preflightReport.errors.length} check(s) failed — ${preflightReport.errors.slice(0, 3).join("; ")}`,
  });
}

function finalizePhaseD2(input) {
  const {
    status,
    mode: stage,
    args,
    mode_,
    date,
    dryRun,
    preflightOnly,
    force,
    stateDir,
    stateFilePath = null,
    stateFresh = false,
    dailyMaxMinutes = null,
    pacerScale = null,
    plan = null,
    dailyArtifacts,
    reason = null,
    stateLastRunDate = null,
    stateLastRunStatus = null,
    baseUrl = null,
    parentAuthMode = null,
    studentAuthMode = null,
    preflightReport = null,
    expectedStudentLabels = null,
    suiteResult = null,
    stateWriteInfo = null,
    stateWriteError = null,
    studentLabelsFilter = null,
  } = input;

  const sliceForStage =
    stage === "full-run"
      ? sliceForFullRunStage({ baseUrl, mode: mode_ })
      : stage === "preflight-only"
        ? "D2.2"
        : stage === "date-guard"
          ? "D2.6"
          : "D2.1";

  const summary = {
    runId: `phase-d2-${date}`,
    phase: "D2",
    slice: sliceForStage,
    status,
    stage,
    args: {
      phase: args.phase,
      mode: args.mode || null,
      date: args.date || null,
      dryRun: !!args.dryRun,
      preflightOnly: !!args.preflightOnly,
      force: !!args.force,
      headed: !!args.headed,
      baseUrl: args.baseUrl || null,
    },
    resolved: {
      mode: mode_,
      date,
      dryRun,
      preflightOnly,
      force,
      stateDir,
      stateFilePath,
      stateFresh,
      dailyMaxMinutes,
      pacerScale,
      stateLastRunDate,
      stateLastRunStatus,
      baseUrl: baseUrl || null,
      parentAuthMode,
      studentAuthMode,
    },
    plan: plan
      ? {
          date: plan.date,
          mode: plan.mode,
          generatedAt: plan.generatedAt,
          summary: plan.summary,
          students: plan.students,
        }
      : null,
    preflight: preflightReport || null,
    expectedStudentLabels: expectedStudentLabels || null,
    suite: suiteResult ? summarizeSuiteForArtifact(suiteResult) : null,
    stateAdvance: suiteResult
      ? {
          attempted: suiteResult.verdict !== "fail",
          shouldRun: !!suiteResult.stateAdvanceShouldRun,
          succeeded: !!stateWriteInfo && !stateWriteError,
          error: stateWriteError || null,
          info: stateWriteInfo || null,
        }
      : null,
    studentLabelsFilter: studentLabelsFilter || null,
    reason: reason || null,
    artifactsRoot: dailyArtifacts.root,
    timestampUtc: new Date().toISOString(),
  };

  try {
    dailyArtifacts.writeJsonSummary(summary);
  } catch (error) {
    console.error(
      `phase-d2: failed to write run-summary.json: ${error?.message || error}`
    );
  }
  try {
    dailyArtifacts.writeMarkdownSummary(buildPhaseD2Markdown(summary));
  } catch (error) {
    console.error(
      `phase-d2: failed to write run-summary.md: ${error?.message || error}`
    );
  }
  if (status !== "pass" && status !== "already-ran-today") {
    try {
      dailyArtifacts.writeFailureRepro(buildPhaseD2FailureRepro(summary));
    } catch {
      // best-effort
    }
  }

  console.log("");
  console.log("================ Virtual Student QA Phase D2 ===============");
  console.log(`status     : ${String(status).toUpperCase()}`);
  console.log(`slice      : ${summary.slice}`);
  console.log(`stage      : ${stage}`);
  console.log(`date       : ${date}`);
  console.log(`mode       : ${mode_}`);
  console.log(`dry-run    : ${dryRun}`);
  console.log(`preflight  : ${preflightOnly}`);
  console.log(`force      : ${force}`);
  console.log(`stateDir   : ${stateDir}`);
  console.log(
    `state file : ${stateFilePath || "(unresolved)"} ` +
      `(fresh=${stateFresh})`
  );
  if (plan) {
    console.log(
      `plan       : studied=${plan.summary.studied} ` +
        `skipped=${plan.summary.skipped} ` +
        `totalSessions=${plan.summary.totalSessions} ` +
        `totalMinutes=${plan.summary.totalMinutes}`
    );
  }
  if (preflightReport) {
    const okStudents = preflightReport.students.filter((s) => s.ok).length;
    const totalStudents = preflightReport.students.length;
    console.log(
      `preflight  : parent=${preflightReport.parent?.ok ? "OK" : "FAIL"} ` +
        `list=${preflightReport.listStudents?.ok ? "OK" : "FAIL"} ` +
        `students=${okStudents}/${totalStudents} ` +
        `(${preflightReport.durationMs}ms)`
    );
  }
  if (suiteResult) {
    const c = suiteResult.summary.counts;
    console.log(
      `suite      : verdict=${suiteResult.verdict} ` +
        `pass=${c.pass} partial=${c.partial} fail=${c.fail} blocked=${c.blocked} ` +
        `studied=${suiteResult.summary.studiedCount} ` +
        `(${suiteResult.durationMs}ms)`
    );
    const stateLine = stateWriteError
      ? `state-write FAILED: ${stateWriteError}`
      : stateWriteInfo
        ? `advanced (rows=${stateWriteInfo.rowsAppended || 0}, ` +
          `students=[${(stateWriteInfo.updatedStudents || []).join(", ")}])`
        : suiteResult.verdict === "fail"
          ? "skipped (verdict=fail)"
          : "skipped";
    console.log(`state      : ${stateLine}`);
    if (studentLabelsFilter && studentLabelsFilter.length > 0) {
      console.log(
        `filter     : --students=${studentLabelsFilter.join(",")} (smoke subset)`
      );
    }
  }
  console.log(`artifacts  : ${dailyArtifacts.root}`);
  if (reason) console.log(`reason     : ${reason}`);
  console.log("============================================================");

  // Exit-code policy:
  //   - 'pass'                    : exit 0
  //   - 'partial' (D2.3 full-run): exit 0 — state still advanced, day
  //                                   counted; treat like a "yellow"
  //                                   green-light for the scheduler.
  //   - 'already-ran-today'       : exit 0 (idempotency-skip is not an error)
  //   - 'not-yet-implemented'     : exit 0 (legacy stub status; future-
  //                                   proofing in case any path still
  //                                   returns it)
  //   - 'fail'                    : exit 1
  if (
    status === "pass" ||
    status === "partial" ||
    status === "already-ran-today" ||
    status === "not-yet-implemented"
  ) {
    process.exit(0);
  }
  process.exit(1);
}

/**
 * Map a full-run invocation (stage='full-run') to the D2 milestone
 * slice that was validated, so the operator's audit trail in
 * run-summary.json / run-summary.md is self-describing without
 * re-reading the resolved.baseUrl + resolved.mode pair every time:
 *
 *   - localhost / 127.0.0.1, mode=fast       → D2.3
 *   - any other host, mode=fast              → D2.4 (e.g. Vercel)
 *   - any host, mode=realtime                → D2.5
 *
 * This is a labeling helper only; the actual code path is the same
 * for D2.3 / D2.4 / D2.5 (the orchestrator is mode- and target-
 * agnostic). Future code changes that introduce new modes should
 * extend this mapping rather than the orchestrator.
 */
function sliceForFullRunStage({ baseUrl, mode }) {
  const m = String(mode || "").toLowerCase();
  const isLocal =
    !baseUrl ||
    /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(
      String(baseUrl)
    );
  if (m === "realtime") return "D2.5";
  return isLocal ? "D2.3" : "D2.4";
}

/**
 * Build the JSON-friendly suite summary for run-summary.json. We
 * deliberately strip Playwright objects + ApiResponse handles and keep
 * only structured data (labels, status, deltas, network counts). The
 * full per-student snapshot/screenshot evidence already lives on disk
 * inside dailyArtifacts.
 */
function summarizeSuiteForArtifact(suiteResult) {
  const safe = {
    verdict: suiteResult.verdict,
    durationMs: suiteResult.durationMs,
    empty: !!suiteResult.empty,
    summary: suiteResult.summary,
    parentAuth: suiteResult.parentAuthResult
      ? {
          mode: suiteResult.parentAuthResult.mode || null,
          pass: !!suiteResult.parentAuthResult.pass,
          partial: !!suiteResult.parentAuthResult.partial,
          alreadyAuthenticated:
            !!suiteResult.parentAuthResult.alreadyAuthenticated,
        }
      : null,
    dashboardStudentCount: suiteResult.dashboardStudentCount ?? null,
    crossStudentMatrix: suiteResult.crossStudentMatrix || [],
    parentConsole: {
      errors: (suiteResult.parentConsole?.errors || []).slice(0, 20),
      noiseCount: suiteResult.parentConsole?.noise?.length || 0,
      pageErrors: (suiteResult.parentConsole?.pageErrors || []).slice(0, 20),
    },
    students: (suiteResult.records || []).map((r) => ({
      label: r.label,
      grade: r.grade,
      personaKind: r.personaKind,
      defaultProfile: r.defaultProfile,
      intendedMinutes: r.intendedMinutes,
      status: r.status,
      blocker: r.blocker,
      stepFailed: r.stepFailed,
      driverError: r.driverError,
      dashboardVisible: r.dashboardVisible,
      expectedDisplayName: r.expectedDisplayName,
      reportUrlAtBaseline: r.reportUrlAtBaseline,
      reportUrlAtAfter: r.reportUrlAtAfter,
      sessions: (r.sessionResults || []).map((s) => ({
        index: s.index,
        subject: s.subject,
        profile: s.profile,
        topic: s.topic,
        intendedQuestionCount: s.intendedQuestionCount,
        answeredCount: s.answeredCount,
        correctIntended: s.correctIntended,
        correctObserved: s.correctObserved,
        completed: !!s.completed,
        earlyExitReason: s.earlyExitReason,
        error: s.error,
        tier1Counts: s.tier1Counts,
        tier1Passed: s.tier1?.passed ?? null,
        durationMs:
          s.endedAt && s.startedAt ? s.endedAt - s.startedAt : null,
      })),
      delta: r.delta || null,
      classification: r.classification || null,
      runWindow: r.runWindow || null,
      tier1: r.tier1 || null,
      consoleErrors: (r.consoleErrors || []).slice(0, 20),
      consoleNoiseCount: (r.consoleNoise || []).length,
      pageErrors: (r.pageErrors || []).slice(0, 20),
      earlyExitReasons: r.earlyExitReasons || [],
    })),
    skipped: (suiteResult.adapted?.skipped || []).map((e) => ({
      label: e.label,
      reason: e.reason,
      grade: e.grade,
      personaKind: e.personaKind,
      configBlocker: !!e.configBlocker,
    })),
    filteredOut: (suiteResult.adapted?.filteredOut || []).map((e) => ({
      label: e.label,
      reason: e.reason,
      grade: e.grade,
      personaKind: e.personaKind,
    })),
  };
  return safe;
}

function buildPhaseD2Markdown(s) {
  const lines = [];
  lines.push("# Virtual Student QA — Phase D2 (daily simulator)");
  lines.push("");
  lines.push(`- **runId**: \`${s.runId}\``);
  lines.push(`- **slice**: \`${s.slice}\``);
  lines.push(`- **status**: \`${s.status}\``);
  lines.push(`- **stage**: \`${s.stage}\``);
  lines.push(`- **date**: \`${s.resolved.date}\``);
  lines.push(`- **mode**: \`${s.resolved.mode}\``);
  lines.push(
    `- **dry-run / preflight-only / force**: \`${s.resolved.dryRun}\` / ` +
      `\`${s.resolved.preflightOnly}\` / \`${s.resolved.force}\``
  );
  if (s.resolved.baseUrl) {
    lines.push(`- **baseUrl**: \`${s.resolved.baseUrl}\``);
  }
  if (s.resolved.parentAuthMode) {
    lines.push(
      `- **parentAuthMode**: \`${s.resolved.parentAuthMode}\`` +
        (s.resolved.parentAuthMode === "token"
          ? " — **DEBUG-ONLY: token mode never produces full PASS**"
          : "")
    );
  }
  if (s.resolved.studentAuthMode) {
    lines.push(
      `- **studentAuthMode**: \`${s.resolved.studentAuthMode}\`` +
        (s.resolved.studentAuthMode === "api"
          ? " — **TEMPORARY:api-shortcut**"
          : "")
    );
  }
  lines.push(`- **stateDir**: \`${s.resolved.stateDir}\``);
  lines.push(
    `- **stateFile**: \`${s.resolved.stateFilePath || "(unresolved)"}\`` +
      ` (fresh=\`${s.resolved.stateFresh}\`)`
  );
  if (s.resolved.stateLastRunDate) {
    lines.push(
      `- **lastRunDate**: \`${s.resolved.stateLastRunDate}\` ` +
        `(lastRunStatus=\`${s.resolved.stateLastRunStatus || "(none)"}\`)`
    );
  }
  lines.push(
    `- **dailyMaxMinutes**: \`${s.resolved.dailyMaxMinutes ?? "n/a"}\``
  );
  lines.push(`- **pacerScale**: \`${s.resolved.pacerScale ?? "n/a"}\``);
  if (s.reason) {
    lines.push("");
    lines.push("## Note");
    lines.push("");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
  }
  if (s.preflight) {
    lines.push("");
    lines.push(
      renderPreflightMarkdown(s.preflight, {
        expectedStudentLabels: s.expectedStudentLabels,
      })
    );
  }
  if (s.suite) {
    lines.push("");
    lines.push(renderSuiteMarkdown(s.suite, s.stateAdvance));
  }
  if (s.plan) {
    lines.push("");
    // Reuse the planner's own renderer for consistency with plan.json.
    const planMd = renderPlanMarkdown(
      {
        date: s.plan.date,
        mode: s.plan.mode,
        generatedAt: s.plan.generatedAt,
        summary: s.plan.summary,
        students: s.plan.students,
      },
      {
        stateMeta: {
          fresh: s.resolved.stateFresh,
          filePath: s.resolved.stateFilePath,
          lastRunDate: s.resolved.stateLastRunDate,
          lastRunStatus: s.resolved.stateLastRunStatus,
        },
      }
    );
    lines.push(planMd);
  }
  lines.push("");
  lines.push("## Artifacts");
  lines.push(`- root: \`${s.artifactsRoot}\``);
  lines.push(`- run-summary.json`);
  lines.push(`- run-summary.md (this file)`);
  if (s.plan) lines.push(`- plan.json (planner output)`);
  if (s.status !== "pass" && s.status !== "already-ran-today") {
    lines.push(`- failure-repro.md`);
  }
  lines.push("");
  lines.push("## Safety guarantees");
  lines.push("");
  if (s.stage === "full-run") {
    if (s.stateAdvance && s.stateAdvance.succeeded) {
      lines.push(
        "- The longitudinal state.json was advanced ATOMICALLY (write-to-tmp " +
          "→ rename, plus state.json.bak rotation). This was the LAST step " +
          "and only ran because every required check (preflight + parent " +
          "auth + parent dashboard + per-student baselines + per-student " +
          "sessions + per-student afters + own-subject delta + cross-subject " +
          "bleed) completed successfully or partial-only."
      );
    } else if (s.suite && s.suite.verdict === "fail") {
      lines.push(
        "- The longitudinal state.json was NOT advanced. " +
          "`state.json` and `state.json.bak` are at yesterday's value. " +
          "Inspect failure-repro.md and rerun this date with --force after " +
          "fixing the underlying issue."
      );
    } else {
      lines.push(
        "- The longitudinal state.json advance was attempted but did not " +
          "fully succeed; see `stateAdvance.error` in run-summary.json."
      );
    }
  } else {
    lines.push(
      "- This run did NOT advance the longitudinal state. " +
        "`state.json` and `state.json.bak` (in the state dir above) are unchanged."
    );
  }
  if (s.stage === "preflight-only") {
    lines.push(
      "- This run drove ONLY the preflight UI checks (parent UI login + " +
        "list-students fetch + 12 sequential student UI logins). It did " +
        "NOT navigate to /learning/*, did NOT call any /api/learning/* " +
        "endpoint, and did NOT generate or persist any learning activity."
    );
  } else if (s.stage === "full-run") {
    lines.push(
      "- This run drove the real /parent/login, /parent/dashboard, real " +
        "parent-report dashboard clicks, real /student/login, and real " +
        "/learning/* pages. Every learning answer was submitted through " +
        "the real product UI; persistence is verified via observed " +
        "/api/learning/session/start, /answer, /session/finish responses."
    );
  } else {
    lines.push(
      "- This run did NOT drive any UI, did NOT log in any student or " +
        "parent, and did NOT call any /api/learning/* endpoint."
    );
  }
  return lines.join("\n");
}

function renderSuiteMarkdown(suite, stateAdvance) {
  const lines = [];
  lines.push("## Suite (D2.3 full-run)");
  lines.push("");
  const c = suite.summary?.counts || {};
  lines.push(
    `- **verdict**: \`${suite.verdict}\` ` +
      `(pass=\`${c.pass || 0}\` partial=\`${c.partial || 0}\` ` +
      `fail=\`${c.fail || 0}\` blocked=\`${c.blocked || 0}\` ` +
      `studied=\`${suite.summary?.studiedCount ?? 0}\`)`
  );
  lines.push(`- **durationMs**: \`${suite.durationMs ?? "n/a"}\``);
  if (suite.parentAuth) {
    lines.push(
      `- **parent-auth**: mode=\`${suite.parentAuth.mode}\` ` +
        `pass-eligible=\`${suite.parentAuth.pass}\` ` +
        `partial=\`${suite.parentAuth.partial}\``
    );
  }
  if (suite.dashboardStudentCount != null) {
    lines.push(
      `- **dashboardStudentCount**: \`${suite.dashboardStudentCount}\``
    );
  }
  if (stateAdvance) {
    lines.push(
      `- **state-advance**: shouldRun=\`${stateAdvance.shouldRun}\` ` +
        `succeeded=\`${stateAdvance.succeeded}\`` +
        (stateAdvance.error ? ` error=\`${stateAdvance.error}\`` : "") +
        (stateAdvance.info && stateAdvance.info.rowsAppended != null
          ? ` rowsAppended=\`${stateAdvance.info.rowsAppended}\``
          : "")
    );
  }
  lines.push("");
  lines.push("### Per-student");
  lines.push("");
  lines.push(
    "| student | grade | persona | status | sessions | answered | ownSubjects | bleedOk | tier1 | reason |"
  );
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of suite.students || []) {
    const sessionsCount = (r.sessions || []).length;
    const answered = (r.sessions || []).reduce(
      (acc, s) => acc + (s.answeredCount || 0),
      0
    );
    const ownSubjects = r.classification?.ownSubjects?.join("+") || "—";
    const bleedOk = r.classification?.bleedOk ?? "—";
    const tier1 = r.tier1?.passed ?? "—";
    const reason = r.driverError || r.blocker?.message || "";
    lines.push(
      `| ${r.label} | ${r.grade} | ${r.personaKind} | ${r.status} | ` +
        `${sessionsCount} | ${answered} | ${ownSubjects} | ${bleedOk} | ` +
        `${tier1} | ${String(reason).slice(0, 120)} |`
    );
  }
  if ((suite.skipped || []).length > 0) {
    lines.push("");
    lines.push("### Planner-skipped (attendance roll = no, etc.)");
    for (const e of suite.skipped) {
      lines.push(`- \`${e.label}\` (${e.personaKind}, grade=${e.grade}): ${e.reason}`);
    }
  }
  if ((suite.filteredOut || []).length > 0) {
    lines.push("");
    lines.push("### Filtered out by --students CLI flag");
    for (const e of suite.filteredOut) {
      lines.push(`- \`${e.label}\` (${e.personaKind}, grade=${e.grade}): ${e.reason}`);
    }
  }
  if ((suite.crossStudentMatrix || []).length > 0) {
    lines.push("");
    lines.push("### Per-student snapshot windows + delta matrix");
    lines.push("");
    lines.push(
      "_Each student: baseline immediately before sessions → driver activity → " +
        "after immediately after sessions. Non-planned-subject deltas are logged " +
        "as external/concurrent activity — not product bleed failures._"
    );
    lines.push("");
    lines.push(
      "| student | grade | ownSubjects | ownDeltaOk | external? | baseline→after | driver answers | finalStatus |"
    );
    lines.push("|---|---|---|---|---|---|---|---|");
    for (const m of suite.crossStudentMatrix) {
      const rw = m.runWindow || {};
      const window =
        rw.baselineCapturedAt && rw.afterCapturedAt
          ? `${rw.baselineCapturedAt} → ${rw.afterCapturedAt}`
          : "—";
      lines.push(
        `| ${m.studentLabel} | ${m.grade} | ` +
          `${(m.ownSubjects || []).join("+") || "—"} | ` +
          `${m.ownDeltaOk ?? "—"} | ` +
          `${m.externalConcurrentDetected ? "yes" : "no"} | ` +
          `${window} | ${rw.driverAnswerCount ?? "—"} | ${m.finalStatus} |`
      );
    }
    const anyExternal = (suite.crossStudentMatrix || []).some(
      (m) => m.externalConcurrentDetected
    );
    if (anyExternal) {
      lines.push("");
      lines.push("#### External/concurrent same-student activity (informational)");
      for (const m of suite.crossStudentMatrix || []) {
        if (!m.bleedFindings || m.bleedFindings.length === 0) continue;
        lines.push(`- **${m.studentLabel}**:`);
        for (const f of m.bleedFindings) {
          lines.push(
            `  - subject=\`${f.subject}\` before=\`${f.before}\` ` +
              `after=\`${f.after}\` delta=\`${f.delta}\``
          );
        }
      }
    }
  }
  if ((suite.students || []).some((r) => r.runWindow)) {
    lines.push("");
    lines.push("### Per-student run window detail");
    for (const r of suite.students || []) {
      const rw = r.runWindow;
      if (!rw) continue;
      lines.push("");
      lines.push(`#### \`${r.label}\``);
      lines.push(`- plannedSubjects: \`${(rw.plannedSubjects || []).join(", ") || "—"}\``);
      lines.push(`- studentRunStartedAt: \`${rw.studentRunStartedAt || "—"}\``);
      lines.push(`- baselineCapturedAt: \`${rw.baselineCapturedAt || "—"}\``);
      lines.push(`- afterCapturedAt: \`${rw.afterCapturedAt || "—"}\``);
      lines.push(`- studentRunEndedAt: \`${rw.studentRunEndedAt || "—"}\``);
      lines.push(
        `- driverSessionIds: \`${(rw.driverSessionIds || []).length}\` ` +
          `(ids: \`${(rw.driverSessionIds || []).slice(0, 5).join(", ") || "—"}\`)`
      );
      lines.push(
        `- driverAnswerIds: \`${(rw.driverAnswerIds || []).length}\` ` +
          `driverAnswerCount: \`${rw.driverAnswerCount ?? "—"}\``
      );
      if ((rw.externalConcurrentActivity || []).length > 0) {
        lines.push(
          `- externalConcurrentActivity: \`${rw.externalConcurrentActivity
            .map((f) => `${f.subject}+${f.delta}`)
            .join(", ")}\``
        );
      }
    }
  }
  return lines.join("\n");
}

function buildPhaseD2FailureRepro(s) {
  const lines = [];
  lines.push(`# Phase D2 — failure / not-yet-implemented repro — ${s.runId}`);
  lines.push("");
  lines.push(`Status: \`${s.status}\``);
  lines.push(`Stage: \`${s.stage}\``);
  if (s.reason) {
    lines.push("Reason:");
    lines.push("```");
    lines.push(s.reason);
    lines.push("```");
  }
  lines.push("");
  if (s.stage === "preflight-only") {
    lines.push("## Reproduce (D2.2 preflight-only)");
    lines.push("");
    lines.push("```");
    lines.push(
      `node scripts/virtual-student-qa/run.mjs --phase d2 ` +
        `--date ${s.resolved.date} --preflight-only`
    );
    lines.push("```");
  } else if (s.stage === "date-guard") {
    lines.push("## Why this fired");
    lines.push("");
    lines.push(
      "The runner refused to advance backward in time. The target " +
        `date \`${s.resolved.date}\` is earlier than the longitudinal ` +
        `state's \`lastRunDate=${s.resolved.stateLastRunDate ?? "(none)"}\`. ` +
        "Running an earlier date against a more-advanced state would " +
        "corrupt the simulation timeline (closed days reopened, " +
        "timeline.md/state.json/parent-dashboard going out of sync). " +
        "`--force` does NOT bypass this guard — `--force` is only for " +
        "same-day reruns, not for rewinding history."
    );
    lines.push("");
    lines.push("## How to proceed");
    lines.push("");
    lines.push(
      "Pick exactly ONE of the following, then re-run the scheduler " +
        "(or `node scripts/virtual-student-qa/run.mjs --phase d2 ...`):"
    );
    lines.push("");
    lines.push(
      "1. **Wait until the wall-clock date is `>= " +
        `${s.resolved.stateLastRunDate ?? "(unknown)"}\`** and let the ` +
        "next 02:00 trigger fire normally. The natural forward " +
        "progression of the calendar makes the guard a no-op once " +
        "today catches up to / overtakes `state.lastRunDate`."
    );
    lines.push("");
    lines.push(
      "2. **Reset / archive the longitudinal state** per the " +
        "*Resetting longitudinal state* section in " +
        "`scripts/virtual-student-qa/docs/SCHEDULER-SETUP.md`. This " +
        "moves `state.json` / `state.json.bak` / `timeline.md` into " +
        "an archive folder so the next run starts from a clean " +
        "first-day baseline. Use this when the test/validation " +
        "history has artificially advanced state past the calendar " +
        "and you want to start *official* nightly operation cleanly."
    );
    lines.push("");
    lines.push("## Verifying the fail-safe contract");
    lines.push("");
    lines.push(
      "Because this guard fires BEFORE plan generation, BEFORE the " +
        "browser is launched, and BEFORE any per-student session, no " +
        "longitudinal state can have been advanced by this run. To " +
        "verify, compare the SHA-256 of " +
        "`%LOCALAPPDATA%\\liosh-qa\\virtual-student-state\\state.json` " +
        "before and after — they MUST be bit-identical. " +
        "`timeline.md` MUST NOT have a new row. " +
        "Likewise no per-student artifact directories are written " +
        "under `reports/virtual-student-daily/" +
        `${s.resolved.date}/s*-AAA*/\`.`
    );
  } else if (s.stage === "full-run") {
    lines.push("## Reproduce (D2.3 full-run, fast mode)");
    lines.push("");
    lines.push("Re-run for the same date with `--force` to bypass idempotency:");
    lines.push("");
    lines.push("```");
    lines.push(
      `node scripts/virtual-student-qa/run.mjs --phase d2 --mode ${s.resolved.mode} ` +
        `--date ${s.resolved.date} --force`
    );
    lines.push("```");
    lines.push("");
    lines.push("Smoke against a single student first:");
    lines.push("");
    lines.push("```");
    lines.push(
      `node scripts/virtual-student-qa/run.mjs --phase d2 --mode fast ` +
        `--date ${s.resolved.date} --force --students AAA1`
    );
    lines.push("```");
    if (s.suite && Array.isArray(s.suite.students)) {
      const failedLabels = s.suite.students
        .filter((r) => r.status === "fail" || r.status === "blocked")
        .map((r) => r.label);
      if (failedLabels.length > 0) {
        lines.push("");
        lines.push("Failed / blocked students this run:");
        lines.push("");
        for (const label of failedLabels) {
          const rec = s.suite.students.find((r) => r.label === label);
          lines.push(
            `- \`${label}\` (status=${rec?.status}): ` +
              `${rec?.driverError || rec?.blocker?.message || "(no reason recorded)"}`
          );
        }
      }
    }
  } else {
    lines.push("## Reproduce (D2.1 dry-run)");
    lines.push("");
    lines.push("```");
    lines.push(
      `node scripts/virtual-student-qa/run.mjs --phase d2 --mode ${s.resolved.mode} ` +
        `--date ${s.resolved.date} --dry-run`
    );
    lines.push("```");
  }
  lines.push("");
  lines.push("## Env reminders");
  lines.push("");
  lines.push("- `VIRTUAL_STUDENT_DAILY_STATE_DIR` (default outside the repo)");
  lines.push("- `VIRTUAL_STUDENT_DAILY_MODE=realtime|fast`");
  lines.push("- `VIRTUAL_STUDENT_DAILY_DATE=YYYY-MM-DD`");
  lines.push("- `VIRTUAL_STUDENT_DAILY_MAX_MINUTES=480`");
  lines.push("- `VIRTUAL_STUDENT_DAILY_PACER_SCALE=1.0`");
  lines.push(
    "- `VIRTUAL_STUDENT_DAILY_DRY_RUN=1` (alternative to --dry-run)"
  );
  lines.push(
    "- `VIRTUAL_STUDENT_DAILY_PREFLIGHT_ONLY=1` (alternative to --preflight-only)"
  );
  lines.push(
    "- `VIRTUAL_STUDENT_DAILY_FORCE=1` (alternative to --force)"
  );
  return lines.join("\n");
}

/**
 * Only invoke main() when this file is executed directly (e.g. via
 * `node scripts/virtual-student-qa/run.mjs ...`). When the file is
 * imported by another module (a smoke tool, a unit test, or the
 * accidental `import('./run.mjs')` that surfaced during D2.4), the
 * importer gets the module's exports without triggering CLI side
 * effects. We compare the resolved import.meta.url against the file
 * URL of the script Node was invoked with — the cross-platform
 * equivalent of CommonJS's `require.main === module` check.
 *
 * Tests / external callers that *want* to run the CLI programmatically
 * can still do so by calling `runCli()` explicitly; otherwise importing
 * is a pure no-op.
 */
export async function runCli() {
  return main();
}

function isInvokedDirectly() {
  try {
    const argv1 = process.argv?.[1];
    if (!argv1) return false;
    const invokedUrl = pathToFileURL(argv1).href;
    return invokedUrl === import.meta.url;
  } catch {
    // If we can't resolve the entry-point URL, fall back to NOT running
    // (safer default — never run by accident).
    return false;
  }
}

if (isInvokedDirectly()) {
  main().catch((error) => {
    console.error("virtual-student-qa: unexpected fatal error", error);
    process.exit(1);
  });
}
