/**
 * Learning book audio manifest — section-level Hebrew Grade 1 (full book).
 * Keys: "{subject}:{grade}:{pageId}:section:{NN}"
 *
 * pageId-level / full-topic page.mp3 was rejected — one MP3 per visible internal page only.
 * src may be a site-relative path (/audio/...) or absolute CDN URL (https://...).
 */

import { HEBREW_G1_PAGE_ORDER } from "../hebrew-g1-registry.js";

/** @typedef {{ src: string, label?: string, durationSec?: number|null, cacheVersion?: string }} LearningBookAudioManifestEntry */

/** All Hebrew G1 topics with section-level audio (32 pages × 7 sections). */
export const HEBREW_G1_SECTION_AUDIO = Object.freeze({
  subject: "hebrew",
  grade: "g1",
  pageIds: HEBREW_G1_PAGE_ORDER,
  sectionsPerPage: 7,
});

/** @deprecated Use HEBREW_G1_SECTION_AUDIO — kept for transitional imports. */
export const HEBREW_G1_SECTION_AUDIO_PILOT = HEBREW_G1_SECTION_AUDIO;

const _HEBREW_G1_PAGE_ID_SET = new Set(HEBREW_G1_PAGE_ORDER);

/** Bump when MP3 assets are regenerated (cache-bust query param). */
export const LEARNING_BOOK_AUDIO_CACHE_VERSION = "20260608-hebrew-g1-section-v1";

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @returns {boolean}
 */
export function isHebrewG1SectionAudioPage(subject, grade, pageId) {
  const s = String(subject || "").trim().toLowerCase();
  const g = String(grade || "").trim().toLowerCase();
  const p = String(pageId || "").trim();
  return (
    s === HEBREW_G1_SECTION_AUDIO.subject &&
    g === HEBREW_G1_SECTION_AUDIO.grade &&
    _HEBREW_G1_PAGE_ID_SET.has(p)
  );
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {number} sectionNumber
 * @returns {boolean}
 */
export function isHebrewG1SectionAudioSlot(subject, grade, pageId, sectionNumber) {
  const sec = Number(sectionNumber);
  if (!isHebrewG1SectionAudioPage(subject, grade, pageId)) return false;
  return Number.isFinite(sec) && sec >= 1 && sec <= HEBREW_G1_SECTION_AUDIO.sectionsPerPage;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {number} sectionNumber 1-based section number (matches UI "עמוד N מתוך 7")
 * @returns {string}
 */
export function learningBookAudioManifestKey(subject, grade, pageId, sectionNumber) {
  const sec = String(sectionNumber).padStart(2, "0");
  return `${String(subject || "").toLowerCase()}:${String(grade || "").toLowerCase()}:${String(pageId || "").trim()}:section:${sec}`;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {number} sectionNumber
 * @returns {string}
 */
export function defaultLearningBookSectionAudioPublicPath(subject, grade, pageId, sectionNumber) {
  const s = String(subject || "").toLowerCase();
  const g = String(grade || "").toLowerCase();
  const p = String(pageId || "").trim();
  const sec = String(sectionNumber).padStart(2, "0");
  return `/audio/learning-books/${s}/${g}/${p}/section-${sec}.mp3`;
}

/**
 * @param {string} src
 * @param {string} [cacheVersion]
 * @returns {string}
 */
export function appendLearningBookAudioCacheBust(src, cacheVersion = LEARNING_BOOK_AUDIO_CACHE_VERSION) {
  const base = String(src || "").trim();
  if (!base || !cacheVersion) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${encodeURIComponent(cacheVersion)}`;
}

/** @type {Record<string, LearningBookAudioManifestEntry>} */
const _MANIFEST_ENTRIES = {};

for (const pageId of HEBREW_G1_SECTION_AUDIO.pageIds) {
  for (let sectionNumber = 1; sectionNumber <= HEBREW_G1_SECTION_AUDIO.sectionsPerPage; sectionNumber += 1) {
    const key = learningBookAudioManifestKey(
      HEBREW_G1_SECTION_AUDIO.subject,
      HEBREW_G1_SECTION_AUDIO.grade,
      pageId,
      sectionNumber
    );
    _MANIFEST_ENTRIES[key] = {
      src: defaultLearningBookSectionAudioPublicPath(
        HEBREW_G1_SECTION_AUDIO.subject,
        HEBREW_G1_SECTION_AUDIO.grade,
        pageId,
        sectionNumber
      ),
      label: "section",
      cacheVersion: LEARNING_BOOK_AUDIO_CACHE_VERSION,
    };
  }
}

export const LEARNING_BOOK_AUDIO_MANIFEST = Object.freeze(_MANIFEST_ENTRIES);

/**
 * @param {string} key
 * @returns {LearningBookAudioManifestEntry|null}
 */
export function getLearningBookAudioManifestEntry(key) {
  if (!key) return null;
  const entry = LEARNING_BOOK_AUDIO_MANIFEST[key];
  if (!entry || !entry.src) return null;
  return entry;
}
