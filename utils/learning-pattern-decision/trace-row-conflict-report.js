/**
 * Detect composition conflicts: pattern internally detected but parent suppressed without reason.
 * @param {object|null|undefined} lpd
 */
export function traceRowConflictReport(lpd) {
  if (!lpd || typeof lpd !== "object") {
    return { conflict: true, reasons: ["missing_learningPatternDecision"] };
  }

  /** @type {string[]} */
  const reasons = [];
  const hasInternalPattern = Array.isArray(lpd.detectedPatterns) && lpd.detectedPatterns.length > 0;
  const hasParentText = String(lpd.parentVisibleFinding || "").trim().length > 0;
  const withheld =
    lpd.parentWordingLevel === "no_parent_text" &&
    lpd.topicStatus !== "not_practiced" &&
    lpd.topicStatus !== "no_clear_pattern";

  if (hasInternalPattern && !hasParentText && withheld) {
    const blocked = Array.isArray(lpd.blockedClaims) ? lpd.blockedClaims : [];
    if (!blocked.length) {
      reasons.push("pattern_detected_but_parent_suppressed_without_blockedClaims");
    }
  }

  if (
    hasInternalPattern &&
    lpd.parentWordingLevel === "repeated_pattern" &&
    (lpd.practicedQuestions || 0) <= 4
  ) {
    reasons.push("repeated_wording_at_q3_4_overclaim");
  }

  return { conflict: reasons.length > 0, reasons };
}

export default { traceRowConflictReport };
