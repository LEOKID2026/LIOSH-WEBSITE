/**
 * Learning book audio manifest.
 * Keys: "{subject}:{grade}:{pageId}:section:{NN}"
 *
 * Hebrew/English G1–G2: flat sequential page MP3s (`hebrew_g1_page_001.mp3`, …).
 * Math G1: section-level per topic (`{pageId}/section-NN.mp3`).
 */

import { HEBREW_G1_PAGE_ORDER } from "../hebrew-g1-registry.js";
import { HEBREW_G2_PAGE_ORDER } from "../hebrew-g2-registry.js";
import { ENGLISH_G1_PAGE_ORDER } from "../english-g1-registry.js";
import { ENGLISH_G2_PAGE_ORDER } from "../english-g2-registry.js";
import { MATH_G1_PAGE_ORDER } from "../math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "../math-g2-registry.js";
import { GEOMETRY_G1_PAGE_ORDER } from "../geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "../geometry-g2-registry.js";
import { SCIENCE_G1_PAGE_ORDER } from "../science-g1-registry.js";
import { SCIENCE_G2_PAGE_ORDER } from "../science-g2-registry.js";
import {
  buildFlatPageAudioLookup,
  defaultLearningBookFlatPageAudioPublicPath,
} from "./learning-book-flat-page-audio.js";

/** @typedef {{ src: string, label?: string, durationSec?: number|null, cacheVersion?: string, pageNumber?: number }} LearningBookAudioManifestEntry */

/** @typedef {{ subject: string, grade: string, pageIds: readonly string[], sectionsPerPage: number, cacheVersion: string, mode: "flat-page"|"section", expectedPages?: number, installedPages?: number }} BookAudioScope */

export const HEBREW_G1_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "hebrew",
  grade: "g1",
  pageIds: HEBREW_G1_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: 224,
  mode: "flat-page",
  cacheVersion: "20260627-hebrew-g1-flat-v1",
});

export const HEBREW_G2_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "hebrew",
  grade: "g2",
  pageIds: HEBREW_G2_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: 161,
  mode: "flat-page",
  cacheVersion: "20260627-hebrew-g2-flat-v1",
});

export const ENGLISH_G1_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "english",
  grade: "g1",
  pageIds: ENGLISH_G1_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: 154,
  mode: "flat-page",
  cacheVersion: "20260627-english-g1-flat-v1",
});

export const ENGLISH_G2_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "english",
  grade: "g2",
  pageIds: ENGLISH_G2_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: 182,
  mode: "flat-page",
  cacheVersion: "20260627-english-g2-flat-v1",
});

export const SCIENCE_G1_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "science",
  grade: "g1",
  pageIds: SCIENCE_G1_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: 42,
  installedPages: 42,
  mode: "flat-page",
  cacheVersion: "20260628-science-g1-flat-v1",
});

export const SCIENCE_G2_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "science",
  grade: "g2",
  pageIds: SCIENCE_G2_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: 49,
  installedPages: 49,
  mode: "flat-page",
  cacheVersion: "20260628-science-g2-flat-v1",
});

/** Math G2 — flat-page pilot: first topic sections 1–6 only (pages 001–006). */
export const MATH_G2_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "math",
  grade: "g2",
  pageIds: MATH_G2_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: MATH_G2_PAGE_ORDER.length * 7,
  installedPages: 6,
  mode: "flat-page",
  cacheVersion: "20260628-math-g2-flat-pilot-v1",
});

/** Geometry G1 — flat-page (3 topics × 7 sections = 21 pages). */
export const GEOMETRY_G1_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "geometry",
  grade: "g1",
  pageIds: GEOMETRY_G1_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: GEOMETRY_G1_PAGE_ORDER.length * 7,
  installedPages: GEOMETRY_G1_PAGE_ORDER.length * 7,
  mode: "flat-page",
  cacheVersion: "20260628-geometry-g1-flat-v1",
});

/** Geometry G2 — flat-page (3 topics × 7 sections = 21 pages). */
export const GEOMETRY_G2_FLAT_PAGE_AUDIO = Object.freeze({
  subject: "geometry",
  grade: "g2",
  pageIds: GEOMETRY_G2_PAGE_ORDER,
  sectionsPerPage: 7,
  expectedPages: GEOMETRY_G2_PAGE_ORDER.length * 7,
  installedPages: GEOMETRY_G2_PAGE_ORDER.length * 7,
  mode: "flat-page",
  cacheVersion: "20260628-geometry-g2-flat-v1",
});

/** Math G1 — section-level pilot (19 topics × 7 sections). */
export const MATH_G1_SECTION_AUDIO = Object.freeze({
  subject: "math",
  grade: "g1",
  pageIds: MATH_G1_PAGE_ORDER,
  sectionsPerPage: 7,
  mode: "section",
  cacheVersion: "20260608-math-g1-section-v2",
});

/** @deprecated Use HEBREW_G1_FLAT_PAGE_AUDIO */
export const HEBREW_G1_SECTION_AUDIO = HEBREW_G1_FLAT_PAGE_AUDIO;

/** @deprecated Use ENGLISH_G1_FLAT_PAGE_AUDIO */
export const ENGLISH_G1_PHONICS_SECTION_AUDIO = ENGLISH_G1_FLAT_PAGE_AUDIO;

/** @deprecated Use ENGLISH_G2_FLAT_PAGE_AUDIO */
export const ENGLISH_G2_PHONICS_SECTION_AUDIO = ENGLISH_G2_FLAT_PAGE_AUDIO;

