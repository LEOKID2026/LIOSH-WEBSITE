/**
 * Isolated production Next server for final-subject simulation (no HMR / Fast Refresh).
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";

export const SIM_NEXT_DIST_DIR = ".next-final-subject-sim";
const DEV_HOST = "127.0.0.1";

function simEnv(port) {
  return {
    ...process.env,
    PORT: String(port),
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_DIST_DIR: SIM_NEXT_DIST_DIR,
    NODE_ENV: "production",
    WATCHPACK_POLLING: "false",
  };
}

async function pathExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} repoRoot
 * @param {(msg: string) => void} log
 */
export async function ensureSimulationBuild(repoRoot, log) {
  const buildId = join(repoRoot, SIM_NEXT_DIST_DIR, "BUILD_ID");
  if (await pathExists(buildId)) {
    log(`Using existing ${SIM_NEXT_DIST_DIR} build (skip — pass --force-build to rebuild)\n`);
    return { rebuilt: false };
  }
  return runSimulationBuild(repoRoot, log);
}

/**
 * @param {string} repoRoot
 * @param {(msg: string) => void} log
 */
export async function runSimulationBuild(repoRoot, log) {
  log(`Building production bundle (${SIM_NEXT_DIST_DIR}) — first run may take several minutes…\n`);
  await new Promise((resolve, reject) => {
    const child = spawn("npx next build", {
      cwd: repoRoot,
      shell: true,
      stdio: "inherit",
      env: simEnv(0),
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`next build exited ${code}`));
    });
  });
  log("Build complete.\n");
  return { rebuilt: true };
}

/**
 * @param {{ repoRoot: string, port: number, logPath: string, log: (msg: string) => void }} opts
 */
export async function startSimulationServer({ repoRoot, port, logPath, log }) {
  const serverLog = createWriteStream(logPath, { flags: "a" });
  const cmd = `npx next start -p ${port} -H ${DEV_HOST}`;
  serverLog.write(`[${new Date().toISOString()}] ${cmd} NEXT_DIST_DIR=${SIM_NEXT_DIST_DIR}\n`);
  log(`Starting production server: ${cmd}\n`);

  const child = spawn(cmd, {
    cwd: repoRoot,
    shell: true,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: simEnv(port),
  });

  child.stdout?.on("data", (d) => serverLog.write(d));
  child.stderr?.on("data", (d) => serverLog.write(d));
  child.unref?.();

  return { pid: child.pid, mode: "production", distDir: SIM_NEXT_DIST_DIR };
}
