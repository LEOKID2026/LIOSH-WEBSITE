/**
 * Math & Geometry Books RTL Visual Audit — Screenshot Capture
 * Usage: node --env-file=.env.e2e.local scripts/qa/math-geometry-rtl-visual-capture.mjs
 *
 * Output: docs/qa/hebrew-launch-audit-core/C-screenshots/
 * Naming: C-[subject]-g[grade]-[pageId]-[desktop|mobile]-[ok|blocker|high].png
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = process.env.PLAYWRIGHT_BASE_URL || process.env.TRUTH_GATES_BASE_URL || "http://127.0.0.1:3020";
const OUT_DIR = join("docs", "qa", "hebrew-launch-audit-core", "C-screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const STUDENT_USER = process.env.E2E_STUDENT_USERNAME || "leo-s01";
const STUDENT_PIN = process.env.E2E_STUDENT_PIN || "1234";

const DESKTOP = { width: 1280, height: 900 };
const MOBILE_W = 390;
const MOBILE_H = 844;

const results = [];

// All math pages by grade — focus on RTL-critical pages
const MATH_PAGES = [
  // G1 — numbers, add, subtract, compare (<>), coins
  { subject: "math", grade: "g1", pageId: "add_two",            label: "חיבור שני מספרים (3+5)" },
  { subject: "math", grade: "g1", pageId: "sub_two",            label: "חיסור שני מספרים (12-7)" },
  { subject: "math", grade: "g1", pageId: "cmp",                label: "השוואת מספרים < > =" },
  { subject: "math", grade: "g1", pageId: "ns_number_line",     label: "ציר מספרים" },
  { subject: "math", grade: "g1", pageId: "ns_place_tens_units",label: "ערך מקומי עשרות ויחידות" },
  { subject: "math", grade: "g1", pageId: "eq_add_simple",      label: "משוואה פשוטה חיבור" },
  { subject: "math", grade: "g1", pageId: "eq_sub_simple",      label: "משוואה פשוטה חיסור" },
  { subject: "math", grade: "g1", pageId: "mul",                label: "כפל — מבוא" },
  { subject: "math", grade: "g1", pageId: "wp_coins",           label: "תרגילי מילה — מטבעות" },
  // G2 — fractions half/quarter, vertical arithmetic, division
  { subject: "math", grade: "g2", pageId: "frac_half",          label: "שבר חצי 1/2" },
  { subject: "math", grade: "g2", pageId: "frac_half_reverse",  label: "חצי הפוך" },
  { subject: "math", grade: "g2", pageId: "frac_quarter",       label: "שבר רבע 1/4" },
  { subject: "math", grade: "g2", pageId: "add_vertical",       label: "חיבור אנכי (מאונך)" },
  { subject: "math", grade: "g2", pageId: "sub_vertical",       label: "חיסור אנכי (מאונך)" },
  { subject: "math", grade: "g2", pageId: "mul",                label: "כפל כיתה ב" },
  { subject: "math", grade: "g2", pageId: "div",                label: "חילוק בסיסי ÷" },
  { subject: "math", grade: "g2", pageId: "cmp",                label: "השוואה ב — < > =" },
  // G3 — hundreds, order of operations, decimals, remainder
  { subject: "math", grade: "g3", pageId: "ns_place_hundreds",  label: "ערך מקומי מאות" },
  { subject: "math", grade: "g3", pageId: "cmp",                label: "השוואה ג — < > =" },
  { subject: "math", grade: "g3", pageId: "mul",                label: "כפל ג" },
  { subject: "math", grade: "g3", pageId: "div",                label: "חילוק ג ÷" },
  { subject: "math", grade: "g3", pageId: "div_with_remainder", label: "חילוק עם שארית" },
  { subject: "math", grade: "g3", pageId: "order_add_mul",      label: "סדר פעולות חיבור×כפל" },
  { subject: "math", grade: "g3", pageId: "order_mul_sub",      label: "סדר פעולות כפל-חיסור" },
  { subject: "math", grade: "g3", pageId: "order_parentheses",  label: "סדר פעולות עם סוגריים" },
  { subject: "math", grade: "g3", pageId: "dec_add",            label: "חיבור עשרוניים" },
  { subject: "math", grade: "g3", pageId: "dec_sub",            label: "חיסור עשרוניים" },
  // G4 — vertical mul, long div, prime, power, estimation
  { subject: "math", grade: "g4", pageId: "mul_vertical",       label: "כפל אנכי × (מאונך)" },
  { subject: "math", grade: "g4", pageId: "div_long",           label: "חילוק ארוך ÷" },
  { subject: "math", grade: "g4", pageId: "prime_composite",    label: "ראשוניים ומורכבים" },
  { subject: "math", grade: "g4", pageId: "power_base",         label: "חזקה — בסיס ומעריך" },
  { subject: "math", grade: "g4", pageId: "power_calc",         label: "חזקה — חישוב" },
  { subject: "math", grade: "g4", pageId: "zero_mul",           label: "כפל באפס" },
  { subject: "math", grade: "g4", pageId: "one_mul",            label: "כפל ב-1" },
  // G5 — fractions, percentages, ratio
  { subject: "math", grade: "g5", pageId: "frac_reduce",        label: "צמצום שברים" },
  { subject: "math", grade: "g5", pageId: "frac_expand",        label: "הרחבת שברים" },
  { subject: "math", grade: "g5", pageId: "frac_add_sub",       label: "חיבור/חיסור שברים" },
  { subject: "math", grade: "g5", pageId: "mixed_to_frac",      label: "מספר מעורב לשבר" },
  { subject: "math", grade: "g5", pageId: "frac_to_mixed",      label: "שבר למספר מעורב" },
  { subject: "math", grade: "g5", pageId: "div_two_digit",      label: "חילוק שתי ספרות" },
  // G6 — fraction mult/div, percent, advanced
  { subject: "math", grade: "g6", pageId: "frac_as_division",   label: "שבר כחילוק" },
  { subject: "math", grade: "g6", pageId: "frac_multiply",      label: "כפל שברים ×" },
  { subject: "math", grade: "g6", pageId: "frac_divide",        label: "חילוק שברים ÷" },
  { subject: "math", grade: "g6", pageId: "perc_part_of",       label: "אחוזים — חלק מכלל 25%" },
  { subject: "math", grade: "g6", pageId: "perc_discount",      label: "הנחה באחוזים %" },
];

// All geometry pages — focus on RTL-critical: angles, formulas, π, labels, SVG
const GEO_PAGES = [
  // G1 — basic shapes
  { subject: "geometry", grade: "g1", pageId: "shapes_basic_square",      label: "ריבוע — צורה בסיסית" },
  { subject: "geometry", grade: "g1", pageId: "shapes_basic_rectangle",   label: "מלבן — צורה בסיסית" },
  { subject: "geometry", grade: "g1", pageId: "transformations",          label: "שינויים — סיבוב/היפוך" },
  // G2 — area, solids
  { subject: "geometry", grade: "g2", pageId: "square_area",              label: "שטח ריבוע/מלבן" },
  { subject: "geometry", grade: "g2", pageId: "solids",                   label: "גופים תלת-מימדיים" },
  { subject: "geometry", grade: "g2", pageId: "transformations",          label: "שינויים ב" },
  // G3 — triangles, angles, perimeter
  { subject: "geometry", grade: "g3", pageId: "triangles",                label: "משולשים — סוגים" },
  { subject: "geometry", grade: "g3", pageId: "quadrilaterals",           label: "מרובעים" },
  { subject: "geometry", grade: "g3", pageId: "triangle_angles",          label: "זוויות במשולש (180°)" },
  { subject: "geometry", grade: "g3", pageId: "triangle_perimeter",       label: "היקף משולש" },
  { subject: "geometry", grade: "g3", pageId: "square_area",              label: "שטח ריבוע ג" },
  { subject: "geometry", grade: "g3", pageId: "square_perimeter",         label: "היקף ריבוע ג" },
  { subject: "geometry", grade: "g3", pageId: "parallel_perpendicular",   label: "קווים מקבילים ומאונכים" },
  // G4 — angles, symmetry, diagonals, volume
  { subject: "geometry", grade: "g4", pageId: "shapes_basic_properties_angles",    label: "זוויות — 90° חד קהה" },
  { subject: "geometry", grade: "g4", pageId: "shapes_basic_properties_square",    label: "תכונות ריבוע" },
  { subject: "geometry", grade: "g4", pageId: "shapes_basic_properties_rectangle", label: "תכונות מלבן" },
  { subject: "geometry", grade: "g4", pageId: "triangle_angles",          label: "זוויות משולש ד" },
  { subject: "geometry", grade: "g4", pageId: "square_area",              label: "שטח ריבוע ד" },
  { subject: "geometry", grade: "g4", pageId: "triangle_perimeter",       label: "היקף משולש ד" },
  { subject: "geometry", grade: "g4", pageId: "diagonal_square",          label: "אלכסוני ריבוע" },
  { subject: "geometry", grade: "g4", pageId: "diagonal_rectangle",       label: "אלכסוני מלבן" },
  { subject: "geometry", grade: "g4", pageId: "symmetry",                 label: "סימטריה" },
  { subject: "geometry", grade: "g4", pageId: "rectangular_prism_volume", label: "נפח תיבה" },
  // G5 — areas (triangle, parallelogram, trapezoid), heights
  { subject: "geometry", grade: "g5", pageId: "triangle_area",            label: "שטח משולש — בסיס×גובה÷2" },
  { subject: "geometry", grade: "g5", pageId: "parallelogram_area",       label: "שטח מקבילית" },
  { subject: "geometry", grade: "g5", pageId: "trapezoid_area",           label: "שטח טרפז" },
  { subject: "geometry", grade: "g5", pageId: "heights_triangle",         label: "גבהות במשולש" },
  { subject: "geometry", grade: "g5", pageId: "heights_parallelogram",    label: "גבהות במקבילית" },
  { subject: "geometry", grade: "g5", pageId: "diagonal_parallelogram",   label: "אלכסוני מקבילית" },
  { subject: "geometry", grade: "g5", pageId: "tiling",                   label: "ריצוף — כיסוי שטח" },
  // G6 — circle π, Pythagoras, volumes
  { subject: "geometry", grade: "g6", pageId: "circle_area",              label: "שטח עיגול π×r²" },
  { subject: "geometry", grade: "g6", pageId: "circle_perimeter",         label: "היקף עיגול 2πr" },
  { subject: "geometry", grade: "g6", pageId: "pythagoras_hyp",           label: "פיתגורס — תרגום היפוטנוזה" },
  { subject: "geometry", grade: "g6", pageId: "pythagoras_leg",           label: "פיתגורס — צלע" },
  { subject: "geometry", grade: "g6", pageId: "cylinder_volume",          label: "נפח גליל" },
  { subject: "geometry", grade: "g6", pageId: "prism_volume_triangle",    label: "נפח פריזמה משולשית" },
];

const ALL_PAGES = [...MATH_PAGES, ...GEO_PAGES];

function slugify(subject, grade, pageId) {
  return `C-${subject}-${grade}-${pageId}`;
}

async function newCtx(browser, size) {
  if (size === "mobile") {
    return browser.newContext({
      ...devices["iPhone 13"],
      baseURL: BASE,
      locale: "he-IL",
      ignoreHTTPSErrors: true,
    });
  }
  return browser.newContext({
    baseURL: BASE,
    locale: "he-IL",
    viewport: DESKTOP,
    ignoreHTTPSErrors: true,
  });
}

async function loginStudent(page) {
  console.log("  🔐 Logging in as student...");
  try {
    await page.goto("/student/login", { waitUntil: "load", timeout: 60_000 });
    await page.locator('[data-testid="student-login-username"]').waitFor({ state: "visible", timeout: 30_000 });
    await page.locator('[data-testid="student-login-username"]').fill(STUDENT_USER);
    await page.locator('[data-testid="student-login-pin"]').fill(STUDENT_PIN);
    await page.locator('[data-testid="student-login-submit"]').click();
    await page.waitForURL(/\/student\/home/, { timeout: 60_000 });
    await page.waitForTimeout(2000);
    console.log("  ✅ Logged in");
    return true;
  } catch (e) {
    console.warn("  ⚠️ Login failed:", String(e).slice(0, 120));
    return false;
  }
}

async function captureBookPage(page, entry, size) {
  const { subject, grade, pageId, label } = entry;
  const route = `/learning/book/${subject}/${grade}/${pageId}`;
  const slug = slugify(subject, grade, pageId);
  const filename = `${slug}-${size}.png`;
  const filepath = join(OUT_DIR, filename);

  try {
    await page.goto(route, { waitUntil: "load", timeout: 30_000 });
    // Wait for actual content to render (not just loading spinner)
    await page.waitForTimeout(2500);
    // Try to wait for loading spinner to disappear
    try {
      await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 5000 });
    } catch (_) { /* spinner may already be gone */ }
    await page.waitForTimeout(500);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  📸 ${filename} — ${label}`);
    results.push({
      slug, subject, grade, pageId, label, route,
      size, filename, status: "ok"
    });
    return filename;
  } catch (e) {
    const errMsg = String(e).slice(0, 180);
    console.error(`  ❌ ${filename}: ${errMsg}`);
    results.push({
      slug, subject, grade, pageId, label, route,
      size, filename: null, status: "error", error: errMsg
    });
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n📚 Math & Geometry RTL Visual Audit — ${BASE}`);
console.log(`📁 Output: ${OUT_DIR}`);
console.log(`📋 Pages to capture: ${ALL_PAGES.length} pages × 2 viewports = ${ALL_PAGES.length * 2} screenshots\n`);

