/**
 * Grade 6 Moledet / Geography learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */
import { PAGE_CANDIDATES_BY_GRADE } from "./moledet-geography-master-scope-manifest.mjs";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G6MgBatch */

/** @type {G6MgBatch[]} */
export const MOLEDET_GEOGRAPHY_G6_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "חברה, סביבה וטבע",
    pages: [
      "mg_g6_population",
      "mg_g6_natural_phenomena",
      "mg_g6_environment_quality",
      "mg_g6_human_environment",
    ],
  },
  {
    id: "b",
    titleHe: "דמוקרטיה, ערכים ומעורבות",
    pages: [
      "mg_g6_democracy",
      "mg_g6_values",
      "mg_g6_state_institutions",
      "mg_g6_social_involvement",
    ],
  },
];

export const MOLEDET_GEOGRAPHY_G6_PAGE_ORDER =
  MOLEDET_GEOGRAPHY_G6_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const MOLEDET_GEOGRAPHY_G6_ALIGNMENT_ANCHORS = {
  mg_g6_population: ["מגוון", "כבד"],
  mg_g6_natural_phenomena: ["תופע", "טבע"],
  mg_g6_environment_quality: ["איכות", "סביבה"],
  mg_g6_human_environment: ["אדם", "סביבה"],
  mg_g6_democracy: ["דמוקרט", "כבוד"],
  mg_g6_values: ["תור שווה", "ילד"],
  mg_g6_state_institutions: ["מוסד", "מדינה"],
  mg_g6_social_involvement: ["מעורבות", "מתנדב"],
};

/** Highest-sensitivity pages — owner must verify before publish */
export const MOLEDET_GEOGRAPHY_G6_VERIFY_SENSITIVE = [
  "mg_g6_population: group/community vocabulary — [VERIFY]",
  "mg_g6_democracy: civic concepts — neutral framing [VERIFY]",
  "mg_g6_values: exact values list — [VERIFY]",
  "mg_g6_state_institutions: institution names and roles — [VERIFY]",
  "mg_g6_social_involvement: civic participation examples — [VERIFY]",
];

const g6Pages = PAGE_CANDIDATES_BY_GRADE.g6;

/** @type {Record<string, { skillId: string; boundSkillIds: string[]; pageType: string; titleHe: string; scope: string }>} */
export const MOLEDET_GEOGRAPHY_G6_PAGE_META = Object.fromEntries(
  g6Pages.map((p) => [
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
