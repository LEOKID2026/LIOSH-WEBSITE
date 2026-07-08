import {
  DEFAULT_PROFILE_BACKGROUND_KEY,
  PROFILE_BACKGROUND_OPTION_IDS,
  PROFILE_BACKGROUND_OPTIONS,
} from "./profile-background-options.js";

export const PROFILE_BACKGROUND_LS_KEY = "mleo_player_avatar_background";

/** @param {unknown} raw */
export function resolveProfileBackgroundKey(raw) {
  const key = String(raw || "").trim();
  return PROFILE_BACKGROUND_OPTION_IDS.has(key) ? key : DEFAULT_PROFILE_BACKGROUND_KEY;
}

/** @param {unknown} key */
export function resolveProfileBackgroundStyle(key) {
  const id = resolveProfileBackgroundKey(key);
  const option = PROFILE_BACKGROUND_OPTIONS.find((entry) => entry.id === id);
  return { background: option?.background ?? PROFILE_BACKGROUND_OPTIONS[0].background };
}

export function readProfileBackgroundFromLocalStorage() {
  if (typeof window === "undefined") return DEFAULT_PROFILE_BACKGROUND_KEY;
  try {
    return resolveProfileBackgroundKey(localStorage.getItem(PROFILE_BACKGROUND_LS_KEY));
  } catch {
    return DEFAULT_PROFILE_BACKGROUND_KEY;
  }
}

/** @param {unknown} key */
export function writeProfileBackgroundToLocalStorage(key) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_BACKGROUND_LS_KEY, resolveProfileBackgroundKey(key));
  } catch {
    /* quota */
  }
}
