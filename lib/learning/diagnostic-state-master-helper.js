/**
 * Shared helper for master pages — restore/persist diagnostic probe state.
 */

import {
  persistDiagnosticRefs,
  restoreDiagnosticRefs,
} from "./diagnostic-state-persistence.js";
import {
  applyMisconceptionAdaptiveAnswer,
  createMisconceptionAdaptiveState,
  resolveMisconceptionAdaptiveQuestionTarget,
} from "./misconception-adaptive-routing.js";

/**
 * @param {object} ctx
 * @param {string|null|undefined} ctx.studentId
 * @param {string} ctx.subjectId
 * @param {string|null|undefined} [ctx.gradeKey]
 * @param {string|null|undefined} [ctx.levelKey]
 * @param {string|null|undefined} [ctx.operationOrTopic]
 * @param {{ current: unknown }} pendingRef
 * @param {{ current: unknown }} ledgerRef
 * @param {{ current: unknown }} adaptiveRef
 */
export function bootstrapMasterDiagnosticState(ctx, pendingRef, ledgerRef, adaptiveRef) {
  const loaded = restoreDiagnosticRefs(ctx, pendingRef, ledgerRef, adaptiveRef);
  if (!adaptiveRef.current) {
    adaptiveRef.current = createMisconceptionAdaptiveState();
  }
  return loaded;
}

/**
 * @param {object} ctx
 * @param {{ current: unknown }} pendingRef
 * @param {{ current: unknown }} ledgerRef
 * @param {{ current: unknown }} adaptiveRef
 */
export function snapshotMasterDiagnosticState(ctx, pendingRef, ledgerRef, adaptiveRef) {
  return persistDiagnosticRefs(ctx, pendingRef, ledgerRef, adaptiveRef);
}

/**
 * Apply adaptive answer + persist.
 * @param {object} p
 */
export function recordMisconceptionAdaptiveAnswer(p) {
  const {
    ctx,
    pendingRef,
    ledgerRef,
    adaptiveRef,
    tag,
    isCorrect,
  } = p;
  if (!adaptiveRef.current) {
    adaptiveRef.current = createMisconceptionAdaptiveState();
  }
  adaptiveRef.current = applyMisconceptionAdaptiveAnswer(
    adaptiveRef.current,
    tag,
    isCorrect
  );
  snapshotMasterDiagnosticState(ctx, pendingRef, ledgerRef, adaptiveRef);
  return adaptiveRef.current;
}

/**
 * Resolve question target from adaptive state; optionally set forceKind ref.
 * @param {{ current: unknown }} adaptiveRef
 * @param {{ current: unknown|null }} [forceKindRef]
 * @param {Record<string, unknown>} [routingCtx]
 */
export function resolveMasterAdaptiveQuestionTarget(adaptiveRef, forceKindRef, routingCtx = {}) {
  if (!adaptiveRef.current) {
    adaptiveRef.current = createMisconceptionAdaptiveState();
  }
  const target = resolveMisconceptionAdaptiveQuestionTarget(
    adaptiveRef.current,
    routingCtx
  );
  if (target.preferKind && forceKindRef && !forceKindRef.current) {
    forceKindRef.current = target.preferKind;
  }
  return target;
}

/**
 * Build persistence context from common master fields.
 */
export function buildMasterDiagnosticCtx(studentId, subjectId, gradeKey, levelKey, operationOrTopic) {
  return {
    studentId: studentId || "anonymous",
    subjectId,
    gradeKey: gradeKey || "",
    levelKey: levelKey || "",
    operationOrTopic: operationOrTopic || "",
  };
}
