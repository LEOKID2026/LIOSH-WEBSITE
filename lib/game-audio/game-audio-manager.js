import { createStemPlaybackController, pickEnglishTtsVoice, pickHebrewTtsVoice } from "../../utils/audio-playback-core.js";
import { narrationContentHash16 } from "../../utils/hebrew-audio-narration-binding.js";
import { hebrewGenStreamUrl } from "../../utils/hebrew-audio-gen-url.js";
import { resetGameAudioSettings } from "./game-audio-settings.js";
import { sanitizeHebrewSpeechText } from "./sanitize-hebrew-speech-text.js";

/** @param {string} raw @param {string} locale */
function speechTextForLocale(raw, locale) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (locale.toLowerCase().startsWith("he")) {
    return sanitizeHebrewSpeechText(text);
  }
  return text;
}

const DUCK_RATIO = 0.35;

/**
 * @param {import("./game-audio-manifest.js").GAME_AUDIO_MANIFEST_BY_ID} manifestById
 * @param {() => import("./game-audio-settings.js").DEFAULT_SETTINGS} getSettings
 * @param {(s: object) => void} onSettingsChange
 */
export function createGameAudioManager(manifestById, getSettings, onSettingsChange) {
  if (typeof window === "undefined") {
    return null;
  }

  /** @type {Map<string, HTMLAudioElement[]>} */
  const sfxPool = new Map();
  /** @type {Map<string, number>} */
  const lastPlayAt = new Map();
  /** @type {Set<string>} */
  const warnedMissing = new Set();
  /** @type {Set<any>} */
  const voiceControllers = new Set();

  let musicEl = null;
  let currentMusicId = null;
  let musicPaused = false;
  let learningMasterMusicActive = false;
  let musicDucked = false;
  let musicVolumeBeforeDuck = null;
  let duckingCount = 0;
  let primed = false;
  let voiceGeneration = 0;
  /** @type {{ gen: number, stop?: () => void } | null} */
  let activeVoice = null;

  function isDev() {
    return process.env.NODE_ENV !== "production";
  }

  function settings() {
    return getSettings();
  }

  function canPlaySfx() {
    const s = settings();
    return s.masterEnabled && s.sfxEnabled;
  }

  function canPlayMusic(options = {}) {
    const s = settings();
    if (options.learningMasterScoped) {
      return s.masterEnabled;
    }
    return s.masterEnabled && s.musicEnabled;
  }

  function canPlayVoice() {
    const s = settings();
    return s.masterEnabled && s.voiceEnabled;
  }

  function warnMissingOnce(assetId, path) {
    if (!isDev() || warnedMissing.has(assetId)) return;
    warnedMissing.add(assetId);
    console.warn(`[game-audio] missing asset: ${assetId} (${path})`);
  }

  function getEntry(assetId) {
    return manifestById[assetId] || null;
  }

  function resolvePaths(entry) {
    const paths = [];
    if (entry?.path) paths.push(entry.path);
    if (entry?.legacyAliases?.length) paths.push(...entry.legacyAliases);
    return paths;
  }

  function borrowSfxElement(assetId, entry) {
    const max = entry?.polyphony || 2;
    let pool = sfxPool.get(assetId);
    if (!pool) {
      pool = [];
      sfxPool.set(assetId, pool);
    }
    const idle = pool.find((a) => a.paused || a.ended);
    if (idle) return idle;
    if (pool.length < max) {
      const el = new Audio();
      pool.push(el);
      return el;
    }
    return pool[0];
  }

  function applyMusicVolume() {
    if (!musicEl) return;
    const s = settings();
    const base = s.musicEnabled || learningMasterMusicActive ? s.musicVolume : 0;
    musicEl.volume = musicDucked ? base * DUCK_RATIO : base;
  }

  function beginVoice() {
    duckingCount += 1;
    if (duckingCount === 1 && musicEl && !musicEl.paused) {
      musicDucked = true;
      musicVolumeBeforeDuck = musicEl.volume;
      applyMusicVolume();
    }
  }

  function endVoice() {
    duckingCount = Math.max(0, duckingCount - 1);
    if (duckingCount === 0) {
      musicDucked = false;
      musicVolumeBeforeDuck = null;
      applyMusicVolume();
    }
  }

  function stopVoiceInternal() {
    voiceGeneration += 1;
    if (activeVoice?.stop) {
      try {
        activeVoice.stop();
      } catch {
        /* ignore */
      }
    }
    activeVoice = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    voiceControllers.forEach((c) => {
      try {
        c.stop?.();
      } catch {
        /* ignore */
      }
    });
    endVoice();
  }

  async function tryPlayAudio(el, paths, assetId) {
    for (let i = 0; i < paths.length; i += 1) {
      const src = paths[i];
      if (el.src !== `${window.location.origin}${src}` && !el.src.endsWith(src)) {
        el.src = src;
      }
      try {
        await el.play();
        return true;
      } catch (err) {
        if (i === paths.length - 1) {
          warnMissingOnce(assetId, paths.join(", "));
        }
      }
    }
    return false;
  }

  function primeFromUserGesture() {
    primed = true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        const warm = new SpeechSynthesisUtterance("\u00a0");
        warm.volume = 0;
        window.speechSynthesis.speak(warm);
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
  }

  function playSfx(assetId, options = {}) {
    if (!canPlaySfx()) return null;
    const entry = getEntry(assetId);
    if (!entry || entry.type !== "sfx") return null;

    const now = Date.now();
    const minMs = entry.minIntervalMs || 0;
    const last = lastPlayAt.get(assetId) || 0;
    if (minMs > 0 && now - last < minMs) return null;
    lastPlayAt.set(assetId, now);

    const paths = resolvePaths(entry);
    if (!paths.length) return null;

    const el = borrowSfxElement(assetId, entry);
    el.loop = options.loop ?? entry.loop ?? false;
    const vol = options.volume ?? settings().sfxVolume;
    el.volume = Math.max(0, Math.min(1, vol));
    if (options.onEnded) el.onended = options.onEnded;
    void tryPlayAudio(el, paths, assetId);
    return el;
  }

  function playMusic(assetId, options = {}) {
    if (!canPlayMusic(options)) return;
    const entry = getEntry(assetId);
    if (!entry || entry.type !== "music") return;

    const paths = resolvePaths(entry);
    if (!paths.length) return;

    learningMasterMusicActive = Boolean(options.learningMasterScoped);
    if (!musicEl) musicEl = new Audio();
    if (currentMusicId !== assetId) {
      musicEl.pause();
      musicEl.currentTime = 0;
      currentMusicId = assetId;
      musicEl.loop = options.loop ?? entry.loop ?? true;
      void tryPlayAudio(musicEl, paths, assetId);
    } else if (musicEl.paused) {
      void tryPlayAudio(musicEl, paths, assetId);
    }
    musicPaused = false;
    applyMusicVolume();
  }

  function stopMusic() {
    if (musicEl) {
      musicEl.pause();
      musicEl.currentTime = 0;
    }
    currentMusicId = null;
    musicPaused = false;
    learningMasterMusicActive = false;
  }

  function pauseMusic() {
    if (musicEl && !musicEl.paused) {
      musicEl.pause();
      musicPaused = true;
    }
  }

  function resumeMusic() {
    if (
      musicEl &&
      musicPaused &&
      canPlayMusic(learningMasterMusicActive ? { learningMasterScoped: true } : {})
    ) {
      void musicEl.play().catch(() => {});
      musicPaused = false;
      applyMusicVolume();
    }
  }

  function stopAsset(assetId) {
    const pool = sfxPool.get(assetId);
    if (pool) {
      pool.forEach((a) => {
        if (!a.paused) {
          a.pause();
          a.currentTime = 0;
        }
      });
    }
    if (currentMusicId === assetId) stopMusic();
  }

  function stopGroup() {
    stopMusic();
  }

  function stopAll() {
    sfxPool.forEach((pool) => {
      pool.forEach((a) => {
        if (!a.paused) {
          a.pause();
          a.currentTime = 0;
        }
      });
    });
    stopMusic();
    stopVoiceInternal();
  }

  async function ensureHebrewStream(text) {
    const narration_plaintext = String(text || "").trim();
    if (!narration_plaintext) return null;
    const hash = narrationContentHash16(narration_plaintext);
    try {
      const r = await fetch("/api/hebrew-audio-ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: narration_plaintext }),
      });
      if (!r.ok) return null;
      const body = await r.json().catch(() => null);
      if (body?.url) return body.url;
    } catch {
      return null;
    }
    return hebrewGenStreamUrl(hash);
  }

  function playBrowserTts(text, locale, gen) {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        reject(new Error("speech_synthesis_unavailable"));
        return;
      }
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      const lang = locale || "he-IL";
      u.lang = lang;
      u.volume = settings().voiceVolume;
      const voices = synth.getVoices();
      const isHebrew = lang.toLowerCase().startsWith("he");
      const voice = isHebrew
        ? pickHebrewTtsVoice(voices, lang)
        : pickEnglishTtsVoice(voices, lang);
      if (isHebrew && !voice) {
        reject(new Error("hebrew_voice_unavailable"));
        return;
      }
      if (voice) u.voice = voice;
      u.onend = () => {
        if (gen !== voiceGeneration) return;
        resolve();
      };
      u.onerror = (ev) => {
        if (gen !== voiceGeneration) return;
        reject(new Error(ev.error || "tts_error"));
      };
      const stop = () => synth.cancel();
      activeVoice = { gen, stop };
      synth.speak(u);
    });
  }

  async function playVoice(assetId, payload = {}, options = {}) {
    if (!canPlayVoice()) return;
    const entry = getEntry(assetId);
    if (!entry || entry.type !== "voice") return;

    stopVoiceInternal();
    const gen = voiceGeneration;
    beginVoice();

    const engine = payload.engine || entry.voiceEngine || "edge-tts-hebrew";
    const locale = payload.locale || (engine.includes("english") ? "en-US" : "he-IL");
    const text = speechTextForLocale(payload.text || payload.narration_plaintext || "", locale);

    const finish = () => {
      if (gen !== voiceGeneration) return;
      endVoice();
      activeVoice = null;
      options.onEnded?.();
    };

    try {
      if (payload.stem) {
        const session = createStemPlaybackController(payload.stem, {
          onEnded: finish,
          locale,
        });
        const controller = { stop: () => session.stopAll() };
        registerVoiceController(controller);
        activeVoice = { gen, stop: () => session.stopAll() };
        await session.play();
        unregisterVoiceController(controller);
        finish();
        return;
      }

      if (engine === "browser-tts" || assetId === "voice-question-english-phonics") {
        await playBrowserTts(text, locale, gen);
        finish();
        return;
      }

      const streamUrl = payload.streamUrl || (text ? await ensureHebrewStream(text) : null);
      if (streamUrl && gen === voiceGeneration) {
        const el = new Audio(streamUrl);
        el.volume = settings().voiceVolume;
        const stop = () => {
          el.pause();
          el.currentTime = 0;
        };
        activeVoice = { gen, stop };
        await new Promise((resolve) => {
          const done = () => {
            finish();
            resolve();
          };
          el.onended = done;
          el.onerror = done;
          void el.play().catch(done);
        });
        return;
      }

      if (text) {
        const isHebrew = locale.toLowerCase().startsWith("he");
        const canUseBrowserHebrew =
          !isHebrew ||
          (typeof window !== "undefined" &&
            window.speechSynthesis &&
            pickHebrewTtsVoice(window.speechSynthesis.getVoices(), locale));
        if (canUseBrowserHebrew) {
          try {
            await playBrowserTts(text, locale, gen);
          } catch {
            /* Hebrew without local voice and without stream — do not fall back to English */
          }
        }
      }
      finish();
    } catch {
      finish();
    }
  }

  function stopVoice() {
    stopVoiceInternal();
  }

  function registerVoiceController(controller) {
    if (controller) voiceControllers.add(controller);
  }

  function unregisterVoiceController(controller) {
    if (controller) voiceControllers.delete(controller);
  }

  function getSettingsSnapshot() {
    return { ...settings() };
  }

  function updateSettings(patch) {
    const next = { ...settings(), ...patch };
    onSettingsChange(next);
    if (!next.masterEnabled || !next.voiceEnabled) stopVoiceInternal();
    if (!next.masterEnabled || !next.musicEnabled) stopMusic();
    else applyMusicVolume();
    if (!next.masterEnabled || !next.sfxEnabled) {
      sfxPool.forEach((pool) => {
        pool.forEach((a) => {
          if (!a.paused) {
            a.pause();
            a.currentTime = 0;
          }
        });
      });
    }
  }

  function resetSettings() {
    const next = resetGameAudioSettings();
    onSettingsChange(next);
    stopAll();
    return next;
  }

  function handleVisibilityHidden() {
    stopVoiceInternal();
    pauseMusic();
  }

  function handleRouteChange() {
    stopAll();
  }

  return {
    primeFromUserGesture,
    playSfx,
    playMusic,
    stopMusic,
    pauseMusic,
    resumeMusic,
    stopAsset,
    stopGroup,
    stopAll,
    playVoice,
    stopVoice,
    registerVoiceController,
    unregisterVoiceController,
    beginVoice,
    endVoice,
    getSettings: getSettingsSnapshot,
    updateSettings,
    resetSettings,
    handleVisibilityHidden,
    handleRouteChange,
    isPrimed: () => primed,
  };
}
