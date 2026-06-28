/**
 * Taxonomy coverage manifest for grade-aware parent recommendations.
 * Enumerates every taxonomy id from the six subject taxonomy modules via the registry.
 * Writes JSON + Markdown under reports/. Exit 0.
 *
 * Run: node scripts/parent-report-grade-aware-coverage-manifest.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_TAXONOMY_ROWS } from "../utils/diagnostic-engine-v2/taxonomy-registry.js";
import { GRADE_AWARE_RECOMMENDATION_TEMPLATES } from "../utils/parent-report-language/grade-aware-recommendation-templates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const reportsDir = join(repoRoot, "reports");

const GRADE_BANDS = ["g1_g2", "g3_g4", "g5_g6"];

const M01_PARTIAL_BUCKET_COVERAGE = ["compare", "number_sense", "estimation", "scale", "prime_composite", "zero_one_properties"];
const M01_MISSING_BUCKET_COVERAGE = [];

/**
 * @param {unknown} band
 * @returns {boolean}
 */
function bandHasNonEmptyActionAndGoal(band) {
  if (!band || typeof band !== "object") return false;
  const a = band.actionTextHe != null && String(band.actionTextHe).trim() !== "";
  const g = band.goalTextHe != null && String(band.goalTextHe).trim() !== "";
  return a && g;
}

/**
 * @param {unknown} band
 * @returns {boolean}
 */
function bandHasNullActionAndGoal(band) {
  if (!band || typeof band !== "object") return false;
  return band.actionTextHe == null && band.goalTextHe == null;
}

/**
 * Per-bucket grade-band Hebrew coverage for extended `bucketOverrides` templates.
 * `bandsWithHebrew` / `bandsNull` refer to both actionTextHe and goalTextHe non-empty vs null.
 *
 * @param {unknown} tpl
 * @returns {Array<{ bucketKey: string; bandsWithHebrew: string[]; bandsNull: string[] }>|null}
 */
function bucketGradeCoverageFromOverrides(tpl) {
  if (!tpl || typeof tpl !== "object" || tpl.defaultBands == null) return null;
  const bo = tpl.bucketOverrides;
  if (!bo || typeof bo !== "object") return null;
  const bandKeys = ["g1_g2", "g3_g4", "g5_g6"];
  const out = [];
  for (const bucketKey of Object.keys(bo)) {
    const entry = bo[bucketKey];
    if (!entry || typeof entry !== "object") continue;
    const bandsWithHebrew = [];
    const bandsNull = [];
    for (const bk of bandKeys) {
      if (bandHasNonEmptyActionAndGoal(entry[bk])) bandsWithHebrew.push(bk);
      else bandsNull.push(bk);
    }
    out.push({ bucketKey, bandsWithHebrew, bandsNull });
  }
  return out.length ? out : null;
}

/**
 * @param {string} subjectId
 * @param {string} taxonomyId
 * @returns {{
 *   status: string;
 *   partialBucketCoverage?: string[];
 *   missingBucketCoverage?: string[];
 *   coveredGradeBands?: string[];
 *   missingGradeBands?: string[];
 * }}
 */
