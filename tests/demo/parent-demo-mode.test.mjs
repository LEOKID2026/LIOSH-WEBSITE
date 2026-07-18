/**
 * Parent demo mode — focused unit tests (no browser, no DB).
 * Run: node --test tests/demo/parent-demo-mode.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PLAY_LIMIT_MS,
  isPlayExpired,
  buildDemoDisplayStudent,
  DEMO_SESSION_VERSION,
  isHomeDemoButtonExcluded,
  shouldDemoHudHomeNavigateToPublic,
  DEMO_HUD_STUDENT_HOME_HREF,
} from "../../lib/demo/demo-mode.client.js";
import {
  DEMO_ARCADE_PROFILE,
  DEMO_ARCADE_HISTORY,
  DEMO_AVATAR_EMOJI,
} from "../../components/demo/demo-display-fixtures.js";
import { DEMO_TIME_EXPIRED_CODE } from "../../lib/demo/demo-play-guard.client.js";
import { isDemoOnlineGameRoute } from "../../lib/demo/demo-online-game-routes.client.js";
import {
  isDemoAccessibleRoute,
  isStudentProtectedRoute,
} from "../../lib/student-ui/student-protected-routes.client.js";

describe("parent-demo-mode", () => {
  test("PLAY_LIMIT_MS is 30 minutes", () => {
    assert.equal(PLAY_LIMIT_MS, 30 * 60 * 1000);
  });

  test("session older than 15 but younger than 30 minutes is not expired", () => {
    const twentyMin = {
      v: DEMO_SESSION_VERSION,
      startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      gradeLevel: "g3",
    };
    assert.equal(isPlayExpired(twentyMin), false);
  });

  test("isPlayExpired respects wall-clock from startedAt", () => {
    const fresh = {
      v: DEMO_SESSION_VERSION,
      startedAt: new Date(Date.now() - PLAY_LIMIT_MS + 5000).toISOString(),
      gradeLevel: "g3",
    };
    const expired = {
      v: DEMO_SESSION_VERSION,
      startedAt: new Date(Date.now() - PLAY_LIMIT_MS - 1).toISOString(),
      gradeLevel: "g3",
    };
    assert.equal(isPlayExpired(fresh), false);
    assert.equal(isPlayExpired(expired), true);
  });

  test("buildDemoDisplayStudent has no id field", () => {
    const student = buildDemoDisplayStudent({
      v: DEMO_SESSION_VERSION,
      startedAt: new Date().toISOString(),
      gradeLevel: "g4",
    });
    assert.equal(student.grade_level, "g4");
    assert.equal(student.account_kind, "demo");
    assert.equal("id" in student, false);
    assert.equal("studentId" in student, false);
  });

  test("DEMO_TIME_EXPIRED_CODE is stable", () => {
    assert.equal(DEMO_TIME_EXPIRED_CODE, "demo_time_expired");
  });

  test("isDemoOnlineGameRoute blocks known online game paths", () => {
    assert.equal(isDemoOnlineGameRoute("/student/games/chess"), true);
    assert.equal(isDemoOnlineGameRoute("/student/solo-games/leo-miners"), false);
    assert.equal(isDemoOnlineGameRoute("/student/home"), false);
  });

  test("demo accessible routes include student home and worksheets", () => {
    assert.equal(isDemoAccessibleRoute("/student/home"), true);
    assert.equal(isDemoAccessibleRoute("/student/worksheet/[worksheetId]"), true);
    assert.equal(isDemoAccessibleRoute("/student/learning/math-master"), true);
    assert.equal(isDemoAccessibleRoute("/"), false);
  });

  test("student protected routes remain superset of demo tour paths", () => {
    assert.equal(isStudentProtectedRoute("/student/arcade"), true);
    assert.equal(isDemoAccessibleRoute("/student/arcade"), true);
  });

  test("DEMO_ARCADE_PROFILE is isolated fixture with zero stats", () => {
    assert.equal(DEMO_ARCADE_PROFILE.displayName, "שחקן הדגמה");
    assert.equal(DEMO_ARCADE_PROFILE.totalWins, 0);
    assert.equal(DEMO_ARCADE_PROFILE.totalGames, 0);
    assert.equal(DEMO_ARCADE_HISTORY.length, 0);
  });

  test("demo avatar uses Shiba dog emoji not lion", () => {
    assert.equal(DEMO_AVATAR_EMOJI, "🐶");
    assert.notEqual(DEMO_AVATAR_EMOJI, "🦁");
  });

  test("shouldDemoHudHomeNavigateToPublic only for demo student home HUD", () => {
    assert.equal(shouldDemoHudHomeNavigateToPublic(false, DEMO_HUD_STUDENT_HOME_HREF), false);
    assert.equal(shouldDemoHudHomeNavigateToPublic(true, DEMO_HUD_STUDENT_HOME_HREF), true);
    assert.equal(shouldDemoHudHomeNavigateToPublic(true, "/student/arcade"), false);
    assert.equal(shouldDemoHudHomeNavigateToPublic(true, "/"), false);
  });

  test("isHomeDemoButtonExcluded hides demo, student, admin and private areas", () => {
    assert.equal(isHomeDemoButtonExcluded("/demo/enter"), true);
    assert.equal(isHomeDemoButtonExcluded("/student/home"), true);
    assert.equal(isHomeDemoButtonExcluded("/parent/dashboard"), true);
    assert.equal(isHomeDemoButtonExcluded("/admin/analytics"), true);
    assert.equal(isHomeDemoButtonExcluded("/"), false);
    assert.equal(isHomeDemoButtonExcluded("/guides"), false);
  });

  test("assertDemoPlayAllowed notifies only when expired in demo", async () => {
    const storage = new Map();
    globalThis.window = globalThis;
    globalThis.localStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    };

    const { registerDemoTimeExpiredNotifier, assertDemoPlayAllowed } = await import(
      "../../lib/demo/demo-play-guard.client.js"
    );
    const { writeDemoSession, clearDemoSession } = await import("../../lib/demo/demo-mode.client.js");

    let notified = 0;
    registerDemoTimeExpiredNotifier(() => {
      notified += 1;
    });

    try {
      clearDemoSession();
      assert.equal(assertDemoPlayAllowed(), true);
      assert.equal(notified, 0);

      writeDemoSession({
        v: DEMO_SESSION_VERSION,
        startedAt: new Date(Date.now() - PLAY_LIMIT_MS + 10000).toISOString(),
        gradeLevel: "g3",
      });
      assert.equal(assertDemoPlayAllowed(), true);
      assert.equal(notified, 0);

      writeDemoSession({
        v: DEMO_SESSION_VERSION,
        startedAt: new Date(Date.now() - PLAY_LIMIT_MS - 1000).toISOString(),
        gradeLevel: "g3",
      });
      assert.equal(assertDemoPlayAllowed(), false);
      assert.equal(notified, 1);
    } finally {
      delete globalThis.window;
      delete globalThis.localStorage;
      clearDemoSession();
      registerDemoTimeExpiredNotifier(null);
    }
  });
});
