/**
 * Topic-level math rules for topics that previously had only adjacent
 * taxonomy candidates. They support topic practice, not subskill claims.
 */
const DEFINITIONS = [
  ["M-11", "compare", "math_compare_relation_error", "השוואת מספרים", "בחירת יחס שגוי בין אותם מספרים", "cmp"],
  ["M-12", "scale", "math_scale_operation_error", "קנה מידה", "פעולה שגויה בהמרת קנה מידה", "scale_"],
  ["M-13", "division", "math_division_operation_error", "חילוק", "החלפת פעולת החילוק בכפל על אותם אופרנדים", "div"],
  ["M-14", "division_with_remainder", "math_remainder_error", "חילוק עם שארית", "מנה או שארית שאינן מקיימות את זהות החילוק", "div_with_remainder"],
  ["M-15", "decimals", "math_decimal_place_shift_error", "מספרים עשרוניים", "הזזת הנקודה העשרונית מקום אחד לאחר הפעולה", "dec_"],
  ["M-16", "sequences", "math_sequence_step_error", "סדרות", "יישום לא עקבי של כלל הרצף", "seq_"],
  ["M-17", "percentages", "math_percentage_base_error", "אחוזים", "בלבול בין האחוז, השלם והחלק", "perc_"],
  ["M-18", "ratio", "math_ratio_order_error", "יחס", "היפוך או שינוי לא שקול של סדר היחס", "ratio_"],
  ["M-19", "equations", "math_equation_inverse_error", "משוואות", "אי שימוש בפעולה הפוכה לשמירת השוויון", "eq_"],
  ["M-20", "order_of_operations", "math_operation_order_error", "סדר פעולות", "חישוב לפי סדר כתיבה במקום קדימות פעולות", "order_"],
  ["M-21", "divisibility", "math_divisibility_classification_error", "סימני התחלקות", "היפוך מסקנת ההתחלקות לאחר בדיקת הכלל", "divisibility"],
  ["M-22", "prime_composite", "math_prime_composite_classification_error", "ראשוניים ופריקים", "החלפת הסיווג ראשוני ופריק", "prime_composite"],
  ["M-23", "powers", "math_power_as_multiplication_error", "חזקות", "חישוב בסיס כפול מעריך במקום חזקה", "power_"],
  ["M-24", "zero_one_properties", "math_identity_property_error", "תכונות אפס ואחד", "יישום שגוי של איבר ניטרלי או מאפס", "zero_"],
  ["M-25", "estimation", "math_estimation_strategy_error", "אומדן", "החלפת אומדן בתוצאה מדויקת או עיגול לא מתאים", "est_"],
  ["M-26", "factors_multiples", "math_gcd_smaller_input_error", "גורמים וכפולות", "הנחה שהמספר הקטן הוא תמיד המחלק המשותף הגדול ביותר", "fm_"],
];

export const MATH_TOPIC_COVERAGE_DEFINITIONS = Object.freeze(
  DEFINITIONS.map(([id, topic, tag, topicHe, patternHe, questionKind]) =>
    Object.freeze({ id, subject: "math", topic, tag, topicHe, patternHe, questionKind })
  )
);

export const MATH_TOPIC_COVERAGE_ROWS = Object.freeze(
  MATH_TOPIC_COVERAGE_DEFINITIONS.map((d) => ({
    id: d.id,
    subjectId: "math",
    domainHe: "מתמטיקה",
    topicHe: d.topicHe,
    subskillHe: "יציבות פרוצדורלית ברמת הנושא",
    patternHe: d.patternHe,
    minWrong: 3,
    minDistinctPatternFamilies: 0,
    minDistinctDays: 0,
    observableMarkersHe: ["אותה משפחת טעות בשאלות ובמפגשים שונים"],
    counterEvidenceHe: "הצלחה עצמאית חוזרת באותו נושא",
    countsWhenHe: "תשובה עצמאית ללא פתרון מוצג",
    doesNotCountWhenHe: "רמז מלא, טעות אקראית או מפגש יחיד",
    rootsHe: ["הליך נושאי לא יציב"],
    competitorsHe: ["טעות הקלדה", "חוסר תשומת לב רגעי"],
    doNotConcludeHe: ["תת-מיומנות ספציפית ללא probe נוסף"],
    probeHe: `שאלות ${d.topicHe} מקבילות`,
    interventionHe: `תרגול ממוקד בנושא ${d.topicHe}`,
    escalationHe: "כישלון עצמאי חוזר גם לאחר תרגול",
    topicLevelOnly: true,
    canonicalTopic: d.topic,
  }))
);

export const MATH_TOPIC_COVERAGE_EVIDENCE_RULES = Object.freeze(
  Object.fromEntries(
    MATH_TOPIC_COVERAGE_DEFINITIONS.map((d) => [
      d.id,
      {
        taxonomyId: d.id,
        evidenceSource: "distractor_family",
        requiredTags:
          d.id === "M-13"
            ? [d.tag, "mul_instead_of_div", "sub_instead_of_div", "division_fact_error"]
            : d.id === "M-14"
              ? [d.tag]
              : d.id === "M-15"
                ? [d.tag]
                : d.id === "M-17"
                  ? [d.tag, "percentage_base_error"]
                  : d.id === "M-19"
                    ? [d.tag, "inverse_operation_error", "equation_sign_error"]
                    : [d.tag],
        questionKinds:
          d.id === "M-13"
            ? ["div", "div_long", "div_two_digit"]
            : d.id === "M-14"
              ? ["div_with_remainder", "div_with_remainder_long"]
              : d.id === "M-15"
                ? ["dec_", "dec_add", "dec_sub", "dec_multiply", "dec_divide"]
                : d.id === "M-17"
                  ? ["perc_", "perc_part_of", "perc_discount"]
                  : d.id === "M-19"
                    ? ["eq_", "eq_add_simple", "eq_sub_simple", "eq_mul", "eq_div"]
                    : d.id === "M-24"
                      ? ["zero_", "one_"]
                      : [d.questionKind],
        minTagMatches: 3,
        minRelevantQuestions: 3,
        minOccurrenceRatio: 0.6,
        requiresDistinctAnswers: true,
        notesHe: "פעולה ברמת topic בלבד; תת-מיומנות דורשת probe נפרד",
      },
    ])
  )
);

export const MATH_TOPIC_COVERAGE_PRIMARY_PRODUCERS = Object.freeze(
  Object.fromEntries(
    MATH_TOPIC_COVERAGE_DEFINITIONS.map((d) => [
      d.id,
      {
        tag: d.tag,
        module: "math-mcq-infer",
        generator: "utils/math-topic-diagnostic-evidence.js",
        active: true,
        probeKind: d.questionKind,
      },
    ])
  )
);
