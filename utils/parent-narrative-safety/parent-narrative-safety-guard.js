/**
 * Parent narrative safety guard — deterministic validation only (no rewriting).
 */

import {
  CAUTIOUS_HEDGE_RES,
  DEFAULT_MUST_NOT_SAY,
  ISSUE_CODES,
  MASTERY_CLAIM_RES,
  MEDICAL_DIAGNOSTIC_RES,
  OVERCONFIDENT_PHRASE_RES,
  OVERSTATED_GAP_RES,
  PERMANENT_ABILITY_RES,
  SAFE_THIN_DATA_CAUTION_RES,
  UNSAFE_THIN_DATA_MIXED_CONCLUSION_RES,
  UNSUPPORTED_ADVANCE_RES,
} from "./parent-narrative-safety-contract.js";

/** @param {string} s */
function normalizeHe(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {string} text @param {RegExp[]} patterns */
function firstMatch(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return { re, match: m[0] };
  }
  return null;
}

/** @param {string} text */
function hasHedge(text) {
  return CAUTIOUS_HEDGE_RES.some((re) => re.test(text));
}

/** Explicit limited-evidence / collect-more-data framing (Hebrew). */
function isSafeThinDataCautionHe(text) {
  return SAFE_THIN_DATA_CAUTION_RES.some((re) => re.test(text));
}

/** Thin-data row but narrative pushes a firm problem conclusion or “can determine” — not safe caution. */
function isUnsafeThinDataMixedConclusionHe(text) {
  return UNSAFE_THIN_DATA_MIXED_CONCLUSION_RES.some((re) => re.test(text));
}

/**
 * Cautionary templates that contain words like "חד משמעי" but are not certainty claims.
 * @param {string} text
 */
function scrubCautionaryOverconfidenceFalsePositives(text) {
  return String(text)
    .replace(/לפני\s+לומר\s+משהו\s+חד[\s-]*משמעית?/gu, " ")
    .replace(/לומר\s+משהו\s+חד[\s-]*משמעית?/gu, " ")
    .replace(/לא\s+לקבוע\s+חד[\s-]*משמעית?/gu, " ")
    .replace(/כדי\s+שיהיה\s+חד[\s-]*משמעית?\s+מה\s+לעשות/gu, " ")
    .replace(/אין\s+כרגע\s+פעולה\s+ביתית\s+חד-משמעית/gu, " ")
    .replace(/פעולה\s+ביתית\s+חד-משמעית/gu, " ");
}

/** @param {string} text */
function hasOverconfidence(text) {
  const scrubbed = scrubCautionaryOverconfidenceFalsePositives(text);
  return OVERCONFIDENT_PHRASE_RES.some((re) => re.test(scrubbed));
}

/** @param {Record<string, unknown>|null|undefined} eo */
function isThinEvidence(eo) {
  if (!eo || typeof eo !== "object") return false;
  if (eo.thinData === true) return true;
  const q = Number(eo.questionCount);
  if (Number.isFinite(q) && q > 0 && q < 10) return true;
  const suff = String(eo.dataSufficiencyLevel || "").toLowerCase();
  if (suff === "weak" || suff === "thin" || suff === "low" || suff === "insufficient") return true;
  return false;
}

/** @param {Record<string, unknown>|null|undefined} eo */
function hasDoNotConcludeBarrier(eo) {
  if (!eo || typeof eo !== "object") return false;
  if (eo.cannotConclude === true) return true;
  const arr = eo.doNotConclude;
  return Array.isArray(arr) && arr.length > 0;
}

/** @param {Record<string, unknown>|null|undefined} eo */
function engineConfidenceLow(eo) {
  if (!eo || typeof eo !== "object") return false;
  return String(eo.engineConfidence || "").toLowerCase() === "low";
}

/** @param {Record<string, unknown>|null|undefined} eo */
function conclusionWithheld(eo) {
  if (!eo || typeof eo !== "object") return false;
  return String(eo.conclusionStrengthAllowed || "").toLowerCase() === "withheld";
}

/**
 * Deterministic parent-facing narrative safety validation.
 *
 * @param {object} input
 * @param {string} input.narrativeText
 * @param {import("./parent-narrative-safety-contract.js").ParentNarrativeEngineOutput|null} [input.engineOutput]
 * @param {import("./parent-narrative-safety-contract.js").ParentNarrativeReportContext} [input.reportContext]
 * @param {"he"|string} [input.locale]
 */
