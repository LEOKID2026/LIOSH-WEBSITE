/**
 * Grade 4 Moledet / Geography learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */
import { PAGE_CANDIDATES_BY_GRADE } from "./moledet-geography-master-scope-manifest.mjs";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G4MgBatch */

/** @type {G4MgBatch[]} */
export const MOLEDET_GEOGRAPHY_G4_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "יישובים בישראל",
    pages: ["mg_g4_settlement_types", "mg_g4_settlement_development"],
  },
  {
    id: "b",
    titleHe: "מפות ומשאבי טבע",
    pages: ["mg_g4_map_scale_symbols", "mg_g4_natural_resources"],
  },
  {
    id: "c",
    titleHe: "ממשל וקהילה",
    pages: [
      "mg_g4_government_structure",
      "mg_g4_organizations",
      "mg_g4_government_institutions",
    ],
  },
];

export const MOLEDET_GEOGRAPHY_G4_PAGE_ORDER =
  MOLEDET_GEOGRAPHY_G4_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const MOLEDET_GEOGRAPHY_G4_ALIGNMENT_ANCHORS = {
  mg_g4_settlement_types: ["מושב", "קיבוץ"],
  mg_g4_settlement_development: ["יישוב", "ישראל"],
  mg_g4_map_scale_symbols: ["קנה מידה", "מרחק"],
  mg_g4_natural_resources: ["משאב", "שמש"],
  mg_g4_government_structure: ["מרכזי", "חוק"],
  mg_g4_organizations: ["קהילה", "מתנדב"],
  mg_g4_government_institutions: ["מוסד", "שפיטה"],
};

/** Content flags for owner review */
export const MOLEDET_GEOGRAPHY_G4_VERIFY_NOTES = [
  "mg_g4_settlement_development: historical narrative — neutral overview only; no dates [VERIFY]",
  "mg_g4_government_structure: role-based institution names [VERIFY]",
  "mg_g4_government_institutions: basic roles only — no current office-holders",
];

const g4Pages = PAGE_CANDIDATES_BY_GRADE.g4;

/** @type {Record<string, { skillId: string; boundSkillIds: string[]; pageType: string; titleHe: string; scope: string }>} */
export const MOLEDET_GEOGRAPHY_G4_PAGE_META = Object.fromEntries(
  g4Pages.map((p) => [
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