const browser = await chromium.launch({ headless: true });

// ── Desktop pass ──────────────────────────────────────────────────────────────
console.log("=== Desktop pass (1280×900) ===");
{
  const ctx = await newCtx(browser, "desktop");
  const page = await ctx.newPage();
  const loggedIn = await loginStudent(page);
  if (!loggedIn) {
    console.warn("  ⚠️ Student login failed — pages may show auth gate instead of content");
  }
  for (const entry of ALL_PAGES) {
    await captureBookPage(page, entry, "desktop");
  }
  await ctx.close();
}

// ── Mobile pass ──────────────────────────────────────────────────────────────
console.log("\n=== Mobile pass (iPhone 13 — 390×844) ===");
{
  const ctx = await newCtx(browser, "mobile");
  const page = await ctx.newPage();
  const loggedIn = await loginStudent(page);
  if (!loggedIn) {
    console.warn("  ⚠️ Student login failed — pages may show auth gate instead of content");
  }
  for (const entry of ALL_PAGES) {
    await captureBookPage(page, entry, "mobile");
  }
  await ctx.close();
}

await browser.close();

// ── Write manifest ─────────────────────────────────────────────────────────
const ok = results.filter((r) => r.status === "ok").length;
const err = results.filter((r) => r.status === "error").length;
const manifest = {
  capturedAt: new Date().toISOString(),
  baseURL: BASE,
  studentUser: STUDENT_USER,
  totalPages: ALL_PAGES.length,
  totalScreenshots: ok,
  errors: err,
  results,
};
writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\n✅ Done. ${ok} screenshots captured, ${err} errors.`);
console.log(`📄 Manifest: ${join(OUT_DIR, "manifest.json")}`);
