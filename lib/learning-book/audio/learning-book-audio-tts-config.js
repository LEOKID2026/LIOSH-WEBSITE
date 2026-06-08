/**
 * Offline TTS generation settings for learning book section audio (Hebrew G1 + Math G1).
 * Rate is applied at MP3 generation time (node-edge-tts), not browser playbackRate.
 */

/** @type {string} Edge TTS prosody rate — ~88% of default at -12% (target 85–90%). */
export const LEARNING_BOOK_AUDIO_TTS_RATE =
  String(process.env.LEARNING_BOOK_AUDIO_TTS_RATE || "-12%").trim() || "-12%";

export const LEARNING_BOOK_AUDIO_TTS_VOICE = "he-IL-HilaNeural";
export const LEARNING_BOOK_AUDIO_TTS_LANG = "he-IL";