/** @deprecated */
export const ENGLISH_G1_PHONICS_PAGE_IDS = ENGLISH_G1_PAGE_ORDER;

/** @deprecated */
export const ENGLISH_G2_PHONICS_PAGE_IDS = ENGLISH_G2_PAGE_ORDER;

/** @deprecated */
export const HEBREW_G1_SECTION_AUDIO_PILOT = HEBREW_G1_FLAT_PAGE_AUDIO;

export const BOOK_AUDIO_SCOPES = Object.freeze([
  HEBREW_G1_FLAT_PAGE_AUDIO,
  HEBREW_G2_FLAT_PAGE_AUDIO,
  ENGLISH_G1_FLAT_PAGE_AUDIO,
  ENGLISH_G2_FLAT_PAGE_AUDIO,
  SCIENCE_G1_FLAT_PAGE_AUDIO,
  SCIENCE_G2_FLAT_PAGE_AUDIO,
  MATH_G2_FLAT_PAGE_AUDIO,
  GEOMETRY_G1_FLAT_PAGE_AUDIO,
  GEOMETRY_G2_FLAT_PAGE_AUDIO,
  MATH_G1_SECTION_AUDIO,
]);

/** @deprecated Use BOOK_AUDIO_SCOPES */
export const BOOK_SECTION_AUDIO_SCOPES = BOOK_AUDIO_SCOPES;

/** Default cache version (Hebrew G1). */
export const LEARNING_BOOK_AUDIO_CACHE_VERSION = HEBREW_G1_FLAT_PAGE_AUDIO.cacheVersion;

const _SCOPE_PAGE_SETS = new Map(
  BOOK_AUDIO_SCOPES.map((scope) => [
    `${scope.subject}:${scope.grade}`,
    new Set(scope.pageIds),
  ])
);

const _FLAT_PAGE_LOOKUPS = new Map(
  BOOK_AUDIO_SCOPES.filter((scope) => scope.mode === "flat-page").map((scope) => [
    `${scope.subject}:${scope.grade}`,
    buildFlatPageAudioLookup(scope.pageIds, scope.sectionsPerPage),
  ])
);

/**
 * @param {string} subject
 * @param {string} grade
 * @returns {BookAudioScope|null}
 */
export function getBookAudioScope(subject, grade) {
  const s = String(subject || "").trim().toLowerCase();
  const g = String(grade || "").trim().toLowerCase();
  return BOOK_AUDIO_SCOPES.find((scope) => scope.subject === s && scope.grade === g) || null;
}

/** @deprecated Use getBookAudioScope */
export function getBookSectionAudioScope(subject, grade) {
  return getBookAudioScope(subject, grade);
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @returns {boolean}
 */
export function isBookSectionAudioPage(subject, grade, pageId) {
  const scope = getBookAudioScope(subject, grade);
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
  const scope = getBookAudioScope(subject, grade);
  const sec = Number(sectionNumber);
  if (!scope || !isBookSectionAudioPage(subject, grade, pageId)) return false;
  if (!Number.isFinite(sec) || sec < 1 || sec > scope.sectionsPerPage) return false;

  if (scope.mode === "flat-page") {
    const globalPage = resolveBookGlobalPageNumber(subject, grade, pageId, sectionNumber);
    if (!globalPage) return false;
    const limit = scope.installedPages ?? scope.expectedPages;
    if (limit != null && globalPage > limit) return false;
  }

  return true;
}

/**
 * @param {string} subject
 * @param {string} grade
 * @param {string} pageId
 * @param {number} sectionNumber
 * @returns {number|null}
 */
export function resolveBookGlobalPageNumber(subject, grade, pageId, sectionNumber) {
  const scope = getBookAudioScope(subject, grade);
  if (!scope || scope.mode !== "flat-page") return null;
  if (!isBookSectionAudioPage(subject, grade, pageId)) return null;
  const sec = Number(sectionNumber);
  if (!Number.isFinite(sec) || sec < 1 || sec > scope.sectionsPerPage) return null;
  const lookup = _FLAT_PAGE_LOOKUPS.get(`${scope.subject}:${scope.grade}`);
  if (!lookup) return null;
  const n = lookup.get(`${String(pageId || "").trim()}:${sec}`);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** @deprecated */
export function isHebrewG1SectionAudioPage(subject, grade, pageId) {
  return isBookSectionAudioPage(subject, grade, pageId);
}

/** @deprecated */
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
  const globalPage = resolveBookGlobalPageNumber(subject, grade, pageId, sectionNumber);
  if (globalPage) {
    return defaultLearningBookFlatPageAudioPublicPath(subject, grade, globalPage);
  }

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

for (const scope of BOOK_AUDIO_SCOPES) {
  for (const pageId of scope.pageIds) {
    for (let sectionNumber = 1; sectionNumber <= scope.sectionsPerPage; sectionNumber += 1) {
      const globalPage =
        scope.mode === "flat-page"
          ? resolveBookGlobalPageNumber(scope.subject, scope.grade, pageId, sectionNumber)
          : null;

      if (scope.mode === "flat-page" && globalPage) {
        const limit = scope.installedPages ?? scope.expectedPages;
        if (limit != null && globalPage > limit) continue;
      }

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
        label: scope.mode === "flat-page" ? "flat-page" : "section",
        cacheVersion: scope.cacheVersion,
        ...(globalPage ? { pageNumber: globalPage } : {}),
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
