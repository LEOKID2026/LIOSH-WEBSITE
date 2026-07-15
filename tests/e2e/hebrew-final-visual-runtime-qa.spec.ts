import { mkdir, writeFile } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";

const QA_USER = "hebrew-final-visual-qa";
const REPORT_DIR = "reports/hebrew-final-visual-runtime-qa";
const REPORT_PATH = `${REPORT_DIR}/runtime-report.json`;
const MOBILE_VIEW = { width: 390, height: 844 };

const TOPIC_LABELS: Record<string, string> = {
  reading: "קריאה",
  comprehension: "הבנת הנקרא",
  grammar: "דקדוק",
  vocabulary: "עושר שפתי",
  writing: "כתיבה",
  speaking: "דיבור",
};

const GRADE_LABELS: Record<string, string> = {
  "1": "כיתה א׳",
  "2": "כיתה ב׳",
  "3": "כיתה ג׳",
  "4": "כיתה ד׳",
  "5": "כיתה ה׳",
  "6": "כיתה ו׳",
};

const LOWER_TOPICS = ["reading", "comprehension", "grammar", "vocabulary", "writing", "speaking"];
const UPPER_TOPICS = ["reading", "comprehension", "grammar", "vocabulary"];

const FORBIDDEN_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "internal_paren_bli", re: /\(בלי\b/u },
  { id: "bli_kria", re: /בלי קריאה/u },
  { id: "bli_batik", re: /בלי בתיק/u },
  { id: "bli_reshimat", re: /בלי רשימת/u },
  { id: "bli_milim", re: /בלי מילים/u },
  { id: "undefined", re: /\bundefined\b/u },
  { id: "null", re: /\bnull\b/u },
  { id: "nan", re: /\bNaN\b/u },
  { id: "raw_id", re: /\b(?:patternFamily|diagnosticSkillId|subtopicId|skillKey|gradeBand|g[1-6]\.)\b/iu },
];

const PUNCTUATION_FALLBACKS = new Set([
  "בדרך כלל לא",
  "לא תמיד",
  "תלוי במצב",
  "רק לפעמים",
]);

const PUNCTUATION_ALLOWED = new Set([
  "נקודה",
  "סימן שאלה",
  "סימן קריאה",
  "פסיק",
  ".",
  "?",
  "!",
  ",",
]);

function hasHebrew(text: string) {
  return /[\u0590-\u05FF]/u.test(text);
}

function hasNiqqud(text: string) {
  return /[\u0591-\u05C7]/u.test(text);
}

function compact(text: string) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

