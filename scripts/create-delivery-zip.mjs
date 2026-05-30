import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const STAGING = path.join(ROOT, "review-packages", "_zip_staging");
const ZIP_PATH = path.join(ROOT, "review-packages", "role-boundary-foundation-delivery.zip");
const MANIFEST_PATH = path.join(ROOT, "docs", "auth", "DELIVERY_ZIP_MANIFEST.txt");

/** @type {string[]} Full workspace-relative paths — must match docs/auth/CHANGES.md */
const FILES = [
  "supabase/migrations/040_account_persona_entitlements.sql",
  "supabase/migrations/041_parent_account_settings.sql",
  "supabase/migrations/042_backfill_entitlements_dev.sql",
  "supabase/migrations/043_school_accounts_separate_quotas.sql",
  "supabase/migrations/044_school_operator_grants.sql",
  "supabase/migrations/045_school_operator_audit_log.sql",
  "supabase/migrations/046_school_teacher_memberships_school_operator_role.sql",
  "supabase/migrations/047_parent_copilot_usage_log.sql",
  "docs/auth/PHASE0_ROLE_BOUNDARY_DISCOVERY.md",
  "docs/auth/SQL_REVIEW_PACKAGE.md",
  "docs/auth/PHASE8_SELF_AUDIT.md",
  "docs/auth/CHANGES.md",
  "docs/auth/DELIVERY_ZIP_MANIFEST.txt",
  "docs/auth/POST_SQL_VERIFICATION_REPORT.md",
  "docs/auth/POST_SQL_INTEGRATION_RESULTS.json",
  "docs/auth/POST_SQL_OPERATOR_RESULTS.json",
  "lib/auth/persona-entitlement.server.js",
  "lib/auth/persona-guard.server.js",
  "lib/parent-server/parent-signup-mode.server.js",
  "lib/parent-server/parent-entitlement-provision.server.js",
  "lib/parent-server/parent-copilot-limit.server.js",
  "lib/teacher-server/private-teacher-guard.server.js",
  "lib/school-server/school-quota.server.js",
  "lib/school-server/school-operator.server.js",
  "lib/admin-server/admin-entitlements.server.js",
  "lib/admin-server/admin-parent-settings.server.js",
  "pages/api/admin/entitlements/index.js",
  "pages/api/admin/entitlements/[entitlementId].js",
  "pages/api/admin/parents/[userId]/settings.js",
  "pages/api/school/operators/index.js",
  "pages/api/school/operators/[operatorId]/grants.js",
  "lib/admin-server/admin-request.server.js",
  "lib/admin-server/admin-schools.server.js",
  "lib/school-server/school-membership.server.js",
  "lib/school-server/school-request.server.js",
  "lib/school-server/school-students.server.js",
  "lib/teacher-server/teacher-session.server.js",
  "pages/api/parent/copilot-turn.js",
  "pages/api/parent/create-student-access-code.js",
  "pages/api/parent/create-student.js",
  "pages/api/parent/delete-student.js",
  "pages/api/parent/list-students.js",
  "pages/api/parent/policy-acceptance/accept.js",
  "pages/api/parent/students/[studentId]/report-data.js",
  "pages/api/parent/teacher-consent/issue.js",
  "pages/api/parent/teacher-consent/revoke.js",
  "pages/api/parent/update-student.js",
  "pages/api/teacher/classes/[classId]/members.js",
  "pages/api/teacher/classes/index.js",
  "pages/api/teacher/students/create.js",
  "pages/api/teacher/students/link.js",
  "pages/api/teacher/worksheet-activities/index.js",
  "pages/api/school/students/[studentId]/report-data.js",
  "pages/api/school/students/[studentId]/accounts/index.js",
  "pages/api/school/students/[studentId]/accounts/student/create.js",
  "pages/api/school/students/[studentId]/accounts/student/reset-pin.js",
  "pages/api/school/students/[studentId]/accounts/student/revoke.js",
  "pages/api/school/students/[studentId]/accounts/student/unblock.js",
  "pages/api/school/students/[studentId]/accounts/student/block.js",
  "pages/api/school/students/[studentId]/accounts/parent/create.js",
  "pages/api/school/students/[studentId]/accounts/parent/unlink.js",
  "pages/api/school/students/[studentId]/accounts/parent/link.js",
  "pages/api/school/students/[studentId]/accounts/parent/revoke.js",
  "pages/api/school/students/[studentId]/accounts/parent/unblock.js",
  "pages/api/school/students/[studentId]/accounts/parent/block.js",
  "pages/api/school/students/[studentId]/accounts/parent/reset-pin.js",
  "pages/parent/dashboard.js",
  "pages/parent/login.js",
  "tests/auth/persona-entitlement-foundation.test.mjs",
  "tests/auth/role-boundary-integration-matrix.mjs",
  "tests/auth/role-boundary-operator-verification.mjs",
  "tests/auth/ui-role-scope-matrix.mjs",
  "tests/auth/hebrew-ui-guard.mjs",
  "tests/auth/admin-lifecycle-matrix.mjs",
  "lib/admin-portal/admin-ui.he.js",
  "lib/admin-portal/admin-lifecycle-ui.js",
  "lib/school-portal/school-ui.he.js",
  "lib/school-portal/operator-grant-labels.js",
  "lib/admin-server/admin-lifecycle.server.js",
  "pages/api/admin/users/[userId]/lifecycle.js",
  "components/admin/AdminUserLifecyclePanel.jsx",
  "components/admin/AdminSchoolLifecyclePanel.jsx",
  "components/admin/AdminSchoolStaffLifecycleCompact.jsx",
  "components/admin/ParentAdminSettingsForm.jsx",
  "components/admin/ParentAdminTable.jsx",
  "components/admin/SchoolAssignForm.jsx",
  "components/school-portal/SchoolOperatorGrantPanel.jsx",
  "components/platform-ui/PortalDarkSelect.jsx",
  "components/school-portal/SchoolStudentCreateForm.jsx",
  "components/school-portal/SchoolStaffEmailInviteForm.jsx",
  "docs/auth/SCHOOL_STUDENT_CREATE_FLOW.md",
  "docs/auth/SCHOOL_TEACHER_INVITE_FLOW.md",
  "docs/auth/SCHOOL_STAFF_LOGIN_MODEL_PROPOSAL.md",
  "pages/admin/parents/index.js",
  "pages/admin/parents/[userId].js",
  "pages/api/admin/parents/index.js",
  "components/school-portal/SchoolUserIdInviteForm.jsx",
  "components/school-portal/SchoolOperatorsManager.jsx",
  "pages/school/operators/index.js",
  "pages/school/operators/[operatorId].js",
  "pages/school/operator/dashboard.js",
  "lib/admin-server/admin-private-teacher-scope.server.js",
  "docs/auth/UI_ROLE_SCOPE_FIX_REPORT.md",
  "docs/auth/PENDING_OPERATOR_UI_HEBREW.md",
  "supabase/migrations/049_teacher_registration_requests.sql",
  "supabase/migrations/050_school_registration_requests.sql",
  "lib/auth/auth-registration.he.js",
  "lib/auth/auth-registration-request.server.js",
  "pages/api/auth/teacher-request.js",
  "pages/api/auth/school-request.js",
  "pages/api/admin/schools/[schoolId]/approve.js",
  "pages/api/admin/schools/[schoolId]/reject.js",
  "components/auth/TeacherRegistrationRequestForm.jsx",
  "components/auth/SchoolRegistrationRequestForm.jsx",
  "components/auth/RegistrationPendingPanel.jsx",
  "components/admin/AdminSchoolRegistrationPanel.jsx",
  "pages/school/register.js",
  "pages/teacher/pending.js",
  "pages/school/pending.js",
  "pages/admin/teachers/index.js",
  "pages/admin/schools/index.js",
  "pages/admin/schools/[schoolId].js",
  "pages/teacher/login.js",
  "pages/teacher/dashboard.js",
  "pages/school/dashboard.js",
  "lib/school-portal/use-school-portal-session.js",
  "tests/auth/registration-request-matrix.mjs",
];