export function validateParentNarrativeSafety(input) {
  const narrativeText = normalizeHe(input?.narrativeText ?? "");
  const engineOutput = input?.engineOutput && typeof input.engineOutput === "object" ? input.engineOutput : {};
  const reportContext = input?.reportContext && typeof input.reportContext === "object" ? input.reportContext : {};

  /** @type {Array<{ code: string, severity: "low"|"medium"|"high", message: string, detail?: string }>} */
  const issues = [];
  /** @type {string[]} */
  const blockedReasons = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const mustNotSayHits = [];
  /** @type {string[]} */
  const unsupportedClaims = [];
  /** @type {string[]} */
  const overconfidenceFindings = [];
  /** @type {string[]} */
  const thinDataFindings = [];
  /** @type {string[]} */
  const medicalLanguageFindings = [];
  /** @type {string[]} */
  const recommendationFindings = [];
  /** @type {string[]} */
  const infoFindings = [];
  /** @type {string[]} */
  const cautionaryThinDataFindings = [];

  const locale = String(input?.locale || "he");

  /**
   * @param {string} code
   * @param {"low"|"medium"|"high"} severity
   * @param {string} message
   * @param {string} [detail]
   * @param {boolean} [blocking]
   */
  function record(code, severity, message, detail, blocking = false) {
    issues.push({
      code,
      severity,
      message,
      ...(detail ? { detail } : {}),
    });
    if (blocking) blockedReasons.push(code);
  }

  /** Reduce must_not_say false positives (negated “לא מאסטרי”, cautious “חד משמעית” about actions). */
  function scrubForMustNotSayScan(s) {
    return String(s)
      .replace(/לא\s+מאסטרי(?:\s+מלא)?/gu, " ")
      .replace(/לא\s+לפרש\s+כמאסטרי\s+מלא/gu, " ")
      .replace(/כמאסטרי\s+מלא/gu, " ")
      .replace(/פעולה\s+ביתית\s+חד-משמעית/gu, " ")
      .replace(/אין\s+כרגע\s+פעולה\s+ביתית\s+חד-משמעית/gu, " ");
  }

  if (!narrativeText.length) {
    record(ISSUE_CODES.ambiguous_evidence, "low", "Empty narrative text.", "no_copy", false);
    warnings.push("empty_narrative");
    return finalizeOutcome(issues, blockedReasons, warnings, {
      mustNotSayHits,
      unsupportedClaims,
      overconfidenceFindings,
      thinDataFindings,
      medicalLanguageFindings,
      recommendationFindings,
      infoFindings,
      cautionaryThinDataFindings,
    });
  }

  // --- mustNotSay (ASCII + configurable Hebrew phrases)
  const extraSay = Array.isArray(engineOutput.mustNotSay) ? engineOutput.mustNotSay.map(String) : [];
  const banned = [...DEFAULT_MUST_NOT_SAY, ...extraSay];
  const scanForBanned = scrubForMustNotSayScan(narrativeText);
  const lower = scanForBanned.toLowerCase();
  for (const phrase of banned) {
    const p = String(phrase).trim();
    if (!p) continue;
    const hit =
      /[\u0590-\u05FF]/.test(p) ? scanForBanned.includes(p) : lower.includes(p.toLowerCase());
    if (hit) {
      mustNotSayHits.push(p);
      record(ISSUE_CODES.must_not_say, "high", `Forbidden phrase for parent surface: "${p}"`, p, true);
    }
  }

  const med = firstMatch(narrativeText, MEDICAL_DIAGNOSTIC_RES);
  if (med) {
    medicalLanguageFindings.push(med.match);
    record(ISSUE_CODES.medical_language, "high", "Clinical or medical framing is not allowed in parent narrative.", med.match, true);
  }

  const perm = firstMatch(narrativeText, PERMANENT_ABILITY_RES);
  if (perm) {
    record(ISSUE_CODES.permanent_trait, "high", "Permanent or fixed ability wording is not allowed.", perm.match, true);
  }

  const thin = isThinEvidence(engineOutput);
  const overStrong = hasOverconfidence(narrativeText);
  const hedge = hasHedge(narrativeText);

  if (overStrong) overconfidenceFindings.push("matched_high_certainty_phrase");

  const barrier = hasDoNotConcludeBarrier(engineOutput);
  if (barrier && overStrong) {
    record(
      ISSUE_CODES.do_not_conclude_violation,
      "high",
      "Strong conclusion wording while engine marks do-not-conclude / barriers.",
      "do_not_conclude+overconfident",
      true
    );
  }

  if ((engineConfidenceLow(engineOutput) || conclusionWithheld(engineOutput)) && overStrong) {
    record(
      ISSUE_CODES.engine_confidence_contradiction,
      "high",
      "Certainty wording conflicts with low/withheld engine confidence.",
      String(engineOutput.engineConfidence || engineOutput.conclusionStrengthAllowed || ""),
      true
    );
  }

  if (thin && overStrong && !hedge) {
    thinDataFindings.push("thin_evidence_with_strong_certainty");
    record(
      ISSUE_CODES.thin_data_strong,
      "high",
      "Thin or insufficient evidence must not be stated as a reliable strong conclusion.",
      "thin+strong",
      true
    );
  } else if (thin && overStrong && hedge) {
    thinDataFindings.push("thin_evidence_with_mixed_strength_markers");
    record(
      ISSUE_CODES.thin_data_strong,
      "medium",
      "Strong certainty markers appear alongside thin-evidence context - review wording.",
      "thin+hedge+strong_markers",
      false
    );
    warnings.push("thin_data_with_mixed_strength_markers");
  }

  const tier = String(engineOutput.recommendationTier || "advance_ok").toLowerCase();
  const advanceHit = firstMatch(narrativeText, UNSUPPORTED_ADVANCE_RES);
  if ((tier === "maintain" || tier === "maintain_only") && advanceHit) {
    recommendationFindings.push(advanceHit.match);
    unsupportedClaims.push("escalation_language_not_supported_by_engine");
    record(
      ISSUE_CODES.recommendation_unsupported,
      "high",
      "Narrative escalates level/path though engine tier allows maintenance only.",
      advanceHit.match,
      true
    );
  }

  const prereq = String(engineOutput.prerequisiteGapLevel || "").toLowerCase();
  const gapStrong = firstMatch(narrativeText, OVERSTATED_GAP_RES);
  if (prereq === "suspected" && gapStrong) {
    record(ISSUE_CODES.prerequisite_overstated, "high", "Prerequisite gap overstated relative to evidence level.", gapStrong.match, true);
  }

  if (engineOutput.guessingLikelihoodHigh === true) {
    const mast = firstMatch(narrativeText, MASTERY_CLAIM_RES);
    if (mast) {
      record(ISSUE_CODES.guessing_as_mastery, "high", "Mastery-like wording conflicts with high guessing / pace signals.", mast.match, true);
    }
  }

  const blockedSoFar = blockedReasons.length > 0;

  if (thin && !overStrong && !blockedSoFar) {
    const safeThin = isSafeThinDataCautionHe(narrativeText);
    const unsafeMixed = isUnsafeThinDataMixedConclusionHe(narrativeText);

    if (unsafeMixed) {
      record(
        ISSUE_CODES.ambiguous_evidence,
        "low",
        "Thin evidence but wording suggests a firm conclusion or prescription without sufficient anchoring.",
        "thin_mixed_or_overstated_conclusion",
        false
      );
      warnings.push("thin_data_mixed_conclusion");
    } else if (safeThin || hedge) {
      if (safeThin) {
        infoFindings.push("cautionary_thin_data");
        cautionaryThinDataFindings.push("explicit_limited_evidence_framing");
      }
    } else {
      record(ISSUE_CODES.ambiguous_evidence, "low", "Evidence is thin; prefer explicit cautious framing.", "thin_without_clear_hedge", false);
      warnings.push("thin_data_prefers_observational_framing");
    }
  }

  void reportContext;
  void locale;

  return finalizeOutcome(issues, blockedReasons, warnings, {
    mustNotSayHits,
    unsupportedClaims,
    overconfidenceFindings,
    thinDataFindings,
    medicalLanguageFindings,
    recommendationFindings,
    infoFindings,
    cautionaryThinDataFindings,
  });
}

