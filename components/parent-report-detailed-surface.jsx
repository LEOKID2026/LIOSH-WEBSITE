/**
 * רכיבי פני שטח מהדוח המקיף — מופרדים ל-import בבדיקות SSR בלי Layout/router.
 * Parent Copilot Phase A: אין שינוי מבנה דוח/הדפסה כאן - שילוב Copilot רק בדף `parent-report-detailed.js`.
 */
export const PARENT_COPILOT_PHASE_A_SURFACE_TAG = "phaseA-no-layout-change";
import React, { useMemo } from "react";
import {
  buildSubjectParentLetterDetailedPhase1,
  rewriteParentRecommendationForDetailedHe,
} from "../utils/detailed-report-parent-letter-he";
import {
  behaviorDominantLabelHe,
  buildTopicDiagnosticExplainSectionsHe,
  learningMemoryLineHe,
  mistakePatternLineHe,
  sanitizeEngineSnippetHe,
  subjectMajorRiskLabelsHe,
  transferReadinessLineHe,
  truncateHe,
} from "../utils/parent-report-ui-explain-he";
import {
  PARENT_TOPIC_TIER,
  parentTopicTierSectionTitleHe,
} from "../utils/parent-report-surface/index.js";
import {
  formatExclusiveLearningMinutesHe,
  normalizeLearningTimeExclusiveBreakdown,
} from "../lib/parent-ui/learning-time-exclusive-breakdown-display.js";
import {
  getLpdFromRow,
  lpdParentVisibleFindingFromRow,
  shouldSuppressLegacyEngineParentCopy,
  guardParentFacingText,
  buildLpdSafeTopicExplainSectionsHe,
} from "../utils/learning-pattern-decision/index.js";
import { trendV1DisplayLineHe } from "../utils/parent-report-topic-trend-v1.js";
import {
  SUBJECT_PHASE3_ROW_LABEL_HE,
  SUBJECT_V2_RECALIBRATION_NEED_NO_HE,
  normalizeParentFacingHe,
} from "../utils/parent-report-language/index.js";
import { narrativeSectionTextHe } from "../utils/contracts/narrative-contract-v1.js";
import {
  PARENT_BULLETS_EMPTY_WITH_VOLUME_HE,
  stripKnownParentReportLeakageHe,
} from "../utils/parent-data-presence.js";
const PR1_RETENTION_LABEL_HE = {
  low: "נמוך",
  moderate: "בינוני",
  high: "גבוה",
  unknown: "לא ברור",
};

const PR1_TRANSFER_LABEL_HE = {
  not_ready: "עדיף לחזק קודם את הנושא הנוכחי.",
  limited: "אפשר לנסות מעט, רק באותו נושא.",
  emerging: "אפשר להתחיל בצעד קטן, אבל לא לקפוץ רמה.",
  ready: "אפשר לנסות צעד מתקדם קטן.",
};

const PHASE1_WHAT_NOT_TO_DO_EXACT = Object.freeze({
  "עלייה מהירה מדי ברמה; ערבוב נושאים; משוב כללי בלי דוגמה נגדית":
    "לא לקפוץ רמה מהר מדי, לא לערבב כמה נושאים יחד, ולא להסתפק במשוב כללי בלי דוגמה.",
  "קפיצה לרמה גבוהה; ערבוב נושאים; משוב כללי בלי דוגמה נגדית":
    "לא לקפוץ לרמה גבוהה מדי, לא לערבב כמה נושאים יחד, ולא להסתפק במשוב כללי בלי דוגמה.",
  "עלייה מהירה מדי ברמה; ערבוב נושאים":
    "לא לקפוץ לרמה גבוהה מדי ולא לערבב כמה נושאים יחד.",
  "קפיצה לרמה גבוהה; ערבוב נושאים":
    "לא לקפוץ לרמה גבוהה מדי ולא לערבב כמה נושאים יחד.",
});

function phase1WhatNotToDoDisplayHe(raw) {
  const t = String(raw || "").trim();
  return PHASE1_WHAT_NOT_TO_DO_EXACT[t] || t;
}

function formatTopicQuestionCountHe(count) {
  const n = Math.max(0, Math.round(Number(count) || 0));
  if (n === 1) return "1 שאלה";
  return `${n} שאלות`;
}

/** PR1 — טקסט הורה גלוי בלבד; לא משנה payload. */
function pr1CrossSubjectRetentionDisplayHe(raw) {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return PR1_RETENTION_LABEL_HE[k] || "לא ברור";
}

/** PR1 — מוכנות להמשך בין מקצועות; לא מציג מזהה גולמי. */
function pr1CrossSubjectTransferDisplayHe(raw) {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return PR1_TRANSFER_LABEL_HE[k] || "עדיין צריך עוד תרגול כדי לקבוע.";
}

/**
 * PR1 — ניקוי דליפות מזהים/טוקנים מטקסט שמוצג להורה (מקומי לקובץ זה).
 * @param {unknown} s
 */
function pr1ParentVisibleTextHe(s) {
  let t = sanitizeEngineSnippetHe(String(s ?? ""));
  t = t.replace(/\u0001/g, " ");
  t = t.replace(/\bdefault_[a-z0-9_]+\b/gi, "");
  t = t.replace(
    /\b(advance_level|advance_grade_topic_only|maintain_and_strengthen|remediate_same_level|drop_one_level_topic_only|drop_one_grade_topic_only)\b/g,
    ""
  );
  t = t.replace(/\b(no_memory|light_memory|not_enough_evidence)\b/gi, "");
  t = t.replace(/\(pf:[^)]*\)/gi, "");
  t = t.replace(/\(k:[^)]*\)/gi, "");
  t = t.replace(/\(to:[^)]*\)/gi, "");
  t = t.replace(/\(st:[^)]*\)/gi, "");
  t = t.replace(/\(ct:[^)]*\)/gi, "");
  t = t.replace(/\b[a-z][a-z0-9_]{10,}\b/g, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = normalizeParentFacingHe(t);
  t = stripKnownParentReportLeakageHe(t);
  if (!t) return "";
  const numericOnly = /^[\d\s.,/%\-–-]+$/u.test(t);
  if (numericOnly) return "";
  if (/^0{2,}$/u.test(t)) return "";
  return guardParentFacingText(t);
}

