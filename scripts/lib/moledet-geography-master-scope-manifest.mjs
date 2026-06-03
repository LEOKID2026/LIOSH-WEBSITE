/** Moledet / Geography learning-book master scope manifest.
 * Used by scripts/verify-moledet-geography-learning-book-master-scope.mjs
 *
 * Child-facing subject: מולדת וגאוגרפיה
 * Spine learning_page_id prefix: geography (unchanged)
 * Active book subject metadata: moledet (G2–G4), geography (G5–G6)
 */

export const SPINE_SUBJECT = "geography";

export const CHILD_FACING_SUBJECT = "מולדת וגאוגרפיה";

/** Grades with active runtime + prepared books. G1 archived — not taught. */
export const ACTIVE_BOOK_GRADES = ["g2", "g3", "g4", "g5", "g6"];

/** @deprecated G1 content archived under docs/learning-book/moledet-geography/_archive/g1 */
export const ARCHIVED_GRADES = ["g1"];

/** @type {Record<string, { page_id: string, title_hebrew: string, primary_skill_id: string, bound_skill_ids: string[] }[]>} */
export const PAGE_CANDIDATES_BY_GRADE = {
  g1: [
    {
      page_id: "mg_g1_family",
      title_hebrew: "המשפחה ותפקידיה",
      primary_skill_id: "geography:g1:skills:skills_0_הכרת_המשפחה_ותפקידיה",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g1_close_community",
      title_hebrew: "הקהילה הקרובה — כיתה ובית ספר",
      primary_skill_id: "geography:g1:skills:skills_1_הבנת_הקהילה_הקרובה",
      bound_skill_ids: ["geography:g1:citizenship:citizenship_2_השתייכות_לקהילה"],
    },
    {
      page_id: "mg_g1_class_map",
      title_hebrew: "מפת הכיתה",
      primary_skill_id: "geography:g1:geography:geography_0_מפת_כיתה",
      bound_skill_ids: ["geography:g1:skills:skills_2_היכרות_עם_מפות_בסיסיות"],
    },
    {
      page_id: "mg_g1_school_map",
      title_hebrew: "מפת בית הספר",
      primary_skill_id: "geography:g1:geography:geography_1_מפת_בית_ספר",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g1_directions",
      title_hebrew: "כיוונים בסיסיים",
      primary_skill_id: "geography:g1:geography:geography_2_כיוונים_בסיסיים",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g1_behavior_cooperation",
      title_hebrew: "כללי התנהגות ושיתוף פעולה",
      primary_skill_id: "geography:g1:skills:skills_3_הבנת_כללי_התנהגות_ושיתוף_פעולה",
      bound_skill_ids: [
        "geography:g1:citizenship:citizenship_0_כללי_התנהגות",
        "geography:g1:citizenship:citizenship_1_שיתוף_פעולה",
      ],
    },
  ],
  g2: [
    {
      page_id: "mg_g2_neighborhood",
      title_hebrew: "השכונה ומבניה",
      primary_skill_id: "geography:g2:skills:skills_0_הכרת_השכונה_ומבניה",
      bound_skill_ids: ["geography:g2:geography:geography_1_מבנים_וסביבות"],
    },
    {
      page_id: "mg_g2_neighborhood_map",
      title_hebrew: "מפת השכונה",
      primary_skill_id: "geography:g2:geography:geography_0_מפת_שכונה",
      bound_skill_ids: ["geography:g2:skills:skills_2_קריאת_מפת_שכונה"],
    },
    {
      page_id: "mg_g2_community_services",
      title_hebrew: "שירותים בקהילה",
      primary_skill_id: "geography:g2:geography:geography_2_שירותים_בקהילה",
      bound_skill_ids: ["geography:g2:skills:skills_1_הבנת_שירותים_בקהילה"],
    },
    {
      page_id: "mg_g2_israel_basics",
      title_hebrew: "ארץ ישראל — מושגים בסיסיים",
      primary_skill_id: "geography:g2:skills:skills_3_הבנת_מושגים_בסיסיים_על_ארץ_ישראל",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g2_group_decisions",
      title_hebrew: "קבלת החלטות בקבוצה",
      primary_skill_id: "geography:g2:citizenship:citizenship_0_קבלת_החלטות_בקבוצה",
      bound_skill_ids: ["geography:g2:skills:skills_4_הבנת_קבלת_החלטות_בקבוצה"],
    },
    {
      page_id: "mg_g2_society_responsibility",
      title_hebrew: "חברה ואחריות",
      primary_skill_id: "geography:g2:citizenship:citizenship_1_חברה_ואחריות",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g2_community_participation",
      title_hebrew: "השתתפות בקהילה",
      primary_skill_id: "geography:g2:citizenship:citizenship_2_השתתפות_בקהילה",
      bound_skill_ids: [],
    },
  ],
  g3: [
    {
      page_id: "mg_g3_israel_map",
      title_hebrew: "מפת ישראל",
      primary_skill_id: "geography:g3:geography:geography_0_מפת_ישראל",
      bound_skill_ids: ["geography:g3:skills:skills_0_קריאת_מפת_ישראל"],
    },
    {
      page_id: "mg_g3_regions_cities",
      title_hebrew: "אזורים וערים גדולות",
      primary_skill_id: "geography:g3:geography:geography_1_אזורים_וערים",
      bound_skill_ids: ["geography:g3:skills:skills_1_זיהוי_אזורים_וערים_גדולות"],
    },
    {
      page_id: "mg_g3_landscapes",
      title_hebrew: "סוגי נופים",
      primary_skill_id: "geography:g3:geography:geography_2_סוגי_נופים",
      bound_skill_ids: ["geography:g3:skills:skills_2_הכרת_סוגי_נופים"],
    },
    {
      page_id: "mg_g3_water_sources",
      title_hebrew: "מקורות מים",
      primary_skill_id: "geography:g3:geography:geography_3_מקורות_מים",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g3_districts_borders",
      title_hebrew: "מחוזות וגבולות",
      primary_skill_id: "geography:g3:skills:skills_3_הבנת_מחוזות_וגבולות",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g3_citizenship_basics",
      title_hebrew: "כללי אזרחות בסיסיים",
      primary_skill_id: "geography:g3:citizenship:citizenship_0_כללי_אזרחות_בסיסיים",
      bound_skill_ids: ["geography:g3:skills:skills_4_הבנת_כללי_אזרחות_בסיסיים"],
    },
    {
      page_id: "mg_g3_rights_duties",
      title_hebrew: "זכויות וחובות",
      primary_skill_id: "geography:g3:citizenship:citizenship_2_זכויות_וחובות",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g3_social_participation",
      title_hebrew: "השתתפות חברתית",
      primary_skill_id: "geography:g3:citizenship:citizenship_1_השתתפות_חברתית",
      bound_skill_ids: [],
    },
  ],
  g4: [
    {
      page_id: "mg_g4_settlement_types",
      title_hebrew: "סוגי יישובים",
      primary_skill_id: "geography:g4:geography:geography_0_סוגי_יישובים",
      bound_skill_ids: ["geography:g4:skills:skills_0_הכרת_סוגי_יישובים"],
    },
    {
      page_id: "mg_g4_settlement_development",
      title_hebrew: "התפתחות היישובים בישראל",
      primary_skill_id: "geography:g4:skills:skills_1_הבנת_התפתחות_היישובים",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g4_map_scale_symbols",
      title_hebrew: "מפות — קנה מידה וסימנים",
      primary_skill_id: "geography:g4:geography:geography_1_מפות_קנה_מידה_סימנים",
      bound_skill_ids: ["geography:g4:skills:skills_2_קריאת_מפות_מתקדמות"],
    },
    {
      page_id: "mg_g4_natural_resources",
      title_hebrew: "משאבי טבע",
      primary_skill_id: "geography:g4:geography:geography_2_משאבי_טבע",
      bound_skill_ids: ["geography:g4:skills:skills_3_הבנת_משאבי_טבע"],
    },
    {
      page_id: "mg_g4_government_structure",
      title_hebrew: "מבנה הממשל",
      primary_skill_id: "geography:g4:citizenship:citizenship_0_מבנה_ממשל",
      bound_skill_ids: ["geography:g4:skills:skills_4_הבנת_מבנה_הממשל"],
    },
    {
      page_id: "mg_g4_organizations",
      title_hebrew: "ארגונים בקהילה",
      primary_skill_id: "geography:g4:citizenship:citizenship_1_ארגונים",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g4_government_institutions",
      title_hebrew: "מוסדות שלטון",
      primary_skill_id: "geography:g4:citizenship:citizenship_2_מוסדות_שלטון",
      bound_skill_ids: [],
    },
  ],
  g5: [
    {
      page_id: "mg_g5_coordinates",
      title_hebrew: "קואורדינטות במפה",
      primary_skill_id: "geography:g5:geography:geography_0_קואורדינטות",
      bound_skill_ids: ["geography:g5:skills:skills_0_קריאת_מפות_עם_קואורדינטות"],
    },
    {
      page_id: "mg_g5_climate",
      title_hebrew: "אקלים ישראל",
      primary_skill_id: "geography:g5:geography:geography_1_אקלים_ישראל",
      bound_skill_ids: ["geography:g5:skills:skills_1_הבנת_אקלים_ישראל"],
    },
    {
      page_id: "mg_g5_natural_hazards",
      title_hebrew: "סכנות טבע",
      primary_skill_id: "geography:g5:geography:geography_2_סכנות_טבע",
      bound_skill_ids: ["geography:g5:skills:skills_2_הבנת_סכנות_טבע"],
    },
    {
      page_id: "mg_g5_resources",
      title_hebrew: "משאבים וניהולם",
      primary_skill_id: "geography:g5:geography:geography_3_משאבים",
      bound_skill_ids: ["geography:g5:skills:skills_3_הבנת_משאבים_וניהולם"],
    },
    {
      page_id: "mg_g5_government_institutions",
      title_hebrew: "מוסדות שלטון",
      primary_skill_id: "geography:g5:citizenship:citizenship_0_מוסדות_שלטון",
      bound_skill_ids: ["geography:g5:skills:skills_4_הבנת_מוסדות_שלטון"],
    },
    {
      page_id: "mg_g5_law_society",
      title_hebrew: "חוק וכללי חברה",
      primary_skill_id: "geography:g5:citizenship:citizenship_1_חוק_וכללי_חברה",
      bound_skill_ids: ["geography:g5:skills:skills_5_הבנת_חוק_וכללי_חברה"],
    },
    {
      page_id: "mg_g5_identity",
      title_hebrew: "זהות אישית וקהילתית",
      primary_skill_id: "geography:g5:citizenship:citizenship_2_זהות_אישית_וקהילתית",
      bound_skill_ids: [],
    },
  ],
  g6: [
    {
      page_id: "mg_g6_population",
      title_hebrew: "מגוון האוכלוסייה בישראל",
      primary_skill_id: "geography:g6:geography:geography_0_אוכלוסיית_ישראל",
      bound_skill_ids: ["geography:g6:skills:skills_0_הבנת_מגוון_האוכלוסייה_בישראל"],
    },
    {
      page_id: "mg_g6_natural_phenomena",
      title_hebrew: "תופעות טבע",
      primary_skill_id: "geography:g6:geography:geography_1_תופעות_טבע",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g6_environment_quality",
      title_hebrew: "איכות הסביבה",
      primary_skill_id: "geography:g6:geography:geography_2_איכות_הסביבה",
      bound_skill_ids: [],
    },
    {
      page_id: "mg_g6_human_environment",
      title_hebrew: "יחסי אדם–סביבה",
      primary_skill_id: "geography:g6:geography:geography_3_יחסי_אדם_סביבה",
      bound_skill_ids: ["geography:g6:skills:skills_1_הבנת_תופעות_טבע_ואיכות_סביבה"],
    },
    {
      page_id: "mg_g6_democracy",
      title_hebrew: "דמוקרטיה בישראל",
      primary_skill_id: "geography:g6:citizenship:citizenship_0_דמוקרטיה_בישראל",
      bound_skill_ids: ["geography:g6:skills:skills_2_הבנת_הדמוקרטיה_בישראל"],
    },
    {
      page_id: "mg_g6_values",
      title_hebrew: "ערכי המדינה",
      primary_skill_id: "geography:g6:citizenship:citizenship_1_ערכים",
      bound_skill_ids: ["geography:g6:skills:skills_3_הבנת_ערכי_המדינה"],
    },
    {
      page_id: "mg_g6_state_institutions",
      title_hebrew: "מוסדות המדינה",
      primary_skill_id: "geography:g6:citizenship:citizenship_2_מוסדות_המדינה",
      bound_skill_ids: ["geography:g6:skills:skills_4_הבנת_מוסדות_המדינה"],
    },
    {
      page_id: "mg_g6_social_involvement",
      title_hebrew: "קבלת החלטות ומעורבות חברתית",
      primary_skill_id: "geography:g6:citizenship:citizenship_3_מעורבות_חברתית",
      bound_skill_ids: ["geography:g6:skills:skills_5_הבנת_קבלת_החלטות_ומעורבות_חברתית"],
    },
  ],
};

/** Topics in curriculum/constants with no dedicated spine skill rows */
export const OUT_OF_SPINE_UI_TOPICS = ["homeland", "community", "values", "maps", "mixed"];
