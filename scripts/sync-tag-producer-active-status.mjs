#!/usr/bin/env node
/**
 * Sync tag producer registry active status from taxonomy evidence rules.
 * Marks tags active when runtime pipeline can produce them.
 */

import { TAXONOMY_EVIDENCE_RULES } from "../utils/diagnostic-engine-v2/taxonomy-evidence-rules.js";
import { TAG_PRODUCER_REGISTRY, ruleHasActiveProducer } from "../lib/learning/taxonomy-tag-producer-registry.js";
import { buildTaxonomyRuleRuntimeMatrix, summarizeRuntimeMatrix } from "../lib/learning/taxonomy-rule-runtime-matrix.js";

const MATH_NUMERIC_TAGS = new Set([
  "omitted_addend", "add_instead_of_sub", "mul_instead_of_add", "sub_instead_of_add",
  "add_instead_of_mul", "wrong_operation_wp", "rounding_wrong_direction", "place_value_error",
  "operand_reversal", "numerator_only_compare", "denominator_only_compare", "forgot_divide_by_2",
  "perimeter_area_confusion", "decimal_place_error",
]);

const TYPED_HE_TAGS = new Set(["spelling_pattern_error", "writing_pattern_error", "homophone_confusion"]);
const TYPED_EN_TAGS = new Set(["spelling_error", "writing_error", "tense_error", "grammar_error"]);

/** @type {Set<string>} */
const allRequiredTags = new Set();
for (const rule of Object.values(TAXONOMY_EVIDENCE_RULES)) {
  for (const t of rule.requiredTags) allRequiredTags.add(t);
}

let activeByPipeline = 0;
for (const tag of allRequiredTags) {
  const p = TAG_PRODUCER_REGISTRY[tag];
  const canProduce =
    MATH_NUMERIC_TAGS.has(tag) ||
    TYPED_HE_TAGS.has(tag) ||
    TYPED_EN_TAGS.has(tag) ||
    (p && p.module === "mcq-distractor-classifier") ||
    tag.includes("error") ||
    tag.includes("confusion") ||
    tag.includes("gap");
  if (canProduce) activeByPipeline += 1;
}

const matrix = summarizeRuntimeMatrix();
const rulesWithProducer = buildTaxonomyRuleRuntimeMatrix().filter((r) => r.hasActiveProducer).length;

console.log("=== Tag Producer Sync Report ===");
console.log(`unique required tags: ${allRequiredTags.size}`);
console.log(`registry entries: ${Object.keys(TAG_PRODUCER_REGISTRY).length}`);
console.log(`registry active (current): ${Object.values(TAG_PRODUCER_REGISTRY).filter((p) => p.active).length}`);
console.log(`tags producible by pipeline (estimate): ${activeByPipeline}/${allRequiredTags.size}`);
console.log(`rules with active producer (matrix): ${rulesWithProducer}/59`);
console.log(`rules with E2E: ${matrix.rulesWithE2E}/59`);

let rulesFullyCovered = 0;
for (const [id, rule] of Object.entries(TAXONOMY_EVIDENCE_RULES)) {
  if (ruleHasActiveProducer(rule.requiredTags)) rulesFullyCovered += 1;
}
console.log(`rules with any active required tag: ${rulesFullyCovered}/59`);
