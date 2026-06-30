/**
 * Unified dev start for port 3002 (used by run.bat):
 * - If .next manifests are missing: delete .next and cold bootstrap.
 * - If healthy: keep .next intact (no cache delete) and warm before browser/deep routes.
 * - Retries once with full clean bootstrap if warmup fails.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = process.env.PORT || "3002";
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OPEN_BROWSER = process.argv.includes("--open-browser");

const MANIFESTS = [
  ".next/routes-manifest.json",
  ".next/server/middleware-manifest.json",
];

function manifestsOk() {
  return MANIFESTS.every((rel) => fs.existsSync(path.join(ROOT, rel)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function killPort3002() {
  if (process.platform !== "win32") return;
  await new Promise((resolve) => {
    spawn(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: "ignore" }
    ).on("exit", () => resolve());
  });
  await sleep(3000);
}

async function removeNextDir() {
  const nextDir = path.join(ROOT, ".next");
  if (!fs.existsSync(nextDir)) return;
  await sleep(2000);
  let lastError = null;
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      await sleep(1000);
      return;
    } catch (err) {
      lastError = err;
      await sleep(1000);
    }
  }
  throw lastError ?? new Error("Failed to remove .next");
}

async function waitForFile(relPath, timeoutMs = 180_000) {
  const fullPath = path.join(ROOT, relPath);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(fullPath)) return true;
    await sleep(500);
  }
  return false;
}

async function probeRoute(url, timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!manifestsOk()) return false;
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0 && res.status < 500) return true;
    } catch {
      // still booting
    }
    await sleep(1000);
  }
  return false;
}

function openBrowserTab(url) {
  spawn("cmd", ["/c", "start", "", url], {
    cwd: ROOT,
    stdio: "ignore",
    detached: true,
  }).unref();
}

async function runWarmup(label) {
  console.log("");
  console.log(`[WARMUP] ${label}`);
  console.log("[WARMUP] Waiting for Next.js manifest files...");

  for (const relPath of MANIFESTS) {
    const ok = await waitForFile(relPath);
    if (!ok || !manifestsOk()) throw new Error(`manifest-missing:${relPath}`);
    console.log(`[WARMUP] Found ${relPath}`);
  }

  for (const url of [`${BASE_URL}/student/login`, `${BASE_URL}/learning/book/math/g2/cmp`]) {
    if (!manifestsOk()) throw new Error("manifest-missing:before-probe");
    console.log(`[WARMUP] Probing ${url} ...`);
    if (!(await probeRoute(url))) throw new Error(`probe-failed:${url}`);
  }

  console.log("");
  console.log("[OK] Server fully warmed — safe for open browser tabs and deep routes.");
  console.log(`     ${BASE_URL}`);
  console.log("");
  if (OPEN_BROWSER) openBrowserTab(BASE_URL);
}

function startDevServer() {
  return spawn("npm", ["run", "dev:run-button"], {
    cwd: ROOT,
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
    env: process.env,
  });
}

async function runDevAttempt(forceClean) {
  await killPort3002();

  if (forceClean || !manifestsOk()) {
    console.log("[WARN] .next is incomplete — running clean bootstrap");
    console.log("[WARN] Close localhost:3002 tabs before starting dev server if warmup fails.");
    await removeNextDir();
  } else {
    console.log("[OK] .next manifests healthy — starting dev server (keeping .next intact).");
  }

  const child = startDevServer();

  await new Promise((resolve, reject) => {
    const readyTimer = setTimeout(() => reject(new Error("Timeout waiting for Ready")), 180_000);
    let readySeen = false;

    const onReady = () => {
      if (readySeen) return;
      readySeen = true;
      clearTimeout(readyTimer);
      runWarmup("Server Ready — validating manifests and routes.").then(resolve).catch(reject);
    };

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      if (/Ready in/i.test(chunk.toString())) onReady();
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      if (/Ready in/i.test(chunk.toString())) onReady();
    });
    child.on("exit", (code) => {
      clearTimeout(readyTimer);
      reject(new Error(`Dev server exited early (${code ?? "signal"})`));
    });
  });

  return child;
}

async function main() {
  let child = null;
  try {
    child = await runDevAttempt(false);
  } catch (firstErr) {
    console.log("");
    console.log("[WARN] Warmup failed — retrying once with clean bootstrap...");
    console.log(`[WARN] Reason: ${String(firstErr?.message || firstErr)}`);
    if (child && !child.killed) child.kill("SIGTERM");
    await killPort3002();
    child = await runDevAttempt(true);
  }

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });

  process.on("SIGINT", () => {
    if (child && !child.killed) child.kill("SIGINT");
  });
  process.on("SIGTERM", () => {
    if (child && !child.killed) child.kill("SIGTERM");
  });
}

main().catch(async (err) => {
  console.error("[start-dev-3002] Failed:", err?.message || err);
  await killPort3002();
  process.exit(1);
});
