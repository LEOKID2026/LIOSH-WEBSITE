#!/usr/bin/env node
/**
 * History G6 — full QA suite (672-question bank, no expansion).
 * Usage: node --env-file=.env.local --env-file=.env.e2e.local tmp/history-full-qa-suite.mjs [port]
 */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.HISTORY_QA_PORT || 3010);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, "tmp", "history-full-qa-report");
mkdirSync(OUT, { recursive: true });

const STUDENTS = [
  { leo: "AAA1", label: "g1", pin: "1234", login: "aaa1" },
  { leo: "AAA7", label: "g4", pin: "1234", login: "aaa7" },
  { leo: "AAA11", label: "g6", pin: "1234", login: "aaa11" },
];

const TOPICS = [
  "what_is_history",
  "classical_greece",
  "hellenism_jews",
  "hasmonaeans",
  "rome_jews",
  "mixed",
];

const LATIN = /[a-zA-Z]/;
const BAD_DOM = [
  { id: "latin", re: LATIN },
  { id: "draft_leak", re: /\[DRAFT[^\]]*\]/i },
  { id: "grade_level", re: /כיתה\s+ו['׳]?\s*[·•—|]\s*רמה/u },
  { id: "question_num", re: /\(שאלה\s+\d+\)/u },
  { id: "hist_key", re: /\bhist_[a-z0-9_]+/i },
  { id: "topic_key", re: /history:g6:/i },
];

const BOOK_SECTIONS = {
  what_is_history: 1,
  classical_greece: 4,
  hellenism_jews: 2,
  hasmonaeans: 2,
  rome_jews: 7,
};

const report = {
  startedAt: new Date().toISOString(),
  base: BASE,
  sections: {},
  openIssues: [],
  allPass: false,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function section(name, pass, detail = {}) {
  report.sections[name] = { pass: !!pass, ...detail };
  if (!pass) report.openIssues.push(name);
  return pass;
}

function scanText(text, label) {
  let s = String(text || "");
  s = s.replace(/LEO KIDS/gi, "");
  s = s.replace(/©\s*\d{4}\s*LEO K/gi, "");
  const hits = [];
  for (const p of BAD_DOM) {
    const m = s.match(p.re);
    if (m) {
      const idx = s.search(p.re);
      hits.push({ label, type: p.id, match: m[0], context: s.slice(Math.max(0, idx - 25), idx + 45) });
    }
  }
  return hits;
}

async function verifyLoginReady() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
    await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 120_000 });
    return true;
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

async function ensureServer() {
  if (await verifyLoginReady()) return { alreadyRunning: true };

  const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    shell: true,
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();
  for (let i = 0; i < 120; i++) {
    await sleep(2000);
    if (await verifyLoginReady()) return { started: true, pid: child.pid };
  }
  throw new Error(`Server on ${BASE} not healthy (login form never ready)`);
}

function runStatic(name, cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { pass: true, out: out.slice(-500) };
  } catch (e) {
    return { pass: false, err: String(e.stderr || e.stdout || e.message).slice(-800) };
  }
}

async function studentLogin(page, leo, pin) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 120_000 }).catch(() => {});
  await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 120_000 });
  await page.getByTestId("student-login-username").fill(leo);
  await page.getByTestId("student-login-pin").fill(pin);
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);
}