async function mockStudentSession(page: Page) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-00000000fqa1",
          full_name: QA_USER,
          grade_level: 1,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });
  await page.route("**/api/student/learning-profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        studentId: "00000000-0000-0000-0000-00000000fqa1",
        row: {
          subjects: {},
          monthly: {},
          challenges: {},
          streaks: {},
          achievements: {},
          profile: {},
        },
        derived: {},
      }),
    });
  });
  await page.route("**/api/learning/session/start", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, sessionId: `qa_${Date.now()}` }),
    });
  });
  await page.route("**/api/learning/answer", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route("**/api/learning/session/finish", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route("**/api/analytics/events", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function confirmMixedModal(page: Page) {
  const save = page.getByRole("button", { name: "שמור", exact: true });
  if (await save.isVisible().catch(() => false)) {
    const allBtn = page.getByRole("button", { name: "הכל", exact: true });
    if (await allBtn.isVisible().catch(() => false)) await allBtn.click();
    await save.click();
  }
}

async function selectTopicIfExists(page: Page, topic: string) {
  const topicSel = page.getByTestId("hebrew-topic-select");
  const values = await topicSel.evaluate((el: HTMLSelectElement) =>
    [...el.options].map((o) => o.value)
  );
  if (values.includes(topic)) {
    await topicSel.selectOption(topic);
    return topic;
  }
  const first = values.find((v) => v && v !== "mixed") || "";
  if (first) await topicSel.selectOption(first);
  return first;
}

async function startHebrewRun(page: Page, grade: string, topic: string, mode: "learning" | "practice") {
  if (!page.url().includes("/learning/hebrew-master")) {
    await page.goto("/learning/hebrew-master", { waitUntil: "domcontentloaded" });
  }
  await expect(page.getByTestId("hebrew-player-name")).toContainText(QA_USER, { timeout: 45_000 });
  await page.locator("select").first().selectOption(grade);
  await page.locator("select").nth(1).selectOption("easy");
  const actualTopic = await selectTopicIfExists(page, topic);
  const modeButton = page.getByRole("button", { name: mode === "learning" ? /^למידה$/ : /^תרגול$/ });
  if (await modeButton.isVisible().catch(() => false)) await modeButton.click();
  await confirmMixedModal(page);
  await page.getByTestId("hebrew-start-game").click();
  await expect(page.getByTestId("hebrew-question-stem")).toBeVisible({ timeout: 60_000 });
  return actualTopic;
}

async function visibleQuestionText(page: Page) {
  const lead = page.getByTestId("student-question-lead");
  const body = page.getByTestId("student-question-body");
  const parts: string[] = [];
  if (await lead.isVisible().catch(() => false)) parts.push(compact(await lead.innerText()));
  if (await body.isVisible().catch(() => false)) parts.push(compact(await body.innerText()));
  if (parts.length > 0) return compact(parts.join(" "));
  const raw = await page.getByTestId("hebrew-question-stem").innerText();
  return compact(
    raw
      .replace(/נגן שמע\s*\(\d+\/\d+\)/g, "")
      .replace(/הסבר/g, "")
      .replace(/שמע · מצב משימה.*/g, "")
  );
}

async function visibleAnswers(page: Page) {
  const answers: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const btn = page.getByTestId(`hebrew-mcq-${i}`);
    if (await btn.isVisible().catch(() => false)) answers.push(compact(await btn.innerText()));
  }
  return answers;
}

async function audioState(page: Page) {
  const audioButton = page.getByRole("button", { name: /נגן שמע|השמיע|שמע/ }).first();
  const visible = await audioButton.isVisible().catch(() => false);
  if (!visible) return { visible: false, clicked: false, status: "" };
  let status = "";
  try {
    await audioButton.click({ timeout: 5_000 });
    await page.waitForTimeout(450);
    status = compact(await page.getByTestId("hebrew-question-stem").innerText().catch(() => ""));
    return { visible: true, clicked: true, status };
  } catch (err) {
    return { visible: true, clicked: false, status: err instanceof Error ? err.message : String(err) };
  }
}

function analyzeSnapshot(s: {
  grade: string;
  topic: string;
  mode: string;
  question: string;
  answers: string[];
  audio: { visible: boolean; clicked: boolean; status: string };
}) {
  const issues: string[] = [];
  const allText = [s.question, ...s.answers].join(" | ");
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.re.test(allText)) issues.push(pattern.id);
  }
  if ((s.question.match(/האזינו ובחרו/g) || []).length > 1) issues.push("duplicate_audio_instruction_in_question");
  if (s.question.includes("האזינו ובחרו") && s.answers.some((a) => a.includes("האזינו ובחרו"))) {
    issues.push("duplicate_audio_instruction_in_answer");
  }
  if (s.answers.length === 4 && new Set(s.answers).size !== s.answers.length) issues.push("duplicate_answers");
  if (s.answers.some((a) => !a)) issues.push("empty_answer");
  if (s.answers.some((a) => a.length > 90)) issues.push("long_answer_card");
  if (/איזה סימן מתאים בסוף המשפט|סימן פיסוק|איזה סימן/u.test(s.question)) {
    if (s.answers.some((a) => PUNCTUATION_FALLBACKS.has(a))) issues.push("punctuation_fallback_answer");
    if (!s.answers.every((a) => PUNCTUATION_ALLOWED.has(a))) issues.push("punctuation_non_symbol_answer");
  }
  if ((s.grade === "1" || s.grade === "2") && hasHebrew(s.question) && !hasNiqqud(s.question)) {
    issues.push("missing_niqqud_question");
  }
  if (
    (s.grade === "1" || s.grade === "2") &&
    s.answers.some((a) => hasHebrew(a) && !hasNiqqud(a))
  ) {
    issues.push("missing_niqqud_answer");
  }
  if ((s.grade === "1" || s.grade === "2") && !s.audio.visible) issues.push("missing_audio_button");
  if ((s.grade === "1" || s.grade === "2") && s.audio.visible && !s.audio.clicked) issues.push("audio_click_failed");
  return issues;
}

