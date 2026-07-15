/**
 * Parent Report Engine Decision Contract — propagates DE2/V3/professional decisions
 * to all parent surfaces. q/accuracy gate visibility only; content comes from engines.
 */
import { parentFacingPatternLabelHe } from "../parent-report-language/parent-facing-pattern-label-he.js";
import {
  buildEngineDiagnosticDecision,
  computeAccuracyBand,
  computeEngineConfidenceTier,
} from "../parent-report-engine-v1-signals.js";
import {
  normalizeParentVisibleMetrics,
  buildParentMetricsDataLineHe,
  formatQuestionsTextHe,
  formatWrongOfQuestionsTextHe,
  buildSpeedPressurePatternFindingHe,
} from "./normalize-parent-practice-metrics.js";
import { isUsableParentPatternLabel, sanitizeParentPatternLabel } from "./parent-pattern-label.js";
import { resolveEvidenceStrength } from "./resolve-evidence-strength.js";

/** @typedef {"de2"|"v3"|"professional"|"canonicalState"|"topic_aggregation"} EngineSource */

/**
 * @param {string|null|undefined} actionState
 * @param {string} engineDecision
 * @param {{ questions: number, accuracy: number, wrong: number }} metrics
 */
export function mapEngineRecommendedAction(actionState, engineDecision, metrics) {
  const q = Math.max(0, Number(metrics?.questions) || 0);
  const acc = Math.max(0, Math.min(100, Math.round(Number(metrics?.accuracy) || 0)));
  const action = String(actionState || "").trim().toLowerCase();

  if (
    engineDecision === "clear_topic_gap" ||
    engineDecision === "topic_needs_strengthening" ||
    action === "intervene" ||
    action === "remediate" ||
    action === "remediate_same_level"
  ) {
    return "remediate_same_level";
  }

  if (engineDecision === "partial_stable" && q >= 10 && acc < 72) {
    return "remediate_same_level";
  }

  if (q >= 5 && acc < 70 && metrics.wrong >= 2) {
    return "remediate_same_level";
  }

  if (action === "probe_only" || action === "maintain" || action === "withhold") {
    return q >= 5 && acc < 70 ? "remediate_same_level" : "maintain_and_strengthen";
  }

  if (engineDecision === "mastery_stable") return "maintain_and_strengthen";
  if (engineDecision === "early_direction_only" || engineDecision === "insufficient_data") {
    return "watch";
  }

  return "maintain_and_strengthen";
}

/**
 * @param {string|null|undefined} raw
 */
