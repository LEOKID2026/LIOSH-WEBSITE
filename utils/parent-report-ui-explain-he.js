/**
 * תוויות עברית לתצוגת הורים — דוח מקוצר/מקיף (שלב 5 UI בלבד).
 * ממפה מזהים טכניים לטקסט קצר; לא ממציא תוכן פדגוגי.
 */

import { normalizeParentFacingHe } from "./parent-report-language/parent-facing-normalize-he.js";
import { SUBJECT_V2_RECALIBRATION_NEED_NO_HE } from "./parent-report-language/v2-parent-copy.js";
import { narrativeSectionTextHe } from "./contracts/narrative-contract-v1.js";
import { stripKnownParentReportLeakageHe } from "./parent-data-presence.js";
import { buildEngineDecisionParentTopicCopyHe, buildExplainIdentifiedLineHe, PARENT_TECHNICAL_ID_STRIP_RE } from "./parent-report-language/engine-decision-parent-copy-he.js";
import {
  DEPENDENCY_STATE_PARENT_HE,
  MISTAKE_PATTERN_PARENT_HE,
  PARENT_DIAGNOSTIC_TYPE_LABEL_HE,
  ROOT_CAUSE_PARENT_HE,
  explainActionHe,
  explainDataHe,
  explainIdentifiedHe,
  explainMeaningHe,
  explainPatternHe,
  foundationTextFromEngineHe,
  meaningExplainSentenceHe,
  parentDiagnosticTypeLabelHe,
  parentStepLabelHe,
  patternTextFromEngineHe,
} from "./parent-report-language/parent-report-hebrew-copy-spec.js";

const BEHAVIOR_OR_DIAGNOSTIC_HE = { ...PARENT_DIAGNOSTIC_TYPE_LABEL_HE };

const CONF_BADGE_HE = {
  high: "יש מספיק שאלות בתקופה",
  medium: "כמות בינונית של שאלות בתקופה",
  low: "עדיין מעט נתונים - עוד קצת תרגול יעזור לנו להבין טוב יותר",
};

const SUFF_BADGE_HE = {
  high: "כמות התרגול: טובה",
  medium: "כמות התרגול: בינונית",
  low: "כמות התרגול: נמוכה",
};

const RISK_FLAG_HE = {
  falsePromotionRisk: "חשש מעליית רמה מוקדמת מדי",
  falseRemediationRisk: "חשש מטיפול יתר",
  speedOnlyRisk: "נטייה למהירות",
  hintDependenceRisk: "הילד עדיין נעזר ברמזים",
  insufficientEvidenceRisk: "מידע חלקי בלבד",
  recentTransitionRisk: "שינוי קטן לאחרונה",
};

const TREND_DIR_HE = {
  up: "בשיפור",
  down: "בירידה",
  flat: "ללא שינוי",
  unknown: "לא ברורה מספיק",
};

/**
 * @param {string} text
 * @param {number} max
 */
