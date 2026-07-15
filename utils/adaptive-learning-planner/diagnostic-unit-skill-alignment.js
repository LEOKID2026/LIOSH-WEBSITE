/**
 * Offline-only: map diagnostic engine units / facets to bank-aligned skillId/subskillId
 * when evidence is already deterministic (no LLM, no free-text inference).
 */

import {
  SCIENCE_SKILL_IDS,
  SCIENCE_SUBSKILL_ALLOWLIST_BY_SKILL,
  SCIENCE_TOPIC_ORDER,
  HISTORY_SKILL_IDS,
  HISTORY_SUBSKILL_ALLOWLIST_BY_SKILL,
  HISTORY_TOPIC_ORDER,
  validateTaxonomyForRecord,
} from "../question-metadata-qa/question-metadata-taxonomy.js";
import { HISTORY_G6_CONTENT_MAP as HISTORY_G6_CONTENT_MAP_SOURCE } from "../../data/history-g6-content-map.js";
import { HEBREW_ARCHIVE_CATEGORY_KEYS, hebrewArchiveCategoryToSkillId } from "../question-metadata-qa/question-metadata-taxonomy-hebrew-archive.js";
import { MOLEDET_GEOGRAPHY_STRAND_KEYS, moledetGeographyStrandToSkillId } from "../question-metadata-qa/question-metadata-taxonomy-geography.js";

const HISTORY_G6_CONTENT_MAP = HISTORY_G6_CONTENT_MAP_SOURCE || {};

/** Same contract as `mathReportBaseOperationKey` (avoid importing browser-heavy math-report-generator). */
function mathReportBaseOperationKey(bucketKey) {
  if (bucketKey == null || typeof bucketKey !== "string") return bucketKey;
  const i = bucketKey.indexOf("::");
  return i === -1 ? bucketKey : bucketKey.slice(0, i);
}

/**
 * Deterministic anchors: report math `bucketKey` base op → one procedural metadata row
 * (matches `buildPlannerQuestionMetadataIndex` math procedural placeholders).
 * @type {Record<string, { skillId: string, subskillId: string }>}
 */
const MATH_REPORT_BUCKET_TO_BANK_PAIR = {
  number_sense: { skillId: "math_ns_counting_forward", subskillId: "ns_counting_forward" },
  compare: { skillId: "math_cmp", subskillId: "cmp" },
  scale: { skillId: "math_scale_map_to_real", subskillId: "scale_map_to_real" },
  addition: { skillId: "math_add_two", subskillId: "add_two" },
  subtraction: { skillId: "math_sub_two", subskillId: "sub_two" },
  multiplication: { skillId: "math_mul", subskillId: "mul" },
  division: { skillId: "math_div", subskillId: "div" },
  division_with_remainder: { skillId: "math_div_with_remainder", subskillId: "div_with_remainder" },
  fractions: { skillId: "math_frac_add_sub", subskillId: "frac_add_sub" },
  decimals: { skillId: "math_dec_add", subskillId: "dec_add" },
  rounding: { skillId: "math_round", subskillId: "round" },
  word_problems: { skillId: "math_wp_coins", subskillId: "wp_coins" },
  sequences: { skillId: "math_sequence", subskillId: "sequence" },
  percentages: { skillId: "math_perc_part_of", subskillId: "perc_part_of" },
  ratio: { skillId: "math_ratio_find", subskillId: "ratio_find" },
  equations: { skillId: "math_eq_add_simple", subskillId: "eq_add_simple" },
  order_of_operations: { skillId: "math_order_parentheses", subskillId: "order_parentheses" },
  mixed: { skillId: "math_add_three", subskillId: "add_three" },
  divisibility: { skillId: "math_divisibility", subskillId: "divisibility" },
  prime_composite: { skillId: "math_prime_composite", subskillId: "prime_composite" },
  powers: { skillId: "math_power_calc", subskillId: "power_calc" },
  zero_one_properties: { skillId: "math_ns_complement10", subskillId: "ns_complement10" },
  estimation: { skillId: "math_est_add", subskillId: "est_add" },
  factors_multiples: { skillId: "math_fm_factor", subskillId: "fm_factor" },
};
/** @typedef {"exact" | "inferred_safe" | "missing"} AlignmentConfidence */
/** @typedef {"unit_field" | "question_metadata" | "topic_mapping" | "taxonomy_bridge" | "none"} AlignmentSource */

