/**
 * Temporary interactive QA runner — deleted after run.
 */
import { chromium, devices } from "playwright";
import { MATH_G1_PAGE_ORDER } from "./lib/learning-book/math-g1-registry.js";
import { MATH_G2_PAGE_ORDER } from "./lib/learning-book/math-g2-registry.js";
import { MATH_G3_PAGE_ORDER } from "./lib/learning-book/math-g3-registry.js";
import { MATH_G4_PAGE_ORDER } from "./lib/learning-book/math-g4-registry.js";
import { MATH_G5_PAGE_ORDER } from "./lib/learning-book/math-g5-registry.js";
import { MATH_G6_PAGE_ORDER } from "./lib/learning-book/math-g6-registry.js";
import { GEOMETRY_G1_PAGE_ORDER } from "./lib/learning-book/geometry-g1-registry.js";
import { GEOMETRY_G2_PAGE_ORDER } from "./lib/learning-book/geometry-g2-registry.js";
import { GEOMETRY_G3_PAGE_ORDER } from "./lib/learning-book/geometry-g3-registry.js";
import { GEOMETRY_G4_PAGE_ORDER } from "./lib/learning-book/geometry-g4-registry.js";
import { GEOMETRY_G5_PAGE_ORDER } from "./lib/learning-book/geometry-g5-registry.js";
import { GEOMETRY_G6_PAGE_ORDER } from "./lib/learning-book/geometry-g6-registry.js";

const BASE = "http://127.0.0.1:3050";
const USER = process.env.E2E_ERAN_USERNAME || "eran";
const PIN = process.env.E2E_ERAN_PIN || "7479";

const BOOKS = [
  { subject: "math", grade: "g1", title: "חשבון", pages: MATH_G1_PAGE_ORDER, master: "/learning/math-master" },
  { subject: "math", grade: "g2", title: "חשבון", pages: MATH_G2_PAGE_ORDER, master: "/learning/math-master" },
  { subject: "math", grade: "g3", title: "חשבון", pages: MATH_G3_PAGE_ORDER, master: "/learning/math-master" },
  { subject: "math", grade: "g4", title: "חשבון", pages: MATH_G4_PAGE_ORDER, master: "/learning/math-master" },
  { subject: "math", grade: "g5", title: "חשבון", pages: MATH_G5_PAGE_ORDER, master: "/learning/math-master" },
  { subject: "math", grade: "g6", title: "חשבון", pages: MATH_G6_PAGE_ORDER, master: "/learning/math-master" },
  { subject: "geometry", grade: "g1", title: "גאומטריה", pages: GEOMETRY_G1_PAGE_ORDER, master: "/learning/geometry-master" },
  { subject: "geometry", grade: "g2", title: "גאומטריה", pages: GEOMETRY_G2_PAGE_ORDER, master: "/learning/geometry-master" },
  { subject: "geometry", grade: "g3", title: "גאומטריה", pages: GEOMETRY_G3_PAGE_ORDER, master: "/learning/geometry-master" },
  { subject: "geometry", grade: "g4", title: "גאומטריה", pages: GEOMETRY_G4_PAGE_ORDER, master: "/learning/geometry-master" },
  { subject: "geometry", grade: "g5", title: "גאומטריה", pages: GEOMETRY_G5_PAGE_ORDER, master: "/learning/geometry-master" },
  { subject: "geometry", grade: "g6", title: "גאומטריה", pages: GEOMETRY_G6_PAGE_ORDER, master: "/learning/geometry-master" },
];

const HIGH_RISK = [
  "/learning/book/math/g3/ns_place_hundreds",
  "/learning/book/math/g4/round",
  "/learning/book/math/g5/wp_time_sum",
  "/learning/book/math/g5/frac_add_sub",
  "/learning/book/math/g6/ratio_first",
  "/learning/book/math/g6/scale_map_to_real",
  "/learning/book/math/g6/perc_part_of",
  "/learning/book/math/g6/frac_multiply",
  "/learning/book/geometry/g3/triangle_angles",
  "/learning/book/geometry/g3/solids",
  "/learning/book/geometry/g4/rectangular_prism_volume",
  "/learning/book/geometry/g5/diagonal_parallelogram",
  "/learning/book/geometry/g5/rectangular_prism_volume",
  "/learning/book/geometry/g6/circle_perimeter",
  "/learning/book/geometry/g6/circle_area",
  "/learning/book/geometry/g6/pythagoras_leg",
  "/learning/book/geometry/g6/cone_volume",
  "/learning/book/geometry/g6/sphere_volume",
];

