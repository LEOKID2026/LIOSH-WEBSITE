/**
 * Grade 3 Moledet / Geography learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */
import { PAGE_CANDIDATES_BY_GRADE } from "./moledet-geography-master-scope-manifest.mjs";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G3MgBatch */

/** @type {G3MgBatch[]} */
export const MOLEDET_GEOGRAPHY_G3_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "גאוגרפיה של ישראל",
    pages: [
      "mg_g3_israel_map",
      "mg_g3_regions_cities",
      "mg_g3_landscapes",
      "mg_g3_water_sources",
      "mg_g3_districts_borders",
    ],
  },
  {
    id: "b",
    titleHe: "אזרחות — יסודות",
    pages: [
      "mg_g3_citizenship_basics",
      "mg_g3_rights_duties",
      "mg_g3_social_participation",
    ],
  },
];

export const MOLEDET_GEOGRAPHY_G3_PAGE_ORDER =
  MOLEDET_GEOGRAPHY_G3_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const MOLEDET_GEOGRAPHY_G3_ALIGNMENT_ANCHORS = {
  mg_g3_israel_map: ["מפת", "ישראל"],
  mg_g3_regions_cities: ["צפון", "הרים"],
  mg_g3_landscapes: ["הר", "נוף"],
  mg_g3_water_sources: ["ים", "מים"],
  mg_g3_districts_borders: ["מחוז", "גבול"],
  mg_g3_citizenship_basics: ["אזרח", "קהילה"],
  mg_g3_rights_duties: ["זכות", "חובה"],
  mg_g3_social_participation: ["קהילה", "ניקיון"],
};

/** Place names appearing in child-facing copy — owner must verify spellings */
export const MOLEDET_GEOGRAPHY_G3_VERIFY_PLACE_NAMES = [
  "mg_g3_israel_map: Israel map labels (general)",
  "mg_g3_regions_cities: צפון, מרכז, דרום; example cities — owner list pending",
  "mg_g3_water_sources: ים המלח, הים התיכון, כנרת — [VERIFY]",
  "mg_g3_districts_borders: מחוז / גבול terminology — [VERIFY]",
];

const g3Pages = PAGE_CANDIDATES_BY_GRADE.g3;

/** @type {Record<string, { skillId: string; boundSkillIds: string[]; pageType: string; titleHe: string; scope: string }>} */
export const MOLEDET_GEOGRAPHY_G3_PAGE_META = Object.fromEntries(
  g3Pages.map((p) => [
    p.page_id,
    {
      skillId: p.primary_skill_id,
      boundSkillIds: p.bound_skill_ids,
      pageType: "concept_foundation",
      titleHe: p.title_hebrew,
      scope: p.title_hebrew,
    },
  ])
);
