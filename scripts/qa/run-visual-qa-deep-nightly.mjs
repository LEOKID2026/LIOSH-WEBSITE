#!/usr/bin/env node
/**
 * Deep / nightly Visual QA — wraps visual-qa-harness.mjs across subjects, cohorts, rounds.
 *
 * Never stops on ISSUES_FOUND / BLOCKED / exit 1|2 from a single harness run.
 *
 * Usage (full night — wrapper owns dev on isolated port 3100):
 *   $env:VISUAL_QA_DEEP_PORT="3100"
 *   $env:VISUAL_QA_SAMPLES_PER_GRADE="50"
 *   $env:VISUAL_QA_DEEP_ROUNDS="2"
 *   node scripts/qa/run-visual-qa-deep-nightly.mjs
 *
 * Do NOT point Deep QA at port 3002 (manual dev). Wrapper starts:
 *   npx next dev -p <VISUAL_QA_DEEP_PORT> -H 127.0.0.1
 *
 * Env:
 *   VISUAL_QA_DEEP_PORT           default 3100, fallback 3050 if busy (non-QA)
 *   VISUAL_QA_DEEP_SUBJECTS       default geometry,math,hebrew,english
 *   VISUAL_QA_DEEP_ROUNDS         default 2
 *   VISUAL_QA_SAMPLES_PER_GRADE    default 50 (passed to harness)
 *   VISUAL_QA_RUN_TIMEOUT_MINUTES default 75 per harness run
 *   VISUAL_QA_DEEP_RUN_ID         optional override for reports/visual-qa-deep/<runId>/
 *   VISUAL_QA_DEEP_RESTART_EACH_RUN default true — fresh dev before each harness run
 *   PLAYWRIGHT_BASE_URL           derived from VISUAL_QA_DEEP_PORT (not 3002)
 */

import { spawn, exec } from "node:child_process";
import { mkdir, readFile, writeFile, readdir, stat, unlink } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { getRepoRoot } from "../virtual-student-qa/lib/config.mjs";

const SELF_PATH = fileURLToPath(import.meta.url);

const execAsync = promisify(exec);

const REPO_ROOT = getRepoRoot();
const SCRIPT_DIR = join(REPO_ROOT, "scripts", "qa");
const HARNESS_PATH = join(SCRIPT_DIR, "visual-qa-harness.mjs");
const DEEP_LOCK_PATH = join(REPO_ROOT, "reports", "visual-qa-deep", ".deep-run.lock");
const DEEP_DEV_STATE_PATH = join(REPO_ROOT, "reports", "visual-qa-deep", ".deep-dev-server.json");
const DEFAULT_DEEP_PORT = 3100;
const FALLBACK_DEEP_PORT = 3050;
const DEEP_DEV_HOST = "127.0.0.1";
const BLOCKED_MANUAL_DEV_PORT = 3002;

const DEFAULT_SUBJECTS = ["geometry", "math", "hebrew", "english"];
const COHORTS = [
  { id: "primary", useSecondStudent: false },
  { id: "secondary", useSecondStudent: true },
];
const GRADES = [1, 2, 3, 4, 5, 6];

const VISUAL_QA_ENV_KEYS = [
  "VISUAL_QA_SUBJECT",
  "VISUAL_QA_MODE",
  "VISUAL_QA_SAMPLES_PER_GRADE",
  "VISUAL_QA_SAMPLES_PER_SUBJECT",
  "VISUAL_QA_USE_SECOND_STUDENT",
  "VISUAL_QA_ALLOW_MUTATIONS",
  "VISUAL_QA_OUTPUT_DIR",
  "VISUAL_QA_SAMPLE_SEED",
  "VISUAL_QA_BASE_URL",
  "VISUAL_QA_DEEP_SUBJECTS",
  "VISUAL_QA_DEEP_ROUNDS",
  "VISUAL_QA_DEEP_RUN_ID",
  "VISUAL_QA_DEEP_DIAGNOSTIC",
  "VISUAL_QA_RUN_TIMEOUT_MINUTES",
  "VISUAL_QA_DEEP_PROGRESS_MINUTES",
  "VISUAL_QA_DEEP_HEALTH_RETRIES",
  "VISUAL_QA_DEEP_COOLDOWN_SEC",
  "VISUAL_QA_DEEP_PORT",
  "VISUAL_QA_LOGIN_TIMEOUT_MS",
  "VISUAL_QA_GRADE_FILTER",
];

