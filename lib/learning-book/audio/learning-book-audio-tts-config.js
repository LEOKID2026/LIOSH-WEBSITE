/**
 * Offline TTS generation settings for learning book section audio.
 * Hebrew/Math G1: single Hebrew voice. English phonics: mixed he-IL + en-US SSML.
 */

/** @type {string} Edge TTS prosody rate — ~88% of default at -12% (target 85–90%). */
export const LEARNING_BOOK_AUDIO_TTS_RATE =
  String(process.env.LEARNING_BOOK_AUDIO_TTS_RATE || "-12%").trim() || "-12%";

export const LEARNING_BOOK_AUDIO_TTS_VOICE = "he-IL-HilaNeural";
export const LEARNING_BOOK_AUDIO_TTS_LANG = "he-IL";

/** English phonics — US child-friendly voice for Latin tokens (locked Step 3A). */
export const ENGLISH_BOOK_AUDIO_EN_VOICE =
  String(process.env.ENGLISH_BOOK_AUDIO_EN_VOICE || "en-US-JennyNeural").trim() ||
  "en-US-JennyNeural";

/** English phonics — Hebrew narration voice for section framing. */
export const ENGLISH_BOOK_AUDIO_HE_VOICE =
  String(process.env.ENGLISH_BOOK_AUDIO_HE_VOICE || "he-IL-HilaNeural").trim() ||
  "he-IL-HilaNeural";

/**
 * @param {string} subject
 * @param {string} grade
 */
export function getLearningBookAudioTtsOptions(subject, grade) {
  const s = String(subject || "").trim().toLowerCase();
  const g = String(grade || "").trim().toLowerCase();
  const rate = LEARNING_BOOK_AUDIO_TTS_RATE;
  const timeout = s === "english" ? 180000 : 120000;

  if (s === "english" && (g === "g1" || g === "g2")) {
    return {
      voice: ENGLISH_BOOK_AUDIO_HE_VOICE,
      lang: "he-IL",
      rate,
      pitch: "default",
      volume: "default",
      timeout,
      proxy: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || undefined,
    };
  }

  return {
    voice: LEARNING_BOOK_AUDIO_TTS_VOICE,
    lang: LEARNING_BOOK_AUDIO_TTS_LANG,
    rate,
    pitch: "default",
    volume: "default",
    timeout,
    proxy: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || undefined,
  };
}
