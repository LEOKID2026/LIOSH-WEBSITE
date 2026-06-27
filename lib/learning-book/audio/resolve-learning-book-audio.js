/**
 * Resolve pre-generated learning book section audio metadata.
 * Never throws — returns null when audio is unavailable.
 */

import {
  appendLearningBookAudioCacheBust,
  getLearningBookAudioManifestEntry,
  isBookSectionAudioSlot,
  learningBookAudioManifestKey,
} from "./learning-book-audio-manifest.js";

/**
 * @typedef {import("./learning-book-audio-manifest.js").LearningBookAudioManifestEntry & {
 *   subject: string,
 *   grade: string,
 *   pageId: string,
 *   sectionNumber: number,
 *   key: string,
 *   playbackSrc: string,
 * }} ResolvedLearningBookAudio
 */

/**
 * @param {string|null|undefined} subject
 * @param {string|null|undefined} grade
 * @param {string|null|undefined} pageId
 * @param {number|null|undefined} sectionNumber 1-based (section.number from page data)
 * @returns {ResolvedLearningBookAudio|null}
 */
export function resolveLearningBookAudio(subject, grade, pageId, sectionNumber) {
  try {
    const s = String(subject || "").trim().toLowerCase();
    const g = String(grade || "").trim().toLowerCase();
    const p = String(pageId || "").trim();
    const sec = Number(sectionNumber);
    if (!s || !g || !p || !Number.isFinite(sec) || sec < 1) return null;

    if (!isBookSectionAudioSlot(s, g, p, sec)) return null;

    const key = learningBookAudioManifestKey(s, g, p, sec);
    const entry = getLearningBookAudioManifestEntry(key);
    if (!entry) return null;

    const src = String(entry.src || "").trim();
    if (!src) return null;

    const playbackSrc = appendLearningBookAudioCacheBust(src, entry.cacheVersion);

    return {
      ...entry,
      src,
      playbackSrc,
      subject: s,
      grade: g,
      pageId: p,
      sectionNumber: sec,
      key,
      pageNumber: entry.pageNumber ?? null,
    };
  } catch {
    return null;
  }
}
