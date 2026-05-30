#!/usr/bin/env node
/**
 * Password reset UI structure and Hebrew guard checks.
 */
import fs from "node:fs/promises";
import {
  AUTH_FORGOT_PASSWORD_LINK,
  AUTH_FORGOT_PASSWORD_SUCCESS,
  AUTH_FORGOT_PASSWORD_TITLE,
  AUTH_RESET_PASSWORD_TITLE,
} from "../../lib/auth/auth-reset.he.js";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const FORBIDDEN_ENGLISH = [
  "Forgot password",
  "Reset password",
  "New password",
  "Confirm",
  "Submit",
  "Back",
  "Send",
];

const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
}

async function readFile(rel) {
  try {
    return await fs.readFile(rel, "utf8");
  } catch {
    return null;
  }
}

function extractQuotedStrings(src) {
  const strings = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const m of src.matchAll(re)) {
    strings.push(m[2]);
  }
  return strings;
}

function extractJsxTextNodes(src) {
  const nodes = [];
  const re = />([^<>{}]+)</g;
  for (const m of src.matchAll(re)) {
    const t = m[1].trim();
    if (t) nodes.push(t);
  }
  return nodes;
}

function visibleSurface(src) {
  const withoutImports = src
    .split("\n")
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n");
  return [...extractQuotedStrings(withoutImports), ...extractJsxTextNodes(withoutImports)].join("\n");
}

async function fetchPage(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: "follow" });
    return { ok: res.ok, status: res.status, html: await res.text() };
  } catch (e) {
    return { ok: false, status: 0, html: "", error: String(e.message || e) };
  }
}

async function main() {
  const forgotSrc = await readFile("pages/auth/forgot-password.js");
  const resetSrc = await readFile("pages/auth/reset-password.js");
  const parentLogin = await readFile("pages/parent/login.js");
  const teacherLogin = await readFile("pages/teacher/login.js");
  const studentLogin = await readFile("pages/student/login.js");
  const guardianLogin = await readFile("pages/guardian/login.js");
  const authResetHe = await readFile("lib/auth/auth-reset.he.js");

  record(
    "auth_reset_hebrew_constants",
    authResetHe?.includes(`AUTH_FORGOT_PASSWORD_TITLE = "${AUTH_FORGOT_PASSWORD_TITLE}"`) &&
      authResetHe?.includes(`AUTH_RESET_PASSWORD_TITLE = "${AUTH_RESET_PASSWORD_TITLE}"`),
    "Hebrew constants present"
  );

  record(
    "forgot_password_uses_resetPasswordForEmail",
    Boolean(forgotSrc?.includes("resetPasswordForEmail")),
    "resetPasswordForEmail"
  );

  record(
    "reset_password_uses_updateUser",
    Boolean(resetSrc?.includes("updateUser")),
    "updateUser"
  );

  record(
    "reset_password_uses_exchangeCodeForSession",
    Boolean(resetSrc?.includes("establishRecoverySession")),
    "establishRecoverySession"
  );

  record(
    "reset_password_uses_error_mapper",
    Boolean(resetSrc?.includes("mapSupabasePasswordUpdateErrorHe")),
    "Hebrew error mapper"
  );

  record(
    "reset_password_uses_password_field",
    Boolean(resetSrc?.includes("PasswordField")),
    "PasswordField toggle"
  );

  record(
    "parent_login_uses_password_field",
    Boolean(parentLogin?.includes("PasswordField")),
    "parent login PasswordField"
  );

  record(
    "teacher_login_uses_password_field",
    Boolean(teacherLogin?.includes("PasswordField")),
    "teacher login PasswordField"
  );

  record(
    "reset_password_uses_persona_redirect",
    Boolean(resetSrc?.includes("resolvePostPasswordResetPath")),
    "persona-aware redirect"
  );

  record(
    "forgot_password_link_on_parent_login",
    parentLogin?.includes("/auth/forgot-password?portal=parent") &&
      parentLogin?.includes("AUTH_FORGOT_PASSWORD_LINK"),
    AUTH_FORGOT_PASSWORD_LINK
  );

  record(
    "forgot_password_link_on_teacher_login",
    teacherLogin?.includes("/auth/forgot-password?portal=teacher") &&
      teacherLogin?.includes("AUTH_FORGOT_PASSWORD_LINK"),
    AUTH_FORGOT_PASSWORD_LINK
  );

  record(
    "no_forgot_link_on_student_login",
    !studentLogin?.includes("/auth/forgot-password"),
    "absent on student login"
  );

  record(
    "no_forgot_link_on_guardian_login",
    !guardianLogin?.includes("/auth/forgot-password"),
    "absent on guardian login"
  );

  record(
    "no_forgot_link_on_staff_login",
    !(await readFile("pages/school/staff/login.js"))?.includes("/auth/forgot-password"),
    "absent on staff login"
  );

  for (const [name, src] of [
    ["forgot_page", forgotSrc],
    ["reset_page", resetSrc],
  ]) {
    if (!src) {
      record(`${name}_exists`, false, "missing file");
      continue;
    }
    const surface = visibleSurface(src);
    for (const bad of FORBIDDEN_ENGLISH) {
      record(
        `${name}_no_english_${bad.replace(/\W+/g, "_")}`,
        !surface.includes(bad),
        bad
      );
    }
    record(
      `${name}_no_raw_updateUser`,
      !surface.includes("updateUser") && !surface.includes("resetPasswordForEmail"),
      "no raw API keys visible"
    );
  }

  record(
    "forgot_password_enumeration_safe",
    forgotSrc?.includes("AUTH_FORGOT_PASSWORD_SUCCESS") &&
      forgotSrc?.includes("setSubmitted(true)"),
    "same success message always"
  );

  const forgotPage = await fetchPage("/auth/forgot-password");
  record(
    "forgot_password_form_renders",
    forgotPage.status === 200,
    `status=${forgotPage.status}${forgotPage.error ? ` err=${forgotPage.error}` : ""}`
  );

  const resetPage = await fetchPage("/auth/reset-password");
  record(
    "reset_password_page_renders",
    resetPage.status === 200,
    `status=${resetPage.status}${resetPage.error ? ` err=${resetPage.error}` : ""}`
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nPassword reset matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
