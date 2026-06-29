#!/usr/bin/env node
/**
 * History technical launch certification — single clean run, no retries.
 * Phases use a fresh production server each to avoid Windows/.next long-run corruption.
 * Usage: node --env-file=.env.local --env-file=.env.e2e.local tmp/history-launch-certification.mjs [port]
 */
import { spawn, execSync } from "node:child_process";
import net from "node:net";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.HISTORY_QA_PORT || 3012);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, "tmp", "history-launch-certification-report");
mkdirSync(OUT, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  port: PORT,
  sections: {},
  openIssues: [],
  envFlakes: [],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function section(name, pass, detail = {}) {
  report.sections[name] = { pass: !!pass, ...detail };
  if (!pass) report.openIssues.push(name);
}

function runStatic(name, cmd) {
  try {
    execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { pass: true };
  } catch (e) {
    return { pass: false, err: String(e.stderr || e.stdout || e.message).slice(-1200) };
  }
}

function runNodeScript(relPath, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  try {
    execSync(
      `node --env-file=.env.local --env-file=.env.e2e.local ${relPath} ${PORT}`,
      { cwd: ROOT, env, stdio: "inherit" }
    );
    return { pass: true };
  } catch (e) {
    return { pass: false, code: e.status ?? 1 };
  }
}

async function killPort(port) {
  if (process.platform !== "win32") return;
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore" }
    );
  } catch {
    /* ignore */
  }
  await sleep(2500);
}

async function waitForServer(maxAttempts = 90) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(15_000) }).catch(
      () => null
    );
    if (res?.ok) return true;
    await sleep(2000);
  }
  return false;
}

async function startProductionServer(label) {
  console.log(`\n[server] ${label}: restart on ${BASE}...`);
  await killPort(PORT);
  const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    shell: true,
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();
  if (!(await waitForServer())) {
    throw new Error(`Production server not ready on ${BASE} (${label})`);
  }
  console.log(`[server] ${label}: ready`);
}

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== History Launch Certification ===\n");

  console.log("Step 1/6: production build...");
  const build = runStatic("build", "npm run build");
  section("build", build.pass, build);
  if (!build.pass) throw new Error("build failed — aborting certification");

  console.log("\nStep 2/6: countable practice + DB (AAA1/7/11)...");
  await startProductionServer("practice");
  const practiceRun = runNodeScript("tmp/history-copilot-scope-qa.mjs", {
    SKIP_BUILD: "1",
    SKIP_ENSURE_SERVER: "1",
    SKIP_POST_AUDITS: "1",
    SKIP_REPORT: "1",
  });
  const practiceSummary = readJsonSafe(
    join(ROOT, "tmp", "history-copilot-scope-qa-report", "summary.json")
  );
  const practicePass =
    practiceRun.pass &&
    practiceSummary?.sections?.["fresh-practice-db-report"]?.pass === true;
  section("practice-db", practicePass, {
    exitCode: practiceRun.pass ? 0 : practiceRun.code,
    practiceSummary: practiceSummary?.sections?.["fresh-practice-db-report"],
  });

  console.log("\nStep 3/6: parent report UI + Copilot (7 prompts)...");
  await startProductionServer("report-copilot");
  const reportRun = runNodeScript("tmp/history-copilot-scope-qa.mjs", {
    SKIP_BUILD: "1",
    SKIP_ENSURE_SERVER: "1",
    SKIP_POST_AUDITS: "1",
    SKIP_PRACTICE: "1",
  });
  const reportSummary = readJsonSafe(
    join(ROOT, "tmp", "history-copilot-scope-qa-report", "summary.json")
  );
  const reportPass =
    reportRun.pass && reportSummary?.sections?.["report-ui-copilot"]?.pass === true;
  section("report-ui-copilot", reportPass, {
    exitCode: reportRun.pass ? 0 : reportRun.code,
    reportSummary: reportSummary?.sections?.["report-ui-copilot"],
  });

  console.log("\nStep 4/6: parent-assigned activity (browser MCQ + activity-submit-answer)...");
  await startProductionServer("parent-activity");
  const parentRun = runNodeScript("tmp/history-parent-activity-qa.mjs", {
    SKIP_FINAL_BUILD: "1",
    SKIP_QA_AUDITS: "1",
    SKIP_REPORT_UI: "1",
    SKIP_TOPIC_SMOKE: "1",
  });
  const parentSummary = readJsonSafe(
    join(ROOT, "tmp", "history-parent-activity-qa-report", "summary.json")
  );
  const parentPass =
    parentRun.pass && parentSummary?.sections?.["parent-activity-e2e"]?.pass === true;
  section("parent-activity-browser-e2e", parentPass, {
    exitCode: parentRun.pass ? 0 : parentRun.code,
    parentSummary: parentSummary?.sections?.["parent-activity-e2e"],
  });

  console.log("\nStep 5/6: static audits...");
  section(
    "audit-history-child-text",
    runStatic("audit", "node scripts/audit-history-child-text.mjs").pass
  );
  section("verify-history-g6-book", runStatic("book", "npm run verify:history-g6-book").pass);
  section(
    "test-history-diagnostic-probe-e2e",
    runStatic("diag", "npm run test:history-diagnostic-probe-e2e").pass
  );

  console.log("\nStep 6/6: finalize...");
  await killPort(PORT);

  report.finishedAt = new Date().toISOString();
  report.allPass = Object.values(report.sections).every((s) => s.pass);
  report.launchApproved = report.allPass && report.openIssues.length === 0;
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(report, null, 2));

  console.log("\n=== LAUNCH CERTIFICATION ===");
  for (const [k, v] of Object.entries(report.sections)) {
    console.log(`${v.pass ? "PASS" : "FAIL"}  ${k}`);
  }
  console.log(
    `\nOverall: ${report.allPass ? "PASS — technically launch-ready" : "FAIL"}`
  );
  if (report.envFlakes.length) {
    console.log(`Env flakes (not code): ${report.envFlakes.join(", ")}`);
  }
  console.log(`Artifacts: ${OUT}`);
  process.exit(report.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
