import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyStudentAdaptiveAnswer,
  buildStudentAnswerLevelFields,
  buildStudentSessionStartLevelFields,
  createStudentAdaptiveState,
  isStudentAdaptiveActive,
  mapPlannerTargetToDisplayLevel,
  mapPlannerTargetToSourceDifficulty,
  migratePracticeResumeSnapshot,
  resolveSourceDifficultyForPractice,
  studentDisplayLevelLabel,
  tagQuestionWithLevelFields,
} from "../lib/learning-client/student-display-level-practice.js";

/**
 * Phase 4 — shared displayLevel + internal adaptive state for learning masters.
 * @param {string} subjectId
 */
export function useStudentDisplayLevelPractice(subjectId) {
  const [displayLevel, setDisplayLevelState] = useState("regular");
  const [sourceDifficulty, setSourceDifficulty] = useState("easy");
  const displayLevelRef = useRef("regular");
  const adaptiveRef = useRef(createStudentAdaptiveState(subjectId));

  useEffect(() => {
    displayLevelRef.current = displayLevel;
  }, [displayLevel]);

  const syncSourceDifficulty = useCallback(
    (nextDisplayLevel = displayLevelRef.current) => {
      const sd = resolveSourceDifficultyForPractice(subjectId, nextDisplayLevel, adaptiveRef.current);
      setSourceDifficulty(sd);
      return sd;
    },
    [subjectId]
  );

  const setDisplayLevel = useCallback(
    (nextDisplayLevel) => {
      displayLevelRef.current = nextDisplayLevel;
      setDisplayLevelState(nextDisplayLevel);
      syncSourceDifficulty(nextDisplayLevel);
    },
    [syncSourceDifficulty]
  );

  const handleDisplayLevelChange = useCallback(
    (nextDisplayLevel) => {
      setDisplayLevel(nextDisplayLevel);
    },
    [setDisplayLevel]
  );

  const resetAdaptiveForSessionStart = useCallback(() => {
    if (displayLevelRef.current === "regular") {
      adaptiveRef.current = createStudentAdaptiveState(subjectId);
      setSourceDifficulty("easy");
    } else {
      setSourceDifficulty("hard");
    }
  }, [subjectId]);

  const applyAnswerAdaptive = useCallback(
    (isCorrect, context = {}) => {
      if (
        !isStudentAdaptiveActive(subjectId, {
          displayLevel: displayLevelRef.current,
          ...context,
        })
      ) {
        return sourceDifficulty;
      }
      adaptiveRef.current = applyStudentAdaptiveAnswer(subjectId, adaptiveRef.current, isCorrect, {
        displayLevel: displayLevelRef.current,
        ...context,
      });
      if (displayLevelRef.current === "regular") {
        const sd = adaptiveRef.current.internalState;
        setSourceDifficulty(sd);
        return sd;
      }
      return "hard";
    },
    [subjectId, sourceDifficulty]
  );

  const applyPlannerLevelKey = useCallback(
    (appliedLevelKey) => {
      const plannerDisplay = mapPlannerTargetToDisplayLevel(appliedLevelKey, subjectId);
      const plannerSource = mapPlannerTargetToSourceDifficulty(appliedLevelKey);
      if (plannerDisplay) {
        displayLevelRef.current = plannerDisplay;
        setDisplayLevelState(plannerDisplay);
      }
      if (plannerSource === "easy" || plannerSource === "medium" || plannerSource === "hard") {
        adaptiveRef.current = createStudentAdaptiveState(subjectId, {
          internalState: plannerSource === "hard" ? "easy" : plannerSource,
        });
      }
      if (plannerDisplay === "advanced" || plannerSource === "hard") {
        setSourceDifficulty("hard");
      } else if (plannerSource) {
        setSourceDifficulty(plannerSource);
      }
    },
    [subjectId]
  );

  const hydrateFromResumeSnapshot = useCallback(
    (snap) => {
      const migrated = migratePracticeResumeSnapshot(snap, subjectId);
      if (typeof migrated.displayLevel === "string") {
        displayLevelRef.current = migrated.displayLevel;
        setDisplayLevelState(migrated.displayLevel);
      }
      if (migrated.adaptiveState) adaptiveRef.current = migrated.adaptiveState;
      if (typeof migrated.level === "string") setSourceDifficulty(migrated.level);
      return migrated;
    },
    [subjectId]
  );

  return {
    displayLevel,
    displayLevelRef,
    sourceDifficulty,
    /** @deprecated use sourceDifficulty — alias for generator compat */
    level: sourceDifficulty,
    setSourceDifficulty,
    setLevel: setSourceDifficulty,
    setDisplayLevel,
    handleDisplayLevelChange,
    adaptiveRef,
    syncSourceDifficulty,
    resetAdaptiveForSessionStart,
    applyAnswerAdaptive,
    applyPlannerLevelKey,
    hydrateFromResumeSnapshot,
    buildSessionStartLevelFields: () =>
      buildStudentSessionStartLevelFields(subjectId, displayLevelRef.current, adaptiveRef.current),
    buildAnswerLevelFields: (sd) =>
      buildStudentAnswerLevelFields(subjectId, displayLevelRef.current, sd || sourceDifficulty, adaptiveRef.current),
    tagQuestion: (question) =>
      tagQuestionWithLevelFields(question, displayLevelRef.current, sourceDifficulty),
    label: (dl) => studentDisplayLevelLabel(dl ?? displayLevel),
  };
}