export function truncateHe(text, max = 140) {
  const s = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * מחליף מזהים טכניים בטקסט למשל מהמנוע (למשל פרופיל התנהגות).
 * @param {string} text
 */
export function sanitizeEngineSnippetHe(text) {
  let s = String(text || "");
  for (const [k, v] of Object.entries(BEHAVIOR_OR_DIAGNOSTIC_HE)) {
    s = s.replace(new RegExp(`\\b${k}\\b`, "g"), v);
  }
  s = s.replace(/\b(falsePromotionRisk|falseRemediationRisk|speedOnlyRisk|hintDependenceRisk|insufficientEvidenceRisk|recentTransitionRisk)\b/g, "");
  s = s.replace(PARENT_TECHNICAL_ID_STRIP_RE, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return stripKnownParentReportLeakageHe(s);
}

/** הסרת סוגריים טכניים מטקסט גלוי באזור אבחון/המלצות (דוח מקוצר). */
export function stripTechnicalParensForParentDiagnosticsHe(text) {
  return String(text || "")
    .replace(/\(pf:[^)]*\)/gi, "")
    .replace(/\(k:[^)]*\)/gi, "")
    .replace(/\(to:[^)]*\)/gi, "")
    .replace(/\(st:[^)]*\)/gi, "")
    .replace(/\(ct:[^)]*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * PR1 — טקסט גלוי בדוח מקוצר (אבחון הדפסה).
 * @param {unknown} s
 */
export function shortReportDiagnosticsParentVisibleHe(s) {
  let t = stripTechnicalParensForParentDiagnosticsHe(String(s ?? ""));
  t = sanitizeEngineSnippetHe(t);
  t = t.replace(/\u0001/g, " ");
  t = t.replace(/\bdefault_[a-z0-9_]+\b/gi, "");
  t = t.replace(
    /\b(advance_level|advance_grade_topic_only|maintain_and_strengthen|remediate_same_level|drop_one_level_topic_only|drop_one_grade_topic_only)\b/g,
    ""
  );
  t = t.replace(/\b(no_memory|light_memory|not_enough_evidence)\b/gi, "");
  t = t.replace(/\b[a-z][a-z0-9_]{10,}\b/g, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return normalizeParentFacingHe(stripKnownParentReportLeakageHe(t));
}

export function diagnosticTypeLabelHe(id) {
  return parentDiagnosticTypeLabelHe(String(id || "").trim());
}

export function behaviorDominantLabelHe(id) {
  return diagnosticTypeLabelHe(id);
}

export function confidenceBadgeLabelHe(badge) {
  const b = String(badge || "").toLowerCase();
  return CONF_BADGE_HE[b] || CONF_BADGE_HE.medium;
}

export function sufficiencyBadgeLabelHe(badge) {
  const b = String(badge || "").toLowerCase();
  return SUFF_BADGE_HE[b] || SUFF_BADGE_HE.medium;
}

/**
 * @param {Record<string, boolean>|null|undefined} riskFlags
 * @param {number} maxLabels
 */
export function activeRiskFlagLabelsHe(riskFlags, maxLabels = 4) {
  if (!riskFlags || typeof riskFlags !== "object") return [];
  const out = [];
  for (const [key, val] of Object.entries(riskFlags)) {
    if (!val) continue;
    const lab = RISK_FLAG_HE[key];
    if (lab) out.push(lab);
    if (out.length >= maxLabels) break;
  }
  return out;
}

const TREND_ACCURACY_FULL_HE = Object.freeze({
  up: "נראית מגמת שיפור בתקופה האחרונה.",
  down: "בתקופה האחרונה נראית ירידה בביצועים, ולכן כדאי לחזור לתרגול קצר וממוקד.",
  flat: "התוצאות לא אחידות כרגע - יש תשובות טובות לצד טעויות, ולכן כדאי להמשיך לעקוב אחרי הנושא.",
  unknown: "עדיין אין מספיק תרגול כדי לקבוע מגמה ברורה.",
});

/**
 * שורת מגמה קצרה — עדיפות אל summaryHe מהמנוע.
 * @param {Record<string, unknown>|null|undefined} trend
 */
export function trendCompactLineHe(trend) {
  const t = trend && typeof trend === "object" ? trend : null;
  if (!t) return "";
  const sumRaw = String(t.summaryHe || "").trim();
  if (sumRaw) {
    let s = sanitizeEngineSnippetHe(sumRaw);
    s = s.replace(/\bdefault_[a-z0-9_]+\b/gi, "");
    s = s.replace(/\u0001/g, " ");
    /* block English trend words that must not appear to parent */
    s = s.replace(/\b(improving|declining|unstable|trend|profile)\b/gi, "");
    s = s.replace(/\bpast\/present\b/gi, "עבר והווה");
    s = s.replace(/\s{2,}/g, " ").trim();
    return truncateHe(normalizeParentFacingHe(s), 100);
  }
  const ad = String(t.accuracyDirection ?? "unknown").trim().toLowerCase();
  return TREND_ACCURACY_FULL_HE[ad] || TREND_ACCURACY_FULL_HE.unknown;
}

/**
 * @param {Array<{ detailHe?: string, phase?: string }>} trace
 * @param {number} maxItems
 */
export function formatDecisionTraceBulletsHe(trace, maxItems = 4) {
  if (!Array.isArray(trace) || !trace.length) return [];
  const withText = trace
    .map((e) => String(e?.detailHe || "").trim())
    .filter(Boolean);
  if (withText.length) return withText.slice(-maxItems);
  return trace
    .slice(-maxItems)
    .map((e) => {
      const ph = String(e?.phase || "").trim();
      return ph ? `איפה בתהליך: ${ph}` : "";
    })
    .filter(Boolean);
}

/**
 * @param {Record<string, boolean>|null|undefined} majorRiskFlagsAcrossRows
 * @param {number} maxLabels
 */
export function subjectMajorRiskLabelsHe(majorRiskFlagsAcrossRows, maxLabels = 5) {
  return activeRiskFlagLabelsHe(majorRiskFlagsAcrossRows, maxLabels);
}

/** מקור הקושי Phase 7 — parent_report_hebrew_copy_spec.md §1.1 meaningSentence */
export const ROOT_CAUSE_LABEL_HE = {
  ...ROOT_CAUSE_PARENT_HE,
  insufficient_evidence: ROOT_CAUSE_PARENT_HE.insufficient_evidence,
};

/** סוג התערבות מומלץ Phase 7 */
export const INTERVENTION_TYPE_LABEL_HE = {
  stabilize_accuracy: "לחזק דיוק לפני שמשנים רמה",
  reduce_time_pressure: "להוריד קצת את לחץ הזמן ולשמור על דיוק",
  guided_to_independent_transition: "לעבור לאט מהליווי לעצמאות",
  clarify_instruction_pattern: "להסביר את המשימה ולפרק לצעדים קטנים",
  target_core_skill_gap: "חיזוק ממוקד איפה שחסר",
  monitor_before_escalation: "עוד קצת תרגול מבוקר לפני שמחמירים",
};

/** Phase 9 — דפוס טעות דומיננטי (מזהה → עברית להורה) — parent_report_hebrew_copy_spec.md §3 */
export const MISTAKE_PATTERN_LABEL_HE = { ...MISTAKE_PATTERN_PARENT_HE };

/** Phase 9 — שלב למידה לאורך זמן */
export const LEARNING_STAGE_LABEL_HE = {
  early_acquisition: "עדיין לומד ומתנסה - הנושא חדש יחסית",
  partial_stabilization: "מתחיל להתייצב, עדיין לא במלואו",
  stable_control: "פתרון טוב שנשמר לאורך זמן",
  fragile_retention: "החומר נשמר בקושי",
  regression_signal: "נראית ירידה לאחרונה - שווה לשים לב בשבוע הקרוב",
  transfer_emerging: "מתחילה התאמה גם מחוץ לתרגול המדויק",
  insufficient_longitudinal_evidence: "עדיין חסר מידע לאורך זמן",
};

const PHASE8_DURATION_BAND_HE = {
  very_short: "מפגשים קצרים מאוד",
  short: "מפגשים קצרים",
  moderate: "מפגשים בינוניים",
};

const PHASE8_INTENSITY_HE = {
  light: "קל",
  focused: "ממוקד",
  targeted: "מדויק",
};

const PHASE8_FORMAT_HE = {
  guided_practice: "תרגול מונחה",
  independent_practice: "תרגול עצמאי",
  mixed: "מונחה ועצמאי",
  observation_block: "צפייה ומדידה",
};

const PHASE8_PARENT_EFFORT_HE = {
  low: "מעורבות הורית קלה",
  medium: "מעורבות הורית בינונית",
  high: "מעורבות הורית גבוהה",
};

const PHASE8_PRACTICE_LOAD_HE = {
  minimal: "תרגול מינימלי",
  light: "תרגול קל",
  moderate: "תרגול מתון",
};

/**
 * תגיות קצרות לשורת נושא / המלצה — Phase 8 (ללא טקסט ארוך).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function phase8TopicMetaChipsHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  /** @type {string[]} */
  const chips = [];
  const dur = PHASE8_DURATION_BAND_HE[String(src.interventionDurationBand || "")];
  if (dur) chips.push(dur);
  const fmt = PHASE8_FORMAT_HE[String(src.interventionFormat || "")];
  if (fmt) chips.push(fmt);
  const inten = PHASE8_INTENSITY_HE[String(src.interventionIntensity || "")];
  if (inten && chips.length < 3) chips.push(inten);
  const load = PHASE8_PRACTICE_LOAD_HE[String(src.recommendedPracticeLoad || "")];
  if (load && chips.length < 3) chips.push(load);
  const eff = PHASE8_PARENT_EFFORT_HE[String(src.interventionParentEffort || "")];
  if (eff && chips.length < 3) chips.push(eff);
  return chips.slice(0, 3);
}

/**
 * שורת כיול תרגול קומפקטית לבית.
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function phase8PracticeCalibrationLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const n = Number(src.recommendedSessionCount);
  const countOk = Number.isFinite(n) && n > 0;
  const len =
    src.recommendedSessionLengthBand === "very_short"
      ? "5–8 דק׳"
      : src.recommendedSessionLengthBand === "moderate"
        ? "עד ~15 דק׳"
        : "8–12 דק׳";
  if (!countOk) return "";
  return `${n} פעמים בשבוע, כ ${len} בכל פעם.`;
}

/**
 * שורה קצרה לדפוס טעות (Phase 9).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function mistakePatternLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const fromSpec = patternTextFromEngineHe(
    String(src.dominantMistakePattern || ""),
    src.dominantMistakePatternLabelHe,
  );
  if (fromSpec) return truncateHe(fromSpec, 140);
  return "";
}

const VAGUE_FOUNDATION_PHRASE =
  /חלקים פשוטים יותר|יסוד שעליו הוא נשען|לא מרחיבים|קושי אולי מתחיל בחלקים/i;

/**
 * דפוס טעות להורה — רק כשיש מיפוי; אחרת ניסוח כנה.
 * @param {Record<string, unknown>|null|undefined} sig
 */
export function parentFacingPatternLineHe(sig) {
  if (!sig || typeof sig !== "object") return "";
  const patternId = String(sig.dominantMistakePattern || "").trim();
  const fromSpec = patternTextFromEngineHe(patternId, sig.dominantMistakePatternLabelHe);
  return fromSpec ? fromSpec.replace(/\s+/g, " ").trim() : "";
}

/**
 * בסיס/prerequisite להורה — mapping אמיתי או כנות.
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function parentFacingFoundationLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  if (!sig) return "";
  const dep = String(sig.dependencyState || "");
  const blocker = String(sig.likelyFoundationalBlocker || "unknown");
  if (blocker === "accuracy_foundation_gap") {
    return DEPENDENCY_STATE_PARENT_HE.accuracy_foundation_gap || "";
  }
  return foundationTextFromEngineHe(dep);
}

/**
 * @param {Record<string, unknown>|null|undefined} sig
 */
function parentFacingActionLineHe(sig) {
  if (!sig || typeof sig !== "object") return "";
  return (
    String(sig.doNowHe || "").trim() ||
    String(sig.interventionPlanHe || "").trim() ||
    String(sig.recommendedParentActionHe || "").trim()
  );
}

/**
 * @param {Record<string, unknown>|null|undefined} sig
 * @param {Record<string, unknown>|null|undefined} row
 */
function parentFacingMeaningLineHe(sig, row) {
  if (!sig || typeof sig !== "object") return "";
  const meaning = meaningExplainSentenceHe(
    String(sig.rootCause || ""),
    String(sig.diagnosticType || ""),
  );
  if (meaning) return meaning;
  const step = parentStepLabelHe(
    String(sig.recommendedNextStep || ""),
    String(sig.recommendedStepLabelHe || ""),
  );
  if (step) return step;
  if (rowNeedsAttentionForExplain(row)) {
    return meaningExplainSentenceHe("insufficient_evidence", "undetermined");
  }
  return "";
}

/** @param {Record<string, unknown>|null|undefined} row */
function rowNeedsAttentionForExplain(row) {
  const acc = Number(row?.accuracy) || 0;
  const q = Number(row?.questions) || 0;
  return q >= 3 && acc < 70;
}

/**
 * הסבר אבחוני מלא לנושא — מסך + PDF (ללא חיתוך באמצע משפט).
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {{ identified: string, data: string, pattern: string, meaning: string, action: string } | null}
 */
export function buildTopicDiagnosticExplainSectionsHe(row) {
  if (!row || typeof row !== "object") return null;
  const q = Number(row.questions) || 0;
  if (q <= 0) return null;

  const sig = row.topicEngineRowSignals && typeof row.topicEngineRowSignals === "object" ? row.topicEngineRowSignals : null;
  const label = String(row.label || "").trim();
  const acc = Math.round(Number(row.accuracy) || 0);

  const engineCopy = buildEngineDecisionParentTopicCopyHe({
    subjectId: row.subjectId,
    subjectLabelHe: row.subjectLabelHe,
    topic: label,
    topicKey: row.topicKey,
    q,
    acc,
    wrong: row.wrong,
    gradeKey: row.gradeKey,
    topicEngineRowSignals: sig,
  });

  if (engineCopy) {
    const identified = buildExplainIdentifiedLineHe(engineCopy, label);

    return {
      identified: shortReportDiagnosticsParentVisibleHe(identified),
      data: shortReportDiagnosticsParentVisibleHe(`הנתונים: ${engineCopy.dataHe}`),
      pattern: "",
      meaning: shortReportDiagnosticsParentVisibleHe(`מה זה אומר: ${engineCopy.whyHe}`),
      action: shortReportDiagnosticsParentVisibleHe(engineCopy.actionHe),
    };
  }

  const wrong = Number(row.wrong);
  const wr =
    q > 0 && Number.isFinite(wrong) && wrong >= 0
      ? Math.round((wrong / q) * 100)
      : acc <= 100
        ? Math.max(0, 100 - acc)
        : null;

  const stepLabel = sig
    ? parentStepLabelHe(String(sig.recommendedNextStep || ""), String(sig.recommendedStepLabelHe || ""))
    : "";
  const identified = explainIdentifiedHe(stepLabel, label);
  const data = explainDataHe(q, acc, wr);

  const patternText = sig ? parentFacingPatternLineHe(sig) : "";
  const pattern = explainPatternHe(patternText);

  const rootCause = String(sig?.rootCause || "");
  const diagnosticType = String(sig?.diagnosticType || "");
  const foundation = parentFacingFoundationLineHe(row);
  const meaning = explainMeaningHe(rootCause, diagnosticType, foundation);

  const engineAction = parentFacingActionLineHe(sig);
  const action = explainActionHe(rootCause, diagnosticType, engineAction);

  return {
    identified: shortReportDiagnosticsParentVisibleHe(identified),
    data: shortReportDiagnosticsParentVisibleHe(data),
    pattern: shortReportDiagnosticsParentVisibleHe(pattern),
    meaning: shortReportDiagnosticsParentVisibleHe(meaning),
    action: shortReportDiagnosticsParentVisibleHe(action),
  };
}

/**
 * שורה קצרה לזיכרון למידה (Phase 9).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function learningMemoryLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const mem = String(src.memoryNarrativeHe || "").trim();
  const st = String(src.learningStageLabelHe || "").trim();
  if (mem) return truncateHe(mem, 150);
  if (st) return truncateHe(`לאורך זמן: ${st}.`, 110);
  return "";
}

/**
 * שורת «חזרה לפני קידום» (Phase 9).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function reviewBeforeAdvanceLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.reviewBeforeAdvanceHe || "").trim();
  return s ? truncateHe(s, 160) : "";
}

/**
 * שורת מוכנות להעברה (Phase 9).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function transferReadinessLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const tr = String(src.transferReadiness || "").trim();
  if (!tr || tr === "unknown") return "";
  const map = {
    not_ready: "עדיף לחזק קודם את הנושא הנוכחי לפני שמעלים קושי.",
    limited: "אפשר לנסות מעט, אבל רק באותו נושא ולא בכמה נושאים יחד.",
    emerging: "אפשר להתחיל בצעד קטן בתוך אותו נושא.",
    ready: "אפשר לנסות צעד מתקדם קטן, בזהירות.",
  };
  return truncateHe(map[tr] || "", 130);
}

/** Phase 10 — תגובה להתערבות */
export const RESPONSE_TO_INTERVENTION_LABEL_HE = {
  not_enough_evidence: "עדיין אין מספיק ניסיון כדי לדעת אם מה שניסינו באמת עוזר",
  early_positive_response: "יש סימנים ראשונים לשיפור - עדיין לא חותמים על זה",
  stalled_response: "מרגישים שההתקדמות נתקעה - כדאי לדייק או לשנות קצת כיוון",
  over_supported_progress: "הצלחה בעיקר כשיש עזרה ליד - עדיין לא עצמאות מלאה",
  independence_growing: "העצמאות עולה לצד ההתקדמות",
  regression_under_support: "מגמה שלילית תוך כדי אותה תמיכה",
  mixed_response: "תגובה מעורבת - חלק מתקדם, חלק עדיין תלוי",
};

export const SUPPORT_FIT_LABEL_HE = {
  good_fit: "התאמה טובה לתמיכה הנוכחית",
  partial_fit: "התאמה חלקית - לעקוב ולכוון",
  poor_fit: "התאמה חלשה - לשקול שינוי בגישה",
  unknown: "לא ברור עדיין אם ההתאמה טובה",
};

export const SUPPORT_ADJUSTMENT_NEED_LABEL_HE = {
  hold_course: "להמשיך באותו כיוון, בזהירות",
  tighten_focus: "לדייק למטרה אחת ולהאט קצת",
  reduce_support: "להפחית תמיכה בהדרגה כשמופיעה עצמאות",
  increase_structure: "להוסיף מבנה קצר וברור",
  change_strategy: "לשנות גישה - מה שניסינו לא מספיק",
  monitor_only: "לצפות ולאסוף עוד מידע לפני החלטה",
};

/** Phase 10 — רענון מסקנה */
export const FRESHNESS_STATE_LABEL_HE = {
  fresh: "המידע עדכני יחסית",
  recent_but_partial: "עדכני חלקית - חסרים עדיין פרטים",
  aging: "המידע מתחיל להתיישן",
  stale: "המידע פחות עדכני - לא להסתמך רק עליו",
  unknown: "לא ברור עד כמה המידע רענן",
};

export const CONCLUSION_FRESHNESS_LABEL_HE = {
  high: "מה שנראה מהדוח סביר יחסית כרגע",
  medium: "מה שנראה מהדוח עדיין מתחזק - נמשיך לבדוק",
  low: "מה שנראה מהדוח עדיין רך - כדאי לאסוף עוד קצת מידע",
  expired: "מה שנראה מהדוח כבר לא עדכני - כדאי לעבור על זה שוב",
};

export const RECALIBRATION_NEED_LABEL_HE = {
  none: SUBJECT_V2_RECALIBRATION_NEED_NO_HE,
  light_review: "סקירה קלה לפני שינוי מהותי",
  structured_recheck: "בדיקה מסודרת לפני החמרה או עלייה ברמה",
  do_not_rely_yet: "עדיין לא להסתמך רק על מה שנראה מהדוח",
};

/** Phase 10 — כיוון התאמת תמיכה לשבוע הבא */
export const NEXT_SUPPORT_ADJUSTMENT_LABEL_HE = {
  continue_same_plan: "להמשיך באותה תוכנית - בזהירות ובבדיקה חוזרת",
  continue_and_reduce_support: "להמשיך ולהפחית מעט ליווי כשיש סימן לעצמאות",
  continue_and_tighten_focus: "להמשיך, לדייק למטרה אחת ולקצר מפגש אם צריך",
  pause_and_observe: "לעצור רגע, לצפות ולאסוף עוד מידע לפני שינוי",
  recheck_before_advancing: "בדיקה קצרה נוספת לפני העלאת קושי או עלייה ברמה",
  switch_strategy: "לשנות גישה - מה שניסינו לא מספיק כרגע",
};

/** Phase 11 — מצב כיוון עזרה */
export const SUPPORT_SEQUENCE_STATE_LABEL_HE = {
  new_support_cycle: "מתחילים עזרה חדשה - בימים הראשונים שמים לב לתוצאות ולא ממהרים לסכם",
  early_sequence: "תחילת עזרה חדשה - לעקוב בלי להעמיס",
  continuing_sequence: "ממשיכים באותו כיוון שנראה טוב",
  sequence_ready_for_release: "אפשר לנסות להפחית מעט את התמיכה",
  sequence_stalled: "הכיוון לא מתקדם מספיק - לדייק מטרה או לשנות דרך",
  sequence_exhausted: "התרגול חוזר על עצמו יותר מדי - כדאי לעצור ולבדוק דרך אחרת",
  insufficient_sequence_evidence: "עדיין מעט ניסיון - כדאי לבדוק שוב אחרי עוד תרגול קצר.",
};

export const PRIOR_SUPPORT_PATTERN_LABEL_HE = {
  guided_repeat: "חזרה על תמיכה מונחית דומה לאורך זמן",
  guided_then_release: "מונחה ואז מעבר הדרגתי ליותר עצמאות",
  review_hold_repeat: "מעגל חזרה והחזקה לפני שינוי",
  observe_then_retry: "בדיקה קצרה ואז ניסיון נוסף",
  mixed_support_history: "תערובת תמיכות לא אחידה",
  unknown: "לא ברור איך נראתה התמיכה קודם",
};

export const STRATEGY_REPETITION_RISK_LABEL_HE = {
  low: "סיכון נמוך לחזרה מיותרת על אותה שיטה",
  moderate: "סיכון בינוני לחזור על אותו כיוון בלי שינוי",
  high: "סיכון גבוה לחזור על אותו סוג עזרה בלי תועלת נוספת",
  unknown: "לא ברור אם יש חזרה מסוכנת",
};

export const STRATEGY_FATIGUE_RISK_LABEL_HE = {
  low: "עומס נמוך כרגע",
  moderate: "לשים לב שלא \"נשחקים\" על אותו ניסוח",
  high: "נראית עייפות מאותו סוג תמיכה - לרענן",
  unknown: "לא ברור לגבי עייפות מהגישה",
};

export const NEXT_BEST_SEQUENCE_STEP_LABEL_HE = {
  continue_current_sequence: "להמשיך באותו כיוון עוד קצת ולבדוק שוב",
  begin_release_step: "להתחיל להפחית עזרה בזהירות - לא לעבור בבת אחת",
  tighten_same_goal: "לדייק את אותה מטרה במקום להרחיב",
  switch_support_type: "להחליף סוג תמיכה - לא רק עוד חזרה",
  reset_with_short_review: "איפוס קצר ובדיקה מחודשת לפני דחיפה נוספת",
  observe_before_next_cycle: "לצפות ולאסוף מידע לפני מחזור חדש",
};

/** Phase 11 — פעולת רצף לשבוע הבא (מנוע) */
export const NEXT_SUPPORT_SEQUENCE_ACTION_LABEL_HE = {
  continue_same_sequence: "להמשיך באותו כיוון - בלי שינוי גדול",
  continue_with_tighter_target: "להמשיך באותו כיוון עם מטרה ממוקדת יותר",
  begin_release_sequence: "להתחיל תהליך הדרגתי להפחתת עזרה",
  pause_repeat_and_switch: "לעצור חזרות ולעבור לכיוון אחר",
  short_reset_then_retry: "איפוס קצר ואז ניסיון מחודש",
  observe_without_new_push: "לצפות בלי דחיפה חדשה עכשיו",
};

export const ADVICE_SIMILARITY_LEVEL_LABEL_HE = {
  clearly_new: "נשמע כיוון חדש יחסית לעומת מה שחזר עד עכשיו",
  partly_repeated: "חלק מהדברים חוזרים - אפשר לגוון קל",
  mostly_repeated: "רוב הניסוח חוזר על עצמו - שווה לשנות זווית",
  unknown: "לא ברור אם זו חזרה",
};

export const ADVICE_NOVELTY_LABEL_HE = {
  high: "הרבה רעננות בניסוח ובמה שעושים בפועל",
  medium: "רמת רעננות בינונית",
  low: "דומה למה שכבר ניסינו - אולי לעדכן קצת",
  unknown: "לא ברור",
};

export const RECOMMENDATION_ROTATION_NEED_LABEL_HE = {
  none: "אין צורך לעדכן את כיוון ההמלצה",
  light_variation: "מספיק לעדכן קלות את הניסוח או את הצעד",
  meaningful_rotation: "כדאי לשנות משמעותית - לא אותו תרגיל חוזר",
  do_not_repeat_yet: "לא לחזור על אותו סוג תרגול בלי לעצור ובדיקה קצרה",
};

/** Phase 12 — מה נוסה לאחרונה */
export const RECOMMENDATION_MEMORY_STATE_LABEL_HE = {
  no_memory: "עדיין מעט ניסיון מהעבר - כדאי לבדוק שוב אחרי עוד תרגול קצר",
  light_memory: "יש רק מעט מידע מהעבר - בעיקר מהתקופה הנוכחית",
  usable_memory: "יש מספיק רקע להשוות המשך מול מה שהיה לאחרונה",
  strong_memory: "יש כמה תקופות להשוואה - אפשר לסמוך קצת יותר על המשכיות",
};

export const PRIOR_RECOMMENDATION_SIGNATURE_LABEL_HE = {
  guided_accuracy_path: "ניסיון קודם לייצב דיוק בתרגול מונחה",
  review_hold_path: "חזרה והחזקה לפני שינוי",
  release_transition_path: "מעבר הדרגתי מתמיכה לעצמאות",
  observe_monitor_path: "בדיקה קצרה ואיסוף מידע",
  mixed_prior_path: "ניסו כמה דרכים, בלי כיוון אחד ברור",
  unknown: "לא ברור איך נראתה התמיכה קודם",
};

export const SUPPORT_HISTORY_DEPTH_LABEL_HE = {
  single_window: "מידע מתקופה אחת בלבד",
  short_history: "נתון משתי תקופות להשוואה",
  multi_window: "כמה תקופות - בסיס חזק יותר",
  unknown: "לא ברור כמה מידע יש מהעבר",
};

export const RECOMMENDATION_CARRYOVER_LABEL_HE = {
  not_visible: "לא רואים המשכיות ברורה מהכיוון הקודם",
  partly_visible: "אולי נמשך אותו כיוון - אבל לא חד משמעית",
  clearly_visible: "נראה שאותו כיוון תמיכה נמשך גם לתקופה הזו",
  unclear: "לא ברור אם זו אותה דרך עבודה או שינוי קטן",
};

export const MEMORY_OF_PRIOR_SUPPORT_CONFIDENCE_LABEL_HE = {
  none: "עדיין אין בסיס חזק מספיק להשוואה לעבר",
  low: "ההשוואה לעבר עדיין חלשה",
  medium: "מספיק רקע להשוואה זהירה לעבר",
  high: "יש די רקע להשוואה אמינה יחסית לעבר",
};

/** Phase 12 — מעקב אחרי תוצאה */
export const EXPECTED_OUTCOME_TYPE_LABEL_HE = {
  accuracy_stabilization: "רצינו לייצב דיוק",
  independence_growth: "רצינו לחזק עצמאות",
  error_reduction: "רצינו להפחית טעויות חוזרות",
  retention_hold: "רצינו שימור והחזקה",
  release_readiness: "רצינו לראות אם אפשר להפחית עזרה בזהירות",
  evidence_collection: "רצינו לאסוף עוד קצת מידע",
  unknown: "לא ברור מה ניסינו לשפר בפועל",
};

export const OBSERVED_OUTCOME_STATE_LABEL_HE = {
  clear_progress: "בפועל רואים שיפור ברור בכיוון שרצינו",
  partial_progress: "בפועל יש התקדמות חלקית",
  flat_response: "בפועל התמונה די שטוחה",
  contradictory_response: "בפועל הכיוון שונה ממה שציפינו",
  not_observable_yet: "עדיין מוקדם מדי לראות תוצאה ברורה",
};

export const EXPECTED_VS_OBSERVED_MATCH_LABEL_HE = {
  aligned: "מה שרצינו ומה שרואים עכשיו נראים מתואמים",
  partly_aligned: "יש חפיפה חלקית בין מה שציפינו למה שרואים",
  misaligned: "מה שרצינו לא התיישב עם מה שרואים עכשיו",
  not_enough_evidence: "אין עדיין מספיק בסיס מהתרגולים להשוואה אמינה",
};

export const FOLLOW_THROUGH_SIGNAL_LABEL_HE = {
  likely_followed: "סביר שהכיוון בבית נשמר",
  possibly_followed: "אולי נשמר כיוון - לא לנעול",
  unclear: "לא ברור אם זה אותו כיוון בבית",
  not_inferable: "אי אפשר להסיק מהנתונים",
};

export const RECOMMENDATION_CONTINUATION_DECISION_LABEL_HE = {
  continue_with_same_core: "להמשיך באותה מטרה - מה שרואים בפועל תומך בזה",
  continue_but_refine: "להמשיך באותו כיוון, בצורה מדויקת יותר",
  begin_controlled_release: "להתחיל להפחית תמיכה לאט - כשיש בסיס",
  do_not_repeat_without_new_evidence: "לא לחזור על אותו כיוון בלי מידע חדש",
  pivot_from_prior_path: "לפנות מכיוון שלא הוביל",
  reset_and_rebuild_signal: "איפוס קצר ולבנות מחדש את התמונה לפני דחיפה נוספת",
};

export const OUTCOME_BASED_NEXT_MOVE_LABEL_HE = {
  keep_current_direction: "להישאר על הכיוון - ולבדוק שוב בהמשך",
  tighten_goal_definition: "לדייק מטרה - לא להרחיב",
  reduce_support_and_check_transfer: "להפחית תמיכה מעט ולבדוק אם זה נשמר גם בשאלה חדשה",
  collect_new_evidence_first: "לאסוף עוד מידע לפני החלטה מהותית",
  switch_path_type: "להחליף דרך עבודה - לא רק עוד סיבוב",
  brief_reset_then_compare: "איפוס קצר והשוואה מחדש",
};

/** Phase 13 — שערי החלטה */
export const GATE_STATE_LABEL_HE = {
  gates_not_ready: "עדיין אין מספיק בסיס - נשארים עם החלטה זהירה",
  continue_gate_active: "הכיוון הנוכחי צריך עוד קצת הוכחה לפני שינוי",
  release_gate_forming: "מתקרבים להפחתת עזרה - חסר עוד סימן קצר לעצמאות",
  pivot_gate_visible: "אם גם אחרי עוד קצת תרגול אין שיפור - שווה לשקול כיוון קצת אחר",
  recheck_gate_visible: "חסר מידע עדכני - כדאי לאסוף עוד קצת לפני החלטה",
  advance_gate_forming: "יש בסיס טוב - לא לעלות רמה מהר מדי בלי הצלחה שחוזרת בצורה ברורה",
  mixed_gate_state: "כמה דברים במקביל - צעד אחד ברור קודם",
};

export const GATE_READINESS_LABEL_HE = {
  low: "מוכנות נמוכה - לא ננעול על משהו חד משמעי",
  moderate: "מוכנות בינונית - אפשר לצמצם לצעד אחד",
  high: "מוכנות גבוהה יחסית - עדיין עם תנאים לפני הפחתת עזרה או עלייה ברמה",
  insufficient: "אין עדיין מספיק בסיס להחלטה מדויקת",
};

export const GATE_LEVEL_LABEL_HE = {
  off: "לא רלוונטי כרגע",
  pending: "מחכים לעוד סימן קצר",
  forming: "נבנה בהדרגה",
  ready_watch: "כמעט שם - נשאר תנאי אחרון אחד",
  blocked: "נעצרים זמנית עד שיש התקדמות קטנה",
};

/** Phase 13 — יעדי ראיה לסבב הבא */
export const TARGET_EVIDENCE_TYPE_LABEL_HE = {
  accuracy_confirmation: "לוודא שהדיוק נשמר בלי לחץ מיותר",
  independence_confirmation: "לראות הצלחה קצרה בלי עזרה באמצע",
  retention_confirmation: "לראות שהילד זוכר גם אחרי הפסקה קצרה",
  mistake_reduction_confirmation: "לראות פחות טעויות מאותו סוג",
  response_confirmation: "לראות איך הילד מגיב לתרגול בבית",
  fresh_data_needed: "לאסוף עוד קצת נתון עדכני לפני שסוגרים תמונה",
  mixed_target: "לשלב שני סימנים קצרים - לא הכל בבת אחת",
};

export const TARGET_OBSERVATION_WINDOW_LABEL_HE = {
  next_short_cycle: "בימים הקרובים (מפגש אחד או שניים)",
  next_two_cycles: "בעוד שני רצפי תרגול קצרים",
  needs_fresh_baseline: "אחרי בדיקה קצרה כדי לרענן את התמונה",
  unknown: "לא ברור כמה זמן צריך",
};

/** Phase 13 — מיקוד החלטה לסבב הבא */
export const NEXT_CYCLE_DECISION_FOCUS_LABEL_HE = {
  prove_current_direction: "לבדוק שהכיוון הנוכחי באמת עוזר",
  check_independence_before_release: "לבדוק עצמאות קצרה לפני הפחתת עזרה",
  stabilize_before_advance: "לייצב לפני שמעלים רמה",
  test_if_path_is_working: "לבדוק אם הכיוון עובד בפועל אחרי עוד קצת תרגול",
  refresh_baseline_before_decision: "לבדוק שוב את החלקים הפשוטים יותר לפני החלטה גדולה",
  prepare_for_controlled_release: "להתכונן להפחתת עזרה בהדרגה - לא לעבור לבד בבת אחת",
};

/** Phase 14 — parent_report_hebrew_copy_spec.md §4 */
export const DEPENDENCY_STATE_LABEL_HE = { ...DEPENDENCY_STATE_PARENT_HE };

export const FOUNDATIONAL_BLOCKER_LABEL_HE = {
  accuracy_foundation_gap: DEPENDENCY_STATE_PARENT_HE.accuracy_foundation_gap,
  procedure_automaticity_gap: "קשה לו לשחזר את הדרך לפתרון לבד, גם כשהחומר מוכר",
  instruction_language_load: "עומס בניסוח המשימה",
  independence_readiness_gap: "עדיין מוקדם לעבודה עצמאית מלאה",
  retention_instability: "הילד עדיין לא זוכר את הדרך לאורך זמן",
  unknown: "לא ברור עדיין מה בדיוק צריך לחזק קודם",
};

export const LIKELIHOOD_LOW_MOD_HIGH_HE = {
  low: "פחות סביר",
  moderate: "סבירות בינונית",
  high: "סביר יחסית",
  unknown: "לא ברור",
};

/** Phase 14 — סדר התערבות */
export const INTERVENTION_ORDERING_LABEL_HE = {
  foundation_first: "קודם לחזק את החלקים הפשוטים יותר - ואז לחזור לנושא עצמו",
  local_support_first: "קודם תרגול ממוקד בנושא עצמו",
  parallel_light_support: "תרגול קל במקביל - בלי להרחיב הכול בבת אחת",
  gather_dependency_evidence_first: "לאסוף עוד מידע לפני שמחליטים מה כדאי לחזק קודם",
};

/** Phase 14 — החלטת יסוד לסבב הבא */
export const FOUNDATION_DECISION_LABEL_HE = {
  stabilize_foundation_first: "לחזק קודם את החלקים הפשוטים יותר לפני שמרחיבים",
  treat_locally: "לטפל בנושא עצמו - בלי להרחיב מעבר למה שהנתונים מראים",
  run_parallel_light_support: "לשלב תרגול קצר של החלקים הפשוטים יותר יחד עם הנושא עצמו",
  collect_dependency_evidence_first: "לאסוף מידע לפני שמשנים סדר עבודה",
};

export const NEXT_CYCLE_SUPPORT_LEVEL_LABEL_HE = {
  narrow_local: "תרגול ממוקד בנושא",
  foundation_targeted: "תרגול ממוקד בחלקים הפשוטים יותר שצריך לחזק",
  blended_light: "תערובת קלה - לא עומס כפול",
  evidence_first: "בדיקה קצרה לפני החלטה על רמת התמיכה",
};

/**
 * שורת תגובה להתערבות (Phase 10).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function responseToInterventionLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.responseToInterventionLabelHe || "").trim();
  if (s) return truncateHe(s, 150);
  const id = String(src.responseToIntervention || "").trim();
  const lab = RESPONSE_TO_INTERVENTION_LABEL_HE[id];
  return lab ? truncateHe(lab, 150) : "";
}

/**
 * שורת התאמת תמיכה / צעד הבא (Phase 10).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function supportAdjustmentLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const adj = String(src.nextSupportAdjustmentHe || "").trim();
  if (adj) return truncateHe(adj, 160);
  const need = String(src.supportAdjustmentNeedHe || "").trim();
  if (need) return truncateHe(need, 140);
  return "";
}

/**
 * שורת רענון / תוקף ראיות (Phase 10).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function freshnessLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const fs = String(src.freshnessStateLabelHe || "").trim();
  const cf = String(src.conclusionFreshnessLabelHe || "").trim();
  const parts = [fs, cf].filter(Boolean);
  if (!parts.length) return "";
  return truncateHe(parts.join(" · "), 160);
}

/**
 * שורת צורך בבדיקה מחדש של הכיוון (Phase 10).
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function recalibrationLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.recalibrationNeedHe || "").trim();
  return s ? truncateHe(s, 150) : "";
}

/** Phase 11 — כיוון עזרה */
export function supportSequenceLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const nar = String(src.supportSequenceNarrativeHe || "").trim();
  if (nar) return truncateHe(nar, 160);
  const st = String(src.supportSequenceStateLabelHe || "").trim();
  return st ? truncateHe(st, 140) : "";
}