/**
 * Curated bridge: diagnostic taxonomy id (geometry) → one scanner-stable (skillId, subskillId)
 * pair that appears in geometry conceptual metadata taxonomy. Only ids with a single intended mapping.
 * @type {Record<string, { skillId: string, subskillId: string }>}
 */
const GEOMETRY_TAXONOMY_ID_TO_BANK = {
  "G-01": { skillId: "square_special", subskillId: "square_rectangle" },
  "G-02": { skillId: "geo_angle_right_identify", subskillId: "classification" },
  "G-03": { skillId: "geo_rect_area_plan", subskillId: "area_rectangle" },
  "G-04": { skillId: "wheel_rotation", subskillId: "interpret" },
  "G-05": { skillId: "volume_3d", subskillId: "definition" },
  "G-06": { skillId: "geo_pv_area_vs_perimeter", subskillId: "choose_measure" },
  "G-07": { skillId: "mirror", subskillId: "meaning" },
  "G-08": { skillId: "perpendicular_to_base", subskillId: "triangle" },
};

/**
 * @param {string} scenarioId
 * @returns {string} g1..g6 or ""
 */
export function inferGradeSubskillFromScenarioId(scenarioId) {
  const s = String(scenarioId || "");
  const m = s.match(/_g([1-6])_/i) || s.match(/(?:^|[^a-z0-9])g([1-6])(?:[^a-z0-9]|$)/i);
  if (!m) return "";
  const n = Number(m[1]);
  if (n >= 1 && n <= 6) return `g${n}`;
  return "";
}

/**
 * Grade digit 1–6 from scenario id (for English bank row selection). Defaults to 3 when unknown.
 * @param {string} scenarioId
 * @returns {number}
 */
export function inferEnglishGradeDigitFromScenarioId(scenarioId) {
  const g = inferGradeSubskillFromScenarioId(scenarioId);
  const m = /^g([1-6])$/i.exec(String(g || "").trim());
  if (m) return Number(m[1]);
  const alt = String(scenarioId || "").match(/_g([1-6])_/i);
  if (alt) return Number(alt[1]);
  return 3;
}

/** Diagnostic facet `displayName` (English master labels) → `englishTopics` bucket key. */
const ENGLISH_DISPLAY_NAME_TO_TOPIC_BUCKET = {
  grammar: "grammar",
  vocabulary: "vocabulary",
  writing: "writing",
  "sentence building": "sentences",
};

/**
 * Resolve a stable `englishTopics` bucket key from the unit + optional facet topic keys.
 * Requires the bucket to appear in `topicBucketKeys` when that list is non-empty (cross-check).
 * @param {object} unit
 * @param {unknown[]} [topicBucketKeys]
 * @returns {string} bucket key or ""
 */
export function resolveEnglishTopicBucketKeyFromUnit(unit, topicBucketKeys) {
  const display = String(unit?.displayName || "")
    .trim()
    .toLowerCase();
  const bucket = ENGLISH_DISPLAY_NAME_TO_TOPIC_BUCKET[display] || "";
  if (!bucket) return "";
  const keys = Array.isArray(topicBucketKeys)
    ? topicBucketKeys.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean)
    : [];
  if (!keys.length) return "";
  if (!keys.includes(bucket)) return "";
  return bucket;
}

/**
 * Facet `displayName` (Hebrew geometry master labels) → `geometryTopics` bucket key.
 * Only labels that appear in real report artifacts; cross-check with `topicBucketKeys`.
 */
const GEOMETRY_HEBREW_DISPLAY_TO_TOPIC_BUCKET = {
  היקף: "perimeter",
  "מקבילות ומאונכות": "parallel_perpendicular",
};

/**
 * @param {object} unit
 * @param {unknown[]} [topicBucketKeys]
 * @returns {string} bucket key or ""
 */
export function resolveGeometryTopicBucketKeyFromUnit(unit, topicBucketKeys) {
  const display = String(unit?.displayName || "").trim();
  const bucket = GEOMETRY_HEBREW_DISPLAY_TO_TOPIC_BUCKET[display] || "";
  if (!bucket) return "";
  const keys = Array.isArray(topicBucketKeys)
    ? topicBucketKeys.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean)
    : [];
  if (!keys.length) return "";
  if (!keys.includes(bucket)) return "";
  return bucket;
}

