/** @typedef {'idle'|'eating'|'petting'|'playing'|'playingAfterglow'|'bathing'|'shaking'|'bathAfterglow'|'sleeping'} LeoDogCurrentAction */

export const ACTION_DURATIONS = {
  eating: 3000,
  petting: 3000,
  playing: 4000,
  playingAfterglow: 2000,
  bathing: 5000,
  shaking: 1000,
  bathAfterglow: 2500,
  autoWakeDelay: 2500,
};

export const SLEEP_ENERGY_TICK_MS = 2000;
export const SLEEP_ENERGY_GAIN = 4;

/** @returns {{ currentAction: LeoDogCurrentAction, actionStartedAt: number, actionUntil: number, isSleeping: boolean }} */
export function createActionState() {
  return {
    currentAction: "idle",
    actionStartedAt: 0,
    actionUntil: 0,
    isSleeping: false,
  };
}

/**
 * @param {LeoDogCurrentAction} currentAction
 * @param {boolean} isSleeping
 * @returns {import('./leo-dog-state.js').LeoDogAnim}
 */
export function mapActionToAnim(currentAction, isSleeping) {
  if (isSleeping || currentAction === "sleeping") return "sleep";
  switch (currentAction) {
    case "eating":
      return "eat";
    case "petting":
      return "petHead";
    case "playing":
      return "playBall";
    case "playingAfterglow":
      return "petHead";
    case "bathing":
      return "bath";
    case "shaking":
      return "shake";
    case "bathAfterglow":
      return "petHead";
    default:
      return "idle";
  }
}

/** @param {{ actionUntil: number }} actionState */
export function actionRemainingMs(actionState) {
  if (!actionState.actionUntil) return 0;
  return Math.max(0, actionState.actionUntil - Date.now());
}

/** @param {LeoDogCurrentAction} currentAction @param {boolean} isSleeping */
export function isActionBusy(currentAction, isSleeping) {
  if (isSleeping) return true;
  return currentAction !== "idle";
}
