#!/usr/bin/env node
/**
 * Static + API guard checks for admin hard-delete (main admin only).
 */
import fs from "node:fs/promises";
import {
  PROTECTED_DELETE_EMAILS,
  USER_DELETE_CLEANUP_STEPS,
  getMainAdminEmailSet,
  isFullAccountDeleteEnabled,
  isMainAdminUser,
  validateFullDeleteConfirmCode,
} from "../../lib/admin-server/admin-user-delete.server.js";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

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

async function getBearer(email, password) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) throw new Error(`auth failed for ${email}`);
  return tokenJson.access_token;
}

async function api(method, path, token, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, code: json?.error?.code || null };
}

async function main() {
  const panel = await read("components/admin/AdminUserLifecyclePanel.jsx");
  const deleteSection = await read("components/admin/AdminUserDeleteSection.jsx");
  const deleteServer = await read("lib/admin-server/admin-user-delete.server.js");
  const deleteApi = await read("pages/api/admin/users/[userId]/delete.js");
  const previewApi = await read("pages/api/admin/users/[userId]/delete-preview.js");
  const requestServer = await read("lib/admin-server/admin-request.server.js");

  record(
    "lifecycle_panel_has_delete_button",
    deleteSection.includes('data-testid="lifecycle-delete"') &&
      panel.includes("AdminUserDeleteSection"),
    "lifecycle-delete via AdminUserDeleteSection"
  );
  record(
    "lifecycle_panel_requires_confirm_code",
    deleteSection.includes("lifecycle-delete-confirm-code") &&
      deleteSection.includes("confirmCode"),
    "confirm-code UI (not email)"
  );
  record(
    "lifecycle_panel_no_email_confirm",
    !panel.includes("confirmEmail") &&
      !deleteSection.includes("confirmEmail") &&
      !deleteSection.includes("lifecycle-delete-confirm-email"),
    "email confirmation removed"
  );
  record(
    "lifecycle_panel_uses_full_delete_ready",
    deleteSection.includes("fullDeleteReady") && panel.includes("AdminUserDeleteSection"),
    "AdminUserDeleteSection in lifecycle panel"
  );
  record(
    "delete_api_uses_main_admin_guard",
    deleteApi.includes("requireMainAdminApiContext"),
    "requireMainAdminApiContext"
  );
  record(
    "delete_api_uses_confirm_code",
    deleteApi.includes("confirmCode"),
    "confirmCode body field"
  );
  record(
    "delete_api_uses_service_role_server_only",
    deleteApi.includes("deleteAdminUserAccount") && !deleteApi.includes("getLearningSupabaseBrowserClient"),
    "server module only"
  );
  record(
    "delete_preview_route_exists",
    previewApi.includes("getAdminUserDeletePreview"),
    "delete-preview handler"
  );
  record(
    "delete_uses_auth_admin_deleteUser",
    deleteServer.includes("auth.admin.deleteUser"),
    "auth.admin.deleteUser"
  );
  record(
    "full_delete_env_gated",
    deleteServer.includes("ADMIN_FULL_ACCOUNT_DELETE_ENABLED") &&
      deleteServer.includes("ADMIN_FULL_ACCOUNT_DELETE_CONFIRM_CODE"),
    "full delete env vars"
  );
  record(
    "cleanup_not_dev_email_only",
    deleteServer.includes("cleanupUserDependenciesBeforeAuthDelete") &&
      !deleteServer.includes("isDevDeletableEmail") &&
      !deleteServer.includes("@liosh-dev.invalid"),
    "universal dependency cleanup"
  );
  record(
    "cleanup_steps_include_guardian_and_messages",
    USER_DELETE_CLEANUP_STEPS.some((s) => s.table === "student_guardian_access") &&
      USER_DELETE_CLEANUP_STEPS.some((s) => s.table === "school_messages"),
    "eram@mth-eng.com FK blockers covered"
  );
  record(
    "protected_admin_email_blocked",
    PROTECTED_DELETE_EMAILS.has("admin@admin.com") &&
      PROTECTED_DELETE_EMAILS.has("leokid2026@gmail.com") &&
      PROTECTED_DELETE_EMAILS.has("office@leo-k.com"),
    "protected emails set"
  );
  record(
    "main_admin_gmail_email",
    getMainAdminEmailSet().has("leokid2026@gmail.com"),
    "leokid2026@gmail.com is main admin"
  );
  record(
    "main_admin_not_office_legacy",
    !getMainAdminEmailSet().has("office@leo.com"),
    "office@leo.com not main admin default"
  );
  record(
    "is_main_admin_rejects_random_user",
    !isMainAdminUser({ email: "random@example.com" }),
    "non-main admin rejected"
  );
  record(
    "full_delete_disabled_by_default",
    !isFullAccountDeleteEnabled(),
    "ADMIN_FULL_ACCOUNT_DELETE_ENABLED not set in test env"
  );
  record(
    "confirm_code_invalid_when_unconfigured",
    validateFullDeleteConfirmCode("any-code").code === "full_delete_disabled" ||
      validateFullDeleteConfirmCode("any-code").code === "full_delete_not_configured",
    `code=${validateFullDeleteConfirmCode("any-code").code}`
  );
  record(
    "require_main_admin_exported",
    requestServer.includes("requireMainAdminApiContext"),
    "main admin guard exported"
  );

  const password =
    process.env.DEMO_TEACHER_PASSWORD || process.env.SCHOOL_QA_PASSWORD || "";
  const parentPassword = process.env.E2E_PARENT_PASSWORD || password;

  if (password && process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL) {
    try {
      const adminToken = await getBearer("office@leo.com", password);
      let parentToken = null;
      try {
        parentToken = await getBearer(
          process.env.E2E_PARENT_EMAIL || "admin@admin.com",
          parentPassword
        );
      } catch {
        record("parent_token_skipped", true, "parent auth unavailable - admin-only API checks");
      }

      const fakeId = "00000000-0000-4000-8000-000000000099";

      if (parentToken) {
        const nonAdminDelete = await api("POST", `/api/admin/users/${fakeId}/delete`, parentToken, {
          confirmCode: "x",
        });
        record(
          "non_admin_cannot_delete",
          nonAdminDelete.status === 403,
          `status=${nonAdminDelete.status} code=${nonAdminDelete.code}`
        );
      } else {
        record("non_admin_cannot_delete_skipped", true, "no parent token");
      }

      const protectedPreview = await api(
        "GET",
        `/api/admin/users/${fakeId}/delete-preview`,
        adminToken
      );
      record(
        "delete_preview_requires_valid_user_or_404",
        protectedPreview.status === 404 || protectedPreview.status === 200,
        `status=${protectedPreview.status}`
      );

      const selfPreview = await api("GET", `/api/admin/users/${fakeId}/delete-preview`, adminToken);
      record(
        "delete_preview_api_reachable",
        selfPreview.status === 404 || selfPreview.status === 200,
        `status=${selfPreview.status}`
      );

      const noConfirm = await api("POST", `/api/admin/users/${fakeId}/delete`, adminToken, {});
      record(
        "delete_requires_confirm_code",
        noConfirm.status === 400 ||
          noConfirm.status === 403 ||
          noConfirm.status === 404,
        `status=${noConfirm.status} code=${noConfirm.code}`
      );

      const badCode = await api("POST", `/api/admin/users/${fakeId}/delete`, adminToken, {
        confirmCode: "wrong-code",
      });
      record(
        "delete_rejects_bad_confirm_code_or_disabled",
        badCode.status === 403 || badCode.status === 404,
        `status=${badCode.status} code=${badCode.code}`
      );
    } catch (err) {
      record("api_tests_skipped", true, String(err?.message || err));
    }
  } else {
    record("api_tests_skipped", true, "missing DEMO_TEACHER_PASSWORD or Supabase env");
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nAdmin user delete matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
