/**
 * Shared remote report source detection for parent-report pages (parent vs teacher preview).
 * @param {import('next/router').NextRouter} router
 */
export function parseParentReportRemoteSource(router) {
  if (!router.isReady) {
    return {
      isRemote: false,
      isParent: false,
      isTeacher: false,
      studentId: "",
    };
  }
  const studentId =
    typeof router.query.studentId === "string" ? router.query.studentId.trim() : "";
  const source =
    typeof router.query.source === "string" ? router.query.source.trim() : "";
  const isParent = source === "parent" && studentId.length > 0;
  const isTeacher = source === "teacher" && studentId.length > 0;
  return {
    isRemote: isParent || isTeacher,
    isParent,
    isTeacher,
    studentId,
  };
}

/**
 * @param {"parent"|"teacher"} kind
 * @param {string} studentId
 * @param {URLSearchParams} qs
 */
export function parentReportRemoteDataUrl(kind, studentId, qs) {
  if (kind === "teacher") {
    return `/api/teacher/students/${encodeURIComponent(studentId)}/parent-report-data?${qs}`;
  }
  return `/api/parent/students/${encodeURIComponent(studentId)}/report-data?${qs}`;
}
