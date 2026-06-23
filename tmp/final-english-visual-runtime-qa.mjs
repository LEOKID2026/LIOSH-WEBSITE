import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { countRuntimeEligiblePhonicsItems } from "../data/english-questions/index.js";
import { ENGLISH_LEVELS, generateQuestion, getLevelForGrade } from "../utils/english-question-generator.js";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const outDir = "tmp/final-english-visual-runtime-qa";
const rawBadRe = /\b(undefined|null|NaN)\b|en_[a-z0-9_]{3,}|translation_boost|storyOnly/iu;
const translationRe = /\btranslation\b|תרגום|translation_boost|storyOnly/iu;

const gradeSamples = [
  { grade: 1, required: 40, topics: ["phonics", "vocabulary", "phonics", "vocabulary"] },
  { grade: 2, required: 40, topics: ["phonics", "vocabulary", "phonics", "vocabulary"] },
  { grade: 3, required: 20, topics: ["vocabulary", "grammar", "sentences", "writing"] },
  { grade: 4, required: 20, topics: ["vocabulary", "grammar", "sentences", "writing"] },
  { grade: 5, required: 20, topics: ["vocabulary", "grammar", "sentences", "writing"] },
  { grade: 6, required: 20, topics: ["vocabulary", "grammar", "sentences", "writing"] },
];

const findings = [];
const pageErrors = [];

function heGradeKey(n) {
  return `g${n}`;
}

function normalizeSpace(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function hasCopyLeak(q) {
  const stem = normalizeSpace([q.lead, q.body].filter(Boolean).join(" "));
  const answers = q.answers.map(normalizeSpace).filter(Boolean);
  if (!stem || !answers.length) return false;
  return answers.some((a) => a.length > 1 && stem.includes(a));
}

async function installRoutes(page, grade = 3) {
  await page.route("**/api/student/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        student: {
          id: "00000000-0000-0000-0000-00000000e501",
          full_name: "Visual QA Child",
          grade_level: grade,
          is_active: true,
          coin_balance: 0,
        },
      }),
    });
  });

  await page.route("**/api/learning/session/start", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, sessionId: "qa-session" }) });
  });
  await page.route("**/api/learning/answer", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/learning/session/finish", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/learning/profile**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, profile: null }) });
  });
  await page.route("**/api/student/home-profile**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, challenges: [] }) });
  });
  await page.route("**/api/analytics/events", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/learning/book-events", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
}

async function installSpeechProbe(page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.__qaSpoken = [];
    const NativeUtterance = window.SpeechSynthesisUtterance;
    if (NativeUtterance) {
      window.SpeechSynthesisUtterance = function QAUtterance(text) {
        const u = new NativeUtterance(text);
        return u;
      };
    }
    const synth = window.speechSynthesis;
    if (synth && synth.speak) {
      const nativeSpeak = synth.speak.bind(synth);
      synth.speak = (utterance) => {
        window.__qaSpoken.push({ text: utterance?.text || "", lang: utterance?.lang || "" });
        setTimeout(() => utterance?.onend?.({ type: "end" }), 20);
        try {
          nativeSpeak(utterance);
        } catch {
          setTimeout(() => utterance?.onend?.({ type: "end" }), 20);
        }
      };
    }
  });
}

async function setupEnglish(page, grade, topic, mode = "practice", viewport = "desktop") {
  await page.setViewportSize(viewport === "mobile" ? { width: 390, height: 844 } : { width: 1365, height: 900 });
  await page.goto(`${baseURL}/learning/english-master`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("mleo_english_book_learning_g1");
      localStorage.removeItem("mleo_english_book_learning_g2");
      localStorage.removeItem("mleo_english_book_learning_g3");
      localStorage.removeItem("mleo_english_book_learning_g4");
      localStorage.removeItem("mleo_english_book_learning_g5");
      localStorage.removeItem("mleo_english_book_learning_g6");
      localStorage.removeItem("mleo_english_master");
      localStorage.removeItem("mleo_english_master_snapshot");
    } catch {}
  });
  await page.waitForSelector('[data-testid="english-player-name"]', { timeout: 60_000 });
  await page.locator("select").nth(0).selectOption(String(grade));
  await page.locator("select").nth(1).selectOption("easy").catch(() => {});
  const topicSelect = page.getByTestId("english-topic-select");
  const values = await topicSelect.evaluate((el) => [...el.options].map((o) => o.value));
  if (!values.includes(topic)) {
    findings.push({ severity: "blocker", area: "topic-visible", message: `grade ${grade} topic ${topic} not selectable`, values });
    return false;
  }
  await topicSelect.selectOption(topic);
  if (mode === "learning") {
    const learningBtn = page.getByRole("button", { name: /למידה/u }).first();
    if (await learningBtn.isVisible().catch(() => false)) await learningBtn.click();
  }
  await page.getByTestId("english-start-game").click();
  await page.waitForSelector('[data-testid="english-question-stem"]', { timeout: 60_000 });
  return true;
}

