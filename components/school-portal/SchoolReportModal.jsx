import { useEffect, useState } from "react";
import ReportHubModal from "../reporting/ReportHubModal.jsx";
import { ReportModalFrame } from "../reporting/ReportModalFrame.jsx";
import SchoolStudentAccessPanel from "./SchoolStudentAccessPanel";
import SchoolStudentAssignmentPanel from "./SchoolStudentAssignmentPanel";
import {
  SC_TAB_ACCESS_ACCOUNTS,
  SC_TAB_LEARNING_REPORT,
  SC_TAB_STUDENT_ASSIGNMENT,
} from "../../lib/school-portal/school-communication.he";
import { SCHOOL_PORTAL_MODAL_SCROLL_CLASS } from "./SchoolPortalUi";

function tabClass(active) {
  return active
    ? "flex-1 rounded-md bg-amber-500/25 text-amber-100 text-sm font-semibold py-2 cursor-pointer"
    : "flex-1 rounded-md text-white/60 text-sm py-2 hover:text-white cursor-pointer";
}

function TabBar({ activeTab, onTabChange, showAccessTab, showAssignmentTab }) {
  return (
    <div
      className="flex gap-2 rounded-lg border border-white/15 bg-[#1a1208]/95 p-1 mb-3"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "report"}
        className={tabClass(activeTab === "report")}
        onClick={() => onTabChange("report")}
      >
        {SC_TAB_LEARNING_REPORT}
      </button>
      {showAssignmentTab ? (
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "assignment"}
          className={tabClass(activeTab === "assignment")}
          onClick={() => onTabChange("assignment")}
          data-testid="school-report-tab-assignment"
        >
          {SC_TAB_STUDENT_ASSIGNMENT}
        </button>
      ) : null}
      {showAccessTab ? (
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "access"}
          className={tabClass(activeTab === "access")}
          onClick={() => onTabChange("access")}
        >
          {SC_TAB_ACCESS_ACCOUNTS}
        </button>
      ) : null}
    </div>
  );
}

/**
 * School manager report hub with Learning Report + optional assignment / access tabs.
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
  canManageAssignment = false,
  onAssignmentUpdated,
}) {
  const [activeTab, setActiveTab] = useState("report");
  const nestedStudentId = nestedStudentViewModel?.meta?.studentId || null;
  const effectiveStudentId = studentId || nestedStudentId;
  const effectiveStudentName =
    studentName || nestedStudentViewModel?.meta?.displayName || nestedStudentViewModel?.header?.title || "";
  const showAccessTab = Boolean(accessToken && effectiveStudentId);
  const showAssignmentTab = Boolean(canManageAssignment && accessToken && effectiveStudentId);
  const showExtraTabs = showAccessTab || showAssignmentTab;
  const accessPanelOpen =
    open && activeTab === "access" && (Boolean(studentId) || Boolean(nestedStudentViewModel));
  const assignmentPanelOpen =
    open && activeTab === "assignment" && (Boolean(studentId) || Boolean(nestedStudentViewModel));
  const z = Number(stackZIndexBase) || 0;

  useEffect(() => {
    if (!open) setActiveTab("report");
  }, [open]);

  if (!showExtraTabs) {
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
        scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
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
            <TabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              showAccessTab={showAccessTab}
              showAssignmentTab={showAssignmentTab}
            />
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
        scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
      />

      <ReportModalFrame
        open={assignmentPanelOpen}
        title={nestedStudentViewModel?.header?.title || title}
        subtitle={SC_TAB_STUDENT_ASSIGNMENT}
        onClose={onClose}
        zIndex={100 + z}
        scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
        testId="school-student-assignment-modal"
      >
        <SchoolStudentAssignmentPanel
          accessToken={accessToken}
          studentId={effectiveStudentId}
          studentName={effectiveStudentName}
          onUpdated={onAssignmentUpdated}
        />
      </ReportModalFrame>

      <ReportModalFrame
        open={accessPanelOpen}
        title={nestedStudentViewModel?.header?.title || title}
        subtitle={SC_TAB_ACCESS_ACCOUNTS}
        onClose={onClose}
        zIndex={100 + z}
        scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
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
