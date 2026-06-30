#!/usr/bin/env node
/**
 * History launch certification — build once, fresh server per phase.
 * Order: build → parent activity (browser) → practice → report/copilot → audits
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.argv[2] || 3012);
const BASE = `http://127.0.0.1:${PORT}`;
const BUILD_ID = join(ROOT, ".next", "BUILD_ID");
const OUT = join(ROOT, "tmp", "history-launch-certification-report");
mkdirSync(OUT, { recursive: true });

const report = { startedAt: new Date().toISOString(), sections: {}, openIssues: [], envFlakes: [] };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function section(name, pass, detail = {}) {
  report.sections[name] = { pass: !!pass, ...detail };
  if (!pass) report.openIssues.push(name);
}

function runStatic(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { pass: true };
  } catch (e) {
    return { pass: false, err: String(e.stderr || e.stdout || e.message).slice(-1200) };
  }
}

function runNode(relPath, env = {}) {
  try {
    execSync(`node --env-file=.env.local --env-file=.env.e2e.local ${relPath} ${PORT}`, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    return true;
  } catch {
    return false;
  }
}

async function killPort() {
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore" }
    );
  } catch {
    /* ignore */
  }
  await sleep(8000);
}

async function waitServer() {
  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(15_000) }).catch(
      () => null
    );
    if (res?.ok) return true;
    await sleep(2000);
  }
  return false;
}

async function warmServer() {
  for (let i = 0; i < 8; i++) {
    await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
    await sleep(2000);
  }
  await sleep(8000);
}

function assertBuildManifestReady() {
  const manifestPath = join(ROOT, ".next", "build-manifest.json");
  if (!existsSync(manifestPath)) return false;
  const text = readFileSync(manifestPath, "utf8");
  return text.includes('"/student/activity/[activityId]"');
}

async function startServer(label) {
  if (!existsSync(BUILD_ID)) {
    throw new Error(`.next/BUILD_ID missing before ${label} — run build first`);
  }
  if (!assertBuildManifestReady()) {
    throw new Error(
      `.next/build-manifest.json missing /student/activity/[activityId] before ${label} — rebuild required`
    );
  }
  console.log(`\n[server] ${label}`);
  await killPort();
  const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
  spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  }).unref();
  if (!(await waitServer())) throw new Error(`server not ready (${label})`);
  await warmServer();
}

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== History Launch Certification ===\n");

  await killPort();
  console.log("Step 1: build");
  const build =
    existsSync(BUILD_ID) && process.env.FORCE_CERT_BUILD !== "1"
      ? { pass: true, skipped: true, note: "BUILD_ID present" }
      : runStatic("npm run build");
  section("build", build.pass, build);
  if (!build.pass) process.exit(1);
  if (!assertBuildManifestReady()) {
    section("build", false, {
      err: "build-manifest.json missing /student/activity/[activityId] — rebuild .next",
    });
    process.exit(1);
  }

  console.log("\nStep 2: parent activity (browser MCQ + activity-submit-answer)");
  await startServer("parent-activity");
  const parentOk = runNode("tmp/history-parent-activity-qa.mjs", {
    SKIP_FINAL_BUILD: "1",
    SKIP_QA_AUDITS: "1",
    SKIP_REPORT_UI: "1",
    SKIP_TOPIC_SMOKE: "1",
  });
  const parentSum = readJson(join(ROOT, "tmp/history-parent-activity-qa-report/summary.json"));
  section("parent-activity-browser-e2e", parentOk && parentSum?.sections?.["parent-activity-e2e"]?.pass, {
    results: parentSum?.sections?.["parent-activity-e2e"]?.results,
  });

  console.log("\nStep 3: practice + DB (AAA1/7/11)");
  await startServer("practice");
  const practiceOk = runNode("tmp/history-copilot-scope-qa.mjs", {
    SKIP_BUILD: "1",
    SKIP_ENSURE_SERVER: "1",
    SKIP_POST_AUDITS: "1",
    SKIP_REPORT: "1",
  });
  const practiceSum = readJson(join(ROOT, "tmp/history-copilot-scope-qa-report/summary.json"));
  section("practice-db", practiceOk && practiceSum?.sections?.["fresh-practice-db-report"]?.pass, {
    results: readJson(join(ROOT, "tmp/history-copilot-scope-qa-report/practice-results.json")),
  });

  console.log("\nStep 4: parent report UI + Copilot");
  await startServer("report-copilot");
  const reportOk = runNode("tmp/history-copilot-scope-qa.mjs", {
    SKIP_BUILD: "1",
    SKIP_ENSURE_SERVER: "1",
    SKIP_POST_AUDITS: "1",
    SKIP_PRACTICE: "1",
  });
  const reportSum = readJson(join(ROOT, "tmp/history-copilot-scope-qa-report/summary.json"));
  section("report-ui-copilot", reportOk && reportSum?.sections?.["report-ui-copilot"]?.pass, {
    copilotPass: reportSum?.sections?.["report-ui-copilot"]?.copilotPass,
  });

  await killPort();
  console.log("\nStep 5: audits");
  section("audit-history-child-text", runStatic("node scripts/audit-history-child-text.mjs").pass);
  section("verify-history-g6-book", runStatic("npm run verify:history-g6-book").pass);
  section(
    "test-history-diagnostic-probe-e2e",
    runStatic("npm run test:history-diagnostic-probe-e2e").pass
  );

  report.finishedAt = new Date().toISOString();
  report.allPass = Object.values(report.sections).every((s) => s.pass);
  report.launchApproved = report.allPass;
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(report, null, 2));

  console.log("\n=== LAUNCH CERTIFICATION ===");
  for (const [k, v] of Object.entries(report.sections)) {
    console.log(`${v.pass ? "PASS" : "FAIL"}  ${k}`);
  }
  console.log(`\nOverall: ${report.allPass ? "PASS" : "FAIL"}`);
  process.exit(report.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