/** @param {Array<{ severity: string, blocking?: boolean }>} issues */
function maxSeverityFromIssues(issues) {
  let s = /** @type {"none"|"low"|"medium"|"high"} */ ("none");
  for (const i of issues) {
    if (i.severity === "high") s = "high";
    else if (i.severity === "medium" && s !== "high") s = "medium";
    else if (i.severity === "low" && s === "none") s = "low";
  }
  return s;
}

function finalizeOutcome(issues, blockedReasons, warnings, buckets) {
  const uniqueBlocked = [...new Set(blockedReasons)];
  const blocked = uniqueBlocked.length > 0;
  const hasWarnIssue = issues.some((i) => i.severity === "medium" || i.code === ISSUE_CODES.ambiguous_evidence);

  /** @type {"pass"|"warning"|"block"} */
  let status = "pass";
  if (blocked) status = "block";
  else if (hasWarnIssue || warnings.length > 0) status = "warning";

  const severity = maxSeverityFromIssues(issues);
  const ok = status !== "block";

  const infoFindings = Array.isArray(buckets.infoFindings) ? buckets.infoFindings : [];
  const cautionaryThinDataFindings = Array.isArray(buckets.cautionaryThinDataFindings)
    ? buckets.cautionaryThinDataFindings
    : [];
  const infoCount = infoFindings.length;

  return {
    ok,
    status,
    severity,
    issues,
    blockedReasons: uniqueBlocked,
    warnings,
    mustNotSayHits: buckets.mustNotSayHits,
    unsupportedClaims: buckets.unsupportedClaims,
    overconfidenceFindings: buckets.overconfidenceFindings,
    thinDataFindings: buckets.thinDataFindings,
    medicalLanguageFindings: buckets.medicalLanguageFindings,
    recommendationFindings: buckets.recommendationFindings,
    infoFindings,
    cautionaryThinDataFindings,
    infoCount,
    safeSummary: null,
  };
}