function cleanParentFindingPattern(raw) {
  let t = sanitizeParentPatternLabel(String(raw || ""));
  t = t.replace(/\(נקודת מיקוד:[^)]*\)/gi, "");
  t = t.replace(/נקודת המיקוד היא[^.]*\.?\s*/gi, "");
  t = t.replace(/מצביע על דפוס:\s*/gi, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/**
 * @param {object} p
 */
function buildParentSafeFindingFromEngine(p) {
  const name = String(p.topicName || "הנושא").trim() || "הנושא";
  const q = p.metrics.questions;
  const acc = p.metrics.accuracy;
  const w = p.metrics.wrong;
  const pattern = cleanParentFindingPattern(p.detectedPattern);
  const hasPattern = isUsableParentPatternLabel(p.detectedPattern) && !!pattern;
  const suffix = q > 0 ? ` מבוסס על ${formatQuestionsTextHe(q)} שנפתרו בנושא.` : "";
  const engineDecision = String(p.engineDecision || "");

  if (q <= 0) return "";

  if (q <= 2) {
    return q === 1
      ? `בנושא ${name} יש נתונים ראשוניים בלבד. ככל שיהיו עוד שאלות בנושא, נוכל להציג תמונה מדויקת יותר.`
      : `בנושא ${name} נפתרו ${formatQuestionsTextHe(q)}. עדיין מוקדם לזהות דפוס ברור בנושא.`;
  }

  if (hasPattern && !p.blockPatternClaim) {
    return `בנושא ${name} מופיע דפוס חוזר של טעויות (${pattern}). כדאי לחזק את הנושא.${suffix}`;
  }

  if (p.misconceptionLabel && isUsableParentPatternLabel(p.misconceptionLabel)) {
    const misc = cleanParentFindingPattern(p.misconceptionLabel);
    if (!misc) return "";
    return `בנושא ${name} זוהתה טעות חוזרת: ${misc}. כדאי לחזק את הנושא.${suffix}`;
  }

  if (engineDecision === "clear_topic_gap") {
    return `בנושא ${name} נראה קושי ברור - ${formatWrongOfQuestionsTextHe(w, q)} (${acc}% דיוק). כדאי לחזור ולחזק את ${name} לפני שממשיכים.${suffix}`;
  }

  if (engineDecision === "speed_pressure_pattern") {
    // Product-owner-approved wording — single source shared with
    // engine-decision-parent-copy-he.js (buildDiagnosticBodyByDecision). Does NOT
    // claim the problem IS speed, nor that a knowledge gap exists or is ruled out.
    return buildSpeedPressurePatternFindingHe({ topicName: name, wrong: w, questions: q, accuracy: acc });
  }

  if (engineDecision === "topic_needs_strengthening") {
    return `בנושא ${name} יש נקודת חיזוק שכדאי לעבוד עליה (${formatQuestionsTextHe(q)}, ${acc}% דיוק). כדאי חיזוק ממוקד.${suffix}`;
  }

  if (engineDecision === "partial_stable") {
    return `בנושא ${name} יש הבנה חלקית (${acc}% דיוק), אבל עדיין צריך חיזוק כדי להגיע ליציבות.${suffix}`;
  }

  if (engineDecision === "mastery_stable") {
    return `בנושא ${name} נראית הצלחה טובה ויציבה (${formatQuestionsTextHe(q)}, ${acc}% דיוק).${suffix}`;
  }

  if (engineDecision === "early_direction_only" || engineDecision === "insufficient_data") {
    if (q <= 4) {
      return `בנושא ${name} יש ${formatQuestionsTextHe(q)}. עדיין מוקדם להסיק מסקנה ברורה.`;
    }
    return "";
  }

  if (q >= 5 && w >= 2 && acc < 70) {
    const volume = acc <= 40 || w / Math.max(q, 1) >= 0.5 ? "הרבה טעויות" : "כמה טעויות";
    return `בנושא ${name} היו ${volume} בשאלות שנפתרו. כדאי לחזור ולחזק את הנושא.${suffix}`;
  }

  return "";
}

/**
 * @param {number} q
 * @param {string} evidenceStrength
 * @param {string} engineDecision
 */
export function resolveEngineDecisionUncertaintyText(q, evidenceStrength, engineDecision) {
  const questions = Math.max(0, Math.floor(Number(q) || 0));
  const strongEvidence =
    evidenceStrength === "strong" || questions >= 50 || engineDecision === "clear_topic_gap";
  if (strongEvidence) return null;
  if (questions >= 20) return null;
  if (questions <= 4) {
    return "עדיין מוקדם לקבוע כיוון סופי - נמשיך לאסוף עוד נתוני תרגול קצרים.";
  }
  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} sp
 */
export function findStrongestEngineDecisionInSubject(sp) {
  /** @type {Record<string, unknown>[]} */
  const candidates = [];
  if (Array.isArray(sp?.topicRecommendations)) candidates.push(...sp.topicRecommendations);
  if (Array.isArray(sp?.topWeaknesses)) candidates.push(...sp.topWeaknesses);

  const rank = {
    clear_topic_gap: 4,
    topic_needs_strengthening: 3,
    partial_stable: 2,
    early_direction_only: 1,
  };

  /** @type {{ contract: Record<string, unknown>, row: Record<string, unknown>, rank: number }|null} */
  let best = null;
  for (const row of candidates) {
    const contract =
      row?.engineDecisionContract ||
      row?.learningPatternDecision?.engineDecisionContract ||
      null;
    if (!contract || typeof contract !== "object") continue;
    const finding = String(contract.parentSafeFinding || "").trim();
    if (!finding) continue;
    const r = rank[String(contract.engineDecision || "")] || 0;
    const q = Number(contract.questions) || 0;
    if (
      !best ||
      r > best.rank ||
      (r === best.rank && q > Number(best.contract.questions || 0))
    ) {
      best = { contract, row, rank: r };
    }
  }
  return best;
}

/**
 * @param {string} subjectLabelHe
 * @param {{ contract: Record<string, unknown> }|null} strongest
 */
export function buildSubjectEngineSummaryOpeningHe(subjectLabelHe, strongest) {
  if (!strongest?.contract) return null;
  const finding = String(strongest.contract.parentSafeFinding || "").trim();
  if (!finding) return null;
  const lab = String(subjectLabelHe || "המקצוע").trim();
  return `ב${lab}: ${finding}`;
}

/**
 * Inject engine pattern into repeatedMistakePatterns for LPD downstream.
 * @param {{ label?: string, key?: string, count?: number, ratio?: number }[]} existing
 * @param {string} patternLabel
 * @param {number} wrongCount
 */
export function injectEnginePatternIntoRepeatedMistakes(existing, patternLabel, wrongCount) {
  const label = sanitizeParentPatternLabel(patternLabel);
  if (!label) return existing;
  const list = Array.isArray(existing) ? [...existing] : [];
  const key = `engine:${label}`;
  if (list.some((p) => sanitizeParentPatternLabel(p?.label) === label)) return list;
  list.unshift({
    key,
    label,
    count: Math.max(1, Math.floor(Number(wrongCount) || 0)),
    ratio: 1,
  });
  return list;
}

/**
 * @param {object} [input]
 */
export function buildParentReportEngineDecisionContract(input = {}) {
  /** @type {string[]} */
  const traceReason = ["raw:received"];

  const subjectId = String(input.subjectId || "").trim();
  const topicRowKey = String(input.topicRowKey || input.topicKey || "").trim();
  const topicName =
    String(input.topicName || input.displayName || input.topicLabel || "").trim() || "הנושא";
  const unit = input.unit && typeof input.unit === "object" ? input.unit : null;
  const v3Enrichment =
    input.v3Enrichment && typeof input.v3Enrichment === "object" ? input.v3Enrichment : null;
  const professionalSlice =
    input.professionalSlice && typeof input.professionalSlice === "object"
      ? input.professionalSlice
      : null;
  const row = input.row && typeof input.row === "object" ? input.row : {};

  const metrics = normalizeParentVisibleMetrics(row, unit);
  traceReason.push(`metrics:q=${metrics.questions},c=${metrics.correct},w=${metrics.wrong},acc=${metrics.accuracy}`);

  if (metrics.questions <= 0) {
    return {
      subject: subjectId,
      topic: topicRowKey,
      topicName,
      questions: 0,
      correct: 0,
      wrong: 0,
      accuracy: 0,
      metrics,
      engineDecision: "none",
      sourceEngine: "topic_aggregation",
      detectedPattern: null,
      misconceptionLabel: null,
      affectedSubskill: null,
      severity: "none",
      evidenceStrength: "none",
      recommendedAction: "none",
      parentSafeFinding: "",
      uncertaintyText: null,
      blockPatternClaim: true,
      traceReason,
      engineDiagnosticDecision: null,
    };
  }

  const de2PatternHe = unit ? parentFacingPatternLabelHe(unit) : "";
  const de2SubskillHe = sanitizeParentPatternLabel(
    String(unit?.taxonomy?.subskillHe || "").trim(),
  );
  const de2DiagnosisLine =
    unit?.diagnosis?.allowed === true ? String(unit?.diagnosis?.lineHe || "").trim() : "";
  const canonicalState = unit?.canonicalState || null;
  const actionState = String(canonicalState?.actionState || unit?.actionState || "").trim();

  if (unit) traceReason.push("de2:unit_present");
  if (de2PatternHe) traceReason.push(`de2:pattern=${de2PatternHe}`);
  if (v3Enrichment?.v3Rollup) traceReason.push("v3:enrichment_present");
  if (professionalSlice) traceReason.push("professional:slice_present");

  const v3PatternHe = sanitizeParentPatternLabel(
    String(v3Enrichment?.v3Rollup?.dominantErrorType || "").trim(),
  );

  /** @type {EngineSource} */
  let sourceEngine = "topic_aggregation";
  let detectedPattern = null;
  if (de2PatternHe && isUsableParentPatternLabel(de2PatternHe)) {
    detectedPattern = de2PatternHe;
    sourceEngine = "de2";
  } else if (v3PatternHe) {
    detectedPattern = v3PatternHe;
    sourceEngine = "v3";
  }

  const wrongRatio = metrics.questions > 0 ? metrics.wrong / metrics.questions : 0;
  const tier = computeEngineConfidenceTier(metrics.questions);
  const accuracyBand = computeAccuracyBand(metrics.accuracy, metrics.questions);

  const taxonomyMatch =
    unit?.taxonomyMatch && typeof unit.taxonomyMatch === "object" ? unit.taxonomyMatch : null;

  const engineDiagnosticDecision = buildEngineDiagnosticDecision({
    q: metrics.questions,
    acc: metrics.accuracy,
    wrongRatio,
    engineConfidenceTier: tier,
    accuracyBand,
    taxonomyMatch,
    rootCause: String(unit?.rootCause?.rootCause || ""),
    behaviorType: String(unit?.behavior?.type || ""),
    dominantMistakePattern: detectedPattern || "",
    riskFlags: unit?.riskFlags || {},
    modeKey: String(row?.modeKey || unit?.modeKey || ""),
  });

  const engineDecision = String(engineDiagnosticDecision.engineDecision || "insufficient_data");
  traceReason.push(`engineDecision:${engineDecision}`);

  const evidenceStrength = resolveEvidenceStrength(metrics.questions);
  const severity =
    engineDecision === "clear_topic_gap"
      ? "high"
      : engineDecision === "topic_needs_strengthening"
        ? "moderate"
        : engineDecision === "partial_stable"
          ? "low"
          : "none";

  const blockPatternClaim =
    canonicalState?.actionState?.withholdParentClaim === true ||
    engineDiagnosticDecision.safeSubskillToShow === false &&
    !detectedPattern;

  const recommendedAction = mapEngineRecommendedAction(actionState, engineDecision, metrics);
  traceReason.push(`recommendedAction:${recommendedAction}`);

  const parentSafeFinding = buildParentSafeFindingFromEngine({
    topicName,
    metrics,
    detectedPattern,
    misconceptionLabel: de2DiagnosisLine || null,
    engineDecision,
    blockPatternClaim,
  });
  traceReason.push(parentSafeFinding ? "parentSafeFinding:engine" : "parentSafeFinding:empty");

  const uncertaintyText = resolveEngineDecisionUncertaintyText(
    metrics.questions,
    evidenceStrength,
    engineDecision,
  );

  return {
    subject: subjectId,
    topic: topicRowKey,
    topicName,
    questions: metrics.questions,
    correct: metrics.correct,
    wrong: metrics.wrong,
    accuracy: metrics.accuracy,
    metrics,
    engineDecision,
    sourceEngine,
    detectedPattern,
    misconceptionLabel: de2DiagnosisLine || detectedPattern || null,
    affectedSubskill: de2SubskillHe || engineDiagnosticDecision.subskillCandidate?.labelHe || null,
    severity,
    evidenceStrength,
    recommendedAction,
    parentSafeFinding,
    uncertaintyText,
    blockPatternClaim,
    actionState: actionState || null,
    traceReason,
    engineDiagnosticDecision,
    dataText: buildParentMetricsDataLineHe(metrics, topicName),
  };
}
