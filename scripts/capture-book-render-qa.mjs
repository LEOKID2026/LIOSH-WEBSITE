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
  await page.waitForSelector(".learning-book-markdown", { state: "attached", timeout: 90000 });
  await page.waitForFunction(
    () => {
      const md = document.querySelector(".learning-book-markdown");
      return md && (md.textContent || "").trim().length > 0;
    },
    undefined,
    { timeout: 90000 }
  );
  await page.waitForTimeout(800);
}

async function screenshotArticle(page, shotPath) {
  await page.waitForFunction(
    () => {
      const h2 = document.querySelector("article h2");
      return h2 && (h2.textContent || "").includes("דוגמה");
    },
    undefined,
    { timeout: 30000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
  try {
    await page.locator("article").first().screenshot({ path: shotPath, timeout: 60000 });
  } catch {
    await page.screenshot({ path: shotPath, fullPage: false, timeout: 30000 });
  }
}

async function navSection(page, targetSection) {
  for (let i = 0; i < Math.max(0, targetSection - 1); i += 1) {
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (el) => (el.textContent || "").trim() === "עמוד הבא"
      );
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!clicked) break;
    await page.waitForTimeout(900);
  }
  await page.waitForFunction(
    (n) => {
      const h2 = document.querySelector("article h2");
      return h2 && (n === 3 ? (h2.textContent || "").includes("דוגמה") : true);
    },
    targetSection,
    { timeout: 20000 }
  ).catch(() => {});
  await page.waitForTimeout(600);
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
    } else {
      const ok = await page.evaluate(() => {
        const el = document.querySelector("[data-book-vertical-arithmetic]");
        if (!el || el.tagName !== "PRE") return false;
        const t = el.textContent || "";
        return /[\d]/.test(t) && /[-+−]/.test(t) && !/[\u0590-\u05FF]/.test(t);
      });
      if (!ok) errors.push(`${id}: vertical arithmetic not LTR mono pre`);
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
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });

  for (const b of BOOKS) {
    const page = await context.newPage();
    try {
      const res = await page.goto(`${baseUrl}${b.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      if (!res?.ok()) {
        errors.push(`${b.id}: HTTP ${res?.status()}`);
        continue;
      }
      await waitForBook(page);
      await navSection(page, b.section);
      const shot = path.join(outDir, `${b.id}-360px.png`);
      await screenshotArticle(page, shot);
      shots.push(shot);
      if (phase1) await layoutChecks(page, b.id);
    } catch (e) {
      errors.push(`${b.id}: ${e.message || e}`);
    } finally {
      await page.close();
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  await context.close();
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
