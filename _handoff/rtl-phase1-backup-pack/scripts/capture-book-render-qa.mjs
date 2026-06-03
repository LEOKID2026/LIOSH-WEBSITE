/**
 * Book-only 360px QA (no math-master / no student auth).
 * Run: BIDI_QA_BASE_URL=http://127.0.0.1:3002 node scripts/capture-book-render-qa.mjs [--outDir=tmp/render-regression-phase1]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const baseUrl = (process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
const outArg = process.argv.find((a) => a.startsWith("--outDir="));
const outDir = path.join(ROOT, outArg ? outArg.split("=")[1] : "tmp/render-regression-phase1");
const phase1 = outDir.includes("phase1");

const BOOKS = [
  { id: "book-g2-add_two-s3", url: "/learning/book/math/g2/add_two", section: 3 },
  { id: "book-g2-sub_two-s3", url: "/learning/book/math/g2/sub_two", section: 3 },
  { id: "book-g2-sub_vertical-s3", url: "/learning/book/math/g2/sub_vertical", section: 3 },
  { id: "book-g2-add_vertical-s3", url: "/learning/book/math/g2/add_vertical", section: 3 },
  { id: "book-g4-ns_place_hundreds-s3", url: "/learning/book/math/g4/ns_place_hundreds", section: 3 },
  { id: "book-g5-ns_place_hundreds-s3", url: "/learning/book/math/g5/ns_place_hundreds", section: 3 },
  { id: "book-g5-add_two-s3", url: "/learning/book/math/g5/add_two", section: 3 },
];

const FORBIDDEN = [/37 = 30 \+ 758/, /758 = 50/, /\? = 68/, /20 \+ 4-ו/, /4-ו$/, /\.24 = 20/];
const errors = [];
const shots = [];

async function waitForBook(page) {
  await page.waitForSelector("article h2", { timeout: 60000 });
  await page.waitForSelector(".learning-book-markdown", { timeout: 60000 });
  await page.waitForTimeout(500);
}

async function navSection(page, targetSection) {
  for (let i = 0; i < 10; i++) {
    const h2 = (await page.locator("article h2").first().innerText().catch(() => "")).trim();
    const pageNum = await page.evaluate(() => {
      const dots = document.querySelectorAll("[data-book-section-dot]");
      return [...dots].findIndex((d) => d.getAttribute("aria-current") === "true") + 1;
    }).catch(() => 0);
    if (pageNum === targetSection || (targetSection === 3 && h2.includes("דוגמה"))) return;

    const atFirst = await page.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((el) => (el.textContent || "").trim() === "עמוד קודם");
      return Boolean(b?.disabled);
    });

    if (pageNum > targetSection || (!pageNum && !atFirst && targetSection === 1)) {
      const prev = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((el) => (el.textContent || "").trim() === "עמוד קודם");
        if (b && !b.disabled) {
          b.click();
          return true;
        }
        return false;
      });
      if (!prev) break;
    } else {
      const next = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((el) => (el.textContent || "").trim() === "עמוד הבא");
        if (b && !b.disabled) {
          b.click();
          return true;
        }
        return false;
      });
      if (!next) break;
    }
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(500);
}

async function layoutChecks(page, id) {
  const text = await page.locator(".learning-book-markdown").innerText();
  for (const p of FORBIDDEN) {
    if (p.test(text)) errors.push(`${id}: forbidden ${p}`);
  }
  if (id.includes("g2-add_two")) {
    const ok = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("[data-book-diagram-line]")];
      const a = rows.find((r) => (r.textContent || "").includes("58 = 50 + 8"));
      const b = rows.find((r) => (r.textContent || "").includes("37 = 30 + 7"));
      return Boolean(a && b && Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) >= 8);
    });
    if (!ok) errors.push(`${id}: decomposition bbox check failed`);
  }
  if (id.includes("vertical")) {
    if ((await page.locator("[data-book-vertical-arithmetic]").count()) < 1) {
      errors.push(`${id}: missing vertical arithmetic`);
    }
  }
  if (id.includes("place_hundreds")) {
    if ((await page.locator("[data-book-place-value-equation]").count()) < 1) {
      errors.push(`${id}: missing place-value equation`);
    }
  }
  if (id.includes("g2") && (id.includes("add_two") || id.includes("sub_two"))) {
    if ((await page.locator("[data-book-example-title]").count()) < 1) {
      errors.push(`${id}: missing example title renderer`);
    }
  }
}

async function main() {
  const { chromium } = await import("playwright");
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 360, height: 740 });

  for (const b of BOOKS) {
    try {
      const res = await page.goto(`${baseUrl}${b.url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (!res?.ok()) {
        errors.push(`${b.id}: HTTP ${res?.status()}`);
        continue;
      }
      await waitForBook(page);
      await navSection(page, b.section);
      const shot = path.join(outDir, `${b.id}-360px.png`);
      await page.locator("article").first().screenshot({ path: shot });
      shots.push(shot);
      if (phase1) await layoutChecks(page, b.id);
    } catch (e) {
      errors.push(`${b.id}: ${e.message || e}`);
    }
  }

  await browser.close();
  fs.writeFileSync(
    path.join(outDir, "SUMMARY.md"),
    `# Book render QA\n\nURL: ${baseUrl}\n\n${shots.map((s) => `- ${path.relative(ROOT, s)}`).join("\n")}\n\n${errors.length ? "FAIL" : "PASS"}\n${errors.map((e) => `- ${e}`).join("\n")}\n`,
    "utf8"
  );

  if (errors.length) {
    console.error("Book QA FAILED");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`OK: book QA — ${shots.length} shots → ${path.relative(ROOT, outDir)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