export function repetitionRiskLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.strategyRepetitionRiskHe || "").trim();
  if (!s || s === STRATEGY_REPETITION_RISK_LABEL_HE.unknown) return "";
  return truncateHe(s, 150);
}

export function fatigueRiskLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.strategyFatigueRiskHe || "").trim();
  if (!s || s === STRATEGY_FATIGUE_RISK_LABEL_HE.unknown) return "";
  return truncateHe(s, 150);
}

export function releaseReadinessLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const seq = String(src.supportSequenceState || "").trim();
  if (seq === "sequence_ready_for_release") {
    return truncateHe(
      "נראה שהתמיכה עוזרת - אפשר לנסות צעד קצר ומבוקר של הפחתת עזרה, עדיין לא לגמרי לבד.",
      170
    );
  }
  if (seq === "sequence_exhausted" || seq === "sequence_stalled") {
    return truncateHe("הרצף תקוע או מתיש - לעצור רגע ולחדש כיוון לפני עוד אותו סוג תרגול.", 160);
  }
  return "";
}

export function sequenceActionLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const a = String(src.nextSupportSequenceActionHe || "").trim();
  return a ? truncateHe(a, 170) : "";
}

/** שורה אחת לחזרתיות + עייפות — רק כשיש תווית מעבר אל unknown */
export function topicRepetitionFatigueCompactLineHe(rowOrRec) {
  const r = repetitionRiskLineHe(rowOrRec);
  const f = fatigueRiskLineHe(rowOrRec);
  if (r && f) return truncateHe(`${r} · ${f}`, 168);
  return r || f;
}

