/**
 * Persist probe/focus/recovery state across refresh, logout/login, session, and days.
 * localStorage only — no production SQL.
 */

import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";

export const DIAGNOSTIC_STATE_VERSION = 1;
const STORAGE_PREFIX = "mleo_diagnostic_state_v1";

/**
 * @param {object} ctx
 * @param {string|null|undefined} ctx.studentId
 * @param {string} ctx.subjectId
 * @param {string|null|undefined} [ctx.gradeKey]
 * @param {string|null|undefined} [ctx.levelKey]
 * @param {string|null|undefined} [ctx.operationOrTopic]
 */
export function buildDiagnosticStateStorageKey(ctx) {
  const sid = String(ctx.studentId || "anonymous").trim() || "anonymous";
  const sub = String(ctx.subjectId || "unknown").trim();
  const grade = String(ctx.gradeKey || "").trim();
  const level = String(ctx.levelKey || "").trim();
  const op = String(ctx.operationOrTopic || "").trim();
  return `${STORAGE_PREFIX}::${sid}::${sub}::${grade}::${level}::${op}`;
}

/**
 * @typedef {Object} DiagnosticPersistedState
 * @property {number} v
 * @property {string} studentId
 * @property {string} subjectId
 * @property {string} gradeKey
 * @property {string} levelKey
 * @property {string} operationOrTopic
 * @property {Record<string, unknown>|null} pendingProbe
 * @property {Record<string, unknown>|null} hypothesisLedger
 * @property {Record<string, unknown>|null} adaptiveState
 * @property {number} updatedAt
 */

/**
 * @param {object} ctx
 * @param {string|null|undefined} ctx.studentId
 * @param {string} ctx.subjectId
 * @param {string|null|undefined} [ctx.gradeKey]
 * @param {string|null|undefined} [ctx.levelKey]
 * @param {string|null|undefined} [ctx.operationOrTopic]
 * @returns {DiagnosticPersistedState|null}
 */
export function loadDiagnosticState(ctx) {
  const key = buildDiagnosticStateStorageKey(ctx);
  const raw = safeGetJsonObject(key);
  if (!raw || typeof raw !== "object") return null;
  if (raw.v !== DIAGNOSTIC_STATE_VERSION) return null;
  return /** @type {DiagnosticPersistedState} */ (raw);
}

/**
 * @param {object} ctx
 * @param {string|null|undefined} ctx.studentId
 * @param {string} ctx.subjectId
 * @param {string|null|undefined} [ctx.gradeKey]
 * @param {string|null|undefined} [ctx.levelKey]
 * @param {string|null|undefined} [ctx.operationOrTopic]
 * @param {Record<string, unknown>|null|undefined} ctx.pendingProbe
 * @param {Record<string, unknown>|null|undefined} ctx.hypothesisLedger
 * @param {Record<string, unknown>|null|undefined} ctx.adaptiveState
 */
export function saveDiagnosticState(ctx) {
  const key = buildDiagnosticStateStorageKey(ctx);
  const payload = {
    v: DIAGNOSTIC_STATE_VERSION,
    studentId: String(ctx.studentId || "anonymous"),
    subjectId: String(ctx.subjectId || "unknown"),
    gradeKey: String(ctx.gradeKey || ""),
    levelKey: String(ctx.levelKey || ""),
    operationOrTopic: String(ctx.operationOrTopic || ""),
    pendingProbe: ctx.pendingProbe ?? null,
    hypothesisLedger: ctx.hypothesisLedger ?? null,
    adaptiveState: ctx.adaptiveState ?? null,
    updatedAt: Date.now(),
  };
  safeSetJson(key, payload);
  return payload;
}

/**
 * Restore refs from localStorage into React refs.
 * @param {object} ctx
 * @param {{ current: unknown }|null|undefined} pendingRef
 * @param {{ current: unknown }|null|undefined} ledgerRef
 * @param {{ current: unknown }|null|undefined} [adaptiveRef]
 */
export function restoreDiagnosticRefs(ctx, pendingRef, ledgerRef, adaptiveRef) {
  const loaded = loadDiagnosticState(ctx);
  if (!loaded) return null;
  if (pendingRef && loaded.pendingProbe) pendingRef.current = loaded.pendingProbe;
  if (ledgerRef && loaded.hypothesisLedger) ledgerRef.current = loaded.hypothesisLedger;
  if (adaptiveRef && loaded.adaptiveState) adaptiveRef.current = loaded.adaptiveState;
  return loaded;
}

/**
 * Persist current ref values.
 * @param {object} ctx
 * @param {{ current: unknown }|null|undefined} pendingRef
 * @param {{ current: unknown }|null|undefined} ledgerRef
 * @param {{ current: unknown }|null|undefined} [adaptiveRef]
 */
export function persistDiagnosticRefs(ctx, pendingRef, ledgerRef, adaptiveRef) {
  return saveDiagnosticState({
    ...ctx,
    pendingProbe:
      pendingRef?.current && typeof pendingRef.current === "object"
        ? /** @type {Record<string, unknown>} */ (pendingRef.current)
        : null,
    hypothesisLedger:
      ledgerRef?.current && typeof ledgerRef.current === "object"
        ? /** @type {Record<string, unknown>} */ (ledgerRef.current)
        : null,
    adaptiveState:
      adaptiveRef?.current && typeof adaptiveRef.current === "object"
        ? /** @type {Record<string, unknown>} */ (adaptiveRef.current)
        : null,
  });
}

/** In-memory store for Node tests (simulates localStorage round-trip). */
const __testStore = new Map();

/**
 * Test-only: bind persistence to an in-memory map.
 * @param {Map<string, unknown>} [store]
 */
export function bindDiagnosticStateTestStore(store = __testStore) {
  return {
    load(ctx) {
      const key = buildDiagnosticStateStorageKey(ctx);
      const raw = store.get(key);
      if (!raw || typeof raw !== "object") return null;
      if (raw.v !== DIAGNOSTIC_STATE_VERSION) return null;
      return raw;
    },
    save(ctx) {
      const key = buildDiagnosticStateStorageKey(ctx);
      const payload = saveDiagnosticState(ctx);
      store.set(key, payload);
      return payload;
    },
    clear() {
      store.clear();
    },
  };
}
