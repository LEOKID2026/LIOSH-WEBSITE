/**
 * English letters ready catalog — W-064 to W-155 (92 entries).
 * @module data/writing/catalog-builders/english-letters.builder
 */

import {
  ENGLISH_LOWER,
  ENGLISH_UPPER,
  formatCatalogNumber,
  makeCatalogEntry,
} from "./_builder-utils.js";

/** @typedef {import("./_builder-utils.js").WritingCatalogBuilderEntry} WritingCatalogBuilderEntry */

/** @type {WritingCatalogBuilderEntry[]} */
const ENGLISH_UPPER_SINGLES = ENGLISH_UPPER.map((letter, index) => {
  const catalogNum = 64 + index;
  return makeCatalogEntry({
    slug: `writing-en-upper-${letter}-trace`,
    catalogNumber: formatCatalogNumber(catalogNum),
    writingCategory: "english_letters",
    titleHe: `Trace — ${letter}`,
    seed: 1000 + catalogNum,
    builderConfig: {
      writingCategory: "english_letters",
      characters: [letter],
      letterCase: "upper",
      scriptStyle: "print",
      tracingMode: "trace",
      traceRenderMode: "faint_model",
      lineTemplate: "english_four_line",
      lineCount: 6,
      itemsPerLine: 1,
    },
  });
});

/** @type {WritingCatalogBuilderEntry[]} */
const ENGLISH_LOWER_SINGLES = ENGLISH_LOWER.map((letter, index) => {
  const catalogNum = 90 + index;
  return makeCatalogEntry({
    slug: `writing-en-lower-${letter}-trace`,
    catalogNumber: formatCatalogNumber(catalogNum),
    writingCategory: "english_letters",
    titleHe: `Trace — ${letter}`,
    seed: 1000 + catalogNum,
    builderConfig: {
      writingCategory: "english_letters",
      characters: [letter],
      letterCase: "lower",
      scriptStyle: "print",
      tracingMode: "trace",
      traceRenderMode: "faint_model",
      lineTemplate: "english_four_line",
      lineCount: 6,
      itemsPerLine: 1,
    },
  });
});

/** @type {WritingCatalogBuilderEntry[]} */
const ENGLISH_PAIR_SINGLES = ENGLISH_UPPER.map((upper, index) => {
  const lower = ENGLISH_LOWER[index];
  const catalogNum = 116 + index;
  return makeCatalogEntry({
    slug: `writing-en-pair-${upper}${lower}-trace`,
    catalogNumber: formatCatalogNumber(catalogNum),
    writingCategory: "english_letters",
    titleHe: `Trace — ${upper}${lower}`,
    seed: 1000 + catalogNum,
    builderConfig: {
      writingCategory: "english_letters",
      characters: [upper, lower],
      letterCase: "pairs",
      scriptStyle: "print",
      tracingMode: "trace",
      traceRenderMode: "faint_model",
      lineTemplate: "english_four_line",
      lineCount: 6,
      itemsPerLine: 2,
    },
  });
});