/**
 * שורת נושא לרצף: ניסוח רצף או שחרור זהיר כשאין ניסוח.
 * @param {Record<string, unknown>|null|undefined} rowOrRec
 */
export function topicSupportSequenceOrReleaseLineHe(rowOrRec) {
  const seq = supportSequenceLineHe(rowOrRec);
  if (seq) return seq;
  return releaseReadinessLineHe(rowOrRec);
}

/** Phase 12 — מה נוסה לאחרונה / carryover */
export function recommendationMemoryLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const nar = String(src.recommendationMemoryNarrativeHe || "").trim();
  if (nar) return truncateHe(nar, 168);
  const st = String(src.recommendationMemoryStateLabelHe || "").trim();
  return st ? truncateHe(st, 150) : "";
}

export function outcomeTrackingLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const nar = String(src.outcomeTrackingNarrativeHe || "").trim();
  if (nar) return truncateHe(nar, 168);
  const m = String(src.expectedVsObservedMatchHe || "").trim();
  return m ? truncateHe(m, 155) : "";
}

export function continuationDecisionLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.recommendationContinuationDecisionHe || "").trim();
  return s ? truncateHe(s, 165) : "";
}

export function carryoverLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  if (String(src.recommendationCarryover || "") === "not_visible") return "";
  const s = String(src.recommendationCarryoverLabelHe || "").trim();
  if (!s) return "";
  return truncateHe(s, 155);
}

