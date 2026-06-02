/**
 * Verify Section 7 practice CTA on one page per subject (requires logged-in or gate passed).
 * Run: node scripts/verify-learning-book-section7-practice.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const PAGES = [
  { route: "/learning/book/math/g3/ns_place_hundreds", subject: "math" },
  { route: "/learning/book/geometry/g6/pythagoras_leg", subject: "geometry" },
];

const browser = await chromium.launch();
const page = await browser.newPage();
let failures = 0;

for (const { route, subject } of PAGES) {
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const body = await page.locator("body").innerText();
  if (body.includes("בודק התחברות")) {
    console.warn(`SKIP ${route}: StudentAccessGate still checking (no JS session)`);
    continue;
  }
  if (body.includes("כניסת תלמיד")) {
    console.warn(`SKIP ${route}: login required for interactive UI`);
    continue;
  }

  const dots = page.locator('button[aria-label^="עמוד "]');
  const dotCount = await dots.count();
  if (dotCount < 7) {
    failures++;
    console.error(`FAIL ${route}: expected 7 section dots, got ${dotCount}`);
    continue;
  }
  await dots.nth(6).click();
  await page.waitForTimeout(400);

  const footer = await page.locator("footer p").first().innerText();
  const practiceCount = await page.getByRole("link", { name: /בואו נתרגל עכשיו/ }).count();
  const subtext = subject === "geometry" ? "בגאומטריה" : "בחשבון";

  if (!footer.includes("7")) {
    failures++;
    console.error(`FAIL ${route}: not on section 7 — "${footer}"`);
  }
  if (practiceCount !== 1) {
    failures++;
    console.error(`FAIL ${route}: expected 1 practice link, got ${practiceCount}`);
  } else {
    const linkText = await page.getByRole("link", { name: /בואו נתרגל עכשיו/ }).innerText();
    if (!linkText.includes(subtext)) {
      failures++;
      console.error(`FAIL ${route}: practice subtext missing "${subtext}"`);
    }
  }

  if (failures === 0) {
    console.log(`OK ${route}: §7 practice CTA present (${subject})`);
  }
}

await browser.close();
if (failures > 0) process.exit(1);
