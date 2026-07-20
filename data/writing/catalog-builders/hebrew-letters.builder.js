/**
 * Hebrew letters ready catalog — W-001 to W-063 (63 entries).
 * @module data/writing/catalog-builders/hebrew-letters.builder
 */

import {
  HEBREW_FINALS,
  HEBREW_FINAL_SLUG_NAMES,
  HEBREW_LETTERS_22,
  HEBREW_LETTER_SLUG_NAMES,
  formatCatalogNumber,
  makeCatalogEntry,
} from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/** @type {WritingCatalogBuilderEntry[]} */
const HEBREW_LETTER_SINGLES = [];

for (let i = 0; i < HEBREW_LETTERS_22.length; i += 1) {
  const letter = HEBREW_LETTERS_22[i];
  const name = HEBREW_LETTER_SLUG_NAMES[letter];
  const catalogNum = 1 + i;
  HEBREW_LETTER_SINGLES.push(
    makeCatalogEntry({
      slug: `writing-he-${name}-trace-standard`,
      catalogNumber: formatCatalogNumber(catalogNum),
      writingCategory: "hebrew_letters",
      titleHe: `עקיבה — ${letter}`,
      seed: 1000 + catalogNum,
      builderConfig: {
        writingCategory: "hebrew_letters",
        characters: [letter],
        scriptStyle: "print",
        tracingMode: "trace",
        traceRenderMode: "faint_model",
        lineTemplate: "single_letter_hero",
        lineCount: 6,
        itemsPerLine: 1,
      },
    })
  );
}

for (let i = 0; i < HEBREW_LETTERS_22.length; i += 1) {
  const letter = HEBREW_LETTERS_22[i];
  const name = HEBREW_LETTER_SLUG_NAMES[letter];
  const catalogNum = 23 + i;
  HEBREW_LETTER_SINGLES.push(
    makeCatalogEntry({
      slug: `writing-he-${name}-trace-script`,
      catalogNumber: formatCatalogNumber(catalogNum),
      writingCategory: "hebrew_letters",
      titleHe: `עקיבה כתב — ${letter}`,
      seed: 1000 + catalogNum,
      builderConfig: {
        writingCategory: "hebrew_letters",
        characters: [letter],
        scriptStyle: "script",
        tracingMode: "trace",
        traceRenderMode: "faint_model",
        lineTemplate: "single_letter_hero",
        lineCount: 6,
        itemsPerLine: 1,
      },
    })
  );
}

for (let i = 0; i < HEBREW_FINALS.length; i += 1) {
  const letter = HEBREW_FINALS[i];
  const name = HEBREW_FINAL_SLUG_NAMES[letter];
  const catalogNum = 45 + i;
  HEBREW_LETTER_SINGLES.push(
    makeCatalogEntry({
      slug: `writing-he-${name}-trace`,
      catalogNumber: formatCatalogNumber(catalogNum),
      writingCategory: "hebrew_letters",
      titleHe: `עקיבה — ${letter}`,
      seed: 1000 + catalogNum,
      builderConfig: {
        writingCategory: "hebrew_letters",
        characters: [letter],
        scriptStyle: "print",
        tracingMode: "trace",
        traceRenderMode: "faint_model",
        lineTemplate: "single_letter_hero",
        lineCount: 6,
        itemsPerLine: 1,
      },
    })
  );
}

