/**
 * Q2-E.1 / Q2-E.5-B / Q2-E.5-C2 — parent-context metadata feature flags (default OFF).
 */

/**
 * @returns {boolean}
 */
export function isDiagnosticMetadataSubskillEnabled() {
  return process.env.DIAGNOSTIC_METADATA_SUBSKILL_ENABLED === "true";
}

/**
 * Q2-E.5-B — active parent gating trial (requires subskill flag too).
 * @returns {boolean}
 */
export function isDiagnosticMetadataParentGatingEnabled() {
  return process.env.DIAGNOSTIC_METADATA_PARENT_GATING_ENABLED === "true";
}

/**
 * Both flags must be true for active metadata-informed parent gating.
 * @returns {boolean}
 */
export function isActiveMetadataParentGatingEnabled() {
  return (
    isDiagnosticMetadataSubskillEnabled() && isDiagnosticMetadataParentGatingEnabled()
  );
}

/**
 * Q2-E.5-C2 — active parent promotion trial (requires subskill + gating flags too).
 * @returns {boolean}
 */
export function isDiagnosticMetadataParentPromotionEnabled() {
  return process.env.DIAGNOSTIC_METADATA_PARENT_PROMOTION_ENABLED === "true";
}

/**
 * All three flags must be true for active metadata-informed parent promotion.
 * @returns {boolean}
 */
export function isActiveMetadataParentPromotionEnabled() {
  return (
    isDiagnosticMetadataSubskillEnabled() &&
    isDiagnosticMetadataParentGatingEnabled() &&
    isDiagnosticMetadataParentPromotionEnabled()
  );
}
