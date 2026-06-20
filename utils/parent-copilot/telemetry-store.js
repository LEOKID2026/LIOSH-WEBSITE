/**
 * Parent Copilot telemetry trace store (temporary internal/beta only).
 * Best-effort bounded ring buffer with browser localStorage + in-memory fallback.
 */

import { TELEMETRY_TRACE_SCHEMA_VERSION, validateTelemetryTraceEventV1 } from "./telemetry-contract-v1.js";

const TRACE_STORE_KEY = "__parent_copilot_trace_store_v1__";
const GLOBAL_MEMORY_KEY = "__liosh_parent_copilot_telemetry_memory_v1__";
const DEFAULT_MAX_ENTRIES = 80;

/**
 * Node 20 can instantiate duplicate ESM copies of this module under circular imports.
 * Keep the in-memory ring buffer on globalThis so runtime writes and test reads share one store.
 * @returns {Array<Record<string, unknown>>}
 */
function getMemoryTraceBuffer() {
  const g = typeof globalThis !== "undefined" && globalThis ? globalThis : {};
  if (!Array.isArray(g[GLOBAL_MEMORY_KEY])) {
    g[GLOBAL_MEMORY_KEY] = [];
  }
  return g[GLOBAL_MEMORY_KEY];
}

function setMemoryTraceBuffer(events) {
  const g = typeof globalThis !== "undefined" && globalThis ? globalThis : {};
  g[GLOBAL_MEMORY_KEY] = Array.isArray(events) ? [...events] : [];
}

function getLocalStorageOrNull() {
  try {
    if (typeof window === "undefined") return null;
    if (!window || !window.localStorage) return null;
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

function normalizeStoreShape(raw) {
  if (!raw || typeof raw !== "object") {
    return { schemaVersion: TELEMETRY_TRACE_SCHEMA_VERSION, events: [] };
  }
  const events = Array.isArray(raw.events) ? raw.events.filter((e) => e && typeof e === "object") : [];
  return {
    schemaVersion: String(raw.schemaVersion || TELEMETRY_TRACE_SCHEMA_VERSION),
    events,
  };
}

function readStore() {
  const ls = getLocalStorageOrNull();
  if (!ls) {
    return { schemaVersion: TELEMETRY_TRACE_SCHEMA_VERSION, events: [...getMemoryTraceBuffer()] };
  }
  try {
    const raw = ls.getItem(TRACE_STORE_KEY);
    if (!raw) return { schemaVersion: TELEMETRY_TRACE_SCHEMA_VERSION, events: [] };
    return normalizeStoreShape(JSON.parse(raw));
  } catch (_) {
    return { schemaVersion: TELEMETRY_TRACE_SCHEMA_VERSION, events: [] };
  }
}

function writeStore(store) {
  const safeStore = normalizeStoreShape(store);
  const ls = getLocalStorageOrNull();
  if (!ls) {
    setMemoryTraceBuffer(safeStore.events);
    return true;
  }
  try {
    ls.setItem(TRACE_STORE_KEY, JSON.stringify(safeStore));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} event
 * @param {{ maxEntries?: number }} [opts]
 */
export function appendTurnTelemetryTrace(event, opts = {}) {
  try {
    const validation = validateTelemetryTraceEventV1(event || {});
    if (!validation.ok) return false;
    const maxEntries = Math.max(10, Number(opts.maxEntries) || DEFAULT_MAX_ENTRIES);
    const current = readStore();
    const next = [...current.events, { ...event, persistedAtMs: Date.now() }];
    const bounded = next.length > maxEntries ? next.slice(next.length - maxEntries) : next;
    writeStore({ schemaVersion: TELEMETRY_TRACE_SCHEMA_VERSION, events: bounded });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * @returns {{ schemaVersion: string, events: Array<Record<string, unknown>> }}
 */
export function readTurnTelemetryTraceStore() {
  return readStore();
}

/**
 * @param {{ fromMs?: number; toMs?: number; sessionId?: string; resolutionStatus?: string; generationPath?: string }} [filters]
 */
export function queryTurnTelemetryTraceStore(filters = {}) {
  const store = readStore();
  const fromMs = Number.isFinite(Number(filters.fromMs)) ? Number(filters.fromMs) : -Infinity;
  const toMs = Number.isFinite(Number(filters.toMs)) ? Number(filters.toMs) : Infinity;
  const sessionId = String(filters.sessionId || "").trim();
  const resolutionStatus = String(filters.resolutionStatus || "").trim();
  const generationPath = String(filters.generationPath || "").trim();
  return store.events.filter((event) => {
    const e = event && typeof event === "object" ? event : {};
    const ts = Number(e.timestampMs);
    if (!Number.isFinite(ts) || ts < fromMs || ts > toMs) return false;
    if (sessionId && String(e.sessionId || "") !== sessionId) return false;
    if (resolutionStatus && String(e.resolutionStatus || "") !== resolutionStatus) return false;
    if (generationPath && String(e.generationPath || "") !== generationPath) return false;
    return true;
  });
}

/**
 * @param {Array<Record<string, unknown>>} events
 */
export function summarizeTelemetryEvents(events) {
  const list = Array.isArray(events) ? events : [];
  const total = list.length;
  let fallbackCount = 0;
  let clarificationCount = 0;
  let deterministicCount = 0;
  let llmCount = 0;
  for (const raw of list) {
    const e = raw && typeof raw === "object" ? raw : {};
    if (e.fallbackUsed) fallbackCount += 1;
    if (String(e.resolutionStatus || "") === "clarification_required") clarificationCount += 1;
    const gp = String(e.generationPath || "");
    if (gp === "deterministic") deterministicCount += 1;
    if (gp === "llm_grounded") llmCount += 1;
  }
  const toRate = (n) => (total > 0 ? n / total : 0);
  return {
    total,
    fallbackRate: toRate(fallbackCount),
    clarificationRate: toRate(clarificationCount),
    deterministicRate: toRate(deterministicCount),
    llmRate: toRate(llmCount),
  };
}

export function resetTurnTelemetryTraceStoreForTests() {
  setMemoryTraceBuffer([]);
  const ls = getLocalStorageOrNull();
  if (!ls) return;
  try {
    ls.removeItem(TRACE_STORE_KEY);
  } catch (_) {
    // no-op
  }
}

export default {
  appendTurnTelemetryTrace,
  readTurnTelemetryTraceStore,
  queryTurnTelemetryTraceStore,
  summarizeTelemetryEvents,
  resetTurnTelemetryTraceStoreForTests,
};
