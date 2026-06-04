import { useEffect, useState } from "react";
import { gradeKeyToNumber } from "../lib/learning-student-defaults";
import { useResolvedStudentSession } from "./useResolvedStudentSession";

/**
 * Sync subject-page grade state from shared student session.
 *
 * @param {{
 *   transformGradeKey?: (gradeKey: string) => string | null | undefined,
 *   requireGradeNumber?: boolean,
 * }} [options]
 */
export function useSubjectSessionDefaults(options = {}) {
  const { transformGradeKey, requireGradeNumber = true } = options;

  const session = useResolvedStudentSession();
  const [grade, setGrade] = useState(null);
  const [gradeNumber, setGradeNumber] = useState(null);

  useEffect(() => {
    if (!session.gradeResolved || !session.gradeKey) return;
    let nextKey = session.gradeKey;
    if (transformGradeKey) {
      const transformed = transformGradeKey(nextKey);
      if (transformed) nextKey = transformed;
    }
    setGrade(nextKey);
    const derivedNumber = gradeKeyToNumber(nextKey);
    if (derivedNumber != null) {
      setGradeNumber(derivedNumber);
    } else if (session.gradeNumber != null) {
      setGradeNumber(session.gradeNumber);
    }
  }, [
    session.gradeResolved,
    session.gradeKey,
    session.gradeNumber,
    session.authoritativeGradeKey,
    transformGradeKey,
  ]);

  const gradeReady = Boolean(
    session.gradeResolved &&
      grade &&
      (!requireGradeNumber || gradeNumber != null)
  );

  return {
    session,
    grade,
    setGrade,
    gradeNumber,
    setGradeNumber,
    gradeReady,
    gradeResolved: session.gradeResolved,
    fullName: session.fullName,
    coinBalance: session.coinBalance,
    studentId: session.studentId,
  };
}
