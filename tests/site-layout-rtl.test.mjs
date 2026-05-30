import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getContextNav,
  NAV_AREAS,
  resolveNavArea,
  shouldLayoutUseRtl,
} from "../lib/site-nav.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

test("shouldLayoutUseRtl: student activity and auth routes use RTL shell", () => {
  assert.equal(shouldLayoutUseRtl("/student/activity/[activityId]"), true);
  assert.equal(shouldLayoutUseRtl("/student/worksheet/[worksheetId]"), true);
  assert.equal(shouldLayoutUseRtl("/auth/reset-password"), true);
  assert.equal(shouldLayoutUseRtl("/auth/forgot-password"), true);
  assert.equal(shouldLayoutUseRtl("/parent/dashboard"), true);
  assert.equal(shouldLayoutUseRtl("/teacher/dashboard"), true);
  assert.equal(shouldLayoutUseRtl("/school/dashboard"), true);
});

test("shouldLayoutUseRtl: immersive learning masters skip site header shell", () => {
  assert.equal(shouldLayoutUseRtl("/learning/hebrew-master"), false);
  assert.equal(shouldLayoutUseRtl("/learning/dev/engine-review"), true);
});

test("resolveNavArea: student activity uses student HUD links", () => {
  assert.equal(resolveNavArea("/student/activity/[activityId]"), NAV_AREAS.student);
  const nav = getContextNav("/student/activity/[activityId]");
  assert.match(nav.links.map((l) => l.href).join(","), /\/student\/home/);
});

test("resolveNavArea: auth routes respect portal query for nav persona", () => {
  assert.equal(resolveNavArea("/auth/reset-password"), NAV_AREAS.public);
  assert.equal(
    resolveNavArea("/auth/reset-password", { authPortal: "parent" }),
    NAV_AREAS.parent
  );
  assert.equal(
    resolveNavArea("/auth/forgot-password", { authPortal: "teacher" }),
    NAV_AREAS.teacher
  );
  const parentAuth = getContextNav("/auth/reset-password", { authPortal: "parent" });
  assert.match(parentAuth.links.map((l) => l.href).join(","), /\/parent\/login/);
});

test("Layout.js uses centralized RTL helper (no pathname allowlist drift)", () => {
  const src = readFileSync(path.join(repoRoot, "components/Layout.js"), "utf8");
  assert.match(src, /shouldLayoutUseRtl/);
  assert.match(src, /isImmersiveGameLayoutPath/);
  assert.doesNotMatch(src, /pathname\.startsWith\("\/student\/home"\)/);
  assert.match(src, /lang=\{layoutRtlHebrew \? "he"/);
});
