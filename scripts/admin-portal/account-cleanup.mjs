#!/usr/bin/env node
/**
 * Dev Supabase auth account inventory + approved cleanup.
 *
 * Phase 1 (inventory):
 *   node --env-file=.env.local scripts/admin-portal/account-cleanup.mjs inventory
 *
 * Phase 2 (delete approved DELETE_CANDIDATE from latest inventory JSON):
 *   node --env-file=.env.local scripts/admin-portal/account-cleanup.mjs delete
 *
 * Re-verify after delete:
 *   node --env-file=.env.local scripts/admin-portal/account-cleanup.mjs inventory --suffix post-delete
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "../..");
const REPORTS_DIR = path.join(REPO_ROOT, "docs/reports");

const KEEP_LEO_K_SUFFIX = "@leo-k.com";
const KEEP_EMAILS = new Set(["admin@admin.com", "leokid2026@gmail.com"]);

function requireEnv(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function normalizeEmail(userOrEmail) {
  const raw =
    typeof userOrEmail === "string"
      ? userOrEmail
      : userOrEmail?.email || "";
  return String(raw).trim().toLowerCase();
}

function normalizeAdminRole(user) {
  const role = user?.app_metadata?.role;
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

function isOwner18eranEmail(email) {
  const local = email.split("@")[0] || "";
  return local.includes("18eran") || local.startsWith("18eran");
}

function isQaTestAccountEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (e.endsWith("@liosh-dev.invalid")) return true;
  if (e.endsWith("@staff.noreply.liosh")) return true;
  const local = e.split("@")[0] || "";
  if (local.startsWith("qa-") || local.includes("qa-school") || local.includes("qa_")) return true;
  return false;
}

function matchesKeepAllowlist(email, userId, ctx) {
  if (!email) return { keep: false, reason: null };
  if (email.endsWith(KEEP_LEO_K_SUFFIX)) {
    return { keep: true, reason: "allowlist: @leo-k.com" };
  }
  if (KEEP_EMAILS.has(email)) {
    return { keep: true, reason: `allowlist: ${email}` };
  }
  if (isOwner18eranEmail(email)) {
    return { keep: true, reason: "allowlist: owner 18eran*" };
  }
  if (userId && userId === ctx.actorUserId) {
    return { keep: true, reason: "cleanup actor (logged-in admin proxy)" };
  }
  return { keep: false, reason: null };
}

function isTestFixtureEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (isQaTestAccountEmail(e)) return true;
  if (e.endsWith("@test.invalid")) return true;
  if (e.endsWith("@example.com")) return true;
  if (e.startsWith("policy-") && e.endsWith("@example.com")) return true;
  if (e.startsWith("manual-") && e.endsWith("@test.invalid")) return true;
  if (e.startsWith("p0-") && e.endsWith("@test.invalid")) return true;
  if (e.startsWith("phase6-") && e.endsWith("@test.invalid")) return true;
  return false;
}

function classifyAccount(user, accountRow, ctx) {
  const email = normalizeEmail(user);
  const userId = user.id;

  const keepCheck = matchesKeepAllowlist(email, userId, ctx);
  if (keepCheck.keep) {
    return { action: "KEEP", reason: keepCheck.reason };
  }

  const adminRole = normalizeAdminRole(user) === "admin";
  const activeAdminEnt = ctx.activeAdminIds.has(userId);
  if (adminRole) {
    return { action: "KEEP", reason: "admin role in app_metadata" };
  }
  if (activeAdminEnt) {
    return { action: "KEEP", reason: "active admin entitlement" };
  }

  const reviewReasons = [];
  const deleteReasons = [];

  if (isTestFixtureEmail(email)) {
    deleteReasons.push("QA/test fixture domain or pattern");
  }
  if (!user.email_confirmed_at) {
    deleteReasons.push("pending/unconfirmed email");
  }
  if (email.endsWith("@liosh-dev.invalid")) {
    deleteReasons.push("@liosh-dev.invalid domain");
  }
  if (email.endsWith("@staff.noreply.liosh")) {
    deleteReasons.push("@staff.noreply.liosh domain");
  }
  if (accountRow?.isOrphanUnlinked || accountRow?.classifications?.includes("unlinked")) {
    deleteReasons.push("orphan/unlinked account");
  }
  if (email.endsWith("@gmail.com") && !KEEP_EMAILS.has(email)) {
    deleteReasons.push("non-allowlist Gmail (dev/test candidate)");
  }
  if (email.endsWith("@leo.com") && !email.endsWith(KEEP_LEO_K_SUFFIX)) {
    deleteReasons.push("legacy @leo.com dev/sim account (not @leo-k.com)");
  }

  const linkedCounts = ctx.linkedCountsByUser.get(userId) || {};
  const studentCount = linkedCounts.students ?? 0;
  const hasActivePersona =
    (accountRow?.personas || []).some(
      (p) =>
        ["parent", "private_teacher", "school_manager", "school_teacher", "school_operator"].includes(
          String(p.persona || "").toLowerCase()
        ) && String(p.status || "").toLowerCase() === "active"
    );
  const hasSchoolMembership = (accountRow?.schoolMemberships || []).length > 0;

  if (deleteReasons.length) {
    return {
      action: "DELETE_CANDIDATE",
      reason: deleteReasons.join("; "),
    };
  }

  if (studentCount > 0) {
    reviewReasons.push(`linked students: ${studentCount}`);
  }
  if (hasActivePersona) {
    reviewReasons.push("active non-QA persona entitlement");
  }
  if (hasSchoolMembership) {
    reviewReasons.push("school membership on non-allowlist account");
  }
  if (accountRow && accountRow.deletable === false && accountRow.isProtected) {
    reviewReasons.push(`delete API protected: ${accountRow.protectionCode || "protected"}`);
  }

  if (reviewReasons.length) {
    return {
      action: "REVIEW_BEFORE_DELETE",
      reason: reviewReasons.join("; "),
      deleteCandidateReason: "does not match keep allowlist (dev cleanup default)",
    };
  }

  return {
    action: "DELETE_CANDIDATE",
    reason: "does not match keep allowlist (dev cleanup default)",
  };
}

async function loadAllAuthUsers(admin) {
  const users = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return users;
}

async function findUserByEmail(admin, email) {
  const target = normalizeEmail(email);
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data?.users?.find((u) => normalizeEmail(u) === target);
    if (match) return match;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

async function loadActiveAdminIds(admin) {
  const { data, error } = await admin
    .from("account_persona_entitlements")
    .select("user_id")
    .eq("persona", "admin")
    .eq("status", "active");
  if (error) return new Set();
  return new Set((data || []).map((r) => r.user_id).filter(Boolean));
}

async function loadLinkedCounts(admin, userIds) {
  const map = new Map();
  for (const id of userIds) {
    map.set(id, {
      entitlements: 0,
      parentProfile: 0,
      teacherProfile: 0,
      schoolMemberships: 0,
      students: 0,
    });
  }

  async function countFor(table, column, key) {
    for (let i = 0; i < userIds.length; i += 100) {
      const chunk = userIds.slice(i, i + 100);
      const { data, error } = await admin.from(table).select(column).in(column, chunk);
      if (error) continue;
      for (const row of data || []) {
        const uid = row[column];
        const entry = map.get(uid);
        if (entry) entry[key] = (entry[key] || 0) + 1;
      }
    }
  }

  await Promise.all([
    countFor("account_persona_entitlements", "user_id", "entitlements"),
    countFor("parent_profiles", "id", "parentProfile"),
    countFor("teacher_profiles", "id", "teacherProfile"),
    countFor("school_teacher_memberships", "teacher_id", "schoolMemberships"),
  ]);

  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100);
    const { data, error } = await admin.from("students").select("parent_id").in("parent_id", chunk);
    if (error) continue;
    for (const row of data || []) {
      const entry = map.get(row.parent_id);
      if (entry) entry.students = (entry.students || 0) + 1;
    }
  }

  return map;
}

function resolveActorUser(authUsers) {
  const actorEmail = normalizeEmail(
    process.env.ACCOUNT_CLEANUP_ACTOR_EMAIL || "admin@admin.com"
  );
  const byEmail = authUsers.find((u) => normalizeEmail(u) === actorEmail);
  if (byEmail) return byEmail;
  const mainAdmin = authUsers.find(
    (u) => normalizeEmail(u) === "leokid2026@gmail.com"
  );
  return mainAdmin || authUsers[0] || null;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function buildMarkdownReport(payload) {
  const lines = [];
  lines.push(`# Supabase Account Cleanup Map (${payload.generatedAt})`);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| Total users | ${payload.totals.total} |`);
  lines.push(`| KEEP | ${payload.totals.keep} |`);
  lines.push(`| DELETE_CANDIDATE | ${payload.totals.deleteCandidate} |`);
  lines.push(`| REVIEW_BEFORE_DELETE | ${payload.totals.review} |`);
  lines.push("");
  lines.push(`Actor for delete preview: \`${payload.actorEmail}\` (\`${payload.actorUserId}\`)`);
  lines.push("");
  lines.push("## Keep allowlist applied");
  lines.push("");
  lines.push("- `@leo-k.com`");
  lines.push("- `admin@admin.com`");
  lines.push("- owner `18eran*` local part");
  lines.push("- `leokid2026@gmail.com`");
  lines.push("- admin role or active admin entitlement");
  lines.push("- cleanup actor admin");
  lines.push("");

  for (const section of ["KEEP", "DELETE_CANDIDATE", "REVIEW_BEFORE_DELETE"]) {
    const rows = payload.accounts.filter((a) => a.action === section);
    lines.push(`## ${section} (${rows.length})`);
    lines.push("");
    if (!rows.length) {
      lines.push("_None_");
      lines.push("");
      continue;
    }
    lines.push(
      "| Email | User ID | Classifications | Reason | Linked | Deletable | Protection |"
    );
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const row of rows) {
      const linked = Object.entries(row.linkedCounts || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ");
      lines.push(
        `| ${row.email || "—"} | \`${row.userId}\` | ${(row.classifications || []).join(", ") || "—"} | ${row.reason.replace(/\|/g, "/")} | ${linked || "—"} | ${row.deletable ? "yes" : "no"} | ${row.protectionCode || "—"} |`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function runInventory({ suffix = "" } = {}) {
  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [
    { listAllAdminAccounts },
    { getAdminUserDeletePreview, assessDeleteProtectionSync, PROTECTED_DELETE_EMAILS },
    { loadAuthUsersForAdminList },
  ] = await Promise.all([
    import("../../lib/admin-server/admin-all-accounts.server.js"),
    import("../../lib/admin-server/admin-user-delete.server.js"),
    import("../../lib/admin-server/admin-all-accounts.server.js"),
  ]);

  const authUsers = await loadAllAuthUsers(admin);
  const actorUser = resolveActorUser(authUsers);
  if (!actorUser?.id) throw new Error("Could not resolve cleanup actor admin user");

  const activeAdminIds = await loadActiveAdminIds(admin);
  const listResult = await listAllAdminAccounts(admin, actorUser.id, actorUser);
  if (!listResult.ok) {
    throw new Error(`listAllAdminAccounts failed: ${listResult.code}`);
  }

  const accountByUserId = new Map(listResult.accounts.map((a) => [a.userId, a]));
  const userIds = authUsers.map((u) => u.id);
  const linkedCountsByUser = await loadLinkedCounts(admin, userIds);

  const ctx = {
    actorUserId: actorUser.id,
    activeAdminIds,
    linkedCountsByUser,
  };

  const accounts = [];
  for (const user of authUsers) {
    const accountRow = accountByUserId.get(user.id) || null;
    const classification = classifyAccount(user, accountRow, ctx);
    const protection = assessDeleteProtectionSync(actorUser.id, user, activeAdminIds);
    const deletable = protection.ok;
    const linkedCounts = linkedCountsByUser.get(user.id) || {};

    let deletePreview = null;
    const deletableFromProtection = deletable;
    if (
      process.env.ACCOUNT_CLEANUP_FULL_PREVIEW === "true" &&
      (classification.action === "DELETE_CANDIDATE" || classification.action === "REVIEW_BEFORE_DELETE")
    ) {
      deletePreview = await getAdminUserDeletePreview(
        admin,
        actorUser.id,
        actorUser,
        user.id
      );
    }

    accounts.push({
      userId: user.id,
      email: user.email || null,
      emailConfirmed: !!user.email_confirmed_at,
      createdAt: user.created_at || null,
      lastSignInAt: user.last_sign_in_at || null,
      classifications: accountRow?.classifications || [],
      personas: accountRow?.personas || [],
      action: classification.action,
      reason: classification.reason,
      deleteCandidateReason: classification.deleteCandidateReason || null,
      linkedCounts,
      linkedSummary: accountRow?.linkedSummary || null,
      deletable: deletePreview?.deletable ?? deletableFromProtection,
      protectionCode: deletePreview?.protectionCode ?? (protection.ok ? null : protection.code),
      deletePreviewBlockers: deletePreview?.blockers?.length ?? null,
      isProtectedEmail: PROTECTED_DELETE_EMAILS.has(normalizeEmail(user)),
    });
  }

  accounts.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));

  const totals = {
    total: accounts.length,
    keep: accounts.filter((a) => a.action === "KEEP").length,
    deleteCandidate: accounts.filter((a) => a.action === "DELETE_CANDIDATE").length,
    review: accounts.filter((a) => a.action === "REVIEW_BEFORE_DELETE").length,
  };

  const stamp = todayStamp();
  const baseName = suffix
    ? `SUPABASE_ACCOUNT_CLEANUP_MAP_${stamp}_${suffix}`
    : `SUPABASE_ACCOUNT_CLEANUP_MAP_${stamp}`;

  const payload = {
    generatedAt: new Date().toISOString(),
    actorEmail: normalizeEmail(actorUser),
    actorUserId: actorUser.id,
    totals,
    accounts,
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const jsonPath = path.join(REPORTS_DIR, `${baseName}.json`);
  const mdPath = path.join(REPORTS_DIR, `${baseName}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(mdPath, buildMarkdownReport(payload), "utf8");

  console.log(`Inventory written:\n  ${jsonPath}\n  ${mdPath}`);
  console.log(
    `Totals: total=${totals.total} keep=${totals.keep} delete=${totals.deleteCandidate} review=${totals.review}`
  );

  return { jsonPath, mdPath, payload };
}

async function devCleanupParentStudentsBeforeAuthDelete(admin, parentUserId) {
  const { data: students, error } = await admin
    .from("students")
    .select("id")
    .eq("parent_id", parentUserId);
  if (error) {
    if (error.code === "42P01") return { ok: true, studentIds: [] };
    return { ok: false, code: error.code };
  }
  const studentIds = (students || []).map((s) => s.id).filter(Boolean);
  if (!studentIds.length) return { ok: true, studentIds: [] };

  const arcadeSteps = [
    { table: "arcade_results", column: "student_id" },
    { table: "arcade_room_players", column: "student_id" },
    { table: "arcade_rooms", column: "host_student_id" },
  ];

  for (const step of arcadeSteps) {
    for (let i = 0; i < studentIds.length; i += 50) {
      const chunk = studentIds.slice(i, i + 50);
      const { error: delErr } = await admin.from(step.table).delete().in(step.column, chunk);
      if (delErr && delErr.code !== "42P01" && delErr.code !== "42703") {
        return { ok: false, code: delErr.code, table: step.table };
      }
    }
  }

  const { error: studentDelErr } = await admin.from("students").delete().eq("parent_id", parentUserId);
  if (studentDelErr && studentDelErr.code !== "42P01") {
    return { ok: false, code: studentDelErr.code, table: "students" };
  }

  return { ok: true, studentIds };
}

async function deleteUserWithServerLogic(admin, actorUserId, targetUserId, { confirmCode } = {}) {
  const {
    resolveTargetAuthUser,
    assessDeleteProtection,
    cleanupUserDependenciesBeforeAuthDelete,
    previewAdminUserDeleteDependencies,
    deleteAdminUserAccount,
    validateFullDeleteConfirmCode,
  } = await import("../../lib/admin-server/admin-user-delete.server.js");

  const devBypass =
    String(process.env.ACCOUNT_CLEANUP_DEV_DELETE || "")
      .trim()
      .toLowerCase() === "true";

  if (!devBypass) {
    const codeCheck = validateFullDeleteConfirmCode(confirmCode);
    if (!codeCheck.ok) {
      return {
        ok: false,
        code: codeCheck.code,
        message: "Set ACCOUNT_CLEANUP_DEV_DELETE=true for dev service-role cleanup",
      };
    }
    return deleteAdminUserAccount(admin, actorUserId, targetUserId, { confirmCode });
  }

  const resolved = await resolveTargetAuthUser(admin, targetUserId);
  if (!resolved.ok) return resolved;

  const protection = await assessDeleteProtection(admin, actorUserId, resolved.user);
  if (!protection.ok) {
    return { ok: false, code: protection.code };
  }

  const cleanup = await cleanupUserDependenciesBeforeAuthDelete(admin, targetUserId);
  if (!cleanup.ok) {
    return {
      ok: false,
      code: cleanup.code,
      table: cleanup.table,
      cleaned: cleanup.cleaned,
    };
  }

  const remaining = await previewAdminUserDeleteDependencies(admin, targetUserId);
  const hardBlockers = remaining.filter((b) => !b.cascadesOnAuthDelete && (b.count ?? 0) > 0);
  if (hardBlockers.length > 0) {
    return {
      ok: false,
      code: "delete_blocked_by_dependencies",
      blockers: hardBlockers,
      cleaned: cleanup.cleaned,
    };
  }

  const studentRows = remaining.find((b) => b.table === "students.parent_id" && (b.count ?? 0) > 0);
  if (studentRows) {
    const studentCleanup = await devCleanupParentStudentsBeforeAuthDelete(admin, targetUserId);
    if (!studentCleanup.ok) {
      return { ok: false, code: studentCleanup.code, table: studentCleanup.table, cleaned: cleanup.cleaned };
    }
  }

  const { error } = await admin.auth.admin.deleteUser(targetUserId);
  if (error) {
    return {
      ok: false,
      code: "auth_delete_failed",
      message: String(error.message || "auth_delete_failed").slice(0, 200),
      cleaned: cleanup.cleaned,
    };
  }

  return {
    ok: true,
    deletedUserId: targetUserId,
    email: resolved.email,
    cleaned: cleanup.cleaned,
  };
}

async function runDelete({ jsonPath } = {}) {
  const devBypass =
    String(process.env.ACCOUNT_CLEANUP_DEV_DELETE || "")
      .trim()
      .toLowerCase() === "true";

  let confirmCode = "";
  if (!devBypass) {
    if (
      String(process.env.ADMIN_FULL_ACCOUNT_DELETE_ENABLED || "")
        .trim()
        .toLowerCase() !== "true"
    ) {
      throw new Error(
        "ADMIN_FULL_ACCOUNT_DELETE_ENABLED must be true, or set ACCOUNT_CLEANUP_DEV_DELETE=true for dev service-role cleanup"
      );
    }
    if (!String(process.env.ADMIN_FULL_ACCOUNT_DELETE_CONFIRM_CODE || "").trim()) {
      throw new Error("ADMIN_FULL_ACCOUNT_DELETE_CONFIRM_CODE must be set in .env.local");
    }
    confirmCode = process.env.ADMIN_FULL_ACCOUNT_DELETE_CONFIRM_CODE.trim();
  }

  const inventoryPath =
    jsonPath ||
    path.join(REPORTS_DIR, `SUPABASE_ACCOUNT_CLEANUP_MAP_${todayStamp()}.json`);

  if (!fs.existsSync(inventoryPath)) {
    throw new Error(`Inventory JSON not found: ${inventoryPath}`);
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const candidates = inventory.accounts.filter((a) => a.action === "DELETE_CANDIDATE");

  const url = requireEnv("NEXT_PUBLIC_LEARNING_SUPABASE_URL");
  const serviceKey = requireEnv("LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { normalizeUserEmail } = await import("../../lib/admin-server/admin-user-delete.server.js");

  const actorEmail = normalizeEmail(
    process.env.ACCOUNT_CLEANUP_ACTOR_EMAIL || inventory.actorEmail || "admin@admin.com"
  );
  const actorUser = await findUserByEmail(admin, actorEmail);
  if (!actorUser?.id) throw new Error(`Actor admin not found: ${actorEmail}`);

  const results = [];
  for (const row of candidates) {
    const email = normalizeUserEmail({ email: row.email });
    if (email.endsWith("@leo-k.com")) {
      results.push({ userId: row.userId, email: row.email, ok: false, code: "skipped_keep_leo_k" });
      continue;
    }
    if (email === "admin@admin.com" || email === "leokid2026@gmail.com") {
      results.push({ userId: row.userId, email: row.email, ok: false, code: "skipped_protected_email" });
      continue;
    }
    if (isOwner18eranEmail(email)) {
      results.push({ userId: row.userId, email: row.email, ok: false, code: "skipped_owner_18eran" });
      continue;
    }
    if (row.userId === actorUser.id) {
      results.push({ userId: row.userId, email: row.email, ok: false, code: "skipped_actor_self" });
      continue;
    }

    const outcome = await deleteUserWithServerLogic(admin, actorUser.id, row.userId, {
      confirmCode,
    });
    results.push({
      userId: row.userId,
      email: row.email,
      ok: outcome.ok,
      code: outcome.ok ? "deleted" : outcome.code,
      message: outcome.message || null,
    });
    console.log(
      `${outcome.ok ? "DELETED" : "FAILED"} ${row.email || row.userId} — ${outcome.ok ? "ok" : outcome.code}`
    );
  }

  const stamp = todayStamp();
  const resultPath = path.join(REPORTS_DIR, `SUPABASE_ACCOUNT_CLEANUP_DELETE_RESULTS_${stamp}.json`);
  const summary = {
    ranAt: new Date().toISOString(),
    inventoryPath,
    actorEmail,
    attempted: candidates.length,
    deleted: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(`Delete results: ${resultPath}`);
  console.log(`Deleted ${summary.deleted}/${summary.attempted}, failed ${summary.failed}`);

  return summary;
}

async function main() {
  const cmd = process.argv[2] || "inventory";
  if (cmd === "inventory") {
    const suffixArg = process.argv.find((a) => a.startsWith("--suffix="));
    const suffix = suffixArg ? suffixArg.split("=")[1] : process.argv.includes("--suffix")
      ? process.argv[process.argv.indexOf("--suffix") + 1]
      : "";
    await runInventory({ suffix });
    return;
  }
  if (cmd === "delete") {
    const jsonArg = process.argv.find((a) => a.startsWith("--json="));
    const jsonPath = jsonArg ? jsonArg.split("=")[1] : null;
    await runDelete({ jsonPath });
    return;
  }
  throw new Error(`Unknown command: ${cmd}. Use inventory | delete`);
}

main().catch((e) => {
  console.error("account-cleanup: FAIL", e.message || e);
  process.exit(1);
});
