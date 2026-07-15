/**
 * Admin manual coin credit — validation + API contract tests.
 * Run: node --test tests/admin/admin-manual-coin-credit.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ADMIN_MANUAL_COIN_REASON,
  ADMIN_MANUAL_COIN_SOURCE_TYPE,
  parseManualCoinClientRequestId,
  parseManualCoinCreditAmount,
  parseManualCoinCreditCategory,
  parseManualCoinCreditNote,
  parseParentLookupEmail,
} from "../../lib/admin-server/admin-manual-coin-credit.server.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

describe("parseManualCoinCreditAmount", () => {
  test("accepts positive integers", () => {
    assert.deepEqual(parseManualCoinCreditAmount(50), { ok: true, amount: 50 });
    assert.deepEqual(parseManualCoinCreditAmount("100000"), { ok: true, amount: 100_000 });
    assert.deepEqual(parseManualCoinCreditAmount(500_000), { ok: true, amount: 500_000 });
    assert.deepEqual(parseManualCoinCreditAmount(1_000_000), { ok: true, amount: 1_000_000 });
  });

  test("rejects zero", () => {
    assert.equal(parseManualCoinCreditAmount(0).ok, false);
    assert.equal(parseManualCoinCreditAmount("0").ok, false);
  });

  test("rejects negative numbers", () => {
    assert.equal(parseManualCoinCreditAmount(-1).ok, false);
    assert.equal(parseManualCoinCreditAmount("-50").ok, false);
  });

  test("rejects decimals", () => {
    assert.equal(parseManualCoinCreditAmount(50.5).ok, false);
    assert.equal(parseManualCoinCreditAmount("12.3").ok, false);
  });

  test("rejects text and empty", () => {
    assert.equal(parseManualCoinCreditAmount("abc").ok, false);
    assert.equal(parseManualCoinCreditAmount("").ok, false);
    assert.equal(parseManualCoinCreditAmount(null).ok, false);
    assert.equal(parseManualCoinCreditAmount(undefined).ok, false);
    assert.equal(parseManualCoinCreditAmount(true).ok, false);
  });
});

describe("parseManualCoinCreditCategory", () => {
  test("accepts known categories", () => {
    for (const c of ["compensation", "bonus", "bugfix", "other"]) {
      assert.equal(parseManualCoinCreditCategory(c).ok, true);
    }
  });

  test("rejects unknown category", () => {
    assert.equal(parseManualCoinCreditCategory("פיצוי").ok, false);
    assert.equal(parseManualCoinCreditCategory("").ok, false);
  });
});

describe("parseManualCoinCreditNote", () => {
  test("allows empty note", () => {
    assert.deepEqual(parseManualCoinCreditNote(""), { ok: true, note: "" });
    assert.deepEqual(parseManualCoinCreditNote(null), { ok: true, note: "" });
  });

  test("rejects non-string note", () => {
    assert.equal(parseManualCoinCreditNote(123).ok, false);
  });
});

describe("parseManualCoinClientRequestId", () => {
  test("requires non-empty id", () => {
    assert.equal(parseManualCoinClientRequestId("").ok, false);
    assert.equal(parseManualCoinClientRequestId("   ").ok, false);
  });

  test("accepts uuid-like id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    assert.deepEqual(parseManualCoinClientRequestId(id), { ok: true, clientRequestId: id });
  });
});

describe("parseParentLookupEmail", () => {
  test("accepts valid email", () => {
    assert.deepEqual(parseParentLookupEmail("Parent@Example.COM"), {
      ok: true,
      email: "parent@example.com",
    });
  });

  test("rejects invalid email", () => {
    assert.equal(parseParentLookupEmail("").ok, false);
    assert.equal(parseParentLookupEmail("not-email").ok, false);
  });
});

describe("API route contract", () => {
  test("coin-credit uses applyArcadeCoinMove and earn only", () => {
    const serverSrc = readFileSync(
      join(ROOT, "lib/admin-server/admin-manual-coin-credit.server.js"),
      "utf8"
    );
    const apiSrc = readFileSync(
      join(ROOT, "pages/api/admin/students/[studentId]/coin-credit.js"),
      "utf8"
    );

    assert.match(serverSrc, /applyArcadeCoinMove/);
    assert.match(serverSrc, /direction:\s*["']earn["']/);
    assert.match(serverSrc, /reason:\s*ADMIN_MANUAL_COIN_REASON/);
    assert.doesNotMatch(serverSrc, /direction:\s*["']adjust["']/);
    assert.doesNotMatch(serverSrc, /\.update\(\s*\{[^}]*balance/);
    assert.doesNotMatch(serverSrc, /student_coin_balances.*update/);

    assert.match(apiSrc, /requireAdminApiContext/);
    assert.match(apiSrc, /isAdminManualCoinCreditEnabled/);
    assert.match(apiSrc, /creditAdminManualCoins/);
  });

  test("idempotency key format", () => {
    const src = readFileSync(
      join(ROOT, "lib/admin-server/admin-manual-coin-credit.server.js"),
      "utf8"
    );
    assert.match(src, /admin_manual:\$\{adminUserId\}:\$\{clientRequestId\}/);
  });

  test("metadata includes admin fields", () => {
    const src = readFileSync(
      join(ROOT, "lib/admin-server/admin-manual-coin-credit.server.js"),
      "utf8"
    );
    assert.match(src, /admin_user_id/);
    assert.match(src, /manual_admin_action:\s*true/);
    assert.equal(ADMIN_MANUAL_COIN_REASON, "admin_manual_credit");
    assert.equal(ADMIN_MANUAL_COIN_SOURCE_TYPE, "admin_manual_credit");
  });

  test("feature flag blocks API when disabled", () => {
    const flagsSrc = readFileSync(
      join(ROOT, "lib/admin-server/admin-manual-coin-credit.flags.js"),
      "utf8"
    );
    assert.match(flagsSrc, /ENABLE_ADMIN_MANUAL_COIN_CREDIT/);
  });

  test("parent by-email endpoint is admin-guarded", () => {
    const src = readFileSync(join(ROOT, "pages/api/admin/parents/by-email.js"), "utf8");
    assert.match(src, /requireAdminApiContext/);
    assert.match(src, /lookupAdminParentStudentsByEmail/);
    assert.match(src, /isAdminManualCoinCreditEnabled/);
    assert.doesNotMatch(src, /parentUserId/);
  });

  test("migration widens admin_audit_log for student", () => {
    const mig = readFileSync(
      join(ROOT, "supabase/migrations/062_admin_audit_log_student_target.sql"),
      "utf8"
    );
    assert.match(mig, /student/);
    assert.match(mig, /parent_settings/);
  });
});

describe("Admin UI Hebrew-only labels", () => {
  test("manual coins tab uses parent email flow", () => {
    const uiSrc = readFileSync(
      join(ROOT, "components/admin/rewards/AdminManualCoinsTab.jsx"),
      "utf8"
    );
    assert.match(uiSrc, /כתובת מייל של הורה/);
    assert.match(uiSrc, /טען ילדים/);
    assert.match(uiSrc, /לא נמצא הורה עם כתובת המייל הזו/);
    assert.match(uiSrc, /בחר ילד/);
    assert.match(uiSrc, /ילד נבחר/);
    assert.doesNotMatch(uiSrc, /מזהה ילד/);
    assert.doesNotMatch(uiSrc, /coin-info/);
  });

  test("manual coins tab uses Hebrew category labels", () => {
    const uiSrc = readFileSync(
      join(ROOT, "components/admin/rewards/AdminManualCoinsTab.jsx"),
      "utf8"
    );
    assert.match(uiSrc, /פיצוי/);
    assert.match(uiSrc, /בונוס/);
    assert.match(uiSrc, /תיקון תקלה/);
    assert.match(uiSrc, /הוסף מטבעות לילד/);
    assert.match(uiSrc, /המטבעות נוספו בהצלחה/);
    assert.doesNotMatch(uiSrc, />\s*compensation\s*</);
    assert.doesNotMatch(uiSrc, />\s*bugfix\s*</);
  });

  test("tab hidden unless client flag enabled", () => {
    const shellSrc = readFileSync(
      join(ROOT, "components/admin/rewards/AdminRewardsShell.jsx"),
      "utf8"
    );
    assert.match(shellSrc, /manualCoinOnly/);
    assert.match(shellSrc, /isAdminManualCoinCreditEnabledClient/);
  });

  test("manual coins tab shows operational activity support", () => {
    const uiSrc = readFileSync(
      join(ROOT, "components/admin/rewards/AdminManualCoinsTab.jsx"),
      "utf8"
    );
    assert.match(uiSrc, /פעילות אחרונה/);
    assert.match(uiSrc, /אין פעילות מתועדת/);
    assert.match(uiSrc, /אירועים אחרונים/);
    assert.match(uiSrc, /recent-events/);
  });
});

describe("Admin student support activity", () => {
  test("summarizeLastStudentActivity handles empty and populated", async () => {
    const { summarizeLastStudentActivity } = await import(
      "../../lib/admin-server/admin-student-support-activity.server.js"
    );
    const empty = summarizeLastStudentActivity([]);
    assert.equal(empty.hasActivity, false);
    assert.equal(empty.shortLineHe, "אין פעילות");

    const withEvent = summarizeLastStudentActivity([
      {
        atIso: "2026-06-20T02:04:00.000Z",
        atLabelHe: "20/06/2026 02:04",
        lineHe: "סיים תרגול חשבון - 16 שאלות - 75% - 26 דקות",
        detailLineHe: "תרגול חשבון · 16 שאלות · 75% · 26 דקות",
      },
    ]);
    assert.equal(withEvent.hasActivity, true);
    assert.equal(withEvent.atLabelHe, "20/06/2026 02:04");
    assert.equal(withEvent.detailLineHe, "תרגול חשבון · 16 שאלות · 75% · 26 דקות");
  });

  test("manual coin lines use Hebrew category in timeline source", () => {
    const src = readFileSync(
      join(ROOT, "lib/admin-server/admin-student-support-activity.server.js"),
      "utf8"
    );
    assert.match(src, /מטבעות ידנית - סיבה:/);
    assert.match(src, /ADMIN_MANUAL_COIN_REASON/);
    assert.match(src, /learning_sessions/);
    assert.match(src, /coin_transactions/);
    assert.match(src, /parent_activity_status/);
    assert.match(src, /analytics_events/);
  });

  test("parent lookup attaches lastActivity per child", () => {
    const src = readFileSync(
      join(ROOT, "lib/admin-server/admin-manual-coin-credit.server.js"),
      "utf8"
    );
    assert.match(src, /getStudentsLastActivitySummaries/);
    assert.match(src, /lastActivity/);
  });

  test("recent-events API is admin-guarded", () => {
    const src = readFileSync(
      join(ROOT, "pages/api/admin/students/[studentId]/recent-events.js"),
      "utf8"
    );
    assert.match(src, /requireAdminApiContext/);
    assert.match(src, /buildStudentSupportTimeline/);
    assert.match(src, /isAdminManualCoinCreditEnabled/);
  });

  test("manual coin credit writes admin audit with balance before/after", () => {
    const src = readFileSync(
      join(ROOT, "lib/admin-server/admin-manual-coin-credit.server.js"),
      "utf8"
    );
    assert.match(src, /writeAdminAuditRow/);
    assert.match(src, /admin_manual_coin_credit/);
    assert.match(src, /balanceBefore/);
    assert.match(src, /balanceAfter/);
    assert.match(src, /targetType:\s*["']student["']/);
  });
});
