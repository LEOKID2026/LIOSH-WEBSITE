#!/usr/bin/env node
/**
 * Virtual Student QA Runner — CLI entry (Phase A + Phase B).
 *
 * Phase A (student): real student → real /student/login UI → real
 *   /learning/math-master → real /api/learning/session/start + answer + finish.
 *
 * Phase B (parent): real parent → real /parent/login UI → /parent/dashboard
 *   → click the real "דוח הורים" affordance for the linked student → verify
 *   the visible parent report matches the student activity from Phase A.
 *
 * Phase B is enabled by default (`--phase b`). Use `--phase a` to skip the
 * parent verification leg (legacy Phase A smoke).
 *
 * Artifacts under reports/virtual-student-qa/{ISO-timestamp}/ regardless of
 * phase.
 *
 * CLI:
 *   --phase a|b          (default: b — student scenario + parent verification)
 *   --scenario <id>      (default: math-average-smoke)
 *   --student <label>    (default: first configured student account)
 *   --parent <label>     (default: first configured parent account, or the
 *                          parent whose linkedStudent label matches --student)
 *   --headed             (visible browser)
 *   --base-url <url>     (override PLAYWRIGHT_BASE_URL)
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
} from "./lib/config.mjs";
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
import { makeRunArtifacts, newRunId } from "./lib/artifacts.mjs";
import { PHASE_A_SCENARIOS } from "./scenarios/math-average-smoke.mjs";

function parseArgs(argv) {
  const args = {
    phase: "b",
    scenario: "math-average-smoke",
    student: "",
    parent: "",
    headed: false,
    baseUrl: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--phase") args.phase = String(argv[++i] || "b").toLowerCase();
    else if (a === "--scenario") args.scenario = String(argv[++i] || "");
    else if (a === "--student") args.student = String(argv[++i] || "");
    else if (a === "--parent") args.parent = String(argv[++i] || "");
    else if (a === "--headed") args.headed = true;
    else if (a === "--base-url") args.baseUrl = String(argv[++i] || "");
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
  const phase = args.phase === "a" ? "a" : "b";

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

main().catch((error) => {
  console.error("virtual-student-qa: unexpected fatal error", error);
  process.exit(1);
});