async function collectQuestion(page, meta) {
  const stem = page.getByTestId("english-question-stem");
  await stem.waitFor({ state: "visible", timeout: 60_000 });
  const lead = normalizeSpace(await page.getByTestId("student-question-lead").innerText().catch(() => ""));
  const body = normalizeSpace(await page.getByTestId("student-question-body").innerText().catch(() => ""));
  const answerButtons = page.locator('button[data-testid^="english-mcq-"]');
  const answerCount = await answerButtons.count();
  const answers = [];
  for (let i = 0; i < answerCount; i += 1) answers.push(normalizeSpace(await answerButtons.nth(i).innerText()));
  const inputCount = await page.locator('input[type="text"]:visible').count();
  const audio = page.getByTestId("english-phonics-audio-play");
  const audioCount = await audio.count();
  const beforeSpoken = await page.evaluate(() => window.__qaSpoken?.length || 0).catch(() => 0);
  let audioClickOk = false;
  if (audioCount > 0) {
    await audio.first().click().catch(() => {});
    await page.waitForTimeout(100);
    const afterSpoken = await page.evaluate(() => window.__qaSpoken?.length || 0).catch(() => 0);
    audioClickOk = afterSpoken > beforeSpoken;
  }
  const box = await stem.boundingBox();
  const overflow = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2)) {
        bad.push({ tag: el.tagName, text: (el.textContent || "").trim().slice(0, 80), left: r.left, right: r.right });
      }
    }
    return bad.slice(0, 8);
  });
  const visibleText = normalizeSpace(await page.locator("body").innerText().catch(() => ""));
  const q = {
    ...meta,
    lead,
    body,
    answers,
    inputType: answerCount > 0 ? "MCQ" : inputCount > 0 ? "typing" : "unknown",
    audioButton: audioCount > 0,
    audioClickOk,
    rawBad: rawBadRe.test([lead, body, answers.join(" ")].join(" ")),
    copyLeak: hasCopyLeak({ lead, body, answers }),
    overflowCount: overflow.length,
    overflow,
    stemBox: box,
    translationVisible: translationRe.test(visibleText),
  };
  if ((meta.grade === 1 || meta.grade === 2) && !q.audioButton) {
    findings.push({ severity: "blocker", area: "audio", message: `G${meta.grade} ${meta.topic} question has no audio button`, question: q });
  }
  if (q.rawBad) findings.push({ severity: "blocker", area: "raw-copy", message: "raw/undefined/null/NaN visible in question", question: q });
  if (q.copyLeak && meta.topic !== "phonics") findings.push({ severity: "blocker", area: "copy-leak", message: "answer text appears in question", question: q });
  if (q.overflowCount) findings.push({ severity: "major", area: "layout", message: "horizontal overflow detected", question: q });
  return q;
}

async function advance(page) {
  const answerButtons = page.locator('button[data-testid^="english-mcq-"]');
  const count = await answerButtons.count();
  if (count > 0) {
    await answerButtons.first().click();
  } else {
    const input = page.locator('input[type="text"]:visible').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill("qa");
      const btn = page.getByRole("button", { name: /בדוק|שלח|הבא|שאלה/u }).last();
      await btn.click().catch(async () => {
        await input.press("Enter");
      });
    }
  }
  await page.waitForTimeout(1500);
}

