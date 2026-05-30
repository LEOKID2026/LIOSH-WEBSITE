#!/usr/bin/env node
/**
 * Static checks for registration password-setup email flow.
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
  const setup = await read("lib/auth/auth-password-setup.server.js");
  const lifecycle = await read("lib/admin-server/admin-lifecycle.server.js");
  const regReq = await read("lib/auth/auth-registration-request.server.js");
  const teacherForm = await read("components/auth/TeacherRegistrationRequestForm.jsx");
  const adminPanel = await read("components/admin/AdminPasswordSetupPanel.jsx");
  const migration = await read("supabase/migrations/052_registration_request_phone_password_setup.sql");

  record(
    "password_setup_uses_supabase_recover",
    setup.includes("/auth/v1/recover") && setup.includes("/auth/reset-password?portal="),
    "Phase 7 reset-password redirect via recover"
  );

  record(
    "teacher_approve_auto_send",
    lifecycle.includes("wasPending") && lifecycle.includes("sendUserPasswordSetupEmail"),
    "auto-send on pending teacher approve"
  );

  record(
    "school_approve_auto_send",
    regReq.includes("sendSchoolContactPasswordSetupEmail") &&
      regReq.includes("approveSchoolRegistration"),
    "auto-send on school approve"
  );

  record(
    "admin_manual_send_api",
    (await read("pages/api/admin/users/[userId]/send-password-setup.js")).includes(
      "sendUserPasswordSetupEmail"
    ),
    "admin resend API for approved users"
  );

  record(
    "teacher_form_requires_phone",
    teacherForm.includes("teacher-reg-phone") && teacherForm.includes("REG_TEACHER_PHONE_LABEL"),
    "phone field on teacher request form"
  );

  record(
    "admin_password_setup_panel",
    adminPanel.includes("ADMIN_SEND_PASSWORD_SETUP") &&
      adminPanel.includes("admin-send-password-setup"),
    "admin send password setup UI"
  );

  record(
    "migration_phone_and_setup_status",
    migration.includes("phone") &&
      migration.includes("password_setup_sent_at") &&
      migration.includes("contact_phone"),
    "migration 052 prepared"
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nRegistration password-setup matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
