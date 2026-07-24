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
  const stateRef = useRef(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!enabled || !studentId || !subjectId || !topicKey) return undefined;
    let cancelled = false;
    stateRef.current = null;
    setRevision((value) => value + 1);
    const loaded = loadDiagnosticState(storageCtx);
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
          ...storageCtx,
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
  }, [enabled, studentId, subjectId, topicKey, storageCtx]);

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