/**
 * Deterministic geometry (skillId, subskillId) for a known `geometryTopics` bucket key.
 * @param {string} topicBucket
 * @returns {{ skillId: string, subskillId: string } | null}
 */
export function geometryTopicBucketToBankPair(topicBucket) {
  const tb = String(topicBucket || "").trim().toLowerCase();
  if (tb === "perimeter") {
    return { skillId: "geo_pv_area_vs_perimeter", subskillId: "fence_perimeter_project" };
  }
  if (tb === "parallel_perpendicular") {
    return { skillId: "parallel_never_meet", subskillId: "parallel_def" };
  }
  return null;
}

/**
 * Deterministic English (skillId, subskillId) for a known topic bucket + grade; must exist in taxonomy + optional index.
 * @param {string} topicBucket
 * @param {number} gradeDigit
 * @returns {{ skillId: string, subskillId: string } | null}
 */
export function englishTopicBucketToBankPair(topicBucket, gradeDigit) {
  const g = Math.min(6, Math.max(1, Number(gradeDigit) || 3));
  const tb = String(topicBucket || "").trim().toLowerCase();
  if (tb === "grammar") {
    return { skillId: "en_grammar_be_present", subskillId: "be_basic" };
  }
  if (tb === "vocabulary") {
    const matrixGrade = g === 1 ? 2 : g;
    return { skillId: `translation_mcq_g${matrixGrade}_matrix`, subskillId: "simulator_translation_mcq" };
  }
  if (tb === "writing") {
    const dg = Math.max(3, g);
    return { skillId: `descriptive_place_g${dg}`, subskillId: "descriptive" };
  }
  if (tb === "sentences") {
    if (g <= 2) return { skillId: "base_be_have_g1", subskillId: "base" };
    if (g === 3) return { skillId: "routine_present_g3_study", subskillId: "routine" };
    if (g === 4) return { skillId: "routine_present_g4_study", subskillId: "routine" };
    if (g === 5) return { skillId: "routine_present_g5_music", subskillId: "routine" };
    return { skillId: "routine_present_g6_lunch", subskillId: "routine" };
  }
  return null;
}

/**
 * @param {string} subject
 * @param {string} skillId
 * @param {string} subskillId
 */
function validationSubjectForPair(subject, skillId) {
  const sid = String(subject || "").toLowerCase();
  const sk = String(skillId || "");
  if (sk.startsWith("hebrew_archive_")) return "hebrew-archive";
  if (sk.startsWith("moledet_geo_")) return "moledet-geography";
  return sid;
}

/**
 * @param {string} subject
 * @param {string} skillId
 * @param {string} subskillId
 * @returns {string[]} issue codes (empty = valid)
 */
export function validateBankTaxonomyPair(subject, skillId, subskillId) {
  const subj = validationSubjectForPair(subject, skillId);
  return validateTaxonomyForRecord({
    subject: subj,
    skillId: String(skillId || "").trim(),
    subskillId: String(subskillId || "").trim(),
    difficulty: "standard",
    cognitiveLevel: "recall",
    expectedErrorTypes: ["misconception"],
    prerequisiteSkillIds: [],
  });
}

/**
 * @param {{ entries?: unknown[] }} [index]
 * @param {string} subject
 * @param {string} skillId
 * @param {string} subskillId
 */
/**
 * Map science diagnostic topic bucket → first indexed bank skill/subskill (sci_* rows).
 * @param {string} bucketKey
 * @param {{ entries?: unknown[] }} [index]
 */
function scienceTopicPairFromMetadataIndex(bucketKey, index) {
  if (!index || !Array.isArray(index.entries)) return null;
  const topic = String(bucketKey || "").trim();
  if (!topic) return null;
  const needle = `_${topic}_`;
  const candidates = index.entries.filter(
    (e) =>
      e &&
      typeof e === "object" &&
      String(e.subject || "").toLowerCase() === "science" &&
      (String(e.skillId || "").includes(needle) ||
        String(e.subskillId || "").includes(needle) ||
        String(e.skillId || "") === topic)
  );
  if (!candidates.length) return null;
  const preferredSkillId =
    topic === "experiments" ? "sci_experiments_scientific_method" : "";
  const hit =
    (preferredSkillId
      ? candidates.find((e) => String(e.skillId || "").trim() === preferredSkillId)
      : null) || candidates[0];
  if (!hit || typeof hit !== "object") return null;
  const skillId = String(hit.skillId || "").trim();
  const subskillId = String(hit.subskillId || "").trim();
  if (!skillId || !subskillId) return null;
  return { skillId, subskillId };
}

