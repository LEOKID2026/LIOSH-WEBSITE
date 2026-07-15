/**
 * Planning-only map: Math strands / audit topic keys ↔ official anchor roles.
 * URLs are duplicated from official-curriculum-source-registry for reporting clarity.
 */

import {
  MATH_ELEMENTARY_GRADE_PDF_BASE,
  SOURCE_REGISTRY_CHECKED_AT,
} from "./official-curriculum-source-registry.js";

/** Audit normalized keys (subset) aligned to inventory normalizer */
export const MATH_AUDIT_TOPIC_KEYS = [
  "math.number_sense",
  "math.addition_subtraction",
  "math.multiplication_division",
  "math.word_problems",
  "math.fractions",
  "math.decimals",
  "math.percentages",
  "math.patterns_sequences",
  "math.equations_and_expressions",
  "math.divisibility_factors",
  "math.data_and_charts",
  "math.estimation_rounding",
  "math.ratio_and_scale",
  "math.powers_and_scaling",
  "math.mixed_operations",
  "math.geometry_context",
  "math.unmapped",
];

/** Strand rows for the math-official-source-hardening report (not every registry row). */
export const MATH_STRAND_ANCHOR_ROWS = [
  {
    strandId: "numbers_operations",
    labelHe: "מספרים ופעולות (תפיסה מספרית, חיבור/חיסור, כפל/חילוק)",
    auditTopicKeys: [
      "math.number_sense",
      "math.addition_subtraction",
      "math.multiplication_division",
      "math.mixed_operations",
      "math.estimation_rounding",
      "math.divisibility_factors",
      "math.powers_and_scaling",
    ],
    primaryAnchorRole: "מסמך כיתה PDF + מסגרת POP",
    popUrl: "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/oraat-math/new-curriculum/",
    pdfPattern: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita{n}.pdf`,
  },
  {
    strandId: "word_problems",
    labelHe: "שאלות מילוליות",
    auditTopicKeys: ["math.word_problems"],
    primaryAnchorRole: "מסמך כיתה PDF",
    popUrl: "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/oraat-math/tohnit-limudim/",
    pdfPattern: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita{n}.pdf`,
  },
  {
    strandId: "fractions_decimals_percent",
    labelHe: "שברים, עשרונים ואחוזים",
    auditTopicKeys: ["math.fractions", "math.decimals", "math.percentages"],
    primaryAnchorRole: "מסמך כיתה PDF (פירוט רצף בתוך המסמך)",
    popUrl: "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/oraat-math/new-curriculum/",
    pdfPattern: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita{n}.pdf`,
  },
  {
    strandId: "data_chart",
    labelHe: "חקר נתונים ותרשימים",
    auditTopicKeys: ["math.data_and_charts"],
    primaryAnchorRole: "דף POP חקר נתונים + מסמך כיתה",
    popUrl:
      "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/noseem_nilmadim/choker-netunim/",
    pdfPattern: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita{n}.pdf`,
  },
  {
    strandId: "patterns_algebra",
    labelHe: "דפוסים, סדרות, משוואות וביטויים",
    auditTopicKeys: ["math.patterns_sequences", "math.equations_and_expressions"],
    primaryAnchorRole: "מסמך כיתה PDF",
    popUrl: "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/oraat-math/new-curriculum/",
    pdfPattern: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita{n}.pdf`,
  },
  {
    strandId: "geometry_strand",
    labelHe: "גאומטריה ומדידות (מיתר במתמטיקה - לא מקצוע גאומטריה נפרד)",
    auditTopicKeys: ["math.geometry_context"],
    primaryAnchorRole: "דף POP גאומטריה + מסמך כיתה",
    popUrl: "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/noseem_nilmadim/geometrya/",
    pdfPattern: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita{n}.pdf`,
  },
  {
    strandId: "ratio_scale",
    labelHe: "יחס וקנה מידה",
    auditTopicKeys: ["math.ratio_and_scale"],
    primaryAnchorRole: "מסמך כיתה PDF",
    popUrl: "https://pop.education.gov.il/tchumey_daat/matmatika/yesodi/oraat-math/new-curriculum/",
    pdfPattern: `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita{n}.pdf`,
  },
];

export function mathGradePdfUrl(gradeNum) {
  return `${MATH_ELEMENTARY_GRADE_PDF_BASE}/kita${gradeNum}.pdf`;
}

export { SOURCE_REGISTRY_CHECKED_AT, MATH_ELEMENTARY_GRADE_PDF_BASE };
