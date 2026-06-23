/**
 * Grade 5 Moledet / Geography learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */
import { PAGE_CANDIDATES_BY_GRADE } from "./moledet-geography-master-scope-manifest.mjs";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G5MgBatch */

/** @type {G5MgBatch[]} */
export const MOLEDET_GEOGRAPHY_G5_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "מפות, אקלים וסביבה",
    pages: [
      "mg_g5_coordinates",
      "mg_g5_climate",
      "mg_g5_natural_hazards",
      "mg_g5_resources",
    ],
  },
  {
    id: "b",
    titleHe: "אזרחות וזהות",
    pages: [
      "mg_g5_government_institutions",
      "mg_g5_law_society",
      "mg_g5_identity",
    ],
  },
];

export const MOLEDET_GEOGRAPHY_G5_PAGE_ORDER =
  MOLEDET_GEOGRAPHY_G5_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const MOLEDET_GEOGRAPHY_G5_ALIGNMENT_ANCHORS = {
  mg_g5_coordinates: ["קואורדינט", "מפה"],
  mg_g5_climate: ["אקלים", "ים"],
  mg_g5_natural_hazards: ["רעידה", "רגועים"],
  mg_g5_resources: ["משאב", "בזבוז"],
  mg_g5_government_institutions: ["מוסד", "ניהול"],
  mg_g5_law_society: ["חוק", "כלל"],
  mg_g5_identity: ["זהות", "קהילה"],
};

/** Institution / role wording — owner must verify before publish */
export const MOLEDET_GEOGRAPHY_G5_VERIFY_INSTITUTIONS = [
  "mg_g5_government_institutions: generic roles only in draft; named bodies — [VERIFY]",
  "mg_g5_law_society: law/society rules — neutral civic framing [VERIFY]",
];

const g5Pages = PAGE_CANDIDATES_BY_GRADE.g5;

/** @type {Record<string, { skillId: string; boundSkillIds: string[]; pageType: string; titleHe: string; scope: string }>} */
export const MOLEDET_GEOGRAPHY_G5_PAGE_META = Object.fromEntries(
  g5Pages.map((p) => [
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
