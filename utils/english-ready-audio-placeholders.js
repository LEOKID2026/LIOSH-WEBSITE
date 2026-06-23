/**
 * English audio is now active via TTS:
 *   - G1/G2 phonics: attachEnglishPhonicsPracticeAudio (english-phonics-practice-audio.js)
 *   - G1/G2 vocabulary: attachEnglishVocabPracticeAudio (english-phonics-practice-audio.js)
 *
 * This file is kept for backward compatibility.
 * ENGLISH_AUDIO_PRODUCT_ACTIVATED is no longer used by the runtime.
 */

/** @deprecated English TTS audio is active; use english-phonics-practice-audio.js instead. */
export const ENGLISH_AUDIO_PRODUCT_ACTIVATED = true;

/** @returns {never[]} */
export function listEnglishPhonicsEvaluators() {
  return [];
}