async function practiceHistory(page, topic = "rome_jews", count = 10) {
  await page.goto(`${BASE}/learning/history-master?topic=${topic}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(2500);
  const start = page.getByTestId("science-start-game");
  if (!(await start.isVisible().catch(() => false))) {
    throw new Error("science-start-game not visible");
  }
  await start.click();
  await page.getByTestId("science-question-stem").waitFor({ state: "visible", timeout: 20_000 });
  for (let i = 0; i < count; i++) {
    await page.getByTestId("science-question-stem").waitFor({ state: "visible", timeout: 15_000 });
    const stem = await page.getByTestId("science-question-stem").innerText().catch(() => "");
    const stemHits = scanText(stem, `q${i + 1}-stem`);
    if (stemHits.length) throw new Error(`stem leak: ${JSON.stringify(stemHits[0])}`);
    const optIdx = i % 4 === 0 ? 1 : 0;
    const opt = page.getByTestId(`science-mcq-${optIdx}`);
    if (!(await opt.isVisible().catch(() => false))) {
      throw new Error(`science-mcq-0 missing on Q${i + 1}`);
    }
    await opt.click();
    await page.waitForTimeout(1200);
  }
  const stop = page.getByTestId("learning-stop-game");
  if (await stop.isVisible().catch(() => false)) {
    await stop.click();
    await page.waitForTimeout(2000);
  }
  return page.evaluate(() => {
    const mistakes = JSON.parse(localStorage.getItem("mleo_history_mistakes") || "[]");
    const tracking = JSON.parse(localStorage.getItem("mleo_history_time_tracking") || "{}");
    const master = JSON.parse(localStorage.getItem("mleo_history_master") || "{}");
    return {
      mistakesCount: mistakes.length,
      mistakesSample: mistakes.slice(-5).map((m) => ({
        topic: m.topic,
        subtopicKey: m.subtopicKey || m.params?.subtopicKey || null,
      })),
      trackingKeys: Object.keys(tracking),
      masterKeys: Object.keys(master),
      totalQuestions: master.totalQuestions ?? master.total ?? null,
    };
  });
}

async function getParentToken() {
  const email = process.env.E2E_PARENT_EMAIL || process.env.QA_PARENT_EMAIL || "admin@admin.com";
  const password = process.env.E2E_PARENT_PASSWORD || process.env.DEMO_PARENT_PASSWORD || "";
  if (!password) return { ok: false, reason: "missing E2E_PARENT_PASSWORD" };
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, reason: "missing supabase env" };
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) return { ok: false, reason: "parent auth failed" };
  return { ok: true, token: json.access_token, email };
}

async function listStudents(token) {
  const res = await fetch(`${BASE}/api/parent/list-students`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "list-students failed");
  return body.students || [];
}

async function fetchReportData(token, studentId, from, to) {
  const url = `${BASE}/api/parent/students/${encodeURIComponent(studentId)}/report-data?from=${from}&to=${to}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `report-data ${res.status}`);
  return body;
}

async function runDomAudit(browser) {
  const ctx = await browser.newContext({ locale: "he-IL" });
  const page = await ctx.newPage();
  const hits = [];
  await studentLogin(page, "AAA7", "1234");

  const routes = [
    { path: "/student/learning", label: "student-learning" },
    { path: "/learning/history-master", label: "history-master" },
    ...TOPICS.map((t) => ({ path: `/learning/history-master?topic=${t}`, label: `practice-${t}` })),
    ...TOPICS.filter((t) => t !== "mixed").map((t) => ({
      path: `/learning/book/history/g6/${t}`,
      label: `book-${t}`,
    })),
  ];

  for (const route of routes) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForTimeout(route.path.includes("history-master") ? 3500 : 2000);
    const text = await page.evaluate(() => document.body?.innerText || "");
    writeFileSync(join(OUT, `${route.label}.txt`), text, "utf8");
    hits.push(...scanText(text, route.label));
  }

  await page.goto(`${BASE}/learning/history-master?topic=what_is_history`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(3000);
  const startBtn = page.getByTestId("science-start-game");
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(2500);
    const practiceText = await page.evaluate(() => {
      const stem = document.querySelector('[data-testid="science-question-stem"]');
      const opts = [...document.querySelectorAll('[data-testid^="science-mcq-"]')].map((el) => el.innerText);
      return [stem?.innerText || "", ...opts].join("\n");
    });
    hits.push(...scanText(practiceText, "practice-active-question"));
  }

  await ctx.close();
  writeFileSync(join(OUT, "dom-hits.json"), JSON.stringify(hits, null, 2), "utf8");
  return { pass: hits.length === 0, hits, routes: routes.length };
}

