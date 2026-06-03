/**
 * Phase 0/1 render regression baseline & QA screenshots (360px).
 * Run: BIDI_QA_BASE_URL=http://127.0.0.1:3002 node scripts/capture-render-regression-baseline.mjs [--phase1]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  applyStudentSessionFromLogin,
  tryLoadE2EStudentEnvFromDotenv,
} from "./e2e-lib/hebrew-e2e-student-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const baseUrl = (process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");
const phase1 = process.argv.includes("--phase1");
const outDir = path.join(ROOT, phase1 ? "tmp/render-regression-phase1" : "tmp/render-regression-baseline");

/** @type {{ id: string, url: string, section?: number, kind: "book"|"step", openStepModal?: boolean, stepIndex?: number, grade?: string, operation?: string }[]} */
const TARGETS = [
  { id: "book-g2-add_two-s3", url: "/learning/book/math/g2/add_two", section: 3, kind: "book" },
  { id: "book-g2-sub_two-s3", url: "/learning/book/math/g2/sub_two", section: 3, kind: "book" },
  { id: "book-g2-sub_vertical-s3", url: "/learning/book/math/g2/sub_vertical", section: 3, kind: "book" },
  { id: "book-g2-add_vertical-s3", url: "/learning/book/math/g2/add_vertical", section: 3, kind: "book" },
  { id: "book-g4-ns_place_hundreds-s3", url: "/learning/book/math/g4/ns_place_hundreds", section: 3, kind: "book" },
  { id: "book-g5-ns_place_hundreds-s3", url: "/learning/book/math/g5/ns_place_hundreds", section: 3, kind: "book" },
  { id: "book-g5-add_two-s3", url: "/learning/book/math/g5/add_two", section: 3, kind: "book" },
  { id: "step-s1-g2-addition-question", url: "/learning/math-master?grade=g2&operation=addition", kind: "step", grade: "2", operation: "addition" },
  { id: "step-s2-g2-addition-modal", url: "/learning/math-master?grade=g2&operation=addition", kind: "step", grade: "2", operation: "addition", openStepModal: true, stepIndex: 1 },
  { id: "step-s3-g2-subtraction-question", url: "/learning/math-master?grade=g2&operation=subtraction", kind: "step", grade: "2", operation: "subtraction" },
  { id: "step-s4-g4-addition-question", url: "/learning/math-master?grade=g4&operation=addition", kind: "step", grade: "4", operation: "addition" },
  { id: "step-s5-g5-fractions-question", url: "/learning/math-master?grade=g5&operation=fractions", kind: "step", grade: "5", operation: "fractions" },
];

const FORBIDDEN = [
  /37 = 30 \+ 758/,
  /758 = 50/,
  /\? = 68/,
  /20 \+ 4-ו/,
  /4-ו$/,
  /\.24 = 20/,
];

const errors = [];
/** @type {string[]} */
const shots = [];

async function waitForBookContent(page, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const gate = await page.getByText("בודק התחברות תלמיד").count();
    if (gate > 0) {
      await page.waitForTimeout(500);
      continue;
    }
    const login = await page.getByText("יש להתחבר כתלמיד").count();
    if (login > 0) throw new Error("student login gate");
    if ((await page.locator("article h2").count()) > 0 && (await page.locator(".learning-book-markdown").count()) > 0) {
      await page.waitForTimeout(600);
      return;
    }
    await page.waitForTimeout(400);
  }
  throw new Error("book content timeout");
}

async function dismissDevOverlay(page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  });
}

async function clickBookNavButton(page, name) {
  await dismissDevOverlay(page);
  await page.evaluate((label) => {
    const btn = [...document.querySelectorAll("button")].find(
      (el) => (el.textContent || "").trim() === label
    );
    if (btn && !btn.disabled) btn.click();
  }, name);
  await page.waitForTimeout(450);
}

async function navigateToSection(page, sectionNumber) {
  for (let i = 0; i < 8; i += 1) {
    const enabled = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (el) => (el.textContent || "").trim() === "עמוד קודם"
      );
      return Boolean(btn && !btn.disabled);
    });
    if (!enabled) break;
    await clickBookNavButton(page, "עמוד קודם");
  }
  for (let i = 0; i < Math.max(0, sectionNumber - 1); i += 1) {
    const enabled = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (el) => (el.textContent || "").trim() === "עמוד הבא"
      );
      return Boolean(btn && !btn.disabled);
    });
    if (!enabled) break;
    await clickBookNavButton(page, "עמוד הבא");
  }
}

async function confirmMixedModal(page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible().catch(() => false)) {
    const allBtn = page.getByRole("button", { name: "הכל", exact: true });
    if (await allBtn.isVisible().catch(() => false)) await allBtn.click();
    await save.click();
    await page.waitForTimeout(400);
  }
}

async function startMathMaster(page, target) {
  await confirmMixedModal(page);
  const gradeSelect = page.getByTestId("math-grade-select");
  if (target.grade && (await gradeSelect.isVisible().catch(() => false))) {
    await gradeSelect.selectOption(String(target.grade));
  }
  const opSelect = page.getByTestId("math-operation-select");
  if (target.operation && (await opSelect.isVisible().catch(() => false))) {
    await opSelect.selectOption(target.operation);
    await confirmMixedModal(page);
  }
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-testid="math-start-game"]');
      const name = document.querySelector('[data-testid="math-player-name"]');
      return btn && !btn.disabled && name && (name.textContent || "").trim().length > 1;
    },
    undefined,
    { timeout: 120000 }
  );
  await page.getByTestId("math-start-game").click();
  await page.getByTestId("math-question-surface").waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(800);
}

