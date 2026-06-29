#!/usr/bin/env node
/**
 * Production build orchestrator:
 * 1. Cleans stale .next (Windows race / partial artifacts).
 * 2. Runs `next build`.
 * 3. Retries once after a clean only for transient PageNotFoundError
 *    ("Cannot find module for page"). Any other prerender failure, or a second
 *    consecutive PageNotFoundError after the retry, exits non-zero (build FAIL).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_DIR = path.join(ROOT, ".next");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const PRERENDER_RETRY_MARKERS = [
  "Cannot find module for page",
  "PageNotFoundError",
];

/** @param {number} port */
function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(800, () => done(false));
  });
}

function runNodeScript(relPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, relPath)], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${relPath} exited with code ${code}`));
    });
  });
}

/** @returns {Promise<{ code: number, output: string }>} */
function runNextBuild() {
  const env = {
    ...process.env,
    NODE_ENV: "production",
    NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=4096",
  };

  return new Promise((resolve) => {
    let output = "";
    const child = spawn(process.execPath, [NEXT_BIN, "build"], {
      cwd: ROOT,
      env,
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk) => {
      process.stdout.write(chunk);
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
      output += chunk.toString();
    });
    child.on("exit", (code) => resolve({ code: code ?? 1, output }));
  });
}

/** @param {string} output */
function isTransientPrerenderRace(output) {
  return PRERENDER_RETRY_MARKERS.some((marker) => output.includes(marker));
}

async function warnIfDevServerRunning() {
  const devPort = Number(process.env.PORT || 3001);
  if (!(await isPortOpen(devPort))) return;
  console.warn(
    `[run-production-build] Warning: port ${devPort} is in use (likely \`next dev\`). ` +
      "Stop the dev server before production build to avoid .next corruption."
  );
}

async function main() {
  await warnIfDevServerRunning();
  await runNodeScript("scripts/ensure-clean-next-build.mjs");

  let result = await runNextBuild();
  if (result.code === 0) {
    await runNodeScript("scripts/generate-student-offline-precache.mjs");
  }

  if (result.code !== 0 && isTransientPrerenderRace(result.output)) {
    console.warn(
      "\n[run-production-build] Transient prerender PageNotFoundError detected. " +
        "Removing .next and retrying build once...\n"
    );
    if (fs.existsSync(NEXT_DIR)) {
      for (let i = 0; i < 5; i += 1) {
        try {
          fs.rmSync(NEXT_DIR, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
          break;
        } catch (err) {
          if (i === 4) throw err;
        }
      }
    }
    await runNodeScript("scripts/ensure-clean-next-build.mjs");
    result = await runNextBuild();
    if (result.code === 0) {
      await runNodeScript("scripts/generate-student-offline-precache.mjs");
    }
  }

  process.exit(result.code);
}

main().catch((err) => {
  console.error("[run-production-build] fatal:", err);
  process.exit(1);
});
