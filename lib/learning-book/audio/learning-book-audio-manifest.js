/**
 * Learning book audio manifest — section-level pilots: Hebrew G1 + Math G1.
 * Keys: "{subject}:{grade}:{pageId}:section:{NN}"
 *
 * pageId-level / full-topic page.mp3 was rejected — one MP3 per visible internal page only.
 */

import { HEBREW_G1_PAGE_ORDER } from "../hebrew-g1-registry.js";
import { MATH_G1_PAGE_ORDER } from "../math-g1-registry.js";

/** @typedef {{ src: string, label?: string, durationSec?: number|null, cacheVersion?: string }} LearningBookAudioManifestEntry */

/** @typedef {{ subject: string, grade: string, pageIds: readonly string[], sectionsPerPage: number, cacheVersion: string }} BookSectionAudioScope */

export const HEBREW_G1_SECTION_AUDIO = Object.freeze({
  subject: "hebrew",
  grade: "g1",
  pageIds: HEBREW_G1_PAGE_ORDER,
  sectionsPerPage: 7,
  cacheVersion: "20260608-hebrew-g1-section-v2",
});

/** Math G1 — second and final pilot (19 topics × 7 sections). */
export const MATH_G1_SECTION_AUDIO = Object.freeze({
  subject: "math",
  grade: "g1",
  pageIds: MATH_G1_PAGE_ORDER,
  sectionsPerPage: 7,
  cacheVersion: "20260608-math-g1-section-v2",
});

/** @deprecated Use HEBREW_G1_SECTION_AUDIO */
export const HEBREW_G1_SECTION_AUDIO_PILOT = HEBREW_G1_SECTION_AUDIO;

export const BOOK_SECTION_AUDIO_SCOPES = Object.freeze([
  HEBREW_G1_SECTION_AUDIO,
  MATH_G1_SECTION_AUDIO,
]);

/** Default cache version (Hebrew G1 legacy export). */
export const LEARNING_BOOK_AUDIO_CACHE_VERSION = HEBREW_G1_SECTION_AUDIO.cacheVersion;

const _SCOPE_PAGE_SETS = new Map(
  BOOK_SECTION_AUDIO_SCOPES.map((scope) => [
    `${scope.subject}:${scope.grade}`,
    new Set(scope.pageIds),
  ])
);

/**
 * @param {string} subject
 * @param {string} grade
 * @returns {BookSectionAudioScope|null}
 */
export function getBookSectionAudioScope(subject, grade) {
  const s = String(subject || "").trim().toLowerCase();
  const g = String(grade || "").trim().toLowerCase();
  return BOOK_SECTION_AUDIO_SCOPES.find((scope) => scope.subject === s && scope.grade === g) || null;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @returns {boolean}
 */
export function isBookSectionAudioPage(subject, grade, pageId) {
  const scope = getBookSectionAudioScope(subject, grade);
  if (!scope) return false;
  const p = String(pageId || "").trim();
  const set = _SCOPE_PAGE_SETS.get(`${scope.subject}:${scope.grade}`);
  return Boolean(set?.has(p));
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {number} sectionNumber
 * @returns {boolean}
 */
export function isBookSectionAudioSlot(subject, grade, pageId, sectionNumber) {
  const scope = getBookSectionAudioScope(subject, grade);
  const sec = Number(sectionNumber);
  if (!scope || !isBookSectionAudioPage(subject, grade, pageId)) return false;
  return Number.isFinite(sec) && sec >= 1 && sec <= scope.sectionsPerPage;
}

/** @deprecated Use isBookSectionAudioPage for Hebrew G1 */
export function isHebrewG1SectionAudioPage(subject, grade, pageId) {
  return isBookSectionAudioPage(subject, grade, pageId);
}

/** @deprecated Use isBookSectionAudioSlot */
export function isHebrewG1SectionAudioSlot(subject, grade, pageId, sectionNumber) {
  return isBookSectionAudioSlot(subject, grade, pageId, sectionNumber);
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {number} sectionNumber
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

for (const scope of BOOK_SECTION_AUDIO_SCOPES) {
  for (const pageId of scope.pageIds) {
    for (let sectionNumber = 1; sectionNumber <= scope.sectionsPerPage; sectionNumber += 1) {
      const key = learningBookAudioManifestKey(
        scope.subject,
        scope.grade,
        pageId,
        sectionNumber
      );
      _MANIFEST_ENTRIES[key] = {
        src: defaultLearningBookSectionAudioPublicPath(
          scope.subject,
          scope.grade,
          pageId,
          sectionNumber
        ),
        label: "section",
        cacheVersion: scope.cacheVersion,
      };
    }
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
