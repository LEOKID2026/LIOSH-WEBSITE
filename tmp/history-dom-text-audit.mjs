/**
 * DOM audit: scan visible text on history learning surfaces for Latin / metadata leaks.
 * Usage: node tmp/history-dom-text-audit.mjs [baseUrl]
 * Requires: npm run start (or next start) on baseUrl.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] || "http://127.0.0.1:3008";
const outDir = join(process.cwd(), "tmp", "history-dom-text-audit");
mkdirSync(outDir, { recursive: true });

const LATIN = /[a-zA-Z]/;
const BAD_PATTERNS = [
  { id: "latin", re: LATIN },
  { id: "grade_level", re: /כיתה\s+ו['׳]?\s*[·•—|]\s*רמה/u },
  { id: "question_num", re: /\(שאלה\s+\d+\)/u },
  { id: "hist_key", re: /\bhist_[a-z0-9_]+/i },
  { id: "topic_key", re: /history:g6:/i },
];

const TOPICS = [
  "what_is_history",
  "classical_greece",
  "hellenism_jews",
  "hasmonaeans",
  "rome_jews",
];

function scanText(text, label) {
  const hits = [];
  let s = String(text || "");
  // Site-wide chrome (not history content)
  s = s.replace(/LEO KIDS/gi, "");
  s = s.replace(/©\s*\d{4}\s*LEO K/gi, "");
  for (const p of BAD_PATTERNS) {
    const m = s.match(p.re);
    if (m) {
      const idx = s.search(p.re);
      hits.push({
        label,
        type: p.id,
        match: m[0],
        context: s.slice(Math.max(0, idx - 30), idx + 40),
      });
    }
  }
  return hits;
}

async function login(page, leo = "AAA7", pin = "1234") {
  await page.goto(`${base}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 90_000 }).catch(() => {});
  await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 30_000 });
  await page.getByTestId("student-login-username").fill(leo);
  await page.getByTestId("student-login-pin").fill(pin);
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: "he-IL" });
const page = await context.newPage();
const allHits = [];

try {
  await login(page);

  const routes = [
    { path: "/student/learning", label: "student-learning" },
    { path: "/learning/history-master", label: "history-master" },
    ...TOPICS.map((t) => ({
      path: `/learning/history-master?topic=${t}`,
      label: `practice-${t}`,
    })),
    ...TOPICS.map((t) => ({
      path: `/learning/book/history/g6/${t}`,
      label: `book-${t}`,
    })),
  ];

  for (const route of routes) {
    await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(route.path.includes("history-master") ? 4000 : 2000);
    let text = await page.evaluate(() => document.body?.innerText || "");
    writeFileSync(join(outDir, `${route.label}.txt`), text, "utf8");
    const hits = scanText(text, route.label);
    allHits.push(...hits);
    console.log(`${route.label}: ${hits.length ? "FAIL" : "OK"} (${text.length} chars)`);
  }

  // Active practice: verify question stem has no metadata prefixes / Latin
  await page.goto(`${base}/learning/history-master?topic=what_is_history`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(3000);
  const startBtn = page.getByTestId("science-start-game");
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(2500);
    const stemEl = page.getByTestId("science-question-stem");
    await stemEl.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
    const practiceText = await page.evaluate(() => {
      const stem = document.querySelector('[data-testid="science-question-stem"]');
      const opts = [...document.querySelectorAll('[data-testid^="science-mcq-"]')].map((el) => el.innerText);
      return [stem?.innerText || "", ...opts].join("\n");
    });
    writeFileSync(join(outDir, "practice-active-question.txt"), practiceText, "utf8");
    const practiceHits = scanText(practiceText, "practice-active-question");
    allHits.push(...practiceHits);
    console.log(`practice-active-question: ${practiceHits.length ? "FAIL" : "OK"}`);
    if (practiceText.trim()) console.log(`  stem sample: ${practiceText.split("\n")[0]?.slice(0, 100)}`);
  } else {
    console.log("practice-active-question: SKIP (start button not visible)");
  }
} catch (err) {
  console.error("DOM audit error:", err?.message || err);
  process.exit(2);
} finally {
  await browser.close();
}

writeFileSync(join(outDir, "hits.json"), JSON.stringify(allHits, null, 2), "utf8");
console.log("\n=== DOM text audit ===");
console.log(`Total hits: ${allHits.length}`);
if (allHits.length) {
  for (const h of allHits.slice(0, 20)) {
    console.log(`- [${h.label}] ${h.type}: "${h.match}" … ${h.context}`);
  }
  process.exit(1);
}
console.log("PASS: no Latin/metadata leaks in DOM text");
process.exit(0);
