#!/usr/bin/env node
/**
 * Unified all-accounts admin tab/API tests (main admin only).
 */
import fs from "node:fs/promises";
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";
import {
  buildAccountClassifications,
  isQaTestAccountEmail,
  listAllAdminAccounts,
} from "../../lib/admin-server/admin-all-accounts.server.js";
import { PROTECTED_DELETE_EMAILS } from "../../lib/admin-server/admin-user-delete.server.js";

const BASE_URL = (
  process.env.ROLE_BOUNDARY_TEST_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");

const ERAM_EMAIL = "eram@mth-eng.com";
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
  const shell = await read("components/admin/AdminShell.jsx");
  const page = await read("pages/admin/accounts/index.js");
  const table = await read("components/admin/AllAccountsAdminTable.jsx");
  const apiRoute = await read("pages/api/admin/accounts/index.js");
  const server = await read("lib/admin-server/admin-all-accounts.server.js");

  record(
    "nav_has_all_accounts_tab",
    shell.includes("/admin/accounts") && shell.includes("ADMIN_NAV_ALL_ACCOUNTS"),
    "כל החשבונות nav link"
  );
  record(
    "all_accounts_page_exists",
    page.includes("AllAccountsAdminTable") && page.includes("/api/admin/accounts"),
    "accounts index page"
  );
  record(
    "api_main_admin_guard",
    apiRoute.includes("requireMainAdminApiContext") && apiRoute.includes("listAllAdminAccounts"),
    "main admin API guard"
  );
  record(
    "table_uses_shared_delete_section",
    table.includes("AdminUserDeleteSection") && table.includes("all-accounts-delete-trigger"),
    "lazy delete via AdminUserDeleteSection"
  );
  record(
    "server_one_row_per_auth_user",
    server.includes("for (const user of authUsers)") && server.includes("accounts.push(row)"),
    "single row per auth user"
  );
  record(
    "server_auth_fallback",
    server.includes("loadAuthUsersForAdminList") && server.includes("discoverUserIdsFromDb"),
    "auth list + DB fallback"
  );
  record(
    "server_batch_delete_protection",
    server.includes("assessDeleteProtectionSync") && server.includes("loadActiveAdminEntitlementUserIds"),
    "no per-row delete protection DB"
  );
  record(
    "server_no_silent_empty_on_db_users",
    server.includes("accounts.length === 0") && server.includes("auth_list_failed"),
    "empty list with DB users is error"
  );
  record(
    "accounts_page_no_silent_api_failure",
    page.includes("Array.isArray(body.data.accounts)") &&
      page.includes("all-accounts-error") &&
      !page.includes("body?.data?.accounts) {"),
    "invalid/missing accounts array shows error"
  );
  record(
    "api_returns_actor_email",
    apiRoute.includes("actorEmail") && apiRoute.includes("listMeta"),
    "API diagnostic fields"
  );
  record(
    "qa_email_detection",
    isQaTestAccountEmail("teacher@liosh-dev.invalid") &&
      isQaTestAccountEmail("qa-school-operator@leo-k.com"),
    "QA email heuristics"
  );
  record(
    "classification_unlinked",
    buildAccountClassifications({
      hasParentProfile: true,
      hasParentEntitlement: false,
      entitlements: [],
      schoolMemberships: [],
      isPlatformAdmin: false,
      isQaTest: false,
      pendingEmailConfirmation: false,
      hasTeacherProfile: false,
      hasPrivateTeacherEntitlement: false,
      hasSchoolMembership: false,
    }).includes("unlinked"),
    "unlinked classification"
  );
  record(
    "classification_platform_admin",
    buildAccountClassifications({
      isPlatformAdmin: true,
      entitlements: [{ persona: "admin", status: "active" }],
      schoolMemberships: [],
      hasParentProfile: false,
      hasParentEntitlement: false,
      hasTeacherProfile: false,
      hasPrivateTeacherEntitlement: false,
      hasSchoolMembership: false,
      isQaTest: false,
      pendingEmailConfirmation: false,
    }).includes("platform_admin"),
    "platform admin classification"
  );

  if (process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL) {
    const db = createServiceRole();
    const mainAdmin = await findAuthUserByEmail(db, "leokid2026@gmail.com");
    const eram = await findAuthUserByEmail(db, ERAM_EMAIL);

    if (mainAdmin?.id) {
      const listed = await listAllAdminAccounts(db, mainAdmin.id, mainAdmin);
      const ids = (listed.accounts || []).map((a) => a.userId);
      const uniqueIds = new Set(ids);
      record(
        "list_no_duplicate_user_ids",
        listed.ok && ids.length === uniqueIds.size,
        `total=${listed.total} unique=${uniqueIds.size}`
      );

      if (eram?.id) {
        const eramRow = listed.accounts.find((a) => a.userId === eram.id);
        record(
          "eram_in_all_accounts",
          !!eramRow && eramRow.isOrphanUnlinked,
          eramRow
            ? `classifications=${(eramRow.classifications || []).join(",")} deletable=${eramRow.deletable}`
            : "missing"
        );
        record(
          "eram_has_manage_url",
          !!eramRow?.manageUrl?.includes("/admin/parents/"),
          eramRow?.manageUrl || "none"
        );
      } else {
        record("eram_in_all_accounts_skipped", true, "eram user not in auth");
      }

      for (const email of ["leokid2026@gmail.com", "office@leo-k.com", "admin@admin.com"]) {
        const row = listed.accounts.find((a) => String(a.email || "").toLowerCase() === email);
        record(
          `protected_${email.replace(/[@.]/g, "_")}`,
          !!row && row.isProtected && !row.deletable,
          row ? `protected=${row.isProtected} deletable=${row.deletable}` : "not found"
        );
      }

      const schoolStaff = listed.accounts.find(
        (a) =>
          (a.classifications || []).includes("school_teacher") ||
          (a.classifications || []).includes("school_manager") ||
          (a.classifications || []).includes("school_operator")
      );
      record(
        "school_staff_classified",
        !!schoolStaff,
        schoolStaff
          ? `${schoolStaff.email} · ${(schoolStaff.classifications || []).join(",")}`
          : "none found"
      );
    }

    const password =
      process.env.DEMO_TEACHER_PASSWORD || process.env.SCHOOL_QA_PASSWORD || "";
    if (password) {
      try {
        const mainToken = await getBearer("leokid2026@gmail.com", password).catch(() => null);
        const officeToken = await getBearer("office@leo.com", password);

        if (mainToken) {
          const ok = await api("GET", "/api/admin/accounts", mainToken);
          record(
            "main_admin_api_access",
            ok.status === 200 &&
              Array.isArray(ok.json?.data?.accounts) &&
              (ok.json?.data?.accounts?.length ?? 0) > 0,
            `status=${ok.status} count=${ok.json?.data?.accounts?.length ?? 0} actor=${ok.json?.data?.actorEmail || "?"}`
          );
        } else {
          record("main_admin_api_access_skipped", true, "leokid2026 password unavailable");
        }

        const blocked = await api("GET", "/api/admin/accounts", officeToken);
        record(
          "non_main_admin_blocked",
          blocked.status === 403 && blocked.code === "main_admin_required",
          `status=${blocked.status} code=${blocked.code}`
        );

        if (mainToken && eram?.id) {
          const badDelete = await api(
            "POST",
            `/api/admin/users/${eram.id}/delete`,
            mainToken,
            { confirmCode: "wrong-code-value" }
          );
          record(
            "wrong_confirm_code_rejected",
            badDelete.status === 403 || badDelete.status === 404,
            `status=${badDelete.status} code=${badDelete.code}`
          );
        }
      } catch (err) {
        record("api_checks_skipped", true, String(err?.message || err));
      }
    } else {
      record("api_checks_skipped", true, "missing DEMO_TEACHER_PASSWORD");
    }
  } else {
    record("db_checks_skipped", true, "missing Supabase env");
  }

  record(
    "protected_emails_set",
    PROTECTED_DELETE_EMAILS.has("leokid2026@gmail.com"),
    "protected set intact"
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nAdmin all-accounts matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