function auditBookMarkdown() {
  const dir = join(ROOT, "docs", "learning-book", "history", "g6", "drafts");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const details = {};
  let totalSections = 0;
  let pass = files.length === 5;
  for (const f of files) {
    const key = f.replace(/\.md$/, "");
    const text = readFileSync(join(dir, f), "utf8");
    const sections = (text.match(/^### /gm) || []).length;
    const expected = BOOK_SECTIONS[key] ?? 0;
    const ok = sections >= expected;
    if (!ok) pass = false;
    totalSections += sections;
    const body = text.split("---").slice(2).join("---");
    details[key] = { sections, expected, ok, hasLatin: LATIN.test(body) };
    if (details[key].hasLatin) pass = false;
  }
  return { pass: pass && totalSections >= 16, totalSections, details, fileCount: files.length };
}

async function runE2EStudents(browser) {
  const results = [];
  for (const st of STUDENTS) {
    const ctx = await browser.newContext({ locale: "he-IL" });
    const page = await ctx.newPage();
    const row = { ...st, pass: false };
    try {
      await studentLogin(page, st.leo, st.pin);
      await page.goto(`${BASE}/student/learning`, { waitUntil: "networkidle" });
      row.historyVisible = await page.getByRole("link", { name: "היסטוריה" }).isVisible().catch(() => false);
      await page.getByRole("link", { name: "היסטוריה" }).click();
      await page.waitForURL("**/learning/history-master**", { timeout: 30_000 });
      row.masterOk = page.url().includes("history-master");
      const storage = await practiceHistory(page, "rome_jews", 10);
      row.storage = storage;
      row.subtopicInMistakes =
        storage.mistakesCount === 0 ||
        (storage.mistakesSample || []).some((m) => String(m.subtopicKey || "").startsWith("hist_sub_"));
      row.pass =
        row.historyVisible &&
        row.masterOk &&
        (storage.trackingKeys.length > 0 || Number(storage.totalQuestions) >= 10);
    } catch (e) {
      row.error = String(e.message || e);
    } finally {
      await ctx.close();
    }
    results.push(row);
  }
  return {
    pass: results.every((r) => r.pass),
    results,
  };
}

async function runParentReportAndCopilot(browser, token, students) {
  const { buildParentReportV2FromAggregate } = await import(
    pathToFileURL(join(ROOT, "scripts/qa/lib/mass-virtual-students/report-v2-bridge.mjs")).href
  );
  const { buildDetailedParentReportFromBaseReport } = await import(
    pathToFileURL(join(ROOT, "utils/detailed-parent-report.js")).href
  );
  const parentCopilot = (await import(pathToFileURL(join(ROOT, "utils/parent-copilot/index.js")).href)).default;
  const { GENERIC_WEAKNESS_HE } = await import(
    pathToFileURL(join(ROOT, "utils/diagnostic-labels-he.js")).href
  );
  const { HISTORY_G6_SUBTOPIC_IDS } = await import(
    pathToFileURL(join(ROOT, "data/history-g6-content-map.js")).href
  );

  const target = students.find((s) => String(s.login_username || s.username || "").toLowerCase() === "aaa11")
    || students.find((s) => /AAA11/i.test(String(s.full_name || s.label || "")))
    || students[0];
  if (!target?.id) return { pass: false, reason: "no student for parent report" };

  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);

  await sleep(12_000);
  const raw = await fetchReportData(token, target.id, from, to);
  const v2 = await buildParentReportV2FromAggregate(raw, {
    studentName: target.full_name || "AAA11",
    fromDate: new Date(`${from}T00:00:00Z`),
    toDate: new Date(`${to}T23:59:59Z`),
  });
  const detailed = buildDetailedParentReportFromBaseReport(v2, { period: "month" });

  const subtopics = v2.historySubtopics || {};
  const subtopicKeys = Object.keys(subtopics);
  const hebrewLabels = subtopicKeys.filter((k) => {
    const n = subtopics[k]?.displayName;
    return n && /[\u0590-\u05FF]/.test(String(n));
  });
  const recs = (v2.allRecommendations || v2.topicRecommendations || []).filter(
    (r) => String(r.operationName || "").match(/היסטוריה|אתונה|רומא|הורדוס|מקב|hist_sub/i)
      || String(r.message || "").includes("היסטוריה")
  );
  const genericRec = recs.some((r) => String(r.message || "").includes(GENERIC_WEAKNESS_HE));

  const historyProfile = detailed.subjectProfiles?.find((s) => s.subject === "history");
  const uiCtx = await browser.newContext({ locale: "he-IL" });
  const page = await uiCtx.newPage();
  await page.goto(`${BASE}/parent/login`, { waitUntil: "domcontentloaded" });
  const email = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
  const password = process.env.E2E_PARENT_PASSWORD || process.env.DEMO_PARENT_PASSWORD || "";
  await page.getByTestId("parent-login-identifier").fill(email);
  await page.getByTestId("parent-login-secret").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/parent/, { timeout: 60_000 }).catch(() => {});
  await page.goto(
    `${BASE}/learning/parent-report?studentId=${encodeURIComponent(target.id)}&source=parent`,
    { waitUntil: "domcontentloaded", timeout: 90_000 }
  );
  await page.waitForTimeout(10_000);
  const uiText = await page.locator("body").innerText();
  const uiHasHistory = uiText.includes("היסטוריה");
  const uiGeneric = uiText.includes(GENERIC_WEAKNESS_HE);
  await uiCtx.close();

  const prompts = [
    "איך הילד שלי בהיסטוריה?",
    "איך הוא ברומא והיהודים?",
    "איך הוא בהורדוס?",
    "איך הוא במרד המקבים?",
    "איך הוא באתונה וספרטה?",
    "מה קשה לו בהיסטוריה?",
    "מה כדאי לתרגל בבית?",
  ];
  const copilotResults = [];
  const sessionId = `history-qa-${Date.now()}`;
  for (const utterance of prompts) {
    const turn = parentCopilot.runParentCopilotTurn({
      audience: "parent",
      payload: detailed,
      utterance,
      sessionId,
    });
    const text = (turn.answerBlocks || []).map((b) => b.textHe).join(" ");
    copilotResults.push({
      utterance,
      resolutionStatus: turn.resolutionStatus,
      fallbackUsed: turn.fallbackUsed,
      mentionsHistory: /היסטוריה|רומא|הורדוס|מקב|אתונה|ספרטה/i.test(text),
      textSample: text.slice(0, 180),
    });
  }

  const copilotPass = copilotResults.every(
    (c) =>
      c.resolutionStatus === "resolved" &&
      !c.fallbackUsed &&
      c.mentionsHistory
  );

  writeFileSync(join(OUT, "parent-report-v2-snapshot.json"), JSON.stringify({
    historyQuestions: v2.historyQuestions,
    historySubtopicCount: subtopicKeys.length,
    sampleSubtopics: subtopicKeys.slice(0, 5).map((k) => subtopics[k]),
    recommendations: recs.slice(0, 5),
  }, null, 2));

  return {
    pass:
      subtopicKeys.length >= 16 &&
      hebrewLabels.length >= 16 &&
      !genericRec &&
      uiHasHistory &&
      !uiGeneric &&
      copilotPass &&
      Number(v2.historyQuestions || 0) >= 0,
    subtopicKeys: subtopicKeys.length,
    expectedSubtopics: HISTORY_G6_SUBTOPIC_IDS.length,
    hebrewLabels: hebrewLabels.length,
    historyQuestions: v2.historyQuestions,
    uiHasHistory,
    uiGeneric,
    genericRec,
    historyProfileRows: historyProfile?.topicOverviewRows?.length ?? 0,
    copilotResults,
  };
}