/**
 * Map history diagnostic topic bucket → first indexed bank skill/subskill (hist_* rows).
 * @param {string} bucketKey
 * @param {{ entries?: unknown[] }} [index]
 */
function historyTopicPairFromMetadataIndex(bucketKey, index) {
  if (!index || !Array.isArray(index.entries)) return null;
  const topic = String(bucketKey || "").trim();
  if (!topic) return null;
  const candidates = index.entries.filter(
    (e) =>
      e &&
      typeof e === "object" &&
      String(e.subject || "").toLowerCase() === "history" &&
      (String(e.topic || "") === topic ||
        String(e.skillId || "").includes(topic) ||
        String(e.subskillId || "").includes(topic))
  );
  if (!candidates.length) return null;
  const hit = candidates[0];
  if (!hit || typeof hit !== "object") return null;
  const skillId = String(hit.skillId || "").trim();
  const subskillId = String(hit.subskillId || "").trim();
  if (!skillId || !subskillId) return null;
  return { skillId, subskillId };
}

function indexHasExactPair(index, subject, skillId, subskillId) {
  if (!index || !Array.isArray(index.entries) || !skillId || !subskillId) return true;
  const sub = String(subject || "").toLowerCase();
  const aliases =
    sub === "hebrew"
      ? new Set(["hebrew", "hebrew-archive"])
      : sub === "moledet-geography"
        ? new Set(["moledet-geography"])
        : sub === "history"
          ? new Set(["history"])
          : new Set([sub]);
  return index.entries.some(
    (e) =>
      e &&
      typeof e === "object" &&
      aliases.has(String(e.subject || "").toLowerCase()) &&
      String(e.skillId || "") === skillId &&
      String(e.subskillId || "") === subskillId
  );
}

/**
 * @param {object} unit — diagnostic engine v2 unit and/or facet summary fields
 * @param {object} [context]
 * @param {string} [context.scenarioId]
 * @param {boolean} [context.allowEnglishSkillRouting]
 * @param {{ entries?: unknown[] }} [context.metadataIndex]
 * @param {unknown[]} [context.topicBucketKeys] - `facets.topicLayer.topicBucketKeys` for English bucket cross-check
 */
