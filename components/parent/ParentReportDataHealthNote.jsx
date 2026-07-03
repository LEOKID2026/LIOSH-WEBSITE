/**
 * Consolidated thin-data / data-quality messaging for parent reports.
 * @param {{
 *   diagnosticOverviewHe?: { thinEvidenceSubjectsHe?: string[], notPracticedSubjectsSummaryHe?: string | null } | null,
 *   dataQualityNoteHe?: string | null,
 *   mixedGradePracticeNoteHe?: string | null,
 *   className?: string,
 * }} props
 */
export default function ParentReportDataHealthNote({
  diagnosticOverviewHe = null,
  dataQualityNoteHe = null,
  mixedGradePracticeNoteHe = null,
  className = "",
}) {
  const thinEvidenceSubjectsHe = Array.isArray(diagnosticOverviewHe?.thinEvidenceSubjectsHe)
    ? diagnosticOverviewHe.thinEvidenceSubjectsHe.filter(Boolean)
    : [];
  const hasContent =
    thinEvidenceSubjectsHe.length > 0 ||
    !!dataQualityNoteHe ||
    !!mixedGradePracticeNoteHe;

  if (!hasContent) return null;

  return (
    <div
      className={`mb-3 md:mb-5 avoid-break rounded-lg border border-sky-400/25 bg-sky-950/15 p-3 md:p-4 text-sm text-white/90 space-y-2 ${className}`}
      data-testid="parent-report-data-health-note"
      dir="rtl"
      lang="he"
    >
      <p className="font-bold text-sky-100/95 m-0 text-sm md:text-base">מצב הנתונים בדוח</p>
      {thinEvidenceSubjectsHe.length > 0 ? (
        <p className="m-0 leading-relaxed text-white/50 text-xs md:text-sm">
          נתונים מצומצמים במקצועות: {thinEvidenceSubjectsHe.join(" · ")}
        </p>
      ) : null}
      {dataQualityNoteHe ? (
        <p className="m-0 leading-relaxed text-amber-200/90 text-xs md:text-sm">{dataQualityNoteHe}</p>
      ) : null}
      {mixedGradePracticeNoteHe ? (
        <p className="m-0 leading-relaxed text-amber-100/95 text-xs md:text-sm">{mixedGradePracticeNoteHe}</p>
      ) : null}
    </div>
  );
}
