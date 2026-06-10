#!/usr/bin/env node
/**
 * English G1/G2 phonics post-integration runtime QA.
 *
 *   node scripts/qa/english-phonics-runtime-qa.mjs
 *   node scripts/qa/english-phonics-runtime-qa.mjs --write-artifacts
 *   QA_BASE_URL=http://localhost:3001 node scripts/qa/english-phonics-runtime-qa.mjs --browser
 *   QA_PHONICS_STUDENT_USERNAME=aaa1 E2E_STUDENT_PIN=1234 (defaults for AAA QA fixture)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runActivityClientSmoke,
  runGeneratorSmoke,
  runPracticeMapSmoke,
  EXPECTED_WIRED_G1,
  EXPECTED_WIRED_G2,
  EXPECTED_AUDIO_ONLY_G1,
  EXPECTED_AUDIO_ONLY_G2,
} from "./lib/english-phonics-runtime-qa-lib.mjs";
import {
  applyStudentSessionFromLogin,
  tryLoadE2EStudentEnvFromDotenv,
} from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_DIR = path.join(ROOT, "docs/qa/_artifacts/english-phonics-runtime");
const BASE_URL = (process.env.QA_BASE_URL || "").replace(/\/$/, "");

function parseArgs(argv) {
  return {
    writeArtifacts: argv.includes("--write-artifacts"),
    browser: argv.includes("--browser"),
  };
}

async function runBrowserSmoke() {
  if (!BASE_URL) {
    return {
      status: "SKIPPED",
      reason: "missing_QA_BASE_URL",
      checks: [],
    };
  }

  tryLoadE2EStudentEnvFromDotenv();
  if (!process.env.E2E_STUDENT_USERNAME && !process.env.E2E_STUDENT_CODE) {
    process.env.E2E_STUDENT_USERNAME =
      process.env.QA_PHONICS_STUDENT_USERNAME || "aaa1";
  }
  if (!process.env.E2E_STUDENT_PIN) {
    process.env.E2E_STUDENT_PIN = process.env.QA_STUDENT_PIN || "1234";
  }

  const { chromium } = await import("playwright");
  /** @type {Array<Record<string, unknown>>} */
  const checks = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const username =
    process.env.E2E_STUDENT_USERNAME ||
    process.env.QA_PHONICS_STUDENT_USERNAME ||
    "aaa1";

  function pushCheck(name, pass, detail = {}) {
    checks.push({ name, pass, ...detail });
  }

  try {
    await applyStudentSessionFromLogin(context, BASE_URL);
    pushCheck("student_login", true, { username, method: "api_cookie" });
  } catch (err) {
    pushCheck("student_login", false, { username, error: String(err?.message || err) });
    await browser.close();
    return {
      status: "FAIL",
      reason: "student_login_failed",
      checks,
      studentFixture: username,
    };
  }

  async function waitForBookReady() {
    await page
      .getByText("בודק התחברות תלמיד")
      .waitFor({ state: "hidden", timeout: 45000 })
      .catch(() => {});
    await page
      .getByRole("button", { name: "עמוד הבא" })
      .waitFor({ state: "visible", timeout: 60000 });
    await page.locator("h2").first().waitFor({ state: "visible", timeout: 30000 });
  }

  async function openBookPage(bookPath) {
    const next = bookPath.startsWith("/") ? bookPath : `/${bookPath}`;
    await page.goto(`${BASE_URL}${next}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await waitForBookReady();
  }

  async function goToSectionSeven() {
    await waitForBookReady();
    const sectionSeven = page.locator('[aria-label="עמוד 7"]').first();
    await sectionSeven.waitFor({ state: "visible", timeout: 30000 });
    await sectionSeven.click();
    await page.waitForTimeout(500);
  }

  async function assertBookPageBasics(prefix) {
    const bookRenders =
      (await page.getByRole("button", { name: "עמוד הבא" }).isVisible().catch(() => false)) &&
      (await page.locator("h2").first().isVisible().catch(() => false));
    pushCheck(`${prefix}_book_renders`, bookRenders, { url: page.url() });

    const sectionNavOk =
      (await page.getByRole("button", { name: "עמוד הבא" }).isVisible().catch(() => false)) &&
      !(await page.getByRole("button", { name: /כניסה ללמידה/i }).isVisible().catch(() => false));
    pushCheck(`${prefix}_section_ui_ok`, sectionNavOk);

    const audioUiOk = !(await page.getByText("לא ניתן לטעון את השמע כרגע").isVisible().catch(() => false));
    pushCheck(`${prefix}_audio_ui_not_broken`, audioUiOk);

    return bookRenders;
  }

  async function smokeWiredPage(prefix, bookPath) {
    try {
      await openBookPage(bookPath);
    } catch (err) {
      pushCheck(`${prefix}_book_renders`, false, { bookPath, error: String(err?.message || err) });
      return;
    }

    await assertBookPageBasics(prefix);
    await goToSectionSeven();

    const practiceLink = page.locator('a[href*="english-master"]:has-text("בואו נתרגל עכשיו")').first();
    const practiceVisible = await practiceLink.isVisible().catch(() => false);
    pushCheck(`${prefix}_practice_cta_visible`, practiceVisible, { bookPath });

    if (!practiceVisible) {
      pushCheck(`${prefix}_practice_launches`, false, { reason: "no_cta" });
      pushCheck(`${prefix}_valid_phonics_question`, false, { reason: "no_cta" });
      pushCheck(`${prefix}_no_audio_required_stem`, true, { skipped: true });
      return;
    }

    try {
      await practiceLink.click();
      await page.waitForURL(/english-master/, { timeout: 90000 });
      pushCheck(`${prefix}_practice_launches`, /english-master/.test(page.url()));

      const startBtn = page.getByTestId("english-start-game");
      await startBtn.waitFor({ state: "visible", timeout: 60000 });
      await startBtn.click();

      const stem = page.locator("[data-testid='english-question-stem']").first();
      const questionVisible = await stem
        .waitFor({ state: "visible", timeout: 60000 })
        .then(() => true)
        .catch(() => false);
      const stemText = questionVisible ? (await stem.innerText().catch(() => "")) : "";
      const audioRequiredStem = /listen|שמעו|האזינו|האזינ|audio required|requires audio/i.test(stemText);
      const mcqVisible = await page.locator('[data-testid^="english-mcq-"]').first().isVisible().catch(() => false);

      pushCheck(`${prefix}_valid_phonics_question`, questionVisible && mcqVisible && Boolean(stemText.trim()), {
        stemPreview: stemText.slice(0, 120),
        mcqVisible,
      });
      pushCheck(`${prefix}_no_audio_required_stem`, !audioRequiredStem, { stemPreview: stemText.slice(0, 120) });
    } catch (err) {
      pushCheck(`${prefix}_practice_launches`, false, { error: String(err?.message || err) });
      pushCheck(`${prefix}_valid_phonics_question`, false, { error: String(err?.message || err) });
      pushCheck(`${prefix}_no_audio_required_stem`, false, { error: String(err?.message || err) });
    }
  }

  async function smokeAudioOnlyPage(bookPath) {
    try {
      await openBookPage(bookPath);
    } catch (err) {
      pushCheck("audio_only_book_renders", false, { bookPath, error: String(err?.message || err) });
      return;
    }

    await assertBookPageBasics("audio_only");
    await goToSectionSeven();

    const practiceLink = page.locator('a[href*="english-master"]:has-text("בואו נתרגל עכשיו")');
    const practiceVisible = await practiceLink.first().isVisible().catch(() => false);
    const practiceCount = await practiceLink.count();

    pushCheck("audio_only_no_practice_cta", !practiceVisible && practiceCount === 0, {
      bookPath,
      practiceVisible,
      practiceCount,
    });
    pushCheck("audio_only_no_practice_launch", practiceCount === 0, { bookPath });
  }

  try {
    await smokeWiredPage("g1", "/learning/book/english/g1/letters_upper");
    await smokeWiredPage("g2", "/learning/book/english/g2/phonics_blending");
    await smokeAudioOnlyPage("/learning/book/english/g1/phonics_sounds");

    const pass = checks.every((c) => c.pass !== false);
    return {
      status: pass ? "PASS" : "FAIL",
      reason: pass ? null : "browser_assertion_failed",
      checks,
      studentFixture: username,
    };
  } catch (err) {
    return {
      status: "FAIL",
      reason: "browser_error",
      error: String(err?.message || err),
      checks,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date().toISOString();

  console.log("English phonics runtime QA");
  console.log(`  Browser smoke: ${args.browser ? (BASE_URL || "SKIPPED (no QA_BASE_URL)") : "not requested"}`);

  const generator = runGeneratorSmoke({ samplesPerPage: 4 });
  console.log(`  Generator smoke: PASS (${generator.generated} questions)`);

  const practiceMap = runPracticeMapSmoke();
  console.log(
    `  Practice-map smoke: PASS (wired=${practiceMap.wiredCount}, audio-only=${practiceMap.audioOnlyCount})`
  );

  const activity = await runActivityClientSmoke();
  console.log(
    `  Activity client smoke: PASS (g1=${activity.g1Count}, g2=${activity.g2Count})`
  );

  const browser = args.browser ? await runBrowserSmoke() : { status: "SKIPPED", reason: "no_--browser", checks: [] };
  if (args.browser) {
    console.log(`  Browser smoke: ${browser.status}${browser.reason ? ` (${browser.reason})` : ""}`);
  }

  const bundle = {
    startedAt,
    generatorSmoke: { pass: true, generated: generator.generated, checks: generator.checks.length },
    practiceMapSmoke: {
      pass: true,
      wiredCount: practiceMap.wiredCount,
      audioOnlyCount: practiceMap.audioOnlyCount,
      expectedWiredG1: EXPECTED_WIRED_G1,
      expectedWiredG2: EXPECTED_WIRED_G2,
      expectedAudioOnlyG1: EXPECTED_AUDIO_ONLY_G1,
      expectedAudioOnlyG2: EXPECTED_AUDIO_ONLY_G2,
    },
    activityClientSmoke: activity,
    browserSmoke: browser,
    runtimeEligible: { g1: 33, g2: 27, total: 60 },
    requiresAudioPolicy: "excluded_at_runtime",
    verdict: browser.status === "FAIL" ? "FAIL" : "PASS",
  };

  if (args.writeArtifacts) {
    await mkdir(ARTIFACT_DIR, { recursive: true });
    await writeFile(
      path.join(ARTIFACT_DIR, "runtime-qa-results.json"),
      `${JSON.stringify(bundle, null, 2)}\n`
    );
    console.log(`  Wrote docs/qa/_artifacts/english-phonics-runtime/runtime-qa-results.json`);
  }

  if (bundle.verdict !== "PASS") {
    console.error("\nenglish-phonics-runtime-qa: FAIL");
    process.exit(1);
  }

  console.log("\nenglish-phonics-runtime-qa: PASS");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { runBrowserSmoke };