export function resolveDiagnosticUnitSkillAlignment(unit, context = {}) {
  const warnings = /** @type {string[]} */ ([]);
  const subject = String(unit?.subjectId || "").trim().toLowerCase();
  const allowEnglish = !!context.allowEnglishSkillRouting;

  /** @type {{ subject: string, skillId: string, subskillId: string, confidence: AlignmentConfidence, source: AlignmentSource, warnings: string[] }} */
  const empty = () => ({
    subject,
    skillId: "",
    subskillId: "",
    confidence: /** @type {AlignmentConfidence} */ ("missing"),
    source: /** @type {AlignmentSource} */ ("none"),
    warnings: [...warnings],
  });

  if (!subject) {
    warnings.push("alignment_missing_subject");
    return empty();
  }

  const scenarioId = String(context.scenarioId || "");
  const gradeSub = inferGradeSubskillFromScenarioId(scenarioId);

  const explicitSkill = String(unit?.skillId || unit?.taxonomySkillId || "").trim();
  const explicitSub = String(unit?.subskillId || unit?.taxonomySubskillId || "").trim();

  if (explicitSkill || explicitSub) {
    if (!explicitSkill || !explicitSub) {
      warnings.push("alignment_partial_explicit_ids");
      return { ...empty(), warnings: [...warnings] };
    }
    const issues = validateBankTaxonomyPair(subject, explicitSkill, explicitSub);
    if (issues.length) {
      for (const code of issues) warnings.push(`alignment_invalid_taxonomy:${code}`);
      return { ...empty(), warnings: [...warnings] };
    }
    if (subject === "english" && !allowEnglish) {
      warnings.push("alignment_english_requires_explicit_routing_flag");
      return { ...empty(), warnings: [...warnings] };
    }
    if (!indexHasExactPair(context.metadataIndex, subject, explicitSkill, explicitSub)) {
      warnings.push("alignment_explicit_pair_not_found_in_metadata_index");
      return { ...empty(), warnings: [...warnings] };
    }
    return {
      subject,
      skillId: explicitSkill,
      subskillId: explicitSub,
      confidence: "exact",
      source: "unit_field",
      warnings,
    };
  }

  const qm = unit?.questionMetadata || unit?.sampleQuestionMetadata;
  if (qm && typeof qm === "object") {
    const sk = String(qm.skillId || "").trim();
    const sub = String(qm.subskillId || "").trim();
    if (sk && sub) {
      const issues = validateBankTaxonomyPair(subject, sk, sub);
      if (!issues.length) {
        if (subject === "english" && !allowEnglish) {
          warnings.push("alignment_english_question_meta_requires_routing_flag");
          return { ...empty(), warnings: [...warnings] };
        }
        if (!indexHasExactPair(context.metadataIndex, subject, sk, sub)) {
          warnings.push("alignment_question_meta_pair_not_in_metadata_index");
          return { ...empty(), warnings: [...warnings] };
        }
        return {
          subject,
          skillId: sk,
          subskillId: sub,
          confidence: "exact",
          source: "question_metadata",
          warnings,
        };
      } else {
        for (const code of issues) warnings.push(`alignment_invalid_question_metadata:${code}`);
      }
    }
  }

  const taxonomyId = String(unit?.diagnosis?.taxonomyId || unit?.taxonomy?.id || "").trim();

  if (subject === "geometry" && taxonomyId && GEOMETRY_TAXONOMY_ID_TO_BANK[taxonomyId]) {
    const pair = GEOMETRY_TAXONOMY_ID_TO_BANK[taxonomyId];
    const issues = validateBankTaxonomyPair("geometry", pair.skillId, pair.subskillId);
    if (!issues.length) {
      if (!indexHasExactPair(context.metadataIndex, "geometry", pair.skillId, pair.subskillId)) {
        warnings.push("alignment_taxonomy_bridge_not_in_metadata_index");
        return { ...empty(), warnings: [...warnings] };
      }
      return {
        subject,
        skillId: pair.skillId,
        subskillId: pair.subskillId,
        confidence: "inferred_safe",
        source: "taxonomy_bridge",
        warnings,
      };
    }
    for (const code of issues) warnings.push(`alignment_invalid_taxonomy_bridge:${code}`);
  }

  if (subject === "geometry") {
    const geoBucket = resolveGeometryTopicBucketKeyFromUnit(unit, context.topicBucketKeys);
    if (geoBucket) {
      const pair = geometryTopicBucketToBankPair(geoBucket);
      if (pair) {
        const issues = validateBankTaxonomyPair("geometry", pair.skillId, pair.subskillId);
        if (!issues.length) {
          if (!indexHasExactPair(context.metadataIndex, "geometry", pair.skillId, pair.subskillId)) {
            warnings.push("alignment_geometry_topic_bucket_pair_not_in_metadata_index");
          } else {
            return {
              subject,
              skillId: pair.skillId,
              subskillId: pair.subskillId,
              confidence: "inferred_safe",
              source: "topic_mapping",
              warnings,
            };
          }
        } else {
          for (const code of issues) warnings.push(`alignment_geometry_topic_bucket_invalid:${code}`);
        }
      }
    }
  }

  if (subject === "math") {
    const bucketKey = String(unit?.bucketKey || "").trim();
    const baseOp = mathReportBaseOperationKey(bucketKey);
    if (!baseOp) {
      return { ...empty(), warnings: [...warnings] };
    }
    const opKey = String(baseOp).toLowerCase();
    const pair = MATH_REPORT_BUCKET_TO_BANK_PAIR[opKey];
    if (!pair) {
      warnings.push("alignment_math_unknown_bucket");
      return { ...empty(), warnings: [...warnings] };
    }
    const issues = validateBankTaxonomyPair("math", pair.skillId, pair.subskillId);
    if (issues.length) {
      for (const code of issues) warnings.push(`alignment_math_pair_invalid:${code}`);
      return { ...empty(), warnings: [...warnings] };
    }
    if (!indexHasExactPair(context.metadataIndex, "math", pair.skillId, pair.subskillId)) {
      warnings.push("alignment_math_pair_not_in_metadata_index");
      return { ...empty(), warnings: [...warnings] };
    }
    return {
      subject,
      skillId: pair.skillId,
      subskillId: pair.subskillId,
      confidence: "inferred_safe",
      source: "topic_mapping",
      warnings,
    };
  }

  if (subject === "science") {
    const bucketKey = String(unit?.bucketKey || "").trim();
    if (!bucketKey || !SCIENCE_TOPIC_ORDER.includes(bucketKey)) {
      return { ...empty(), warnings: [...warnings] };
    }
    const fromIndex = scienceTopicPairFromMetadataIndex(bucketKey, context.metadataIndex);
    if (fromIndex) {
      return {
        subject,
        skillId: fromIndex.skillId,
        subskillId: fromIndex.subskillId,
        confidence: "inferred_safe",
        source: "topic_mapping",
        warnings,
      };
    }
    const skillId = bucketKey;
    const subskillId = `sci_${bucketKey}_general`;
    if (!SCIENCE_SKILL_IDS.has(skillId)) {
      warnings.push("alignment_science_unknown_topic");
      return { ...empty(), warnings: [...warnings] };
    }
    const allow = SCIENCE_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
    if (!allow || !allow.has(subskillId)) {
      warnings.push("alignment_science_subskill_mismatch");
      return { ...empty(), warnings: [...warnings] };
    }
    if (!indexHasExactPair(context.metadataIndex, "science", skillId, subskillId)) {
      warnings.push("alignment_science_pair_not_in_metadata_index");
    }
    return {
      subject,
      skillId,
      subskillId,
      confidence: "inferred_safe",
      source: "topic_mapping",
      warnings,
    };
  }

  if (subject === "history") {
    const bucketKey = String(unit?.bucketKey || "").trim();
    if (!bucketKey || !HISTORY_TOPIC_ORDER.includes(bucketKey)) {
      return { ...empty(), warnings: [...warnings] };
    }
    const fromIndex = historyTopicPairFromMetadataIndex(bucketKey, context.metadataIndex);
    if (fromIndex) {
      return {
        subject,
        skillId: fromIndex.skillId,
        subskillId: fromIndex.subskillId,
        confidence: "inferred_safe",
        source: "topic_mapping",
        warnings,
      };
    }
    const cfg = HISTORY_G6_CONTENT_MAP[bucketKey];
    const first = cfg?.subtopics?.[0];
    if (!first) {
      warnings.push("alignment_history_unknown_topic");
      return { ...empty(), warnings: [...warnings] };
    }
    const skillId = String(first.skillId || "").trim();
    const subskillId = String(first.id || "").trim();
    if (!HISTORY_SKILL_IDS.includes(skillId)) {
      warnings.push("alignment_history_unknown_skill");
      return { ...empty(), warnings: [...warnings] };
    }
    const allow = HISTORY_SUBSKILL_ALLOWLIST_BY_SKILL[skillId];
    if (!allow || !allow.has(subskillId)) {
      warnings.push("alignment_history_subskill_mismatch");
      return { ...empty(), warnings: [...warnings] };
    }
    if (!indexHasExactPair(context.metadataIndex, "history", skillId, subskillId)) {
      warnings.push("alignment_history_pair_not_in_metadata_index");
    }
    return {
      subject,
      skillId,
      subskillId,
      confidence: "inferred_safe",
      source: "topic_mapping",
      warnings,
    };
  }

  if (subject === "hebrew") {
    const bucketKey = String(unit?.bucketKey || "").trim();
    if (!bucketKey || !HEBREW_ARCHIVE_CATEGORY_KEYS.includes(bucketKey)) {
      return { ...empty(), warnings: [...warnings] };
    }
    const skillId = hebrewArchiveCategoryToSkillId(bucketKey);
    if (!skillId) return { ...empty(), warnings: [...warnings] };
    if (!gradeSub) {
      warnings.push("alignment_hebrew_archive_needs_grade_from_scenario");
      return {
        subject,
        skillId,
        subskillId: "",
        confidence: "inferred_safe",
        source: "topic_mapping",
        warnings,
      };
    }
    const issues = validateBankTaxonomyPair("hebrew", skillId, gradeSub);
    if (issues.length) {
      for (const code of issues) warnings.push(`alignment_hebrew_archive_invalid:${code}`);
      return { ...empty(), warnings: [...warnings] };
    }
    if (!indexHasExactPair(context.metadataIndex, "hebrew", skillId, gradeSub)) {
      warnings.push("alignment_hebrew_pair_not_in_metadata_index");
      return { ...empty(), warnings: [...warnings] };
    }
    return {
      subject,
      skillId,
      subskillId: gradeSub,
      confidence: "inferred_safe",
      source: "topic_mapping",
      warnings,
    };
  }

  if (subject === "moledet-geography") {
    const bucketKey = String(unit?.bucketKey || "").trim();
    if (!bucketKey || !MOLEDET_GEOGRAPHY_STRAND_KEYS.includes(bucketKey) || bucketKey === "mixed") {
      return { ...empty(), warnings: [...warnings] };
    }
    const skillId = moledetGeographyStrandToSkillId(bucketKey);
    if (!skillId) return { ...empty(), warnings: [...warnings] };
    if (!gradeSub) {
      warnings.push("alignment_moledet_needs_grade_from_scenario");
      return {
        subject,
        skillId,
        subskillId: "",
        confidence: "inferred_safe",
        source: "topic_mapping",
        warnings,
      };
    }
    const issues = validateBankTaxonomyPair("moledet-geography", skillId, gradeSub);
    if (issues.length) {
      for (const code of issues) warnings.push(`alignment_moledet_invalid:${code}`);
      return { ...empty(), warnings: [...warnings] };
    }
    if (!indexHasExactPair(context.metadataIndex, "moledet-geography", skillId, gradeSub)) {
      warnings.push("alignment_moledet_pair_not_in_metadata_index");
      return { ...empty(), warnings: [...warnings] };
    }
    return {
      subject,
      skillId,
      subskillId: gradeSub,
      confidence: "inferred_safe",
      source: "topic_mapping",
      warnings,
    };
  }

  if (subject === "english") {
    const bucket = resolveEnglishTopicBucketKeyFromUnit(unit, context.topicBucketKeys);
    if (bucket) {
      const gradeDigit = inferEnglishGradeDigitFromScenarioId(scenarioId);
      const pair = englishTopicBucketToBankPair(bucket, gradeDigit);
      if (pair) {
        const issues = validateBankTaxonomyPair(subject, pair.skillId, pair.subskillId);
        if (!issues.length) {
          if (!indexHasExactPair(context.metadataIndex, subject, pair.skillId, pair.subskillId)) {
            warnings.push("alignment_english_topic_bucket_pair_not_in_metadata_index");
          } else {
            return {
              subject,
              skillId: pair.skillId,
              subskillId: pair.subskillId,
              confidence: "inferred_safe",
              source: "topic_mapping",
              warnings,
            };
          }
        } else {
          for (const code of issues) warnings.push(`alignment_english_topic_bucket_invalid:${code}`);
        }
      }
    }
    warnings.push("alignment_english_no_safe_topic_mapping");
    return { ...empty(), warnings: [...warnings] };
  }

  return { ...empty(), warnings: [...warnings] };
}

