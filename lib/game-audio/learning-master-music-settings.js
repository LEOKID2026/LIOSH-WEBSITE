export const LEARNING_MASTER_MUSIC_SETTINGS_KEY = "leokids_learning_master_music_v1";
export const LEARNING_MASTER_MUSIC_SETTINGS_VERSION = 1;

/** @returns {boolean} Default false — BGM off in Learning Masters until user opts in. */
export function loadLearningMasterMusicEnabled() {
  if (typeof window === "undefined") return false;
  try {
    const raw = JSON.parse(localStorage.getItem(LEARNING_MASTER_MUSIC_SETTINGS_KEY));
    if (
      raw &&
      typeof raw === "object" &&
      raw.version === LEARNING_MASTER_MUSIC_SETTINGS_VERSION
    ) {
      return raw.musicEnabled === true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** @param {boolean} enabled */
export function saveLearningMasterMusicEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LEARNING_MASTER_MUSIC_SETTINGS_KEY,
      JSON.stringify({
        version: LEARNING_MASTER_MUSIC_SETTINGS_VERSION,
        musicEnabled: Boolean(enabled),
      }),
    );
  } catch {
    /* ignore quota */
  }
}