export function Bullets({ items, className = "", volumeQuestionsTotal = 0 }) {
  const safeItems = (Array.isArray(items) ? items : [])
    .map((x) => pr1ParentVisibleTextHe(x))
    .filter(Boolean);
  if (!safeItems.length)
    return (
      <p className={`pr-detailed-muted text-sm ${className}`.trim()}>
        {Number(volumeQuestionsTotal) > 0 ? PARENT_BULLETS_EMPTY_WITH_VOLUME_HE : "אין נתונים להצגה."}
      </p>
    );
  return (
    <ul
      className={`pr-detailed-body-text list-disc pr-5 space-y-1.5 text-sm md:text-base text-white/[0.88] leading-relaxed ${className}`.trim()}
    >
      {safeItems.map((t, i) => (
        <li key={i} className="pr-detailed-bullet-li">
          {t}
        </li>
      ))}
    </ul>
  );
}

/** סיכום מנהלים — שדות Phase 4 */
export function ExecutiveSummarySection({ es, compact }) {
  const volQ = Number(es?.windowTotalQuestions) || 0;
  return (
    <div className="pr-detailed-exec-summary space-y-3 md:space-y-4">
      <div
        className={`grid grid-cols-1 gap-3 md:gap-4 ${
          (es.topFocusAreasHe || []).length > 0 ? "md:grid-cols-2" : ""
        }`.trim()}
      >
        <div>
          <h4 className="pr-detailed-subheading text-emerald-200/95">איפה נראו תוצאות טובות בכל המקצועות</h4>
          <Bullets items={es.topStrengthsAcrossHe || []} volumeQuestionsTotal={volQ} />
        </div>
        {(es.topFocusAreasHe || []).length > 0 ? (
          <div>
            <h4 className="pr-detailed-subheading text-amber-200/95">מה לשים בפוקוס (בכמה מקצועות)</h4>
            <Bullets items={es.topFocusAreasHe || []} volumeQuestionsTotal={volQ} />
          </div>
        ) : null}
      </div>
      {es.majorTrendsHe?.length ? (
        <div>
          <h4 className="pr-detailed-subheading text-cyan-200/95">מגמות מרכזיות</h4>
          <Bullets items={es.majorTrendsHe || []} volumeQuestionsTotal={volQ} />
        </div>
      ) : null}
      {(es.dominantCrossSubjectRiskLabelHe || es.dominantCrossSubjectSuccessPatternLabelHe) && !compact ? (
        <div className="flex flex-wrap gap-2 text-[11px] md:text-xs text-white/78">
          {es.dominantCrossSubjectRiskLabelHe ? (
            <span className="rounded border border-white/15 bg-white/[0.05] px-2 py-1">
              <span className="text-white/45 font-bold">איפה זה נשמע קשה יותר: </span>
              {pr1ParentVisibleTextHe(es.dominantCrossSubjectRiskLabelHe)}
            </span>
          ) : null}
          {es.dominantCrossSubjectSuccessPatternLabelHe ? (
            <span className="rounded border border-white/15 bg-white/[0.05] px-2 py-1">
              <span className="text-white/45 font-bold">איפה זה נשמע חזק יותר: </span>
              {pr1ParentVisibleTextHe(es.dominantCrossSubjectSuccessPatternLabelHe)}
            </span>
          ) : null}
        </div>
      ) : null}
      {es.mainHomeRecommendationHe ? (
        <div className="rounded-lg border border-amber-400/28 bg-amber-950/14 px-3 py-2.5">
          <h4 className="pr-detailed-subheading text-amber-100/95 mb-1 border-0 pb-0">פעולת בית מרכזית לתקופה</h4>
          <p className="pr-detailed-body-text text-sm m-0 leading-relaxed">
            {pr1ParentVisibleTextHe(es.mainHomeRecommendationHe)}
          </p>
        </div>
      ) : null}
      {Boolean(es.topImmediateParentActionHe ||
        es.secondPriorityActionHe ||
        (es.monitoringOnlyAreasHe && es.monitoringOnlyAreasHe.length) ||
        (es.deferForNowAreasHe && es.deferForNowAreasHe.length)) && (
        <div className="rounded-lg border border-sky-400/24 bg-sky-950/12 px-3 py-2.5 pr-detailed-avoid-split">
          <h4 className="pr-detailed-subheading text-sky-100/95 mb-1.5 border-0 pb-0">מה לעשות עכשיו - לפי סדר</h4>
          <div className="space-y-1.5 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {es.topImmediateParentActionHe ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה לעשות קודם: </span>
                {pr1ParentVisibleTextHe(es.topImmediateParentActionHe)}
              </p>
            ) : (
              <p className="m-0 text-white/55">אין נושא שכדאי להתמקד בו השבוע - שגרת תרגול קצרה מספיקה.</p>
            )}
            {es.secondPriorityActionHe ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה לעשות אחר כך: </span>
                {pr1ParentVisibleTextHe(es.secondPriorityActionHe)}
              </p>
            ) : null}
            {es.monitoringOnlyAreasHe?.length ? (
              <div className="m-0">
                <span className="text-white/45 font-bold">לשמור על שגרה קצרה: </span>
                <span className="text-white/[0.82]">
                  {es.monitoringOnlyAreasHe.map(pr1ParentVisibleTextHe).join(" · ")}
                </span>
              </div>
            ) : null}
            {es.deferForNowAreasHe?.length ? (
              <div className="m-0">
                <span className="text-white/45 font-bold">לא צריך להתמקד בזה עכשיו - אפשר להמתין: </span>
                <span className="text-white/[0.82]">{es.deferForNowAreasHe.map(pr1ParentVisibleTextHe).join(" · ")}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {Boolean(es.dominantCrossSubjectMistakePatternLabelHe ||
        es.crossSubjectLearningStageLabelHe ||
        (es.reviewBeforeAdvanceAreasHe && es.reviewBeforeAdvanceAreasHe.length) ||
        (es.transferReadyAreasHe && es.transferReadyAreasHe.length)) && (
        <div className="rounded-lg border border-emerald-400/22 bg-emerald-950/10 px-3 py-2.5 pr-detailed-avoid-split">
          <h4 className="pr-detailed-subheading text-emerald-100/95 mb-1.5 border-0 pb-0">טעויות חוזרות ושימור מה שלומדים</h4>
          <div className="space-y-1 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {es.dominantCrossSubjectMistakePatternLabelHe ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה בולט: </span>
                {pr1ParentVisibleTextHe(es.dominantCrossSubjectMistakePatternLabelHe)}
              </p>
            ) : null}
            {es.crossSubjectLearningStageLabelHe ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">לאורך זמן: </span>
                {pr1ParentVisibleTextHe(es.crossSubjectLearningStageLabelHe)}
                {es.crossSubjectRetentionRisk
                  ? ` · סיכון שימור: ${pr1CrossSubjectRetentionDisplayHe(es.crossSubjectRetentionRisk)}`
                  : ""}
                {es.crossSubjectTransferReadiness
                  ? ` · מוכנות לשלב הבא: ${pr1CrossSubjectTransferDisplayHe(es.crossSubjectTransferReadiness)}`
                  : ""}
              </p>
            ) : null}
            {es.reviewBeforeAdvanceAreasHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">לפני שמעלים רמה: </span>
                {es.reviewBeforeAdvanceAreasHe.map(pr1ParentVisibleTextHe).join(" · ")}
              </p>
            ) : null}
            {es.transferReadyAreasHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מוכנות להרחבה זהירה: </span>
                {es.transferReadyAreasHe.map(pr1ParentVisibleTextHe).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      )}
      {Boolean(es.crossSubjectResponseToInterventionLabelHe ||
        es.crossSubjectSupportAdjustmentNeedHe ||
        es.crossSubjectRecalibrationNeedHe ||
        (es.majorRecheckAreasHe && es.majorRecheckAreasHe.length) ||
        (es.areasWhereSupportCanBeReducedHe && es.areasWhereSupportCanBeReducedHe.length) ||
        (es.areasNeedingStrategyChangeHe && es.areasNeedingStrategyChangeHe.length)) && (
        <div className="rounded-lg border border-teal-400/22 bg-teal-950/10 px-3 py-2.5 pr-detailed-avoid-split">
          <h4 className="pr-detailed-subheading text-teal-100/95 mb-1.5 border-0 pb-0">מה עוזר עכשיו ומה כדאי לשנות</h4>
          <div className="space-y-1 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {es.crossSubjectResponseToInterventionLabelHe ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה נראה שקורה: </span>
                {pr1ParentVisibleTextHe(es.crossSubjectResponseToInterventionLabelHe)}
              </p>
            ) : null}
            {es.crossSubjectSupportAdjustmentNeedHe ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">כיוון לשבוע הבא: </span>
                {pr1ParentVisibleTextHe(es.crossSubjectSupportAdjustmentNeedHe)}
              </p>
            ) : null}
            {es.crossSubjectRecalibrationNeedHe &&
            es.crossSubjectRecalibrationNeedHe !== SUBJECT_V2_RECALIBRATION_NEED_NO_HE ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">האם כדאי לבדוק כיוון אחר? </span>
                {pr1ParentVisibleTextHe(es.crossSubjectRecalibrationNeedHe)}
              </p>
            ) : null}
            {es.majorRecheckAreasHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה שווה לבדוק שוב: </span>
                {es.majorRecheckAreasHe.map(pr1ParentVisibleTextHe).join(" · ")}
              </p>
            ) : null}
            {es.areasWhereSupportCanBeReducedHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">אפשר לנסות קצת יותר עצמאות: </span>
                {es.areasWhereSupportCanBeReducedHe.map(pr1ParentVisibleTextHe).join(" · ")}
              </p>
            ) : null}
            {es.areasNeedingStrategyChangeHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">שינוי אסטרטגיה מוצדק: </span>
                {es.areasNeedingStrategyChangeHe.map(pr1ParentVisibleTextHe).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      )}
      {Boolean(String(es.crossSubjectSupportSequenceStateLabelHe || "").trim() ||
        String(es.crossSubjectNextBestSequenceStepHe || "").trim() ||
        (es.subjectsReadyForReleaseHe && es.subjectsReadyForReleaseHe.length) ||
        (es.subjectsAtRiskOfSupportRepetitionHe && es.subjectsAtRiskOfSupportRepetitionHe.length) ||
        (es.subjectsNeedingSupportResetHe && es.subjectsNeedingSupportResetHe.length)) && (
        <div className="rounded-lg border border-indigo-400/22 bg-indigo-950/10 px-3 py-2.5 pr-detailed-avoid-split">
          <h4 className="pr-detailed-subheading text-indigo-100/95 mb-1.5 border-0 pb-0">איך ההתקדמות נראית לאורך זמן</h4>
          <div className="space-y-1 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {String(es.crossSubjectSupportSequenceStateLabelHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מצב כללי: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectSupportSequenceStateLabelHe)), 220)}
              </p>
            ) : null}
            {String(es.crossSubjectNextBestSequenceStepHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">כיוון לרצף: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectNextBestSequenceStepHe)), 220)}
              </p>
            ) : null}
            {es.subjectsReadyForReleaseHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">אפשר לנסות פחות עזרה בזהירות: </span>
                {truncateHe(es.subjectsReadyForReleaseHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsAtRiskOfSupportRepetitionHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">סיכון לחזרתיות: </span>
                {truncateHe(es.subjectsAtRiskOfSupportRepetitionHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsNeedingSupportResetHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">כדאי לעצור ולחדש כיוון: </span>
                {truncateHe(es.subjectsNeedingSupportResetHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
          </div>
        </div>
      )}
      {Boolean(String(es.crossSubjectRecommendationMemoryStateLabelHe || "").trim() ||
        (es.subjectsWithClearCarryoverHe && es.subjectsWithClearCarryoverHe.length) ||
        (es.subjectsNeedingFreshEvidenceHe && es.subjectsNeedingFreshEvidenceHe.length) ||
        (es.subjectsWherePriorPathSeemsMisalignedHe && es.subjectsWherePriorPathSeemsMisalignedHe.length)) && (
        <div className="rounded-lg border border-slate-400/22 bg-slate-950/12 px-3 py-2.5 pr-detailed-avoid-split">
          <h4 className="pr-detailed-subheading text-slate-100/95 mb-1.5 border-0 pb-0">מה ניסינו לאחרונה - האם עזר?</h4>
          <div className="space-y-1 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {String(es.crossSubjectRecommendationMemoryStateLabelHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה ניסינו לאחרונה: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectRecommendationMemoryStateLabelHe)), 220)}
                {String(es.crossSubjectSupportHistoryDepthLabelHe || "").trim()
                  ? ` · ${truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectSupportHistoryDepthLabelHe)), 120)}`
                  : ""}
              </p>
            ) : null}
            {String(es.crossSubjectExpectedVsObservedMatchHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">האם זה מתאים למה שציפינו: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectExpectedVsObservedMatchHe)), 220)}
              </p>
            ) : null}
            {String(es.crossSubjectContinuationDecisionHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">כיוון המשך: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectContinuationDecisionHe)), 220)}
              </p>
            ) : null}
            {es.subjectsWithClearCarryoverHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">עקביות טובה: </span>
                {truncateHe(es.subjectsWithClearCarryoverHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsNeedingFreshEvidenceHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">צריך מידע עדכני: </span>
                {truncateHe(es.subjectsNeedingFreshEvidenceHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsWherePriorPathSeemsMisalignedHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">הכיוון הקודם לא מתאים מספיק: </span>
                {truncateHe(es.subjectsWherePriorPathSeemsMisalignedHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
          </div>
        </div>
      )}
      {Boolean(String(es.crossSubjectGateStateLabelHe || "").trim() ||
        String(es.crossSubjectNextCycleDecisionFocusHe || "").trim() ||
        String(es.crossSubjectEvidenceTargetTypeLabelHe || "").trim() ||
        String(es.crossSubjectTargetObservationWindowLabelHe || "").trim() ||
        (es.subjectsNearReleaseButNotThereHe && es.subjectsNearReleaseButNotThereHe.length) ||
        (es.subjectsNeedingRecheckBeforeDecisionHe && es.subjectsNeedingRecheckBeforeDecisionHe.length) ||
        (es.subjectsWithVisiblePivotTriggerHe && es.subjectsWithVisiblePivotTriggerHe.length)) && (
        <div className="rounded-lg border border-fuchsia-400/22 bg-fuchsia-950/10 px-3 py-2.5 pr-detailed-avoid-split">
          <h4 className="pr-detailed-subheading text-fuchsia-100/95 mb-1.5 border-0 pb-0">לפני שמשנים משהו</h4>
          <div className="space-y-1 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {String(es.crossSubjectGateStateLabelHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה נכון לעשות עכשיו: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectGateStateLabelHe)), 220)}
              </p>
            ) : null}
            {String(es.crossSubjectNextCycleDecisionFocusHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה כדאי לבדוק: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectNextCycleDecisionFocusHe)), 240)}
              </p>
            ) : null}
            {(String(es.crossSubjectEvidenceTargetTypeLabelHe || "").trim() ||
              String(es.crossSubjectTargetObservationWindowLabelHe || "").trim()) && (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה לאסוף: </span>
                {truncateHe(
                  [es.crossSubjectEvidenceTargetTypeLabelHe, es.crossSubjectTargetObservationWindowLabelHe]
                    .filter(Boolean)
                    .map((x) => pr1ParentVisibleTextHe(String(x)))
                    .join(" · "),
                  260
                )}
              </p>
            )}
            {es.subjectsNearReleaseButNotThereHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">עדיין לא להפחית עזרה: </span>
                {truncateHe(es.subjectsNearReleaseButNotThereHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsNeedingRecheckBeforeDecisionHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">ריענון לפני החלטה: </span>
                {truncateHe(es.subjectsNeedingRecheckBeforeDecisionHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsWithVisiblePivotTriggerHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">סימן לשינוי כיוון זהיר: </span>
                {truncateHe(es.subjectsWithVisiblePivotTriggerHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
          </div>
        </div>
      )}
      {Boolean(String(es.crossSubjectDependencyStateLabelHe || "").trim() ||
        String(es.crossSubjectFoundationFirstPriorityHe || "").trim() ||
        (es.subjectsLikelyShowingDownstreamSymptomsHe && es.subjectsLikelyShowingDownstreamSymptomsHe.length) ||
        (es.subjectsNeedingFoundationFirstHe && es.subjectsNeedingFoundationFirstHe.length) ||
        (es.subjectsSafeForLocalInterventionHe && es.subjectsSafeForLocalInterventionHe.length)) && (
        <div className="rounded-lg border border-emerald-400/22 bg-emerald-950/10 px-3 py-2.5 pr-detailed-avoid-split">
          <h4 className="pr-detailed-subheading text-emerald-100/95 mb-1.5 border-0 pb-0">האם הקושי רחב או מצומצם?</h4>
          <div className="space-y-1 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {String(es.crossSubjectDependencyStateLabelHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">תמונה כללית: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectDependencyStateLabelHe)), 220)}
                {String(es.crossSubjectLikelyFoundationalBlockerLabelHe || "").trim()
                  ? ` · ${truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectLikelyFoundationalBlockerLabelHe)), 140)}`
                  : ""}
              </p>
            ) : null}
            {String(es.crossSubjectFoundationFirstPriorityHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה כדאי לעשות בסבב הזה: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectFoundationFirstPriorityHe)), 240)}
              </p>
            ) : null}
            {es.subjectsLikelyShowingDownstreamSymptomsHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">ייתכן שהקושי מתחיל במקום אחר: </span>
                {truncateHe(es.subjectsLikelyShowingDownstreamSymptomsHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsNeedingFoundationFirstHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">איפה מתחיל הקושי: </span>
                {truncateHe(es.subjectsNeedingFoundationFirstHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsSafeForLocalInterventionHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">נראה ממוקד בנושא הזה: </span>
                {truncateHe(es.subjectsSafeForLocalInterventionHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
          </div>
        </div>
      )}
      {es.cautionNoteHe ? (
        <div className="rounded-lg border border-rose-400/28 bg-rose-950/12 px-3 py-2.5">
          <h4 className="pr-detailed-subheading text-rose-100/95 mb-1 border-0 pb-0">זהירות</h4>
          <p className="pr-detailed-body-text text-sm m-0 leading-relaxed">
            {pr1ParentVisibleTextHe(es.cautionNoteHe)}
          </p>
        </div>
      ) : null}
      {es.overallConfidenceHe ? (
        <div>
          <h4 className="pr-detailed-subheading text-sky-200/95">עד כמה אפשר לסמוך על המסקנות?</h4>
          <p className="pr-detailed-body-text text-sm m-0 leading-relaxed">
            {pr1ParentVisibleTextHe(es.overallConfidenceHe)}
          </p>
        </div>
      ) : null}
      {es.mixedSignalNoticeHe ? (
        <div className="rounded-lg border border-violet-400/25 bg-violet-950/12 px-3 py-2">
          <p className="pr-detailed-body-text text-sm m-0 text-violet-100/95 leading-relaxed">
            {pr1ParentVisibleTextHe(es.mixedSignalNoticeHe)}
          </p>
        </div>
      ) : null}
      {!compact && (es.reportReadinessHe || es.evidenceBalanceHe) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-white/78">
          {es.reportReadinessHe ? (
            <p className="m-0 leading-relaxed">
              <span className="text-white/45 font-bold block text-[11px] mb-0.5">מוכנות הדוח</span>
              {pr1ParentVisibleTextHe(es.reportReadinessHe)}
            </p>
          ) : null}
          {es.evidenceBalanceHe ? (
            <p className="m-0 leading-relaxed">
              <span className="text-white/45 font-bold block text-[11px] mb-0.5">מה ברור יותר ומה עדיין צריך לבדוק</span>
              {pr1ParentVisibleTextHe(es.evidenceBalanceHe)}
            </p>
          ) : null}
        </div>
      ) : null}
      {es.homeFocusHe ? (
        <div>
          <h4 className="pr-detailed-subheading text-sky-200/95">מילה על הבית</h4>
          <p className="pr-detailed-body-text whitespace-pre-line leading-relaxed m-0">
            {pr1ParentVisibleTextHe(es.homeFocusHe)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function trendOverlapsDiagnosis(diagnosisHe, trendNarrativeHe) {
  const t = String(trendNarrativeHe || "").trim();
  const d = String(diagnosisHe || "").trim();
  if (!t || !d || t.length < 16) return false;
  return d.includes(t.slice(0, Math.min(28, t.length)));
}

/** Parent-facing extras only — inline, no accordion. */
export function SubjectPhase3Insights({ sp, compact }) {
  void compact;
  const letter = useMemo(() => buildSubjectParentLetterDetailedPhase1(sp), [sp]);
  const rows = [];
  const dr = String(sp?.dominantLearningRiskLabelHe || "").trim();
  if (dr) rows.push({ k: "מה כדאי לשים לב אליו", v: pr1ParentVisibleTextHe(dr) });
  const ds = String(sp?.dominantSuccessPatternLabelHe || "").trim();
  if (ds) rows.push({ k: "מה עובד טוב", v: pr1ParentVisibleTextHe(ds) });
  const wntRaw = String(sp?.whatNotToDoHe || "").trim();
  const wnt = phase1WhatNotToDoDisplayHe(wntRaw);
  if (wnt && (!letter?.closing || !String(letter.closing).includes(wnt.slice(0, 24)))) {
    rows.push({ k: "ממה כדאי להימנע עכשיו", v: truncateHe(pr1ParentVisibleTextHe(wnt), 200) });
  }
  const trLine = String(transferReadinessLineHe(sp) || "").trim();
  const trMapped = pr1CrossSubjectTransferDisplayHe(String(sp?.subjectTransferReadiness || "").trim());
  const trCombined = pr1ParentVisibleTextHe(trLine || (trMapped !== "עדיין צריך עוד תרגול כדי לקבוע." ? trMapped : ""));
  if (trCombined) {
    rows.push({ k: "האם אפשר להתקדם", v: truncateHe(trCombined, 160) });
  }

  if (!rows.length) return null;

  return (
    <div className="parent-surface-only pr-detailed-phase3-dl space-y-2 m-0 mb-2 rounded-lg border border-white/10 bg-black/10 px-2 py-2">
      {rows.map(({ k, v }) => (
        <div key={k} className="min-w-0">
          <div className="text-white/50 font-bold text-[11px] md:text-xs m-0 mb-0.5">{k}</div>
          <div className="m-0 text-white/[0.88] leading-relaxed text-[11px] md:text-sm">
            {pr1ParentVisibleTextHe(String(v))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Exclusive learning-time breakdown — screen-only, collapsed by default.
 * Add-only; does not replace parent activities / out-of-grade sections.
 * @param {{ breakdown?: object|null|undefined }} props
 */
export function LearningTimeBreakdownDetails({ breakdown }) {
  const b = normalizeLearningTimeExclusiveBreakdown(breakdown);
  if (!b) return null;

  const rows = [
    { label: "סך זמן הלמידה", value: `${formatExclusiveLearningMinutesHe(b.totalMinutes)} דק׳` },
    {
      label: "תרגול עם שאלות",
      value: `${formatExclusiveLearningMinutesHe(b.questionPracticeMinutes)} דק׳`,
    },
    { label: "שאלות שנענו", value: String(b.analyzedQuestionCount) },
    {
      label: "קריאת ספרים",
      value: `${formatExclusiveLearningMinutesHe(b.bookReadingMinutes)} דק׳`,
    },
    {
      label: "למידה פעילה נוספת",
      value: `${formatExclusiveLearningMinutesHe(b.otherActiveLearningMinutes)} דק׳`,
    },
  ];

  return (
    <details className="pr-detailed-learning-time-breakdown no-pdf no-print mb-5 md:mb-6 min-w-0 rounded-lg border border-white/10 bg-black/10">
      <summary
        id="pr-detailed-learning-time-breakdown-heading"
        className="pr-detailed-section-title cursor-pointer select-none list-none text-base md:text-lg font-extrabold tracking-tight text-white m-0 px-3 py-3 md:px-4 md:py-3.5 border-b border-white/10 [&::-webkit-details-marker]:hidden"
      >
        פירוט זמן הלמידה
      </summary>
      <div className="px-3 py-3 md:px-4 md:py-4 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-white/10">
                  <td className="p-2 font-semibold text-white/85">{row.label}</td>
                  <td className="p-2 text-white/90">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {b.bySubject.length > 0 ? (
          <div>
            <p className="pr-detailed-topic-rec-head m-0 mb-2">פירוט לפי מקצוע</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-white/15 bg-white/5">
                    <th className="p-2 font-semibold">מקצוע</th>
                    <th className="p-2 font-semibold">תרגול עם שאלות</th>
                    <th className="p-2 font-semibold">קריאת ספרים</th>
                  </tr>
                </thead>
                <tbody>
                  {b.bySubject.map((row) => (
                    <tr key={row.subjectKey} className="border-b border-white/10">
                      <td className="p-2">{row.subjectLabelHe}</td>
                      <td className="p-2">
                        {formatExclusiveLearningMinutesHe(row.questionPracticeMinutes)} דק׳
                      </td>
                      <td className="p-2">
                        {formatExclusiveLearningMinutesHe(row.bookReadingMinutes)} דק׳
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

/**
 * Parent-assigned activities in the selected period (detailed report transparency table).
 * Screen-only, collapsed by default — not part of the official print/PDF report.
 * @param {{ rows?: object[]|null|undefined }} props
 */
export function ParentAssignedActivitiesSection({ rows }) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;

  return (
    <details className="pr-detailed-parent-activities no-pdf no-print mb-5 md:mb-6 min-w-0 rounded-lg border border-white/10 bg-black/10">
      <summary
        id="pr-detailed-parent-activities-heading"
        className="pr-detailed-section-title cursor-pointer select-none list-none text-base md:text-lg font-extrabold tracking-tight text-white m-0 px-3 py-3 md:px-4 md:py-3.5 border-b border-white/10 [&::-webkit-details-marker]:hidden"
      >
        פעילויות אישיות מהורה ({list.length})
      </summary>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead>
            <tr className="border-b border-white/15 bg-white/5">
              <th className="p-2 font-semibold">פעילות</th>
              <th className="p-2 font-semibold">מקצוע</th>
              <th className="p-2 font-semibold">נושא</th>
              <th className="p-2 font-semibold">כיתה</th>
              <th className="p-2 font-semibold">תאריך</th>
              <th className="p-2 font-semibold">שאלות</th>
              <th className="p-2 font-semibold">דיוק</th>
              <th className="p-2 font-semibold">זמן (דק׳)</th>
              <th className="p-2 font-semibold">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row, idx) => (
              <tr
                key={row.activityId || `${row.subjectId}-${row.topicKey}-${idx}`}
                className="border-b border-white/10"
              >
                <td className="p-2">{row.activityLabelHe || "פעילות אישית מהורה"}</td>
                <td className="p-2">{row.subjectLabelHe || "-"}</td>
                <td className="p-2">{row.topicLabelHe || "-"}</td>
                <td className="p-2">{row.gradeLabelHe || "-"}</td>
                <td className="p-2">{row.lastActivityAtHe || "לא זמין"}</td>
                <td className="p-2">{row.questionCount ?? 0}</td>
                <td className="p-2">{row.accuracy ?? 0}%</td>
                <td className="p-2">{row.timeMinutes ?? 0}</td>
                <td className="p-2">{row.statusLabelHe || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function OutOfGradePracticeTable({ rows }) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-right">
        <thead>
          <tr className="border-b border-white/15 bg-white/5">
            <th className="p-2 font-semibold">מקצוע</th>
            <th className="p-2 font-semibold">נושא</th>
            <th className="p-2 font-semibold">כיתה</th>
            <th className="p-2 font-semibold">שאלות</th>
            <th className="p-2 font-semibold">דיוק</th>
            <th className="p-2 font-semibold">זמן (דק׳)</th>
            <th className="p-2 font-semibold">תאריך אחרון</th>
            <th className="p-2 font-semibold">מקור</th>
          </tr>
        </thead>
        <tbody>
          {list.map((row, idx) => (
            <tr
              key={row.topicRowKey || `${row.subjectId}-${row.topicLabelHe}-${idx}`}
              className="border-b border-white/10"
            >
              <td className="p-2">{row.subjectLabelHe || "-"}</td>
              <td className="p-2">{row.topicLabelHe || "-"}</td>
              <td className="p-2">{row.gradeLabelHe || "-"}</td>
              <td className="p-2">{row.questions ?? 0}</td>
              <td className="p-2">{row.accuracy ?? 0}%</td>
              <td className="p-2">{row.timeMinutes ?? 0}</td>
              <td className="p-2">{row.lastActivityAtHe || "לא זמין"}</td>
              <td className="p-2">{row.sourceLabelHe || "תרגול"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Out-of-registered-grade practice — transparency only (detailed report, screen-only).
 * @param {{ transparency?: object|null|undefined }} props
 */
export function OutOfGradePracticeSection({ transparency }) {
  const block =
    transparency && typeof transparency === "object" ? transparency : null;
  if (!block) return null;

  const advanced = Array.isArray(block.advancedPractice) ? block.advancedPractice : [];
  const foundation = Array.isArray(block.foundationPractice) ? block.foundationPractice : [];
  if (!advanced.length && !foundation.length) return null;

  const total = advanced.length + foundation.length;

  return (
    <details className="pr-detailed-out-of-grade no-pdf no-print mb-5 md:mb-6 min-w-0 rounded-lg border border-white/10 bg-black/10">
      <summary
        id="pr-detailed-out-of-grade-heading"
        className="pr-detailed-section-title cursor-pointer select-none list-none text-base md:text-lg font-extrabold tracking-tight text-white m-0 px-3 py-3 md:px-4 md:py-3.5 border-b border-white/10 [&::-webkit-details-marker]:hidden"
      >
        {block.titleHe || "תרגול מחוץ לכיתה הרשומה"} ({total})
      </summary>
      <div className="px-3 py-3 md:px-4 md:py-4 space-y-4">
        {advanced.length > 0 ? (
          <div>
            <p className="pr-detailed-topic-rec-head m-0 mb-2">תרגול מתקדם</p>
            <OutOfGradePracticeTable rows={advanced} />
          </div>
        ) : null}
        {foundation.length > 0 ? (
          <div>
            <p className="pr-detailed-topic-rec-head m-0 mb-2">יסודות קודמים</p>
            <OutOfGradePracticeTable rows={foundation} />
          </div>
        ) : null}
      </div>
    </details>
  );
}

/**
 * Parent-facing topic rows grouped by unified tier.
 * @param {{ sp: object, hideTopicRowKeysForTiers?: Set<string>, tierAllowlist?: string[]|null }} props
 */
export function SubjectTopicTierGroups({ sp, hideTopicRowKeysForTiers, tierAllowlist = null }) {
  const groups = sp?.topicGroupsByTier;
  if (!groups || typeof groups !== "object") return null;
  const defaultOrder = [
    PARENT_TOPIC_TIER.STRONG,
    PARENT_TOPIC_TIER.MONITOR,
    PARENT_TOPIC_TIER.ADVANCED_PRACTICE,
    PARENT_TOPIC_TIER.FOUNDATION_PRACTICE,
    PARENT_TOPIC_TIER.STRENGTHEN,
    PARENT_TOPIC_TIER.CLEAR_GAP,
    PARENT_TOPIC_TIER.NEEDS_GUIDANCE,
    PARENT_TOPIC_TIER.LOW_EVIDENCE,
  ];
  const order =
    Array.isArray(tierAllowlist) && tierAllowlist.length ? tierAllowlist : defaultOrder;
  // Wave 2 Fix 2.4: tiers that already get a dedicated topic recommendation card
  // (full mode only) should not repeat those same topics here.
  const tiersDedupedAgainstCards =
    hideTopicRowKeysForTiers && hideTopicRowKeysForTiers.size > 0
      ? new Set([
          PARENT_TOPIC_TIER.STRENGTHEN,
          PARENT_TOPIC_TIER.CLEAR_GAP,
          PARENT_TOPIC_TIER.ADVANCED_PRACTICE,
          PARENT_TOPIC_TIER.FOUNDATION_PRACTICE,
        ])
      : null;
  const sections = order
    .map((tier) => {
      const allRows = Array.isArray(groups[tier]) ? groups[tier] : [];
      const rows =
        tiersDedupedAgainstCards && tiersDedupedAgainstCards.has(tier)
          ? allRows.filter((row) => !hideTopicRowKeysForTiers.has(row?.topicRowKey))
          : allRows;
      if (!rows.length) return null;
      return (
        <div key={tier} className="parent-surface-only pr-detailed-topic-tier-group mb-3">
          <p className="pr-detailed-topic-rec-head">{parentTopicTierSectionTitleHe(tier)}</p>
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.topicRowKey}
                className="pr-detailed-topic-overview-item rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5"
              >
                <div className="pr-detailed-body-text font-bold text-white/95 leading-snug">
                  {row.narrativeTitleHe}
                </div>
                {row.gradeRelationSublineHe ? (
                  <p className="pr-detailed-muted text-xs m-0 mt-0.5 text-white/60">
                    {row.gradeRelationSublineHe}
                  </p>
                ) : null}
                <p className="pr-detailed-body-text text-sm m-0 mt-1.5 text-white/[0.88]">
                  {row.overviewStatusHe} · {formatTopicQuestionCountHe(row.questions)} · דיוק {row.accuracy}%
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    })
    .filter(Boolean);
  if (!sections.length) return null;
  return <div className="pr-detailed-topic-overview-block parent-surface-only space-y-1">{sections}</div>;
}

export function SubjectPrimaryActionBlock({ actionHe }) {
  const text = pr1ParentVisibleTextHe(String(actionHe || ""));
  if (!text) return null;
  return (
    <div className="parent-surface-only rounded-lg border border-amber-400/28 bg-amber-950/14 px-3 py-2.5">
      <p className="pr-detailed-mini-heading font-bold text-amber-100/95 mb-1 text-sm">
        מה כדאי לעשות במקצוע הזה
      </p>
      <p className="pr-detailed-body-text text-sm leading-relaxed m-0 text-white/[0.91]">{text}</p>
    </div>
  );
}

/** פירוט מקוצר למקצוע — רק שדות מה payload הקיים (ללא מנוע נפרד) */
export function SubjectSummaryBlock({ sp }) {
  const L = useMemo(() => buildSubjectParentLetterDetailedPhase1(sp), [sp]);
  const riskChips = useMemo(() => subjectMajorRiskLabelsHe(sp?.majorRiskFlagsAcrossRows, 4), [sp]);
  const q = Number(sp?.subjectQuestionCount) || 0;
  const a = Number(sp?.subjectAccuracy) || 0;
  return (
    <div className="pr-detailed-summary-subject pr-detailed-subject-stack min-w-0">
      <div className="pr-detailed-subject-heading">
        <h3 className="pr-detailed-subject-title text-base md:text-lg font-bold text-white m-0 tracking-tight pb-2 border-b border-white/12">
          {sp.subjectLabelHe}
        </h3>
        <p className="pr-detailed-subject-metrics text-xs md:text-sm m-0 mt-1 text-white/75">
          שאלות: {q} | דיוק: {a}%
        </p>
      </div>
      <div className="pr-detailed-subject-inner space-y-2.5 pt-3">
        <SubjectPhase3Insights sp={sp} compact />
        {L.opening ? (
          <p className="pr-detailed-body-text text-sm leading-relaxed m-0">{L.opening}</p>
        ) : null}
        {riskChips.length ? (
          <div className="flex flex-wrap gap-1">
            {riskChips.map((lab) => (
              <span
                key={lab}
                className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-400/35 bg-rose-950/25 text-rose-100/95"
              >
                {lab}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** ניקוי תצוגה הורית לטקסט שמקורו בשדות מנוע — בלי לשנות את ה-payload */
function topicStripParentClean(s) {
  let t = sanitizeEngineSnippetHe(String(s || ""));
  t = t.replace(/\u0001/g, " ");
  t = t.replace(/\bundetermined\b/gi, "");
  t = t.replace(/\bdefault_[a-z0-9_]+\b/gi, "");
  t = t.replace(
    /\b(advance_level|advance_grade_topic_only|maintain_and_strengthen|remediate_same_level|drop_one_level_topic_only|drop_one_grade_topic_only)\b/g,
    ""
  );
  t = t.replace(/\b(no_memory|light_memory|not_enough_evidence)\b/gi, "");
  t = t.replace(/\bresponseMs\b|\bretry\b|\bhint\b/gi, "");
  t = t.replace(/\blow_?confidence\b|\bmin_?questions\b|\btier\b/gi, "");
  t = t.replace(/\b[a-z][a-z0-9_]{10,}\b/g, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = normalizeParentFacingHe(t);
  if (!t) return "";
  const numericOnly = /^[\d\s.,/%\-–-]+$/u.test(t);
  if (numericOnly) return "";
  if (/^0{2,}$/u.test(t)) return "";
  return t;
}

function topicStripNorm(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** פס על המלצת נושא — עד 3 שכבות הוריות: מה ראינו / מה זה אומר / כיוון עבודה */
export function TopicRecommendationExplainStrip({ tr, suppressedLines = [] }) {
  const suppressLegacy = shouldSuppressLegacyEngineParentCopy(tr);

  const lpdSections = suppressLegacy ? buildLpdSafeTopicExplainSectionsHe(tr) : null;
  const legacySections = suppressLegacy ? null : buildTopicDiagnosticExplainSectionsHe(tr);
  const explainSections = lpdSections || legacySections;

  if (explainSections) {
    const suppressed = new Set(
      (Array.isArray(suppressedLines) ? suppressedLines : [])
        .map((x) => topicStripNorm(x))
        .filter(Boolean),
    );
    const seenRowNorm = new Set();
    const trendLine = trendV1DisplayLineHe(tr?.trendV1 || tr?.mapRow?.trendV1);
    const sectionRows = [
      explainSections.identified,
      explainSections.data,
      trendLine || null,
      explainSections.pattern,
      explainSections.meaning,
      explainSections.action,
    ].filter((body) => {
      const n = topicStripNorm(body);
      if (!n) return false;
      if (suppressed.has(n)) return false;
      if (seenRowNorm.has(n)) return false;
      seenRowNorm.add(n);
      return true;
    });

    if (!sectionRows.length) return null;

    return (
      <div
        className="pr-detailed-topic-phase2 mt-2 space-y-1.5 border-t border-white/10 pt-2"
        data-testid="parent-report-lpd-topic-explain"
      >
        {sectionRows.map((body) => (
          <p
            key={topicStripNorm(body)}
            className="pr-detailed-body-text text-[11px] md:text-xs m-0 text-white/80 leading-snug"
            {...(topicStripNorm(body) === topicStripNorm(trendLine)
              ? { "data-testid": "parent-report-topic-trend-v1" }
              : {})}
          >
            {body}
          </p>
        ))}
      </div>
    );
  }

  return null;
}
