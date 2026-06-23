#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3099";
const OUT_DIR = "reports/hebrew-final-visual-runtime-qa";
const OUT = `${OUT_DIR}/visual-runtime-3099.json`;
const USERNAME = process.env.STUDENT_USERNAME || "AAA9";
const PIN = process.env.STUDENT_PIN || "1234";

const TOPICS = ["reading", "comprehension", "grammar", "vocabulary"];
const TOPIC_HE = {
  reading: "קריאה",
  comprehension: "הבנת הנקרא",
  grammar: "דקדוק",
  vocabulary: "עושר שפתי",
};
const GRADE_HE = {
  "1": "כיתה א׳",
  "2": "כיתה ב׳",
  "3": "כיתה ג׳",
  "4": "כיתה ד׳",
  "5": "כיתה ה׳",
  "6": "כיתה ו׳",
};

const FORBIDDEN = [
  ["internal_paren_bli", /\(בלי\b/u],
  ["bli_kria", /בלי קריאה/u],
  ["bli_batik", /בלי בתיק/u],
  ["bli_reshimat", /בלי רשימת/u],
  ["bli_milim", /בלי מילים/u],
  ["undefined", /\bundefined\b/u],
  ["null", /\bnull\b/u],
  ["nan", /\bNaN\b/u],
  ["raw_id", /\b(?:patternFamily|diagnosticSkillId|subtopicId|skillKey|gradeBand|g[1-6]\.)\b/iu],
];
const PUNCT_FALLBACK = new Set(["בדרך כלל לא", "לא תמיד", "תלוי במצב", "רק לפעמים"]);
const PUNCT_ALLOWED = new Set(["נקודה", "סימן שאלה", "סימן קריאה", "פסיק", ".", "?", "!", ","]);

function compact(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function hasHebrew(text) {
  return /[\u0590-\u05FF]/u.test(text);
}

function hasNiqqud(text) {
  return /[\u0591-\u05C7]/u.test(text);
}

function hasUnpointedHebrewWord(text) {
  const words = String(text || "").match(/[\u05D0-\u05EA]{2,}/gu) || [];
  return words.some((word) => !hasNiqqud(word));
}

function overlaps(a, b) {
  if (!a || !b) return false;
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y > 20;
}

async function login(page) {
  await page.goto(`${BASE_URL}/student/login?next=%2Flearning%2Fhebrew-master`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  if (page.url().includes("/student/login")) {
    await page.getByTestId("student-login-username").fill(USERNAME);
    await page.getByTestId("student-login-pin").fill(PIN);
    await page.getByTestId("student-login-submit").click();
  }
  await page.waitForURL(/\/learning\/hebrew-master/, { timeout: 120_000 });
  await page.getByTestId("hebrew-player-name").waitFor({ state: "visible", timeout: 120_000 });
}

async function stopIfActive(page) {
  const stop = page.getByTestId("learning-stop-game");
  if (await stop.isVisible().catch(() => false)) {
    await stop.click();
    await page.waitForTimeout(500);
  }
}

async function startCell(page, grade, topic, mode) {
  await stopIfActive(page);
  await page.locator("select").first().selectOption(grade);
  await page.locator("select").nth(1).selectOption("easy");
  await page.getByTestId("hebrew-topic-select").selectOption(topic);
  const modeBtn = page.getByRole("button", { name: mode === "learning" ? /^למידה$/ : /^תרגול$/ });
  if (await modeBtn.isVisible().catch(() => false)) await modeBtn.click();
  await page.getByTestId("hebrew-start-game").click();
  const continuePractice = page.getByTestId("hebrew-g1-book-first-continue-practice");
  if (await continuePractice.isVisible({ timeout: 2500 }).catch(() => false)) {
    await continuePractice.click();
  }
  await page.getByTestId("hebrew-question-stem").waitFor({ state: "visible", timeout: 120_000 });
}

async function questionText(page) {
  const lead = page.getByTestId("student-question-lead");
  const body = page.getByTestId("student-question-body");
  const parts = [];
  if (await lead.isVisible().catch(() => false)) parts.push(compact(await lead.innerText()));
  if (await body.isVisible().catch(() => false)) parts.push(compact(await body.innerText()));
  if (parts.length) return compact(parts.join(" "));
  return compact(
    (await page.getByTestId("hebrew-question-stem").innerText())
      .replace(/נגן שמע\s*\(\d+\/\d+\)/gu, "")
      .replace(/שמע · מצב משימה[^]*$/u, "")
  );
}

async function answers(page) {
  const out = [];
  for (let i = 0; i < 4; i += 1) {
    const btn = page.getByTestId(`hebrew-mcq-${i}`);
    if (await btn.isVisible().catch(() => false)) out.push(compact(await btn.innerText()));
  }
  return out;
}

async function waitForNiqqudIfLower(page, grade) {
  if (grade !== "1" && grade !== "2") return;
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const q = await questionText(page).catch(() => "");
    const a = await answers(page).catch(() => []);
    if ([q, ...a].some((txt) => hasNiqqud(txt))) return;
    await page.waitForTimeout(500);
  }
}

async function audioCheck(page, grade) {
  if (grade !== "1" && grade !== "2") return { required: false, visible: false, clicked: false, status: "" };
  const btn = page.locator('button[aria-label*="נגן שמע"]').first();
  const visible = await btn.isVisible().catch(() => false);
  if (!visible) return { required: true, visible: false, clicked: false, status: "" };
  const btnBox = await btn.boundingBox().catch(() => null);
  const stemBox = await page.getByTestId("hebrew-question-stem").boundingBox().catch(() => null);
  let clicked = false;
  let status = "";
  try {
    await btn.click({ timeout: 5000 });
    clicked = true;
    await page.waitForTimeout(1200);
    status = compact(await page.getByTestId("hebrew-question-stem").innerText().catch(() => ""));
  } catch (err) {
    status = err instanceof Error ? err.message : String(err);
  }
  return { required: true, visible, clicked, overlapsStem: overlaps(btnBox, stemBox), status };
}

function analyze(row) {
  const issues = [];
  const allText = [row.question, ...row.answers].join(" | ");
  for (const [id, re] of FORBIDDEN) {
    if (re.test(allText)) issues.push(id);
  }
  if (row.answers.length === 4 && new Set(row.answers).size !== row.answers.length) issues.push("duplicate_answers");
  if (row.answers.some((answer) => answer.length > 90)) issues.push("long_answer_card");
  if (/איזה סימן מתאים בסוף המשפט|סימן פיסוק|איזה סימן/u.test(row.question)) {
    row.punctuationQuestion = true;
    if (row.answers.some((answer) => PUNCT_FALLBACK.has(answer))) issues.push("punctuation_fallback_answer");
    if (/סוף המשפט/u.test(row.question) && !row.answers.every((answer) => PUNCT_ALLOWED.has(answer))) {
      issues.push("punctuation_non_symbol_answer");
    }
  }
  if ((row.grade === "1" || row.grade === "2") && hasHebrew(row.question) && hasUnpointedHebrewWord(row.question)) {
    issues.push("missing_niqqud_question");
  }
  if ((row.grade === "1" || row.grade === "2") && row.answers.some((answer) => hasHebrew(answer) && hasUnpointedHebrewWord(answer))) {
    issues.push("missing_niqqud_answer");
  }
  if ((row.grade === "1" || row.grade === "2") && !row.audio.visible) issues.push("missing_audio_button");
  if ((row.grade === "1" || row.grade === "2") && row.audio.visible && !row.audio.clicked) issues.push("audio_click_failed");
  if (row.audio.overlapsStem) issues.push("audio_overlaps_stem");
  return issues;
}

async function advance(page, before) {
  const first = page.getByTestId("hebrew-mcq-0");
  if (!(await first.isVisible().catch(() => false))) return false;
  await first.click();
  await page.waitForFunction(
    (prev) => {
      const lead = document.querySelector('[data-testid="student-question-lead"]')?.textContent || "";
      const body = document.querySelector('[data-testid="student-question-body"]')?.textContent || "";
      const stem = document.querySelector('[data-testid="hebrew-question-stem"]')?.textContent || "";
      const now = `${lead} ${body}`.trim() || stem.trim();
      return now.replace(/\s+/g, " ").trim() !== prev;
    },
    before,
    { timeout: 18_000 }
  ).catch(() => {});
  return true;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "he-IL", viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(120_000);

const samples = [];
const errors = [];

try {
  await login(page);
  const player = compact(await page.getByTestId("hebrew-player-name").innerText());
  const plan = [
    ...["1", "2"].flatMap((grade) =>
      TOPICS.flatMap((topic) => [
        { grade, topic, mode: "practice", count: 5 },
        { grade, topic, mode: "learning", count: 5 },
      ])
    ),
    ...["3", "4", "5", "6"].flatMap((grade) =>
      TOPICS.map((topic) => ({ grade, topic, mode: "learning", count: 5 }))
    ),
  ];

  for (const cell of plan) {
    try {
      await startCell(page, cell.grade, cell.topic, cell.mode);
      for (let i = 0; i < cell.count; i += 1) {
        await waitForNiqqudIfLower(page, cell.grade);
        const q = await questionText(page);
        const row = {
          player,
          grade: cell.grade,
          gradeLabel: GRADE_HE[cell.grade],
          topic: cell.topic,
          topicLabel: TOPIC_HE[cell.topic],
          mode: cell.mode,
          question: q,
          answers: await answers(page),
          audio: await audioCheck(page, cell.grade),
        };
        row.issues = analyze(row);
        samples.push(row);
        await writeFile(OUT, JSON.stringify({ baseUrl: BASE_URL, player, partial: true, total: samples.length, errors, samples }, null, 2));
        await advance(page, q);
      }
    } catch (err) {
      errors.push({ cell, error: err instanceof Error ? err.message : String(err), url: page.url() });
      await writeFile(OUT, JSON.stringify({ baseUrl: BASE_URL, partial: true, total: samples.length, errors, samples }, null, 2));
      await stopIfActive(page).catch(() => {});
    }
  }

  const byGradeTopic = {};
  for (const sample of samples) {
    const key = `${sample.gradeLabel}/${sample.topicLabel}/${sample.mode}`;
    byGradeTopic[key] = (byGradeTopic[key] || 0) + 1;
  }
  const issues = samples.flatMap((sample, index) => sample.issues.map((issue) => ({ issue, index, sample })));
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify({ baseUrl: BASE_URL, player, total: samples.length, byGradeTopic, issueCount: issues.length, issues, errors, examples: samples.slice(0, 10), samples }, null, 2)
  );
  console.log(JSON.stringify({ baseUrl: BASE_URL, player, total: samples.length, byGradeTopic, issueCount: issues.length, issues: issues.slice(0, 20), errors, examples: samples.slice(0, 10) }, null, 2));
} finally {
  await browser.close();
}
