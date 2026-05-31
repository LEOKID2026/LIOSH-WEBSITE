#!/usr/bin/env node
/**
 * Static checks for school operator portal wiring.
 */
import fs from "node:fs/promises";

const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
}

async function read(rel) {
  try {
    return await fs.readFile(rel, "utf8");
  } catch {
    return "";
  }
}

async function main() {
  const dashboard = await read("pages/school/operator/dashboard.js");
  const shell = await read("components/school-portal/SchoolPortalShell.jsx");
  const students = await read("pages/school/students/index.js");
  const browseSummary = await read("pages/api/school/students/browse-summary.js");
  const studentsApi = await read("pages/api/school/students/index.js");
  const grants = await read("lib/school-portal/operator-grants.js");

  record(
    "operator_dashboard_uses_portal_shell",
    dashboard.includes("SchoolPortalShell") && dashboard.includes('portalRole="school_operator"'),
    "operator dashboard uses SchoolPortalShell"
  );

  record(
    "operator_dashboard_access_admin_workspace",
    dashboard.includes("school-operator-access-admin-workspace") &&
      dashboard.includes("SCHOOL_OPERATOR_ACCESS_ADMIN_SECTION"),
    "access-admin workspace card"
  );

  record(
    "operator_dashboard_no_permissions_state",
    dashboard.includes("school-operator-no-permissions") &&
      dashboard.includes("SCHOOL_OPERATOR_NO_PERMISSIONS_DETAIL"),
    "no-permissions Hebrew state"
  );

  record(
    "operator_shell_grant_nav",
    shell.includes("buildOperatorNavItems") && shell.includes("SCHOOL_NAV_OPERATOR_DASHBOARD"),
    "operator nav items"
  );

  record(
    "students_page_operator_grants_helper",
    students.includes("getOperatorGrants") && students.includes("me?.operator?.grants") === false,
    "students page uses operator grant helper"
  );

  record(
    "students_page_grant_gated_actions",
    students.includes("canManageAccess") &&
      students.includes("canViewReports") &&
      students.includes("hasSchoolPortalSession") &&
      students.includes("openStudentAccess"),
    "grant-gated student actions"
  );

  record(
    "students_page_manager_only_enroll",
    students.includes("isManager ? (") && students.includes("SchoolStudentCreateForm"),
    "create/enroll manager-only"
  );

  record(
    "browse_summary_operator_context",
    browseSummary.includes("requireSchoolStudentBrowseApiContext"),
    "browse-summary allows operator browse"
  );

  record(
    "students_get_operator_context",
    studentsApi.includes("requireSchoolStudentBrowseApiContext") &&
      studentsApi.includes('req.method === "GET"'),
    "students GET allows operator browse"
  );

  const studentsServer = await read("lib/school-server/school-students.server.js");
  const schoolRequest = await read("lib/school-server/school-request.server.js");
  const drilldown = await read("lib/school-portal/school-drilldown.js");

  record(
    "browse_summary_visible_student_scope",
    studentsServer.includes("loadSchoolVisibleStudentIds"),
    "browse summary uses full school-visible student scope"
  );

  record(
    "school_portal_grade_normalization",
    drilldown.includes("schoolPortalGradeLevel"),
    "portal grade normalization helper"
  );

  record(
    "staff_session_preferred_school_membership",
    schoolRequest.includes("schoolMembershipLookupOptions"),
    "staff cookie prefers session school_id"
  );

  record(
    "browse_cache_error_invalidation",
    students.includes("deleteSchoolCacheEntry") && students.includes('authMethod !== "staff_cookie"'),
    "browse errors clear stale cache"
  );

  record(
    "class_roster_staff_cookie_load",
    students.includes("loadClassStudents") &&
      students.includes("authMethod !== \"staff_cookie\"") &&
      students.match(/loadClassStudents[\s\S]*applyRosterResult/),
    "class roster fetch works with staff cookie"
  );

  record(
    "operator_report_staff_cookie",
    students.includes("hasSchoolPortalSession") &&
      students.match(/openStudentReport[\s\S]*hasSchoolPortalSession/),
    "student report opens with staff cookie"
  );

  record(
    "operator_access_panel_staff_cookie",
    (await read("components/school-portal/SchoolReportModal.jsx")).includes("hasSchoolPortalSession") &&
      (await read("components/school-portal/SchoolStudentAccessPanel.jsx")).includes("hasSchoolPortalSession"),
    "access/report modals work with staff cookie"
  );

  record(
    "operator_grants_helpers",
    grants.includes("canManageStudentAccess") && grants.includes("canViewStudentData"),
    "shared grant helpers"
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nSchool operator portal matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