export function freshEvidenceNeedLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const mem = String(src.recommendationMemoryState || "");
  const match = String(src.expectedVsObservedMatch || "");
  const s = String(src.whatNeedsFreshEvidenceNowHe || "").trim();
  if (!s) return "";
  if (mem === "no_memory" || mem === "light_memory" || match === "not_enough_evidence") return truncateHe(s, 165);
  return "";
}

/** Phase 13 — שערים ומיקוד סבב הבא */
export function gateStateLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const nar = String(src.gateNarrativeHe || "").trim();
  if (nar) return truncateHe(nar, 170);
  const st = String(src.gateStateLabelHe || "").trim();
  return st ? truncateHe(st, 155) : "";
}

export function decisionFocusLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.nextCycleDecisionFocusHe || "").trim();
  return s ? truncateHe(s, 165) : "";
}

export function evidenceTargetLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const nar = String(src.evidenceTargetNarrativeHe || "").trim();
  if (nar) return truncateHe(nar, 168);
  const t = String(src.targetEvidenceTypeLabelHe || "").trim();
  const w = String(src.targetObservationWindowLabelHe || "").trim();
  if (t && w) return truncateHe(`${t} · ${w}`, 168);
  return t ? truncateHe(t, 155) : "";
}

export function releaseGateLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const rg = String(src.releaseGate || "");
  if (rg !== "forming" && rg !== "pending" && rg !== "ready_watch") return "";
  const w = String(src.whatWouldJustifyReleaseHe || "").trim();
  if (w) return truncateHe(w, 168);
  return truncateHe(
    "הכיוון נראה סביר - לפני שמפחיתים עזרה כדאי לראות עוד הצלחה קצרה בלי עזרה באמצע.",
    168
  );
}

