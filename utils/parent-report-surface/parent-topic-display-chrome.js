/**
 * Parent-report display chrome — maps canonical engineDecision (and pattern layer)
 * to badge / card / accuracy classes. Display-only; does not change DE2 / LPD / EDC / ADC.
 */

/** @typedef {"advance"|"maintain"|"remediate"|"drop"|"neutral"} ParentTopicVisualVariant */

/** @typedef {"insufficient_data"|"early_direction_only"|"mastery_stable"|"partial_stable"|"topic_needs_strengthening"|"clear_topic_gap"|"same_session_observed"|"secondary_observed"|"primary_dominant"|"unknown"} ParentTopicDisplayDecision */

export const PARENT_TOPIC_INSUFFICIENT_BADGE_HE =
  "מעט שאלות - עדיין אין מספיק נתונים";

export const PARENT_TOPIC_EARLY_OK_BADGE_HE = "מעט שאלות - כיוון ראשוני";
export const PARENT_TOPIC_EARLY_SOME_ERRORS_BADGE_HE = "מעט שאלות - נראו כמה טעויות";
export const PARENT_TOPIC_EARLY_MANY_ERRORS_BADGE_HE = "מעט שאלות - נראו הרבה טעויות";

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {string|null}
 */
export function resolveCanonicalEngineDecisionFromRow(row) {
  if (!row || typeof row !== "object") return null;
  const contract =
    row.engineDecisionContract ||
    row.learningPatternDecision?.engineDecisionContract ||
    null;
  const fromContract = String(contract?.engineDecision || "").trim();
  if (fromContract && fromContract !== "none") return fromContract;

  const fromSig = String(
    row.topicEngineRowSignals?.engineDiagnosticDecision?.engineDecision || "",
  ).trim();
  if (fromSig && fromSig !== "none") return fromSig;

  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {string|null}
 */
export function resolvePatternLayerFromRow(row) {
  if (!row || typeof row !== "object") return null;
  const contract =
    row.engineDecisionContract ||
    row.learningPatternDecision?.engineDecisionContract ||
    null;
  const layer = String(contract?.patternLayer || row.patternLayer || "").trim();
  return layer || null;
}

/**
 * Canonical display key: prefer engineDecision; fall back to pattern layer only when
 * the engine has no stronger topic decision yet.
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {ParentTopicDisplayDecision}
 */
export function resolveParentTopicDisplayDecision(row) {
  const engineDecision = resolveCanonicalEngineDecisionFromRow(row);
  if (
    engineDecision === "clear_topic_gap" ||
    engineDecision === "topic_needs_strengthening" ||
    engineDecision === "mastery_stable" ||
    engineDecision === "partial_stable" ||
    engineDecision === "early_direction_only" ||
    engineDecision === "insufficient_data" ||
    engineDecision === "speed_pressure_pattern"
  ) {
    return /** @type {ParentTopicDisplayDecision} */ (engineDecision);
  }

  const layer = resolvePatternLayerFromRow(row);
  if (
    layer === "primary_dominant" ||
    layer === "secondary_observed" ||
    layer === "same_session_observed"
  ) {
    return /** @type {ParentTopicDisplayDecision} */ (layer);
  }

  if (engineDecision) {
    return /** @type {ParentTopicDisplayDecision} */ (engineDecision);
  }

  const pad = String(row?.parentActionDecision?.state || "").trim();
  if (pad === "insufficient_information") return "insufficient_data";
  if (pad === "strengthening_needed") return "topic_needs_strengthening";
  if (pad === "verification_needed") return "early_direction_only";
  if (pad === "progress_or_mastery") return "partial_stable";

  const lpd = row?.learningPatternDecision;
  if (
    lpd &&
    (lpd.topicStatus === "initial_data" || lpd.findingType === "initial_topic_data")
  ) {
    return "early_direction_only";
  }

  return "unknown";
}

/**
 * @param {ParentTopicDisplayDecision|string} decision
 */
export function parentTopicDisplayChromeFromDecision(decision) {
  const d = String(decision || "unknown");

  if (d === "insufficient_data" || d === "early_direction_only") {
    return {
      displayDecision: d,
      visualVariant: /** @type {ParentTopicVisualVariant} */ ("neutral"),
      badgeHe: PARENT_TOPIC_INSUFFICIENT_BADGE_HE,
      statusEmoji: "🔎",
      accuracyClass: "text-white/70",
      badgeClassName: "text-slate-300 text-xs",
      cardClassName: "bg-slate-500/10 border border-slate-400/35",
      excellent: false,
      needsPractice: false,
      insufficientData: true,
      weakTopic: false,
    };
  }

  if (d === "mastery_stable") {
    return {
      displayDecision: d,
      visualVariant: /** @type {ParentTopicVisualVariant} */ ("advance"),
      badgeHe: "מצוין",
      statusEmoji: "✅",
      accuracyClass: "text-emerald-400",
      badgeClassName: "text-emerald-400 text-xs",
      cardClassName: "bg-emerald-500/15 border border-emerald-400/45",
      excellent: true,
      needsPractice: false,
      insufficientData: false,
      weakTopic: false,
    };
  }

  if (d === "partial_stable") {
    return {
      displayDecision: d,
      visualVariant: /** @type {ParentTopicVisualVariant} */ ("maintain"),
      badgeHe: "במעקב",
      statusEmoji: "👍",
      accuracyClass: "text-sky-300",
      badgeClassName: "text-sky-300 text-xs",
      cardClassName: "bg-sky-500/10 border border-sky-400/35",
      excellent: false,
      needsPractice: false,
      insufficientData: false,
      weakTopic: false,
    };
  }

  if (d === "topic_needs_strengthening" || d === "speed_pressure_pattern") {
    return {
      displayDecision: d,
      visualVariant: /** @type {ParentTopicVisualVariant} */ ("remediate"),
      badgeHe: "כדאי לחזק",
      statusEmoji: "⚠️",
      accuracyClass: "text-amber-400",
      badgeClassName: "text-amber-300 text-xs",
      cardClassName: "bg-amber-500/12 border border-amber-400/40",
      excellent: false,
      needsPractice: true,
      insufficientData: false,
      weakTopic: false,
    };
  }

  if (d === "clear_topic_gap") {
    return {
      displayDecision: d,
      visualVariant: /** @type {ParentTopicVisualVariant} */ ("remediate"),
      badgeHe: "כדאי לתרגל עוד",
      statusEmoji: "⚠️",
      accuracyClass: "text-amber-400",
      badgeClassName: "text-amber-200 text-xs",
      cardClassName: "bg-yellow-500/15 border border-yellow-400/45",
      excellent: false,
      needsPractice: true,
      insufficientData: false,
      weakTopic: true,
    };
  }

  if (
    d === "same_session_observed" ||
    d === "secondary_observed" ||
    d === "primary_dominant"
  ) {
    return {
      displayDecision: d,
      visualVariant: /** @type {ParentTopicVisualVariant} */ ("neutral"),
      badgeHe: "נראה דפוס - עדיין בבדיקה",
      statusEmoji: "🔎",
      accuracyClass: "text-white/75",
      badgeClassName: "text-slate-300 text-xs",
      cardClassName: "bg-slate-500/10 border border-slate-400/35",
      excellent: false,
      needsPractice: false,
      insufficientData: false,
      weakTopic: false,
    };
  }

  return {
    displayDecision: "unknown",
    visualVariant: /** @type {ParentTopicVisualVariant} */ ("neutral"),
    badgeHe: "במעקב",
    statusEmoji: "🔎",
    accuracyClass: "text-white/70",
    badgeClassName: "text-white/70 text-xs",
    cardClassName: "bg-black/40 border border-white/20",
    excellent: false,
    needsPractice: false,
    insufficientData: false,
    weakTopic: false,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 */
export function parentTopicDisplayChromeFromRow(row) {
  const displayDecision = resolveParentTopicDisplayDecision(row);
  let chrome = parentTopicDisplayChromeFromDecision(displayDecision);

  // 1–4 questions: never show mastery / "טוב" / "מצוין"; badge by accuracy.
  const q = Math.max(
    0,
    Number(
      row?.parentVisibleMetrics?.questions ??
        row?.questions ??
        row?.learningPatternDecision?.practicedQuestions ??
        0,
    ) || 0,
  );
  const acc = Math.round(
    Number(
      row?.parentVisibleMetrics?.accuracy ??
        row?.accuracy ??
        row?.learningPatternDecision?.accuracy ??
        0,
    ) || 0,
  );

  if (q > 0 && q < 5) {
    let badgeHe = PARENT_TOPIC_EARLY_OK_BADGE_HE;
    if (acc < 50) badgeHe = PARENT_TOPIC_EARLY_MANY_ERRORS_BADGE_HE;
    else if (acc < 70) badgeHe = PARENT_TOPIC_EARLY_SOME_ERRORS_BADGE_HE;
    chrome = {
      ...chrome,
      displayDecision:
        displayDecision === "insufficient_data" || displayDecision === "early_direction_only"
          ? displayDecision
          : "insufficient_data",
      visualVariant: /** @type {ParentTopicVisualVariant} */ ("neutral"),
      badgeHe,
      excellent: false,
      needsPractice: acc < 70,
      insufficientData: true,
      weakTopic: acc < 50,
      cardClassName:
        acc < 50
          ? "bg-yellow-500/10 border border-yellow-400/35"
          : acc < 70
            ? "bg-amber-500/10 border border-amber-400/35"
            : "bg-slate-500/10 border border-slate-400/35",
    };
  } else if (q > 0 && q < 10 && (chrome.excellent || displayDecision === "mastery_stable")) {
    // Guard: never "מצוין"/mastery chrome below 10 questions
    chrome = {
      ...parentTopicDisplayChromeFromDecision("early_direction_only"),
      excellent: false,
    };
  }

  return {
    ...chrome,
    engineDecision: resolveCanonicalEngineDecisionFromRow(row),
    patternLayer: resolvePatternLayerFromRow(row),
  };
}

/**
 * Map chrome visualVariant (+ legacy step strings) to detailed-report CSS suffix.
 * @param {string|Record<string, unknown>|null|undefined} stepOrRow
 * @returns {ParentTopicVisualVariant}
 */
export function topicNextStepVisualVariantFromRowOrStep(stepOrRow) {
  if (stepOrRow && typeof stepOrRow === "object") {
    return parentTopicDisplayChromeFromRow(stepOrRow).visualVariant;
  }
  const step = String(stepOrRow || "");
  switch (step) {
    case "advance_level":
    case "advance_grade_topic_only":
      return "advance";
    case "insufficient_information":
    case "verification_needed":
      return "neutral";
    case "progress_or_mastery":
    case "maintain_and_strengthen":
      return "maintain";
    case "strengthening_needed":
    case "remediate_same_level":
      return "remediate";
    case "drop_one_level_topic_only":
    case "drop_one_grade_topic_only":
      return "drop";
    default:
      return "neutral";
  }
}
