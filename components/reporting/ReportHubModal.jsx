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
  focus: "focus",
  attention: "attention",
  subjects: "subjects",
  recommendations: "default",
};

function studentReportButton(onStudentReport, studentReportLoading) {
  if (!onStudentReport) return undefined;
  return (item) => (
    <button
      type="button"
      disabled={studentReportLoading || !item.studentId}
      onClick={() => onStudentReport(item.studentId, item)}
      className="shrink-0 rounded-lg bg-amber-500 text-black text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
      data-testid={item.studentId ? `report-open-student-${item.studentId}` : undefined}
    >
      {studentReportLoading ? "טוען…" : "דוח ילד/ה"}
    </button>
  );
}

/**
 * Layered report hub: summary first, details in stacked modals.
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
  onRowAction,
  stackZIndexBase = 0,
  scrollAreaClassName = "",
  rangeControl = null,
}) {
  const [detailId, setDetailId] = useState(null);
  const [drilldownKey, setDrilldownKey] = useState(null);
  const [studentDetailId, setStudentDetailId] = useState(null);

  useEffect(() => {
    if (!open) {
      setDetailId(null);
      setDrilldownKey(null);
      setStudentDetailId(null);
    }
  }, [open]);

  const displayTitle = viewModel?.header?.title || title;
  const detailSection = detailId && viewModel?.sections?.[detailId];
  const detailNavItem = viewModel?.navigation?.find((n) => n.id === detailId);
  const detailTitle = detailSection?.title || detailNavItem?.label || "פירוט";

  const drilldownSection = useMemo(() => {
    if (!drilldownKey || !detailId || !viewModel?.drilldowns) return null;
    const bucket = viewModel.drilldowns[detailId];
    if (!bucket) return null;
    return bucket[drilldownKey] || null;
  }, [detailId, drilldownKey, viewModel]);

  const studentDetailSection =
    studentDetailId && nestedStudentViewModel?.sections?.[studentDetailId];
  const studentDetailNav = nestedStudentViewModel?.navigation?.find(
    (n) => n.id === studentDetailId
  );
  const studentDetailTitle =
    studentDetailSection?.title || studentDetailNav?.label || "פירוט ילד/ה";

  const detailVariant = useMemo(
    () => DETAIL_VARIANT[detailId] || "default",
    [detailId]
  );
  const studentDetailVariant = useMemo(
    () => DETAIL_VARIANT[studentDetailId] || "default",
    [studentDetailId]
  );

  const studentActions = studentReportButton(onStudentReport, studentReportLoading);
  const z = Number(stackZIndexBase) || 0;

  const handleCloseAll = () => {
    setDetailId(null);
    setDrilldownKey(null);
    setStudentDetailId(null);
    onCloseStudentReport?.();
    onClose();
  };

  const handleBackFromDetail = () => {
    setDetailId(null);
    setDrilldownKey(null);
  };

  const handleBackFromDrilldown = () => {
    setDrilldownKey(null);
  };

  const handleBackFromStudentDetail = () => {
    setStudentDetailId(null);
  };

  const handleBackFromStudentMain = () => {
    setStudentDetailId(null);
    onCloseStudentReport?.();
  };

  const handleDrilldownSelect = (key) => {
    setDrilldownKey(key);
  };

  const mainOpen = Boolean(open && !detailId && !nestedStudentViewModel);
  const detailOpen = Boolean(open && detailId && detailSection && !drilldownKey && !nestedStudentViewModel);
  const drilldownOpen = Boolean(open && detailId && drilldownSection && !nestedStudentViewModel);
  const studentMainOpen = Boolean(open && nestedStudentViewModel);

  return (
    <>
      <ReportModalFrame
        open={mainOpen}
        title={displayTitle}
        subtitle={title}
        onClose={handleCloseAll}
        closeLabel="סגירה"
        zIndex={100 + z}
        scrollAreaClassName={scrollAreaClassName}
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
        {rangeControl}
        {!loading && !error && viewModel ? (
          <ReportHubSummary viewModel={viewModel} onNavigate={setDetailId} />
        ) : null}
      </ReportModalFrame>

      <ReportModalFrame
        open={detailOpen}
        title={detailTitle}
        subtitle={displayTitle}
        onClose={handleCloseAll}
        onBack={handleBackFromDetail}
        zIndex={110 + z}
        scrollAreaClassName={scrollAreaClassName}
        testId="report-hub-detail"
      >
        <ReportDetailSectionView
          section={detailSection}
          variant={detailVariant}
          studentActions={studentActions}
          onDrilldownSelect={handleDrilldownSelect}
          onRowAction={onRowAction}
          studentReportLoading={studentReportLoading}
          onStudentReport={onStudentReport}
        />
      </ReportModalFrame>

      <ReportModalFrame
        open={drilldownOpen}
        title={drilldownSection?.title || "פירוט"}
        subtitle={detailTitle}
        onClose={handleCloseAll}
        onBack={handleBackFromDrilldown}
        zIndex={115 + z}
        scrollAreaClassName={scrollAreaClassName}
        testId="report-hub-drilldown"
      >
        {drilldownSection?.subtitle ? (
          <p className="text-sm text-white/60 mb-3">{drilldownSection.subtitle}</p>
        ) : null}
        <ReportDetailSectionView
          section={{
            title: drilldownSection?.title,
            empty: "אין ילדים בקבוצה זו.",
            items: drilldownSection?.items || [],
          }}
          variant="students"
          studentActions={studentActions}
          onRowAction={onRowAction}
          studentReportLoading={studentReportLoading}
          onStudentReport={onStudentReport}
        />
      </ReportModalFrame>

      <ReportModalFrame
        open={studentMainOpen}
        title={nestedStudentViewModel?.header?.title || "דוח ילד/ה"}
        subtitle={displayTitle}
        onClose={handleCloseAll}
        onBack={handleBackFromStudentMain}
        zIndex={120 + z}
        scrollAreaClassName={scrollAreaClassName}
        testId="report-hub-student-main"
      >
        {rangeControl}
        {studentReportLoading ? (
          <p className="text-white/60 text-sm py-6 text-center">טוען דוח ילד/ה…</p>
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
        subtitle={nestedStudentViewModel?.header?.title || "דוח ילד/ה"}
        onClose={handleCloseAll}
        onBack={handleBackFromStudentDetail}
        zIndex={130 + z}
        scrollAreaClassName={scrollAreaClassName}
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