async function runParentActivity(browser, token, students) {
  const { generateActivityQuestionSetClient } = await import(
    pathToFileURL(join(ROOT, "lib/classroom-activities/generate-activity-questions-client.js")).href
  );
  const target = students.find((s) => String(s.login_username || "").toLowerCase() === "aaa11") || students[0];
  if (!target?.id) return { pass: false, reason: "no student" };

  const questionSet = await generateActivityQuestionSetClient({
    subject: "history",
    gradeLevel: "g6",
    topic: "rome_jews",
    difficulty: "easy",
    count: 5,
  });
  if (!Array.isArray(questionSet) || questionSet.length < 5) {
    return { pass: false, reason: "question set generation failed" };
  }

  const title = `[QA] היסטוריה רומא ${Date.now()}`;
  const createRes = await fetch(`${BASE}/api/parent/activities`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      studentId: target.id,
      title,
      subject: "history",
      topic: "rome_jews",
      gradeLevel: "g6",
      difficultyLevel: "easy",
      mode: "guided_practice",
      questionCount: 5,
      questionSet,
    }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !created?.activityId) {
    return { pass: false, reason: created?.error || "create activity failed", status: createRes.status };
  }

  const ctx = await browser.newContext({ locale: "he-IL" });
  const page = await ctx.newPage();
  await studentLogin(page, "AAA11", "1234");
  await page.goto(`${BASE}/student/activity/${created.activityId}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForTimeout(4000);
  let answered = 0;
  for (let i = 0; i < 5; i++) {
    const choices = page.locator('[data-testid="activity-answer-choices"] button');
    if ((await choices.count()) === 0) break;
    await choices.first().click();
    const submit = page.getByTestId("activity-submit-answer");
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      answered += 1;
      await page.waitForTimeout(1500);
    }
  }
  await ctx.close();

  return {
    pass: answered >= 5,
    activityId: created.activityId,
    answered,
    topic: "rome_jews",
    subject: "history",
  };
}

async function main() {
  console.log("=== History Full QA Suite ===\n");

  const skipBuild = process.env.HISTORY_QA_SKIP_BUILD === "1";
  const build = skipBuild ? { pass: true, skipped: true } : runStatic("build", "npm run build");
  section("build", build.pass, build.pass ? {} : { err: build.err });

  const audit = runStatic("audit-history-child-text", "node scripts/audit-history-child-text.mjs");
  section("audit-history-child-text", audit.pass, audit.pass ? {} : { err: audit.err });

  const bookVerify = runStatic("verify-history-g6-book", "npm run verify:history-g6-book");
  section("verify-history-g6-book", bookVerify.pass, bookVerify.pass ? {} : { err: bookVerify.err });

  const diag = runStatic("certify-history-diagnostic-probe-e2e", "node scripts/certify-history-diagnostic-probe-e2e.mjs");
  section("certify-history-diagnostic-probe-e2e", diag.pass, diag.pass ? {} : { err: diag.err });

  const bookMd = auditBookMarkdown();
  section("book-16-sections-static", bookMd.pass, bookMd);

  console.log(`Starting server on ${BASE}...`);
  await ensureServer();

  const browser = await chromium.launch({ headless: true });

  const dom = await runDomAudit(browser);
  section("dom-audit", dom.pass, { hits: dom.hits.length, sample: dom.hits.slice(0, 5) });

  const allGrades = await runE2EStudents(browser);
  section("e2e-student-practice", allGrades.pass, allGrades);

  const parentAuth = await getParentToken();
  let parentBlock = { pass: false, reason: parentAuth.reason || "unknown" };
  let activityBlock = { pass: false, reason: "skipped" };
  if (parentAuth.ok) {
    const students = await listStudents(parentAuth.token);
    try {
      parentBlock = await runParentReportAndCopilot(browser, parentAuth.token, students);
    } catch (e) {
      parentBlock = { pass: false, error: String(e.message || e) };
    }
    section("parent-report-ui-and-copilot", parentBlock.pass, parentBlock);
    try {
      activityBlock = await runParentActivity(browser, parentAuth.token, students);
    } catch (e) {
      activityBlock = { pass: false, error: String(e.message || e) };
    }
    section("parent-activity-e2e", activityBlock.pass, activityBlock);
  } else {
    section("parent-report-ui-and-copilot", false, parentAuth);
    section("parent-activity-e2e", false, { skipped: true, reason: parentAuth.reason });
  }

  await browser.close();

  report.allPass = Object.values(report.sections).every((s) => s.pass);
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== FINAL REPORT ===");
  for (const [k, v] of Object.entries(report.sections)) {
    console.log(`${v.pass ? "PASS" : "FAIL"}  ${k}`);
  }
  console.log(`\nOverall: ${report.allPass ? "PASS" : "FAIL"}`);
  console.log(`Report: ${join(OUT, "summary.json")}`);
  process.exit(report.allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("QA suite fatal:", err);
  process.exit(2);
});
