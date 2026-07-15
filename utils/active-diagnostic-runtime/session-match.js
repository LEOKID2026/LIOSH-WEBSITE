import { str } from "./str-utils.js";

/**
 * @param {import("./build-pending-probe.js").PendingDiagnosticProbe|null|undefined} probe
 * @param {string} gradeKey
 * @param {string} levelKey
 * @param {string} topic - UI topic / operation (may be "mixed")
 */
export function probeMatchesSession(probe, gradeKey, levelKey, topic) {
  if (!probe || probe.expiresAfterQuestions <= 0) return false;
  if (str(probe.gradeKey) !== str(gradeKey) || str(probe.levelKey) !== str(levelKey)) {
    return false;
  }
  if (topic !== "mixed" && str(probe.topicId) !== str(topic)) return false;
  return true;
}
