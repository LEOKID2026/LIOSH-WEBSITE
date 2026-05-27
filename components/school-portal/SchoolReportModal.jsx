import { useEffect, useState } from "react";
import ReportHubModal from "../reporting/ReportHubModal.jsx";
import { ReportModalFrame } from "../reporting/ReportModalFrame.jsx";
import SchoolStudentAccessPanel from "./SchoolStudentAccessPanel";
import {
  SC_TAB_ACCESS_ACCOUNTS,
  SC_TAB_LEARNING_REPORT,
} from "../../lib/school-portal/school-communication.he";

function TabBar({ activeTab, onTabChange }) {
  return (
    <div
      className="flex gap-2 rounded-lg border border-white/15 bg-[#1a1208]/95 p-1 mb-3"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "report"}
        className={
          activeTab === "report"
            ? "flex-1 rounded-md bg-amber-500/25 text-amber-100 text-sm font-semibold py-2 cursor-pointer"
            : "flex-1 rounded-md text-white/60 text-sm py-2 hover:text-white cursor-pointer"
        }
        onClick={() => onTabChange("report")}
      >
        {SC_TAB_LEARNING_REPORT}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "access"}
        className={
          activeTab === "access"
            ? "flex-1 rounded-md bg-amber-500/25 text-amber-100 text-sm font-semibold py-2 cursor-pointer"
            : "flex-1 rounded-md text-white/60 text-sm py-2 hover:text-white cursor-pointer"
        }
        onClick={() => onTabChange("access")}
      >
        {SC_TAB_ACCESS_ACCOUNTS}
      </button>
    </div>
  );
}

/**
 * School manager report hub with Learning Report + Access & Accounts tabs.
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
  onRowAction,
  stackZIndexBase = 0,
  accessToken = null,
  studentId = null,
  studentName = "",
}) {
  const [activeTab, setActiveTab] = useState("report");
  const nestedStudentId = nestedStudentViewModel?.meta?.studentId || null;
  const effectiveStudentId = studentId || nestedStudentId;
  const effectiveStudentName =
    studentName || nestedStudentViewModel?.meta?.displayName || nestedStudentViewModel?.header?.title || "";
  const showAccessTab = Boolean(accessToken && effectiveStudentId);
  const accessPanelOpen =
    open && activeTab === "access" && (Boolean(studentId) || Boolean(nestedStudentViewModel));
  const z = Number(stackZIndexBase) || 0;

  useEffect(() => {
    if (!open) setActiveTab("report");
  }, [open]);

  if (!showAccessTab) {
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
        onRowAction={onRowAction}
        stackZIndexBase={stackZIndexBase}
      />
    );
  }

  return (
    <>
      {open ? (
        <div
          className="fixed inset-x-0 flex justify-center px-3 sm:px-6 pointer-events-none"
          style={{ zIndex: 105 + z, top: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <div className="w-full max-w-2xl pointer-events-auto">
            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>
      ) : null}

      <ReportHubModal
        open={open && activeTab === "report"}
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
        onRowAction={onRowAction}
        stackZIndexBase={stackZIndexBase}
      />

      <ReportModalFrame
        open={accessPanelOpen}
        title={nestedStudentViewModel?.header?.title || title}
        subtitle={SC_TAB_ACCESS_ACCOUNTS}
        onClose={onClose}
        zIndex={100 + z}
        testId="school-student-access-modal"
      >
        <SchoolStudentAccessPanel
          accessToken={accessToken}
          studentId={effectiveStudentId}
          studentName={effectiveStudentName}
        />
      </ReportModalFrame>
    </>
  );
}
