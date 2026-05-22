#!/usr/bin/env node
/**
 * Virtual Student QA Runner — CLI entry (Phase A only).
 *
 * Real student → real /student/login UI form → real /learning/math-master →
 * real /api/learning/session/start + answer + finish → artifacts under
 * reports/virtual-student-qa/{ISO-timestamp}/.
 *
 * CLI:
 *   --phase a            (default; only 'a' is implemented in this PR)
 *   --scenario <id>      (default: math-average-smoke)
 *   --student <label>    (default: first configured account)
 *   --headed             (visible browser)
 *   --base-url <url>     (override PLAYWRIGHT_BASE_URL)
 *
 * Env (Phase A):
 *   VIRTUAL_STUDENT_ACCOUNTS      JSON [{label, username|code, pin}]   - preferred
 *   E2E_STUDENT_USERNAME          single-student fallback
 *   E2E_STUDENT_CODE              single-student fallback (alternative to username)
 *   E2E_STUDENT_PIN               4-digit PIN (required)
 *   E2E_STUDENT_{N}_USERNAME      indexed multi-student fallback (1..9)
 *   E2E_STUDENT_{N}_PIN           indexed multi-student fallback (1..9)
 *   PLAYWRIGHT_BASE_URL           dev server URL (default http://127.0.0.1:3001)
 *   VIRTUAL_STUDENT_STUDENT_AUTH  'ui' (default, REAL UI form) | 'api' (TEMPORARY)
 *   VIRTUAL_STUDENT_HEADED        '1' to run headed
 *   SUPABASE_URL                  optional (Tier 2 row-count evidence)
 *   SUPABASE_SERVICE_ROLE_KEY     optional (Tier 2 row-count evidence)
 *
 * Exit codes: 0 PASS, 1 FAIL, 2 misuse.
 */
