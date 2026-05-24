#!/usr/bin/env node
/**
 * Help Center visual QA audit (read-only). Writes evidence + audit-results.json only.
 * Usage: node qa-evidence-audit/help-center-visual-qa/run-audit.mjs [--base-url=http://127.0.0.1:3001]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const evidenceRoot = join(root, "qa-evidence-audit", "help-center-visual-qa");
const baseUrl = (process.argv.find((a) => a.startsWith("--base-url=")) || "--base-url=http://127.0.0.1:3001")
  .split("=")[1]
  .replace(/\/$/, "");

const VIEWPORTS = {
  desktop: { width: 1366, height: 900, name: "desktop" },
  mobile: { width: 390, height: 844, name: "mobile" },
};

const PII_PATTERNS = [
  { id: "email", re: /@[a-z0-9.-]+\.[a-z]{2,}/i, label: "email-like" },
  { id: "phone", re: /\b0\d{1,2}[- ]?\d{7}\b/, label: "phone-like" },
  { id: "gmail", re: /@gmail\.com/i, label: "gmail" },
];

const ALLOWED_DEMO = [/ישראל\s*ישראלי/u, /ADMIN/u, /דמו/u, /תלמיד/u];

const SECTION_ROUTES = {
  parents: [
    "welcome-and-overview",
    "create-parent-account",
    "parent-dashboard-tour",
    "add-students",
    "student-pin-and-credentials",
    "edit-or-delete-student",
    "how-to-read-report",
    "parent-copilot",
    "monthly-rewards",
    "install-as-app",
    "mobile-and-offline",
    "troubleshooting-login",
    "privacy-and-data",
  ],
  students: [
    "student-login",
    "student-home-tour",
    "choose-subject-and-grade",
    "answering-questions",
    "hints-and-explanations",
    "daily-missions",
    "monthly-persistence",
    "coins-and-arcade",
    "avatar-and-profile",
    "offline-games",
    "tips-for-good-practice",
  ],
  "parent-report": [
    "report-overview",
    "summary-card",
    "data-presence",
    "trends-and-confidence",
    "strengths-and-improvements",
    "topics-and-buckets",
    "subjects-overview",
    "recommendations",
    "challenges-section",
    "detailed-report",
    "printing-and-pdf",
    "understanding-the-disclaimer",
  ],
  subjects: ["math", "geometry", "english", "science", "hebrew", "moledet-geography"],
};

function allRoutes() {
  const routes = ["/help"];
  for (const [section, slugs] of Object.entries(SECTION_ROUTES)) {
    routes.push(`/help/${section}`);
    for (const slug of slugs) routes.push(`/help/${section}/${slug}`);
  }
  return routes;
}

function routeSlug(route) {
  return route.replace(/\//g, "_").replace(/^_/, "") || "help";
}

async function checkHorizontalScroll(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });
}

async function auditPage(page, route, vp) {
  const url = `${baseUrl}${route}`;
  const issues = [];
  let httpStatus = 0;
  let loadError = null;

  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    httpStatus = res?.status() || 0;
    await page.waitForTimeout(800);
  } catch (err) {
    loadError = err.message;
    httpStatus = 0;
  }

  const status =
    loadError || httpStatus >= 400 ? "FAIL" : httpStatus >= 300 ? "MINOR" : "PASS";

  if (loadError) issues.push({ severity: "BLOCKER", type: "load", message: loadError });
  else if (httpStatus === 404) issues.push({ severity: "BLOCKER", type: "http", message: "404" });
  else if (httpStatus >= 500) issues.push({ severity: "BLOCKER", type: "http", message: String(httpStatus) });

  let rtlOk = false;
  let hScroll = false;
  let pageText = "";
  if (!loadError && httpStatus < 400) {
    rtlOk = await page.evaluate(() => {
      const main = document.querySelector('[dir="rtl"]');
      return Boolean(main);
    });
    if (!rtlOk) issues.push({ severity: "HIGH", type: "rtl", message: "No dir=rtl container found" });

    hScroll = await checkHorizontalScroll(page);
    if (hScroll) issues.push({ severity: "HIGH", type: "layout", message: "Horizontal scroll on page" });

    pageText = await page.evaluate(() => document.body?.innerText || "");

    const placeholders = await page.locator("text=תמונת מסך תתווסף בקרוב").count();
    const imgErrors = await page.locator("text=לא ניתן לטעון את תמונת המסך").count();
    if (placeholders > 0) {
      issues.push({
        severity: "BLOCKER",
        type: "screenshot",
        message: `${placeholders} missing screenshot placeholder(s)`,
      });
    }
    if (imgErrors > 0) {
      issues.push({
        severity: "BLOCKER",
        type: "screenshot",
        message: `${imgErrors} screenshot load error message(s)`,
      });
    }

    const englishPlaceholders = pageText.match(/\b(lorem|TODO|undefined|null)\b/gi);
    if (englishPlaceholders?.length) {
      issues.push({
        severity: "MEDIUM",
        type: "text",
        message: `English/technical placeholder: ${englishPlaceholders.slice(0, 3).join(", ")}`,
      });
    }
  }

  const screenshots = [];
  if (!loadError && httpStatus < 400) {
    const figures = page.locator("figure");
    const n = await figures.count();
    for (let i = 0; i < n; i++) {
      const fig = figures.nth(i);
      const img = fig.locator("img").first();
      const hasImg = (await img.count()) > 0;
      const caption = ((await fig.locator("figcaption").innerText().catch(() => "")) || "").trim();
      const alt = hasImg ? (await img.getAttribute("alt")) || "" : "";
      const placeholder = (await fig.innerText().catch(() => "")).includes("תתווסף בקרוב");

      let shotStatus = "PASS";
      const shotIssues = [];
      let src = "";
      let naturalW = 0;
      let naturalH = 0;
      let displayW = 0;
      let displayH = 0;
      let overflow = false;

      if (placeholder) {
        shotStatus = "BLOCKER";
        shotIssues.push("placeholder shown");
      } else if (!hasImg) {
        shotStatus = "FAIL";
        shotIssues.push("no img in figure");
      } else {
        src = (await img.getAttribute("src")) || "";
        const metrics = await img.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const fig = el.closest("figure");
          const fr = fig?.getBoundingClientRect();
          return {
            naturalW: el.naturalWidth,
            naturalH: el.naturalHeight,
            complete: el.complete,
            displayW: r.width,
            displayH: r.height,
            figW: fr?.width || 0,
            overflow: fr ? r.width > fr.width + 2 : false,
          };
        });
        naturalW = metrics.naturalW;
        naturalH = metrics.naturalH;
        displayW = metrics.displayW;
        displayH = metrics.displayH;
        overflow = metrics.overflow;

        if (!metrics.complete || naturalW < 40) {
          shotStatus = "BLOCKER";
          shotIssues.push("image not loaded or blank");
        }
        if (overflow) {
          shotStatus = shotStatus === "BLOCKER" ? "BLOCKER" : "FAIL";
          shotIssues.push("image overflows figure");
        }
        if (vp.name === "mobile") {
          const ratio = displayH / Math.max(displayW, 1);
          if (displayH > 520 && ratio > 3.5) {
            shotStatus = shotStatus === "BLOCKER" ? "BLOCKER" : "FAIL";
            shotIssues.push(`unreadably tall on mobile (${Math.round(displayH)}px, ratio ${ratio.toFixed(1)})`);
          }
          if (displayW < 120 || displayH < 80) {
            shotStatus = shotStatus === "PASS" ? "MINOR" : shotStatus;
            shotIssues.push(`very small on mobile (${Math.round(displayW)}×${Math.round(displayH)})`);
          }
        }
        if (naturalW > 0 && naturalH > 0) {
          const dispRatio = displayW / displayH;
          const natRatio = naturalW / naturalH;
          if (Math.abs(dispRatio - natRatio) > 0.35 * natRatio) {
            shotStatus = shotStatus === "PASS" ? "MINOR" : shotStatus;
            shotIssues.push("possible stretch/distortion");
          }
        }
        if (!alt.trim()) {
          shotStatus = shotStatus === "PASS" ? "MINOR" : shotStatus;
          shotIssues.push("missing alt");
        }
      }

      screenshots.push({
        index: i,
        src,
        alt,
        caption,
        status: shotStatus,
        issues: shotIssues,
        naturalW,
        naturalH,
        displayW: Math.round(displayW),
        displayH: Math.round(displayH),
        overflow,
      });
    }
  }

  const links = [];
  if (!loadError && httpStatus < 400) {
    const anchors = page.locator("main a[href], nav a[href], header a[href], footer a[href]");
    const count = await anchors.count();
    for (let i = 0; i < Math.min(count, 80); i++) {
      const a = anchors.nth(i);
      const href = (await a.getAttribute("href")) || "";
      const text = ((await a.innerText().catch(() => "")) || "").trim().slice(0, 80);
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) continue;
      links.push({ text, href });
    }
  }

  const evidenceName = `${vp.name}/${routeSlug(route)}.png`;
  const evidencePath = join(evidenceRoot, evidenceName);
  mkdirSync(dirname(evidencePath), { recursive: true });
  if (!loadError && httpStatus < 400) {
    await page.screenshot({ path: evidencePath, fullPage: true, animations: "disabled" });
  }

  return {
    route,
    viewport: vp.name,
    url,
    httpStatus,
    status,
    rtlOk,
    hScroll,
    issues,
    screenshots,
    links,
    pageTextSample: pageText.slice(0, 500),
    evidence: evidenceName,
  };
}

async function checkLinks(browser, routeResults) {
  const broken = [];
  const seen = new Set();
  for (const r of routeResults) {
    if (r.httpStatus >= 400) continue;
    for (const link of r.links) {
      let abs = link.href;
      if (abs.startsWith("/")) abs = `${baseUrl}${abs}`;
      if (!abs.startsWith(`${baseUrl}/help`) || seen.has(abs)) continue;
      seen.add(abs);
      const p = await browser.newPage();
      try {
        const res = await p.goto(abs, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const st = res?.status() || 0;
        if (st >= 400) {
          broken.push({
            source: r.route,
            linkText: link.text,
            href: link.href,
            expected: "2xx",
            actual: String(st),
          });
        }
      } catch (err) {
        broken.push({
          source: r.route,
          linkText: link.text,
          href: link.href,
          expected: "loads",
          actual: err.message,
        });
      } finally {
        await p.close();
      }
    }
  }
  return broken;
}

async function checkHeaderFooterHelp(browser) {
  const page = await browser.newPage();
  await page.setViewportSize(VIEWPORTS.desktop);
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const nav = [];
  for (const label of ["מרכז עזרה"]) {
    const link = page.getByRole("link", { name: label }).first();
    if (await link.count()) {
      const href = await link.getAttribute("href");
      nav.push({ location: "header/footer", label, href });
    }
  }
  await page.close();
  return nav;
}

function scanPrivacy(text) {
  const hits = [];
  for (const pat of PII_PATTERNS) {
    const m = text.match(pat.re);
    if (m) {
      const ok = ALLOWED_DEMO.some((d) => d.test(text));
      hits.push({ pattern: pat.label, sample: m[0], allowedDemoContext: ok });
    }
  }
  return hits;
}

async function main() {
  mkdirSync(join(evidenceRoot, "desktop"), { recursive: true });
  mkdirSync(join(evidenceRoot, "mobile"), { recursive: true });
  mkdirSync(join(evidenceRoot, "issues"), { recursive: true });

  const routes = allRoutes();
  const browser = await chromium.launch({ headless: true });
  const routeResults = [];

  for (const vp of Object.values(VIEWPORTS)) {
    const context = await browser.newContext({ locale: "he-IL" });
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of routes) {
      console.log(`[audit] ${vp.name} ${route}`);
      const result = await auditPage(page, route, vp);
      routeResults.push(result);
    }
    await context.close();
  }

  const helpNav = await checkHeaderFooterHelp(browser);
  const brokenLinks = await checkLinks(
    browser,
    routeResults.filter((r) => r.viewport === "desktop")
  );
  await browser.close();

  const privacyHits = [];
  for (const r of routeResults) {
    const hits = scanPrivacy(r.pageTextSample || "");
    if (hits.length) privacyHits.push({ route: r.route, viewport: r.viewport, hits });
  }

  const payload = {
    auditedAt: new Date().toISOString(),
    baseUrl,
    viewports: VIEWPORTS,
    routes,
    routeCount: routes.length,
    helpNav,
    brokenLinks,
    privacyHits,
    results: routeResults,
  };

  writeFileSync(join(evidenceRoot, "audit-results.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${join(evidenceRoot, "audit-results.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
