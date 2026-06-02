/**
 * Grade 1 Moledet / Geography learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */
import { PAGE_CANDIDATES_BY_GRADE } from "./moledet-geography-master-scope-manifest.mjs";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G1MgBatch */

/** @type {G1MgBatch[]} */
export const MOLEDET_GEOGRAPHY_G1_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "משפחה וקהילה קרובה",
    pages: ["mg_g1_family", "mg_g1_close_community"],
  },
  {
    id: "b",
    titleHe: "מפות — כיתה, בית ספר וכיוונים",
    pages: ["mg_g1_class_map", "mg_g1_school_map", "mg_g1_directions"],
  },
  {
    id: "c",
    titleHe: "כללי התנהגות ושיתוף",
    pages: ["mg_g1_behavior_cooperation"],
  },
];

export const MOLEDET_GEOGRAPHY_G1_PAGE_ORDER =
  MOLEDET_GEOGRAPHY_G1_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const MOLEDET_GEOGRAPHY_G1_ALIGNMENT_ANCHORS = {
  mg_g1_family: ["משפחה", "אמא"],
  mg_g1_close_community: ["כיתה", "בית הספר"],
  mg_g1_class_map: ["מפת", "כיתה"],
  mg_g1_school_map: ["מפת", "בית ספר"],
  mg_g1_directions: ["ימין", "שמאל"],
  mg_g1_behavior_cooperation: ["שיתוף", "כלל"],
};

const g1Pages = PAGE_CANDIDATES_BY_GRADE.g1;

/** @type {Record<string, { skillId: string; boundSkillIds: string[]; pageType: string; titleHe: string; scope: string }>} */
export const MOLEDET_GEOGRAPHY_G1_PAGE_META = Object.fromEntries(
  g1Pages.map((p) => [
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
