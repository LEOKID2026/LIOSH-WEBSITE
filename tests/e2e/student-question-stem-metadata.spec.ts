import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import {
  detectStudentStemMetadataLeaks,
  sanitizeStudentQuestionStem,
} from "../../utils/student-question-stem-sanitizer.js";

const QA_USER = "e2e-stem-qa";
const MOBILE_VIEW = { width: 390, height: 844 };
const SCREENSHOT_DIR = "reports/question-audit/screenshots";

/** UI-facing forbidden metadata (stricter than generator-only checks). */
const FORBIDDEN_UI_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "level_he", re: /רמה\s+(קלה|בינונית|קשה|מאתגרת)/u },
  { id: "level_ramat", re: /רמת\s+(easy|medium|hard|קלה|בינונית|קשה)/iu },
  { id: "topic_key", re: /(?:^|[·•-(])\s*נושא\s+[a-z0-9_-]+/iu },
  { id: "domain_key", re: /(?:^|[·•-(])\s*תחום\s+[a-z0-9_-]+/iu },
  { id: "unique_mark", re: /סימון\s+ייחודי/u },
  { id: "school_inquiry", re: /חקר\s+בית[\s -]?ספרי/u },
  { id: "question_about_topic", re: /שאלה\s+בנושא/u },
  { id: "grade_label", re: /(?:^|[·•-(])\s*כיתה\s+[אבגדהו]['׳]?/u },
  { id: "concepts_framing", re: /^מושגים\s*\((קל|בינוני|אתגר)\)\s*:/u },
  {
    id: "topic_difficulty_paren",
    re: /^[^:\n]{1,72}\((קל|בינוני|אתגר|מאתגר)\)\s*:?\s*$/u,
  },
  {
    id: "grade_difficulty_paren",
    re: /^כיתה\s+[אבגדהו]['׳]?\s*\((קל|בינוני|אתגר|מאתגר)\)\s*:?\s*$/u,
  },
  {
    id: "level_en_meta",
    re: /(?:^|[·•-(])\s*(easy|medium|hard)\s*(?:[):·•-]|$)/iu,
  },
];

function assertStemClean(stem: string, ctx: string) {
  const text = String(stem || "").trim();
  expect(text.length, `${ctx}: empty stem`).toBeGreaterThan(2);

  const { leak, checks } = detectStudentStemMetadataLeaks(text);
  expect(leak, `${ctx}: leak checks ${JSON.stringify(checks)} in "${text.slice(0, 120)}"`).toBe(
    false
  );

  for (const p of FORBIDDEN_UI_PATTERNS) {
    expect(
      p.re.test(text),
      `${ctx}: forbidden UI pattern ${p.id} in "${text.slice(0, 120)}"`
    ).toBe(false);
  }
}

async function mockStudentSession(page: Page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-000000000e2",
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

type SubjectFlow = {
  name: string;
  path: string;
  stemTestId: string;
  playerTestId: string;
  startTestId: string;
  /** grade option values: math "1".."6", others g1..g6 */
  gradeValues: string[];
  gradesToSample: string[];
  levelsToSample: string[];
  modesToSample: { key: string; buttonName: RegExp }[];
  setupTopic?: (page: Page) => Promise<void>;
  gradeSelectTestId?: string;
  levelSelectIndex?: number;
  topicSelectTestId?: string;
};

const SUBJECTS: SubjectFlow[] = [
  {
    name: "math",
    path: "/learning/math-master",
    stemTestId: "math-question-surface",
    playerTestId: "math-player-name",
    startTestId: "math-start-game",
    gradeSelectTestId: "math-grade-select",
    topicSelectTestId: "math-operation-select",
    gradeValues: ["1", "2", "3", "4", "5", "6"],
    gradesToSample: ["1", "3", "6"],
    levelsToSample: ["easy", "medium", "hard"],
    modesToSample: [
      { key: "learning", buttonName: /^למידה$/ },
      { key: "practice", buttonName: /^תרגול$/ },
      { key: "challenge", buttonName: /^אתגר$/ },
    ],
    setupTopic: async (page) => {
      await page.getByTestId("math-operation-select").selectOption("addition");
    },
  },
  {
    name: "geometry",
    path: "/learning/geometry-master",
    stemTestId: "geometry-question-stem",
    playerTestId: "geometry-player-name",
    startTestId: "geometry-start-game",
    topicSelectTestId: "geometry-topic-select",
    gradeValues: ["g1", "g2", "g3", "g4", "g5", "g6"],
    gradesToSample: ["g1", "g3", "g6"],
    levelsToSample: ["easy", "medium", "hard"],
    modesToSample: [
      { key: "learning", buttonName: /^למידה$/ },
      { key: "practice", buttonName: /^תרגול$/ },
    ],
    setupTopic: async (page) => {
      await selectFirstTopicOption(page, "geometry-topic-select");
    },
  },
  {
    name: "science",
    path: "/learning/science-master",
    stemTestId: "science-question-stem",
    playerTestId: "science-player-name",
    startTestId: "science-start-game",
    topicSelectTestId: "science-topic-select",
    gradeValues: ["g1", "g2", "g3", "g4", "g5", "g6"],
    gradesToSample: ["g1", "g3", "g6"],
    levelsToSample: ["easy", "medium", "hard"],
    modesToSample: [
      { key: "learning", buttonName: /^למידה$/ },
      { key: "practice", buttonName: /^תרגול$/ },
      { key: "challenge", buttonName: /^אתגר/ },
    ],
    setupTopic: async (page) => {
      const topicSel = page.getByTestId("science-topic-select");
      const values = await topicSel.evaluate((el: HTMLSelectElement) =>
        [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
      );
      await topicSel.selectOption(values[0] || "body");
    },
  },
  {
    name: "hebrew",
    path: "/learning/hebrew-master",
    stemTestId: "hebrew-question-stem",
    playerTestId: "hebrew-player-name",
    startTestId: "hebrew-start-game",
    topicSelectTestId: "hebrew-topic-select",
    gradeValues: ["1", "2", "3", "4", "5", "6"],
    gradesToSample: ["1", "3", "6"],
    levelsToSample: ["easy", "medium", "hard"],
    modesToSample: [
      { key: "learning", buttonName: /^למידה$/ },
      { key: "practice", buttonName: /^תרגול$/ },
    ],
    setupTopic: async (page) => {
      await selectFirstTopicOption(page, "hebrew-topic-select");
    },
  },
  {
    name: "english",
    path: "/learning/english-master",
    stemTestId: "english-question-stem",
    playerTestId: "english-player-name",
    startTestId: "english-start-game",
    topicSelectTestId: "english-topic-select",
    gradeValues: ["1", "2", "3", "4", "5", "6"],
    gradesToSample: ["1", "3", "6"],
    levelsToSample: ["easy", "medium", "hard"],
    modesToSample: [
      { key: "learning", buttonName: /^למידה$/ },
      { key: "practice", buttonName: /^תרגול$/ },
    ],
    setupTopic: async (page) => {
      await selectFirstTopicOption(page, "english-topic-select");
    },
  },
  {
    name: "moledet",
    path: "/learning/moledet-geography-master",
    stemTestId: "moledet-question-stem",
    playerTestId: "moledet-player-name-skip",
    startTestId: "moledet-start-skip",
    gradeValues: ["1", "2", "3", "4", "5", "6"],
    gradesToSample: ["1", "3", "6"],
    levelsToSample: ["easy", "medium", "hard"],
    modesToSample: [
      { key: "learning", buttonName: /^למידה$/ },
      { key: "practice", buttonName: /^תרגול$/ },
    ],
    setupTopic: async (page) => {
      const topicSelect = page.locator("select").nth(2);
      if (await topicSelect.isVisible()) {
        const vals = await topicSelect.evaluate((el: HTMLSelectElement) =>
          [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
        );
        if (vals[0]) await topicSelect.selectOption(vals[0]);
      }
    },
  },
];

async function selectFirstTopicOption(page: Page, testId: string) {
  const topicSel = page.getByTestId(testId);
  const values = await topicSel.evaluate((el: HTMLSelectElement) =>
    [...el.options].map((o) => o.value).filter((v) => v && v !== "mixed")
  );
  if (values[0]) await topicSel.selectOption(values[0]);
}

async function pickGrade(page: Page, subj: SubjectFlow, gradeVal: string) {
  if (subj.name === "moledet") {
    await page.locator("select").first().selectOption(gradeVal);
    return;
  }
  if (subj.gradeSelectTestId) {
    await page.getByTestId(subj.gradeSelectTestId).selectOption(gradeVal);
    return;
  }
  const gradeSelect = page.locator("select").first();
  await gradeSelect.selectOption(gradeVal);
}

async function pickLevel(page: Page, levelKey: string) {
  const levelSelect = page.locator("select").nth(1);
  if (await levelSelect.isVisible()) {
    await levelSelect.selectOption(levelKey);
  }
}

async function waitForSessionName(page: Page, subj: SubjectFlow) {
  if (subj.playerTestId.includes("skip")) return;
  const nameEl = page.getByTestId(subj.playerTestId);
  await expect(nameEl).toContainText(QA_USER, { timeout: 30_000 });
}

async function startRound(page: Page, subj: SubjectFlow) {
  await waitForSessionName(page, subj);
  if (subj.setupTopic) await subj.setupTopic(page);
  await confirmMixedModal(page);
  if (subj.name === "moledet") {
    await page.getByRole("button", { name: /התחל/ }).click();
  } else {
    const start = page.getByTestId(subj.startTestId);
    await expect(start).toBeEnabled({ timeout: 15_000 });
    await start.click();
  }
  const stem = page.getByTestId(subj.stemTestId);
  await expect(stem).toBeVisible({ timeout: 60_000 });
  return stem;
}

test.describe("Student question stem - rendered DOM (mobile)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEW);
    await mockStudentSession(page);
  });

  test("sanitizer preserves valid educational wording", () => {
    const cases = [
      "בכיתה יש 24 ילדים ו-6 ילדות. כמה ילדים בסך הכול?",
      "בבית הספר יש מגרש מלבני. רוצים גדר סביב המגרש.",
      "מה נושא המשפט הראשי בקטע?",
      "לפני ניסוי בכיתה, מה חשוב לתעד?",
    ];
    for (const raw of cases) {
      const cleaned = sanitizeStudentQuestionStem(raw);
      expect(cleaned).toBe(raw.trim());
      expect(detectStudentStemMetadataLeaks(cleaned).leak).toBe(false);
    }
  });

  for (const subj of SUBJECTS) {
    test(`${subj.name}: sample grades/levels/modes - stems clean in DOM`, async ({
      page,
    }) => {
      await page.goto(subj.path);
      await expect(page.getByTestId(subj.stemTestId)).toHaveCount(0);

      const samples = [
        {
          grade: subj.gradesToSample[0],
          level: "easy",
          mode: subj.modesToSample[0],
        },
        {
          grade: subj.gradesToSample[1] ?? subj.gradesToSample[0],
          level: "medium",
          mode: subj.modesToSample[0],
        },
        {
          grade:
            subj.gradesToSample[2] ??
            subj.gradesToSample[subj.gradesToSample.length - 1],
          level: "hard",
          mode:
            subj.modesToSample[subj.modesToSample.length - 1] ??
            subj.modesToSample[0],
        },
      ];

      for (const sample of samples) {
        await page.goto(subj.path);
        await pickGrade(page, subj, sample.grade);
        await pickLevel(page, sample.level);
        const modeBtn = page.getByRole("button", { name: sample.mode.buttonName });
        if (await modeBtn.isVisible()) await modeBtn.click();

        const stem = await startRound(page, subj);
        const text = await stem.innerText();
        assertStemClean(
          text,
          `${subj.name} g=${sample.grade} lv=${sample.level} mode=${sample.mode.key}`
        );

        const stop = page.getByTestId("learning-stop-game");
        if (await stop.isVisible()) await stop.click();
        else {
          const stopMoledet = page.getByRole("button", { name: /עצור/ });
          if (await stopMoledet.isVisible()) await stopMoledet.click();
        }
      }
    });
  }

  test("screenshots: math, geometry, science stems (mobile)", async ({ page }) => {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const shots: { name: string; path: string; grade: string; setup: SubjectFlow }[] = [
      {
        name: "math",
        path: "/learning/math-master",
        grade: "3",
        setup: SUBJECTS[0],
      },
      {
        name: "geometry",
        path: "/learning/geometry-master",
        grade: "g3",
        setup: SUBJECTS[1],
      },
      {
        name: "science",
        path: "/learning/science-master",
        grade: "g3",
        setup: SUBJECTS[2],
      },
    ];

    for (const shot of shots) {
      await page.goto(shot.path);
      await pickGrade(page, shot.setup, shot.grade);
      await pickLevel(page, "easy");
      const stem = await startRound(page, shot.setup);
      const text = await stem.innerText();
      assertStemClean(text, `screenshot-${shot.name}`);
      await stem.screenshot({
        path: `${SCREENSHOT_DIR}/${shot.name}-stem-mobile.png`,
      });
    }
  });
});
