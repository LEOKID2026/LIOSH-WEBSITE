import { useEffect, useMemo, useState } from "react";
import { ReportModalFrame } from "./ReportModalFrame.jsx";
import {
  ReportDetailSectionView,
  ReportHubSummary,
} from "./ReportHubBody.jsx";

const DETAIL_VARIANT = {
  activities: "activities",
  students: "students",
  distribution: "distribution",
  focus: "default",
  attention: "default",
  subjects: "subjects",
  recommendations: "default",
};

/**
 * Layered report hub: summary first, details in stacked modals.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   onClose: () => void,
 *   loading?: boolean,
 *   loadingLabel?: string,
 *   error?: string,
 *   viewModel?: object|null,
 *   onStudentReport?: (studentId: string) => void|Promise<void>,
 *   studentReportLoading?: boolean,
 *   nestedStudentViewModel?: object|null,
 *   onCloseStudentReport?: () => void,
 * }} props
 */
export default function ReportHubModal({
  open,
  title,
  onClose,
  loading = false,
  loadingLabel = "טוען דוח…",
  error = "",
  viewModel = null,
  onStudentReport,
  studentReportLoading = false,
  nestedStudentViewModel = null,
  onCloseStudentReport,
}) {
  const [detailId, setDetailId] = useState(null);
  const [studentDetailId, setStudentDetailId] = useState(null);

  useEffect(() => {
    if (!open) {
      setDetailId(null);
      setStudentDetailId(null);
    }
  }, [open]);

  const displayTitle = viewModel?.header?.title || title;
  const detailSection = detailId && viewModel?.sections?.[detailId];
  const detailNavItem = viewModel?.navigation?.find((n) => n.id === detailId);
  const detailTitle = detailSection?.title || detailNavItem?.label || "פירוט";

  const studentDetailSection =
    studentDetailId && nestedStudentViewModel?.sections?.[studentDetailId];
  const studentDetailNav = nestedStudentViewModel?.navigation?.find(
    (n) => n.id === studentDetailId
  );
  const studentDetailTitle =
    studentDetailSection?.title || studentDetailNav?.label || "פירוט תלמיד";

  const detailVariant = useMemo(
    () => DETAIL_VARIANT[detailId] || "default",
    [detailId]
  );
  const studentDetailVariant = useMemo(
    () => DETAIL_VARIANT[studentDetailId] || "default",
    [studentDetailId]
  );

  const handleCloseAll = () => {
    setDetailId(null);
    setStudentDetailId(null);
    onCloseStudentReport?.();
    onClose();
  };

  const handleBackFromDetail = () => {
    setDetailId(null);
  };

  const handleBackFromStudentDetail = () => {
    setStudentDetailId(null);
  };

  const handleBackFromStudentMain = () => {
    setStudentDetailId(null);
    onCloseStudentReport?.();
  };

  return (
    <>
      <ReportModalFrame
        open={Boolean(open && !detailId && !nestedStudentViewModel)}
        title={displayTitle}
        subtitle={title}
        onClose={handleCloseAll}
        closeLabel="סגירה"
        zIndex={100}
        testId="report-hub-main"
      >
        {loading ? (
          <p className="text-white/60 text-sm py-8 text-center">{loadingLabel}</p>
        ) : null}
        {!loading && error ? (
          <p className="text-red-300 text-sm py-4" role="alert">
            {error}
          </p>
        ) : null}
        {!loading && !error && viewModel ? (
          <ReportHubSummary viewModel={viewModel} onNavigate={setDetailId} />
        ) : null}
      </ReportModalFrame>

      <ReportModalFrame
        open={Boolean(open && detailId && detailSection && !nestedStudentViewModel)}
        title={detailTitle}
        subtitle={displayTitle}
        onClose={handleCloseAll}
        onBack={handleBackFromDetail}
        zIndex={110}
        testId="report-hub-detail"
      >
        <ReportDetailSectionView
          section={detailSection}
          variant={detailVariant}
          studentActions={
            detailId === "students" && onStudentReport
              ? (item) => (
                  <button
                    type="button"
                    disabled={studentReportLoading || !item.studentId}
                    onClick={() => onStudentReport(item.studentId)}
                    className="shrink-0 rounded-lg bg-amber-500 text-black text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
                    data-testid={`report-open-student-${item.studentId}`}
                  >
                    {studentReportLoading ? "טוען…" : "דוח תלמיד"}
                  </button>
                )
              : undefined
          }
        />
      </ReportModalFrame>

      <ReportModalFrame
        open={Boolean(open && nestedStudentViewModel)}
        title={nestedStudentViewModel?.header?.title || "דוח תלמיד"}
        subtitle="דוח תלמיד"
        onClose={handleCloseAll}
        onBack={detailId === "students" ? handleBackFromStudentMain : undefined}
        zIndex={120}
        testId="report-hub-student-main"
      >
        {studentReportLoading ? (
          <p className="text-white/60 text-sm py-6 text-center">טוען דוח תלמיד…</p>
        ) : (
          <ReportHubSummary
            viewModel={nestedStudentViewModel}
            onNavigate={setStudentDetailId}
          />
        )}
      </ReportModalFrame>

      <ReportModalFrame
        open={Boolean(open && nestedStudentViewModel && studentDetailId && studentDetailSection)}
        title={studentDetailTitle}
        subtitle={nestedStudentViewModel?.header?.title || "דוח תלמיד"}
        onClose={handleCloseAll}
        onBack={handleBackFromStudentDetail}
        zIndex={130}
        testId="report-hub-student-detail"
      >
        <ReportDetailSectionView
          section={studentDetailSection}
          variant={studentDetailVariant}
        />
      </ReportModalFrame>
    </>
  );
}
