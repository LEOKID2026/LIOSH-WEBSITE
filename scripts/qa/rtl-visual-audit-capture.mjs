/**
 * RTL Visual Audit — capture screenshots for all key flows at desktop + mobile.
 * Usage: node --env-file=.env.e2e.local scripts/qa/rtl-visual-audit-capture.mjs
 *
 * Output: docs/qa/hebrew-launch-audit/07-screenshots/
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const OUT_DIR = join("docs", "qa", "hebrew-launch-audit", "07-screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const PARENT_EMAIL = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
const PARENT_PASS = process.env.E2E_PARENT_PASSWORD || "eran747975";
const STUDENT_USER = process.env.E2E_STUDENT_USERNAME || "leo-s01";
const STUDENT_PIN = process.env.E2E_STUDENT_PIN || "1234";

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

const results = [];

function vp(size) {
  return size === "desktop" ? "desktop" : "mobile";
}

async function newCtx(browser, size) {
  if (size === "mobile") {
    return browser.newContext({
      ...devices["iPhone 13"],
      baseURL: BASE,
      locale: "he-IL",
    });
  }
  return browser.newContext({
    baseURL: BASE,
    locale: "he-IL",
    viewport: DESKTOP,
  });
}

async function shot(page, slug, size, role, label) {
  const filename = `${slug}-${role}-${size}.png`;
  const filepath = join(OUT_DIR, filename);
  await page.waitForTimeout(700);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${filename}`);
  results.push({ slug, size, role, label, filename, status: "ok" });
  return filename;
}

async function shotError(slug, size, role, label, err) {
  console.error(`  ❌ ${slug}-${role}-${size}: ${String(err).slice(0, 120)}`);
  results.push({ slug, size, role, label, filename: null, status: "error", error: String(err).slice(0, 200) });
}

// ── Public / unauthenticated ──────────────────────────────────────────────────
const PUBLIC_ROUTES = [
  { slug: "01-home", path: "/", label: "דף הבית", wait: "body" },
  { slug: "02-parent-login", path: "/parent/login", label: "כניסת הורה", wait: "body" },
  { slug: "03-student-login", path: "/student/login", label: "כניסת תלמיד", wait: "body" },
];

async function capturePublic(browser, size) {
  const ctx = await newCtx(browser, size);
  const page = await ctx.newPage();
  for (const r of PUBLIC_ROUTES) {
    try {
      await page.goto(r.path, { waitUntil: "load", timeout: 45_000 });
      await shot(page, r.slug, size, "public", r.label);
    } catch (e) { await shotError(r.slug, size, "public", r.label, e); }
  }
  await ctx.close();
}

// ── Parent flow ───────────────────────────────────────────────────────────────
async function loginParent(page) {
  await page.goto("/parent/login", { waitUntil: "load", timeout: 60_000 });
  // identifier field is type=text in login mode (not type=email)
  await page.locator('input[type="text"][autocomplete="username"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('input[type="text"][autocomplete="username"]').first().fill(PARENT_EMAIL);
  await page.locator('[data-testid="parent-login-secret"]').first().fill(PARENT_PASS);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/parent\/dashboard/, { timeout: 60_000 });
  await page.waitForTimeout(1500);
}

const PARENT_ROUTES_POST_LOGIN = [
  { slug: "04-parent-dashboard", path: "/parent/dashboard", label: "דשבורד הורה", wait: "h1" },
];

async function captureParent(browser, size) {
  const ctx = await newCtx(browser, size);
  const page = await ctx.newPage();
  try {
    await loginParent(page);
    const url = page.url();
    await shot(page, "04-parent-post-login", size, "parent", "אחרי כניסת הורה");

    for (const r of PARENT_ROUTES_POST_LOGIN) {
      try {
        await page.goto(r.path, { waitUntil: "load", timeout: 45_000 });
        await shot(page, r.slug, size, "parent", r.label);
      } catch (e) { await shotError(r.slug, size, "parent", r.label, e); }
    }
  } catch (e) { await shotError("parent-login-flow", size, "parent", "כניסת הורה", e); }
  await ctx.close();
}

// ── Student flow ──────────────────────────────────────────────────────────────
async function loginStudent(page) {
  await page.goto("/student/login", { waitUntil: "load", timeout: 60_000 });
  // Wait for session check spinner to resolve
  await page.locator('[data-testid="student-login-username"]').waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('[data-testid="student-login-username"]').fill(STUDENT_USER);
  await page.locator('[data-testid="student-login-pin"]').fill(STUDENT_PIN);
  await page.locator('[data-testid="student-login-submit"]').click();
  await page.waitForURL(/\/student\/home/, { timeout: 60_000 });
  await page.waitForTimeout(1500);
}

const STUDENT_ROUTES = [
  { slug: "06-student-home", path: "/student/home", label: "דף הבית תלמיד" },
  { slug: "07-learning-hub", path: "/learning", label: "מרכז למידה" },
  { slug: "08-math-master", path: "/learning/math-master", label: "תרגול חשבון" },
  { slug: "09-geometry-master", path: "/learning/geometry-master", label: "תרגול גאומטריה" },
  { slug: "10-book-math-g1-add", path: "/learning/book/math/g1/add_two", label: "ספר חשבון כיתה א׳ - חיבור" },
  { slug: "11-book-math-g2-sub-vertical", path: "/learning/book/math/g2/sub_vertical", label: "ספר חשבון כיתה ב׳ - חיסור מאונך" },
  { slug: "12-book-math-g2-coins", path: "/learning/book/math/g2/wp_coins_spent", label: "ספר חשבון כיתה ב׳ - קניות" },
  { slug: "13-book-geo-g4-angles", path: "/learning/book/geometry/g4/shapes_basic_properties_angles", label: "ספר גאומטריה כיתה ד׳ - זוויות 90°" },
  { slug: "14-book-geo-g5-triangle", path: "/learning/book/geometry/g5/triangle_area", label: "ספר גאומטריה כיתה ה׳ - שטח משולש" },
  { slug: "15-book-geo-g6-circle", path: "/learning/book/geometry/g6/circle_area", label: "ספר גאומטריה כיתה ו׳ - שטח עיגול π" },
  { slug: "16-book-heb-g1-phoneme", path: "/learning/book/hebrew/g1/g1.phoneme_awareness", label: "ספר עברית כיתה א׳ - צלילים" },
  { slug: "17-book-heb-g1-niqqud", path: "/learning/book/hebrew/g1/g1.basic_niqqud", label: "ספר עברית כיתה א׳ - ניקוד" },
  { slug: "18-book-heb-g6-critical", path: "/learning/book/hebrew/g6/g6.critical_evaluation_light", label: "ספר עברית כיתה ו׳ - הערכה ביקורתית" },
];

async function captureStudent(browser, size) {
  const ctx = await newCtx(browser, size);
  const page = await ctx.newPage();
  try {
    await loginStudent(page);
    await shot(page, "05-student-post-login", size, "student", "אחרי כניסת תלמיד");

    for (const r of STUDENT_ROUTES) {
      try {
        await page.goto(r.path, { waitUntil: "load", timeout: 45_000 });
        await page.waitForTimeout(1500);
        await shot(page, r.slug, size, "student", r.label);
      } catch (e) { await shotError(r.slug, size, "student", r.label, e); }
    }
  } catch (e) { await shotError("student-login-flow", size, "student", "כניסת תלמיד", e); }
  await ctx.close();
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n🔍 RTL Visual Audit — ${BASE}`);
console.log(`📁 Output: ${OUT_DIR}\n`);

const browser = await chromium.launch({ headless: true });

console.log("=== Public routes (desktop) ===");
await capturePublic(browser, "desktop");

console.log("\n=== Public routes (mobile) ===");
await capturePublic(browser, "mobile");

console.log("\n=== Parent flow (desktop) ===");
await captureParent(browser, "desktop");

console.log("\n=== Parent flow (mobile) ===");
await captureParent(browser, "mobile");

console.log("\n=== Student flow (desktop) ===");
await captureStudent(browser, "desktop");

console.log("\n=== Student flow (mobile) ===");
await captureStudent(browser, "mobile");

await browser.close();

// Write manifest
const manifest = { capturedAt: new Date().toISOString(), baseURL: BASE, results };
writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\n✅ Done. ${results.filter(r=>r.status==="ok").length} screenshots, ${results.filter(r=>r.status==="error").length} errors.`);
console.log(`Manifest: ${join(OUT_DIR, "manifest.json")}`);
