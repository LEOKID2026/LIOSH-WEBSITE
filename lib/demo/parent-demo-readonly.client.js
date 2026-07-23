import { isParentDemoMode } from "./parent-demo-mode.client.js";
import { DEMO_READONLY_ACTION_MESSAGES_HE } from "./parent-demo-data/hebrew-labels.js";

/**
 * @param {string} actionKey
 */
export function assertParentDemoReadOnly(actionKey) {
  if (!isParentDemoMode()) return { allowed: true, messageHe: "" };
  const messageHe =
    DEMO_READONLY_ACTION_MESSAGES_HE[actionKey] ||
    DEMO_READONLY_ACTION_MESSAGES_HE.create_student;
  return { allowed: false, messageHe };
}

export function isParentDemoReadOnlyBlocked(actionKey) {
  return !assertParentDemoReadOnly(actionKey).allowed;
}

export function parentDemoReadOnlyMessageHe(actionKey) {
  return assertParentDemoReadOnly(actionKey).messageHe;
}
