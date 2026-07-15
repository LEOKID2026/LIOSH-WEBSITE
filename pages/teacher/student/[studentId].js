import { useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../../../components/Layout";
import ReportDateRangeControl from "../../../components/reporting/ReportDateRangeControl.jsx";
import GuardianAccessPanel from "../../../components/teacher-portal/GuardianAccessPanel";
import StudentLoginAccessPanel from "../../../components/teacher-portal/StudentLoginAccessPanel";
import SubjectSummaryCards from "../../../components/teacher-portal/SubjectSummaryCards";
import TeacherPortalShell from "../../../components/teacher-portal/TeacherPortalShell";
import TeacherParentMessagePanel from "../../../components/teacher-portal/TeacherParentMessagePanel";
import TeacherStudentIndividualActivitiesPanel from "../../../components/teacher-portal/TeacherStudentIndividualActivitiesPanel";
import TeacherStudentDiscussionPanel from "../../../components/teacher-portal/TeacherStudentDiscussionPanel";
import TeacherStudentWorksheetsPanel from "../../../components/teacher-portal/TeacherStudentWorksheetsPanel";
import SchoolStudentDetailsPanel from "../../../components/school-portal/SchoolStudentDetailsPanel";
import { ReportModalFrame } from "../../../components/reporting/ReportModalFrame.jsx";
import {
  TeacherReportError,
  TeacherReportForbidden,
  TeacherReportLoading,
} from "../../../components/teacher-portal/TeacherReportPageStates";
import {
  isTeacherStudentReportResponse,
  useTeacherPortalLoad,
} from "../../../lib/teacher-portal/use-teacher-portal-session";
import { useReportDateRange } from "../../../hooks/useReportDateRange.js";
import {
  actionTypeLabelHe,
  assignmentTypeLabelHe,
  canShowStudentCalmFocusMessage,
  formatDateHe,
  formatPercent,
  formatStudentSubjectFallbackEvidenceHe,
  formatTopicLineHe,
  hasActionableGuidanceV2,
  riskSignalHe,
  studentGuidanceHeadlineHe,
  STUDENT_FOCUS_CALM_MESSAGE,
  STUDENT_FOCUS_FALLBACK_BANNER,
  subjectLabelHe,
  supportSuggestionHe,
} from "../../../lib/teacher-portal/teacher-ui.he.js";
import {
  SC_BTN_CLOSE_DETAILS,
  SC_BTN_STUDENT_DETAILS,
  SC_DETAILS_MODAL_TITLE,
} from "../../../lib/school-portal/school-communication.he";

export async function getServerSideProps(context) {
  const studentId = String(context.params?.studentId || "").trim();
  return { props: { studentId } };
}

export default function TeacherStudentReportPage({ studentId }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reportRange = useReportDateRange();

  const fetchPath = useMemo(() => {
    if (!studentId) return "";
    const params = reportRange.buildSearchParams();
    return `/api/teacher/students/${encodeURIComponent(studentId)}/report-data?${params.toString()}`;
  }, [studentId, reportRange.appliedRange.from, reportRange.appliedRange.to, reportRange.buildSearchParams]);

  const { phase, loadingHint, errorMessage, accessToken, data: report, reload } =
    useTeacherPortalLoad({
      enabled: Boolean(studentId),
      fetchPath,
      fetchTimeoutMs: 60_000,
      isValidResponse: isTeacherStudentReportResponse,
    });

  if (!studentId) {
    return (
      <Layout>
        <TeacherReportForbidden
          backHref="/teacher/dashboard"
          title="דוח ילד/ה"
          message="מזהה ילד/ה שגוי."
        />
      </Layout>
    );
  }

  if (phase === "loading") {
    return (
      <Layout>
        <TeacherReportLoading
          backHref="/teacher/dashboard"
          title="דוח ילד/ה"
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
          title="דוח ילד/ה"
          message="אין לך הרשאה לצפות בדוח ילד/ה זה."
        />
      </Layout>
    );
  }

  if (phase === "error" || !report) {
    return (
      <Layout>
        <TeacherReportError
          backHref="/teacher/dashboard"
          title="דוח ילד/ה"
          message={errorMessage}
          onRetry={reload}
        />
      </Layout>
    );
  }

  const studentName =
    report?.student?.full_name || report?.accountSnapshot?.displayName || "ילד/ה";
  const guidance = report?.teacherGuidanceBlock || {};
  const tg = guidance.teacherGuidance || {};
  const summary = report?.summary || {};
  const gas = report?.guardianAccessSummary || {};

  const inactiveDays = tg.inactiveDays;
  const isGuidanceV2 = guidance.version === "v2";
  const recommendationUnits = isGuidanceV2 ? guidance.recommendationUnits || [] : [];
  const topUnit = recommendationUnits[0] || null;
  const riskSignals = (guidance.riskSignals || []).map(riskSignalHe).filter(Boolean);

  const strengths = isGuidanceV2
    ? (guidance.strengthUnits || [])
        .filter((s) => s.topicLabelHe)
        .map((s) => {
          const subj = subjectLabelHe(s.subject);
          return `${subj ? `${subj} - ` : ""}${s.topicLabelHe} - ${formatPercent(s.accuracyPct)} הצלחה`;
        })
    : (guidance.strengthsForTeacher || [])
        .map((s) => {
          const line = formatTopicLineHe(s.subject, s.topic);
          return line ? `${line} - ${formatPercent(s.accuracy)} הצלחה` : null;
        })
        .filter(Boolean);

  const suggestions = isGuidanceV2
    ? (guidance.supportSuggestionsV2 || [])
        .filter((s) => s.topicLabelHe)
        .map((s) => {
          const action = actionTypeLabelHe(s.code);
          return action ? `${action} ב${s.topicLabelHe}` : null;
        })
        .filter(Boolean)
    : (guidance.supportSuggestions || []).map(supportSuggestionHe).filter(Boolean);

  const tierHeadline = isGuidanceV2 ? studentGuidanceHeadlineHe(guidance) : null;
  const showCalmFocus = canShowStudentCalmFocusMessage(guidance, report);

  const focusItems = isGuidanceV2
    ? recommendationUnits
        .filter((u) => u.topicLabelHe || u.headlineHe)
        .slice(0, 5)
        .map((u) => {
          if (u.level === "subject" && u.headlineHe) {
            const ev = u.evidenceSummary || {};
            const stats = formatStudentSubjectFallbackEvidenceHe(
              ev.accuracyPct,
              ev.totalAnswers
            );
            return `${u.headlineHe} · ${stats}`;
          }
          const subj = subjectLabelHe(u.subject);
          const headline = u.subtopicLabelHe
            ? `${u.topicLabelHe} - ${u.subtopicLabelHe}`
            : u.topicLabelHe;
          const stats = `${u.evidenceSummary?.wrongCount ?? 0} טעויות מ-${u.evidenceSummary?.totalAnswers ?? 0} תשובות · ${formatPercent(u.evidenceSummary?.accuracyPct)} הצלחה`;
          return subj ? `${subj} - ${headline} · ${stats}` : `${headline} · ${stats}`;
        })
    : (guidance.nextPracticeFocus || [])
        .map((f) => {
          const line = formatTopicLineHe(f.subject, f.topic);
          return line || null;
        })
        .filter(Boolean);

  return (
    <Layout>
      <div
        data-testid="teacher-student-report-root"
        data-state="ready"
        data-student-id={studentId}
        data-report-ok="true"
      >
        <TeacherPortalShell backHref="/teacher/dashboard" title={`דוח ילד/ה: ${studentName}`}>
          <div className="mb-4 flex flex-wrap gap-3">
            <Link
              href={`/teacher/student/${encodeURIComponent(studentId)}/parent-report`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded border border-white/25 text-sm font-semibold px-4 py-2 hover:bg-white/10"
            >
              דוח להורים
            </Link>
            <Link
              href={`/teacher/worksheets/new?studentId=${encodeURIComponent(studentId)}`}
              className="inline-flex rounded border border-violet-400/40 bg-violet-500/15 text-sm font-semibold px-4 py-2 text-violet-100 hover:bg-violet-500/25"
              data-testid="teacher-student-new-worksheet-link"
            >
              דף עבודה חדש
            </Link>
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="inline-flex rounded border border-white/25 text-sm font-semibold px-4 py-2 hover:bg-white/10"
              data-testid="teacher-student-details-button"
            >
              {SC_BTN_STUDENT_DETAILS}
            </button>
          </div>
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
            className="mb-6"
          />

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">סיכום</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <dt className="text-white/60">מפגשי תרגול</dt>
                <dd className="font-semibold">{summary.totalSessions ?? 0}</dd>
              </div>
              <div>
                <dt className="text-white/60">תשובות</dt>
                <dd className="font-semibold">{summary.totalAnswers ?? 0}</dd>
              </div>
              <div>
                <dt className="text-white/60">אחוז הצלחה</dt>
                <dd className="font-semibold">{formatPercent(summary.accuracy)}</dd>
              </div>
              <div>
                <dt className="text-white/60">פעילות אחרונה</dt>
                <dd className="font-semibold">
                  {tg.lastActivityDate ? formatDateHe(tg.lastActivityDate) : "-"}
                </dd>
              </div>
            </dl>
            {inactiveDays != null && inactiveDays >= 7 ? (
              <p className="mt-3 text-amber-200 text-sm">
                הילד/ה לא תרגל ביותר מ-7 ימים.
              </p>
            ) : null}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">ביצועים לפי מקצוע</h2>
            <SubjectSummaryCards subjects={report.subjects} />
          </section>

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">המלצות לי כמורה</h2>
            {guidance.insufficientData ? (
              <p className="text-white/70 text-sm">אין מספיק נתונים לניתוח</p>
            ) : isGuidanceV2 && (hasActionableGuidanceV2(guidance) || tierHeadline) ? (
              <div className="space-y-3">
                {tierHeadline ? (
                  <p className="text-amber-200 mb-2">{tierHeadline}</p>
                ) : null}
                {inactiveDays != null && inactiveDays >= 7 ? (
                  <p className="text-amber-200 text-sm mb-2">
                    הילד/ה לא תרגל ביותר מ-7 ימים - מומלץ לעקוב.
                  </p>
                ) : null}
                {recommendationUnits.slice(0, 5).map((u) => {
                  const subj = subjectLabelHe(u.subject);
                  const ev = u.evidenceSummary || {};
                  if (u.level === "subject" && u.headlineHe) {
                    const action = actionTypeLabelHe(u.recommendedActionType);
                    return (
                      <div
                        key={u.unitId}
                        className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm space-y-1"
                      >
                        <p className="font-semibold text-amber-100">{u.headlineHe}</p>
                        <p className="text-white/75">
                          {formatStudentSubjectFallbackEvidenceHe(
                            ev.accuracyPct,
                            ev.totalAnswers
                          )}
                        </p>
                        {u.actionHe ? (
                          <p className="text-emerald-200/90">{u.actionHe}</p>
                        ) : action ? (
                          <p className="text-emerald-200/90">{action}</p>
                        ) : null}
                      </div>
                    );
                  }
                  const headline = u.subtopicLabelHe
                    ? `${u.topicLabelHe} - ${u.subtopicLabelHe}`
                    : u.topicLabelHe;
                  let recurrenceLine = null;
                  if (ev.recurrenceSignal === "full" && ev.recurrenceDays) {
                    recurrenceLine = `חוזר ב-${ev.recurrenceDays} מפגשים`;
                  } else if (ev.recurrenceSignal === "partial" && ev.recurrenceDays) {
                    recurrenceLine = `נראה ב-${ev.recurrenceDays} מפגשים`;
                  }
                  const action = actionTypeLabelHe(u.recommendedActionType);
                  const assignment = assignmentTypeLabelHe(u.suggestedAssignmentType);
                  return (
                    <div
                      key={u.unitId}
                      className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm space-y-1"
                    >
                      <p className="font-semibold text-amber-100">
                        {subj ? `${subj} - ${headline}` : headline}
                      </p>
                      <p className="text-white/75">
                        {ev.wrongCount ?? 0} טעויות מ-{ev.totalAnswers ?? 0} תשובות ·{" "}
                        {formatPercent(ev.accuracyPct)} הצלחה
                      </p>
                      {recurrenceLine ? (
                        <p className="text-white/60">{recurrenceLine}</p>
                      ) : null}
                      {action ? <p className="text-emerald-200/90">{action}</p> : null}
                      {assignment ? (
                        <p className="text-white/50 text-xs">{assignment}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {tierHeadline ? (
                  <p className="text-amber-200 mb-2">{tierHeadline}</p>
                ) : null}
                {inactiveDays != null && inactiveDays >= 7 ? (
                  <p className="text-amber-200 text-sm mb-2">
                    הילד/ה לא תרגל ביותר מ-7 ימים - מומלץ לעקוב.
                  </p>
                ) : null}
              </>
            )}
          </section>

          {isGuidanceV2 &&
          topUnit?.recentMistakeExamples?.length > 0 &&
          !guidance.insufficientData ? (
            <section className="mb-6">
              <h2 className="text-lg font-semibold mb-2">דוגמאות טעויות אחרונות</h2>
              <ul className="text-sm text-white/80 space-y-2">
                {topUnit.recentMistakeExamples.slice(0, 2).map((ex, i) => {
                  const prompt =
                    ex.prompt && ex.prompt.length > 80
                      ? `${ex.prompt.slice(0, 80)}…`
                      : ex.prompt || "-";
                  return (
                    <li key={i} className="rounded border border-white/10 px-3 py-2">
                      {prompt} → {ex.userAnswer || "-"} (נכון: {ex.expectedAnswer || "-"})
                      {ex.date ? ` · ${formatDateHe(ex.date)}` : ""}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">על מה להתמקד בתרגול הבא</h2>
            {focusItems.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {focusItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">
                {showCalmFocus ? STUDENT_FOCUS_CALM_MESSAGE : STUDENT_FOCUS_FALLBACK_BANNER}
              </p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">אותות אזהרה</h2>
            {riskSignals.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {riskSignals.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">לא זוהו אותות אזהרה בתקופה זו.</p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">חוזקות</h2>
            {strengths.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {strengths.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין מספיק נתונים להצגת חוזקות.</p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">הצעות לתמיכה</h2>
            {suggestions.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {suggestions.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין הצעות מיוחדות לתקופה זו.</p>
            )}
          </section>

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-2">גישת הורה - סיכום</h2>
            {gas.active > 0 ? (
              <p className="text-emerald-300 text-sm">גישה פעילה ({gas.active})</p>
            ) : gas.expired > 0 ? (
              <p className="text-amber-300 text-sm">גישה פגת תוקף</p>
            ) : gas.revoked > 0 ? (
              <p className="text-white/60 text-sm">גישה בוטלה</p>
            ) : (
              <p className="text-white/70 text-sm">לא הוגדרה גישת הורה לילד/ה זה.</p>
            )}
          </section>

          {phase === "ready" && accessToken ? (
            <>
              <TeacherStudentIndividualActivitiesPanel
                accessToken={accessToken}
                studentId={studentId}
                gradeLevel={report?.student?.grade_level || report?.student?.gradeLevel}
              />
              <TeacherStudentDiscussionPanel
                accessToken={accessToken}
                studentId={studentId}
                gradeLevel={report?.student?.grade_level || report?.student?.gradeLevel}
              />
              <TeacherStudentWorksheetsPanel accessToken={accessToken} studentId={studentId} />
              <TeacherParentMessagePanel accessToken={accessToken} studentId={studentId} />
              <StudentLoginAccessPanel accessToken={accessToken} studentId={studentId} />
              <GuardianAccessPanel accessToken={accessToken} studentId={studentId} />
            </>
          ) : null}

          <ReportModalFrame
            open={detailsOpen}
            title={SC_DETAILS_MODAL_TITLE}
            subtitle={studentName}
            onClose={() => setDetailsOpen(false)}
            closeLabel={SC_BTN_CLOSE_DETAILS}
            testId="teacher-student-details-modal"
          >
            <SchoolStudentDetailsPanel
              accessToken={accessToken}
              portal="teacher"
              studentId={studentId}
              studentName={studentName}
              gradeLevel={report?.student?.grade_level || report?.student?.gradeLevel || null}
              physicalClassName={report?.student?.physicalClassName || null}
              canEdit={false}
              canViewNationalIds={false}
              showAuditFooter={false}
            />
          </ReportModalFrame>
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
