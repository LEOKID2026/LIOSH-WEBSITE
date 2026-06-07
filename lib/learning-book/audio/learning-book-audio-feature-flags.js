/**
 * Learning book page audio — feature flags (fail closed by default).
 */

/**
 * Client-visible gate for the book audio player.
 * @returns {boolean}
 */
export function isLearningBookAudioEnabledClient() {
  return process.env.NEXT_PUBLIC_LEARNING_BOOK_AUDIO_ENABLED === "true";
}

/**
 * Server/script gate for generation and server-side audio tooling.
 * @returns {boolean}
 */
export function isLearningBookAudioEnabledServer() {
  return process.env.LEARNING_BOOK_AUDIO_ENABLED === "true";
}