const FORBIDDEN = ["[DRAFT", "approval_status", "skill_id", "learning_page_id", "000,1", "מתמטיקה"];
const FORBIDDEN_GEO = ["הנדסה"];

const failures = [];
const warnings = [];
const routesChecked = new Set();
const ctaResults = [];

function fail(msg) {
  failures.push(msg);
  console.error("FAIL:", msg);
}
function warn(msg) {
  warnings.push(msg);
  console.warn("WARN:", msg);
}

async function loginViaUI(page) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("student-login-username").fill(USER);
  await page.getByTestId("student-login-pin").fill(PIN);
  await page.getByTestId("student-login-submit").click();
  await page.waitForURL(/\/student\/home/, { timeout: 90_000 });
  return true;
}

async function assertNoForbidden(body, route, isGeo) {
  for (const f of FORBIDDEN) {
    if (body.includes(f)) fail(`${route}: forbidden "${f}"`);
  }
  if (body.includes("**")) fail(`${route}: raw markdown ** visible`);
  if (isGeo) {
    for (const f of FORBIDDEN_GEO) {
      if (body.includes(f)) fail(`${route}: forbidden "${f}"`);
    }
  }
}

async function assertNoOverflow(page, label, route) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  if (overflow) fail(`${label} ${route}: horizontal overflow`);
}

async function goToSection(page, index) {
  await page.locator(`button[aria-label="עמוד ${index + 1}"]`).click();
  await page.waitForTimeout(300);
}

async function walkAllSections(page, route) {
  await goToSection(page, 0);
  for (let i = 0; i < 7; i++) {
    const text = await page.locator("footer p").first().innerText();
    if (!text.includes(String(i + 1))) fail(`${route}: expected section ${i + 1}, got "${text}"`);
    if (i < 6) {
      await page.locator("footer").getByRole("button", { name: "עמוד הבא" }).click();
      await page.waitForTimeout(250);
    }
  }
}

async function checkSection7(page, route, subject) {
  await goToSection(page, 6);
  const body = await page.locator("body").innerText();
  const practice = page.getByRole("link", { name: /בואו נתרגל עכשיו/ });
  const count = await practice.count();
  const sub = subject === "geometry" ? "בגאומטריה" : "בחשבון";
  let ctaOk = false;
  if (count === 1) {
    ctaOk = true;
    const lt = await practice.innerText();
    if (!lt.includes(sub)) fail(`${route}: §7 CTA missing "${sub}"`);
    const href = await practice.getAttribute("href");
    if (!href?.includes("fromBook=1")) warn(`${route}: practice href missing fromBook=1`);
    ctaResults.push({ route, cta: true });
  } else if (count > 1) {
    fail(`${route}: ${count} practice CTAs`);
  } else {
    ctaResults.push({ route, cta: false });
  }
  return { body, ctaOk };
}

async function testIndex(page, book, label) {
  const route = `/learning/book/${book.subject}/${book.grade}`;
  routesChecked.add(route);
  const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  if (!res?.ok()) return fail(`${label} ${route}: HTTP ${res?.status()}`);
  await page.waitForTimeout(800);
  const body = await page.locator("body").innerText();
  if (body.includes("בודק התחברות")) fail(`${label} ${route}: gate stuck`);
  if (!body.includes(`ספר ${book.title}`)) fail(`${label} ${route}: missing ספר ${book.title}`);
  if (!body.includes("בחרו נושא") && !body.includes("📖")) {
    fail(`${label} ${route}: index topic list not visible`);
  }
  await assertNoForbidden(body, route, book.subject === "geometry");
  await assertNoOverflow(page, label, route);
  console.log(`OK ${label} index ${route}`);
}

