import {
  TAG_PRODUCER_REGISTRY,
} from "../../lib/learning/taxonomy-tag-producer-registry.js";
import {
  TAXONOMY_EVIDENCE_RULES,
} from "./taxonomy-evidence-rules.js";

export const TAXONOMY_REQUIRED_TAG_STATUS_VALUES = Object.freeze([
  "active",
  "unsupported_unproduced",
]);

function buildStatusRegistry() {
  const out = {};
  for (const [ruleId, rule] of Object.entries(TAXONOMY_EVIDENCE_RULES)) {
    for (const tag of rule.requiredTags || []) {
      const producer = TAG_PRODUCER_REGISTRY[tag] || null;
      const active = producer?.active === true;
      out[tag] = {
        tag,
        status: active ? "active" : "unsupported_unproduced",
        reasonCode: active
          ? "taxonomy_tag:active_producer"
          : "taxonomy_tag:no_runtime_producer",
        producer: active
          ? {
              module: producer.module,
              generator: producer.generator,
            }
          : null,
        ruleIds: [...new Set([...(out[tag]?.ruleIds || []), ruleId])].sort(),
      };
    }
  }
  return Object.freeze(out);
}

export const TAXONOMY_REQUIRED_TAG_STATUS = buildStatusRegistry();

export function taxonomyRequiredTagStatus(tag) {
  return (
    TAXONOMY_REQUIRED_TAG_STATUS[String(tag || "").trim()] || {
      tag: String(tag || "").trim() || null,
      status: "unsupported_unproduced",
      reasonCode: "taxonomy_tag:not_declared",
      producer: null,
      ruleIds: [],
    }
  );
}
