import ReportHubModal from "../reporting/ReportHubModal.jsx";

/**
 * School manager / teacher shared report hub (summary-first, detail modals).
 */
export default function SchoolReportModal({
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
  return (
    <ReportHubModal
      open={open}
      title={title}
      onClose={onClose}
      loading={loading}
      loadingLabel={loadingLabel}
      error={error}
      viewModel={viewModel}
      onStudentReport={onStudentReport}
      studentReportLoading={studentReportLoading}
      nestedStudentViewModel={nestedStudentViewModel}
      onCloseStudentReport={onCloseStudentReport}
    />
  );
}
