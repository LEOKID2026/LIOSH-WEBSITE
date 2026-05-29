/**
 * רכיבי פני שטח מהדוח המקיף — מופרדים ל-import בבדיקות SSR בלי Layout/router.
 * Parent Copilot Phase A: אין שינוי מבנה דוח/הדפסה כאן — שילוב Copilot רק בדף `parent-report-detailed.js`.
 */
export const PARENT_COPILOT_PHASE_A_SURFACE_TAG = "phaseA-no-layout-change";
import React, { useMemo } from "react";
import {
  buildSubjectParentLetter,
  buildSubjectParentLetterCompact,
  rewriteParentRecommendationForDetailedHe,
} from "../utils/detailed-report-parent-letter-he";
import {
  behaviorDominantLabelHe,
  learningMemoryLineHe,
  mistakePatternLineHe,
  sanitizeEngineSnippetHe,
  subjectMajorRiskLabelsHe,
  transferReadinessLineHe,
  truncateHe,
} from "../utils/parent-report-ui-explain-he";
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
  not_ready: "לא עכשיו",
  limited: "מוגבלת",
  emerging: "מתחילה",
  ready: "מוכנים לשלב הבא",
};

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
  return PR1_TRANSFER_LABEL_HE[k] || "לא ברור";
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
  const numericOnly = /^[\d\s.,/%\-–—]+$/u.test(t);
  if (numericOnly) return "";
  if (/^0{2,}$/u.test(t)) return "";
  return t;
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
          <h4 className="pr-detailed-subheading text-sky-100/95 mb-1.5 border-0 pb-0">מה לעשות עכשיו — לפי סדר</h4>
          <div className="space-y-1.5 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {es.topImmediateParentActionHe ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מה לעשות קודם: </span>
                {pr1ParentVisibleTextHe(es.topImmediateParentActionHe)}
              </p>
            ) : (
              <p className="m-0 text-white/55">אין נושא דחוף השבוע — שגרת תרגול קצרה מספיקה.</p>
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
                <span className="text-white/45 font-bold">לא דחוף עכשיו — אפשר להמתין: </span>
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
                <span className="text-white/45 font-bold">האם כדאי לשנות כיוון? </span>
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
                <span className="text-white/45 font-bold">מוכנות לשחרור זהיר: </span>
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
          <h4 className="pr-detailed-subheading text-slate-100/95 mb-1.5 border-0 pb-0">מה ניסינו לאחרונה — האם עזר?</h4>
          <div className="space-y-1 text-[11px] md:text-sm text-white/[0.86] leading-snug">
            {String(es.crossSubjectRecommendationMemoryStateLabelHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">זיכרון תומך: </span>
                {truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectRecommendationMemoryStateLabelHe)), 220)}
                {String(es.crossSubjectSupportHistoryDepthLabelHe || "").trim()
                  ? ` · ${truncateHe(pr1ParentVisibleTextHe(String(es.crossSubjectSupportHistoryDepthLabelHe)), 120)}`
                  : ""}
              </p>
            ) : null}
            {String(es.crossSubjectExpectedVsObservedMatchHe || "").trim() ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">התאמה צפי־מול־נצפה: </span>
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
                <span className="text-white/45 font-bold">מסלול קודם לא מתיישר: </span>
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
                <span className="text-white/45 font-bold">קרובים לשחרור — עדיין לא: </span>
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
                <span className="text-white/45 font-bold">אולי תסמין משנה: </span>
                {truncateHe(es.subjectsLikelyShowingDownstreamSymptomsHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsNeedingFoundationFirstHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">יסוד קודם: </span>
                {truncateHe(es.subjectsNeedingFoundationFirstHe.map(pr1ParentVisibleTextHe).join(" · "), 260)}
              </p>
            ) : null}
            {es.subjectsSafeForLocalInterventionHe?.length ? (
              <p className="m-0">
                <span className="text-white/45 font-bold">מקומי בטוח יותר: </span>
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
              <span className="text-white/45 font-bold block text-[11px] mb-0.5">מה מחזק את התמונה ומה עדיין לא ברור</span>
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

/** שדות Phase 3 — מבנה תוויות; מצמצם חזרה על מגמה אם כבר במכתב */
export function SubjectPhase3Insights({ sp, compact }) {
  const letter = useMemo(() => (compact ? null : buildSubjectParentLetter(sp)), [sp, compact]);
  const trendHidden = letter && trendOverlapsDiagnosis(letter.diagnosisHe, sp?.trendNarrativeHe);
  const homeNorm = sp?.recommendedHomeMethodHe
    ? String(rewriteParentRecommendationForDetailedHe(String(sp.recommendedHomeMethodHe)))
        .replace(/\s+/g, " ")
        .trim()
    : "";
  const letterHomeNorm = letter?.homeAction ? String(letter.homeAction).replace(/\s+/g, " ").trim() : "";
  const hideStructuredHome =
    homeNorm && letterHomeNorm && (homeNorm === letterHomeNorm || letterHomeNorm.includes(homeNorm.slice(0, 50)));

  const rows = [];
  const dr = String(sp?.dominantLearningRiskLabelHe || "").trim();
  if (dr) rows.push({ k: "אילו טעויות חוזרות כאן", v: pr1ParentVisibleTextHe(dr) });
  const ds = String(sp?.dominantSuccessPatternLabelHe || "").trim();
  if (ds) rows.push({ k: "מה נראה חזק כאן", v: pr1ParentVisibleTextHe(ds) });
  if (sp?.trendNarrativeHe && String(sp.trendNarrativeHe).trim()) {
    rows.push({
      k: "מגמה",
      v: trendHidden
        ? "מפורט במשפט האבחה למטה."
        : truncateHe(pr1ParentVisibleTextHe(String(sp.trendNarrativeHe)), compact ? 120 : 220),
    });
  }
  const conf = String(sp?.confidenceSummaryHe || "").trim();
  if (conf)
    rows.push({
      k: "עד כמה המסקנה הזו מבוססת",
      v: truncateHe(pr1ParentVisibleTextHe(conf), compact ? 100 : 200),
    });
  const beh = sp?.dominantBehaviorProfileAcrossRows;
  if (beh && String(beh).trim() && String(beh) !== "undetermined") {
    rows.push({ k: "מה קורה בדרך כלל בזמן התרגול", v: behaviorDominantLabelHe(beh) });
  }
  const fr = Number(sp?.fragileSuccessRowCount) || 0;
  const stb = Number(sp?.stableMasteryRowCount) || 0;
  if (fr > 0 || stb > 0) {
    rows.push({
      k: SUBJECT_PHASE3_ROW_LABEL_HE.topicPatternCounts,
      v: `${stb} התקדמות יציבה וטובה · ${fr} הצלחה שבירה`,
    });
  }
  const modeNote = String(sp?.modeConcentrationNoteHe || "").trim();
  if (modeNote) rows.push({ k: "ממה מתחשבים כשמתאמים תרגול", v: pr1ParentVisibleTextHe(modeNote) });
  const risks = subjectMajorRiskLabelsHe(sp?.majorRiskFlagsAcrossRows, 5);
  if (risks.length) {
    rows.push({
      k: SUBJECT_PHASE3_ROW_LABEL_HE.majorRisks,
      v: risks.map((x) => pr1ParentVisibleTextHe(String(x))).join(" · "),
    });
  }
  if (sp?.recommendedHomeMethodHe && String(sp.recommendedHomeMethodHe).trim() && !hideStructuredHome) {
    rows.push({
      k: "מה לעשות בבית (מבנה)",
      v: truncateHe(
        pr1ParentVisibleTextHe(rewriteParentRecommendationForDetailedHe(String(sp.recommendedHomeMethodHe))),
        compact ? 140 : 260
      ),
    });
  }
  const wnt = String(sp?.whatNotToDoHe || "").trim();
  if (wnt && (!letter?.closing || !String(letter.closing).includes(wnt.slice(0, 24)))) {
    rows.push({
      k: "מה להימנע ממנו",
      v: truncateHe(pr1ParentVisibleTextHe(wnt), compact ? 120 : 220),
    });
  }
  const sdn = String(sp?.subjectDoNowHe || "").trim();
  if (sdn)
    rows.push({
      k: "עכשיו (מקצוע)",
      v: truncateHe(pr1ParentVisibleTextHe(sdn), compact ? 110 : 200),
    });
  const san = String(sp?.subjectAvoidNowHe || "").trim();
  if (san)
    rows.push({
      k: "להימנע עכשיו (מקצוע)",
      v: truncateHe(pr1ParentVisibleTextHe(san), compact ? 110 : 200),
    });
  const spr = String(sp?.subjectPriorityReasonHe || "").trim();
  if (spr && (!letter?.opening || !String(letter.opening).includes(spr.slice(0, 20)))) {
    rows.push({
      k: "מה כדאי לתרגל קודם",
      v: truncateHe(pr1ParentVisibleTextHe(spr), compact ? 120 : 220),
    });
  }
  const dmp = String(sp?.dominantMistakePatternLabelHe || "").trim();
  if (dmp)
    rows.push({
      k: "סוג טעות נפוצה בנושא",
      v: truncateHe(pr1ParentVisibleTextHe(dmp), compact ? 100 : 180),
    });
  const sls = String(sp?.subjectLearningStageLabelHe || "").trim();
  if (sls)
    rows.push({
      k: "שימור למידה",
      v: truncateHe(pr1ParentVisibleTextHe(sls), compact ? 100 : 180),
    });
  const srb = String(sp?.subjectReviewBeforeAdvanceHe || "").trim();
  if (srb)
    rows.push({
      k: "לפני שמעלים רמה",
      v: truncateHe(pr1ParentVisibleTextHe(srb), compact ? 110 : 200),
    });
  const strRaw = String(sp?.subjectTransferReadiness || "").trim();
  const trLine = String(transferReadinessLineHe(sp) || "").trim();
  const trMapped = pr1CrossSubjectTransferDisplayHe(strRaw);
  const trCombined = pr1ParentVisibleTextHe(trLine || (trMapped !== "לא ברור" ? trMapped : ""));
  if (trCombined) {
    rows.push({
      k: "האם זה מצליח גם בשאלה חדשה",
      v: truncateHe(trCombined, compact ? 90 : 160),
    });
  }
  const effN = String(sp?.subjectEffectivenessNarrativeHe || "").trim();
  if (effN)
    rows.push({
      k: "מה קורה עם העזרה וההתקדמות",
      v: truncateHe(pr1ParentVisibleTextHe(effN), compact ? 130 : 240),
    });
  const sAdj = String(sp?.subjectSupportAdjustmentNeedHe || "").trim();
  if (sAdj && (!effN || !effN.includes(sAdj.slice(0, 12)))) {
    rows.push({
      k: "התאמה לשבוע הבא",
      v: truncateHe(pr1ParentVisibleTextHe(sAdj), compact ? 100 : 200),
    });
  }
  const sRec = String(sp?.subjectRecalibrationNeedHe || "").trim();
  if (sRec && sRec !== SUBJECT_V2_RECALIBRATION_NEED_NO_HE && (!effN || !effN.includes(sRec.slice(0, 10)))) {
    rows.push({
      k: "האם כדאי לשנות כיוון",
      v: truncateHe(pr1ParentVisibleTextHe(sRec), compact ? 100 : 200),
    });
  }
  const seqN = String(sp?.subjectSequenceNarrativeHe || "").trim();
  if (seqN && (!effN || !effN.includes(seqN.slice(0, 14)))) {
    rows.push({
      k: "איך העזרה מתקדמת לאורך זמן",
      v: truncateHe(pr1ParentVisibleTextHe(seqN), compact ? 130 : 240),
    });
  }
  const outN = String(sp?.subjectOutcomeNarrativeHe || "").trim();
  if (outN && (!seqN || !seqN.includes(outN.slice(0, 12)))) {
    rows.push({
      k: "מה ניסינו לאחרונה והאם זה עזר",
      v: truncateHe(pr1ParentVisibleTextHe(outN), compact ? 130 : 240),
    });
  }
  const gateN = String(sp?.subjectGateNarrativeHe || "").trim();
  if (gateN && (!outN || !outN.includes(gateN.slice(0, 14)))) {
    rows.push({
      k: "מה צריך לראות לפני ההחלטה הבאה",
      v: truncateHe(pr1ParentVisibleTextHe(gateN), compact ? 130 : 240),
    });
  }
  const depSub = String(sp?.subjectDependencyNarrativeHe || "").trim();
  if (depSub && (!gateN || !gateN.includes(depSub.slice(0, 14)))) {
    rows.push({
      k: "יסוד קודם או קושי מקומי?",
      v: truncateHe(pr1ParentVisibleTextHe(depSub), compact ? 130 : 240),
    });
  }
  const ffp = String(sp?.subjectFoundationFirstPriorityHe || "").trim();
  if (ffp && sp?.subjectFoundationFirstPriority && (!depSub || !depSub.includes(ffp.slice(0, 12)))) {
    rows.push({
      k: "מה צריך לחזק לפני הכל",
      v: truncateHe(pr1ParentVisibleTextHe(ffp), compact ? 120 : 200),
    });
  }

  if (!rows.length) return null;

  return (
    <details className="pr-detailed-phase3-details m-0 mb-2 rounded-lg border border-white/10 bg-black/10 px-2 py-2">
      <summary className="cursor-pointer text-white/70 font-semibold text-xs md:text-sm mb-1 select-none">
        פירוט מקצועי נוסף
      </summary>
      <div className="pr-detailed-phase3-dl space-y-2 m-0 mt-2">
        {rows.map(({ k, v }) => (
          <div key={k} className="min-w-0">
            <div className="text-white/50 font-bold text-[11px] md:text-xs m-0 mb-0.5">{k}</div>
            <div className="m-0 text-white/[0.88] leading-relaxed text-[11px] md:text-sm">
              {pr1ParentVisibleTextHe(String(v))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/** פירוט מקוצר למקצוע — רק שדות מה־payload הקיים (ללא מנוע נפרד) */
export function SubjectSummaryBlock({ sp }) {
  const L = useMemo(() => buildSubjectParentLetterCompact(sp), [sp]);
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
        <p className="pr-detailed-body-text text-sm leading-relaxed m-0">{L.opening}</p>
        {L.middle ? (
          <p className="pr-detailed-body-text text-sm leading-relaxed m-0 text-white/[0.86]">{L.middle}</p>
        ) : null}
        {L.homeAction ? (
          <details className="rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2.5">
            <summary className="cursor-pointer text-sm text-white/75 font-semibold select-none">
              פירוט מקצועי נוסף
            </summary>
            <p className="pr-detailed-body-text text-sm leading-relaxed m-0 mt-2 rounded-lg border border-amber-400/28 bg-amber-950/14 px-3 py-2.5">
              {L.homeAction}
            </p>
          </details>
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
        <p className="pr-detailed-body-text text-sm leading-relaxed m-0 text-white/82">{L.closing}</p>
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
  const numericOnly = /^[\d\s.,/%\-–—]+$/u.test(t);
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
  const sig = tr?.topicEngineRowSignals && typeof tr.topicEngineRowSignals === "object" ? tr.topicEngineRowSignals : null;
  const narrative =
    tr?.contractsV1?.narrative && typeof tr.contractsV1.narrative === "object" ? tr.contractsV1.narrative : null;
  const recommendation =
    tr?.contractsV1?.recommendation && typeof tr.contractsV1.recommendation === "object"
      ? tr.contractsV1.recommendation
      : null;
  const decision =
    tr?.contractsV1?.decision && typeof tr.contractsV1.decision === "object" ? tr.contractsV1.decision : null;
  const explicitContradictoryContractEvidence =
    decision?.cannotConcludeYet === true ||
    (Array.isArray(recommendation?.forbiddenBecause) &&
      recommendation.forbiddenBecause.includes("cannot_conclude_yet"));

  const mp = topicStripParentClean(mistakePatternLineHe(tr || sig) || "");
  const lm = topicStripParentClean(learningMemoryLineHe(tr || sig) || "");
  const seenRaw = [mp, lm].filter(Boolean).join(" · ");
  let seen = truncateHe(seenRaw, 224);

  const whyRaw = String(tr?.whyThisRecommendationHe || sig?.whyThisRecommendationHe || "").trim();
  let meaning = truncateHe(topicStripParentClean(whyRaw), 224);

  if (seen && meaning && topicStripNorm(seen) === topicStripNorm(meaning)) {
    meaning = "";
  }

  const canonicalAction = topicStripParentClean(
    narrative ? narrativeSectionTextHe("recommendation", narrative) || narrative?.textSlots?.action || "" : ""
  );
  const actionBlockedByContract =
    !explicitContradictoryContractEvidence &&
    (recommendation?.eligible === false || String(narrative?.recommendationIntensityCap || "") === "RI0");
  let direction = actionBlockedByContract ? "" : truncateHe(canonicalAction, 238);
  const caut = topicStripParentClean(
    narrative ? narrativeSectionTextHe("limitations", narrative) || tr?.cautionLineHe || sig?.cautionLineHe || "" : tr?.cautionLineHe || sig?.cautionLineHe || ""
  );
  if (caut) {
    direction = direction ? `${direction} שימו לב: ${truncateHe(caut, 148)}` : `שימו לב: ${truncateHe(caut, 168)}`;
  }

  if (!seen && !meaning && !direction) return null;

  const suppressed = new Set(
    (Array.isArray(suppressedLines) ? suppressedLines : [])
      .map((x) => topicStripNorm(x))
      .filter(Boolean)
  );
  const row = (label, body) =>
    body ? (
      <p className="pr-detailed-body-text text-[11px] md:text-xs m-0 text-white/80 leading-snug">
        <span className="text-white/45 font-bold">{label}</span>
        {body}
      </p>
    ) : null;

  const seenRowNorm = new Set();
  const rows = [
    { label: "מה ראינו: ", body: seen },
    { label: "מה זה אומר: ", body: meaning },
    { label: "כיוון עבודה: ", body: direction },
  ].filter((r) => {
    const n = topicStripNorm(r.body);
    if (!n) return false;
    if (suppressed.has(n)) return false;
    if (seenRowNorm.has(n)) return false;
    seenRowNorm.add(n);
    return true;
  });
  if (!rows.length) return null;

  return (
    <div className="pr-detailed-topic-phase2 mt-2 space-y-1.5 border-t border-white/10 pt-2">
      {rows.map((r) => (
        <React.Fragment key={`${r.label}-${topicStripNorm(r.body)}`}>{row(r.label, r.body)}</React.Fragment>
      ))}
    </div>
  );
}
