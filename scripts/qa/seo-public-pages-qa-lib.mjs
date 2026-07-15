import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_PAGE_SEO } from "../../lib/site/public-page-seo.he.js";
import {
  PRACTICE_PUBLIC_PATHS,
  GUIDE_PUBLIC_PATHS,
  SEO_PUBLIC_PATHS,
  FORBIDDEN_SEO_PHRASES,
} from "../../lib/seo/seo-public-paths.js";
import { CANONICAL_PUBLIC_SITE_ORIGIN } from "../../lib/site/canonical-public-site-origin.js";

export { PRACTICE_PUBLIC_PATHS, GUIDE_PUBLIC_PATHS, SEO_PUBLIC_PATHS, FORBIDDEN_SEO_PHRASES };

export const SEO_KEY_BY_PATH = Object.fromEntries(
  Object.values(PUBLIC_PAGE_SEO)
    .filter(
      (e) =>
        e.canonicalPath?.startsWith("/practice") || e.canonicalPath?.startsWith("/guides"),
    )
    .map((e) => [e.canonicalPath, e]),
);

export function pathToId(path) {
  return path.replace(/\//g, "-").replace(/^-/, "") || "root";
}

export async function dismissCookieConsent(page) {
  const accept = page.getByRole("button", { name: "אישור" });
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(200);
  }
}

export function makeResultTracker() {
  const results = [];
  return {
    results,
    pass(id, detail = "") {
      results.push({ id, status: "PASS", detail });
      console.log(`  ✓ ${id}${detail ? ` — ${detail}` : ""}`);
    },
    fail(id, detail = "") {
      results.push({ id, status: "FAIL", detail });
      console.log(`  ✗ ${id}${detail ? ` — ${detail}` : ""}`);
    },
    skip(id, detail = "") {
      results.push({ id, status: "SKIP", detail });
      console.log(`  ○ ${id} — ${detail}`);
    },
  };
}

export async function checkPage(page, path, base, tracker) {
  const { pass, fail } = tracker;
  const url = `${base}${path}`;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const status = res?.status() ?? 0;
  const id = pathToId(path);

  if (status === 200) pass(`${id}-http-200`);
  else {
    fail(`${id}-http-200`, `status=${status}`);
    return;
  }

  const finalUrl = page.url();
  if (finalUrl.includes("/login")) fail(`${id}-no-auth-redirect`, finalUrl);
  else pass(`${id}-no-auth-redirect`);

  const h1Count = await page.locator("h1").count();
  if (h1Count === 1) pass(`${id}-h1-single`);
  else fail(`${id}-h1-single`, `count=${h1Count}`);

  const noindex = await page.locator('meta[name="robots"][content*="noindex"]').count();
  if (noindex === 0) pass(`${id}-no-noindex`);
  else fail(`${id}-no-noindex`);

  const title = await page.title();
  const metaDesc = await page.locator('meta[name="description"]').getAttribute("content");
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  const expected = SEO_KEY_BY_PATH[path];

  if (expected && title === expected.title) pass(`${id}-title`);
  else if (title) pass(`${id}-title`, title.slice(0, 60));

  if (expected && metaDesc === expected.description) pass(`${id}-meta`);
  else if (metaDesc) pass(`${id}-meta`, "present");
  else fail(`${id}-meta`, "missing");

  const expectedCanonical = `${CANONICAL_PUBLIC_SITE_ORIGIN}${path}`;
  if (canonical === expectedCanonical) pass(`${id}-canonical-full`);
  else fail(`${id}-canonical-full`, `got ${canonical}`);

  const bodyText = await page.locator("body").innerText();
  let forbiddenHit = false;
  for (const phrase of FORBIDDEN_SEO_PHRASES) {
    if (bodyText.includes(phrase)) {
      fail(`${id}-forbidden`, phrase);
      forbiddenHit = true;
    }
  }
  if (!forbiddenHit) pass(`${id}-forbidden-clean`);

  const hasParentCta = (await page.locator('a[href="/parent/login"]').count()) > 0;
  const hasPracticeCta =
    path.startsWith("/guides/") &&
    (await page.locator('[data-testid="guide-practice-cta"] a').count()) > 0;
  if (hasParentCta || hasPracticeCta || path === "/guides" || path === "/practice")
    pass(`${id}-cta`);
  else fail(`${id}-cta`);

  if (path.startsWith("/practice/") && path !== "/practice") {
    const guideLinks = await page.locator('[data-testid="practice-related-guides"] a').count();
    if (guideLinks >= 1) pass(`${id}-related-guides`);
    else fail(`${id}-related-guides`, `count=${guideLinks}`);
  }

  if (path.startsWith("/practice")) {
    const practiceLinks = await page.locator('a[href^="/practice"]').count();
    if (practiceLinks >= 3) pass(`${id}-internal-practice-links`);
    else fail(`${id}-internal-practice-links`, `count=${practiceLinks}`);
  }
}

