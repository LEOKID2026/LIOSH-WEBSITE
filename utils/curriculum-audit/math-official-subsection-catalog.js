/**
 * Phase 4B-3 — Official Math subsection catalog (planning artefact).
 *
 * Encoded manually from the structure of MoE elementary math programmes (PDF per grade).
 * Does NOT replace reading kita{n}.pdf line-by-line; page hints are indicative only.
 *
 * @typedef {'high' | 'medium' | 'low'} CatalogConfidence
 * @typedef {'intro' | 'basic' | 'developing' | 'advanced'} ExpectedDepth
 */

import { MATH_ELEMENTARY_GRADE_PDF_BASE, SOURCE_REGISTRY_CHECKED_AT } from "./official-curriculum-source-registry.js";

/** @param {number} g */
export function mathGradeProgrammePdfUrl(g) {
  return `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita${g}.pdf`;
}

/**
 * @param {object} p
 * @returns {object}
 */
function sec(p) {
  return {
    confidence: /** @type {CatalogConfidence} */ (p.confidence || "medium"),
    notes:
      p.notes ||
      "נוסח ידני לפי מסגרת תוכנית יסודית - יש לאמת מול PDF הכיתה לפני אישור פריט.",
    ...p,
  };
}

/**
 * Sections for one grade — Hebrew labels align with typical מסמך כיתה headings / strands.
 * `mapsToNormalizedKeys` links audit keys from curriculum-topic-normalizer.js.
 *
 * @param {number} grade 1–6
 */
