export const SETTINGS_KEY = "leokids_audio_v1";
export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  migrationMarker: null,
  masterEnabled: true,
  sfxEnabled: true,
  musicEnabled: true,
  voiceEnabled: true,
  sfxVolume: 0.7,
  musicVolume: 0.3,
  voiceVolume: 0.85,
  autoPlayInstructions: false,
  autoPlayQuestions: false,
};

function clamp01(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function parseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isValidSettings(obj) {
  return obj && typeof obj === "object" && obj.version === SETTINGS_VERSION;
}

function fromMleoSoundSettings(raw) {
  const o = parseJson(raw);
  if (!o || typeof o !== "object") return null;
  return {
    sfxEnabled: o.soundsEnabled !== false,
    musicEnabled: o.musicEnabled !== false,
    sfxVolume: clamp01(o.soundVolume, DEFAULT_SETTINGS.sfxVolume),
    musicVolume: clamp01(o.musicVolume, DEFAULT_SETTINGS.musicVolume),
  };
}

function fromMinersKeys(sfxMutedRaw, musicMutedRaw) {
  const sfxMuted = sfxMutedRaw === "1";
  const musicMuted = musicMutedRaw === "1";
  return {
    sfxEnabled: !sfxMuted,
    musicEnabled: !musicMuted,
  };
}

/**
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function loadGameAudioSettings() {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };

  try {
    const existing = parseJson(localStorage.getItem(SETTINGS_KEY));
    if (isValidSettings(existing)) {
      return {
        ...DEFAULT_SETTINGS,
        ...existing,
        sfxVolume: clamp01(existing.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
        musicVolume: clamp01(existing.musicVolume, DEFAULT_SETTINGS.musicVolume),
        voiceVolume: clamp01(existing.voiceVolume, DEFAULT_SETTINGS.voiceVolume),
      };
    }
  } catch {
    /* fall through to migration */
  }

  const migrated = { ...DEFAULT_SETTINGS, migrationMarker: "migrated-v1" };

  try {
    const mleo = fromMleoSoundSettings(localStorage.getItem("mleo_sound_settings"));
    if (mleo) {
      migrated.sfxEnabled = mleo.sfxEnabled;
      migrated.musicEnabled = mleo.musicEnabled;
      migrated.sfxVolume = mleo.sfxVolume;
      migrated.musicVolume = mleo.musicVolume;
    } else {
      const miners = fromMinersKeys(
        localStorage.getItem("leo_miners_sfx_muted"),
        localStorage.getItem("leo_miners_music_muted"),
      );
      migrated.sfxEnabled = miners.sfxEnabled;
      migrated.musicEnabled = miners.musicEnabled;
    }
  } catch {
    /* keep defaults */
  }

  saveGameAudioSettings(migrated);
  return migrated;
}

export function saveGameAudioSettings(settings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
}

export function resetGameAudioSettings() {
  const next = { ...DEFAULT_SETTINGS };
  saveGameAudioSettings(next);
  return next;
}
