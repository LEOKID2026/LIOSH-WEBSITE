import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchStudentActionDecisions,
  findStudentActionDecision,
} from "../lib/learning-client/studentLearningProfileClient.js";
import {
  advanceActionDecisionExecutionState,
  executeActionDecisionContractV2,
} from "../lib/learning/action-decision-executor.js";
import {
  loadDiagnosticState,
  saveDiagnosticState,
} from "../lib/learning/diagnostic-state-persistence.js";

export function useStudentActionDecision({
  enabled = true,
  studentId,
  subjectId,
  topicKey,
  gradeKey,
  levelKey,
}) {
  // Persistence-key context: intentionally still keyed by grade/level, since
  // lib/learning/diagnostic-state-persistence.js also stores level-scoped
  // pendingProbe/hypothesisLedger/adaptiveState for other callers.
  const storageCtx = useMemo(
    () => ({
      studentId,
      subjectId,
      operationOrTopic: topicKey,
      gradeKey,
      levelKey,
    }),
    [studentId, subjectId, topicKey, gradeKey, levelKey],
  );
  const storageCtxRef = useRef(storageCtx);
  storageCtxRef.current = storageCtx;
  const stateRef = useRef(null);
  const [revision, setRevision] = useState(0);

  // Decision-identity trigger for (re)fetching the ADC contract itself:
  // student + subject + topic ONLY (docs/audits/DECISION-ENGINE-CLAUDE-BLOCKER-CLOSURE-2026-07-24.md,
  // Part 4). gradeKey/levelKey must NOT be part of this — a level change
  // driven by the same active decision (or the display-level toggle) must
  // never reset activitiesSinceDecision, force a refetch, or leave a gap
  // where the directive briefly looks inactive.
  useEffect(() => {
    if (!enabled || !studentId || !subjectId || !topicKey) return undefined;
    let cancelled = false;
    stateRef.current = null;
    setRevision((value) => value + 1);
    const loaded = loadDiagnosticState(storageCtxRef.current);
    fetchStudentActionDecisions()
      .then((response) => {
        if (cancelled) return;
        const decision = findStudentActionDecision(response, subjectId, topicKey);
        if (!decision) return;
        const previous =
          stateRef.current?.contract?.createdAt === decision.createdAt
            ? stateRef.current
            : loaded?.activeActionDecision?.decisionCreatedAt ===
                decision.createdAt
              ? loaded.activeActionDecision
              : null;
        stateRef.current =
          previous
            ? { ...previous, contract: decision }
            : {
                contract: decision,
                activitiesSinceDecision: 0,
                lastActivityAt: null,
                reevaluationRequired: false,
              };
        saveDiagnosticState({
          ...storageCtxRef.current,
          ...(loaded || {}),
          activeActionDecision: stateRef.current,
        });
        setRevision((value) => value + 1);
      })
      .catch(() => {
        // Fail closed: the normal learning path remains active.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, studentId, subjectId, topicKey]);

  const directive = useMemo(
    () =>
      executeActionDecisionContractV2(stateRef.current?.contract || null, {
        subjectId,
        topicKey,
        levelKey,
        activitiesSinceDecision:
          stateRef.current?.activitiesSinceDecision || 0,
      }),
    [subjectId, topicKey, levelKey, revision],
  );

  const recordActivity = useCallback(() => {
    if (!stateRef.current?.contract) return null;
    stateRef.current = advanceActionDecisionExecutionState(
      stateRef.current,
      stateRef.current.contract,
    );
    const loaded = loadDiagnosticState(storageCtx);
    saveDiagnosticState({
      ...storageCtx,
      ...(loaded || {}),
      activeActionDecision: stateRef.current,
    });
    setRevision((value) => value + 1);
    return stateRef.current;
  }, [storageCtx]);

  return { directive, recordActivity };
}
