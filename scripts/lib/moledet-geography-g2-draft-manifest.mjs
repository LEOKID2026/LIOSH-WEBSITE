/**
 * Grade 2 Moledet / Geography learning book — draft-only manifest (scripts / docs).
 * NOT runtime registry.
 */
import { PAGE_CANDIDATES_BY_GRADE } from "./moledet-geography-master-scope-manifest.mjs";

/** @typedef {{ id: string, titleHe: string, pages: string[] }} G2MgBatch */

/** @type {G2MgBatch[]} */
export const MOLEDET_GEOGRAPHY_G2_BOOK_BATCHES = [
  {
    id: "a",
    titleHe: "השכונה ומפת השכונה",
    pages: ["mg_g2_neighborhood", "mg_g2_neighborhood_map", "mg_g2_community_services"],
  },
  {
    id: "b",
    titleHe: "ארץ ישראל — היכרות ראשונה",
    pages: ["mg_g2_israel_basics"],
  },
  {
    id: "c",
    titleHe: "חברה, אחריות והשתתפות",
    pages: [
      "mg_g2_group_decisions",
      "mg_g2_society_responsibility",
      "mg_g2_community_participation",
    ],
  },
];

export const MOLEDET_GEOGRAPHY_G2_PAGE_ORDER =
  MOLEDET_GEOGRAPHY_G2_BOOK_BATCHES.flatMap((b) => b.pages);

/** Section 5/6 alignment anchors — same context in both sections */
export const MOLEDET_GEOGRAPHY_G2_ALIGNMENT_ANCHORS = {
  mg_g2_neighborhood: ["שכונה", "בית"],
  mg_g2_neighborhood_map: ["מפת", "שכונה"],
  mg_g2_community_services: ["שירות", "קהיל"],
  mg_g2_israel_basics: ["ארץ ישראל", "ים"],
  mg_g2_group_decisions: ["קבוצה", "רעיונות"],
  mg_g2_society_responsibility: ["אחריות", "חברה"],
  mg_g2_community_participation: ["קהילה", "ספר"],
};

const g2Pages = PAGE_CANDIDATES_BY_GRADE.g2;

/** @type {Record<string, { skillId: string; boundSkillIds: string[]; pageType: string; titleHe: string; scope: string }>} */
export const MOLEDET_GEOGRAPHY_G2_PAGE_META = Object.fromEntries(
  g2Pages.map((p) => [
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
