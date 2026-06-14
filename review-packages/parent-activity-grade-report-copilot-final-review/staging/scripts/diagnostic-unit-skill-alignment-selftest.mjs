#!/usr/bin/env node
/**
 * Targeted checks for diagnostic unit → bank skill alignment (offline).
 * npm run test:diagnostic-unit-skill-alignment
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const mod = await import(
  new URL("../utils/adaptive-learning-planner/diagnostic-unit-skill-alignment.js", import.meta.url).href
);
const metaMod = await import(
  new URL("../utils/adaptive-learning-planner/adaptive-planner-metadata-context.js", import.meta.url).href
);

const {
  resolveDiagnosticUnitSkillAlignment,
  inferGradeSubskillFromScenarioId,
  resolveEnglishTopicBucketKeyFromUnit,
  resolveGeometryTopicBucketKeyFromUnit,
} = mod;
const { buildPlannerQuestionMetadataIndex } = metaMod;

function assert(name, cond, detail = "") {
  if (!cond) throw new Error(`${name}${detail ? ` — ${detail}` : ""}`);
}

const metadataIndex = await buildPlannerQuestionMetadataIndex({ rootAbs: ROOT });

assert("infer_g3", inferGradeSubskillFromScenarioId("weak_hebrew_comprehension_g3_7d") === "g3");

let r = resolveDiagnosticUnitSkillAlignment(
  {
    subjectId: "math",
    bucketKey: "fractions",
  },
  { metadataIndex }
);
assert("math_topic_fractions", r.confidence === "inferred_safe" && r.source === "topic_mapping");
assert("math_pair", r.skillId === "math_frac_add_sub" && r.subskillId === "frac_add_sub");

r = resolveDiagnosticUnitSkillAlignment(
  {
    subjectId: "science",
    bucketKey: "experiments",
  },
  { metadataIndex }
);
assert(
  "science_topic",
  r.skillId === "sci_experiments_scientific_method" && r.subskillId === "sci_experiments_general"
);

r = resolveDiagnosticUnitSkillAlignment(
  {
    subjectId: "geometry",
    diagnosis: { taxonomyId: "G-03" },
  },
  { metadataIndex }
);
assert("geometry_taxonomy", r.skillId === "geo_rect_area_plan" && r.confidence === "inferred_safe");

r = resolveDiagnosticUnitSkillAlignment(
  {
    subjectId: "english",
    skillId: "en_grammar_be_present",
    subskillId: "be_basic",
  },
  { allowEnglishSkillRouting: true, metadataIndex }
);
assert("english_explicit", r.confidence === "exact" && r.source === "unit_field");

r = resolveDiagnosticUnitSkillAlignment(
  {
    subjectId: "english",
    questionMetadata: { skillId: "invalid_english_skill_xyz", subskillId: "nope" },
  },
  { allowEnglishSkillRouting: true, metadataIndex }
);
assert("english_bad_meta", r.confidence === "missing");

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "english", displayName: "Grammar" },
  { metadataIndex }
);
assert("english_no_topic_keys", r.confidence === "missing" && r.source === "none");

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "english", displayName: "Grammar" },
  { metadataIndex, topicBucketKeys: ["grammar"], scenarioId: "weak_english_grammar_g4_30d" }
);
assert(
  "english_grammar_topic_bucket",
  r.confidence === "inferred_safe" &&
    r.source === "topic_mapping" &&
    r.skillId === "en_grammar_be_present" &&
    r.subskillId === "be_basic"
);

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "english", displayName: "Vocabulary" },
  { metadataIndex, topicBucketKeys: ["vocabulary", "grammar"], scenarioId: "strong_all_subjects_g3_7d" }
);
assert(
  "english_vocab_topic_bucket",
  r.confidence === "inferred_safe" &&
    r.skillId === "translation_mcq_g3_matrix" &&
    r.subskillId === "simulator_translation_mcq"
);

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "english", displayName: "MysteryTopic" },
  { metadataIndex, topicBucketKeys: ["grammar"], scenarioId: "weak_english_grammar_g4_30d" }
);
assert("english_vague_display", r.confidence === "missing");

assert(
  "english_bucket_crosscheck",
  resolveEnglishTopicBucketKeyFromUnit({ displayName: "Grammar" }, ["writing"]) === ""
);

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "geometry", displayName: "היקף" },
  { metadataIndex, topicBucketKeys: ["perimeter", "angles"], scenarioId: "strong_all_subjects_g3_7d" }
);
assert(
  "geometry_perimeter_topic_bucket",
  r.confidence === "inferred_safe" &&
    r.source === "topic_mapping" &&
    r.skillId === "geo_pv_area_vs_perimeter" &&
    r.subskillId === "fence_perimeter_project"
);

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "geometry", displayName: "מקבילות ומאונכות" },
  { metadataIndex, topicBucketKeys: ["parallel_perpendicular", "perimeter"], scenarioId: "strong_all_subjects_g3_7d" }
);
assert(
  "geometry_parallel_topic_bucket",
  r.confidence === "inferred_safe" &&
    r.skillId === "parallel_never_meet" &&
    r.subskillId === "parallel_def"
);

assert(
  "geometry_hebrew_display_bucket_mismatch",
  resolveGeometryTopicBucketKeyFromUnit({ displayName: "היקף" }, ["area"]) === ""
);

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "geometry", displayName: "שטח", diagnosis: { taxonomyId: "G-03" } },
  { metadataIndex, topicBucketKeys: ["perimeter"] }
);
assert("geometry_taxonomy_takes_precedence", r.skillId === "geo_rect_area_plan" && r.subskillId === "area_rectangle");

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "geometry", skillId: "not_real_geo_skill", subskillId: "nope" },
  { metadataIndex, topicBucketKeys: ["perimeter"] }
);
assert(
  "geometry_invalid_explicit_rejected",
  r.confidence === "missing" && r.warnings.some((w) => w.startsWith("alignment_invalid_taxonomy"))
);

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "geometry", displayName: "זוויות" },
  { metadataIndex, topicBucketKeys: ["angles", "perimeter"], scenarioId: "strong_all_subjects_g3_7d" }
);
assert("geometry_unmapped_hebrew_stays_missing", r.confidence === "missing" && r.source === "none");

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "math", skillId: "math_mul", subskillId: "mul" },
  { metadataIndex }
);
assert("explicit_math", r.confidence === "exact" && r.source === "unit_field");

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "math", skillId: "not_a_real_math_skill_id", subskillId: "x" },
  { metadataIndex }
);
assert("invalid_explicit", r.confidence === "missing" && r.warnings.some((w) => w.startsWith("alignment_invalid_taxonomy")));

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "hebrew", bucketKey: "comprehension" },
  { scenarioId: "weak_hebrew_comprehension_g3_7d", metadataIndex }
);
assert("hebrew_archive_topic", r.skillId === "hebrew_archive_comprehension" && r.subskillId === "g3");

r = resolveDiagnosticUnitSkillAlignment(
  { subjectId: "english", skillId: "en_grammar_be_present", subskillId: "be_basic" },
  { allowEnglishSkillRouting: false, metadataIndex }
);
assert("english_blocked_without_flag", r.confidence === "missing");

console.log("OK — diagnostic-unit-skill-alignment selftest");
