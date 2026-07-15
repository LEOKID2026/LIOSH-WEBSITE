#!/usr/bin/env node
/**
 * Guard: admin/school lifecycle & operator UI must not show visible English or raw keys.
 */
import fs from "node:fs/promises";
import {
  personaLabelHe,
  entitlementStatusLabelHe,
  planCodeLabelHe,
  ADMIN_LIFECYCLE_SECTION,
  ADMIN_LIFECYCLE_SUSPEND,
  ADMIN_SCHOOL_LIFECYCLE_SECTION,
} from "../../lib/admin-portal/admin-ui.he.js";
import { schoolStaffPersonaLabel } from "../../lib/admin-portal/admin-lifecycle-ui.js";
import { operatorGrantLabel } from "../../lib/school-portal/operator-grant-labels.js";

const LIFECYCLE_UI_FILES = [
  "components/admin/AdminUserLifecyclePanel.jsx",
  "components/admin/AdminSchoolLifecyclePanel.jsx",
  "components/admin/AdminSchoolStaffLifecycleCompact.jsx",
  "components/admin/ParentAdminSettingsForm.jsx",
  "components/admin/ParentAdminTable.jsx",
  "components/admin/SchoolAssignForm.jsx",
  "components/school-portal/SchoolOperatorGrantPanel.jsx",
  "components/school-portal/SchoolOperatorsManager.jsx",
  "pages/school/operator/dashboard.js",
  "pages/admin/parents/[userId].js",
  "pages/admin/schools/[schoolId].js",
  "pages/admin/teachers/[teacherId].js",
  "components/admin/TeacherAdminDetailView.jsx",
  "components/school-portal/SchoolStudentCreateForm.jsx",
  "components/school-portal/SchoolClassManagementPanel.jsx",
  "components/school-portal/SchoolStudentAssignmentPanel.jsx",
  "components/school-portal/SchoolStaffCreateForm.jsx",
  "components/school-portal/SchoolStaffAccessActions.jsx",
  "components/school-portal/SchoolStaffChangePinForm.jsx",
  "pages/school/staff/login.js",
  "pages/school/staff/change-pin.js",
  "components/school-portal/SchoolReportModal.jsx",
  "components/platform-ui/PortalDarkSelect.jsx",
  "pages/auth/forgot-password.js",
  "pages/auth/reset-password.js",
  "pages/parent/login.js",
  "pages/teacher/login.js",
  "pages/school/register.js",
  "pages/teacher/pending.js",
  "pages/school/pending.js",
  "components/auth/TeacherRegistrationRequestForm.jsx",
  "components/auth/SchoolRegistrationRequestForm.jsx",
  "components/auth/RegistrationPendingPanel.jsx",
  "components/admin/AdminSchoolRegistrationPanel.jsx",
  "pages/admin/teachers/index.js",
  "pages/admin/schools/index.js",
];

const STAFF_LIFECYCLE_FILES = [
  "components/admin/SchoolAssignForm.jsx",
  "components/admin/AdminSchoolStaffLifecycleCompact.jsx",
  "components/admin/AdminUserLifecyclePanel.jsx",
  "pages/admin/schools/[schoolId].js",
];

const FORBIDDEN_QUOTED_ENGLISH = [
  "School Lifecycle",
  "School status",
  "Suspend school",
  "Suspend access",
  "Suspend",
  "Reactivate",
  "Revoke entitlement",
  "Account lifecycle",
  "Loading…",
  "Network error",
  "Manage student",
  "Delete",
  "Remove",
  "Copilot",
  "Advanced diagnostics",
  "Export",
  "Pending",
  "Approve",
  "Reject",
  "Submit",
  "Request",
  "Register",
  "School registration",
];

const FORBIDDEN_RAW_KEYS = [
  "school_manager",
  "school_teacher",
  "school_operator",
  "private_teacher",
  "student_access_admin",
  "student_data_viewer",
  "teacher_basic_20",
  "self_signup",
];

const MISLEADING_DELETE = ["הסרה", "מחיקה"];

