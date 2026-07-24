/**
 * Persist probe/focus/recovery and temporary ADC execution state across refreshes.
 * The authoritative decision is fetched from the server; this stores execution progress only.
 */

import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";

export const DIAGNOSTIC_STATE_VERSION = 2;
const STORAGE_PREFIX = "mleo_diagnostic_state_v1";

function sanitizeActionExecutionState(value) {
  if (!value || typeof value !== "object") return null;
  return {
    decisionCreatedAt: String(
      value.decisionCreatedAt || value.contract?.createdAt || "",
    ) || null,
    activitiesSinceDecision: Math.max(
      0,
      Number(value.activitiesSinceDecision) || 0,
    ),
    lastActivityAt: value.lastActivityAt ? String(value.lastActivityAt) : null,
    reevaluationRequired: value.reevaluationRequired === true,
  };
}

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
 * @property {Record<string, unknown>|null} activeActionDecision
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
  if (![1, DIAGNOSTIC_STATE_VERSION].includes(raw.v)) return null;
  return /** @type {DiagnosticPersistedState} */ ({
    ...raw,
    v: DIAGNOSTIC_STATE_VERSION,
    activeActionDecision: sanitizeActionExecutionState(
      raw.activeActionDecision,
    ),
  });
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
 * @param {Record<string, unknown>|null|undefined} [ctx.activeActionDecision]
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
    // Never trust or restore an action contract from client storage. Only execution
    // progress is persisted and is rebound to a fresh server contract after fetch.
    activeActionDecision: sanitizeActionExecutionState(
      ctx.activeActionDecision,
    ),
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
export function restoreDiagnosticRefs(
  ctx,
  pendingRef,
  ledgerRef,
  adaptiveRef,
  actionDecisionRef,
) {
  const loaded = loadDiagnosticState(ctx);
  if (!loaded) return null;
  if (pendingRef && loaded.pendingProbe) pendingRef.current = loaded.pendingProbe;
  if (ledgerRef && loaded.hypothesisLedger) ledgerRef.current = loaded.hypothesisLedger;
  if (adaptiveRef && loaded.adaptiveState) adaptiveRef.current = loaded.adaptiveState;
  if (actionDecisionRef && loaded.activeActionDecision) {
    actionDecisionRef.current = loaded.activeActionDecision;
  }
  return loaded;
}

/**
 * Persist current ref values.
 * @param {object} ctx
 * @param {{ current: unknown }|null|undefined} pendingRef
 * @param {{ current: unknown }|null|undefined} ledgerRef
 * @param {{ current: unknown }|null|undefined} [adaptiveRef]
 */
export function persistDiagnosticRefs(
  ctx,
  pendingRef,
  ledgerRef,
  adaptiveRef,
  actionDecisionRef,
) {
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
    activeActionDecision:
      actionDecisionRef?.current &&
      typeof actionDecisionRef.current === "object"
        ? /** @type {Record<string, unknown>} */ (actionDecisionRef.current)
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
      if (![1, DIAGNOSTIC_STATE_VERSION].includes(raw.v)) return null;
      return {
        ...raw,
        v: DIAGNOSTIC_STATE_VERSION,
        activeActionDecision: sanitizeActionExecutionState(
          raw.activeActionDecision,
        ),
      };
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
