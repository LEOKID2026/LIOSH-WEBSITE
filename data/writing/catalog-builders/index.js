/**
 * Combined writing ready catalog — 270 entries (plan v3.1).
 * @module data/writing/catalog-builders/index
 */

import { ENGLISH_LETTERS_CATALOG, buildEnglishLettersCatalog } from "./english-letters.builder.js";
import { ENGLISH_WORDS_CATALOG, buildEnglishWordsCatalog } from "./english-words.builder.js";
import { HEBREW_LETTERS_CATALOG, buildHebrewLettersCatalog } from "./hebrew-letters.builder.js";
import { HEBREW_WORDS_CATALOG, buildHebrewWordsCatalog } from "./hebrew-words.builder.js";
import { MIXED_CATALOG, buildMixedCatalog } from "./mixed.builder.js";
import { NUMBERS_CATALOG, buildNumbersCatalog } from "./numbers.builder.js";
import { PREWRITING_CATALOG, buildPrewritingCatalog } from "./prewriting.builder.js";
import { PUBLIC_ACCESS_SLUGS } from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/** @type {WritingCatalogBuilderEntry[]} */
export const WRITING_CATALOG_ENTRIES = [
  ...HEBREW_LETTERS_CATALOG,
  ...ENGLISH_LETTERS_CATALOG,
  ...NUMBERS_CATALOG,
  ...PREWRITING_CATALOG,
  ...HEBREW_WORDS_CATALOG,
  ...ENGLISH_WORDS_CATALOG,
  ...MIXED_CATALOG,
];

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildWritingCatalogEntries() {
  return [
    ...buildHebrewLettersCatalog(),
    ...buildEnglishLettersCatalog(),
    ...buildNumbersCatalog(),
    ...buildPrewritingCatalog(),
    ...buildHebrewWordsCatalog(),
    ...buildEnglishWordsCatalog(),
    ...buildMixedCatalog(),
  ];
}

export { PUBLIC_ACCESS_SLUGS };

export const WRITING_CATALOG_COUNTS = {
  hebrew_letters: HEBREW_LETTERS_CATALOG.length,
  english_letters: ENGLISH_LETTERS_CATALOG.length,
  numbers: NUMBERS_CATALOG.length,
  prewriting: PREWRITING_CATALOG.length,
  hebrew_words: HEBREW_WORDS_CATALOG.length,
  english_words: ENGLISH_WORDS_CATALOG.length,
  mixed: MIXED_CATALOG.length,
  total: WRITING_CATALOG_ENTRIES.length,
};

/**
 * @returns {{ pass: boolean, errors: string[] }}
 */
export function validateWritingCatalogIntegrity() {
  /** @type {string[]} */
  const errors = [];
  const entries = WRITING_CATALOG_ENTRIES;

  if (entries.length !== 270) {
    errors.push(`expected 270 entries, got ${entries.length}`);
  }

  const publicCount = entries.filter((entry) => entry.publicAccess).length;
  if (publicCount !== 25) {
    errors.push(`expected 25 public entries, got ${publicCount}`);
  }

  const slugs = new Set();
  const catalogNumbers = new Set();
  for (const entry of entries) {
    if (slugs.has(entry.slug)) {
      errors.push(`duplicate slug: ${entry.slug}`);
    }
    slugs.add(entry.slug);

    if (catalogNumbers.has(entry.catalogNumber)) {
      errors.push(`duplicate catalogNumber: ${entry.catalogNumber}`);
    }
    catalogNumbers.add(entry.catalogNumber);

    if (entry.publicAccess !== PUBLIC_ACCESS_SLUGS.has(entry.slug)) {
      errors.push(`publicAccess mismatch for ${entry.slug}`);
    }

    if (!entry.builderConfig || typeof entry.builderConfig !== "object") {
      errors.push(`missing builderConfig for ${entry.slug}`);
    }
  }

  for (const slug of PUBLIC_ACCESS_SLUGS) {
    if (!slugs.has(slug)) {
      errors.push(`missing public slug: ${slug}`);
    }
  }

  return { pass: errors.length === 0, errors };
}
