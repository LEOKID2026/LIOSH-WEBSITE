/**
 * Mobile visual QA for Grade 2 BiDi regression pages (360px viewport).
 * Run: BIDI_QA_BASE_URL=http://127.0.0.1:3001 node scripts/verify-learning-book-bidi-mobile-qa.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const baseUrl = (process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

/** @type {{ subject: string, grade: string, pageId: string, section: number, required: string[], textPatterns?: RegExp[] }[]} */
const MOBILE_QA_TARGETS = [
  {
    subject: "math",
    grade: "g2",
    pageId: "sub_two",
    section: 4,
    required: ["68 = 60 + 8", "24 = 20 + 4", "68 − 24 = 44", "שלב 1:"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "add_two",
    section: 3,
    required: ["58 + 37 = 95", "50 + 30 = 80"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "ns_complement10",
    section: 2,
    required: ["8 + 5 = 8 + 2 + 3 = 10 + 3 = 13"],
  },
  {
    subject: "math",
    grade: "g2",
    pageId: "cmp",
    section: 3,
    required: ["612", "628", "קטן", "מאות"],
    textPatterns: [/612[\s\S]*קטן[\s\S]*628/],
  },
  {
    subject: "geometry",
    grade: "g4",
    pageId: "shapes_basic_properties_angles",
    section: 3,
    required: ["90", "°", "זוויות"],
  },
  {
    subject: "geometry",
    grade: "g4",
    pageId: "parallel_perpendicular",
    section: 2,
    required: ["מקביל", "מאונכות"],
  },
];

const errors = [];
/** @type {string[]} */
const screenshots = [];

async function waitForBookContent(page, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const gate = await page.getByText("בודק התחברות תלמיד").count();
    if (gate > 0) {
      await page.waitForTimeout(500);
      continue;
    }
    const login = await page.getByText("יש להתחבר כתלמיד").count();
    if (login > 0) {
      throw new Error("student login gate — page requires auth");
    }
    const hasArticle = await page.locator("article h2").count();
    const hasMarkdown = await page.locator(".learning-book-markdown").count();
    if (hasArticle > 0 && hasMarkdown > 0) return;
    await page.waitForTimeout(500);
  }
  throw new Error("book content did not hydrate in time");
}

async function navigateToSection(page, sectionNumber) {
  for (let i = 0; i < 8; i += 1) {
    const prev = page.getByRole("button", { name: "עמוד קודם" });
    if (!(await prev.isEnabled())) break;
    await prev.click();
    await page.waitForTimeout(300);
  }
  for (let i = 0; i < Math.max(0, sectionNumber - 1); i += 1) {
    const next = page.getByRole("button", { name: "עמוד הבא" });
    if (!(await next.isEnabled())) break;
    await next.click();
    await page.waitForTimeout(500);
  }
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright not installed — skip mobile visual QA");
    process.exit(0);
  }

  const screenshotDir = path.join(ROOT, "tmp/bidi-mobile-qa");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 740 });

  for (const target of MOBILE_QA_TARGETS) {
    const url = `${baseUrl}/learning/book/${target.subject}/${target.grade}/${target.pageId}`;
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (!response || response.status() !== 200) {
        errors.push(`HTTP ${response?.status() ?? "?"} for ${url}`);
        continue;
      }

      await waitForBookContent(page);
      await navigateToSection(page, target.section);
      await page.waitForTimeout(1000);

      const bodyText = await page.locator(".learning-book-markdown").innerText();
    for (const snippet of target.required) {
      if (!bodyText.includes(snippet)) {
        errors.push(`${target.grade}/${target.pageId} §${target.section}: missing "${snippet}"`);
      }
    }
    for (const pattern of target.textPatterns || []) {
      if (!pattern.test(bodyText)) {
        errors.push(`${target.grade}/${target.pageId} §${target.section}: pattern ${pattern} not matched`);
      }
    }

    if (/השוואת\d{3}/.test(bodyText) || /קטן מ-\d{3}\d{3}/.test(bodyText)) {
      errors.push(`${target.grade}/${target.pageId} §${target.section}: glued Hebrew/digit text`);
    }

    const mangled =
      /20 \+ 4.*\+-ו|24 = 20 \+-|000,1|9 \+ 50 = 59/.test(bodyText) ||
      (bodyText.includes("24 = 20") &&
        bodyText.includes("68 = 60") &&
        bodyText.indexOf("24 = 20") < bodyText.indexOf("68 = 60"));
    if (mangled) {
      errors.push(`${target.grade}/${target.pageId} §${target.section}: BiDi mangling detected`);
    }

    const mathIsolates = await page.locator("[data-book-math-run]").count();
    const proseIsolates = await page.locator("[data-book-prose-run]").count();
    if (target.pageId === "sub_two" && target.section === 4 && mathIsolates < 2) {
      errors.push(`${target.pageId} §4: expected multiple math isolates, got ${mathIsolates}`);
    }
    if (target.pageId === "sub_two" && proseIsolates < 1) {
      errors.push(`${target.pageId}: expected prose isolates, got ${proseIsolates}`);
    }

    const overflow = await page.evaluate(() => {
      const article = document.querySelector("article");
      if (!article) return false;
      return article.scrollWidth > document.documentElement.clientWidth + 2;
    });
    if (overflow) {
      errors.push(`${target.grade}/${target.pageId} §${target.section}: horizontal overflow at 360px`);
    }

    const shotName = `${target.subject}-${target.grade}-${target.pageId}-s${target.section}-360px.png`;
    const shotPath = path.join(screenshotDir, shotName);
    await page.locator("article").first().screenshot({ path: shotPath });
    screenshots.push(shotPath);
    } catch (err) {
      errors.push(`${target.grade}/${target.pageId} §${target.section}: ${err.message || err}`);
    }
  }

  await browser.close();

  const summaryPath = path.join(screenshotDir, "SUMMARY.md");
  fs.writeFileSync(
    summaryPath,
    `# BiDi Mobile QA (360px)

Base URL: ${baseUrl}
Date: ${new Date().toISOString()}

## Screenshots
${screenshots.map((s) => `- ${path.relative(ROOT, s)}`).join("\n")}

## Status
${errors.length ? `FAIL (${errors.length} issues)` : "PASS"}
${errors.map((e) => `- ${e}`).join("\n")}
`,
    "utf8"
  );

  if (errors.length) {
    console.error("Mobile BiDi QA FAILED:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`OK: mobile BiDi QA — ${MOBILE_QA_TARGETS.length} pages, 360px viewport`);
  console.log(`Screenshots → ${path.relative(ROOT, screenshotDir)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
