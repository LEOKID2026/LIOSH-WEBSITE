import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { applyStudentSessionFromLogin } from "../scripts/e2e-lib/hebrew-e2e-student-auth.mjs";
import {
  startMathLearning,
  openStepExplanation,
} from "../scripts/student-video-pilot/lib/learning-flow.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const baseUrl = (process.env.BIDI_QA_BASE_URL || "http://127.0.0.1:3007").replace(/\/$/, "");
const outDir = path.join(ROOT, "tmp/render-regression-baseline");

const TARGETS = [
  { id: "step-s1-g2-addition-question", grade: "2", operation: "addition", modal: false },
  { id: "step-s2-g2-addition-modal", grade: "2", operation: "addition", modal: true },
  { id: "step-s3-g2-subtraction-question", grade: "2", operation: "subtraction", modal: false },
  { id: "step-s4-g4-addition-question", grade: "4", operation: "addition", modal: false },
  { id: "step-s5-g5-fractions-question", grade: "5", operation: "fractions", modal: false },
];

const errors = [];
const shots = [];

async function dismissDevOverlay(page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  });
}

async function captureTarget(page, t) {
  try {
    await startMathLearning(page, { grade: t.grade, operation: t.operation, baseUrl });
    await dismissDevOverlay(page);
    if (t.modal) {
      await openStepExplanation(page);
      await page.waitForTimeout(900);
    }
    const hasQuestion = await page.getByTestId("math-question-surface").isVisible().catch(() => false);
    const hasModal = await page.locator('[role="dialog"], [class*="modal"]').first().isVisible().catch(() => false);
    if (!hasQuestion && !hasModal) {
      errors.push(`${t.id}: no question surface or modal visible`);
    }
    const shotPath = path.join(outDir, `${t.id}-360px.png`);
    const target = hasModal
      ? page.locator('[role="dialog"], [class*="modal"]').first()
      : page.getByTestId("math-question-surface");
    await target.screenshot({ path: shotPath, timeout: 20000 }).catch(async () => {
      await page.screenshot({ path: shotPath, fullPage: false });
    });
    shots.push(shotPath);
  } catch (e) {
    errors.push(`${t.id}: ${e.message || e}`);
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  process.env.E2E_STUDENT_USERNAME = "ADMIN";
  process.env.E2E_STUDENT_PIN = "1234";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  await applyStudentSessionFromLogin(context, baseUrl);

  for (const t of TARGETS) {
    const page = await context.newPage();
    await captureTarget(page, t);
    await page.close();
  }

  await context.close();
  await browser.close();

  const summary = `# Step-by-step baseline (360px)\n\nBase: ${baseUrl}\nAuth: ADMIN/1234\n\n${shots.map((s) => `- ${path.relative(ROOT, s)}`).join("\n")}\n\n${errors.length ? "FAIL" : "PASS"}\n${errors.map((e) => `- ${e}`).join("\n")}\n`;
  fs.writeFileSync(path.join(outDir, "STEP-SUMMARY.md"), summary, "utf8");

  if (errors.length) {
    console.error("STEP baseline FAILED:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`OK: step baseline — ${shots.length} screenshots`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
