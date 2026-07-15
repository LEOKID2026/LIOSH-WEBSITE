/**
 * Hebrew (חינוך לשוני) — official-skill catalog for audit alignment.
 * Strand labels follow POP curriculum framing; per-grade PDF tables like math kita*.pdf
 * are NOT bundled — see official-curriculum-source-registry (internal_gap).
 */

/** @typedef {'high' | 'medium' | 'low'} CatalogConfidence */

/**
 * @typedef {{
 *   sectionKey: string,
 *   labelHe: string,
 *   strand: string,
 *   mapsToNormalizedKeys: string[],
 *   subsectionLabelsHe?: string[],
 *   confidence: CatalogConfidence,
 *   notes?: string,
 * }} HebrewCatalogSection
 */

/**
 * @typedef {{
 *   grade: number,
 *   sourcePortalUrl: string,
 *   sourcePdf?: string,
 *   sections: HebrewCatalogSection[],
 * }} HebrewGradeCatalogSlot
 */

const POP_CURRICULUM =
  "https://pop.education.gov.il/tchumey_daat/ivrit_chinhch_leshony/yesodi/pedagogy-hebrew-linguistic-education/curriculum/";

const GRADE1_TEACHING =
  "https://pop.education.gov.il/tchumey_daat/ivrit_chinhch_leshony/yesodi/pedagogy-hebrew-linguistic-education/teaching-hebrew-grade1/";

function sec(
  sectionKey,
  labelHe,
  strand,
  mapsToNormalizedKeys,
  confidence,
  notes,
  subsectionLabelsHe = []
) {
  return {
    sectionKey,
    labelHe,
    strand,
    mapsToNormalizedKeys,
    subsectionLabelsHe,
    confidence,
    notes,
  };
}