async function readDeepDevState() {
  try {
    return JSON.parse(await readFile(DEEP_DEV_STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function writeDeepDevState(state) {
  await mkdir(join(REPO_ROOT, "reports", "visual-qa-deep"), { recursive: true });
  await writeFile(DEEP_DEV_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function clearDeepDevState() {
  try {
    await unlink(DEEP_DEV_STATE_PATH);
  } catch {
    /* ignore */
  }
}

async function getProcessCommandLine(pid) {
  if (!pid) return "";
  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\").CommandLine"`,
        { windowsHide: true }
      );
      return String(stdout || "").trim();
    }
    const { stdout } = await execAsync(`ps -p ${pid} -o args=`, { windowsHide: true });
    return String(stdout || "").trim();
  } catch {
    return "";
  }
}

function isQaNextDevCommand(cmd, port) {
  if (!cmd) return false;
  const lower = cmd.toLowerCase();
  if (!lower.includes("next") || !lower.includes("dev")) return false;
  const portStr = String(port);
  if (!new RegExp(`-p\\s*${portStr}\\b|-p${portStr}\\b`).test(lower)) return false;
  const repoLower = REPO_ROOT.toLowerCase();
  return lower.includes(repoLower) || lower.includes("liosh-web-try");
}

async function listListeningPidsOnPort(port) {
  const portNum = String(port);
  const pids = new Set();
  if (process.platform === "win32") {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${portNum}`, { windowsHide: true });
      for (const line of stdout.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.includes("LISTENING")) continue;
        const parts = trimmed.split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (pid > 0) pids.add(pid);
      }
    } catch {
      /* no listeners */
    }
  } else {
    try {
      const { stdout } = await execAsync(`lsof -tiTCP:${portNum} -sTCP:LISTEN`, { windowsHide: true });
      for (const pid of stdout.split(/\s+/)) {
        const n = Number(pid);
        if (n > 0) pids.add(n);
      }
    } catch {
      /* ignore */
    }
  }
  return [...pids];
}

async function killProcessByPid(pid) {
  if (!pid || pid <= 0) return;
  try {
    if (process.platform === "win32") {
      await execAsync(`taskkill /PID ${pid} /T /F`, { windowsHide: true });
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    /* ignore */
  }
}

async function killQaOwnedDevOnPort(port) {
  const stale = await readDeepDevState();
  if (stale?.port === port && stale?.pid) {
    if (await isPidAlive(stale.pid)) {
      log(`  stopping prior Deep QA dev server pid=${stale.pid} on port ${port}`);
      await killProcessByPid(stale.pid);
    }
    await clearDeepDevState();
    await sleep(2000);
  }

  for (const pid of await listListeningPidsOnPort(port)) {
    const cmd = await getProcessCommandLine(pid);
    if (isQaNextDevCommand(cmd, port)) {
      log(`  stopping stale QA next dev pid=${pid} on port ${port}`);
      await killProcessByPid(pid);
    }
  }
  await sleep(2000);
}

async function isPortFree(port) {
  return (await listListeningPidsOnPort(port)).length === 0;
}

async function resolveDeepPort(preferredPort) {
  let port = preferredPort;
  const listeners = await listListeningPidsOnPort(port);
  if (listeners.length === 0) return port;

  let qaKillable = false;
  for (const pid of listeners) {
    const cmd = await getProcessCommandLine(pid);
    const stale = await readDeepDevState();
    if (isQaNextDevCommand(cmd, port) || stale?.pid === pid) {
      qaKillable = true;
    }
  }

  if (qaKillable) {
    await killQaOwnedDevOnPort(port);
    if (await isPortFree(port)) return port;
  }

  if (port === DEFAULT_DEEP_PORT) {
    log(
      `Port ${DEFAULT_DEEP_PORT} in use by non-QA process — trying fallback ${FALLBACK_DEEP_PORT}`
    );
    port = FALLBACK_DEEP_PORT;
    const fbListeners = await listListeningPidsOnPort(port);
    if (fbListeners.length === 0) return port;
    let fbQa = false;
    for (const pid of fbListeners) {
      const cmd = await getProcessCommandLine(pid);
      if (isQaNextDevCommand(cmd, port)) fbQa = true;
    }
    if (fbQa) {
      await killQaOwnedDevOnPort(port);
      if (await isPortFree(port)) return port;
    }
    throw new Error(
      `Deep QA ports ${DEFAULT_DEEP_PORT} and ${FALLBACK_DEEP_PORT} are busy. Free one or set VISUAL_QA_DEEP_PORT.`
    );
  }

  throw new Error(`Deep QA port ${port} is in use by a non-QA process.`);
}

async function spawnOwnedDevServer(cfg) {
  const port = cfg.port;
  const host = cfg.devHost;
  log(`Starting isolated Next dev for Deep QA: http://${host}:${port}`);
  await killQaOwnedDevOnPort(port);

  const child = spawn(`npx next dev -p ${port} -H ${host}`, {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
    shell: true,
    windowsHide: true,
  });
  child.unref();

  await sleep(8000);
  await warmUpLoginRoute(cfg.baseUrl, { attempts: 12 });

  let listenPid = null;
  for (let i = 0; i < 20; i += 1) {
    const pids = await listListeningPidsOnPort(port);
    if (pids.length > 0) {
      listenPid = pids[0];
      break;
    }
    await sleep(2000);
  }

  await writeDeepDevState({
    pid: listenPid ?? child.pid ?? null,
    spawnPid: child.pid ?? null,
    port,
    host,
    baseUrl: cfg.baseUrl,
    runId: cfg.runId,
    startedAt: new Date().toISOString(),
    ownedBy: "visual-qa-deep",
  });

  return waitForInfraReady(cfg.baseUrl, cfg, { purpose: "startup" });
}

async function stopOwnedDevServer(cfg) {
  if (!cfg?.ownsDevServer) return;
  log(`Stopping Deep QA dev server on port ${cfg.port}…`);
  await killQaOwnedDevOnPort(cfg.port);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warmUpLoginRoute(baseUrl, { attempts = 3 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const probe = await probeServerHealth(baseUrl, 30_000);
    if (probe.ok) return probe;
    await sleep(3000);
  }
  return probeServerHealth(baseUrl, 30_000);
}

async function killDevServerOnPort(port) {
  const portNum = String(port || DEFAULT_DEEP_PORT);
  await killQaOwnedDevOnPort(Number(portNum));
}

async function restartDevServer(cfg) {
  const port = cfg.port || new URL(cfg.baseUrl).port || String(DEFAULT_DEEP_PORT);
  const host = cfg.devHost || new URL(cfg.baseUrl).hostname || DEEP_DEV_HOST;
  log(`  restarting Next dev on ${host}:${port}…`);
  await killQaOwnedDevOnPort(port);
  const child = spawn(`npx next dev -p ${port} -H ${host}`, {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
    shell: true,
    windowsHide: true,
  });
  child.unref();
  await sleep(10_000);
  await warmUpLoginRoute(cfg.baseUrl, { attempts: 10 });

  let listenPid = null;
  for (let i = 0; i < 15; i += 1) {
    const pids = await listListeningPidsOnPort(port);
    if (pids.length > 0) {
      listenPid = pids[0];
      break;
    }
    await sleep(2000);
  }
  await writeDeepDevState({
    pid: listenPid ?? child.pid ?? null,
    spawnPid: child.pid ?? null,
    port: Number(port),
    host,
    baseUrl: cfg.baseUrl,
    runId: cfg.runId,
    restartedAt: new Date().toISOString(),
    ownedBy: "visual-qa-deep",
  });

  return waitForInfraReady(cfg.baseUrl, cfg, { purpose: "startup" });
}

async function probeServerHealth(baseUrl, timeoutMs = 15_000) {
  const url = `${baseUrl.replace(/\/$/, "")}/student/login`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, status: res.status, url, error: null };
  } catch (error) {
    return { ok: false, status: 0, url, error: error?.message || String(error) };
  }
}

async function waitForServerHealth(baseUrl, { retries = 8, delayMs = 5000, timeoutMs = 15_000 } = {}) {
  const attempts = [];
  for (let i = 0; i < retries; i += 1) {
    const probe = await probeServerHealth(baseUrl, timeoutMs);
    attempts.push({ attempt: i + 1, kind: "http", ...probe });
    if (probe.ok) return { ok: true, attempts };
    if (i < retries - 1) await sleep(delayMs);
  }
  return { ok: false, attempts };
}

async function probeLoginUiReady(baseUrl, { timeoutMs = 30_000 } = {}) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const loginUrl = `${baseUrl.replace(/\/$/, "")}/student/login`;
  const navTimeout = timeoutMs;
  const fieldTimeout = timeoutMs;
  try {
    const page = await browser.newPage();
    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: navTimeout });
    await page
      .getByText("בודקים חיבור...")
      .waitFor({ state: "detached", timeout: fieldTimeout })
      .catch(() => {});
    const usernameField = page
      .getByTestId("student-login-username")
      .or(page.getByPlaceholder("שם משתמש"))
      .or(page.getByLabel("שם משתמש"));
    await usernameField.first().waitFor({ state: "visible", timeout: fieldTimeout });
    return { ok: true, url: loginUrl, error: null };
  } catch (error) {
    return { ok: false, url: loginUrl, error: error?.message || String(error) };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function waitForInfraReady(baseUrl, cfg, { purpose = "default" } = {}) {
  const attempts = [];
  const retries =
    purpose === "pre-run"
      ? (cfg.preRunRetries ?? 6)
      : purpose === "recovery"
        ? (cfg.recoveryRetries ?? 8)
        : (cfg.healthRetries ?? 8);
  const delayMs = cfg.recoveryDelayMs ?? 10_000;
  const uiTimeoutMs =
    purpose === "recovery"
      ? (cfg.recoveryUiTimeoutMs ?? 25_000)
      : purpose === "pre-run"
        ? (cfg.preRunUiTimeoutMs ?? 35_000)
        : (cfg.startupUiTimeoutMs ?? 45_000);
  const maxWallMs =
    purpose === "recovery"
      ? (cfg.recoveryMaxWallMs ?? 180_000)
      : purpose === "pre-run"
        ? (cfg.preRunMaxWallMs ?? 120_000)
        : (cfg.startupMaxWallMs ?? 300_000);
  const started = Date.now();

  for (let i = 0; i < retries; i += 1) {
    if (Date.now() - started >= maxWallMs) {
      attempts.push({
        attempt: i + 1,
        kind: "wall-clock",
        ok: false,
        error: `infra wait exceeded ${maxWallMs}ms (${purpose})`,
      });
      break;
    }

    const http = await probeServerHealth(baseUrl, 12_000);
    attempts.push({ attempt: i + 1, kind: "http", ...http });
    if (!http.ok) {
      if (i < retries - 1) await sleep(delayMs);
      continue;
    }
    const ui = await probeLoginUiReady(baseUrl, { timeoutMs: uiTimeoutMs });
    attempts.push({ attempt: i + 1, kind: "login-ui", ...ui });
    if (ui.ok) return { ok: true, attempts };
    if (i < retries - 1) await sleep(delayMs);
  }
  return { ok: false, attempts };
}

function isInfraBlockedRun(run) {
  if (run.spawnError) return true;
  if (run.preRunHealthOk === false) return true;
  if (run.status === "BLOCKED_TIMEOUT") return true;
  const reason = String(run.blockedReason || "");
  if (/dev server not responding|Wrapper blocked harness spawn|pre-run health/i.test(reason)) {
    return true;
  }
  if (
    run.status === "BLOCKED" &&
    run.samplesCompleted === 0 &&
    /student-login-username|Timeout 30000ms exceeded/i.test(reason)
  ) {
    return true;
  }
  return false;
}

function diagnosticRunPassed(summary, plannedPerRun) {
  if (summary.runnerFailures > 0) return false;
  const infraBlocked = summary.runs.filter(isInfraBlockedRun).length;
  if (infraBlocked > 0) return false;
  const completedRuns = summary.runs.filter((r) => r.samplesCompleted >= plannedPerRun).length;
  if (completedRuns < summary.runs.length) return false;
  if (summary.totalCompletedSamples < summary.totalPlannedSamples) return false;
  return true;
}

async function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function acquireDeepRunLock(runId) {
  await mkdir(join(REPO_ROOT, "reports", "visual-qa-deep"), { recursive: true });
  let existing = null;
  try {
    existing = JSON.parse(await readFile(DEEP_LOCK_PATH, "utf8"));
  } catch {
    existing = null;
  }
  if (existing?.pid && (await isPidAlive(existing.pid)) && existing.runId !== runId) {
    throw new Error(
      `Another deep Visual QA run is active: runId=${existing.runId} pid=${existing.pid}. ` +
        `Stop it before starting ${runId}.`
    );
  }
  const lock = {
    runId,
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };
  await writeFile(DEEP_LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return lock;
}

async function releaseDeepRunLock(runId) {
  try {
    const existing = JSON.parse(await readFile(DEEP_LOCK_PATH, "utf8"));
    if (existing?.runId === runId && existing?.pid === process.pid) {
      await unlink(DEEP_LOCK_PATH);
    }
  } catch {
    /* ignore */
  }
}

function buildCleanHarnessEnv(cfg, { subject, cohort, outRel, sampleSeed, gradeNumber }) {
  const env = { ...process.env };
  for (const key of VISUAL_QA_ENV_KEYS) {
    delete env[key];
  }
  delete env.__RUN_TIMEOUT_MS;

  env.PLAYWRIGHT_BASE_URL = cfg.baseUrl;
  env.VISUAL_QA_BASE_URL = cfg.baseUrl;
  env.VISUAL_QA_SUBJECT = subject;
  env.VISUAL_QA_SAMPLES_PER_GRADE = String(cfg.samplesPerGrade);
  env.VISUAL_QA_MODE = "sample";
  env.VISUAL_QA_OUTPUT_DIR = outRel;
  env.VISUAL_QA_SAMPLE_SEED = sampleSeed;
  env.VISUAL_QA_GRADE_FILTER = String(gradeNumber);
  env.__RUN_TIMEOUT_MS = String(cfg.runTimeoutMs);
  env.VISUAL_QA_LOGIN_TIMEOUT_MS = String(cfg.loginTimeoutMs ?? 60_000);

  if (cohort.useSecondStudent) {
    env.VISUAL_QA_USE_SECOND_STUDENT = "1";
  }

  return env;
}

function harnessEnvSnapshot(env) {
  return {
    PLAYWRIGHT_BASE_URL: env.PLAYWRIGHT_BASE_URL,
    VISUAL_QA_SUBJECT: env.VISUAL_QA_SUBJECT,
    VISUAL_QA_SAMPLES_PER_GRADE: env.VISUAL_QA_SAMPLES_PER_GRADE,
    VISUAL_QA_MODE: env.VISUAL_QA_MODE,
    VISUAL_QA_USE_SECOND_STUDENT: env.VISUAL_QA_USE_SECOND_STUDENT ?? null,
    VISUAL_QA_OUTPUT_DIR: env.VISUAL_QA_OUTPUT_DIR,
    VISUAL_QA_SAMPLE_SEED: env.VISUAL_QA_SAMPLE_SEED,
    VISUAL_QA_GRADE_FILTER: env.VISUAL_QA_GRADE_FILTER ?? null,
    VISUAL_QA_ALLOW_MUTATIONS: env.VISUAL_QA_ALLOW_MUTATIONS ?? null,
  };
}

async function killProcessTree(child) {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      await execAsync(`taskkill /PID ${child.pid} /T /F`, { windowsHide: true });
    } else {
      process.kill(-child.pid, "SIGKILL");
    }
  } catch {
    try {
      child.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
}

async function findLatestScreenshot(screenshotDir) {
  try {
    const files = await readdir(screenshotDir);
    const pngs = files.filter((f) => f.endsWith(".png"));
    let latest = null;
    let latestMtime = 0;
    for (const name of pngs) {
      const full = join(screenshotDir, name);
      const st = await stat(full);
      if (st.mtimeMs > latestMtime) {
        latestMtime = st.mtimeMs;
        latest = full;
      }
    }
    return latest ? relative(REPO_ROOT, latest) : null;
  } catch {
    return null;
  }
}

async function writeBlockedDiagnostic(outAbs, payload) {
  const path = join(outAbs, "blocked-detail.json");
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return relative(REPO_ROOT, path);
}

function log(msg) {
  process.stderr.write(`${msg}\n`);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function makeRunId(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}`;
}

function parseSubjects() {
  const raw = String(process.env.VISUAL_QA_DEEP_SUBJECTS || "").trim();
  if (!raw) return [...DEFAULT_SUBJECTS];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseDeepEnv() {
  const subjects = parseSubjects();
  const rounds = Math.max(1, Number(process.env.VISUAL_QA_DEEP_ROUNDS || 2) || 2);
  const samplesPerGrade = Math.max(
    1,
    Number(process.env.VISUAL_QA_SAMPLES_PER_GRADE || 50) || 50
  );
  const runTimeoutMinutes = Math.max(
    1,
    Number(process.env.VISUAL_QA_RUN_TIMEOUT_MINUTES || 75) || 75
  );
  const preferredPort = Math.max(
    1024,
    Number(process.env.VISUAL_QA_DEEP_PORT || DEFAULT_DEEP_PORT) || DEFAULT_DEEP_PORT
  );
  const explicitBase = String(
    process.env.PLAYWRIGHT_BASE_URL || process.env.VISUAL_QA_BASE_URL || ""
  ).trim();
  if (explicitBase.includes(`:${BLOCKED_MANUAL_DEV_PORT}`)) {
    log(
      `NOTE: Deep QA ignores manual dev port ${BLOCKED_MANUAL_DEV_PORT} — using isolated VISUAL_QA_DEEP_PORT instead.`
    );
  }
  const runId = String(process.env.VISUAL_QA_DEEP_RUN_ID || makeRunId()).trim();
  const progressIntervalMinutes = Math.max(
    1,
    Number(process.env.VISUAL_QA_DEEP_PROGRESS_MINUTES || 10) || 10
  );
  const healthRetries = Math.max(
    1,
    Number(process.env.VISUAL_QA_DEEP_HEALTH_RETRIES || 8) || 8
  );
  const cooldownSec = Math.max(
    0,
    Number(process.env.VISUAL_QA_DEEP_COOLDOWN_SEC || 30) || 30
  );
  const recoveryRetries = Math.max(
    3,
    Number(process.env.VISUAL_QA_DEEP_RECOVERY_RETRIES || 8) || 8
  );
  const recoveryDelayMs = Math.max(
    3000,
    Number(process.env.VISUAL_QA_DEEP_RECOVERY_DELAY_MS || 8_000) || 8_000
  );
  const preRunRetries = Math.max(
    3,
    Number(process.env.VISUAL_QA_DEEP_PRERUN_RETRIES || 6) || 6
  );
  const recoveryMaxWallMs = Math.max(
    60_000,
    Number(process.env.VISUAL_QA_DEEP_RECOVERY_MAX_WALL_MS || 180_000) || 180_000
  );
  const preRunMaxWallMs = Math.max(
    45_000,
    Number(process.env.VISUAL_QA_DEEP_PRERUN_MAX_WALL_MS || 120_000) || 120_000
  );
  const diagnostic =
    process.env.VISUAL_QA_DEEP_DIAGNOSTIC === "1" ||
    process.env.VISUAL_QA_DEEP_DIAGNOSTIC === "true";
  const autoFullAfterDiagnostic =
    process.env.VISUAL_QA_DEEP_AUTO_FULL === "1" ||
    process.env.VISUAL_QA_DEEP_AUTO_FULL === "true";
  const autoRestartDev =
    process.env.VISUAL_QA_DEEP_AUTO_RESTART_DEV !== "0" &&
    process.env.VISUAL_QA_DEEP_AUTO_RESTART_DEV !== "false";
  const restartEachRun =
    process.env.VISUAL_QA_DEEP_RESTART_EACH_RUN !== "0" &&
    process.env.VISUAL_QA_DEEP_RESTART_EACH_RUN !== "false";
  const ownsDevServer =
    process.env.VISUAL_QA_DEEP_MANAGE_DEV !== "0" &&
    process.env.VISUAL_QA_DEEP_MANAGE_DEV !== "false";

  return {
    subjects,
    rounds,
    samplesPerGrade,
    runTimeoutMinutes,
    preferredPort,
    devHost: DEEP_DEV_HOST,
    baseUrl: null,
    port: null,
    runId,
    progressIntervalMs: progressIntervalMinutes * 60_000,
    runTimeoutMs: runTimeoutMinutes * 60_000,
    healthRetries,
    cooldownSec,
    recoveryRetries,
    recoveryDelayMs,
    preRunRetries,
    recoveryMaxWallMs,
    preRunMaxWallMs,
    loginTimeoutMs: Math.max(
      30_000,
      Number(process.env.VISUAL_QA_LOGIN_TIMEOUT_MS || 60_000) || 60_000
    ),
    autoRestartDev,
    restartEachRun,
    ownsDevServer,
    diagnostic,
    autoFullAfterDiagnostic,
  };
}

async function finalizeDeepConfig(cfg) {
  cfg.port = await resolveDeepPort(cfg.preferredPort);
  cfg.baseUrl = `http://${cfg.devHost}:${cfg.port}`;
  return cfg;
}

function roundDirName(round) {
  return `round-${String(round).padStart(2, "0")}`;
}

function runOutputRel(runId, round, subject, cohort, gradeNumber) {
  return join(
    "reports",
    "visual-qa-deep",
    runId,
    roundDirName(round),
    subject,
    cohort,
    `g${gradeNumber}`
  );
}

function sampleSeedFor(runId, round, subject, cohort, gradeNumber) {
  return `${runId}-r${round}-${subject}-${cohort}-g${gradeNumber}`;
}

function plannedSamplesPerGradeRun(samplesPerGrade) {
  return samplesPerGrade;
}

function issueKey(subject, sample, detail) {
  return [subject, sample.grade || "", sample.topic || "", detail].join("\0");
}

function extractIssueDetails(sample) {
  const details = sample?.issues?.details;
  if (Array.isArray(details) && details.length) return details;
  if (sample?.captureError) return [`sample capture failed: ${sample.captureError}`];
  return [];
}

async function readReportJson(reportPath) {
  try {
    const raw = await readFile(reportPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function summarizeRunReport(report, fallbackStatus) {
  if (!report) {
    return {
      status: fallbackStatus,
      samplesCompleted: 0,
      samplesWithIssues: 0,
      blockedCount: fallbackStatus === "BLOCKED" || fallbackStatus === "BLOCKED_TIMEOUT" ? 1 : 0,
    };
  }
  const status = report.status || fallbackStatus;
  const samplesCompleted = report.samples?.length || 0;
  const samplesWithIssues = report.issueSummary?.samplesWithIssues ?? 0;
  const blockedCount = status === "BLOCKED" || status === "BLOCKED_TIMEOUT" ? 1 : 0;
  return { status, samplesCompleted, samplesWithIssues, blockedCount };
}

function spawnHarnessRun({ env, timeoutMs }) {
  return new Promise((resolve) => {
    const chunks = [];
    const errChunks = [];
    let timedOut = false;
    let spawnError = null;

    let child;
    try {
      child = spawn(process.execPath, [HARNESS_PATH], {
        cwd: REPO_ROOT,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      resolve({
        exitCode: null,
        timedOut: false,
        spawnError: error?.message || String(error),
        stdout: "",
        stderr: "",
        childPid: null,
      });
      return;
    }

    const effectiveTimeoutMs = timeoutMs || Number(env.__RUN_TIMEOUT_MS) || 75 * 60_000;
    let killTimer = null;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => {
        killProcessTree(child).catch(() => {});
      }, 5000);
    }, effectiveTimeoutMs);

    child.stdout.on("data", (buf) => chunks.push(buf));
    child.stderr.on("data", (buf) => errChunks.push(buf));

    child.on("error", (error) => {
      spawnError = error?.message || String(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      const stdout = Buffer.concat(chunks).toString("utf8");
      const stderr = Buffer.concat(errChunks).toString("utf8");
      resolve({
        exitCode: code,
        timedOut,
        spawnError,
        stdout,
        stderr,
        childPid: child.pid ?? null,
      });
    });
  });
}

function mapExitToStatus(exitCode, timedOut, spawnError) {
  if (spawnError) return "RUNNER_FAILED";
  if (timedOut) return "BLOCKED_TIMEOUT";
  if (exitCode === 0) return "VISUAL_QA_PASS";
  if (exitCode === 2) return "BLOCKED";
  if (exitCode === 1) return "ISSUES_FOUND";
  if (exitCode == null) return "RUNNER_FAILED";
  return "ISSUES_FOUND";
}

function printProgress(state) {
  const {
    runId,
    currentRound,
    totalRounds,
    currentSubject,
    currentCohort,
    currentGrade,
    currentStatus,
    completedRuns,
    totalRuns,
    completedSamples,
    plannedSamples,
    issuesSoFar,
    blockedSoFar,
    startedAt,
  } = state;

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  const avgSecPerRun = completedRuns > 0 ? elapsedSec / completedRuns : null;
  const remainingRuns = totalRuns - completedRuns;
  const etaSec =
    avgSecPerRun != null ? Math.round(avgSecPerRun * remainingRuns) : null;

  log("");
  log("--- Visual QA Deep progress ---");
  log(`runId: ${runId}`);
  log(`round: ${currentRound}/${totalRounds}`);
  log(`subject: ${currentSubject || "(pending)"}`);
  log(`cohort: ${currentCohort || "(pending)"}`);
  log(`grade: ${currentGrade || "(pending)"}`);
  log(`last status: ${currentStatus || "(pending)"}`);
  log(`runs: ${completedRuns}/${totalRuns}`);
  log(`samples: ${completedSamples}/${plannedSamples}`);
  log(`issues so far: ${issuesSoFar}`);
  log(`blocked so far: ${blockedSoFar}`);
  log(`elapsed: ${elapsedSec}s`);
  if (etaSec != null) log(`estimated remaining: ${etaSec}s`);
  log("-------------------------------");
  log("");
}

function renderSummaryText(summary) {
  const lines = [
    "Visual QA Deep Nightly Summary",
    `runId: ${summary.runId}`,
    `status: ${summary.overallStatus}`,
    `startedAt: ${summary.startedAt}`,
    `finishedAt: ${summary.finishedAt}`,
    `durationSec: ${summary.durationSec}`,
    `baseUrl: ${summary.baseUrl}`,
    `subjects: ${summary.subjects.join(", ")}`,
    `rounds: ${summary.rounds}`,
    `samplesPerGrade: ${summary.samplesPerGrade}`,
    `totalPlannedSamples: ${summary.totalPlannedSamples}`,
    `totalCompletedSamples: ${summary.totalCompletedSamples}`,
    `totalIssues: ${summary.totalIssues}`,
    `totalBlocked: ${summary.totalBlocked}`,
    `totalPassedRuns: ${summary.totalPassedRuns}`,
    `totalIssueRuns: ${summary.totalIssueRuns}`,
    `totalBlockedRuns: ${summary.totalBlockedRuns}`,
    `runnerFailures: ${summary.runnerFailures}`,
    "",
    "=== Runs ===",
  ];

  for (const r of summary.runs) {
    lines.push(
      [
        `round ${r.round}`,
        r.subject,
        r.cohort,
        r.grade || "?",
        r.status,
        `exit=${r.exitCode ?? "null"}`,
        `samples=${r.samplesCompleted}`,
        `issues=${r.samplesWithIssues}`,
        `duration=${r.durationSec}s`,
        r.blockedReason ? `blocked=${String(r.blockedReason).slice(0, 80)}` : "",
        r.reportPath,
      ]
        .filter(Boolean)
        .join(" | ")
    );
  }

  lines.push("", "=== Top issues ===");
  for (const t of summary.topIssues) {
    lines.push(`${t.issueTitle} | count=${t.count} | subjects=${t.subjectsAffected.join(",")}`);
    if (t.exampleScreenshots?.length) {
      lines.push(`  screenshots: ${t.exampleScreenshots.slice(0, 3).join(", ")}`);
    }
  }

  lines.push("", "=== Grouped findings ===");
  for (const g of summary.groupedFindings) {
    lines.push(
      `${g.subject} / ${g.grade} / ${g.topic} / ${g.issueTitle} / ${g.count}`
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  let cfg = parseDeepEnv();
  try {
    cfg = await finalizeDeepConfig(cfg);
  } catch (error) {
    log(`RUNNER_FAILED: ${error.message}`);
    process.exit(3);
  }

  const deepRoot = join(REPO_ROOT, "reports", "visual-qa-deep", cfg.runId);
  await mkdir(deepRoot, { recursive: true });

  let runLock = null;
  try {
    runLock = await acquireDeepRunLock(cfg.runId);
  } catch (error) {
    log(`RUNNER_FAILED: ${error.message}`);
    process.exit(3);
  }

  let startupHealth;
  if (cfg.ownsDevServer) {
    startupHealth = await spawnOwnedDevServer(cfg);
  } else {
    startupHealth = await warmUpLoginRoute(cfg.baseUrl, { attempts: 4 }).then(() =>
      waitForInfraReady(cfg.baseUrl, cfg, { purpose: "startup" })
    );
  }
  if (!startupHealth.ok) {
    log("RUNNER_FAILED: app/login UI not ready before deep run started");
    log(JSON.stringify(startupHealth.attempts, null, 2));
    await releaseDeepRunLock(cfg.runId);
    if (cfg.ownsDevServer) await stopOwnedDevServer(cfg);
    process.exit(3);
  }

  log(`Deep QA isolated dev: ${cfg.baseUrl} (port ${cfg.port})`);

  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  const totalRuns = cfg.rounds * cfg.subjects.length * COHORTS.length * GRADES.length;
  const totalPlannedSamples = totalRuns * plannedSamplesPerGradeRun(cfg.samplesPerGrade);

  const manifest = {
    runId: cfg.runId,
    startedAt: startedAtIso,
    baseUrl: cfg.baseUrl,
    subjects: cfg.subjects,
    rounds: cfg.rounds,
    samplesPerGrade: cfg.samplesPerGrade,
    cohorts: COHORTS.map((c) => c.id),
    totalPlannedSamples,
    totalRuns,
    harnessPath: relative(REPO_ROOT, HARNESS_PATH),
    lockPath: relative(REPO_ROOT, DEEP_LOCK_PATH),
    deepPort: cfg.port,
    devHost: cfg.devHost,
    ownsDevServer: cfg.ownsDevServer,
    restartEachRun: cfg.restartEachRun,
    gradeLevelRuns: true,
    grades: GRADES.map((g) => `g${g}`),
    startupHealth: startupHealth.attempts,
  };

  await writeFile(join(deepRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const runRecords = [];
  const groupedMap = new Map();
  let completedRuns = 0;
  let completedSamples = 0;
  let issuesSoFar = 0;
  let blockedSoFar = 0;
  let runnerFailures = 0;

  let currentRound = 0;
  let currentSubject = "";
  let currentCohort = "";
  let currentStatus = "";
  let currentGrade = "";

  const progressTimer = setInterval(() => {
    printProgress({
      runId: cfg.runId,
      currentRound,
      totalRounds: cfg.rounds,
      currentSubject,
      currentCohort,
      currentGrade,
      currentStatus,
      completedRuns,
      totalRuns,
      completedSamples,
      plannedSamples: totalPlannedSamples,
      issuesSoFar,
      blockedSoFar,
      startedAt,
    });
  }, cfg.progressIntervalMs);

  log(`Visual QA Deep runId=${cfg.runId}`);
  log(`Planned: ${totalRuns} grade-level harness runs, ${totalPlannedSamples} samples`);
  log(`Output: ${relative(REPO_ROOT, deepRoot)}`);

  for (let round = 1; round <= cfg.rounds; round += 1) {
    currentRound = round;
    for (const subject of cfg.subjects) {
      currentSubject = subject;
      for (const cohort of COHORTS) {
        currentCohort = cohort.id;
        for (const gradeNumber of GRADES) {
          currentGrade = `g${gradeNumber}`;
          const outRel = runOutputRel(cfg.runId, round, subject, cohort.id, gradeNumber);
          const outAbs = join(REPO_ROOT, outRel);
          await mkdir(outAbs, { recursive: true });

          const sampleSeed = sampleSeedFor(cfg.runId, round, subject, cohort.id, gradeNumber);
          const logPath = join(outAbs, "run.log");
          const reportJsonPath = join(outAbs, "visual-qa-report.json");
          const reportTxtPath = join(outAbs, "visual-qa-report.txt");
          const screenshotsPath = join(outRel, "screenshots");
          const screenshotAbsDir = join(outAbs, "screenshots");
          const gradeKey = `g${gradeNumber}`;

          const harnessEnv = buildCleanHarnessEnv(cfg, {
            subject,
            cohort,
            outRel,
            sampleSeed,
            gradeNumber,
          });
          const envSnapshot = harnessEnvSnapshot(harnessEnv);

          log(
            `[${completedRuns + 1}/${totalRuns}] round ${round} ${subject} ${cohort.id} g${gradeNumber} seed=${sampleSeed}`
          );

          if (cfg.restartEachRun && completedRuns > 0 && cfg.ownsDevServer) {
            log(`  pre-run dev refresh (${completedRuns + 1}/${totalRuns})…`);
            const refresh = await restartDevServer(cfg);
            log(`  pre-run dev refresh: ok=${refresh.ok}`);
          }

          let preRunHealth = await waitForInfraReady(cfg.baseUrl, cfg, { purpose: "pre-run" });
          if (!preRunHealth.ok && cfg.autoRestartDev) {
            log("  pre-run infra not ready — restarting dev server…");
            preRunHealth = await restartDevServer(cfg);
          }
          const preRunHealthOk = preRunHealth.ok;

          const runStarted = Date.now();
          let result;
          let report = null;
          let status;
          let blockedDetailPath = null;

          if (!preRunHealthOk) {
            status = "BLOCKED";
            result = {
              exitCode: 2,
              timedOut: false,
              spawnError: null,
              stdout: "",
              stderr: "wrapper: pre-run health check failed — dev server not responding",
              childPid: null,
            };
            report = {
              status: "BLOCKED",
              generatedAt: new Date().toISOString(),
              baseUrl: cfg.baseUrl,
              subject,
              gradeFilter: gradeNumber,
              blocked: {
                route: `${cfg.baseUrl}/student/login`,
                account: "(wrapper pre-run health)",
                missingEnv: ["dev server not responding at pre-run health check"],
                supabaseHint: `Ensure Deep QA dev on port ${cfg.port} is healthy; wrapper restarts isolated dev automatically.`,
                whatYouNeed: "Wrapper blocked harness spawn until server responds.",
                healthAttempts: preRunHealth.attempts,
              },
            };
            await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
          } else {
            try {
              result = await spawnHarnessRun({
                env: harnessEnv,
                timeoutMs: cfg.runTimeoutMs,
              });
            } catch (error) {
              result = {
                exitCode: null,
                timedOut: false,
                spawnError: error?.message || String(error),
                stdout: "",
                stderr: "",
                childPid: null,
              };
            }
          }

          const runDurationSec = Math.round((Date.now() - runStarted) / 1000);
          if (!report) {
            report = await readReportJson(reportJsonPath);
          }

          const logBody = [
            `# Visual QA Deep harness run (grade-level)`,
            `runId=${cfg.runId}`,
            `round=${round}`,
            `subject=${subject}`,
            `cohort=${cohort.id}`,
            `grade=${gradeKey}`,
            `sampleSeed=${sampleSeed}`,
            `exitCode=${result.exitCode}`,
            `timedOut=${result.timedOut}`,
            `spawnError=${result.spawnError || ""}`,
            `childPid=${result.childPid ?? ""}`,
            `durationSec=${runDurationSec}`,
            `preRunHealthOk=${preRunHealthOk}`,
            "",
            "=== pre-run infra attempts ===",
            JSON.stringify(preRunHealth.attempts, null, 2),
            "",
            "=== harness env (effective) ===",
            JSON.stringify(envSnapshot, null, 2),
            "",
            "=== stdout ===",
            result.stdout || "",
            "",
            "=== stderr ===",
            result.stderr || "",
          ].join("\n");
          await writeFile(logPath, logBody, "utf8");

          status = mapExitToStatus(result.exitCode, result.timedOut, result.spawnError);
          if (result.spawnError) {
            runnerFailures += 1;
          }

          if (report?.status) {
            status = result.timedOut ? "BLOCKED_TIMEOUT" : report.status;
          }

          const latestScreenshot = await findLatestScreenshot(screenshotAbsDir);
          const blockedReason =
            report?.blocked?.whatYouNeed ||
            report?.blocked?.detail ||
            (result.timedOut ? "wrapper timeout" : null);

          if (
            cfg.diagnostic ||
            status === "BLOCKED" ||
            status === "BLOCKED_TIMEOUT" ||
            result.spawnError
          ) {
            blockedDetailPath = await writeBlockedDiagnostic(outAbs, {
              runId: cfg.runId,
              round,
              subject,
              cohort: cohort.id,
              grade: gradeKey,
              gradeNumber,
              status,
              exitCode: result.exitCode,
              timedOut: result.timedOut,
              spawnError: result.spawnError || null,
              durationSec: runDurationSec,
              env: envSnapshot,
              preRunHealth: preRunHealth.attempts,
              blocked: report?.blocked || null,
              blockedReason,
              reportPath: report ? relative(REPO_ROOT, reportJsonPath) : null,
              reportExists: Boolean(report),
              logPath: relative(REPO_ROOT, logPath),
              latestScreenshot,
              stderrTail: (result.stderr || "").slice(-4000),
              stdoutTail: (result.stdout || "").slice(-4000),
            });
            log(`  blocked-detail: ${blockedDetailPath}`);
            if (blockedReason) log(`  blocked-reason: ${String(blockedReason).slice(0, 240)}`);
          }

          const needsRecovery =
            result.timedOut || status === "BLOCKED" || status === "BLOCKED_TIMEOUT";
          if (needsRecovery) {
            log(`  recovering infra after ${status} (${runDurationSec}s)…`);
            let recovery = await waitForInfraReady(cfg.baseUrl, cfg, { purpose: "recovery" });
            log(`  recovery: ok=${recovery.ok} attempts=${recovery.attempts.length}`);
            if (!recovery.ok) {
              log("  extended recovery: cool-down 90s + warm-up + startup probe…");
              await sleep(90_000);
              await warmUpLoginRoute(cfg.baseUrl, { attempts: 6 });
              recovery = await waitForInfraReady(cfg.baseUrl, cfg, { purpose: "startup" });
              log(`  extended recovery: ok=${recovery.ok} attempts=${recovery.attempts.length}`);
            }
            if (!recovery.ok && cfg.autoRestartDev) {
              recovery = await restartDevServer(cfg);
              log(`  dev restart recovery: ok=${recovery.ok} attempts=${recovery.attempts.length}`);
            }
          } else if (runDurationSec >= 30 || status === "VISUAL_QA_PASS" || status === "ISSUES_FOUND") {
            await sleep(cfg.cooldownSec * 1000);
          }

          const runSummary = summarizeRunReport(report, status);
          completedSamples += runSummary.samplesCompleted;
          issuesSoFar += runSummary.samplesWithIssues;
          if (runSummary.blockedCount || status === "BLOCKED" || status === "BLOCKED_TIMEOUT") {
            blockedSoFar += 1;
          }

          if (report?.samples?.length) {
            for (const sample of report.samples) {
              for (const detail of extractIssueDetails(sample)) {
                const key = issueKey(subject, sample, detail);
                const prev = groupedMap.get(key) || {
                  subject,
                  cohort: cohort.id,
                  grade: sample.grade || gradeKey,
                  topic: sample.topic || "",
                  issueTitle: detail,
                  issueCode: detail,
                  count: 0,
                  examples: [],
                  screenshots: [],
                };
                prev.count += 1;
                if (prev.examples.length < 5) {
                  prev.examples.push({
                    questionText: (sample.questionText || "").slice(0, 200),
                    studentLabel: sample.studentLabel,
                    topicDisplay: sample.topicDisplay,
                  });
                }
                if (sample.screenshotPath && prev.screenshots.length < 5) {
                  prev.screenshots.push(sample.screenshotPath);
                }
                groupedMap.set(key, prev);
              }
            }
          }

          if (status === "BLOCKED" && report?.blocked && !report.samples?.length) {
            const detail = report.blocked.whatYouNeed || report.blocked.detail || "blocked";
            const key = issueKey(subject, { grade: gradeKey, topic: "?" }, `BLOCKED: ${detail}`);
            const prev = groupedMap.get(key) || {
              subject,
              cohort: cohort.id,
              grade: gradeKey,
              topic: "?",
              issueTitle: `BLOCKED: ${detail}`,
              issueCode: "BLOCKED",
              count: 0,
              examples: [{ blocked: report.blocked }],
              screenshots: [],
            };
            prev.count += 1;
            groupedMap.set(key, prev);
          }

          if (status === "BLOCKED_TIMEOUT") {
            const key = issueKey(subject, { grade: gradeKey, topic: "?" }, "BLOCKED_TIMEOUT");
            const prev = groupedMap.get(key) || {
              subject,
              cohort: cohort.id,
              grade: gradeKey,
              topic: "?",
              issueTitle: "BLOCKED_TIMEOUT",
              issueCode: "BLOCKED_TIMEOUT",
              count: 0,
              examples: [],
              screenshots: [],
            };
            prev.count += 1;
            groupedMap.set(key, prev);
          }

          const runRecord = {
            round,
            subject,
            cohort: cohort.id,
            grade: gradeKey,
            gradeNumber,
            sampleSeed,
            status,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            spawnError: result.spawnError || null,
            samplesCompleted: runSummary.samplesCompleted,
            samplesWithIssues: runSummary.samplesWithIssues,
            blockedCount: runSummary.blockedCount,
            durationSec: runDurationSec,
            reportPath: relative(REPO_ROOT, reportJsonPath),
            reportTxtPath: relative(REPO_ROOT, reportTxtPath),
            logPath: relative(REPO_ROOT, logPath),
            screenshotsPath,
            blockedDetailPath,
            blockedReason,
            preRunHealthOk,
            preRunHealthAttempts: preRunHealth.attempts,
            latestScreenshot,
          };

          runRecords.push(runRecord);
          completedRuns += 1;
          currentStatus = status;

          log(
            `  → ${status} exit=${result.exitCode} samples=${runSummary.samplesCompleted} issues=${runSummary.samplesWithIssues} (${runDurationSec}s)`
          );

          printProgress({
            runId: cfg.runId,
            currentRound,
            totalRounds: cfg.rounds,
            currentSubject,
            currentCohort,
            currentGrade,
            currentStatus,
            completedRuns,
            totalRuns,
            completedSamples,
            plannedSamples: totalPlannedSamples,
            issuesSoFar,
            blockedSoFar,
            startedAt,
          });
        }
      }
    }
  }

  clearInterval(progressTimer);

  const finishedAt = Date.now();
  const finishedAtIso = new Date(finishedAt).toISOString();
  const durationSec = Math.round((finishedAt - startedAt) / 1000);

  const totalPassedRuns = runRecords.filter((r) => r.status === "VISUAL_QA_PASS").length;
  const totalIssueRuns = runRecords.filter((r) => r.status === "ISSUES_FOUND").length;
  const totalBlockedRuns = runRecords.filter(
    (r) => r.status === "BLOCKED" || r.status === "BLOCKED_TIMEOUT"
  ).length;

  const groupedFindings = [...groupedMap.values()].sort((a, b) => b.count - a.count);

  const topIssueMap = new Map();
  for (const g of groupedFindings) {
    const prev = topIssueMap.get(g.issueTitle) || {
      issueTitle: g.issueTitle,
      count: 0,
      subjectsAffected: new Set(),
      gradesAffected: new Set(),
      exampleScreenshots: [],
    };
    prev.count += g.count;
    prev.subjectsAffected.add(g.subject);
    if (g.grade) prev.gradesAffected.add(g.grade);
    for (const shot of g.screenshots) {
      if (prev.exampleScreenshots.length < 5) prev.exampleScreenshots.push(shot);
    }
    topIssueMap.set(g.issueTitle, prev);
  }

  const topIssues = [...topIssueMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((t) => ({
      issueTitle: t.issueTitle,
      count: t.count,
      subjectsAffected: [...t.subjectsAffected],
      gradesAffected: [...t.gradesAffected],
      exampleScreenshots: t.exampleScreenshots,
    }));

  const overallStatus = runnerFailures
    ? "RUNNER_FAILED"
    : totalBlockedRuns
      ? "BLOCKED"
      : issuesSoFar
        ? "ISSUES_FOUND"
        : "VISUAL_QA_PASS";

  const summary = {
    runId: cfg.runId,
    startedAt: startedAtIso,
    finishedAt: finishedAtIso,
    durationSec,
    baseUrl: cfg.baseUrl,
    subjects: cfg.subjects,
    rounds: cfg.rounds,
    samplesPerGrade: cfg.samplesPerGrade,
    totalPlannedSamples,
    totalCompletedSamples: completedSamples,
    totalIssues: issuesSoFar,
    totalBlocked: blockedSoFar,
    totalPassedRuns,
    totalIssueRuns,
    totalBlockedRuns,
    runnerFailures,
    overallStatus,
    gradeLevelRuns: true,
    runs: runRecords,
    groupedFindings,
    topIssues,
    manifestPath: relative(REPO_ROOT, join(deepRoot, "manifest.json")),
  };

  const summaryJsonPath = join(deepRoot, "summary.json");
  const summaryTxtPath = join(deepRoot, "summary.txt");
  await writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(summaryTxtPath, renderSummaryText(summary), "utf8");

  log("");
  log(`Deep Visual QA finished: ${overallStatus}`);
  log(`Summary: ${relative(REPO_ROOT, summaryJsonPath)}`);
  log(`Duration: ${durationSec}s | samples ${completedSamples}/${totalPlannedSamples} | issues ${issuesSoFar}`);

  const perRunPlanned = plannedSamplesPerGradeRun(cfg.samplesPerGrade);
  const diagOk = diagnosticRunPassed(summary, perRunPlanned);
  summary.diagnosticPassed = cfg.diagnostic ? diagOk : undefined;
  await writeFile(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  await releaseDeepRunLock(cfg.runId);

  const willChainFull =
    cfg.diagnostic &&
    process.env.VISUAL_QA_DEEP_CHAIN_FULL === "1" &&
    diagOk &&
    !runnerFailures;

  if (!willChainFull && cfg.ownsDevServer) {
    await stopOwnedDevServer(cfg);
  }

  if (willChainFull) {
    log("");
    log("Diagnostic passed — chaining full deep run (50/grade × 2 rounds)…");
    if (cfg.ownsDevServer) await stopOwnedDevServer(cfg);
    const fullRunId = makeRunId();
    const fullEnv = { ...process.env };
    for (const key of VISUAL_QA_ENV_KEYS) delete fullEnv[key];
    delete fullEnv.VISUAL_QA_DEEP_DIAGNOSTIC;
    delete fullEnv.VISUAL_QA_DEEP_CHAIN_FULL;
    delete fullEnv.VISUAL_QA_DEEP_AUTO_FULL;
    fullEnv.VISUAL_QA_DEEP_PORT = String(cfg.port);
    fullEnv.PLAYWRIGHT_BASE_URL = cfg.baseUrl;
    fullEnv.VISUAL_QA_BASE_URL = cfg.baseUrl;
    fullEnv.VISUAL_QA_DEEP_SUBJECTS = cfg.subjects.join(",");
    fullEnv.VISUAL_QA_SAMPLES_PER_GRADE = "50";
    fullEnv.VISUAL_QA_DEEP_ROUNDS = "2";
    fullEnv.VISUAL_QA_RUN_TIMEOUT_MINUTES = "75";
    fullEnv.VISUAL_QA_DEEP_RUN_ID = fullRunId;
    fullEnv.VISUAL_QA_DEEP_COOLDOWN_SEC = "30";
    fullEnv.VISUAL_QA_DEEP_RECOVERY_RETRIES = "8";
    fullEnv.VISUAL_QA_LOGIN_TIMEOUT_MS = String(cfg.loginTimeoutMs);

    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [SELF_PATH], {
        cwd: REPO_ROOT,
        env: fullEnv,
        stdio: "inherit",
        windowsHide: true,
      });
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });
    return;
  }

  if (cfg.diagnostic && process.env.VISUAL_QA_DEEP_CHAIN_FULL === "1" && !diagOk) {
    log("Diagnostic failed — full deep run NOT started.");
  }

  process.exit(runnerFailures ? 3 : 0);
}

main().catch(async (error) => {
  log(`RUNNER_FAILED: ${error?.message || error}`);
  try {
    const runId = String(process.env.VISUAL_QA_DEEP_RUN_ID || "").trim();
    if (runId) await releaseDeepRunLock(runId);
    const port = Number(process.env.VISUAL_QA_DEEP_PORT || DEFAULT_DEEP_PORT);
    await killQaOwnedDevOnPort(port);
  } catch {
    /* ignore */
  }
  process.exit(3);
});
