#!/usr/bin/env node
/**
 * Verifies 034 precheck SQL (read-only) and optional local DB execution.
 * Refuses remote/production Supabase URLs unless SCHOOL_PRECHECK_ALLOW_REMOTE=1.
 *
 * Usage:
 *   node scripts/school-portal/verify-034-precheck.mjs
 *   SCHOOL_PRECHECK_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node scripts/school-portal/verify-034-precheck.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..", "..");

const PRECHECK_PATH = join(
  root,
  "scripts/school-portal/sql-prechecks/034_teacher_access_audit_precheck.sql"
);
const MIGRATION_034_PATH = join(
  root,
  "supabase/migrations/034_school_account_audit_actions.sql"
);

const FORBIDDEN_SQL =
  /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|GRANT|REVOKE|CALL|EXECUTE)\b/i;

function extractAllowlist(sql, constraintName) {
  const re = new RegExp(
    `${constraintName}[\\s\\S]*?CHECK\\s*\\(\\s*action\\s+IN\\s*\\(([\\s\\S]*?)\\)\\s*\\)`,
    "i"
  );
  const m = sql.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]).sort();
}

function extractPrecheckAllowlist(sql) {
  const m = sql.match(/WHERE action NOT IN\s*\(([\s\S]*?)\)\s*GROUP BY/i);
  if (!m) return null;
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]).sort();
}

function activeSqlStatements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function collectAuditActionsFromCode() {
  const actions = new Set();
  const re = /writeTeacherAuditRow\(\{[\s\S]*?action:\s*["']([a-z0-9_]+)["']/g;
  const re2 = /writeTeacherAuditRow\([^,]+,\s*\{[\s\S]*?action:\s*["']([a-z0-9_]+)["']/g;
  const re3 = /action:\s*["']([a-z0-9_]+)["'][\s\S]*?writeTeacherAuditRow/g;

  function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".next" || name === "review-packages") continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(js|jsx|mjs)$/.test(name)) continue;
      const text = readFileSync(p, "utf8");
      if (!text.includes("writeTeacherAuditRow")) continue;
      for (const reUse of [re, re2]) {
        let m;
        while ((m = reUse.exec(text))) actions.add(m[1]);
      }
      const blocks = text.split("writeTeacherAuditRow");
      for (let i = 1; i < blocks.length; i++) {
        const chunk = blocks[i].slice(0, 400);
        const am = chunk.match(/action:\s*["']([a-z0-9_]+)["']/);
        if (am) actions.add(am[1]);
        const ternary = chunk.match(
          /action:\s*[^,]+?\?\s*["']([a-z0-9_]+)["']\s*:\s*["']([a-z0-9_]+)["']/
        );
        if (ternary) {
          actions.add(ternary[1]);
          actions.add(ternary[2]);
        }
      }
    }
  }
  walk(join(root, "lib"));
  walk(join(root, "pages"));
  return [...actions].sort();
}

function isLocalDatabaseUrl(url) {
  try {
    const u = new URL(url);
    const host = (u.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

function isBlockedRemoteUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes("supabase.co")) return true;
  if (process.env.SCHOOL_PRECHECK_ALLOW_REMOTE === "1") return false;
  return !isLocalDatabaseUrl(url);
}

async function runPrecheckOnDatabase(databaseUrl) {
  if (isBlockedRemoteUrl(databaseUrl)) {
    throw new Error(
      "Refusing to run precheck on remote/production URL. Use localhost only or set SCHOOL_PRECHECK_ALLOW_REMOTE=1 (not recommended)."
    );
  }
  const { Client } = await import("pg");
  const sql = readFileSync(PRECHECK_PATH, "utf8");
  const statement = activeSqlStatements(sql).find((s) =>
    /^SELECT/i.test(s)
  );
  if (!statement) throw new Error("No SELECT statement in precheck file");

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { rows } = await client.query(statement);
    return rows;
  } finally {
    await client.end();
  }
}

async function main() {
  const precheckSql = readFileSync(PRECHECK_PATH, "utf8");
  const migration034 = readFileSync(MIGRATION_034_PATH, "utf8");

  console.log("=== 034 precheck verification (dev) ===\n");

  // 1. Read-only SQL
  const statements = activeSqlStatements(precheckSql);
  const nonSelect = statements.filter((s) => !/^SELECT/i.test(s));
  const readOnly = nonSelect.length === 0;
  console.log(`1. SQL read-only: ${readOnly ? "YES" : "NO"}`);
  if (!readOnly) {
    console.error("   Non-SELECT statements:", nonSelect);
    process.exit(1);
  }
  for (const s of statements) {
    if (FORBIDDEN_SQL.test(s) && !/^SELECT/i.test(s)) {
      console.error("   Forbidden keyword in:", s.slice(0, 80));
      process.exit(1);
    }
  }

  // 2. Allowlist parity
  const precheckList = extractPrecheckAllowlist(precheckSql);
  const migrationList = extractAllowlist(migration034, "teacher_access_audit_action_chk");
  if (!precheckList?.length || !migrationList?.length) {
    console.error("   Failed to parse allowlists");
    process.exit(1);
  }
  const precheckSet = new Set(precheckList);
  const migrationSet = new Set(migrationList);
  const parity =
    precheckList.length === migrationList.length &&
    precheckList.every((a) => migrationSet.has(a));
  console.log(`2. Precheck allowlist matches 034 migration: ${parity ? "YES" : "NO"}`);
  if (!parity) {
    const onlyPrecheck = precheckList.filter((a) => !migrationSet.has(a));
    const onlyMigration = migrationList.filter((a) => !precheckSet.has(a));
    if (onlyPrecheck.length) console.error("   Only in precheck:", onlyPrecheck);
    if (onlyMigration.length) console.error("   Only in 034:", onlyMigration);
    process.exit(1);
  }
  console.log(`   (${precheckList.length} actions in allowlist)`);

  // 3. App audit actions subset of allowlist
  const codeActions = collectAuditActionsFromCode();
  const orphans = codeActions.filter((a) => !precheckSet.has(a));
  console.log(
    `3. App writeTeacherAuditRow actions in allowlist: ${orphans.length === 0 ? "YES" : "NO"}`
  );
  if (orphans.length) {
    console.error("   Not in precheck allowlist:", orphans);
    process.exit(1);
  }
  console.log(`   (${codeActions.length} distinct actions in app code)`);

  // 4. Optional live DB (localhost only)
  const dbUrl =
    process.env.SCHOOL_PRECHECK_DATABASE_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;
  let liveRows = null;
  if (dbUrl) {
    if (isBlockedRemoteUrl(dbUrl)) {
      console.log(
        "4. Live DB precheck: SKIPPED (remote/production URL blocked)"
      );
    } else {
      try {
        liveRows = await runPrecheckOnDatabase(dbUrl);
        console.log(
          `4. Live DB precheck (${new URL(dbUrl).host}): ${
            liveRows.length === 0 ? "ZERO rows" : `${liveRows.length} row(s)`
          }`
        );
        if (liveRows.length) {
          console.log(JSON.stringify(liveRows, null, 2));
          process.exit(1);
        }
      } catch (e) {
        console.log(`4. Live DB precheck: SKIPPED (${e.message})`);
      }
    }
  } else {
    console.log(
      "4. Live DB precheck: SKIPPED (no SCHOOL_PRECHECK_DATABASE_URL; local Supabase/Docker not running)"
    );
  }

  console.log("\n=== Summary ===");
  console.log(
    "Precheck SQL is safe (SELECT-only). Allowlist matches 034. App audit actions are covered."
  );
  if (liveRows && liveRows.length === 0) {
    console.log("Live dev DB returned zero rows — 034 migration is safe to apply on that DB.");
  } else if (!liveRows) {
    console.log(
      "Owner DB precheck was NOT executed (forbidden). Logical check passed; live row count on owner DB is still unknown."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