async function openStepByStepModal(page) {
  await dismissDevOverlay(page);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((el) =>
      /צעד-צעד|הסבר מלא|איך פותרים/.test(el.textContent || "")
    );
    b?.click();
  });
  await page.waitForTimeout(900);
}

async function assertBookLayout(page, id) {
  if (!phase1) return;
  if (id.includes("add_two") && id.includes("g2")) {
    const separate = await page.evaluate(() => {
      const all = [...document.querySelectorAll("[data-book-diagram-line]")];
      const a = all.find((r) => (r.textContent || "").includes("58 = 50 + 8"));
      const b = all.find((r) => (r.textContent || "").includes("37 = 30 + 7"));
      if (!a || !b) return false;
      return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) >= 8;
    });
    if (!separate) errors.push(`${id}: decomposition lines not vertically separate`);
  }
  if (id.includes("sub_vertical") || id.includes("add_vertical")) {
    if ((await page.locator("[data-book-vertical-arithmetic]").count()) < 1) {
      errors.push(`${id}: missing vertical arithmetic component`);
    }
  }
  if (id.includes("place_hundreds")) {
    if ((await page.locator("[data-book-place-value-equation]").count()) < 1) {
      errors.push(`${id}: missing place-value equation island`);
    }
  }
  if (id.includes("example") || id.includes("add_two") || id.includes("sub_two")) {
    if (id.includes("g2") && id.includes("s3")) {
      if ((await page.locator("[data-book-example-title]").count()) < 1) {
        errors.push(`${id}: missing example title renderer`);
      }
    }
  }
}

async function ensureStudentAuth(context) {
  tryLoadE2EStudentEnvFromDotenv();
  if (!process.env.E2E_STUDENT_PIN) {
    process.env.E2E_STUDENT_USERNAME = "ADMIN";
    process.env.E2E_STUDENT_PIN = "1234";
  }
  await applyStudentSessionFromLogin(context, baseUrl);
}

async function captureTarget(context, target) {
  const page = await context.newPage();
  try {
    const response = await page.goto(`${baseUrl}${target.url}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    if (!response || response.status() !== 200) {
      errors.push(`${target.id}: HTTP ${response?.status() ?? "?"}`);
      return;
    }

    if (target.kind === "book") {
      await waitForBookContent(page);
      if (target.section) await navigateToSection(page, target.section);
      await page.waitForTimeout(800);
      const text = await page.locator(".learning-book-markdown").innerText().catch(() => "");
      for (const p of FORBIDDEN) {
        if (p.test(text)) errors.push(`${target.id}: forbidden pattern ${p}`);
      }
      await assertBookLayout(page, target.id);
      const shotPath = path.join(outDir, `${target.id}-360px.png`);
      await page.locator("article").first().screenshot({ path: shotPath, timeout: 30000 });
      shots.push(shotPath);
      return;
    }

    try {
      await startMathMaster(page, target);
    } catch (e) {
      errors.push(`${target.id}: math-master start failed (${e.message || e})`);
      const shotPath = path.join(outDir, `${target.id}-360px.png`);
      await page.screenshot({ path: shotPath, timeout: 15000 }).catch(() => {});
      if (fs.existsSync(shotPath)) shots.push(shotPath);
      return;
    }
    if (target.openStepModal) {
      await openStepByStepModal(page);
      for (let i = 0; i < (target.stepIndex || 0); i += 1) {
        await clickBookNavButton(page, "הבא");
      }
    }
    const shotPath = path.join(outDir, `${target.id}-360px.png`);
    await page.locator("[data-testid='math-question-surface'], article, body").first().screenshot({
      path: shotPath,
      timeout: 30000,
    });
    shots.push(shotPath);
  } catch (e) {
    errors.push(`${target.id}: ${e.message || e}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const { chromium } = await import("playwright");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  try {
    await ensureStudentAuth(context);
  } catch (e) {
    console.warn(`student-auth skipped: ${e.message || e}`);
  }
  for (const target of TARGETS) {
    await captureTarget(context, target);
  }
  await context.close();
  await browser.close();

  const summary = `# Render regression ${phase1 ? "Phase 1 QA" : "Phase 0 baseline"}

Base URL: ${baseUrl}
Date: ${new Date().toISOString()}

## Screenshots
${shots.map((s) => `- ${path.relative(ROOT, s)}`).join("\n")}

## Status
${errors.length ? `FAIL (${errors.length})` : "PASS"}
${errors.map((e) => `- ${e}`).join("\n")}
`;
  fs.writeFileSync(path.join(outDir, "SUMMARY.md"), summary, "utf8");

  if (errors.length) {
    console.error(`${phase1 ? "Phase 1 QA" : "Phase 0 baseline"} FAILED:`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(
    `OK: ${phase1 ? "Phase 1 QA" : "Phase 0 baseline"} — ${shots.length} screenshots → ${path.relative(ROOT, outDir)}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