/** @type {Array<{ catalogNum: number, slug: string, titleHe: string, characters: string[], builderConfig?: Record<string, unknown> }>} */
const HEBREW_LETTER_GROUPS = [
  {
    catalogNum: 50,
    slug: "writing-he-group-aleph-he",
    titleHe: "קבוצה א–ה",
    characters: ["א", "ב", "ג", "ד", "ה"],
  },
  {
    catalogNum: 51,
    slug: "writing-he-group-vav-yod",
    titleHe: "קבוצה ו–י",
    characters: ["ו", "ז", "ח", "ט", "י"],
  },
  {
    catalogNum: 52,
    slug: "writing-he-group-kaf-samekh",
    titleHe: "קבוצה כ–ס",
    characters: ["כ", "ל", "מ", "נ", "ס"],
  },
  {
    catalogNum: 53,
    slug: "writing-he-group-ayin-tav",
    titleHe: "קבוצה ע–ת",
    characters: ["ע", "פ", "צ", "ק", "ר", "ש", "ת"],
  },
  {
    catalogNum: 54,
    slug: "writing-he-group-full-alphabet",
    titleHe: "כל האלף־בית",
    characters: HEBREW_LETTERS_22,
    builderConfig: { lineCount: 8, itemsPerLine: 4 },
  },
  {
    catalogNum: 55,
    slug: "writing-he-group-finals",
    titleHe: "אותיות סופיות",
    characters: HEBREW_FINALS,
  },
  {
    catalogNum: 56,
    slug: "writing-he-group-similar",
    titleHe: "אותיות דומות",
    characters: ["ב", "כ", "ד", "ר", "מ", "ס", "ח", "ה", "ק"],
  },
  {
    catalogNum: 57,
    slug: "writing-he-group-confusable",
    titleHe: "אותיות שמתבלבלות",
    characters: ["ו", "ז", "ט", "מ", "ס", "ם"],
  },
  {
    catalogNum: 58,
    slug: "writing-he-group-straight",
    titleHe: "אותיות ישרות",
    characters: ["א", "ה", "ח", "ט", "י", "ל", "מ", "נ", "ק"],
  },
  {
    catalogNum: 59,
    slug: "writing-he-group-curved",
    titleHe: "אותיות מעוגלות",
    characters: ["ב", "ג", "ד", "כ", "ע", "פ", "צ", "ש"],
  },
  {
    catalogNum: 60,
    slug: "writing-he-group-varied",
    titleHe: "תרגול מגוון",
    characters: ["ש", "מ", "א", "ר", "ל", "כ", "ה", "ב"],
  },
  {
    catalogNum: 61,
    slug: "writing-he-group-print-script",
    titleHe: "דפוס וכתב",
    characters: ["א", "ב", "ג", "ד"],
    builderConfig: {
      scriptStyle: "print_and_script",
      lineCount: 8,
      itemsPerLine: 2,
    },
  },
  {
    catalogNum: 62,
    slug: "writing-he-group-letter-word",
    titleHe: "אות ומילה",
    characters: ["א", "ב", "מ", "ש"],
    builderConfig: {
      tracingMode: "trace_and_copy",
      lineCount: 8,
      itemsPerLine: 2,
      includeImage: true,
    },
  },
  {
    catalogNum: 63,
    slug: "writing-he-group-review",
    titleHe: "חזרה — אותיות",
    characters: ["א", "ב", "מ", "ל", "ש", "ר", "ה", "כ", "ת", "י", "נ", "ס"],
    builderConfig: { lineCount: 8, itemsPerLine: 4 },
  },
];

/** @type {WritingCatalogBuilderEntry[]} */
const HEBREW_LETTER_GROUP_ENTRIES = HEBREW_LETTER_GROUPS.map((group) =>
  makeCatalogEntry({
    slug: group.slug,
    catalogNumber: formatCatalogNumber(group.catalogNum),
    writingCategory: "hebrew_letters",
    titleHe: group.titleHe,
    seed: 1000 + group.catalogNum,
    builderConfig: {
      writingCategory: "hebrew_letters",
      characters: group.characters,
      scriptStyle: "print",
      tracingMode: "trace_and_copy",
      traceRenderMode: "faint_model",
      lineTemplate: "trace_row",
      lineCount: 6,
      itemsPerLine: Math.min(5, group.characters.length),
      ...(group.builderConfig || {}),
    },
  })
);

/** @type {WritingCatalogBuilderEntry[]} */
export const HEBREW_LETTERS_CATALOG = [...HEBREW_LETTER_SINGLES, ...HEBREW_LETTER_GROUP_ENTRIES];

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildHebrewLettersCatalog() {
  return HEBREW_LETTERS_CATALOG;
}