export function buildSectionsForGrade(grade) {
  /** @type {object[]} */
  const s = [];

  const strand = {
    numbers: "numbers_operations",
    data: "data_investigation",
    geometry: "geometry_measurement",
    patterns: "patterns_early_algebra",
  };

  /* ---------- Grade 1 ---------- */
  if (grade === 1) {
    s.push(
      sec({
        sectionKey: "g1_numbers_natural",
        labelHe: "מספרים טבעיים עד 100 (ספירה, ייצוג, השוואה)",
        strand: strand.numbers,
        subsectionLabelsHe: ["ספירה כרונולוגית", "ייצוג במצבים שונים", "השוואת כמויות"],
        expectedDepth: /** @type {ExpectedDepth} */ ("intro"),
        sourcePageHint: "פרק פתיחה / מספרים במסמך כיתה א׳ - לא נסרק אוטומטית",
        mapsToNormalizedKeys: ["math.number_sense", "math.estimation_rounding"],
        confidence: "high",
      }),
      sec({
        sectionKey: "g1_add_sub_facts",
        labelHe: "חיבור וחיסור בעוד עשר (עובדות בסיס)",
        strand: strand.numbers,
        subsectionLabelsHe: ["חיבור עד 20", "חיסור כמשלים להוספה"],
        expectedDepth: "intro",
        sourcePageHint: "מספרים ופעולות - כיתה א׳",
        mapsToNormalizedKeys: [
          "math.addition_subtraction",
          "math.mixed_operations",
          "math.multiplication_division",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g1_word_simple",
        labelHe: "שאלות מילוליות פשוטות בהקשר יומיומי",
        strand: strand.numbers,
        subsectionLabelsHe: ["בניית מודל חשיבתי לטקסט קצר"],
        expectedDepth: "intro",
        sourcePageHint: "שאלות מילוליות - רמה בסיסית",
        mapsToNormalizedKeys: ["math.word_problems"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g1_patterns_intro",
        labelHe: "דפוסים ויחסים טרום אלגבריים",
        strand: strand.patterns,
        subsectionLabelsHe: ["המשך דפוס", "שוויון פשוט"],
        expectedDepth: "intro",
        sourcePageHint: "דפוסים / משוואות פשוטות במסגרת כיתה א׳",
        mapsToNormalizedKeys: ["math.patterns_sequences", "math.equations_and_expressions"],
        confidence: "low",
      }),
      sec({
        sectionKey: "g1_geometry_shapes",
        labelHe: "צורות במישור - היכרות וסיווג ראשוני",
        strand: strand.geometry,
        subsectionLabelsHe: ["זיהוי צורות", "העתקה ושרטוט חופשי"],
        expectedDepth: "intro",
        sourcePageHint: "גאומטריה כמיתר במתמטיקה",
        mapsToNormalizedKeys: ["math.geometry_context"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g1_data_intro",
        labelHe: "חקר נתונים - ארגון ותיאור ראשוני",
        strand: strand.data,
        subsectionLabelsHe: ["טבלה פשוטה", "שאלות על נתונים"],
        expectedDepth: "intro",
        sourcePageHint: "חקר נתונים - יסודות",
        mapsToNormalizedKeys: ["math.data_and_charts"],
        confidence: "medium",
      })
    );
  }

  /* ---------- Grade 2 ---------- */
  if (grade === 2) {
    s.push(
      sec({
        sectionKey: "g2_numbers_to_1000",
        labelHe: "מבנה העשרוני ומספרים עד 1000",
        strand: strand.numbers,
        subsectionLabelsHe: ["מאות/עשרות/אחדות", "השוואה והערכה"],
        expectedDepth: "basic",
        sourcePageHint: "מספרים ופעולות - כיתה ב׳",
        mapsToNormalizedKeys: ["math.number_sense", "math.estimation_rounding"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_add_sub_multi_digit",
        labelHe: "חיבור וחיסור בתחום רחב יותר",
        strand: strand.numbers,
        subsectionLabelsHe: ["אסטרטגיות מנטליות", "כתיבה אנכית"],
        expectedDepth: "basic",
        sourcePageHint: "חיבור וחיסור",
        mapsToNormalizedKeys: ["math.addition_subtraction", "math.mixed_operations"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_mult_div_intro",
        labelHe: "כפל כחזרה על חיבור; חילוק כחלוקה שווה",
        strand: strand.numbers,
        subsectionLabelsHe: ["טבלאות בסיס", "שארית - כניסה זהירה"],
        expectedDepth: "basic",
        sourcePageHint: "כפל וחילוק ראשוני",
        mapsToNormalizedKeys: ["math.multiplication_division"],
        confidence: "medium",
        notes:
          "לא ממפים כאן math.divisibility_factors - סימני התחלקות פורמליים בקטלוג נפרד לכיתה ג׳ (g3_divisibility_intro); הגנרטור משחרר התחלקות מכיתה ג׳ בלבד.",
      }),
      sec({
        sectionKey: "g2_fractions_intro",
        labelHe: "שברים - חצי ורבע כחלק מכלל",
        strand: strand.numbers,
        subsectionLabelsHe: ["דגם חלק משלם", "השוואת שברי יחידה"],
        expectedDepth: "basic",
        sourcePageHint: "שברים בסיסיים",
        mapsToNormalizedKeys: ["math.fractions"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_word_problems",
        labelHe: "שאלות מילוליות מורכבות יותר",
        strand: strand.numbers,
        subsectionLabelsHe: ["זיהוי פעולה מתאימה"],
        expectedDepth: "basic",
        sourcePageHint: "שאלות מילוליות",
        mapsToNormalizedKeys: ["math.word_problems"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_measurement_intro",
        labelHe: "מדידות - אורך / משקל / זמן",
        strand: strand.geometry,
        subsectionLabelsHe: ["יחידות סטנדרטיות"],
        expectedDepth: "basic",
        sourcePageHint: "מדידות וגאומטריה",
        mapsToNormalizedKeys: ["math.geometry_context"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_data_charts",
        labelHe: "תרשימים פשוטים וטבלאות",
        strand: strand.data,
        subsectionLabelsHe: ["קריאת טורס/עמודות"],
        expectedDepth: "basic",
        sourcePageHint: "חקר נתונים",
        mapsToNormalizedKeys: ["math.data_and_charts"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g2_patterns_equations_early",
        labelHe: "דפוסים וביטויים פשוטים",
        strand: strand.patterns,
        subsectionLabelsHe: ["משבצת חסר", "שוויון"],
        expectedDepth: "basic",
        sourcePageHint: "טרום אלגברה - כיתה ב׳",
        mapsToNormalizedKeys: ["math.patterns_sequences", "math.equations_and_expressions"],
        confidence: "low",
      })
    );
  }

  /* ---------- Grade 3 ---------- */
  if (grade === 3) {
    s.push(
      sec({
        sectionKey: "g3_numbers_large",
        labelHe: "מספרים גדולים ומבנה העשרוני",
        strand: strand.numbers,
        subsectionLabelsHe: ["עיגול", "השוואות"],
        expectedDepth: "developing",
        sourcePageHint: "מספרים ופעולות",
        mapsToNormalizedKeys: [
          "math.number_sense",
          "math.estimation_rounding",
          "math.addition_subtraction",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_mult_div_facts",
        labelHe: "כפל וחילוק - עובדות ויחסים",
        strand: strand.numbers,
        subsectionLabelsHe: ["חילוק עם שארית - צעדים ראשונים"],
        expectedDepth: "developing",
        sourcePageHint: "כפל וחילוק",
        mapsToNormalizedKeys: ["math.multiplication_division"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_fractions_compare",
        labelHe: "שברים - השוואה והצגה על ציר",
        strand: strand.numbers,
        subsectionLabelsHe: ["שברי יחידה", "שקילות פשוטה"],
        expectedDepth: "developing",
        sourcePageHint: "שברים",
        mapsToNormalizedKeys: ["math.fractions"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_decimals_intro",
        labelHe: "מבנה עשרוני קשר לשברים עשרוניים פשוטים",
        strand: strand.numbers,
        subsectionLabelsHe: ["עיגול עשרוני בסיסי"],
        expectedDepth: "developing",
        sourcePageHint: "עשרוניים - כניסה",
        mapsToNormalizedKeys: ["math.decimals"],
        confidence: "low",
      }),
      sec({
        sectionKey: "g3_word_complex",
        labelHe: "שאלות מילוליות רבשלביות",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "שאלות מילוליות",
        mapsToNormalizedKeys: ["math.word_problems"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_geometry_area_intro",
        labelHe: "גאומטריה - שטח והיקף בסיסיים",
        strand: strand.geometry,
        subsectionLabelsHe: ["מצולעים על רשת"],
        expectedDepth: "developing",
        sourcePageHint: "גאומטריה ומדידות",
        mapsToNormalizedKeys: ["math.geometry_context"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_data_statistics",
        labelHe: "חקר נתונים - ממוצע פשוט / טבלאות",
        strand: strand.data,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "חקר נתונים",
        mapsToNormalizedKeys: ["math.data_and_charts"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g3_divisibility_intro",
        labelHe: "התחלקות - זוגיות, התחלקות ב 3/5",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "מספרים שלמים",
        mapsToNormalizedKeys: ["math.divisibility_factors"],
        confidence: "low",
        notes:
          "מיפוי ראשון אל math.divisibility_factors; מיושר עם שחרור הגנרטור (סימני התחלקות) מכיתה ג׳ - לאמת מול kita3.pdf.",
      }),
      sec({
        sectionKey: "g3_patterns_algebra",
        labelHe: "דפוסים וביטויים אלגבריים ראשונים",
        strand: strand.patterns,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "דפוסים ומשוואות",
        mapsToNormalizedKeys: ["math.patterns_sequences", "math.equations_and_expressions"],
        confidence: "medium",
      })
    );
  }

  /* ---------- Grade 4 ---------- */
  if (grade === 4) {
    s.push(
      sec({
        sectionKey: "g4_operations_fractions_decimals",
        labelHe: "פעולות בשברים ובעשרוניים פשוטים",
        strand: strand.numbers,
        subsectionLabelsHe: ["חיבור שברים בעלי מכנה משותף", "קשר עשרוני שבר"],
        expectedDepth: "developing",
        sourcePageHint: "שברים ועשרוניים",
        mapsToNormalizedKeys: [
          "math.fractions",
          "math.decimals",
          "math.mixed_operations",
          "math.multiplication_division",
          "math.addition_subtraction",
          "math.estimation_rounding",
          "math.number_sense",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_divisibility_factors",
        labelHe: "גורמים, התחלקות וראשוניים",
        strand: strand.numbers,
        subsectionLabelsHe: ["בדיקות התחלקות בסיסיות", "ראשוני מול פריק"],
        expectedDepth: "developing",
        sourcePageHint: "מספרים שלמים - כיתה ד׳",
        mapsToNormalizedKeys: ["math.divisibility_factors"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_percent_intro",
        labelHe: "אחוזים - קשר לשבר ולחלק מכלל",
        strand: strand.numbers,
        subsectionLabelsHe: ["100 כבסיס"],
        expectedDepth: "developing",
        sourcePageHint: "אחוזים - כניסה",
        mapsToNormalizedKeys: ["math.percentages"],
        confidence: "low",
      }),
      sec({
        sectionKey: "g4_word_multistep",
        labelHe: "שאלות מילוליות רבשלביות",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "שאלות מילוליות",
        mapsToNormalizedKeys: ["math.word_problems"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_geometry_angles",
        labelHe: "זוויות, מקבילים, משולשים",
        strand: strand.geometry,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "גאומטריה",
        mapsToNormalizedKeys: ["math.geometry_context"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_data_graphs",
        labelHe: "תרשימים מתקדמים יותר",
        strand: strand.data,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "חקר נתונים",
        mapsToNormalizedKeys: ["math.data_and_charts"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g4_powers_ratio",
        labelHe: "חזקות בסיסיות ויחס פשוט",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "מספרים ויחסים",
        mapsToNormalizedKeys: ["math.powers_and_scaling", "math.ratio_and_scale"],
        confidence: "low",
      }),
      sec({
        sectionKey: "g4_equations",
        labelHe: "משוואות וביטויים בכיתה ד׳",
        strand: strand.patterns,
        subsectionLabelsHe: [],
        expectedDepth: "developing",
        sourcePageHint: "אלגברה בסיסית",
        mapsToNormalizedKeys: ["math.equations_and_expressions", "math.patterns_sequences"],
        confidence: "medium",
      })
    );
  }

  /* ---------- Grade 5 ---------- */
  if (grade === 5) {
    s.push(
      sec({
        sectionKey: "g5_fractions_operations",
        labelHe: "שברים - פעולות והמרות",
        strand: strand.numbers,
        subsectionLabelsHe: ["כפל וחילוק שברים"],
        expectedDepth: "advanced",
        sourcePageHint: "שברים",
        mapsToNormalizedKeys: ["math.fractions", "math.mixed_operations", "math.addition_subtraction"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_decimals_percent",
        labelHe: "עשרוניים ואחוזים",
        strand: strand.numbers,
        subsectionLabelsHe: ["קנה מידה באחוזים"],
        expectedDepth: "advanced",
        sourcePageHint: "עשרוניים ואחוזים",
        mapsToNormalizedKeys: [
          "math.decimals",
          "math.percentages",
          "math.estimation_rounding",
          "math.number_sense",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_volume_measurement",
        labelHe: "נפח ומדידות מתקדמות",
        strand: strand.geometry,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "מדידות וגאומטריה",
        mapsToNormalizedKeys: ["math.geometry_context"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_word_problems",
        labelHe: "שאלות מילוליות מורכבות",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "שאלות מילוליות",
        mapsToNormalizedKeys: ["math.word_problems"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_data_probability_intro",
        labelHe: "חקר נתונים והסתברות בסיסית",
        strand: strand.data,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "חקר נתונים",
        mapsToNormalizedKeys: ["math.data_and_charts"],
        confidence: "low",
      }),
      sec({
        sectionKey: "g5_algebra_expressions",
        labelHe: "ביטויים אלגבריים ומשוואות",
        strand: strand.patterns,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "דפוסים ומשוואות",
        mapsToNormalizedKeys: ["math.equations_and_expressions", "math.patterns_sequences"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_divisibility_primes",
        labelHe: "ראשוניים, התחלקות, חלוקה ארוכה",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "מספרים שלמים",
        mapsToNormalizedKeys: ["math.divisibility_factors", "math.multiplication_division"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g5_ratio_scale",
        labelHe: "יחס וקנה מידה",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "יחסים",
        mapsToNormalizedKeys: ["math.ratio_and_scale"],
        confidence: "medium",
      })
    );
  }

  /* ---------- Grade 6 ---------- */
  if (grade === 6) {
    s.push(
      sec({
        sectionKey: "g6_rational_numbers",
        labelHe: "מספרים רציונליים - שברים, עשרוניים, ציר מספרים",
        strand: strand.numbers,
        subsectionLabelsHe: ["השוואה והזמנה"],
        expectedDepth: "advanced",
        sourcePageHint: "מספרים ופעולות - כיתה ו׳",
        mapsToNormalizedKeys: [
          "math.fractions",
          "math.decimals",
          "math.number_sense",
          "math.estimation_rounding",
        ],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_percent_ratio_problems",
        labelHe: "אחוזים, יחס ושאלות מילוליות משולבות",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "אחוזים ויחס",
        mapsToNormalizedKeys: ["math.percentages", "math.ratio_and_scale", "math.word_problems"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_expressions_equations",
        labelHe: "ביטויים ומשוואות - פישוט והצבה",
        strand: strand.patterns,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "אלגברה",
        mapsToNormalizedKeys: ["math.equations_and_expressions", "math.patterns_sequences"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_geometry_area_volume",
        labelHe: "גאומטריה - שטח, נפח, צורות מורכבות",
        strand: strand.geometry,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "גאומטריה ומדידות",
        mapsToNormalizedKeys: ["math.geometry_context"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_data_statistics",
        labelHe: "חקר נתונים - תיאור והיסטגרם בסיסי",
        strand: strand.data,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "חקר נתונים",
        mapsToNormalizedKeys: ["math.data_and_charts"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_powers_roots",
        labelHe: "חזקות ושורשים ריבועיים בסיסיים",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "חזקות",
        mapsToNormalizedKeys: ["math.powers_and_scaling"],
        confidence: "low",
      }),
      sec({
        sectionKey: "g6_divisibility_lcm_gcd",
        labelHe: "כפולות משותפות, מחוללים, בעיות תכנון",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "מספרים שלמים",
        mapsToNormalizedKeys: ["math.divisibility_factors"],
        confidence: "medium",
      }),
      sec({
        sectionKey: "g6_mixed_review",
        labelHe: "תרגול משולב (פעולות בסיסיות)",
        strand: strand.numbers,
        subsectionLabelsHe: [],
        expectedDepth: "advanced",
        sourcePageHint: "סיכום כיתה ו׳",
        notes:
          "לא ממפים math.word_problems כאן - שאלות מילוליות ואחוזים/יחס מקבלות מקטע ייעודי g6_percent_ratio_problems בלבד; מונע חפיפת מועמדים בביקורת קטלוג.",
        mapsToNormalizedKeys: [
          "math.mixed_operations",
          "math.addition_subtraction",
          "math.multiplication_division",
        ],
        confidence: "low",
      })
    );
  }

  return s;
}

/**
 * Uncertain / thin areas per grade (manual notes until PDF cross-check).
 * @param {number} grade
 */
export function missingUncertainAreasForGrade(grade) {
  const common = [
    "קישור מדויק לעמוד ב PDF לא נסרק אוטומטית - דורש צלב עם המסמך המודפס.",
    "עומק מילולי וסדר הוראה משתנה בין מוסדות - לאמת מול המורה המקצועית.",
  ];
  if (grade <= 2)
    return [...common, "שברים ועשרוניים מוקדמים - רגישות רצף גיל.", "משוואות פורמליות לפני כיתה ד׳ - דורש אימות מול תוכנית המוסד."];
  if (grade <= 4)
    return [...common, "אחוזים לפני כיתה ה׳ - לעיתים חשיפה בלבד במוסדות נבחרים."];
  return [...common];
}

function buildFullCatalog() {
  /** @type {Record<string, object>} */
  const out = {};
  for (let g = 1; g <= 6; g++) {
    out[`grade_${g}`] = {
      grade: g,
      sourcePdf: mathGradeProgrammePdfUrl(g),
      catalogCheckedAt: SOURCE_REGISTRY_CHECKED_AT,
      missingUncertainAreas: missingUncertainAreasForGrade(g),
      sections: buildSectionsForGrade(g),
    };
  }
  return out;
}

export const MATH_OFFICIAL_SUBSECTION_CATALOG = buildFullCatalog();
