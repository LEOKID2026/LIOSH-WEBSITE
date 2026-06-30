/**
 * Start `next dev -p 3002`, wait for core manifests, probe a safe route, then
 * signal that the browser / deep routes are safe. Used after a full .next delete.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = String(process.env.PORT || "3002").trim() || "3002";
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OPEN_BROWSER = process.argv.includes("--open-browser");

const MANIFESTS = [
  ".next/routes-manifest.json",
  ".next/server/middleware-manifest.json",
];

async function waitForFile(relPath, timeoutMs = 180_000) {
  const fullPath = path.join(ROOT, relPath);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return false;
}

async function probeRoute(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0 && res.status < 500) return true;
    } catch {
      // Server still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
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

let readySeen = false;
let warmupStarted = false;

async function runWarmup() {
  if (warmupStarted) return;
  warmupStarted = true;

  console.log("");
  console.log("[WARMUP] Cold start: waiting for Next.js manifest files...");
  console.log("[WARMUP] Do not open /learning/book/... or API routes until warmup completes.");
  console.log("");

  for (const relPath of MANIFESTS) {
    const ok = await waitForFile(relPath);
    if (!ok) {
      console.error(`[WARMUP] Timeout waiting for ${relPath}`);
      return;
    }
    console.log(`[WARMUP] Found ${relPath}`);
  }

  console.log(`[WARMUP] Probing ${BASE_URL}/student/login ...`);
  const loginOk = await probeRoute(`${BASE_URL}/student/login`);
  if (!loginOk) {
    console.warn("[WARMUP] Login probe did not succeed yet — wait before opening deep routes.");
    return;
  }

  const deepRoute = "/learning/book/math/g2/cmp";
  console.log(`[WARMUP] Probing ${BASE_URL}${deepRoute} ...`);
  const deepOk = await probeRoute(`${BASE_URL}${deepRoute}`);
  if (!deepOk) {
    console.warn(`[WARMUP] Deep route probe failed — wait before relying on ${deepRoute}.`);
    return;
  }

  console.log("");
  console.log("[OK] Server fully warmed — safe to open browser and deep routes.");
  console.log(`     ${BASE_URL}`);
  console.log("");

  if (OPEN_BROWSER) {
    openBrowserTab(BASE_URL);
  }
}

const child = spawn("npm", ["run", "dev:run-button"], {
  cwd: ROOT,
  stdio: ["inherit", "pipe", "pipe"],
  shell: true,
  env: process.env,
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  const text = chunk.toString();
  if (!readySeen && /Ready in/i.test(text)) {
    readySeen = true;
    runWarmup().catch((err) => {
      console.error("[WARMUP] Failed:", err?.message || err);
    });
  }
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  const text = chunk.toString();
  if (!readySeen && /Ready in/i.test(text)) {
    readySeen = true;
    runWarmup().catch((err) => {
      console.error("[WARMUP] Failed:", err?.message || err);
    });
  }
});

function shutdown(signal) {
  if (!child.killed) child.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
