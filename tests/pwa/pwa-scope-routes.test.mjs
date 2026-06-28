import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  mapLegacyPathToScopedPath,
  PARENT_GUARDIAN_VIEW_PATH,
  PARENT_REPORT_PATH,
  reportDetailedPathForSource,
  reportHubPathForSource,
  STUDENT_GAMES_HUB,
  STUDENT_LEARNING_HUB,
  STUDENT_OFFLINE_HUB,
  TEACHER_REPORT_PATH,
} from "../../lib/pwa/pwa-scope-routes.js";
import { resolvePwaManifestHref } from "../../lib/pwa/resolve-pwa-manifest.js";

const ROOT = path.resolve(import.meta.dirname, "../..");

function readManifest(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "public", relativePath), "utf8"));
}

describe("pwa scope route mapping", () => {
  test("maps student legacy hubs into /student scope", () => {
    assert.equal(mapLegacyPathToScopedPath("/games"), STUDENT_GAMES_HUB);
    assert.equal(mapLegacyPathToScopedPath("/game"), "/student/game");
    assert.equal(mapLegacyPathToScopedPath("/learning"), STUDENT_LEARNING_HUB);
    assert.equal(mapLegacyPathToScopedPath("/learning/math-master"), "/student/learning/math-master");
    assert.equal(mapLegacyPathToScopedPath("/offline"), STUDENT_OFFLINE_HUB);
    assert.equal(mapLegacyPathToScopedPath("/offline/tic-tac-toe"), "/student/offline/tic-tac-toe");
  });

  test("routes parent and teacher reports separately", () => {
    const parentParams = new URLSearchParams("source=parent");
    const teacherParams = new URLSearchParams("source=teacher");
    const noSourceParams = new URLSearchParams("");
    assert.equal(mapLegacyPathToScopedPath("/learning/parent-report", parentParams), PARENT_REPORT_PATH);
    assert.equal(mapLegacyPathToScopedPath("/learning/parent-report", teacherParams), TEACHER_REPORT_PATH);
    assert.equal(mapLegacyPathToScopedPath("/learning/parent-report", noSourceParams), PARENT_REPORT_PATH);
    assert.equal(
      mapLegacyPathToScopedPath("/learning/parent-report-detailed", teacherParams),
      reportDetailedPathForSource("teacher")
    );
    assert.equal(
      mapLegacyPathToScopedPath("/learning/parent-report-detailed", noSourceParams),
      reportDetailedPathForSource("parent")
    );
  });

  test("maps guardian legacy paths into parent scope", () => {
    assert.equal(mapLegacyPathToScopedPath("/guardian/view"), PARENT_GUARDIAN_VIEW_PATH);
  });

  test("does not remap already-scoped portal paths", () => {
    assert.equal(mapLegacyPathToScopedPath("/student/home"), null);
    assert.equal(mapLegacyPathToScopedPath("/parent/dashboard"), null);
    assert.equal(mapLegacyPathToScopedPath("/teacher/dashboard"), null);
    assert.equal(mapLegacyPathToScopedPath("/parent/parent-report"), null);
    assert.equal(mapLegacyPathToScopedPath("/teacher/parent-report"), null);
  });
});

describe("pwa manifest resolution (acceptance checklist)", () => {
  const studentManifest = readManifest("manifest-student.webmanifest");
  const parentManifest = readManifest("manifest-parent.webmanifest");
  const teacherManifest = readManifest("manifest-teacher.webmanifest");

  test("student scoped URLs use student manifest and scope", () => {
    for (const asPath of [
      "/student/home",
      "/student/games",
      "/student/learning/math-master",
      "/student/offline/tic-tac-toe",
    ]) {
      assert.equal(resolvePwaManifestHref("/games", asPath), "/manifest-student.webmanifest");
      assert.ok(asPath.startsWith(studentManifest.scope));
    }
  });

  test("parent scoped URLs use parent manifest and scope", () => {
    for (const asPath of ["/parent/dashboard", "/parent/home", PARENT_REPORT_PATH, PARENT_GUARDIAN_VIEW_PATH]) {
      assert.equal(resolvePwaManifestHref("/learning/parent-report", asPath), "/manifest-parent.webmanifest");
      assert.ok(asPath.startsWith(parentManifest.scope));
    }
  });

  test("teacher scoped URLs use teacher manifest and scope", () => {
    for (const asPath of ["/teacher/dashboard", "/teacher/home", TEACHER_REPORT_PATH]) {
      assert.equal(resolvePwaManifestHref("/learning/parent-report", asPath), "/manifest-teacher.webmanifest");
      assert.ok(asPath.startsWith(teacherManifest.scope));
    }
  });

  test("legacy unscoped URLs resolve to no manifest until middleware redirect", () => {
    assert.equal(resolvePwaManifestHref("/games", "/games"), null);
    assert.equal(resolvePwaManifestHref("/learning/math-master", "/learning/math-master"), null);
  });

  test("manifest files are standalone with matching scopes", () => {
    assert.equal(studentManifest.display, "standalone");
    assert.equal(studentManifest.scope, "/student/");
    assert.equal(parentManifest.display, "standalone");
    assert.equal(parentManifest.scope, "/parent/");
    assert.equal(teacherManifest.display, "standalone");
    assert.equal(teacherManifest.scope, "/teacher/");
  });
});
