/**
 * Playwright spot-check for learning book UI (desktop + mobile).
 * Run: node scripts/verify-learning-book-ui-spotcheck.mjs
 * Requires: npm run build && npm run start (port 3000)
 */
import { chromium, devices } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const CHECKS = [
  { route: "/learning/book/math/g1", titleIncludes: "חשבון", grade: "g1", subject: "math" },
  { route: "/learning/book/math/g3/ns_place_hundreds", tokens: ["1,000", "מאות"], forbidden: ["000,1", "מתמטיקה"] },
  { route: "/learning/book/math/g4/round", tokens: ["3,847"], forbidden: ["000,1"] },
  { route: "/learning/book/math/g5/frac_add_sub", tokens: ["שבר"], forbidden: ["מתמטיקה"] },
  { route: "/learning/book/math/g6/ratio_first", tokens: ["3:2", "יחס"], forbidden: ["000,1"] },
  { route: "/learning/book/math/g6/scale_map_to_real", tokens: ["1:50,000"], forbidden: ["000,1"] },
  { route: "/learning/book/geometry/g1", titleIncludes: "גאומטריה", forbidden: ["הנדסה"] },
  { route: "/learning/book/geometry/g3/triangle_angles", tokens: ["180°", "זווית"], forbidden: ["הנדסה"] },
  { route: "/learning/book/geometry/g4/rectangular_prism_volume", tokens: ["ס״מ", "נפח"], forbidden: ["הנדסה"] },
  { route: "/learning/book/geometry/g5/diagonal_parallelogram", tokens: ["√", "אלכסון"], forbidden: ["הנדסה"] },
  { route: "/learning/book/geometry/g6/circle_area", tokens: ["π", "r²"], forbidden: ["הנדסה"] },
  { route: "/learning/book/geometry/g6/pythagoras_leg", tokens: ["פיתגורס", "√"], forbidden: ["הנדסה"] },
  { route: "/learning/book/geometry/g6/cone_volume", tokens: ["⅓", "חרוט"], forbidden: ["הנדסה"] },
];

async function goToSection7(page) {
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("button", { name: "עמוד הבא" });
    if (!(await next.isEnabled())) break;
    await next.click();
    await page.waitForTimeout(150);
  }
}

async function runViewport(browser, viewport, label) {
  const context = await browser.newContext({
    ...viewport,
    locale: "he-IL",
  });
  const page = await context.newPage();
  let failures = 0;

  for (const check of CHECKS) {
    const url = `${BASE}${check.route}`;
    const res = await page.goto(url, { waitUntil: "networkidle" });
    if (!res || !res.ok()) {
      console.error(`FAIL [${label}] ${check.route}: HTTP ${res?.status()}`);
      failures++;
      continue;
    }

    const bodyText = await page.locator("body").innerText();
    for (const token of check.tokens || []) {
      if (!bodyText.includes(token)) {
        console.error(`FAIL [${label}] ${check.route}: missing token "${token}"`);
        failures++;
      }
    }
    if (check.titleIncludes && !bodyText.includes(check.titleIncludes)) {
      console.error(`FAIL [${label}] ${check.route}: missing title token ${check.titleIncludes}`);
      failures++;
    }
    for (const bad of check.forbidden || []) {
      if (bodyText.includes(bad)) {
        console.error(`FAIL [${label}] ${check.route}: forbidden visible "${bad}"`);
        failures++;
      }
    }
    for (const meta of ["[DRAFT", "approval_status", "skill_id", "not owner-approved"]) {
      if (bodyText.includes(meta)) {
        console.error(`FAIL [${label}] ${check.route}: metadata leak "${meta}"`);
        failures++;
      }
    }
    if (bodyText.includes("**")) {
      console.error(`FAIL [${label}] ${check.route}: raw markdown ** visible`);
      failures++;
    }

    if (check.route.includes("/") && !check.route.endsWith("/g1") && !check.route.endsWith("/g2") && !check.route.endsWith("/g3") && !check.route.endsWith("/g4") && !check.route.endsWith("/g5") && !check.route.endsWith("/g6")) {
      await goToSection7(page);
      const s7 = await page.locator("body").innerText();
      const practice = page.getByRole("link", { name: /בואו נתרגל עכשיו/ });
      const practiceCount = await practice.count();
      if (practiceCount !== 1) {
        console.error(`FAIL [${label}] ${check.route}: expected 1 practice CTA on §7, got ${practiceCount}`);
        failures++;
      } else if (!s7.includes("בואו נתרגל עכשיו")) {
        console.error(`FAIL [${label}] ${check.route}: §7 missing practice text`);
        failures++;
      }
    }

    console.log(`OK [${label}] ${check.route}`);
  }

  await context.close();
  return failures;
}

const browser = await chromium.launch();
let totalFailures = 0;
totalFailures += await runViewport(browser, { viewport: { width: 1280, height: 900 } }, "desktop");
totalFailures += await runViewport(browser, devices["iPhone 13"], "mobile");
await browser.close();

if (totalFailures > 0) {
  console.error(`\n${totalFailures} UI failure(s).`);
  process.exit(1);
}
console.log("\nOK: Playwright spot-check passed (desktop + mobile).");
