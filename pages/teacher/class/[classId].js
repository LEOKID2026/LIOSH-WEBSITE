import { useMemo } from "react";
import Link from "next/link";
import Layout from "../../../components/Layout";
import ReportDateRangeControl from "../../../components/reporting/ReportDateRangeControl.jsx";
import SubjectSummaryCards from "../../../components/teacher-portal/SubjectSummaryCards";
import TeacherPortalShell from "../../../components/teacher-portal/TeacherPortalShell";
import TeacherClassActivitiesNav from "../../../components/teacher-portal/TeacherClassActivitiesNav";
import {
  TeacherReportError,
  TeacherReportForbidden,
  TeacherReportLoading,
} from "../../../components/teacher-portal/TeacherReportPageStates";
import {
  isTeacherClassReportResponse,
  useTeacherPortalLoad,
} from "../../../lib/teacher-portal/use-teacher-portal-session";
import { useReportDateRange } from "../../../hooks/useReportDateRange.js";
import {
  actionTypeLabelHe,
  attentionReasonHe,
  canShowClassCalmWeakTopicsMessage,
  classGuidanceSeverityTierHe,
  classHealthHe,
  CLASS_WEAK_TOPICS_FALLBACK_BANNER,
  formatPercent,
  formatTopicLineHe,
  groupTierHe,
  subjectLabelHe,
} from "../../../lib/teacher-portal/teacher-ui.he.js";

export async function getServerSideProps(context) {
  const classId = String(context.params?.classId || "").trim();
  return { props: { classId } };
}

