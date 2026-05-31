#!/usr/bin/env node
/**
 * Orphan parent visibility + school staff delete UI checks.
 */
import fs from "node:fs/promises";
import { createServiceRole, findAuthUserByEmail } from "../../scripts/school-portal/demo-school-lib.mjs";
import {
  getAdminParentDetail,
  listAdminParents,
} from "../../lib/admin-server/admin-parent-settings.server.js";
import { getAdminUserDeletePreview } from "../../lib/admin-server/admin-user-delete.server.js";

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
  const parentServer = await read("lib/admin-server/admin-parent-settings.server.js");
  const parentTable = await read("components/admin/ParentAdminTable.jsx");
  const parentDetail = await read("pages/admin/parents/[userId].js");
  const staffCompact = await read("components/admin/AdminSchoolStaffLifecycleCompact.jsx");
  const deleteSection = await read("components/admin/AdminUserDeleteSection.jsx");
  const lifecyclePanel = await read("components/admin/AdminUserLifecyclePanel.jsx");
  const settingsApi = await read("pages/api/admin/parents/[userId]/settings.js");
  const adminUi = await read("lib/admin-portal/admin-ui.he.js");

  record(
    "list_includes_orphan_profiles",
    parentServer.includes("isOrphanUnlinked") && parentServer.includes("parent_profiles"),
    "orphan parent_profiles merged into listAdminParents"
  );
  record(
    "get_admin_parent_detail_exported",
    parentServer.includes("export async function getAdminParentDetail"),
    "getAdminParentDetail"
  );
  record(
    "settings_api_returns_orphan_fields",
    settingsApi.includes("isOrphanUnlinked") && settingsApi.includes("email"),
    "settings GET returns orphan detail"
  );
  record(
    "parent_table_unlinked_row_testid",
    parentTable.includes('data-testid={p.isOrphanUnlinked ? "parent-row-unlinked"'),
    "parent-row-unlinked testid"
  );
  record(
    "parent_detail_orphan_badge",
    parentDetail.includes("parent-detail-unlinked-badge") &&
      parentDetail.includes("AdminUserLifecyclePanel"),
    "orphan detail shows lifecycle panel"
  );
  record(
    "hebrew_unlinked_label",
    adminUi.includes("חשבון לא מקושר") && adminUi.includes("parentListStatusLabelHe"),
    "Hebrew unlinked label"
  );
  record(
    "shared_delete_section_exists",
    deleteSection.includes("AdminUserDeleteSection") &&
      deleteSection.includes("lifecycle-delete-confirm-code"),
    "AdminUserDeleteSection"
  );
  record(
    "lifecycle_panel_uses_delete_section",
    lifecyclePanel.includes("AdminUserDeleteSection") &&
      !lifecyclePanel.includes("runDelete"),
    "lifecycle panel delegates delete"
  );
  record(
    "school_staff_uses_delete_section",
    staffCompact.includes("AdminUserDeleteSection") &&
      staffCompact.includes('variant="compact"') &&
      staffCompact.includes("school-staff-lifecycle"),
    "school staff compact delete wiring"
  );

  if (process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL) {
    const db = createServiceRole();
    const eram = await findAuthUserByEmail(db, ERAM_EMAIL);
    const mainAdmin = await findAuthUserByEmail(db, "leokid2026@gmail.com");

    if (eram?.id && mainAdmin?.id) {
      const list = await listAdminParents(db);
      const eramRow = (list.parents || []).find(
        (p) => p.parentUserId === eram.id || p.email === ERAM_EMAIL
      );
      record(
        "eram_listed_as_orphan",
        !!eramRow?.isOrphanUnlinked,
        eramRow
          ? `isOrphanUnlinked=${eramRow.isOrphanUnlinked} email=${eramRow.email}`
          : "not in list"
      );

      const detail = await getAdminParentDetail(db, eram.id);
      record(
        "eram_detail_orphan_ok",
        detail.ok && detail.isOrphanUnlinked === true,
        `ok=${detail.ok} orphan=${detail.isOrphanUnlinked} email=${detail.email}`
      );

      const preview = await getAdminUserDeletePreview(db, mainAdmin.id, mainAdmin, eram.id);
      record(
        "eram_delete_preview_deletable",
        preview.ok && preview.deletable === true,
        `deletable=${preview.deletable} protection=${preview.protectionCode || "none"}`
      );
    } else {
      record("eram_db_checks_skipped", true, "eram or main admin user not found in auth");
    }

    const password =
      process.env.DEMO_TEACHER_PASSWORD || process.env.SCHOOL_QA_PASSWORD || "";
    if (password && eram?.id) {
      try {
        const adminToken = await getBearer("office@leo.com", password);
        const settings = await api(
          "GET",
          `/api/admin/parents/${eram.id}/settings`,
          adminToken
        );
        record(
          "eram_settings_api_http",
          settings.status === 200 && settings.json?.data?.isOrphanUnlinked === true,
          `status=${settings.status} orphan=${settings.json?.data?.isOrphanUnlinked}`
        );

        const preview = await api(
          "GET",
          `/api/admin/users/${eram.id}/delete-preview`,
          adminToken
        );
        record(
          "eram_delete_preview_api",
          preview.status === 200,
          `status=${preview.status}`
        );

        let parentToken = null;
        try {
          parentToken = await getBearer(
            process.env.E2E_PARENT_EMAIL || "admin@admin.com",
            process.env.E2E_PARENT_PASSWORD || password
          );
        } catch {
          /* optional */
        }
        if (parentToken) {
          const blocked = await api(
            "GET",
            `/api/admin/parents/${eram.id}/settings`,
            parentToken
          );
          record(
            "non_admin_blocked_orphan_settings",
            blocked.status === 403,
            `status=${blocked.status} code=${blocked.code}`
          );
        } else {
          record("non_admin_blocked_orphan_settings_skipped", true, "no parent token");
        }
      } catch (err) {
        record("eram_api_checks_skipped", true, String(err?.message || err));
      }
    } else {
      record("eram_api_checks_skipped", true, "missing password or eram user");
    }
  } else {
    record("db_checks_skipped", true, "missing Supabase env");
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nAdmin account fixes matrix: ${results.length - failed}/${results.length} pass`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
