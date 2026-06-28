import { STUDENT_OFFLINE_FULL_GAMES_ENABLED } from "./offline-flags.js";

export { STUDENT_OFFLINE_FULL_GAMES_ENABLED };

/** Redirect solo/edu offline routes when UI flag is off. */
export function shouldBlockOfflineFullGamesRoute() {
  return !STUDENT_OFFLINE_FULL_GAMES_ENABLED;
}
