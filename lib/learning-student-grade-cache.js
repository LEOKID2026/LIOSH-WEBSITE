/** Per-student grade_level hint for initial render (not authoritative). */

/** @param {string} studentId */
export function studentGradeLevelStorageKey(studentId) {
  return `liosh_student_grade_${String(studentId || "").trim()}`;
}

function storageAvailable() {
  return typeof globalThis !== "undefined" && globalThis.localStorage;
}

/**
 * Read cached grade_level hint for one student (not authoritative).
 * @param {string | null | undefined} studentId
 * @returns {string}
 */
export function readStudentGradeLevelCache(studentId) {
  if (!storageAvailable() || !studentId) return "";
  try {
    return String(
      globalThis.localStorage.getItem(studentGradeLevelStorageKey(studentId)) || ""
    ).trim();
  } catch {
    return "";
  }
}

/**
 * @param {string | null | undefined} studentId
 * @param {string | null | undefined} gradeLevel
 */
export function writeStudentGradeLevelCache(studentId, gradeLevel) {
  if (!storageAvailable() || !studentId) return;
  const key = studentGradeLevelStorageKey(studentId);
  const value = gradeLevel != null ? String(gradeLevel).trim() : "";
  try {
    if (value) {
      globalThis.localStorage.setItem(key, value);
    } else {
      globalThis.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

/** @param {string | null | undefined} studentId */
export function clearStudentGradeLevelCache(studentId) {
  if (!storageAvailable() || !studentId) return;
  try {
    globalThis.localStorage.removeItem(studentGradeLevelStorageKey(studentId));
  } catch {
    /* ignore */
  }
}