async function collectFromRun(
  page: Page,
  grade: string,
  topic: string,
  mode: "learning" | "practice",
  count: number
) {
  const actualTopic = await startHebrewRun(page, grade, topic, mode);
  const rows = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    await expect(page.getByTestId("hebrew-question-stem")).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(850);
    const question = await visibleQuestionText(page);
    const answers = await visibleAnswers(page);
    const audio = grade === "1" || grade === "2" ? await audioState(page) : { visible: false, clicked: false, status: "" };
    const row = {
      grade,
      gradeLabel: GRADE_LABELS[grade],
      topic: actualTopic || topic,
      topicLabel: TOPIC_LABELS[actualTopic || topic] || actualTopic || topic,
      mode,
      question,
      answers,
      audio,
      issues: [] as string[],
    };
    row.issues = analyzeSnapshot(row);
    rows.push(row);
    seen.add(`${question}|||${answers.join("|")}`);

    const answerButton = page.getByTestId("hebrew-mcq-0");
    if (!(await answerButton.isVisible().catch(() => false))) break;
    const before = question;
    await answerButton.click();
    await page.waitForFunction(
      (prev) => {
        const lead = document.querySelector('[data-testid="student-question-lead"]')?.textContent || "";
        const body = document.querySelector('[data-testid="student-question-body"]')?.textContent || "";
        const stem = document.querySelector('[data-testid="hebrew-question-stem"]')?.textContent || "";
        const now = `${lead} ${body}`.trim() || stem.trim();
        return now && now.replace(/\s+/g, " ").trim() !== prev;
      },
      before,
      { timeout: 12_000 }
    ).catch(() => {});
  }
  const stop = page.getByTestId("learning-stop-game");
  if (await stop.isVisible().catch(() => false)) await stop.click();
  return { rows, unique: seen.size };
}

test.describe("Final visual runtime QA - Hebrew child screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEW);
    await mockStudentSession(page);
  });

  test("samples real rendered Hebrew questions by grade and topic", async ({ page }) => {
    test.setTimeout(900_000);
    await mkdir(REPORT_DIR, { recursive: true });

    const samples = [];
    const plan = [
      ...LOWER_TOPICS.map((topic) => ({ grade: "1", topic, mode: "learning" as const, count: 4 })),
      ...LOWER_TOPICS.map((topic) => ({ grade: "1", topic, mode: "practice" as const, count: 3 })),
      ...LOWER_TOPICS.map((topic) => ({ grade: "2", topic, mode: "learning" as const, count: 4 })),
      ...LOWER_TOPICS.map((topic) => ({ grade: "2", topic, mode: "practice" as const, count: 3 })),
      ...["3", "4", "5", "6"].flatMap((grade) =>
        UPPER_TOPICS.map((topic) => ({ grade, topic, mode: "learning" as const, count: 5 }))
      ),
    ];

    for (const item of plan) {
      const result = await collectFromRun(page, item.grade, item.topic, item.mode, item.count);
      samples.push(...result.rows);
      await writeFile(
        REPORT_PATH,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            partial: true,
            total: samples.length,
            samples,
          },
          null,
          2
        ),
        "utf8"
      );
    }

    const byGradeTopicMode = samples.reduce<Record<string, number>>((acc, row) => {
      const key = `${row.gradeLabel} / ${row.topicLabel} / ${row.mode}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const issues = samples.flatMap((row, index) =>
      row.issues.map((issue) => ({
        issue,
        index,
        grade: row.gradeLabel,
        topic: row.topicLabel,
        mode: row.mode,
        question: row.question,
        answers: row.answers,
        audio: row.audio,
      }))
    );

    await writeFile(
      REPORT_PATH,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          total: samples.length,
          byGradeTopicMode,
          examples: samples.slice(0, 20),
          issues,
          samples,
        },
        null,
        2
      ),
      "utf8"
    );

    expect(samples.length).toBeGreaterThanOrEqual(160);
  });
});
