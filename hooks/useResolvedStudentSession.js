import { useMemo } from "react";
import { useStudentSessionContext } from "../components/student/StudentSessionContext";
import { resolveStudentSessionView } from "../lib/learning-client/resolveStudentSessionView";
import {
  LIOSH_ACTIVE_STUDENT_ID_KEY,
  readStudentGradeLevelCache,
} from "../lib/learning-student-local-sync";

function readActiveStudentIdFromStorage() {
  if (typeof window === "undefined") return "";
  try {
    return String(window.localStorage.getItem(LIOSH_ACTIVE_STUDENT_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

/**
 * Shared student session + grade resolution for learning subject pages.
 * Prefers authoritative `/api/student/me` from StudentSessionContext; uses
 * same-student localStorage grade only as an initial hint while loading.
 */
export function useResolvedStudentSession() {
  const ctx = useStudentSessionContext();
  const activeStudentId = readActiveStudentIdFromStorage();
  const cachedGradeLevelRaw = activeStudentId
    ? readStudentGradeLevelCache(activeStudentId)
    : null;

  return useMemo(
    () =>
      resolveStudentSessionView({
        status: ctx.status,
        student: ctx.student,
        activeStudentId,
        cachedGradeLevelRaw,
      }),
    [ctx.status, ctx.student, activeStudentId, cachedGradeLevelRaw]
  );
}

/** @deprecated alias — prefer `useResolvedStudentSession` */
export const useStudentGrade = useResolvedStudentSession;