async function sampleRuntime(page) {
  const samples = [];
  for (const plan of gradeSamples) {
    const perTopic = Math.ceil(plan.required / plan.topics.length);
    let sampledForGrade = 0;
    const topicCounts = {};
    for (const topic of plan.topics) {
      if (sampledForGrade >= plan.required) break;
      const ok = await setupEnglish(page, plan.grade, topic, "practice", "desktop");
      if (!ok) continue;
      const take = Math.min(perTopic, plan.required - sampledForGrade);
      for (let i = 0; i < take; i += 1) {
        samples.push(await collectQuestion(page, { grade: plan.grade, topic, mode: "practice", viewport: "desktop", indexInTopic: i + 1 }));
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        sampledForGrade += 1;
        await advance(page);
      }
      await page.getByTestId("learning-stop-game").click().catch(() => {});
    }
    if (sampledForGrade < plan.required) findings.push({ severity: "blocker", area: "coverage", message: `G${plan.grade} sampled ${sampledForGrade}/${plan.required}`, topicCounts });
  }
  return samples;
}

async function inspectVisibility(page) {
  const out = [];
  for (const grade of [1, 2, 3, 4, 5, 6]) {
    await page.goto(`${baseURL}/learning/english-master`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      try {
        localStorage.removeItem("mleo_english_master_snapshot");
        localStorage.removeItem("mleo_english_master");
      } catch {}
    });
    try {
      await page.waitForSelector('[data-testid="english-topic-select"]', { timeout: 60_000 });
    } catch (err) {
      const body = normalizeSpace(await page.locator("body").innerText().catch((e) => `body-read-error: ${e.message}`));
      findings.push({
        severity: "blocker",
        area: "english-route",
        message: `english topic select did not render for grade ${grade}`,
        url: page.url(),
        bodyExcerpt: body.slice(0, 1200),
        error: err.message,
      });
      out.push({ grade, options: [], translationInOptions: false, translationInBody: translationRe.test(body), renderFailed: true, bodyExcerpt: body.slice(0, 1200) });
      continue;
    }
    await page.locator("select").nth(0).selectOption(String(grade));
    const options = await page.getByTestId("english-topic-select").evaluate((el) => [...el.options].map((o) => ({ value: o.value, text: o.textContent.trim() })));
    const bodyText = normalizeSpace(await page.locator("body").innerText());
    out.push({ grade, options, translationInOptions: options.some((o) => o.value === "translation" || translationRe.test(o.text)), translationInBody: translationRe.test(bodyText) });
    if (options.some((o) => o.value === "translation" || translationRe.test(o.text))) {
      findings.push({ severity: "blocker", area: "translation-hide", message: `translation visible in grade ${grade} topic select`, options });
    }
  }
  return out;
}

async function inspectBooks(page) {
  const checks = [];
  const pageIdsByGrade = {
    1: ["letters_upper", "vocab_colors"],
    2: ["letters_review", "vocab_school"],
    3: ["vocab_routines", "grammar_present_simple"],
    4: ["vocab_community", "grammar_progressive"],
    5: ["vocab_technology", "grammar_past_simple"],
    6: ["vocab_global_issues", "grammar_complex_tenses"],
  };
  for (const [grade, ids] of Object.entries(pageIdsByGrade)) {
    for (const pageId of ids) {
      const url = `${baseURL}/learning/book/english/g${grade}/${pageId}`;
      const res = await page.goto(url, { waitUntil: "domcontentloaded" }).catch((e) => ({ ok: () => false, error: e.message }));
      await page.waitForTimeout(500);
      const body = normalizeSpace(await page.locator("body").innerText().catch(() => ""));
      const ok = Boolean(res?.ok?.()) && body.length > 50 && !rawBadRe.test(body);
      checks.push({ grade: Number(grade), pageId, ok, hasPractice: /תרגול|תרגל|practice|התחל/u.test(body), translationVisible: translationRe.test(body), excerpt: body.slice(0, 220) });
      if (!ok) findings.push({ severity: "major", area: "books", message: `book page failed/empty/raw: g${grade}/${pageId}`, excerpt: body.slice(0, 220) });
      if (translationRe.test(body)) findings.push({ severity: "blocker", area: "translation-hide", message: `translation visible in book g${grade}/${pageId}`, excerpt: body.slice(0, 220) });
    }
  }
  return checks;
}