export function pivotTriggerLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const pg = String(src.pivotGate || "");
  if (pg !== "forming" && pg !== "pending") return "";
  const t = String(src.whatWouldTriggerPivotHe || "").trim();
  return t ? truncateHe(t, 168) : truncateHe(GATE_STATE_LABEL_HE.pivot_gate_visible, 140);
}

export function recheckTriggerLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const rc = String(src.recheckGate || "");
  if (rc !== "forming" && rc !== "pending") return "";
  const t = String(src.whatWouldTriggerRecheckHe || "").trim();
  return t ? truncateHe(t, 165) : "";
}

/** שורת טריגר אחת: עדיפות לריענון, אחר כך pivot, אחר כך שחרור */
export function gateTriggerCompactLineHe(rowOrRec) {
  const rec = recheckTriggerLineHe(rowOrRec);
  if (rec) return rec;
  const piv = pivotTriggerLineHe(rowOrRec);
  if (piv) return piv;
  const rel = releaseGateLineHe(rowOrRec);
  return rel || "";
}

/** Phase 14 — מאיפה מתחיל הקושי / סדר תמיכה */
export function dependencyStateLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const nar = String(src.foundationDependencyNarrativeHe || "").trim();
  if (nar) return truncateHe(nar, 170);
  const st = String(src.dependencyStateLabelHe || "").trim();
  return st ? truncateHe(st, 155) : "";
}

