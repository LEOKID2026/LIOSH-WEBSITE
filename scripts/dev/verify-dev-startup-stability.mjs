/**
 * Realistic dev startup verification (mirrors run.bat via start-dev-3002.mjs):
 * - auto-clean test for incomplete .next
 * - 5 consecutive restarts with simulated open tab on /learning/book/math/g2/cmp
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MANIFESTS, manifestsOk, removeNextDir, sleep } from "./run-dev-3002-start.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = "3002";
const BASE = `http://127.0.0.1:${PORT}`;
const DEEP_ROUTE = "/learning/book/math/g2/cmp";
const CYCLES = 5;

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
  await sleep(4000);
}

function spawnRunBatDev() {
  return spawn("node", ["scripts/dev/start-dev-3002.mjs"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: process.env,
  });
}

async function waitForWarmupMessage(child, timeoutMs = 600_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for warmup")), timeoutMs);
    const serverIssues = [];
    const onData = (chunk) => {
      process.stdout.write(chunk);
      const text = chunk.toString();
      if (
        /MODULE_NOT_FOUND|ENOENT/i.test(text) &&
        !/\[WARMUP\]/i.test(text) &&
        !/Server fully warmed/i.test(text)
      ) {
        serverIssues.push(text.trim());
      }
      if (/Server fully warmed/i.test(text)) {
        clearTimeout(timer);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        if (serverIssues.length) reject(new Error(serverIssues.join(" | ")));
        else resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
  });
}

async function stopDevTree(child) {
  if (child && !child.killed && process.platform === "win32" && child.pid) {
    await new Promise((resolve) => {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }).on(
        "exit",
        () => resolve()
      );
    });
  } else if (child && !child.killed) {
    child.kill("SIGTERM");
  }
  await killPort3002();
  await sleep(2000);
}

function startSimulatedBrowserTab(stopSignal) {
  const hits = [];
  let running = true;
  stopSignal.addEventListener("abort", () => {
    running = false;
  });
  (async () => {
    while (running && !stopSignal.aborted) {
      const at = Date.now();
      try {
        const res = await fetch(`${BASE}${DEEP_ROUTE}`, { redirect: "manual" });
        const body = await res.text().catch(() => "");
        hits.push({ at, status: res.status, serverError: res.status >= 500 });
        if (/MODULE_NOT_FOUND|ENOENT|middleware-manifest|routes-manifest/i.test(body)) {
          hits[hits.length - 1].manifestError = true;
        }
      } catch (err) {
        hits.push({ at, status: 0, connectionError: String(err?.message || err) });
      }
      await sleep(350);
    }
  })();
  return hits;
}

async function ensureInitialHealthyServer() {
  await killPort3002();
  if (manifestsOk()) return;
  console.log("[SETUP] Bootstrapping healthy .next via run.bat logic...");
  await removeNextDir();
  const child = spawnRunBatDev();
  try {
    await waitForWarmupMessage(child);
  } finally {
    await stopDevTree(child);
  }
  if (!manifestsOk()) throw new Error("Setup failed — manifests missing");
}

async function testIncompleteNextAutoClean() {
  console.log("\n=== Auto-clean test: incomplete .next + open deep-route tab ===\n");
  await killPort3002();
  if (!manifestsOk()) await ensureInitialHealthyServer();

  let child = spawnRunBatDev();
  await waitForWarmupMessage(child);
  const tabStop = new AbortController();
  const tabHits = startSimulatedBrowserTab(tabStop.signal);
  await sleep(1500);
  await stopDevTree(child);

  if (fs.existsSync(path.join(ROOT, ".next", "routes-manifest.json"))) {
    fs.unlinkSync(path.join(ROOT, ".next", "routes-manifest.json"));
    console.log("[TEST] Simulated incomplete .next (removed routes-manifest.json).");
  }

  const recoveryStartedAt = Date.now();
  child = spawnRunBatDev();
  await waitForWarmupMessage(child);
  tabStop.abort();
  await sleep(500);

  const bad = tabHits.filter(
    (h) =>
      h.at >= recoveryStartedAt &&
      (h.serverError || h.manifestError)
  );
  await stopDevTree(child);
  if (bad.length) throw new Error("Auto-clean test failed — errors during recovery");
  console.log("Auto-clean test OK.");
}

async function runCycle(cycle) {
  console.log(`\n=== Cycle ${cycle}/${CYCLES}: run.bat restart with open deep-route tab ===\n`);
  await killPort3002();

  let child = spawnRunBatDev();
  await waitForWarmupMessage(child);

  const tabStop = new AbortController();
  const tabHits = startSimulatedBrowserTab(tabStop.signal);
  await sleep(2000);

  await stopDevTree(child);
  await sleep(1500);

  const recoveryStartedAt = Date.now();
  child = spawnRunBatDev();
  await waitForWarmupMessage(child);
  await sleep(2000);
  tabStop.abort();

  const bad = tabHits.filter(
    (h) =>
      h.at >= recoveryStartedAt &&
      (h.serverError || h.manifestError)
  );
  await stopDevTree(child);

  if (bad.length) {
    console.error("Recovery errors:", bad);
    throw new Error(`Cycle ${cycle}: 500/ENOENT/MODULE_NOT_FOUND during recovery`);
  }
  console.log(`Cycle ${cycle} OK.`);
}

async function main() {
  console.log("Dev startup stability verification (run.bat / start-dev-3002.mjs)");
  await ensureInitialHealthyServer();
  await testIncompleteNextAutoClean();
  for (let i = 1; i <= CYCLES; i += 1) await runCycle(i);
  console.log(`\n[PASS] Auto-clean + ${CYCLES} run.bat restart cycles passed.`);
}

main().catch(async (err) => {
  console.error("\n[FAIL]", err?.message || err);
  await killPort3002();
  process.exit(1);
});