async function inspectParentActivity(page) {
  const level = getLevelForGrade("easy", "g2");
  const questionSet = Array.from({ length: 3 }, () => {
    const q = generateQuestion(level, "vocabulary", "g2", null, "easy");
    return {
      subject: "english",
      topic: "vocabulary",
      gradeLevel: "g2",
      question: q.question,
      choices: q.answers,
      params: q.params,
      qType: q.qType,
    };
  });
  await page.route("**/api/student/activities/qa-parent-g2-vocab/start", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        activity: { title: "אנגלית - אוצר מילים", mode: "homework", answerRequired: true, questionCount: 3 },
        questionSet,
        attempts: [],
      }),
    });
  });
  await page.route("**/api/student/activities/qa-parent-g2-vocab/answer", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, isCorrect: true }) });
  });
  await page.route("**/api/student/activities/qa-parent-g2-vocab/submit", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, scorePct: 100, correctCount: 3, questionCount: 3 }) });
  });
  await page.goto(`${baseURL}/student/activity/qa-parent-g2-vocab`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="activity-question-stage"]', { timeout: 60_000 });
  const parentSamples = [];
  for (let i = 0; i < 3; i += 1) {
    const text = normalizeSpace(await page.getByTestId("activity-question-stage").innerText());
    const answers = [];
    const choices = page.locator('[data-testid="activity-answer-choices"] button');
    for (let c = 0; c < await choices.count(); c += 1) answers.push(normalizeSpace(await choices.nth(c).innerText()));
    const audio = page.getByTestId("english-phonics-audio-play");
    const audioButton = await audio.count() > 0;
    if (audioButton) await audio.first().click().catch(() => {});
    parentSamples.push({ index: i + 1, text, answers, audioButton, rawBad: rawBadRe.test(`${text} ${answers.join(" ")}`), leaksScoring: /correctAnswer|explanation|correct_answer/u.test(text) });
    await choices.first().click();
    await page.getByTestId("activity-submit-answer").click();
    await page.waitForTimeout(800);
  }
  if (parentSamples.some((s) => !s.audioButton)) findings.push({ severity: "blocker", area: "parent-activity-audio", message: "G2 vocabulary parent activity question missing audio", parentSamples });
  if (parentSamples.some((s) => s.leaksScoring)) findings.push({ severity: "blocker", area: "parent-activity-leak", message: "scoring field visible to child", parentSamples });
  return parentSamples;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ locale: "he-IL" });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  });
  await installSpeechProbe(page);
  await installRoutes(page, 3);

  const phonicsCounts = countRuntimeEligiblePhonicsItems();
  if (phonicsCounts.g1 < 60) findings.push({ severity: "blocker", area: "phonics-count", message: `G1 runtime eligible phonics ${phonicsCounts.g1} < 60` });
  if (phonicsCounts.g2 < 52) findings.push({ severity: "blocker", area: "phonics-count", message: `G2 runtime eligible phonics ${phonicsCounts.g2} < 52` });

  const visibility = await inspectVisibility(page);
  const runtimeSamples = await sampleRuntime(page);
  const parentSamples = await inspectParentActivity(page);
  const books = await inspectBooks(page);

  await browser.close();
  const report = {
    generatedAt: new Date().toISOString(),
    baseURL,
    phonicsCounts,
    visibility,
    counts: runtimeSamples.reduce((acc, q) => {
      const key = `G${q.grade}:${q.topic}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    runtimeSamples,
    parentSamples,
    books,
    pageErrors,
    findings,
    summary: {
      totalRuntimeQuestions: runtimeSamples.length,
      g1g2AudioMissing: findings.filter((f) => f.area === "audio").length,
      copyLeaks: findings.filter((f) => f.area === "copy-leak").length,
      rawBad: findings.filter((f) => f.area === "raw-copy").length,
      blockers: findings.filter((f) => f.severity === "blocker").length,
    },
  };
  await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report.summary, null, 2));
  if (findings.some((f) => f.severity === "blocker")) process.exitCode = 2;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