export function foundationPriorityLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  if (!src.shouldTreatAsFoundationFirst && String(src.foundationDecision || "") !== "stabilize_foundation_first")
    return "";
  const w = String(src.whyFoundationFirstHe || "").trim();
  if (w) return truncateHe(w, 168);
  return truncateHe(FOUNDATION_DECISION_LABEL_HE.stabilize_foundation_first, 130);
}

export function interventionOrderingLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const s = String(src.interventionOrderingHe || "").trim();
  return s ? truncateHe(s, 165) : "";
}

export function foundationBeforeExpansionLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  if (!src.foundationBeforeExpansion) return "";
  const t = String(src.foundationBeforeExpansionHe || "").trim();
  return t ? truncateHe(t, 168) : "";
}

export function downstreamSymptomLineHe(rowOrRec) {
  const o = rowOrRec && typeof rowOrRec === "object" ? rowOrRec : {};
  const sig = o.topicEngineRowSignals && typeof o.topicEngineRowSignals === "object" ? o.topicEngineRowSignals : null;
  const src = sig || o;
  const d = String(src.downstreamSymptomLikelihood || "");
  if (d !== "high" && d !== "moderate") return "";
  const sym = String(src.whyThisMayBeSymptomNotCoreHe || "").trim();
  if (sym) return truncateHe(sym, 165);
  const h = String(src.downstreamSymptomLikelihoodHe || "").trim();
  return h ? truncateHe(h, 140) : "";
}