fs.rmSync(STAGING, { recursive: true, force: true });
fs.mkdirSync(STAGING, { recursive: true });

const missing = [];
for (const rel of FILES) {
  const src = path.join(ROOT, rel);
  const dest = path.join(STAGING, rel);
  if (!fs.existsSync(src)) {
    missing.push(rel);
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (missing.length > 0) {
  console.error("Missing files:\n" + missing.join("\n"));
  process.exit(1);
}

const manifestLines = [
  "# Delivery ZIP manifest — full workspace-relative paths",
  `# Generated: ${new Date().toISOString()}`,
  `# Total files: ${FILES.length}`,
  "",
  ...FILES.sort(),
  "",
];
fs.writeFileSync(MANIFEST_PATH, manifestLines.join("\n"), "utf8");

const manifestDest = path.join(STAGING, "docs/auth/DELIVERY_ZIP_MANIFEST.txt");
fs.mkdirSync(path.dirname(manifestDest), { recursive: true });
fs.copyFileSync(MANIFEST_PATH, manifestDest);

if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

execSync(`tar -a -cf "${ZIP_PATH}" -C "${STAGING}" .`, { stdio: "inherit" });

const listing = execSync(`tar -tf "${ZIP_PATH}"`, { encoding: "utf8" })
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const fileEntries = listing.filter((e) => !e.endsWith("/"));
console.log(`ZIP: ${ZIP_PATH}`);
console.log(`Manifest source files: ${FILES.length}`);
console.log(`ZIP entries (files): ${fileEntries.length}`);
console.log(`ZIP total entries (incl. dirs): ${listing.length}`);

const basenames = new Map();
for (const entry of fileEntries) {
  const base = path.basename(entry);
  basenames.set(base, (basenames.get(base) || 0) + 1);
}
const dupes = [...basenames.entries()].filter(([, n]) => n > 1);
if (dupes.length > 0) {
  console.log("Basename duplicates (expected — paths differ):");
  for (const [name, n] of dupes.sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${name}: ${n}`);
  }
}

fs.rmSync(STAGING, { recursive: true, force: true });
