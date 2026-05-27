#!/usr/bin/env node
/**
 * Final manual QA automation — school report hub checklist with screenshots.
 *
 *   $env:DEMO_TEACHER_PASSWORD="leo7479"
 *   $env:SCHOOL_QA_PASSWORD="leo7479"
 *   $env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:3005"
 *   node --env-file=.env.local scripts/school-portal/final-school-portal-ui-verification.mjs
 */
import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3005";
const pw =
  process.env.DEMO_TEACHER_PASSWORD ||
  process.env.SCHOOL_QA_PASSWORD ||
  process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
  "";

const out = "docs/school-portal/ux-evidence/final-verification";
const RAW_KEY_RE = /\b(math|geometry|english|science|hebrew|moledet_geography|guided_practice|no_activity_in_range|low_accuracy)\b/i;

/** @type {Array<{ id: string, label: string, pass: boolean, detail?: string }>} */
const checklist = [];

function record(id, label, pass, detail = "") {
  checklist.push({ id, label, pass, detail: detail || undefined });
  console.log(pass ? "PASS" : "FAIL", id, label, detail ? `— ${detail}` : "");
}

async function schoolLogin(page) {
  await page.goto(`${base}/teacher/login`);
  await page.getByPlaceholder("המייל שלך").fill("school@leo-k.com");
  await page.locator('input[type="password"]').fill(pw);
  await page.locator('form button[type="submit"]').click({ force: true });
  await page.waitForURL(/\/school\/dashboard/u, { timeout: 60_000 });
}

async function waitClassReportMain(page) {
  const main = page.getByTestId("report-hub-main");
  await main.waitFor({ state: "visible", timeout: 45_000 });
  await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
  await expect(main.getByText("טוען דוח…")).toHaveCount(0);
}

async function assertNoRawKeysInModal(page, testId) {
  const modal = page.getByTestId(testId);
  const text = await modal.innerText();
  const bad = text.match(RAW_KEY_RE);
  return { ok: !bad, match: bad?.[0] || null, text: text.slice(0, 500) };
}

async function supabaseToken(page, email) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const res = await page.request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password: pw },
  });
  const json = await res.json();
  return json.access_token || null;
}