const APPROVED_LIFECYCLE_HE = [
  "ניהול סטטוס והרשאות",
  "הקפאת גישה",
  "החזרת גישה",
  "ביטול הרשאה",
  "ניהול סטטוס בית ספר",
  "הקפאת בית ספר",
  "ניהול גישות ילדים והורים",
  "צפייה בדוחות ופרטי ילדים",
];

const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
}

/** @param {string} src */
function extractQuotedStrings(src) {
  const strings = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const m of src.matchAll(re)) {
    strings.push(m[2]);
  }
  return strings;
}

/** @param {string} src */
function extractJsxTextNodes(src) {
  const nodes = [];
  const re = />([^<>{}]+)</g;
  for (const m of src.matchAll(re)) {
    const t = m[1].trim();
    if (t) nodes.push(t);
  }
  return nodes;
}

/** @param {string} src */
function visibleSurface(src) {
  const withoutImports = src
    .split("\n")
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n");
  return [...extractQuotedStrings(withoutImports), ...extractJsxTextNodes(withoutImports)].join("\n");
}

async function readFile(rel) {
  try {
    return await fs.readFile(rel, "utf8");
  } catch {
    return null;
  }
}

async function main() {
  record(
    "mapper_persona_school_manager",
    personaLabelHe("school_manager") === "מנהל/ת בית ספר",
    personaLabelHe("school_manager")
  );
  record(
    "mapper_persona_school_teacher",
    personaLabelHe("school_teacher") === "מורה בית ספר",
    personaLabelHe("school_teacher")
  );
  record(
    "mapper_entitlement_active",
    entitlementStatusLabelHe("active") === "פעיל",
    entitlementStatusLabelHe("active")
  );
  record(
    "mapper_no_raw_key_fallback",
    personaLabelHe("unknown_xyz") === "-" && entitlementStatusLabelHe("unknown_xyz") === "-",
    "unknown maps to em-dash"
  );
  record(
    "mapper_staff_role_label",
    schoolStaffPersonaLabel("school_admin") === "מנהל/ת בית ספר",
    schoolStaffPersonaLabel("school_admin")
  );
  record(
    "mapper_grant_student_access_admin",
    operatorGrantLabel("studentAccessAdmin") === "ניהול גישות ילדים והורים",
    operatorGrantLabel("studentAccessAdmin")
  );
  record(
    "mapper_grant_student_data_viewer",
    operatorGrantLabel("studentDataViewer") === "צפייה בדוחות ופרטי ילדים",
    operatorGrantLabel("studentDataViewer")
  );
  record(
    "mapper_plan_teacher_basic_20",
    planCodeLabelHe("teacher_basic_20") === "תוכנית בסיסית - עד 20 ילדים",
    planCodeLabelHe("teacher_basic_20")
  );
  record(
    "mapper_plan_free",
    planCodeLabelHe("free") === "חינמי",
    planCodeLabelHe("free")
  );
  record(
    "constants_lifecycle_hebrew",
    ADMIN_LIFECYCLE_SECTION === "ניהול סטטוס והרשאות" &&
      ADMIN_LIFECYCLE_SUSPEND === "הקפאת גישה" &&
      ADMIN_SCHOOL_LIFECYCLE_SECTION === "ניהול סטטוס בית ספר",
    "admin lifecycle constants"
  );

  for (const file of LIFECYCLE_UI_FILES) {
    const src = await readFile(file);
    if (!src) {
      record(`file_${file}`, false, "missing");
      continue;
    }
    const surface = visibleSurface(src);
    const jsxText = extractJsxTextNodes(
      src
        .split("\n")
        .filter((line) => !/^\s*import\s/.test(line))
        .join("\n")
    ).join("\n");

    for (const bad of FORBIDDEN_QUOTED_ENGLISH) {
      const hit =
        surface.includes(`"${bad}"`) ||
        surface.includes(`'${bad}'`) ||
        surface.includes(`\`${bad}\``) ||
        jsxText.includes(bad);
      record(`no_english_${bad.replace(/\W+/g, "_")}_${file.split("/").pop()}`, !hit, hit ? bad : "ok");
    }

    for (const key of FORBIDDEN_RAW_KEYS) {
      const hit = jsxText.includes(key);
      record(`no_raw_${key}_${file.split("/").pop()}`, !hit, hit ? key : "ok");
    }
  }

  for (const file of STAFF_LIFECYCLE_FILES) {
    const src = await readFile(file);
    if (!src) continue;
    const surface = visibleSurface(src);
    for (const bad of MISLEADING_DELETE) {
      record(
        `no_misleading_${bad}_${file.split("/").pop()}`,
        !surface.includes(bad),
        surface.includes(bad) ? `found ${bad}` : "ok"
      );
    }
  }

  const userPanel = await readFile("components/admin/AdminUserLifecyclePanel.jsx");
  const schoolPanel = await readFile("components/admin/AdminSchoolLifecyclePanel.jsx");
  const grantPanel = await readFile("components/school-portal/SchoolOperatorGrantPanel.jsx");

  const heSources = [
    await readFile("lib/admin-portal/admin-ui.he.js"),
    await readFile("lib/school-portal/operator-grant-labels.js"),
    userPanel,
    schoolPanel,
    grantPanel,
  ]
    .filter(Boolean)
    .join("\n");

  for (const he of APPROVED_LIFECYCLE_HE) {
    record(`approved_hebrew_${he.slice(0, 10)}`, heSources.includes(he), he);
  }

  const pendingDoc = await readFile("docs/auth/PENDING_ADMIN_LIFECYCLE_HEBREW.md");
  record("no_pending_english_excuse_doc", pendingDoc === null, pendingDoc ? "file still exists" : "removed");

  const subjectUi = await readFile("lib/school-portal/school-ui.he.js");
  record(
    "subject_unassign_label_hebrew",
    subjectUi?.includes('SCHOOL_SUBJECT_REMOVE = "ביטול שיוך מקצוע"'),
    "ביטול שיוך מקצוע"
  );

  const parentForm = await readFile("components/admin/ParentAdminSettingsForm.jsx");
  record(
    "parent_admin_uses_dark_select",
    parentForm?.includes("PortalDarkSelect") && parentForm?.includes("parent-admin-plan-select"),
    "PortalDarkSelect"
  );

  const studentCreate = await readFile("components/school-portal/SchoolStudentCreateForm.jsx");
  record(
    "school_student_create_name_first",
    studentCreate?.includes("fullName") &&
      studentCreate?.includes("SCHOOL_CREATE_STUDENT_SECTION") &&
      !studentCreate?.includes("SCHOOL_STUDENT_ID"),
    "name-first create form"
  );

  const classMgmt = await readFile("components/school-portal/SchoolClassManagementPanel.jsx");
  const assignPanel = await readFile("components/school-portal/SchoolStudentAssignmentPanel.jsx");
  record(
    "class_mgmt_hebrew_labels",
    classMgmt?.includes("SCHOOL_CLASS_MGMT_SECTION") &&
      classMgmt?.includes("PortalDarkSelect") &&
      assignPanel?.includes("SCHOOL_ASSIGN_UPDATE"),
    "class/assignment Hebrew + dark select"
  );

  const authResetHe = await readFile("lib/auth/auth-reset.he.js");
  record(
    "auth_reset_hebrew_constants",
    authResetHe?.includes("AUTH_FORGOT_PASSWORD_TITLE") &&
      authResetHe?.includes("AUTH_RESET_PASSWORD_TITLE") &&
      authResetHe?.includes("AUTH_FORGOT_PASSWORD_LINK"),
    "password reset Hebrew constants"
  );

  const forgotPage = await readFile("pages/auth/forgot-password.js");
  const resetPage = await readFile("pages/auth/reset-password.js");
  record(
    "auth_reset_pages_use_hebrew_module",
    forgotPage?.includes("auth-reset.he") && resetPage?.includes("auth-reset.he"),
    "auth-reset.he imports"
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nHebrew UI guard: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
