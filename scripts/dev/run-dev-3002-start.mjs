/**
 * Mirrors run.bat dev start: health check, auto clean bootstrap, or normal dev.
 * Used by verify-dev-startup-stability.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const MANIFESTS = [
  ".next/routes-manifest.json",
  ".next/server/middleware-manifest.json",
];

export function manifestsOk() {
  return MANIFESTS.every((rel) => fs.existsSync(path.join(ROOT, rel)));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function removeNextDir() {
  const nextDir = path.join(ROOT, ".next");
  if (!fs.existsSync(nextDir)) return;

  let lastError = null;
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      return;
    } catch (err) {
      lastError = err;
      await sleep(1000);
    }
  }
  throw lastError ?? new Error("Failed to remove .next");
}

export async function waitForManifests(timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (manifestsOk()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export function spawnNormalDev() {
  return spawn("npm", ["run", "dev:run-button"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: process.env,
  });
}

export function spawnWarmupDev() {
  return spawn("node", ["scripts/dev/start-dev-3002-warmup.mjs"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: process.env,
  });
}

export async function waitForReady(child, timeoutMs = 180_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for Ready")), timeoutMs);
    const onData = (chunk) => {
      if (/Ready in/i.test(chunk.toString())) {
        clearTimeout(timer);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
  });
}

export async function waitForWarmupComplete(child, timeoutMs = 300_000) {
  const deepUrl = `http://127.0.0.1:${process.env.PORT || "3002"}/learning/book/math/g2/cmp`;

  const messagePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("warmup-message-timeout")), timeoutMs);
    const onData = (chunk) => {
      if (/Server fully warmed/i.test(chunk.toString())) {
        clearTimeout(timer);
        child.stdout?.off("data", onData);
        child.stderr?.off("data", onData);
        resolve();
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
  });

  const probePromise = (async () => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (manifestsOk()) {
        try {
          const res = await fetch(deepUrl, { redirect: "manual" });
          if (res.status > 0 && res.status < 500) return;
        } catch {
          // keep waiting
        }
      }
      await sleep(2000);
    }
    throw new Error("warmup-probe-timeout");
  })();

  try {
    await Promise.race([messagePromise, probePromise]);
  } catch (err) {
    if (manifestsOk()) {
      try {
        const res = await fetch(deepUrl, { redirect: "manual" });
        if (res.status > 0 && res.status < 500) return;
      } catch {
        // fall through
      }
    }
    throw new Error("Timeout waiting for warmup");
  }
}

/**
 * Same decision tree as run.bat after port is free.
 * @returns {{ child: import('child_process').ChildProcess, mode: 'normal' | 'clean-bootstrap' }}
 */
export async function startDevLikeRunBat({ killPortFirst = false } = {}) {
  if (!manifestsOk()) {
    console.log("[WARN] .next is incomplete — running clean bootstrap");
    if (killPortFirst && process.platform === "win32") {
      await new Promise((resolve) => {
        spawn(
          "powershell",
          [
            "-NoProfile",
            "-Command",
            "Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }",
          ],
          { stdio: "ignore" }
        ).on("exit", () => resolve());
      });
      await sleep(4000);
    }
    await removeNextDir();
    const child = spawnWarmupDev();
    await waitForWarmupComplete(child);
    return { child, mode: "clean-bootstrap" };
  }

  console.log("[OK] .next manifests healthy — starting dev server (keeping .next intact).");
  const child = spawnNormalDev();
  await waitForReady(child);
  const ok = await waitForManifests();
  if (!ok) throw new Error("Manifests missing after normal dev Ready");
  return { child, mode: "normal" };
}

export function attachServerLogWatch(child, onIssue) {
  const scan = (chunk) => {
    const text = chunk.toString();
    if (/MODULE_NOT_FOUND|ENOENT|routes-manifest\.json|middleware-manifest\.json/i.test(text)) {
      onIssue(text.trim());
    }
  };
  child.stdout?.on("data", scan);
  child.stderr?.on("data", scan);
  return () => {
    child.stdout?.off("data", scan);
    child.stderr?.off("data", scan);
  };
}