/** @type {Array<{ catalogNum: number, slug: string, titleHe: string, characters: string[], letterCase?: string, builderConfig?: Record<string, unknown> }>} */
const ENGLISH_LETTER_GROUPS = [
  {
    catalogNum: 142,
    slug: "writing-en-group-A-E",
    titleHe: "Group A–E",
    characters: ["A", "B", "C", "D", "E"],
    letterCase: "upper",
  },
  {
    catalogNum: 143,
    slug: "writing-en-group-F-J",
    titleHe: "Group F–J",
    characters: ["F", "G", "H", "I", "J"],
    letterCase: "upper",
  },
  {
    catalogNum: 144,
    slug: "writing-en-group-K-O",
    titleHe: "Group K–O",
    characters: ["K", "L", "M", "N", "O"],
    letterCase: "upper",
  },
  {
    catalogNum: 145,
    slug: "writing-en-group-P-T",
    titleHe: "Group P–T",
    characters: ["P", "Q", "R", "S", "T"],
    letterCase: "upper",
  },
  {
    catalogNum: 146,
    slug: "writing-en-group-U-Z",
    titleHe: "Group U–Z",
    characters: ["U", "V", "W", "X", "Y", "Z"],
    letterCase: "upper",
  },
  {
    catalogNum: 147,
    slug: "writing-en-group-all-upper",
    titleHe: "A–Z uppercase",
    characters: ENGLISH_UPPER,
    letterCase: "upper",
    builderConfig: { lineCount: 8, itemsPerLine: 6 },
  },
  {
    catalogNum: 148,
    slug: "writing-en-group-all-lower",
    titleHe: "a–z lowercase",
    characters: ENGLISH_LOWER,
    letterCase: "lower",
    builderConfig: { lineCount: 8, itemsPerLine: 6 },
  },
  {
    catalogNum: 149,
    slug: "writing-en-group-all-pairs",
    titleHe: "Aa–Zz pairs",
    characters: ENGLISH_UPPER,
    letterCase: "pairs",
    builderConfig: { lineCount: 8, itemsPerLine: 4 },
  },
  {
    catalogNum: 150,
    slug: "writing-en-group-similar",
    titleHe: "Similar letters",
    characters: ["b", "d", "p", "q", "m", "n", "u", "v"],
    letterCase: "lower",
  },
  {
    catalogNum: 151,
    slug: "writing-en-group-straight",
    titleHe: "Straight letters",
    characters: ["E", "F", "H", "I", "L", "T"],
    letterCase: "upper",
  },
  {
    catalogNum: 152,
    slug: "writing-en-group-rounded",
    titleHe: "Rounded letters",
    characters: ["O", "C", "G", "Q", "S"],
    letterCase: "upper",
  },
  {
    catalogNum: 153,
    slug: "writing-en-group-varied",
    titleHe: "Varied practice",
    characters: ["S", "M", "A", "R", "L", "K", "H", "B"],
    letterCase: "upper",
  },
  {
    catalogNum: 154,
    slug: "writing-en-group-letter-word",
    titleHe: "Letter + word",
    characters: ["A", "B", "C", "D"],
    letterCase: "upper",
    builderConfig: {
      tracingMode: "trace_and_copy",
      lineCount: 8,
      itemsPerLine: 2,
      includeImage: true,
    },
  },
  {
    catalogNum: 155,
    slug: "writing-en-group-review",
    titleHe: "Letter review",
    characters: ["S", "M", "A", "R", "L", "K", "H", "B", "C", "D", "E", "F"],
    letterCase: "upper",
    builderConfig: { lineCount: 8, itemsPerLine: 4 },
  },
];

/** @type {WritingCatalogBuilderEntry[]} */
const ENGLISH_GROUP_ENTRIES = ENGLISH_LETTER_GROUPS.map((group) =>
  makeCatalogEntry({
    slug: group.slug,
    catalogNumber: formatCatalogNumber(group.catalogNum),
    writingCategory: "english_letters",
    titleHe: group.titleHe,
    seed: 1000 + group.catalogNum,
    builderConfig: {
      writingCategory: "english_letters",
      characters: group.characters,
      letterCase: group.letterCase || "upper",
      scriptStyle: "print",
      tracingMode: "trace_and_copy",
      traceRenderMode: "faint_model",
      lineTemplate: "english_four_line",
      lineCount: 6,
      itemsPerLine: Math.min(5, group.characters.length),
      ...(group.builderConfig || {}),
    },
  })
);

/** @type {WritingCatalogBuilderEntry[]} */
export const ENGLISH_LETTERS_CATALOG = [
  ...ENGLISH_UPPER_SINGLES,
  ...ENGLISH_LOWER_SINGLES,
  ...ENGLISH_PAIR_SINGLES,
  ...ENGLISH_GROUP_ENTRIES,
];

/**
 * @returns {WritingCatalogBuilderEntry[]}
 */
export function buildEnglishLettersCatalog() {
  return ENGLISH_LETTERS_CATALOG;
}