export function checkSitemap(root, paths, tracker) {
  const { pass, fail } = tracker;
  const xml = readFileSync(join(root, "public", "sitemap.xml"), "utf8");
  for (const path of paths) {
    const full = `${CANONICAL_PUBLIC_SITE_ORIGIN}${path}`;
    const sid = `sitemap-${pathToId(path)}`;
    if (xml.includes(`<loc>${full}</loc>`)) pass(sid);
    else fail(sid, "missing");
  }
}

export async function checkHomeIntegration(page, base, tracker) {
  const { pass, fail, skip } = tracker;
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await dismissCookieConsent(page);

  const section = page.locator('[data-testid="home-practice-subjects"]');
  if (await section.count()) {
    pass("home-practice-section-exists");
    const order = await page.evaluate(() => {
      const practice = document.querySelector('[data-testid="home-practice-subjects"]');
      const teacher = document.querySelector('[data-testid="home-teacher-section"]');
      const finalCta = document.querySelector('[data-testid="home-final-cta"]');
      if (!practice) return { ok: false };
      const afterTeacher = teacher
        ? teacher.compareDocumentPosition(practice) & Node.DOCUMENT_POSITION_FOLLOWING
        : true;
      const afterFinal = finalCta
        ? finalCta.compareDocumentPosition(practice) & Node.DOCUMENT_POSITION_FOLLOWING
        : true;
      return { ok: Boolean(afterTeacher && afterFinal) };
    });
    if (order.ok) pass("home-practice-section-last");
    else fail("home-practice-section-last");
  } else {
    skip("home-practice-section-exists", "not added");
  }
}

export async function checkNavAndFooter(page, base, tracker) {
  const { pass, fail } = tracker;
  await page.goto(`${base}/practice`, { waitUntil: "domcontentloaded" });
  await dismissCookieConsent(page);

  const headerPractice = await page.locator("header a[href='/practice']").count();
  const headerGuides = await page.locator("header a[href='/guides']").count();
  if (headerPractice === 0 && headerGuides === 0) pass("nav-no-seo-links");
  else fail("nav-no-seo-links", `practice=${headerPractice} guides=${headerGuides}`);

  const footerGuideLinks = await page.locator('[data-testid="footer-guides-hub-link"]').count();
  if (footerGuideLinks === 1) pass("footer-single-guides-link");
  else fail("footer-single-guides-link", `count=${footerGuideLinks}`);

  const footerGuideList = await page
    .locator('[data-testid="site-seo-footer-links"] a[href^="/guides/"]')
    .count();
  if (footerGuideList === 0) pass("footer-no-full-guides-list");
  else fail("footer-no-full-guides-list", `count=${footerGuideList}`);
}

export async function checkGuide11(page, base, tracker) {
  const { pass, fail } = tracker;
  await page.goto(`${base}/guides/how-to-follow-child-progress`, {
    waitUntil: "domcontentloaded",
  });
  const h1 = await page.locator("h1").innerText();
  if (h1.includes("איך לבחור את הנושא הבא שכדאי לחזק")) pass("guide11-title");
  else fail("guide11-title", h1);
  if (h1.includes("במה הילד מתקשה")) fail("guide11-no-mitkashe-title");
  else pass("guide11-no-mitkashe-title");
}

export async function checkLearningRegression(page, base, tracker) {
  const { pass, fail } = tracker;
  const res = await page.goto(`${base}/learning`, { waitUntil: "domcontentloaded" });
  if (res?.status() === 200) pass("learning-regression-200");
  else fail("learning-regression-200", String(res?.status()));
}

export function writeResults(outDir, base, tracker, label) {
  mkdirSync(outDir, { recursive: true });
  const { results } = tracker;
  const summary = {
    label,
    base,
    at: new Date().toISOString(),
    total: results.length,
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
    skip: results.filter((r) => r.status === "SKIP").length,
    results,
  };
  writeFileSync(join(outDir, "results.json"), JSON.stringify(summary, null, 2));
  return summary;
}

export async function createQaContext(chromium) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem(
      "leokids_consent_v1",
      JSON.stringify({
        version: 1,
        choice: "accepted",
        ads: false,
        analytics: false,
        decidedAt: new Date().toISOString(),
        source: "banner",
      }),
    );
  });
  const page = await context.newPage();
  return { browser, page };
}
