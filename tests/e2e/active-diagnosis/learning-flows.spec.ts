import { test, expect, type Page } from "@playwright/test";

const QA_USER = "e2e-qa";

/** Learning routes are wrapped in `StudentAccessGate`; unauthenticated users hit `/student/login`. */
async function mockStudentSession(page: Page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-0000000000e2",
          full_name: QA_USER,
          grade_level: 3,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
}

async function confirmMixedModal(page: Page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible()) {
    const allBtn = page.getByRole("button", { name: "הכל", exact: true });
    if (await allBtn.isVisible()) {
      await allBtn.click();
    }
    await save.click();
  }
}

test.describe("Active diagnosis - learning flows (smoke)", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await mockStudentSession(page);
  });

  test("Math: addition wrong answer → next question renders", async ({ page }) => {
    await page.goto("/learning/math-master");
    await page.getByTestId("math-player-name").fill(QA_USER);
    await page.getByTestId("math-operation-select").selectOption("addition");
    await confirmMixedModal(page);
    await page.getByTestId("math-start-game").click();

    const surface = page.getByTestId("math-question-surface");
    await expect(surface).toBeVisible({ timeout: 60_000 });
    const t1 = await surface.innerText();

    await page.getByTestId("math-text-answer").fill("999999");
    await page.getByTestId("math-check-answer").click();

    await expect
      .poll(
        async () => surface.innerText(),
        { timeout: 15_000 }
      )
      .not.toBe(t1);

    await expect(surface).toBeVisible();
  });

  test("Math mixed: mixed modal → stop → switch topic → fresh start (no stuck UI)", async ({
    page,
  }) => {
    await page.goto("/learning/math-master");
    await page.getByTestId("math-player-name").fill(QA_USER);
    await page.getByTestId("math-operation-select").selectOption("mixed");
    await page.getByRole("button", { name: "הכל", exact: true }).click();
    await page.getByRole("button", { name: "שמור", exact: true }).click();
    await page.getByTestId("math-start-game").click();

    const surface = page.getByTestId("math-question-surface");
    await expect(surface).toBeVisible({ timeout: 60_000 });
    await expect(surface).not.toHaveText(/^\s*$/);

    await page.getByTestId("learning-stop-game").click();
    await expect(page.getByTestId("math-start-game")).toBeVisible();

    await page.getByTestId("math-operation-select").selectOption("addition");
    await confirmMixedModal(page);
    await page.getByTestId("math-start-game").click();
    await expect(surface).toBeVisible({ timeout: 60_000 });
    await expect(surface).not.toHaveText(/^\s*$/);
  });

  test("Geometry mixed: configure mix → wrong MCQ → next stem renders", async ({ page }) => {
    await page.goto("/learning/geometry-master");
    await page.getByTestId("geometry-player-name").fill(QA_USER);
    await page.getByTestId("geometry-topic-select").selectOption("mixed");
    await page.getByRole("button", { name: "הכל", exact: true }).click();
    await page.getByRole("button", { name: "שמור", exact: true }).click();
    await page.getByTestId("geometry-start-game").click();

    const stem = page.getByTestId("geometry-question-stem");
    await expect(stem).toBeVisible({ timeout: 60_000 });
    const s1 = await stem.innerText();

    const mcq0 = page.getByTestId("geometry-mcq-0");
    if (await mcq0.isVisible()) {
      await mcq0.click();
      await expect
        .poll(async () => stem.innerText(), { timeout: 15_000 })
        .not.toBe(s1);
    } else {
      await page.getByTestId("geometry-text-answer").fill("wrong-guess");
      await page.keyboard.press("Enter");
      await expect(stem).toBeVisible({ timeout: 15_000 });
    }

    await expect(stem).not.toHaveText(/^\s*$/);
  });

  test("Science: wrong MCQ → next stem renders", async ({ page }) => {
    await page.goto("/learning/science-master");
    await page.getByTestId("science-player-name").fill(QA_USER);
    const topicSel = page.getByTestId("science-topic-select");
    const values = await topicSel.evaluate((el: HTMLSelectElement) =>
      [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
    );
    await topicSel.selectOption(values[0] || "body");

    await page.getByTestId("science-start-game").click();
    const stem = page.getByTestId("science-question-stem");
    await expect(stem).toBeVisible({ timeout: 60_000 });
    const t1 = await stem.innerText();

    let advanced = false;
    for (let idx = 0; idx < 6 && !advanced; idx++) {
      const btn = page.getByTestId(`science-mcq-${idx}`);
      if (!(await btn.isVisible())) continue;
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ force: true });
      try {
        await expect
          .poll(async () => stem.innerText(), { timeout: 12_000 })
          .not.toBe(t1);
        advanced = true;
      } catch {
        /* layout hit-testing can miss; try next option */
      }
    }
    expect(advanced).toBe(true);

    await expect(stem).toBeVisible();
  });

  test("English mixed: vocabulary draws still render while grammar probe can retain", async ({
    page,
  }) => {
    await page.goto("/learning/english-master");
    await page.getByTestId("english-player-name").fill(QA_USER);
    await page.getByTestId("english-topic-select").selectOption("mixed");
    await confirmMixedModal(page);
    await page.getByTestId("english-start-game").click();

    const stem = page.getByTestId("english-question-stem");
    await expect(stem).toBeVisible({ timeout: 60_000 });

    for (let i = 0; i < 3; i++) {
      await expect(stem).not.toHaveText(/^\s*$/);
      const prev = await stem.innerText();
      const mcq0 = page.getByTestId("english-mcq-0");
      if (await mcq0.isVisible()) {
        await mcq0.scrollIntoViewIfNeeded();
        await mcq0.click({ force: true });
      } else {
        await page.getByPlaceholder("כתוב את התשובה שלך כאן...").fill("wrong");
        await page.getByRole("button", { name: /בדוק תשובה/ }).click();
      }
      await expect
        .poll(async () => stem.innerText(), { timeout: 15_000 })
        .not.toBe(prev);
    }

    await expect(stem).toBeVisible();
  });

  test("Hebrew mixed: wrong MCQ → flow continues (stem updates)", async ({ page }) => {
    await page.goto("/learning/hebrew-master");
    await page.getByTestId("hebrew-player-name").fill(QA_USER);
    await page.getByTestId("hebrew-topic-select").selectOption("mixed");
    await confirmMixedModal(page);
    await page.getByTestId("hebrew-start-game").click();

    const stem = page.getByTestId("hebrew-question-stem");
    await expect(stem).toBeVisible({ timeout: 60_000 });
    const t1 = await stem.innerText();

    const mcq0 = page.getByTestId("hebrew-mcq-0");
    if (await mcq0.isVisible()) {
      await mcq0.scrollIntoViewIfNeeded();
      await mcq0.click({ force: true });
    } else {
      await page.getByPlaceholder("כתוב את התשובה שלך כאן...").fill("wrong");
      await page.getByRole("button", { name: /בדוק תשובה/ }).click();
    }

    await expect
      .poll(async () => stem.innerText(), { timeout: 20_000 })
      .not.toBe(t1);

    await expect(stem).toBeVisible();
  });
});
