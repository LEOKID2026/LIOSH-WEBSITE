import { useCallback, useEffect, useState } from "react";
import { gradeKeyToNumber } from "../lib/learning-student-defaults";
import { useResolvedStudentSession } from "./useResolvedStudentSession";
import { useStudentSubjectAccess } from "./useStudentSubjectAccess";

/**
 * @param {{
 *   gradeKey: string,
 *   enforced: boolean,
 *   effectiveGrade: string|null,
 * }} subjectAccess
 */
function resolveAuthoritativeGradeKey(session, subjectAccess) {
  let nextKey = session.gradeKey;
  if (subjectAccess.enforced && subjectAccess.effectiveGrade) {
    nextKey = subjectAccess.effectiveGrade;
  }
  return nextKey;
}

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
  const [grade, setGradeState] = useState(null);
  const [gradeNumber, setGradeNumberState] = useState(null);

  const gradePickerLocked =
    subjectAccess.enforced === true && subjectAccess.canPickGrade !== true;

  const applyGradeKey = useCallback(
    (nextKey) => {
      if (!nextKey) return;
      let resolved = nextKey;
      if (transformGradeKey) {
        const transformed = transformGradeKey(resolved);
        if (transformed) resolved = transformed;
      }
      setGradeState(resolved);
      const derivedNumber = gradeKeyToNumber(resolved);
      if (derivedNumber != null) {
        setGradeNumberState(derivedNumber);
      }
    },
    [transformGradeKey]
  );

  const syncAuthoritativeGrade = useCallback(() => {
    if (!session.gradeResolved || !session.gradeKey) return;
    applyGradeKey(resolveAuthoritativeGradeKey(session, subjectAccess));
  }, [
    session.gradeResolved,
    session.gradeKey,
    subjectAccess.enforced,
    subjectAccess.effectiveGrade,
    applyGradeKey,
  ]);

  useEffect(() => {
    syncAuthoritativeGrade();
  }, [
    syncAuthoritativeGrade,
    subjectAccess.canPickGrade,
    session.authoritativeGradeKey,
  ]);

  useEffect(() => {
    if (!gradePickerLocked || !session.gradeResolved || !grade) return;
    let expected = resolveAuthoritativeGradeKey(session, subjectAccess);
    if (transformGradeKey) {
      const transformed = transformGradeKey(expected);
      if (transformed) expected = transformed;
    }
    if (grade !== expected) {
      applyGradeKey(expected);
    }
  }, [
    grade,
    gradeNumber,
    gradePickerLocked,
    session.gradeResolved,
    session.gradeKey,
    subjectAccess.enforced,
    subjectAccess.effectiveGrade,
    transformGradeKey,
    applyGradeKey,
  ]);

  const setGrade = useCallback(
    (value) => {
      if (gradePickerLocked) {
        syncAuthoritativeGrade();
        return;
      }
      if (!value) return;
      let nextKey = value;
      if (transformGradeKey) {
        const transformed = transformGradeKey(nextKey);
        if (transformed) nextKey = transformed;
      }
      setGradeState(nextKey);
      const derivedNumber = gradeKeyToNumber(nextKey);
      if (derivedNumber != null) {
        setGradeNumberState(derivedNumber);
      }
    },
    [gradePickerLocked, syncAuthoritativeGrade, transformGradeKey]
  );

  const setGradeNumber = useCallback(
    (value) => {
      if (gradePickerLocked) {
        syncAuthoritativeGrade();
        return;
      }
      if (value == null || !Number.isFinite(Number(value))) return;
      const numeric = Number(value);
      setGradeNumberState(numeric);
      setGradeState(`g${numeric}`);
    },
    [gradePickerLocked, syncAuthoritativeGrade]
  );

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
    canPickGrade: !gradePickerLocked,
    gradePickerLocked,
    isSubjectLocked: subjectAccess.isSubjectLocked,
    subjectAccessEnforced: subjectAccess.enforced,
  };
}
