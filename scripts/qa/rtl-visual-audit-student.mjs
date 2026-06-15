/**
 * RTL Visual Audit — Student flow only, using direct API login (no form spinner wait).
 * Usage: node --env-file=.env.e2e.local scripts/qa/rtl-visual-audit-student.mjs
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { applyStudentSessionFromLogin } from "./../../scripts/e2e-lib/hebrew-e2e-student-auth.mjs";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const OUT_DIR = join("docs", "qa", "hebrew-launch-audit", "07-screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const STUDENT_USER = process.env.E2E_STUDENT_USERNAME || "leo-s01";
const STUDENT_PIN = process.env.E2E_STUDENT_PIN || "1234";

// Override env for the auth helper
process.env.E2E_STUDENT_USERNAME = STUDENT_USER;
process.env.E2E_STUDENT_PIN = STUDENT_PIN;

const DESKTOP = { width: 1280, height: 900 };
const MOBILE_SIZE = { width: 390, height: 844 };

const results = [];

async function newCtx(browser, size) {
  const base = {
    baseURL: BASE,
    locale: "he-IL",
  };
  if (size === "mobile") {
    return browser.newContext({ ...base, ...devices["iPhone 13"] });
  }
  return browser.newContext({ ...base, viewport: DESKTOP });
}

async function shot(page, slug, size, role, label) {
  const filename = `${slug}-${role}-${size}.png`;
  const filepath = join(OUT_DIR, filename);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${filename}`);
  results.push({ slug, size, role, label, filename, status: "ok" });
}

async function shotError(slug, size, role, label, err) {
  console.error(`  ❌ ${slug}-${role}-${size}: ${String(err).slice(0, 140)}`);
  results.push({ slug, size, role, label, filename: null, status: "error", error: String(err).slice(0, 200) });
}

const STUDENT_ROUTES = [
  { slug: "05-student-home", path: "/student/home", label: "דף הבית תלמיד" },
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
  { slug: "19-book-math-g6-circle-area", path: "/learning/book/geometry/g6/circle_area", label: "גאומטריה g6 - עיגול + π" },
];

async function captureStudentFlow(browser, size) {
  const ctx = await newCtx(browser, size);
  try {
    // Login via API (no form spinner issues)
    await applyStudentSessionFromLogin(ctx, BASE);
    const page = await ctx.newPage();
    
    // Verify login worked
    await page.goto("/student/home", { waitUntil: "load", timeout: 45_000 });
    const url = page.url();
    if (!url.includes("student")) {
      throw new Error(`Redirected to ${url} after API login — auth failed`);
    }
    await shot(page, "05-student-home", size, "student", "דף הבית תלמיד");

    for (const r of STUDENT_ROUTES.slice(1)) {
      try {
        await page.goto(r.path, { waitUntil: "load", timeout: 45_000 });
        await page.waitForTimeout(2000);
        await shot(page, r.slug, size, "student", r.label);
      } catch (e) { await shotError(r.slug, size, "student", r.label, e); }
    }
  } catch (e) { await shotError("student-auth", size, "student", "כניסת תלמיד API", e); }
  await ctx.close();
}

console.log(`\n🔍 RTL Visual Audit — Student flow — ${BASE}`);
console.log(`📁 Output: ${OUT_DIR}\n`);

const browser = await chromium.launch({ headless: true });

console.log("=== Student flow (desktop) ===");
await captureStudentFlow(browser, "desktop");

console.log("\n=== Student flow (mobile) ===");
await captureStudentFlow(browser, "mobile");

await browser.close();

// Merge with existing manifest
let existing = [];
try { existing = JSON.parse(readFileSync(join(OUT_DIR, "manifest.json"), "utf8")).results || []; } catch {}
const merged = { capturedAt: new Date().toISOString(), baseURL: BASE, results: [...existing, ...results] };
writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(merged, null, 2));
console.log(`\n✅ Done. ${results.filter(r=>r.status==="ok").length} screenshots, ${results.filter(r=>r.status==="error").length} errors.`);