async function testTopicPage(page, book, pageId, label, opts = {}) {
  const route = `/learning/book/${book.subject}/${book.grade}/${pageId}`;
  routesChecked.add(route);
  const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  if (!res?.ok()) return fail(`${label} ${route}: HTTP ${res?.status()}`);
  await page.waitForTimeout(600);
  if ((await page.locator("body").innerText()).includes("בודק התחברות")) fail(`${label} ${route}: gate stuck`);

  const tocBtn = page.getByRole("button", { name: /תוכן עניינים/ });
  if (await tocBtn.count()) {
    await tocBtn.click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible())) fail(`${label} ${route}: TOC modal not visible`);
    await page.getByRole("button", { name: "✕ סגור" }).click();
    await page.waitForTimeout(400);
    if (await dialog.isVisible()) {
      await page.getByRole("button", { name: "סגירה" }).click({ force: true });
    }
  }

  if (opts.fullSections) await walkAllSections(page, route);
  const s7 = await checkSection7(page, route, book.subject);
  await assertNoForbidden(s7.body, route, book.subject === "geometry");

  if (opts.bidi) {
    const html = await page.locator("article").innerHTML();
    if (html.includes("000,1")) fail(`${route}: 000,1 bidi flip`);
  }

  await goToSection(page, 0);
  await page.locator("footer").getByRole("button", { name: "עמוד הבא" }).click();
  await page.waitForTimeout(300);
  const afterNext = await page.locator("footer p").first().innerText();
  if (afterNext.includes("1 מתוך 7")) fail(`${route}: section next failed (${afterNext})`);

  await assertNoOverflow(page, label, route);
  console.log(`OK ${label} topic ${route}${s7.ctaOk ? " [§7 CTA]" : ""}`);
}

function samplePages(pages) {
  if (pages.length <= 3) return [...pages];
  return [pages[0], pages[Math.floor(pages.length / 2)], pages[pages.length - 1]];
}

async function verifyProductionScripts(page) {
  const scripts = await page.evaluate(() =>
    [...document.querySelectorAll("script[src]")].map((s) => s.getAttribute("src"))
  );
  const dev = scripts.filter((s) => s?.includes("webpack.js") || s?.includes("react-refresh") || s?.includes("/development/"));
  if (dev.length) fail(`production probe: dev chunks ${dev.join(", ")}`);
  else console.log("OK production chunks (no webpack.js/react-refresh)");
}

async function runViewport(viewportConfig, label) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...viewportConfig, locale: "he-IL" });
  const page = await context.newPage();
  if (!(await loginViaUI(page))) {
    await browser.close();
    return;
  }
  await page.goto(`${BASE}/learning/book/math/g3/ns_place_hundreds`, { waitUntil: "networkidle" });
  if (label === "desktop") await verifyProductionScripts(page);

  for (const book of BOOKS) {
    await testIndex(page, book, label);
    for (const pageId of samplePages(book.pages)) {
      const hr = HIGH_RISK.includes(`/learning/book/${book.subject}/${book.grade}/${pageId}`);
      await testTopicPage(page, book, pageId, label, { fullSections: hr, bidi: hr });
    }
  }
  for (const route of HIGH_RISK) {
    if (routesChecked.has(route)) continue;
    const m = route.match(/\/learning\/book\/(math|geometry)\/(g\d)\/(.+)/);
    if (!m) continue;
    const book = BOOKS.find((b) => b.subject === m[1] && b.grade === m[2]);
    if (book) await testTopicPage(page, book, m[3], label, { fullSections: true, bidi: true });
  }
  await browser.close();
}

console.log("=== Interactive QA ===");
console.log("Server:", BASE, "| User:", USER);
await runViewport({ viewport: { width: 1280, height: 900 } }, "desktop");
await runViewport(devices["iPhone 13"], "mobile");
console.log("\nRoutes:", routesChecked.size);
console.log("§7 with CTA:", ctaResults.filter((x) => x.cta).length);
console.log("Failures:", failures.length, "| Warnings:", warnings.length);
if (failures.length) process.exit(1);
