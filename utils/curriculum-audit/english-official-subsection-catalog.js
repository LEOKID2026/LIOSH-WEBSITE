/**
 * English (EFL, יסודי) — subsection/skill catalog for audit alignment.
 * Primary owner reference: repo PDF `תוכנית משרד החינוך/english Curriculum2020.pdf`.
 * Strand keys align with `ISRAELI_PRIMARY_CURRICULUM_MAP` english strands (prefix match).
 */

/** @typedef {'high' | 'medium' | 'low'} CatalogConfidence */

/**
 * @typedef {{
 *   sectionKey: string,
 *   labelHe: string,
 *   strand: string,
 *   mapsToNormalizedKeys: string[],
 *   confidence: CatalogConfidence,
 *   notes?: string,
 * }} EnglishCatalogSection
 */

/**
 * @typedef {{
 *   grade: number,
 *   sourcePortalUrl: string,
 *   sourcePdf?: string,
 *   sections: EnglishCatalogSection[],
 * }} EnglishGradeCatalogSlot
 */

const POP_ENGLISH_CURRICULUM =
  "https://pop.education.gov.il/tchumey_daat/english/yesodi/curriculum/";
const OWNER_PDF_REL = "תוכנית משרד החינוך/english Curriculum2020.pdf";

function sec(sectionKey, labelHe, strand, mapsToNormalizedKeys, confidence, notes = "") {
  return {
    sectionKey,
    labelHe,
    strand,
    mapsToNormalizedKeys,
    confidence,
    notes,
  };
}

/** @type {Record<string, EnglishGradeCatalogSlot>} */
export const ENGLISH_OFFICIAL_SUBSECTION_CATALOG = {
  grade_1: {
    grade: 1,
    sourcePortalUrl: POP_ENGLISH_CURRICULUM,
    sourcePdf: OWNER_PDF_REL,
    sections: [
      sec(
        "g1_listening_oral_exposure",
        "חשיפה: האזנה ודיבור בסיסי (אותיות/צלילים בהקשר חווייתי)",
        "listening_speaking",
        ["english.exposure_oral_listening", "english.vocabulary_translation"],
        "medium",
        "כיתות נמוכות: דגש על חשיפה ומילולי - לא הבנת הנקרא פורמלית מלאה."
      ),
      sec(
        "g1_lexis_core",
        "אוצר מילים ומילולי בסיסי",
        "lexis",
        ["english.vocabulary_translation"],
        "high",
        ""
      ),
      sec(
        "g1_grammar_intro",
        "דקדוק מובנה - רמת חשיפה / תרגול מוגבל",
        "grammar",
        ["english.grammar"],
        "medium",
        "במפת האתר השמרנית דקדוק אינו ליבה בכיתות א׳–ב׳ - תואם מצב enrichment במוצר."
      ),
    ],
  },
  grade_2: {
    grade: 2,
    sourcePortalUrl: POP_ENGLISH_CURRICULUM,
    sourcePdf: OWNER_PDF_REL,
    sections: [
      sec(
        "g2_oral_lexis",
        "האזנה, דיבור ואוצר מילים מורחב",
        "listening_speaking",
        ["english.exposure_oral_listening", "english.vocabulary_translation"],
        "medium",
        ""
      ),
      sec(
        "g2_early_writing_patterns",
        "כתיבה קצרה ותבניות משפט פשוטות",
        "writing_patterns",
        ["english.sentence_writing_patterns"],
        "medium",
        ""
      ),
      sec(
        "g2_grammar_structured",
        "דקדוק בסיסי (מובנה)",
        "grammar",
        ["english.grammar"],
        "medium",
        ""
      ),
    ],
  },
  grade_3: {
    grade: 3,
    sourcePortalUrl: POP_ENGLISH_CURRICULUM,
    sourcePdf: OWNER_PDF_REL,
    sections: [
      sec(
        "g3_literacy_bridge",
        "אוריינות ראשונית: משפטים, תרגום ודפוסים (הבנת הנקרא הפורמלית במוצר עדיין לא כנושא נפרד)",
        "literacy",
        ["english.vocabulary_translation", "english.sentence_writing_patterns", "english.grammar"],
        "medium",
        "המפה השמרנית ב-israeli-primary-curriculum-map עדיין לא מציבה strand נפרד להבנת הנקרא פורמלית לכיתה ג׳ - לא למפות מפתח זה כאן עד עדכון המפה."
      ),
    ],
  },
  grade_4: {
    grade: 4,
    sourcePortalUrl: POP_ENGLISH_CURRICULUM,
    sourcePdf: OWNER_PDF_REL,
    sections: [
      sec(
        "g4_grammar_lexis",
        "דקדוק ואוצר מילים במקביל להרחבת משפטים",
        "grammar_lexis",
        ["english.grammar", "english.vocabulary_translation"],
        "medium",
        ""
      ),
      sec(
        "g4_sentence_discourse",
        "משפטים, קשרים ודפוסי ניסוח",
        "patterns",
        ["english.sentence_writing_patterns"],
        "medium",
        ""
      ),
    ],
  },
  grade_5: {
    grade: 5,
    sourcePortalUrl: POP_ENGLISH_CURRICULUM,
    sourcePdf: OWNER_PDF_REL,
    sections: [
      sec(
        "g5_extended_grammar",
        "העמקת דקדוק (זמנים, מודאליים, השוואה)",
        "grammar",
        ["english.grammar"],
        "medium",
        ""
      ),
      sec(
        "g5_writing_discourse",
        "כתיבה מורחבת וטקסטים קצרים",
        "writing",
        ["english.sentence_writing_patterns", "english.vocabulary_translation"],
        "medium",
        ""
      ),
    ],
  },
  grade_6: {
    grade: 6,
    sourcePortalUrl: POP_ENGLISH_CURRICULUM,
    sourcePdf: OWNER_PDF_REL,
    sections: [
      sec(
        "g6_advanced_literacy",
        "אוריינות מתקדמת: משפטים מורכבים וזמנים משולבים",
        "literacy",
        ["english.grammar", "english.sentence_writing_patterns", "english.vocabulary_translation"],
        "medium",
        ""
      ),
      sec(
        "g6_global_themes_lexis",
        "נושאים גלובליים ואוצר מילים מופשט",
        "themes",
        ["english.vocabulary_translation"],
        "low",
        ""
      ),
    ],
  },
};
