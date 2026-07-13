import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAreaHomeHref,
  getContextNav,
  isPurePublicMarketingPath,
  isSharedSiteShellPath,
  NAV_AREAS,
  resolveNavArea,
  shouldLayoutUseRtl,
  shouldShowLayoutThemePicker,
} from "../lib/site-nav.js";
import { resolveSharedShellUi } from "../lib/student-ui/student-theme-resolver.client.js";

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

test("shared site shell paths keep active portal context for logo and nav", () => {
  assert.equal(isSharedSiteShellPath("/about"), true);
  assert.equal(isSharedSiteShellPath("/help/articles/foo"), true);
  assert.equal(isSharedSiteShellPath("/parent/dashboard"), false);

  assert.equal(resolveNavArea("/about"), NAV_AREAS.public);
  assert.equal(
    resolveNavArea("/about", { activePortal: NAV_AREAS.parent }),
    NAV_AREAS.parent
  );
  assert.equal(
    getAreaHomeHref("/about", { activePortal: NAV_AREAS.parent }),
    "/parent/dashboard"
  );
  assert.equal(
    getAreaHomeHref("/contact", { activePortal: NAV_AREAS.student }),
    "/student/home"
  );
  assert.equal(
    getAreaHomeHref("/help", { activePortal: NAV_AREAS.teacher }),
    "/teacher/dashboard"
  );

  const parentAboutNav = getContextNav("/about", { activePortal: NAV_AREAS.parent });
  assert.equal(parentAboutNav.area, NAV_AREAS.parent);
  assert.equal(parentAboutNav.links[0].href, "/parent/dashboard");
});

test("pure public marketing paths reset portal context targets", () => {
  assert.equal(isPurePublicMarketingPath("/"), true);
  assert.equal(isPurePublicMarketingPath("/parents"), true);
  assert.equal(isPurePublicMarketingPath("/about"), false);
  assert.equal(getAreaHomeHref("/"), "/");
});

test("getAreaHomeHref: portal routes map to area dashboards", () => {
  assert.equal(getAreaHomeHref("/parent/dashboard"), "/parent/dashboard");
  assert.equal(getAreaHomeHref("/student/home"), "/student/home");
  assert.equal(getAreaHomeHref("/teacher/dashboard"), "/teacher/dashboard");
  assert.equal(getAreaHomeHref("/school/dashboard"), "/teacher/dashboard");
});

test("shouldShowLayoutThemePicker: shared shell pages include about, contact, help", () => {
  assert.equal(shouldShowLayoutThemePicker("/about"), true);
  assert.equal(shouldShowLayoutThemePicker("/contact"), true);
  assert.equal(shouldShowLayoutThemePicker("/help"), true);
  assert.equal(shouldShowLayoutThemePicker("/help/parent-report"), true);
  assert.equal(shouldShowLayoutThemePicker("/help/parents/create-parent-account"), true);
  assert.equal(shouldShowLayoutThemePicker("/terms"), false);
});

test("shared help routes keep portal HUD home from activePortal", () => {
  assert.equal(isSharedSiteShellPath("/help/parent-report"), true);
  assert.equal(
    getAreaHomeHref("/help/parent-report", { activePortal: NAV_AREAS.parent }),
    "/parent/dashboard"
  );
  assert.equal(
    resolveNavArea("/help/parent-report", { activePortal: NAV_AREAS.parent }),
    NAV_AREAS.parent
  );
  const parentHelpNav = getContextNav("/help/parent-report", { activePortal: NAV_AREAS.parent });
  assert.equal(parentHelpNav.links[0].href, "/parent/dashboard");
});

test("resolveSharedShellUi: bright and classic tokens", () => {
  const bright = resolveSharedShellUi("bright");
  const classic = resolveSharedShellUi("classic");
  assert.equal(bright.isBright, true);
  assert.equal(classic.isBright, false);
  assert.equal(bright.SP.showVideoBg, false);
  assert.equal(classic.SP.showVideoBg, true);
  assert.match(bright.SP.card, /bg-white/);
  assert.match(classic.SP.card, /bg-black/);
  assert.match(bright.SP.helpLayoutWrap, /text-slate-800/);
  assert.match(classic.SP.helpLayoutWrap, /text-white/);
});

test("HelpLayoutShell wires shared theme into Layout", () => {
  const src = readFileSync(path.join(repoRoot, "components/help/HelpLayoutShell.js"), "utf8");
  assert.match(src, /useStudentTheme/);
  assert.match(src, /useSharedShellUi/);
  assert.match(src, /studentTheme=\{theme\}/);
  assert.match(src, /studentShell="home"/);
});

test("Layout.js uses centralized nav helpers and portal context persistence", () => {
  const src = readFileSync(path.join(repoRoot, "components/Layout.js"), "utf8");
  assert.match(src, /shouldLayoutUseRtl/);
  assert.match(src, /isImmersiveGameLayoutPath/);
  assert.match(src, /getAreaHomeHref/);
  assert.match(src, /persistSiteNavPortal/);
  assert.match(src, /readSiteNavPortal/);
  assert.match(src, /isPurePublicMarketingPath/);
  assert.doesNotMatch(src, /pathname\.startsWith\("\/student\/home"\)/);
  assert.match(src, /lang=\{layoutRtlHebrew \? "he"/);
});
