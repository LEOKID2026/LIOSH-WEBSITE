/** Phase A: subjects with real client-side question preview generators (no placeholders). */
export const ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS = new Set(["math", "science"]);

/**
 * @param {string} subject
 */
export function isActivityPreviewSubjectSupported(subject) {
  return ACTIVITY_PREVIEW_SUPPORTED_SUBJECTS.has(String(subject || "").trim().toLowerCase());
}