import {
  loadAccounts,
  selectAccount,
  resolveBaseUrl,
  resolveStudentAuthMode,
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
import { makeRunArtifacts, newRunId } from "./lib/artifacts.mjs";
import { PHASE_A_SCENARIOS } from "./scenarios/math-average-smoke.mjs";

function parseArgs(argv) {
  const args = {
    phase: "a",
    scenario: "math-average-smoke",
    student: "",
    headed: false,
    baseUrl: "",
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--phase") args.phase = String(argv[++i] || "a").toLowerCase();
    else if (a === "--scenario") args.scenario = String(argv[++i] || "");
    else if (a === "--student") args.student = String(argv[++i] || "");
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

async function main() {
  const args = parseArgs(process.argv);
  if (args.phase !== "a") {
    console.error(
      `phase '${args.phase}' is not implemented yet. Phase A only in this PR. ` +
        "Phases B–E are pending owner approval per the plan."
    );
    process.exit(2);
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
  log(`phase=A scenario=${scenario.id}`);

  const baseUrl = resolveBaseUrl(args.baseUrl);
  log(`baseUrl=${baseUrl}`);

  let accounts;
  try {
    accounts = loadAccounts();
  } catch (error) {
    return finalize({
      status: "fail",
      reason: `config: ${error.message}`,
      artifacts,
      runId,
      scenario,
      args,
      baseUrl,
      account: null,
      networkSummary: null,
      tier1: null,
      tier2: null,
      consoleErrors: [],
      consoleNoise: [],
      pageErrors: [],
      studentAuthMode: null,
      failureStep: "config",
      driverResult: null,
    });
  }
  if (accounts.length === 0) {
    return finalize({
      status: "fail",
      reason:
        "config: no virtual-student accounts found. Set VIRTUAL_STUDENT_ACCOUNTS (JSON) " +
        "or E2E_STUDENT_USERNAME + E2E_STUDENT_PIN.",
      artifacts,
      runId,
      scenario,
      args,
      baseUrl,
      account: null,
      networkSummary: null,
      tier1: null,
      tier2: null,
      consoleErrors: [],
      consoleNoise: [],
      pageErrors: [],
      studentAuthMode: null,
      failureStep: "config",
      driverResult: null,
    });
  }

  let account;
  try {
    account = selectAccount(accounts, args.student);
  } catch (error) {
    return finalize({
      status: "fail",
      reason: `config: ${error.message}`,
      artifacts,
      runId,
      scenario,
      args,
      baseUrl,
      account: null,
      networkSummary: null,
      tier1: null,
      tier2: null,
      consoleErrors: [],
      consoleNoise: [],
      pageErrors: [],
      studentAuthMode: null,
      failureStep: "config",
      driverResult: null,
    });
  }
  log(`account=${JSON.stringify(fmtAccount(account))}`);

  const studentAuthMode = resolveStudentAuthMode();
  log(
    `studentAuthMode=${studentAuthMode}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );

  try {
    await preflight(baseUrl, log);
  } catch (error) {
    return finalize({
      status: "fail",
      reason: error.message,
      artifacts,
      runId,
      scenario,
      args,
      baseUrl,
      account: fmtAccount(account),
      networkSummary: null,
      tier1: null,
      tier2: null,
      consoleErrors: [],
      consoleNoise: [],
      pageErrors: [],
      studentAuthMode,
      failureStep: "preflight",
      driverResult: null,
    });
  }

  const headed = args.headed || isHeaded();
  const browser = await launchBrowser({ headed });
  const context = await newStudentContext(browser);
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleNoise = [];
  const pageErrors = [];
  // "Failed to load resource: ..." is the generic console line emitted by
  // Chromium for ANY non-2xx response (including pre-login /api/student/me 401
  // and missing asset 404s). It is not a product bug, so we record it as
  // informational noise but do not gate PASS on it. Real JavaScript errors
  // surface as 'pageerror' events, which are separately gated below.
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

  await artifacts.saveScreenshot(page, "99-final-state").catch(() => {});
  await context.close().catch(() => {});
  await browser.close().catch(() => {});

  let status = "fail";
  const errors = [];
  if (failureReason) errors.push(`driver: ${failureReason}`);
  if (tier1 && !tier1.passed) errors.push(...tier1.errors.map((e) => `tier1: ${e}`));
  if (tier2?.enabled && tier2.passed === false) {
    errors.push(...(tier2.errors || []).map((e) => `tier2: ${e}`));
  }
  if (consoleErrors.length > 0) errors.push(...consoleErrors.map((e) => `console: ${e}`));
  if (pageErrors.length > 0) errors.push(...pageErrors.map((e) => `pageerror: ${e}`));

  if (
    !failureReason &&
    tier1?.passed &&
    (tier2?.enabled !== true || tier2.passed) &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0
  ) {
    status = "pass";
  }

  finalize({
    status,
    reason: errors.length > 0 ? errors.join("; ") : null,
    artifacts,
    runId,
    scenario,
    args,
    baseUrl,
    account: fmtAccount(account),
    networkSummary,
    tier1,
    tier2,
    consoleErrors,
    consoleNoise,
    pageErrors,
    studentAuthMode,
    failureStep,
    driverResult,
  });
  process.exit(status === "pass" ? 0 : 1);
}

function finalize(input) {
  const {
    status,
    reason,
    artifacts,
    runId,
    scenario,
    args,
    baseUrl,
    account,
    networkSummary,
    tier1,
    tier2,
    consoleErrors,
    consoleNoise,
    pageErrors,
    studentAuthMode,
    failureStep,
    driverResult,
  } = input;

  const summary = {
    runId,
    phase: "A",
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
      headed: args.headed,
      baseUrl: args.baseUrl,
    },
    baseUrl,
    studentAuthMode: studentAuthMode || null,
    account: account || null,
    evidence: {
      network: networkSummary || null,
      tier1: tier1 || null,
      tier2: tier2 || null,
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
  console.log("================ Virtual Student QA Phase A ================");
  console.log(`status     : ${status.toUpperCase()}`);
  console.log(`runId      : ${runId}`);
  console.log(`scenario   : ${scenario.id}`);
  console.log(`base URL   : ${baseUrl}`);
  console.log(
    `auth mode  : ${studentAuthMode || "n/a"}` +
      (studentAuthMode === "api" ? " [TEMPORARY:api-shortcut]" : "")
  );
  console.log(`artifacts  : ${artifacts.root}`);
  if (reason) console.log(`reason     : ${reason}`);
  console.log("============================================================");
}

function buildMarkdownSummary(s) {
  const lines = [];
  lines.push("# Virtual Student QA — Phase A");
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
  if (s.account) {
    lines.push(
      `- **account**: label=\`${s.account.label}\` ` +
        `(usernameSet=${s.account.hasUsername}, codeSet=${s.account.hasCode})`
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
  lines.push("- `VIRTUAL_STUDENT_ACCOUNTS` _or_ `E2E_STUDENT_USERNAME` + `E2E_STUDENT_PIN`");
  lines.push("- `PLAYWRIGHT_BASE_URL` (or rely on default `http://127.0.0.1:3001`)");
  lines.push("- `VIRTUAL_STUDENT_STUDENT_AUTH=ui` (default) or `=api` (debug shortcut)");
  lines.push("");
  lines.push("Then run:");
  lines.push("");
  lines.push("```");
  const headedFlag = s.args.headed ? " --headed" : "";
  const studentFlag = s.args.student ? ` --student ${s.args.student}` : "";
  lines.push(
    `node scripts/virtual-student-qa/run.mjs --phase a --scenario ${s.scenario.id}${studentFlag}${headedFlag}`
  );
  lines.push("```");
  return lines.join("\n");
}

main().catch((error) => {
  console.error("virtual-student-qa: unexpected fatal error", error);
  process.exit(1);
});