async function main() {
  if (!pw) {
    console.error("Missing DEMO_TEACHER_PASSWORD / SCHOOL_QA_PASSWORD");
    process.exit(1);
  }

  mkdirSync(out, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  let danTeacherId = null;

  try {
    // ── 1. Dan Cohen teacher detail ─────────────────────────────────────
    await schoolLogin(page);
    const token = await supabaseToken(page, "school@leo-k.com");
    const teachersApi = await page.request.get(`${base}/api/school/teachers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const danTeacher = ((await teachersApi.json())?.data?.teachers || []).find((t) =>
      /דן כהן/u.test(String(t.displayName || ""))
    );
    danTeacherId = danTeacher?.teacherId || null;
    expect(danTeacherId, "Dan teacher id from API").toBeTruthy();

    await page.goto(`${base}/school/teachers/${danTeacherId}`);
    await expect(page.getByTestId("school-teacher-page-ready")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("school-teacher-page-ready").getByText("טוען…", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `${out}/01-dan-cohen-teacher-detail.png`, fullPage: true });

    const statCards = page.locator('[data-testid="school-teacher-page-ready"] .font-bold.tabular-nums');
    const statTexts = await statCards.allTextContents();
    const linkedStudents = Number(statTexts[1] || "0");
    const classCount = Number(statTexts[0] || "0");

    record(
      "1a",
      "Dan linked students not 0",
      linkedStudents > 0,
      `linked=${linkedStudents}`
    );
    record(
      "1b",
      "Dan linked students expected ~134",
      linkedStudents >= 120 && linkedStudents <= 150,
      `linked=${linkedStudents}`
    );
    record("1c", "Dan classes still 12", classCount === 12, `classes=${classCount}`);

    // ── 2. Class report כיתה א׳ 2 ───────────────────────────────────────
    await page.goto(`${base}/school/classes`);
    await page.getByRole("button", { name: "כיתה א׳" }).click();
    await page.getByRole("button", { name: /כיתה א׳ 2/u }).click();
    await page.getByRole("button", { name: "דוח כיתה" }).first().click();
    await waitClassReportMain(page);
    await page.screenshot({ path: `${out}/02-class-report-summary-a1-2.png`, fullPage: true });

    const main = page.getByTestId("report-hub-main");
    const summaryText = await main.innerText();
    const hasStudentsWithActivity = /תלמידים עם פעילות[\s\S]*?[1-9]\d*/u.test(summaryText);
    const hasAnswers = /תשובות[\s\S]*?[1-9]\d*/u.test(summaryText);
    const hasAccuracy = /דיוק[\s\S]*?[1-9]\d*%/u.test(summaryText);

    record("2a", "Class report students with activity > 0", hasStudentsWithActivity);
    record("2b", "Class report answers/submissions > 0", hasAnswers);
    record("2c", "Class report accuracy > 0%", hasAccuracy);

    // ── 3. Attention students ───────────────────────────────────────────
    await main.getByTestId("report-nav-attention").click();
    await expect(page.getByTestId("report-hub-detail")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: `${out}/03-attention-list.png`, fullPage: true });

    const attentionRows = page.locator('[data-testid^="report-student-row-"]');
    const attentionCount = await attentionRows.count();
    const attentionReportBtns = page.getByTestId("report-hub-detail").getByRole("button", {
      name: "דוח תלמיד",
    });
    const attentionBtnCount = await attentionReportBtns.count();

    record(
      "3a",
      "Attention: every row has דוח תלמיד",
      attentionCount > 0 && attentionBtnCount === attentionCount,
      `rows=${attentionCount} buttons=${attentionBtnCount}`
    );

    if (attentionCount > 0) {
      await attentionReportBtns.first().click();
      await expect(page.getByTestId("report-hub-student-main")).toBeVisible({ timeout: 45_000 });
      await expect(page.getByTestId("report-hub-summary-ready")).toBeVisible({ timeout: 60_000 });
      const studentMain = page.getByTestId("report-hub-student-main");
      const studentTitle = await page.getByTestId("report-hub-student-main").locator("h2").first().textContent();
      const studentBody = await studentMain.innerText();
      await page.screenshot({ path: `${out}/03b-student-from-attention.png`, fullPage: true });

      record(
        "3b",
        "Student title is real name not תלמיד/ה",
        Boolean(studentTitle && !/^\s*תלמיד\/ה\s*$/u.test(studentTitle)),
        `title=${String(studentTitle || "").trim()}`
      );
      record(
        "3c",
        "Student report answers > 0",
        /תשובות[\s\S]*?[1-9]\d*/u.test(studentBody),
        ""
      );
      record(
        "3d",
        "Student report not all zeros",
        !/תשובות[\s\S]*?0\s*\n/u.test(studentBody) || /[1-9]\d*%/u.test(studentBody),
        ""
      );

      await page.getByTestId("report-hub-student-main").getByRole("button", { name: "חזרה" }).click();
    }

    await page.getByTestId("report-hub-detail").getByRole("button", { name: "חזרה" }).click();

    // ── 4. Distribution ───────────────────────────────────────────────────
    await waitClassReportMain(page);
    await main.getByTestId("report-nav-distribution").click();
    await expect(page.getByTestId("report-hub-detail")).toBeVisible({ timeout: 15_000 });

    const firstGroup = page.getByTestId(/^report-drilldown-/).first();
    const groupCount = await page.getByTestId(/^report-drilldown-/).count();
    record("4a", "Distribution groups clickable", groupCount > 0);

    if (groupCount > 0) {
      await firstGroup.click();
      await expect(page.getByTestId("report-hub-drilldown")).toBeVisible({ timeout: 15_000 });
      await page.screenshot({ path: `${out}/04-distribution-drilldown.png`, fullPage: true });

      const drillRows = page.locator('[data-testid^="report-student-row-"]');
      const drillRowCount = await drillRows.count();
      const drillBtns = page
        .getByTestId("report-hub-drilldown")
        .getByRole("button", { name: "דוח תלמיד" });
      const drillBtnCount = await drillBtns.count();

      record(
        "4b",
        "Distribution drilldown: student list opens",
        drillRowCount > 0,
        `students=${drillRowCount}`
      );
      record(
        "4c",
        "Distribution drilldown: דוח תלמיד on each row",
        drillRowCount > 0 && drillBtnCount === drillRowCount,
        `buttons=${drillBtnCount}`
      );

      if (drillBtnCount > 0) {
        await drillBtns.first().click();
        await expect(page.getByTestId("report-hub-student-main")).toBeVisible({ timeout: 45_000 });
        record("4d", "Distribution → student report opens", true);
        await page.getByTestId("report-hub-student-main").getByRole("button", { name: "חזרה" }).click();
      }

      await page.getByTestId("report-hub-drilldown").getByRole("button", { name: "חזרה" }).click();
    }

    await page.getByTestId("report-hub-detail").getByRole("button", { name: "חזרה" }).click();

    // ── 5. Focus / weak topics ──────────────────────────────────────────
    await waitClassReportMain(page);
    await main.getByTestId("report-nav-focus").click();
    await expect(page.getByTestId("report-hub-detail")).toBeVisible({ timeout: 15_000 });

    const focusModal = page.getByTestId("report-hub-detail");
    const focusRaw = await assertNoRawKeysInModal(page, "report-hub-detail");
    record(
      "5a",
      "Focus: no raw English keys",
      focusRaw.ok,
      focusRaw.match ? `found=${focusRaw.match}` : ""
    );
    record(
      "5b",
      "Focus: no math — מתמטיקה pattern",
      !/math\s*—/i.test(await focusModal.innerText()),
      ""
    );

    await page.screenshot({ path: `${out}/05-focus-list.png`, fullPage: true });

    const focusTopic = page.getByTestId(/^report-drilldown-/).first();
    if ((await page.getByTestId(/^report-drilldown-/).count()) > 0) {
      await focusTopic.click();
      await expect(page.getByTestId("report-hub-drilldown")).toBeVisible({ timeout: 15_000 });
      await page.screenshot({ path: `${out}/05b-focus-drilldown.png`, fullPage: true });

      const focusRows = await page.locator('[data-testid^="report-student-row-"]').count();
      const focusBtns = await page
        .getByTestId("report-hub-drilldown")
        .getByRole("button", { name: "דוח תלמיד" })
        .count();

      record("5c", "Focus topic opens affected students", focusRows > 0, `students=${focusRows}`);
      record(
        "5d",
        "Focus affected students have דוח תלמיד",
        focusRows > 0 && focusBtns === focusRows,
        `buttons=${focusBtns}`
      );
    } else {
      record("5c", "Focus topic opens affected students", false, "no focus topics in range");
      record("5d", "Focus affected students have דוח תלמיד", false, "skipped");
    }

    // ── 6. Hebrew-only across modals visited ──────────────────────────────
    for (const [tid, name] of [
      ["report-hub-main", "class summary"],
      ["report-hub-detail", "detail"],
    ]) {
      if (await page.getByTestId(tid).count()) {
        const r = await assertNoRawKeysInModal(page, tid);
        record(`6-${tid}`, `No raw keys in ${name}`, r.ok, r.match || "");
      }
    }

    record("env", "Verification base URL", true, base);
    record("env", "Dan teacher id captured", Boolean(danTeacherId), danTeacherId || "");
  } finally {
    await browser.close();
  }

  const failed = checklist.filter((c) => !c.pass && !c.id.startsWith("env"));
  writeFileSync(`${out}/checklist.json`, JSON.stringify({ base, checklist, failed: failed.length }, null, 2));
  console.log(`\nScreenshots: ${out}/`);
  console.log(`Checklist: ${out}/checklist.json`);
  console.log(failed.length ? `\nFAILED: ${failed.length}` : "\nALL CHECKLIST ITEMS PASS");

  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
