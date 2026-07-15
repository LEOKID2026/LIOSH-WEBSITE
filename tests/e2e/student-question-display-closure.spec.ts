import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import {
  detectStudentStemMetadataLeaks,
} from "../../utils/student-question-stem-sanitizer.js";

const QA_USER = "e2e-closure-qa";
const MOBILE_VIEW = { width: 390, height: 844 };
const SCREENSHOT_DIR = "reports/question-audit/screenshots";

const FORBIDDEN_UI_PATTERNS: RegExp[] = [
  /רמה\s+(קלה|בינונית|קשה|מאתגרת)/u,
  /רמת\s+(easy|medium|hard)/iu,
  /(?:^|[·•-(])\s*נושא\s+[a-z0-9_-]+/iu,
  /סימון\s+ייחודי/u,
  /שאלה\s+בנושא/u,
  /(?:^|[·•-(])\s*כיתה\s+[אבגדהו]['׳]?/u,
];

type SubjectClosure = {
  name: string;
  path: string;
  stemTestId: string;
  start: (page: Page) => Promise<void>;
  modes: RegExp[];
};

async function mockStudentSession(page: Page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-000000000c10",
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
    if (await allBtn.isVisible()) await allBtn.click();
    await save.click();
  }
}

async function selectFirstTopic(page: Page, testId: string) {
  const topicSel = page.getByTestId(testId);
  const values = await topicSel.evaluate((el: HTMLSelectElement) =>
    [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
  );
  if (values[0]) await topicSel.selectOption(values[0]);
}

async function pickMathOperation(page: Page, preferred: string) {
  const sel = page.getByTestId("math-operation-select");
  const values = await sel.evaluate((el: HTMLSelectElement) =>
    [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
  );
  const pick = values.includes(preferred)
    ? preferred
    : values.find((v) => /equation|order_of_operations/i.test(v)) || values[0];
  if (pick) await sel.selectOption(pick);
}

function assertStemClean(text: string, ctx: string) {
  const t = String(text || "").trim();
  expect(t.length, `${ctx}: empty`).toBeGreaterThan(2);
  const { leak, checks } = detectStudentStemMetadataLeaks(t);
  expect(leak, `${ctx}: ${JSON.stringify(checks)} in "${t.slice(0, 100)}"`).toBe(
    false
  );
  for (const re of FORBIDDEN_UI_PATTERNS) {
    expect(re.test(t), `${ctx}: forbidden in "${t.slice(0, 100)}"`).toBe(false);
  }
}

async function assertDisplayStructure(page: Page, stem: ReturnType<Page["getByTestId"]>) {
  const lead = stem.getByTestId("student-question-lead");
  const body = stem.getByTestId("student-question-body");
  const leadVisible = await lead.isVisible().catch(() => false);
  const bodyVisible = await body.isVisible().catch(() => false);

  if (leadVisible && bodyVisible) {
    const leadText = await lead.innerText();
    const bodyText = await body.innerText();
    expect(leadText.length).toBeGreaterThan(0);
    expect(bodyText.length).toBeGreaterThan(0);
    if (/[=×÷+\-*/()]|___/.test(bodyText)) {
      expect(bodyText).not.toMatch(/מצאו את הנעלם/);
      await expect(body).toHaveAttribute("dir", "ltr");
    }
    if (/[\u0590-\u05FF]/.test(leadText) && !/[=×÷]/.test(leadText)) {
      await expect(lead).toHaveAttribute("dir", "rtl");
    }
    return;
  }

  if (bodyVisible) {
    const bodyText = await body.innerText();
    expect(bodyText.length).toBeGreaterThan(2);
    return;
  }

  const combined = (await stem.innerText()).trim();
  expect(combined.length).toBeGreaterThan(2);
}

const SUBJECTS: SubjectClosure[] = [
  {
    name: "math",
    path: "/learning/math-master",
    stemTestId: "math-question-surface",
    modes: [/^למידה$/, /^תרגול$/, /^אתגר$/],
    start: async (page) => {
      await page.locator("select").first().selectOption("6");
      await page.locator("select").nth(1).selectOption("easy");
      await pickMathOperation(page, "equations");
      await expect(page.getByTestId("math-player-name")).toContainText(QA_USER);
      await confirmMixedModal(page);
      await page.getByTestId("math-start-game").click();
    },
  },
  {
    name: "geometry",
    path: "/learning/geometry-master",
    stemTestId: "geometry-question-stem",
    modes: [/^למידה$/, /^תרגול$/],
    start: async (page) => {
      await page.locator("select").first().selectOption("g3");
      await page.locator("select").nth(1).selectOption("easy");
      await selectFirstTopic(page, "geometry-topic-select");
      await expect(page.getByTestId("geometry-player-name")).toContainText(QA_USER);
      await confirmMixedModal(page);
      await page.getByTestId("geometry-start-game").click();
    },
  },
  {
    name: "science",
    path: "/learning/science-master",
    stemTestId: "science-question-stem",
    modes: [/^למידה$/, /^תרגול$/, /^אתגר/],
    start: async (page) => {
      await page.locator("select").first().selectOption("g3");
      await page.locator("select").nth(1).selectOption("easy");
      await selectFirstTopic(page, "science-topic-select");
      await expect(page.getByTestId("science-player-name")).toContainText(QA_USER);
      await confirmMixedModal(page);
      await page.getByTestId("science-start-game").click();
    },
  },
  {
    name: "hebrew",
    path: "/learning/hebrew-master",
    stemTestId: "hebrew-question-stem",
    modes: [/^למידה$/, /^תרגול$/],
    start: async (page) => {
      await page.locator("select").first().selectOption("3");
      await page.locator("select").nth(1).selectOption("easy");
      await selectFirstTopic(page, "hebrew-topic-select");
      await expect(page.getByTestId("hebrew-player-name")).toContainText(QA_USER);
      await confirmMixedModal(page);
      await page.getByTestId("hebrew-start-game").click();
    },
  },
  {
    name: "english",
    path: "/learning/english-master",
    stemTestId: "english-question-stem",
    modes: [/^למידה$/, /^תרגול$/],
    start: async (page) => {
      await page.locator("select").first().selectOption("3");
      await page.locator("select").nth(1).selectOption("easy");
      await selectFirstTopic(page, "english-topic-select");
      await expect(page.getByTestId("english-player-name")).toContainText(QA_USER);
      await confirmMixedModal(page);
      await page.getByTestId("english-start-game").click();
    },
  },
  {
    name: "moledet",
    path: "/learning/moledet-geography-master",
    stemTestId: "moledet-question-stem",
    modes: [/^למידה$/, /^תרגול$/],
    start: async (page) => {
      await page.locator("select").first().selectOption("3");
      await page.locator("select").nth(1).selectOption("easy");
      const topicSelect = page.locator("select").nth(2);
      if (await topicSelect.isVisible()) {
        const vals = await topicSelect.evaluate((el: HTMLSelectElement) =>
          [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
        );
        if (vals[0]) await topicSelect.selectOption(vals[0]);
      }
      await confirmMixedModal(page);
      await page.getByRole("button", { name: /התחל/ }).click();
    },
  },
];

test.describe("Student question display - 6-subject closure (mobile)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEW);
    await mockStudentSession(page);
  });

  for (const subj of SUBJECTS) {
    test(`${subj.name}: display structure + clean stem (learning)`, async ({ page }) => {
      await page.goto(subj.path);
      await page.getByRole("button", { name: subj.modes[0] }).click();
      await subj.start(page);
      const stem = page.getByTestId(subj.stemTestId);
      await expect(stem).toBeVisible({ timeout: 60_000 });
      const text = await stem.innerText();
      assertStemClean(text, subj.name);
      await assertDisplayStructure(page, stem);
    });
  }

  test("screenshots: all 6 subjects (mobile)", async ({ page }) => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    for (const subj of SUBJECTS) {
      await page.goto(subj.path);
      await page.getByRole("button", { name: subj.modes[0] }).click();
      await subj.start(page);
      const stem = page.getByTestId(subj.stemTestId);
      await expect(stem).toBeVisible({ timeout: 60_000 });
      await stem.screenshot({
        path: `${SCREENSHOT_DIR}/${subj.name}-display-closure-mobile.png`,
      });
    }
  });
});
