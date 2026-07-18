/**
 * Student portal route matching + client cache deduplication tests.
 * Run: node --test tests/student-ui/student-portal-performance.test.mjs
 */

import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  isStudentProtectedRoute,
  isDemoAccessibleRoute,
} from "../../lib/student-ui/student-protected-routes.client.js";
import {
  fetchStudentMeClient,
  getCachedStudentMe,
  invalidateStudentMeClientCache,
} from "../../lib/learning-client/studentMeClient.js";
import {
  getCachedStudentGameAccess,
  invalidateStudentGameAccessClientCache,
  setCachedStudentGameAccess,
} from "../../lib/learning-client/studentGameAccessClient.js";

describe("student-protected-routes", () => {
  test("covers all student portal hubs by prefix", () => {
    assert.equal(isStudentProtectedRoute("/student/home"), true);
    assert.equal(isStudentProtectedRoute("/student/games"), true);
    assert.equal(isStudentProtectedRoute("/student/learning/math-master"), true);
    assert.equal(isStudentProtectedRoute("/student/activity/[activityId]"), true);
    assert.equal(isStudentProtectedRoute("/student/worksheet/[worksheetId]"), true);
  });

  test("excludes login install and debug routes", () => {
    assert.equal(isStudentProtectedRoute("/student/login"), false);
    assert.equal(isStudentProtectedRoute("/student/install-app"), false);
    assert.equal(isStudentProtectedRoute("/student/pwa-debug"), false);
  });

  test("excludes parent learning reports", () => {
    assert.equal(isStudentProtectedRoute("/learning/parent-report"), false);
    assert.equal(isStudentProtectedRoute("/learning/parent-report-detailed"), false);
  });

  test("learning masters remain gated via exact registry", () => {
    assert.equal(isStudentProtectedRoute("/learning"), true);
    assert.equal(isStudentProtectedRoute("/learning/math-master"), true);
    assert.equal(isStudentProtectedRoute("/student/learning/math-master"), true);
    assert.equal(isStudentProtectedRoute("/student/learning/book/[subject]/[grade]"), true);
  });

  test("unknown learning paths are not auto-gated by prefix", () => {
    assert.equal(isStudentProtectedRoute("/learning/unknown-future-route"), false);
  });

  test("demo accessible matches student world prefix", () => {
    assert.equal(isDemoAccessibleRoute("/student/home"), true);
    assert.equal(isDemoAccessibleRoute("/student/cards"), true);
    assert.equal(isDemoAccessibleRoute("/"), false);
  });
});

describe("studentMeClient deduplication", () => {
  /** @type {typeof globalThis.fetch | undefined} */
  let originalFetch;

  beforeEach(() => {
    invalidateStudentMeClientCache();
    originalFetch = globalThis.fetch;
  });

  test("fetchStudentMeClient dedupes concurrent requests", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        async json() {
          return { student: { id: "s1", full_name: "Test" } };
        },
      };
    };

    const [a, b] = await Promise.all([
      fetchStudentMeClient({ force: true }),
      fetchStudentMeClient({ force: true }),
    ]);

    assert.equal(calls, 1);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(getCachedStudentMe()?.student?.id, "s1");
    globalThis.fetch = originalFetch;
  });

  test("returns cached payload without network when fresh", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return {
        ok: true,
        async json() {
          return { student: { id: "s2" } };
        },
      };
    };

    await fetchStudentMeClient({ force: true });
    const cached = await fetchStudentMeClient();
    assert.equal(cached.fromCache, true);
    assert.equal(getCachedStudentMe()?.student?.id, "s2");
    // Initial fetch + optional silent background refresh
    assert.ok(calls >= 1 && calls <= 2);
    globalThis.fetch = originalFetch;
  });
});

describe("studentGameAccessClient cache", () => {
  beforeEach(() => {
    invalidateStudentGameAccessClientCache();
  });

  test("stores and reads game access by student id", () => {
    setCachedStudentGameAccess("kid-1", { ok: true, games: [] });
    assert.deepEqual(getCachedStudentGameAccess("kid-1"), { ok: true, games: [] });
    assert.equal(getCachedStudentGameAccess("kid-2"), null);
  });
});
