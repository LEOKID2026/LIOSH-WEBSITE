import { useEffect, useState } from "react";
import { gradeKeyToNumber } from "../lib/learning-student-defaults";
import { useResolvedStudentSession } from "./useResolvedStudentSession";
import { useStudentSubjectAccess } from "./useStudentSubjectAccess";

/**
 * Sync subject-page grade state from shared student session.
 *
 * @param {{
 *   permissionKey?: string,
 *   transformGradeKey?: (gradeKey: string) => string | null | undefined,
 *   requireGradeNumber?: boolean,
 * }} [options]
 */
export function useSubjectSessionDefaults(options = {}) {
  const { permissionKey, transformGradeKey, requireGradeNumber = true } = options;
  const subjectAccess = useStudentSubjectAccess(permissionKey || "");

  const session = useResolvedStudentSession();
  const [grade, setGrade] = useState(null);
  const [gradeNumber, setGradeNumber] = useState(null);

  useEffect(() => {
    if (!session.gradeResolved || !session.gradeKey) return;
    let nextKey = session.gradeKey;
    if (subjectAccess.enforced && subjectAccess.effectiveGrade) {
      nextKey = subjectAccess.effectiveGrade;
    }
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
    subjectAccess.enforced,
    subjectAccess.effectiveGrade,
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
    canPickGrade: subjectAccess.canPickGrade,
    isSubjectLocked: subjectAccess.isSubjectLocked,
    subjectAccessEnforced: subjectAccess.enforced,
  };
}