/** @type {Record<string, HebrewGradeCatalogSlot>} */
export const HEBREW_OFFICIAL_SUBSECTION_CATALOG = {
  grade_1: {
    grade: 1,
    sourcePortalUrl: GRADE1_TEACHING,
    sections: [
      sec(
        "g1_decoding",
        "פענוח, אותיות וניקוד (ראשית קריאה)",
        "decoding",
        ["hebrew.decoding_reading_fluency"],
        "high",
        "דף כיתה א׳ POP - עיגון כיתתי ישיר יחסית.",
        ["אותיות", "צלילים", "מילים עם ניקוד"]
      ),
      sec(
        "g1_early_vocab",
        "אוצר מילים בסיסי והרחבה",
        "vocabulary",
        ["hebrew.vocabulary"],
        "medium",
        "",
        ["מילים מהסביבה", "משפחות מילים בסיסיות"]
      ),
      sec(
        "g1_early_language",
        "ידע לשוני בסיסי (שם עצם, פועל, תואר)",
        "grammar",
        ["hebrew.grammar_language_knowledge"],
        "medium",
        "בכיתה א׳ - דקדוק מוצג ברמת מושגים בסיסיים בלבד.",
        ["חלקי דיבר בסיסיים"]
      ),
      sec(
        "g1_short_comprehension",
        "הבנת הנקרא קצרה ואיתור פרטים",
        "comprehension",
        ["hebrew.reading_comprehension", "hebrew.locating_information"],
        "medium",
        "",
        ["פרטים בטקסט קצר"]
      ),
      sec(
        "g1_early_writing",
        "כתיבה בסיסית (אותיות, מילים, משפטים קצרים)",
        "writing",
        ["hebrew.writing"],
        "medium",
        "",
        []
      ),
      sec(
        "g1_oral",
        "דיבור והבעה בעל פה בסיסית",
        "speaking",
        ["hebrew.oral_expression"],
        "low",
        "",
        []
      ),
    ],
  },
  grade_2: {
    grade: 2,
    sourcePortalUrl: POP_CURRICULUM,
    sections: [
      sec(
        "g2_fluency",
        "שטף קריאה וטקסטים קצרים",
        "fluency",
        ["hebrew.decoding_reading_fluency"],
        "medium",
        "אין דף כיתה נפרד במאגר הרישום - ידני מול POP/מיידע.",
        []
      ),
      sec(
        "g2_comprehension",
        "הבנת הנקרא: פרטים, רעיון מרכזי",
        "comprehension",
        ["hebrew.reading_comprehension", "hebrew.main_idea", "hebrew.locating_information"],
        "medium",
        "",
        []
      ),
      sec(
        "g2_vocab",
        "אוצר מילים והרחבה",
        "vocabulary",
        ["hebrew.vocabulary"],
        "medium",
        "",
        []
      ),
      sec(
        "g2_language",
        "דקדוק בסיסי ומילות קישור ראשוניות",
        "grammar",
        ["hebrew.grammar_language_knowledge", "hebrew.connectors_cohesion"],
        "medium",
        "",
        []
      ),
      sec(
        "g2_writing_oral",
        "כתיבה קצרה והבעה בעל פה",
        "writing_speaking",
        ["hebrew.writing", "hebrew.oral_expression"],
        "low",
        "",
        []
      ),
    ],
  },
  grade_3: {
    grade: 3,
    sourcePortalUrl: POP_CURRICULUM,
    sections: [
      sec(
        "g3_reading_fluency",
        "קריאה שוטפת וטקסטים ארוכים יותר",
        "reading",
        ["hebrew.decoding_reading_fluency"],
        "medium",
        "",
        []
      ),
      sec(
        "g3_comprehension_depth",
        "הבנת הנקרא: השוואה, הסקות, סוגי טקסט",
        "comprehension",
        [
          "hebrew.reading_comprehension",
          "hebrew.inference",
          "hebrew.sequence_order",
          "hebrew.locating_information",
        ],
        "medium",
        "",
        []
      ),
      sec(
        "g3_language_connectors",
        "ידע לשוני: זמנים, מילות קישור, תבניות",
        "grammar",
        ["hebrew.grammar_language_knowledge", "hebrew.connectors_cohesion"],
        "medium",
        "",
        []
      ),
      sec(
        "g3_vocab_context",
        "אוצר מילים והבנה בהקשר",
        "vocabulary",
        ["hebrew.vocabulary"],
        "medium",
        "",
        []
      ),
      sec(
        "g3_writing",
        "כתיבה מובנית ויצירתית",
        "writing",
        ["hebrew.writing"],
        "medium",
        "",
        []
      ),
      sec(
        "g3_oral",
        "דיבור, הצגה והצגת עמדה",
        "speaking",
        ["hebrew.oral_expression"],
        "medium",
        "",
        []
      ),
    ],
  },
  grade_4: {
    grade: 4,
    sourcePortalUrl: POP_CURRICULUM,
    sections: [
      sec(
        "g4_reading_fluency",
        "קריאה ביקורתית מזוויות שונות",
        "reading",
        ["hebrew.decoding_reading_fluency"],
        "medium",
        "",
        []
      ),
      sec(
        "g4_multigenre",
        "קריאה מז׳אנרים שונים וסיכום",
        "reading_comprehension",
        ["hebrew.reading_comprehension", "hebrew.main_idea", "hebrew.locating_information"],
        "medium",
        "",
        []
      ),
      sec(
        "g4_inference",
        "היקש, עמדה, ארגון רעיונות",
        "inference",
        ["hebrew.inference", "hebrew.sequence_order"],
        "medium",
        "",
        []
      ),
      sec(
        "g4_vocab",
        "אוצר מילים והעשרה לשונית",
        "vocabulary",
        ["hebrew.vocabulary"],
        "medium",
        "",
        []
      ),
      sec(
        "g4_language_spelling",
        "דקדוק, הכתבות, גזרות בסיסיות",
        "grammar",
        ["hebrew.grammar_language_knowledge"],
        "low",
        "",
        []
      ),
      sec(
        "g4_writing_structure",
        "כתיבה מובנית (פתיחה–גוף–סיום)",
        "writing",
        ["hebrew.writing"],
        "medium",
        "",
        []
      ),
      sec(
        "g4_oral",
        "דיבור, הצגה ושיח מובנה",
        "speaking",
        ["hebrew.oral_expression"],
        "medium",
        "",
        []
      ),
    ],
  },
  grade_5: {
    grade: 5,
    sourcePortalUrl: POP_CURRICULUM,
    sections: [
      sec(
        "g5_reading_fluency",
        "קריאה מדויקת בעומק",
        "reading",
        ["hebrew.decoding_reading_fluency"],
        "medium",
        "",
        []
      ),
      sec(
        "g5_deep_rc",
        "הבנת הנקרא בעומק: מסקנות, עמדה, השוואה, איתור מידע, רצף",
        "comprehension",
        [
          "hebrew.reading_comprehension",
          "hebrew.inference",
          "hebrew.main_idea",
          "hebrew.locating_information",
          "hebrew.sequence_order",
        ],
        "medium",
        "",
        []
      ),
      sec(
        "g5_language_syntax",
        "דקדוק מורחב: מבנים תחביריים, נטיות",
        "grammar",
        ["hebrew.grammar_language_knowledge"],
        "low",
        "",
        []
      ),
      sec(
        "g5_vocab_roots",
        "אוצר מילים לפי שורשים ומשפחות",
        "vocabulary",
        ["hebrew.vocabulary"],
        "medium",
        "",
        []
      ),
      sec(
        "g5_writing_argument",
        "כתיבה טיעונית וז׳אנרים",
        "writing",
        ["hebrew.writing", "hebrew.oral_expression"],
        "medium",
        "",
        []
      ),
    ],
  },
  grade_6: {
    grade: 6,
    sourcePortalUrl: POP_CURRICULUM,
    sections: [
      sec(
        "g6_reading_fluency",
        "קריאה שוטפת ופענוח במסגרות מורכבות",
        "reading",
        ["hebrew.decoding_reading_fluency"],
        "medium",
        "",
        []
      ),
      sec(
        "g6_complex_texts",
        "טקסטים מורכבים, ניתוח והצגת דעה, איתור מידע",
        "comprehension",
        [
          "hebrew.reading_comprehension",
          "hebrew.inference",
          "hebrew.main_idea",
          "hebrew.sequence_order",
          "hebrew.locating_information",
        ],
        "medium",
        "",
        []
      ),
      sec(
        "g6_language_advanced",
        "דקדוק מתקדם (שייכות, התאמה, מילות יחס)",
        "grammar",
        ["hebrew.grammar_language_knowledge"],
        "low",
        "",
        []
      ),
      sec(
        "g6_writing_extended",
        "כתיבה ארוכה, סיכום וטיעון מלא",
        "writing",
        ["hebrew.writing"],
        "medium",
        "",
        []
      ),
      sec(
        "g6_prep_ms",
        "מיומנויות מגשרות לחט״ב (שפתית)",
        "bridge",
        ["hebrew.vocabulary", "hebrew.oral_expression"],
        "low",
        "מסגרת מוצרית - לא טענה לכיסוי מלא של ספרות חט״ב.",
        []
      ),
    ],
  },
};

export function hebrewGradeCatalogSlot(gradeNum) {
  return HEBREW_OFFICIAL_SUBSECTION_CATALOG[`grade_${gradeNum}`] || null;
}