/* -------------------------------------------------------------------------- */
/* Phase 15 — קומפקט UI: סדר עדיפות הוראתי אחיד, בלי כפילויות בין שכבות     */
/* עדיפות תוכן: (1) מה נראה (2) תמיכה (3) מה עדיין חסר (4) מה לדחות        */
/* (5) יסוד/מקומי — כאן רק מאחדים שורות מקבילות שמקורן באותם שדות מנוע.      */
/* -------------------------------------------------------------------------- */

/** @param {string} hay @param {string} needle */
function pr15HayContainsProbe(hay, needle, minProbe = 16) {
  const H = String(hay || "");
  const N = String(needle || "").trim();
  if (!H || !N) return false;
  const probe = N.slice(0, Math.min(Math.max(minProbe, 12), N.length));
  return probe.length >= 10 && H.includes(probe);
}

function topicNarrativeSectionLineHe(rowOrRec, section, max = 180) {
  const c =
    rowOrRec?.contractsV1?.narrative && typeof rowOrRec.contractsV1.narrative === "object"
      ? rowOrRec.contractsV1.narrative
      : null;
  if (!c) return "";
  const line = narrativeSectionTextHe(section, c);
  return line ? truncateHe(normalizeParentFacingHe(line), max) : "";
}

function hasTopicNarrativeContract(rowOrRec) {
  return !!(
    rowOrRec?.contractsV1?.narrative &&
    typeof rowOrRec.contractsV1.narrative === "object"
  );
}

/**
 * עדכניות + ריענון + «ראיה טרייה» בשורה אחת (לא שלוש שורות זהירות כמעט זהות).
 * קדימות: freshness > fresh-evidence (מסונן) > recalibration.
 */
export function topicFreshnessUnifiedLineHe(rowOrRec) {
  const fromContract = topicNarrativeSectionLineHe(rowOrRec, "limitations", 195);
  if (hasTopicNarrativeContract(rowOrRec)) return fromContract;
  const fr = freshnessLineHe(rowOrRec);
  if (fr) return fr;
  const fe = freshEvidenceNeedLineHe(rowOrRec);
  const rec = recalibrationLineHe(rowOrRec);
  if (fe && rec && !pr15HayContainsProbe(fe, rec, 14) && !pr15HayContainsProbe(rec, fe, 14)) {
    return truncateHe(`${fe} · ${rec}`, 195);
  }
  if (fe) return fe;
  return rec || "";
}

/**
 * התאמת תמיכה / צעד ברצף / ניסוח רצף — שורה אחת; קדימות ל-adjustment כי הוא מכסה לעיתים את הרצף.
 */
export function topicSupportFlowUnifiedLineHe(rowOrRec) {
  const fromContract = topicNarrativeSectionLineHe(rowOrRec, "recommendation", 190);
  if (hasTopicNarrativeContract(rowOrRec)) return fromContract;
  const adj = supportAdjustmentLineHe(rowOrRec);
  if (adj) return adj;
  const seqA = sequenceActionLineHe(rowOrRec);
  if (seqA) return seqA;
  return topicSupportSequenceOrReleaseLineHe(rowOrRec);
}

/** רצף + חזרתיות — מיזוג כשהטקסט חופף; אחרת « · » */
export function topicSequencingRepeatCompactLineHe(rowOrRec) {
  const flow = topicSupportFlowUnifiedLineHe(rowOrRec);
  const rep = topicRepetitionFatigueCompactLineHe(rowOrRec);
  if (!rep) return flow;
  if (!flow) return rep;
  if (pr15HayContainsProbe(flow, rep, 14) || pr15HayContainsProbe(rep, flow, 14)) return flow;
  return truncateHe(`${flow} · ${rep}`, 200);
}

/** מה נוסה לאחרונה + תוצאה + המשך — בלי לשכפל משפטים כמעט זהים */
export function topicMemoryOutcomeContinuationCompactLineHe(rowOrRec) {
  const mem = recommendationMemoryLineHe(rowOrRec);
  const out = outcomeTrackingLineHe(rowOrRec);
  const cont = continuationDecisionLineHe(rowOrRec);
  const parts = [];
  let acc = "";
  if (mem) {
    parts.push(mem);
    acc = mem;
  }
  if (out && !pr15HayContainsProbe(acc, out, 18)) {
    parts.push(out);
    acc = parts.join(" ");
  }
  if (cont && !pr15HayContainsProbe(acc, cont, 18)) parts.push(cont);
  return parts.length ? truncateHe(parts.join(" · "), 210) : "";
}

/**
 * שער + מיקוד סבב + יעד ראיה + טריגר — שורה אחת כשהשדות חוזרים על אותה כוונה.
 * קדימות: gate narrative > focus > evidence target > trigger (רק אם מוסיף מידע).
 */
export function topicGatesEvidenceDecisionCompactLineHe(rowOrRec) {
  const fromContract = topicNarrativeSectionLineHe(rowOrRec, "finding", 200);
  if (hasTopicNarrativeContract(rowOrRec)) return fromContract;
  const gate = gateStateLineHe(rowOrRec);
  const focus = decisionFocusLineHe(rowOrRec);
  const ev = evidenceTargetLineHe(rowOrRec);
  const trig = gateTriggerCompactLineHe(rowOrRec);
  const parts = [];
  let acc = "";
  if (gate) {
    parts.push(gate);
    acc = gate;
  }
  if (focus && !pr15HayContainsProbe(acc, focus, 14)) {
    parts.push(focus);
    acc = parts.join(" ");
  }
  if (ev && !pr15HayContainsProbe(acc, ev, 18)) {
    parts.push(ev);
    acc = parts.join(" ");
  }
  if (trig && !pr15HayContainsProbe(acc, trig, 18)) parts.push(trig);
  return parts.length ? truncateHe(parts.join(" · "), 215) : "";
}

/** יסוד/מקומי + סדר התערבות + לפני הרחבה + תסמין משנה — מניעת כפילות בין שורות Phase 14 */
export function topicFoundationDependencyCompactLineHe(rowOrRec) {
  const foundation = parentFacingFoundationLineHe(rowOrRec);
  if (foundation) return foundation;
  const ord = interventionOrderingLineHe(rowOrRec);
  const dep = dependencyStateLineHe(rowOrRec);
  if (dep && !VAGUE_FOUNDATION_PHRASE.test(dep)) return dep;
  return ord ? truncateHe(ord, 220) : "";
}