/**
 * Fields to merge onto a facet `unitSummary` (omit when missing / unsafe).
 * @param {object} engineUnit — full diagnostic engine v2 unit
 * @param {object} [context]
 */
export function buildFacetSkillAlignmentFields(engineUnit, context) {
  const resolved = resolveDiagnosticUnitSkillAlignment(engineUnit, context);
  if (resolved.confidence === "missing" && !resolved.skillId) {
    return {};
  }
  /** @type {Record<string, unknown>} */
  const out = {
    skillAlignmentConfidence: resolved.confidence,
    skillAlignmentSource: resolved.source,
    skillAlignmentWarnings: resolved.warnings.length ? resolved.warnings : [],
  };
  if (resolved.skillId) out.skillId = resolved.skillId;
  if (resolved.subskillId) out.subskillId = resolved.subskillId;
  return out;
}

export default {
  inferGradeSubskillFromScenarioId,
  inferEnglishGradeDigitFromScenarioId,
  resolveEnglishTopicBucketKeyFromUnit,
  englishTopicBucketToBankPair,
  resolveGeometryTopicBucketKeyFromUnit,
  geometryTopicBucketToBankPair,
  validateBankTaxonomyPair,
  resolveDiagnosticUnitSkillAlignment,
  buildFacetSkillAlignmentFields,
};
