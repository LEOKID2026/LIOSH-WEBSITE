/**
 * React hook — bootstrap + persist diagnostic probe/focus state per master.
 * Works in browser only (localStorage); server sync via answer clientMeta.
 */

import { useEffect, useCallback } from "react";
import {
  bootstrapMasterDiagnosticState,
  buildMasterDiagnosticCtx,
  recordMisconceptionAdaptiveAnswer,
  resolveMasterAdaptiveQuestionTarget,
  snapshotMasterDiagnosticState,
} from "./diagnostic-state-master-helper.js";
import { createMisconceptionAdaptiveState } from "./misconception-adaptive-routing.js";

/**
 * @param {object} p
 * @param {React.MutableRefObject<string|null|undefined>} [p.studentIdRef]
 * @param {string} p.subjectId
 * @param {string|null|undefined} [p.gradeKey]
 * @param {string|null|undefined} [p.levelKey]
 * @param {string|null|undefined} [p.operationOrTopic]
 * @param {React.MutableRefObject<unknown>} p.pendingRef
 * @param {React.MutableRefObject<unknown>} p.ledgerRef
 * @param {React.MutableRefObject<unknown>} p.adaptiveRef
 * @param {string|null|undefined} [p.sessionFullName]
 * @param {React.MutableRefObject<string|null|undefined>} [p.forceKindRef]
 */
export function useMasterDiagnosticPersistence(p) {
  const {
    studentIdRef,
    subjectId,
    gradeKey,
    levelKey,
    operationOrTopic,
    pendingRef,
    ledgerRef,
    adaptiveRef,
    sessionFullName,
    forceKindRef,
  } = p;

  useEffect(() => {
    if (!adaptiveRef.current) {
      adaptiveRef.current = createMisconceptionAdaptiveState();
    }
    bootstrapMasterDiagnosticState(
      buildMasterDiagnosticCtx(
        studentIdRef?.current,
        subjectId,
        gradeKey,
        levelKey,
        operationOrTopic
      ),
      pendingRef,
      ledgerRef,
      adaptiveRef
    );
  }, [gradeKey, levelKey, operationOrTopic, sessionFullName, subjectId]);

  const ctx = useCallback(
    () =>
      buildMasterDiagnosticCtx(
        studentIdRef?.current,
        subjectId,
        gradeKey,
        levelKey,
        operationOrTopic
      ),
    [studentIdRef, subjectId, gradeKey, levelKey, operationOrTopic]
  );

  const snapshot = useCallback(() => {
    snapshotMasterDiagnosticState(ctx(), pendingRef, ledgerRef, adaptiveRef);
  }, [ctx, pendingRef, ledgerRef, adaptiveRef]);

  const recordAdaptive = useCallback(
    (tag, isCorrect) => {
      return recordMisconceptionAdaptiveAnswer({
        ctx: ctx(),
        pendingRef,
        ledgerRef,
        adaptiveRef,
        tag,
        isCorrect,
      });
    },
    [ctx, pendingRef, ledgerRef, adaptiveRef]
  );

  const resolveAdaptiveTarget = useCallback(
    (routingCtx = {}) => {
      return resolveMasterAdaptiveQuestionTarget(adaptiveRef, forceKindRef, routingCtx);
    },
    [adaptiveRef, forceKindRef]
  );

  return { snapshot, recordAdaptive, resolveAdaptiveTarget, ctx };
}