export default function TeacherClassReportPage({ classId }) {
  const reportRange = useReportDateRange();

  const fetchPath = useMemo(() => {
    if (!classId) return "";
    const params = reportRange.buildSearchParams();
    return `/api/teacher/classes/${encodeURIComponent(classId)}/report-data?${params.toString()}`;
  }, [classId, reportRange.appliedRange.from, reportRange.appliedRange.to, reportRange.buildSearchParams]);

  const { phase, loadingHint, errorMessage, data: report, reload } = useTeacherPortalLoad({
    enabled: Boolean(classId),
    fetchPath,
    fetchTimeoutMs: 120_000,
    isValidResponse: isTeacherClassReportResponse,
  });

  if (!classId) {
    return (
      <Layout>
        <TeacherReportForbidden
          backHref="/teacher/dashboard"
          title="דוח כיתה"
          message="מזהה כיתה שגוי."
        />
      </Layout>
    );
  }

  if (phase === "loading") {
    return (
      <Layout>
        <TeacherReportLoading
          backHref="/teacher/dashboard"
          title="דוח כיתה"
          hint={loadingHint}
        />
      </Layout>
    );
  }

  if (phase === "forbidden") {
    return (
      <Layout>
        <TeacherReportForbidden
          backHref="/teacher/dashboard"
          title="דוח כיתה"
          message="אין לך הרשאה לצפות בדוח כיתה זו."
        />
      </Layout>
    );
  }

  if (phase === "error") {
    return (
      <Layout>
        <TeacherReportError
          backHref="/teacher/dashboard"
          title="דוח כיתה"
          message={errorMessage}
          onRetry={reload}
        />
      </Layout>
    );
  }

  const className = report.class?.name || "כיתה";
  const cohort = report.cohortSummary || {};
  const guidance = report.teacherGuidanceBlock || {};
  const teacherSummary = guidance.teacherSummary || {};
  const attentionList = guidance.attentionStudents || report.attentionList || [];
  const isGuidanceV2 = guidance.version === "v2";
  const classRecommendationUnits = isGuidanceV2
    ? guidance.classRecommendationUnits || []
    : [];
  const smallGroupClusters = isGuidanceV2 ? guidance.smallGroupClusters || [] : [];
  const classTier =
    guidance.guidanceSeverityTier ||
    guidance.cohortStats?.guidanceSeverityTier ||
    null;
  const classTierHe =
    (classTier && classGuidanceSeverityTierHe(classTier)) ||
    classHealthHe(teacherSummary.classHealthSignal);
  const showCalmWeakTopics = canShowClassCalmWeakTopicsMessage(guidance, report);

  const weaknessTopics = isGuidanceV2
    ? classRecommendationUnits.filter((u) => u.topicLabelHe || u.headlineHe)
    : (report.weaknessTopics || guidance.priorityTopics || []).filter((t) =>
        formatTopicLineHe(t.subject, t.topic)
      );
  const groups = guidance.suggestedGroups || {};
  const memberCount = report.roster?.activeMemberCount ?? 0;

  const reinforcement = isGuidanceV2
    ? []
    : (guidance.reinforcementSuggestions || [])
        .map((t) => {
          const line = formatTopicLineHe(t.subject, t.topic);
          return line ? `מומלץ לחזק: ${line}` : null;
        })
        .filter(Boolean);
  const extension = isGuidanceV2
    ? []
    : (guidance.extensionSuggestions || [])
        .map((t) => {
          const line = formatTopicLineHe(t.subject, t.topic);
          if (!line) return null;
          return `${line} - ביצועים טובים בכיתה (${formatPercent(t.accuracy)})`;
        })
        .filter(Boolean);

  return (
    <Layout>
      <div
        data-testid="teacher-class-report-root"
        data-state="ready"
        data-class-id={classId}
        data-report-ok="true"
        data-member-count={String(memberCount)}
      >
        <TeacherPortalShell backHref="/teacher/dashboard" title={`דוח כיתה: ${className}`}>
          <TeacherClassActivitiesNav classId={classId} />
          <ReportDateRangeControl
            presetDays={reportRange.presetDays}
            customDates={reportRange.customDates}
            startDate={reportRange.startDate}
            endDate={reportRange.endDate}
            onStartDateChange={reportRange.setStartDate}
            onEndDateChange={reportRange.setEndDate}
            rangeLabel={reportRange.rangeLabel}
            disabled={phase === "loading"}
            onPreset={(days) => reportRange.applyPreset(days)}
            onEnableCustom={() => reportRange.setCustomDates(true)}
            onApplyCustom={() => {
              const result = reportRange.applyCustom();
              if (!result.ok) alert("אנא בחר תאריכים תקינים");
            }}
            className="mb-4"
          />
          <p className="text-white/60 text-sm mb-2">
            {memberCount} ילדים פעילים
          </p>

          {memberCount === 0 ? (
            <p className="text-amber-200 text-sm mb-6">
              הכיתה ריקה - הוסף ילדים כדי לראות דוח.
            </p>
          ) : null}

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">סיכום כיתה</h2>
            {guidance.insufficientData && cohort.totalAnswers < 10 ? (
              <p className="text-white/70 text-sm">
                לא ניתן לחשב המלצות - אין מספיק נתונים בתקופה זו.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3">
                  <div>
                    <dt className="text-white/60">סה״כ מפגשי תרגול</dt>
                    <dd>{cohort.totalSessions ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-white/60">סה״כ תשובות</dt>
                    <dd>{cohort.totalAnswers ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-white/60">אחוז הצלחה ממוצע</dt>
                    <dd>{formatPercent(cohort.accuracy)}</dd>
                  </div>
                  <div>
                    <dt className="text-white/60">ילדים עם נתונים</dt>
                    <dd>{cohort.studentsWithActivity ?? 0}</dd>
                  </div>
                </dl>
                {classTierHe ? (
                  <p className="text-amber-200 text-sm">{classTierHe}</p>
                ) : null}
              </>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">ביצועי הכיתה לפי מקצוע</h2>
            <SubjectSummaryCards subjects={report.subjects} showTopics />
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">נושאים שדורשים חיזוק</h2>
            {weaknessTopics.length ? (
              <ul className="text-sm text-white/80 space-y-2">
                {weaknessTopics.slice(0, 10).map((t, i) => {
                  if (isGuidanceV2) {
                    if (t.level === "subject" && t.headlineHe) {
                      const action = actionTypeLabelHe(t.recommendedActionType);
                      return (
                        <li
                          key={t.unitId || i}
                          className="rounded border border-white/10 px-3 py-2"
                        >
                          <span className="font-medium">{t.headlineHe}</span>
                          : {t.affectedStudentCount ?? 0}/{memberCount} ילדים ·{" "}
                          {formatPercent(t.cohortAccuracyPct)} הצלחה
                          {t.actionHe ? ` · ${t.actionHe}` : action ? ` · ${action}` : ""}
                        </li>
                      );
                    }
                    const subj = subjectLabelHe(t.subject);
                    const headline = t.subtopicLabelHe
                      ? `${t.topicLabelHe} - ${t.subtopicLabelHe}`
                      : t.topicLabelHe;
                    const errPct =
                      t.cohortAccuracyPct != null
                        ? formatPercent(100 - t.cohortAccuracyPct)
                        : "-";
                    const action = actionTypeLabelHe(t.recommendedActionType);
                    return (
                      <li
                        key={t.unitId || i}
                        className="rounded border border-white/10 px-3 py-2"
                      >
                        <span className="font-medium">
                          {subj ? `${subj} - ${headline}` : headline}
                        </span>
                        : {t.affectedStudentCount ?? 0}/{memberCount} ילדים ·{" "}
                        {formatPercent(t.cohortAccuracyPct)} הצלחה · שיעור טעות {errPct}
                        {action ? ` · ${action}` : ""}
                      </li>
                    );
                  }
                  const line = formatTopicLineHe(t.subject, t.topic);
                  if (!line) return null;
                  const acc =
                    t.answers > 0
                      ? formatPercent(((t.wrong || 0) / t.answers) * 100)
                      : "-";
                  return (
                    <li key={i}>
                      {line}: {acc} שגיאות ממוצע
                      {t.studentCount ? ` · ${t.studentCount} ילדים` : ""}
                    </li>
                  );
                }).filter(Boolean)}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">
                {showCalmWeakTopics
                  ? "לא זוהו נושאים בעייתיים בתקופה זו."
                  : CLASS_WEAK_TOPICS_FALLBACK_BANNER}
              </p>
            )}
          </section>

          {isGuidanceV2 && smallGroupClusters.length > 0 ? (
            <section className="mb-6">
              <h2 className="text-lg font-semibold mb-2">קבוצות תמיכה מוצעות</h2>
              <ul className="text-sm text-white/80 space-y-2">
                {smallGroupClusters
                  .filter((c) => c.topicLabelHe)
                  .map((c, i) => (
                  <li key={i} className="rounded border border-white/10 px-3 py-2">
                    <span className="font-medium">{c.topicLabelHe}</span>
                    : {(c.studentNamesMasked || []).join(", ")}
                    {c.avgAccuracyPct != null
                      ? ` · ממוצע ${formatPercent(c.avgAccuracyPct)}`
                      : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">ילדים שדורשים מעקב</h2>
            {attentionList.length ? (
              <ul className="space-y-2">
                {attentionList.map((s) => (
                  <li
                    key={s.studentId}
                    className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium break-words">
                        {s.studentFullName || s.studentFullNameMasked}
                      </span>
                      <span className="text-white/50 mr-2 block sm:inline">
                        {(s.reasons || [])
                          .map(attentionReasonHe)
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <Link
                      href={`/teacher/student/${s.studentId}`}
                      className="text-amber-300 hover:underline shrink-0"
                    >
                      צפייה בדוח
                    </Link>
                  </li>
                ))}
              </ul>
            ) : memberCount > 0 ? (
              <p className="text-white/60 text-sm">
                כל ילדי הכיתה בסדר - אין צורך בהתערבות מיוחדת.
              </p>
            ) : null}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">קבוצות עבודה מוצעות</h2>
            {["struggling", "on_track", "advanced"].map((tier) => {
              const list = groups[tier] || [];
              if (!list.length) return null;
              return (
                <div key={tier} className="mb-2 text-sm">
                  <span className="font-semibold text-amber-200">
                    {groupTierHe(tier)} ({list.length} ילדים):
                  </span>{" "}
                  <span className="text-white/70 break-words">
                    {list.map((x) => x.studentFullName || x.studentFullNameMasked).join("، ")}
                  </span>
                </div>
              );
            })}
            {!groups.struggling?.length &&
            !groups.on_track?.length &&
            !groups.advanced?.length ? (
              <p className="text-white/60 text-sm">
                {memberCount < 3
                  ? "אין מספיק ילדים עם נתונים להרכבת קבוצות."
                  : "אין מספיק נתונים להרכבת קבוצות."}
              </p>
            ) : (
              <p className="text-xs text-white/50 mt-2">
                *קבוצות מחושבות על בסיס ביצועים - המורה מחליט סופית.
              </p>
            )}
          </section>

          {!isGuidanceV2 ? (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">מיקוד השיעור הבא</h2>
            {(guidance.nextLessonFocus || []).length ? (
              <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                {guidance.nextLessonFocus
                  .map((f, i) => {
                    const line = formatTopicLineHe(f.subject, f.topic);
                    if (!line) return null;
                    return (
                      <li key={i}>
                        {line}
                        {f.affectedStudents
                          ? ` - ${f.affectedStudents} ילדים התקשו בנושא זה`
                          : ""}
                      </li>
                    );
                  })
                  .filter(Boolean)}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">
                אין נושא בולט לשיעור הבא - המשך לפי תכנית הלימודים.
              </p>
            )}
          </section>
          ) : null}

          {!isGuidanceV2 ? (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">הצעות לחיזוק</h2>
            {reinforcement.length ? (
              <ul className="list-disc list-inside text-sm text-white/80">
                {reinforcement.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין הצעות חיזוק מיוחדות לתקופה זו.</p>
            )}
          </section>
          ) : null}

          {!isGuidanceV2 ? (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">הצעות להעשרה</h2>
            {extension.length ? (
              <ul className="list-disc list-inside text-sm text-white/80">
                {extension.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין הצעות העשרה לתקופה זו.</p>
            )}
          </section>
          ) : null}
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
