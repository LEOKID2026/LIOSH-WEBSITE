/**
 * Resolve an isolated simulation port in 3200–3210 (default 3200).
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  DEFAULT_SIMULATION_PORT,
  RESERVED_DEV_PORTS,
  SIMULATION_PORT_MAX,
  SIMULATION_PORT_MIN,
} from "./constants.mjs";

const execAsync = promisify(exec);

export async function listListeningPidsOnPort(port) {
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
      /* no listeners */
    }
  }
  return [...pids];
}

export async function isPortFree(port) {
  return (await listListeningPidsOnPort(port)).length === 0;
}

/**
 * @param {number} [preferredPort]
 * @returns {Promise<{ port: number, autoSelected: boolean, busyPorts: number[] }>}
 */
export async function resolveSimulationPort(preferredPort = DEFAULT_SIMULATION_PORT) {
  const preferred = Number(preferredPort) || DEFAULT_SIMULATION_PORT;
  if (RESERVED_DEV_PORTS.has(preferred)) {
    throw new Error(
      `Port ${preferred} is reserved for normal dev (3000–3003). Use ${SIMULATION_PORT_MIN}–${SIMULATION_PORT_MAX}.`
    );
  }

  const busyPorts = [];
  const start = Math.max(SIMULATION_PORT_MIN, preferred);
  const end = SIMULATION_PORT_MAX;

  for (let port = start; port <= end; port += 1) {
    if (RESERVED_DEV_PORTS.has(port)) continue;
    const listeners = await listListeningPidsOnPort(port);
    if (listeners.length === 0) {
      return { port, autoSelected: port !== preferred, busyPorts };
    }
    busyPorts.push(port);
  }

  throw new Error(
    `All simulation ports ${SIMULATION_PORT_MIN}–${SIMULATION_PORT_MAX} are busy` +
      (busyPorts.length ? ` (LISTENING: ${busyPorts.join(", ")})` : "") +
      ". Stop the conflicting process or free a port in that range."
  );
}

export async function waitForServerReady(baseUrl, { timeoutMs = 180_000, intervalMs = 2000 } = {}) {
  const url = `${String(baseUrl).replace(/\/$/, "")}/student/login`;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) return true;
    } catch {
      /* still booting */
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