function coverageStatus(subjectId, taxonomyId) {
  const tpl = GRADE_AWARE_RECOMMENDATION_TEMPLATES[subjectId]?.[taxonomyId];
  if (!tpl || typeof tpl !== "object") return { status: "pending_manual_hebrew" };

  if (tpl.defaultBands != null && typeof tpl.defaultBands === "object") {
    if (subjectId === "math" && taxonomyId === "M-01") {
      const bo = tpl.bucketOverrides;
      const required = ["compare", "number_sense", "estimation", "scale", "prime_composite", "zero_one_properties"];
      if (!bo || typeof bo !== "object") return { status: "pending_manual_hebrew" };
      for (const k of required) {
        if (!bo[k] || typeof bo[k] !== "object") return { status: "pending_manual_hebrew" };
        if (!bandHasNonEmptyActionAndGoal(bo[k].g3_g4) || !bandHasNonEmptyActionAndGoal(bo[k].g5_g6)) {
          return {
            status: "pending_manual_hebrew",
            partialBucketCoverage: required.filter((bk) => bo[bk] && bandHasNonEmptyActionAndGoal(bo[bk].g3_g4)),
            missingBucketCoverage: required.filter((bk) => !bo[bk] || !bandHasNonEmptyActionAndGoal(bo[bk].g3_g4)),
          };
        }
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: [...required],
        missingBucketCoverage: [],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "math" && taxonomyId === "M-03") {
      const bo = tpl.bucketOverrides;
      if (!bo || typeof bo !== "object") return { status: "pending_manual_hebrew" };
      const required = ["multiplication", "factors_multiples", "powers"];
      for (const k of required) {
        if (!bo[k] || typeof bo[k] !== "object") return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: [...required],
        missingBucketCoverage: ["mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "math" && taxonomyId === "M-10") {
      const bo = tpl.bucketOverrides;
      if (!bo || typeof bo !== "object") return { status: "pending_manual_hebrew" };
      const required = ["multiplication", "division", "division_with_remainder", "ratio"];
      for (const k of required) {
        if (!bo[k] || typeof bo[k] !== "object") return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: [...required],
        missingBucketCoverage: [],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "math" && taxonomyId === "M-07") {
      const bo = tpl.bucketOverrides;
      if (!bo || !bo.word_problems || typeof bo.word_problems !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["word_problems"],
        missingBucketCoverage: [],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "math" && taxonomyId === "M-08") {
      const bo = tpl.bucketOverrides;
      if (!bo || typeof bo !== "object") return { status: "pending_manual_hebrew" };
      const required = ["word_problems", "sequences", "equations", "order_of_operations"];
      for (const k of required) {
        if (!bo[k] || typeof bo[k] !== "object") return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: [...required],
        missingBucketCoverage: [],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-02") {
      const bo = tpl.bucketOverrides;
      if (!bo?.angles || !bo?.circles) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["angles", "circles"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-04") {
      const bo = tpl.bucketOverrides;
      if (!bo?.transformations || !bo?.rotation) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["transformations", "rotation"],
        coveredGradeBands: ["g1_g2", "g3_g4", "g5_g6"],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-05") {
      const bo = tpl.bucketOverrides;
      if (!bo?.solids || !bo?.volume) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["solids", "volume"],
        coveredGradeBands: ["g1_g2", "g3_g4", "g5_g6"],
        missingGradeBands: [],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-06") {
      const bo = tpl.bucketOverrides;
      if (!bo?.perimeter) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["perimeter"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-07") {
      const bo = tpl.bucketOverrides;
      if (!bo?.symmetry) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["symmetry"],
        coveredGradeBands: ["g1_g2", "g3_g4", "g5_g6"],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-01") {
      const bo = tpl.bucketOverrides;
      const required = ["shapes_basic", "quadrilaterals", "parallel_perpendicular", "diagonal", "tiling"];
      for (const k of required) {
        if (!bo?.[k] || typeof bo[k] !== "object") return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: [...required],
        missingBucketCoverage: ["mixed"],
        coveredGradeBands: ["g1_g2", "g3_g4", "g5_g6"],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-03") {
      const bo = tpl.bucketOverrides;
      if (!bo?.quadrilaterals || !bo.heights || !bo.area) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["quadrilaterals", "heights", "area"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "geometry" && taxonomyId === "G-08") {
      const bo = tpl.bucketOverrides;
      if (!bo?.area || !bo.triangles || !bo.pythagoras) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["area", "triangles", "pythagoras"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-04") {
      const bo = tpl.bucketOverrides;
      if (!bo?.reading || !bo.comprehension) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["reading", "comprehension"],
        missingBucketCoverage: ["vocabulary", "grammar", "writing", "speaking", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-01") {
      const bo = tpl.bucketOverrides;
      if (!bo?.vocabulary || !bo?.mixed) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["vocabulary", "mixed"],
        missingBucketCoverage: ["grammar", "writing", "reading", "comprehension", "speaking"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-02") {
      const bo = tpl.bucketOverrides;
      if (!bo?.grammar || typeof bo.grammar !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["grammar"],
        missingBucketCoverage: ["vocabulary", "writing", "reading", "comprehension", "speaking", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-03") {
      const bo = tpl.bucketOverrides;
      if (!bo?.writing || typeof bo.writing !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["writing"],
        missingBucketCoverage: ["vocabulary", "grammar", "reading", "comprehension", "speaking", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-06") {
      const bo = tpl.bucketOverrides;
      if (!bo?.grammar || typeof bo.grammar !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["grammar"],
        missingBucketCoverage: ["vocabulary", "writing", "reading", "comprehension", "speaking", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-07") {
      const bo = tpl.bucketOverrides;
      if (!bo?.writing || typeof bo.writing !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["writing"],
        missingBucketCoverage: ["vocabulary", "grammar", "reading", "comprehension", "speaking", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-08") {
      const bo = tpl.bucketOverrides;
      if (!bo?.speaking) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["speaking"],
        missingBucketCoverage: ["vocabulary", "grammar", "writing", "reading", "comprehension", "mixed"],
        coveredGradeBands: ["g5_g6"],
        missingGradeBands: ["g1_g2", "g3_g4"],
      };
    }
    if (subjectId === "hebrew" && taxonomyId === "H-05") {
      const bo = tpl.bucketOverrides;
      if (!bo?.homophones || typeof bo.homophones !== "object") return { status: "pending_manual_hebrew" };
      if (!bandHasNonEmptyActionAndGoal(bo.homophones.g3_g4) || !bandHasNonEmptyActionAndGoal(bo.homophones.g5_g6)) {
        return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["homophones"],
        missingBucketCoverage: ["vocabulary", "grammar", "writing", "reading", "comprehension", "speaking", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-01") {
      const bo = tpl.bucketOverrides;
      if (!bo?.vocabulary || typeof bo.vocabulary !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["vocabulary"],
        missingBucketCoverage: ["grammar", "translation", "sentences", "sentence", "writing", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-02") {
      const bo = tpl.bucketOverrides;
      if (!bo?.grammar || typeof bo.grammar !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["grammar"],
        missingBucketCoverage: ["vocabulary", "translation", "sentences", "sentence", "writing", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-04") {
      const bo = tpl.bucketOverrides;
      if (!bo?.grammar || typeof bo.grammar !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["grammar"],
        missingBucketCoverage: ["vocabulary", "translation", "sentences", "sentence", "writing", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-05") {
      const bo = tpl.bucketOverrides;
      if (!bo?.vocabulary || typeof bo.vocabulary !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["vocabulary"],
        missingBucketCoverage: ["grammar", "translation", "sentences", "sentence", "writing", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-06") {
      const bo = tpl.bucketOverrides;
      if (!bo?.sentences || typeof bo.sentences !== "object" || !bo?.sentence || typeof bo.sentence !== "object") {
        return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["sentences", "sentence"],
        missingBucketCoverage: ["vocabulary", "grammar", "translation", "writing", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-03") {
      const bo = tpl.bucketOverrides;
      if (!bo?.translation) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["translation"],
        missingBucketCoverage: ["vocabulary", "grammar", "sentences", "sentence", "writing", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-07") {
      const bo = tpl.bucketOverrides;
      if (!bo?.writing) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["writing"],
        missingBucketCoverage: ["vocabulary", "grammar", "translation", "sentences", "sentence", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "english" && taxonomyId === "E-08") {
      const bo = tpl.bucketOverrides;
      if (!bo?.listening || typeof bo.listening !== "object") return { status: "pending_manual_hebrew" };
      if (!bandHasNonEmptyActionAndGoal(bo.listening.g3_g4) || !bandHasNonEmptyActionAndGoal(bo.listening.g5_g6)) {
        return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["listening"],
        missingBucketCoverage: ["vocabulary", "grammar", "translation", "sentences", "sentence", "writing", "mixed"],
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    const SCIENCE_BUCKETS_ALL = ["animals", "plants", "materials", "earth_space", "environment", "experiments", "body", "mixed"];
    if (subjectId === "science" && taxonomyId === "S-01") {
      const bo = tpl.bucketOverrides;
      if (!bo || typeof bo !== "object") return { status: "pending_manual_hebrew" };
      const required = ["animals", "plants", "earth_space", "mixed"];
      for (const k of required) {
        if (!bo[k] || typeof bo[k] !== "object") return { status: "pending_manual_hebrew" };
      }
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: [...required],
        missingBucketCoverage: SCIENCE_BUCKETS_ALL.filter((k) => !required.includes(k)),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "science" && taxonomyId === "S-02") {
      const bo = tpl.bucketOverrides;
      if (!bo?.experiments || typeof bo.experiments !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["experiments"],
        missingBucketCoverage: SCIENCE_BUCKETS_ALL.filter((k) => k !== "experiments"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "science" && taxonomyId === "S-03") {
      const bo = tpl.bucketOverrides;
      if (!bo?.body || typeof bo.body !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["body"],
        missingBucketCoverage: SCIENCE_BUCKETS_ALL.filter((k) => k !== "body"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "science" && taxonomyId === "S-04") {
      const bo = tpl.bucketOverrides;
      if (!bo?.materials || typeof bo.materials !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["materials"],
        missingBucketCoverage: SCIENCE_BUCKETS_ALL.filter((k) => k !== "materials"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "science" && taxonomyId === "S-07") {
      const bo = tpl.bucketOverrides;
      if (!bo?.environment || typeof bo.environment !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["environment"],
        missingBucketCoverage: SCIENCE_BUCKETS_ALL.filter((k) => k !== "environment"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    const MOLEDET_BUCKETS_ALL = ["maps", "geography", "citizenship", "homeland", "community", "values", "mixed"];
    if (subjectId === "moledet-geography" && taxonomyId === "MG-03") {
      const bo = tpl.bucketOverrides;
      if (!bo?.citizenship || typeof bo.citizenship !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["citizenship"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => k !== "citizenship"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "moledet-geography" && taxonomyId === "MG-07") {
      const bo = tpl.bucketOverrides;
      if (!bo?.community || typeof bo.community !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["community"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => k !== "community"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "moledet-geography" && taxonomyId === "MG-01") {
      const bo = tpl.bucketOverrides;
      if (!bo?.maps || !bo?.geography || !bo?.mixed) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["maps", "geography", "mixed"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => !["maps", "geography", "mixed"].includes(k)),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "moledet-geography" && taxonomyId === "MG-02") {
      const bo = tpl.bucketOverrides;
      if (!bo?.maps || !bo?.geography) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["maps", "geography"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => !["maps", "geography"].includes(k)),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "moledet-geography" && taxonomyId === "MG-04") {
      const bo = tpl.bucketOverrides;
      if (!bo?.homeland || typeof bo.homeland !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["homeland"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => k !== "homeland"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "moledet-geography" && taxonomyId === "MG-05") {
      const bo = tpl.bucketOverrides;
      if (!bo?.geography || typeof bo.geography !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["geography"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => k !== "geography"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "moledet-geography" && taxonomyId === "MG-06") {
      const bo = tpl.bucketOverrides;
      if (!bo?.homeland || !bo?.values) return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["homeland", "values"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => !["homeland", "values"].includes(k)),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    if (subjectId === "moledet-geography" && taxonomyId === "MG-08") {
      const bo = tpl.bucketOverrides;
      if (!bo?.maps || typeof bo.maps !== "object") return { status: "pending_manual_hebrew" };
      return {
        status: "partially_covered_by_template",
        partialBucketCoverage: ["maps"],
        missingBucketCoverage: MOLEDET_BUCKETS_ALL.filter((k) => k !== "maps"),
        coveredGradeBands: ["g3_g4", "g5_g6"],
        missingGradeBands: ["g1_g2"],
      };
    }
    return { status: "pending_manual_hebrew" };
  }

  if (
    subjectId === "math" &&
    (taxonomyId === "M-04" || taxonomyId === "M-05") &&
    bandHasNullActionAndGoal(tpl.g1_g2) &&
    bandHasNonEmptyActionAndGoal(tpl.g3_g4) &&
    bandHasNonEmptyActionAndGoal(tpl.g5_g6)
  ) {
    return {
      status: "partially_covered_by_template",
      coveredGradeBands: ["g3_g4", "g5_g6"],
      missingGradeBands: ["g1_g2"],
    };
  }

  for (const b of GRADE_BANDS) {
    const band = tpl[b];
    if (!band || typeof band !== "object") return { status: "pending_manual_hebrew" };
    const a = band.actionTextHe != null && String(band.actionTextHe).trim() !== "";
    const g = band.goalTextHe != null && String(band.goalTextHe).trim() !== "";
    if (!a || !g) return { status: "pending_manual_hebrew" };
  }
  return { status: "covered_by_template" };
}

/** @type {Record<string, RegExp>} */
const SUBJECT_ID_TO_PREFIX = {
  math: /^M-/,
  geometry: /^G-/,
  hebrew: /^H-/,
  english: /^E-/,
  science: /^S-/,
  "moledet-geography": /^MG-/,
};

function assertIdMatchesSubject(subjectId, id) {
  const re = SUBJECT_ID_TO_PREFIX[subjectId];
  if (!re) return `unknown subjectId ${subjectId}`;
  if (!re.test(id)) return `id ${id} does not match expected prefix for ${subjectId}`;
  return null;
}

const rows = ALL_TAXONOMY_ROWS.map((row) => {
  const mismatch = assertIdMatchesSubject(row.subjectId, row.id);
  const cov = coverageStatus(row.subjectId, row.id);
  const tplFull = GRADE_AWARE_RECOMMENDATION_TEMPLATES[row.subjectId]?.[row.id];
  const bgc = bucketGradeCoverageFromOverrides(tplFull);
  /** @type {Record<string, unknown>} */
  const out = {
    subjectId: row.subjectId,
    taxonomyId: row.id,
    status: cov.status,
    idPrefixOk: mismatch === null,
    idPrefixNote: mismatch,
  };
  if (cov.partialBucketCoverage) out.partialBucketCoverage = cov.partialBucketCoverage;
  if (cov.missingBucketCoverage) out.missingBucketCoverage = cov.missingBucketCoverage;
  if (cov.coveredGradeBands) out.coveredGradeBands = cov.coveredGradeBands;
  if (cov.missingGradeBands) out.missingGradeBands = cov.missingGradeBands;
  if (bgc) out.bucketGradeCoverage = bgc;
  return out;
});

const countBySubject = rows.reduce((acc, r) => {
  acc[r.subjectId] = (acc[r.subjectId] || 0) + 1;
  return acc;
}, /** @type {Record<string, number>} */ ({}));

const countByStatus = rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, /** @type {Record<string, number>} */ ({}));

const manifest = {
  generatedAt: new Date().toISOString(),
  phase: "5-C3",
  note:
    "covered_by_template = legacy flat entry with all grade bands non-empty actionTextHe and goalTextHe. partially_covered_by_template = null g1_g2 and/or partial bucket/grade coverage (math M-04, M-05; M-03, M-10; M-07 word_problems; M-08 word_problems/sequences/equations/order_of_operations; geometry G-01 shapes_basic+quadrilaterals+parallel_perpendicular+diagonal+tiling, G-02 angles+circles, G-03 quadrilaterals+heights+area, G-04 transformations+rotation, G-05 solids+volume, G-06 perimeter, G-07 symmetry, G-08 area+triangles+pythagoras; Hebrew H-01 vocabulary+mixed g3_g4+g5_g6, H-02 grammar g3_g4+g5_g6, H-03 writing g3_g4+g5_g6, H-04 reading+comprehension g3_g4+g5_g6, H-06 grammar g3_g4+g5_g6, H-07 writing g3_g4+g5_g6, H-08 speaking g5_g6; English E-01 vocabulary g3_g4+g5_g6, E-02 grammar g3_g4+g5_g6, E-03 translation g3_g4+g5_g6, E-04 grammar g3_g4+g5_g6, E-05 vocabulary g3_g4+g5_g6, E-06 sentences+sentence g3_g4+g5_g6, E-07 writing g3_g4+g5_g6; Science S-01 animals+plants+earth_space+mixed g3_g4+g5_g6, S-02 experiments, S-03 body, S-04 materials, S-07 environment g3_g4+g5_g6; moledet-geography MG-01 maps+geography+mixed, MG-02 maps+geography, MG-03 citizenship, MG-04 homeland, MG-05 geography, MG-06 homeland+values, MG-07 community, MG-08 maps g3_g4+g5_g6). bucketGradeCoverage (when present) lists per-bucket which grade bands have non-null action+goal Hebrew vs null — use when aggregate coveredGradeBands would overstate (e.g. G-05 volume only g5_g6). pending_manual_hebrew otherwise. Math M-01: partial bucketOverrides (compare, number_sense, estimation); missing zero_one_properties, scale, prime_composite until approved.",
  summary: {
    totalRows: rows.length,
    countBySubject,
    countByStatus,
  },
  rows,
};

mkdirSync(reportsDir, { recursive: true });

const jsonPath = join(reportsDir, "parent-report-grade-aware-coverage-manifest.json");
writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const mdLines = [
  "# Grade-aware recommendation — taxonomy coverage manifest",
  "",
  `Generated: ${manifest.generatedAt} (Phase ${manifest.phase})`,
  "",
  "## Summary",
  "",
  `| Metric | Value |`,
  `|--------|-------|`,
  `| Total taxonomy rows | ${manifest.summary.totalRows} |`,
  "",
  "### Count by subjectId",
  "",
  `| subjectId | count |`,
  `|-----------|-------|`,
  ...Object.keys(countBySubject)
    .sort()
    .map((sid) => `| ${sid} | ${countBySubject[sid]} |`),
  "",
  "### Count by status",
  "",
  `| status | count |`,
  `|--------|-------|`,
  ...Object.keys(countByStatus)
    .sort()
    .map((st) => `| ${st} | ${countByStatus[st]} |`),
  "",
  "## Rows",
  "",
  `| subjectId | taxonomyId | status | idPrefixOk | partialBucketCoverage | missingBucketCoverage | coveredGradeBands | missingGradeBands |`,
  `|-----------|------------|--------|------------|-------------------------|----------------------|-------------------|-------------------|`,
  ...rows.map((r) => {
    const p = Array.isArray(r.partialBucketCoverage) ? r.partialBucketCoverage.join(", ") : "";
    const m = Array.isArray(r.missingBucketCoverage) ? r.missingBucketCoverage.join(", ") : "";
    const cgb = Array.isArray(r.coveredGradeBands) ? r.coveredGradeBands.join(", ") : "";
    const mgb = Array.isArray(r.missingGradeBands) ? r.missingGradeBands.join(", ") : "";
    return `| ${r.subjectId} | ${r.taxonomyId} | ${r.status} | ${r.idPrefixOk ? "yes" : "no"} | ${p} | ${m} | ${cgb} | ${mgb} |`;
  }),
  "",
  "## bucketGradeCoverage (extended templates)",
  "",
  "Per-bucket `bandsWithHebrew` / `bandsNull` for `g1_g2`, `g3_g4`, `g5_g6` (both `actionTextHe` and `goalTextHe` must be non-empty for “with Hebrew”). See JSON rows for full arrays.",
  "",
  ...rows
    .filter((r) => Array.isArray(r.bucketGradeCoverage) && r.bucketGradeCoverage.length)
    .map((r) => {
      const lines = r.bucketGradeCoverage.map((b) => {
        const wh = Array.isArray(b.bandsWithHebrew) ? b.bandsWithHebrew.join(",") : "";
        const nl = Array.isArray(b.bandsNull) ? b.bandsNull.join(",") : "";
        return `  - **${r.taxonomyId}** / \`${b.bucketKey}\`: Hebrew **${wh || "—"}** · null **${nl || "—"}**`;
      });
      return [`### ${r.subjectId} ${r.taxonomyId}`, "", ...lines, ""].join("\n");
    }),
];

const mdPath = join(reportsDir, "parent-report-grade-aware-coverage-manifest.md");
writeFileSync(mdPath, `${mdLines.join("\n")}\n`, "utf8");

process.stdout.write(`Wrote ${jsonPath}\n`);
process.stdout.write(`Wrote ${mdPath}\n`);
process.stdout.write(
  `Summary: total=${manifest.summary.totalRows} subjects=${Object.keys(countBySubject).length}\n`
);
