#!/usr/bin/env node
/**
 * History Copilot scope + countable QA (fresh practice, DB proof, parent report UI, 7 Copilot prompts).
 * Usage: node --env-file=.env.local --env-file=.env.e2e.local tmp/history-copilot-scope-qa.mjs [port]
 */
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.HISTORY_QA_PORT || 3011);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, "tmp", "history-copilot-scope-qa-report");
mkdirSync(OUT, { recursive: true });

const STUDENTS = [
  { leo: "AAA1", login: "aaa1", pin: "1234", topic: "what_is_history" },
  { leo: "AAA7", login: "aaa7", pin: "1234", topic: "classical_greece" },
  { leo: "AAA11", login: "aaa11", pin: "1234", topic: "rome_jews" },
];

const COPILOT_PROMPTS = [
  "איך הילד שלי בהיסטוריה?",
  "איך הוא ברומא והיהודים?",
  "איך הוא בהורדוס?",
  "איך הוא במרד המקבים?",
  "איך הוא באתונה וספרטה?",
  "מה קשה לו בהיסטוריה?",
  "מה כדאי לתרגל בבית בהיסטוריה?",
];

const report = { startedAt: new Date().toISOString(), sections: {}, openIssues: [] };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function section(name, pass, detail = {}) {
  report.sections[name] = { pass: !!pass, ...detail };
  if (!pass) report.openIssues.push(name);
  return pass;
}

function runStatic(name, cmd) {
  try {
    execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { pass: true };
  } catch (e) {
    return { pass: false, err: String(e.stderr || e.stdout || e.message).slice(-800) };
  }
}

async function verifyLoginReady() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 120_000 });
    return true;
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

async function ensureServer() {
  if (await verifyLoginReady()) return;
  const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT,
    shell: true,
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();
  for (let i = 0; i < 90; i++) {
    await sleep(2000);
    if (await verifyLoginReady()) return;
  }
  throw new Error(`Server on ${BASE} not ready`);
}

async function studentLogin(page, leo, pin) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 120_000 });
  await page.getByTestId("student-login-username").fill(leo);
  await page.getByTestId("student-login-pin").fill(pin);
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);
}

async function practiceHistory(page, topic, count = 10) {
  await page.goto(`${BASE}/learning/history-master?topic=${topic}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(2500);
  await page.getByTestId("science-start-game").click();
  await page.getByTestId("science-question-stem").waitFor({ state: "visible", timeout: 20_000 });
  for (let i = 0; i < count; i++) {
    await page.getByTestId("science-question-stem").waitFor({ state: "visible", timeout: 15_000 });
    const optIdx = i % 4 === 0 ? 1 : 0;
    await page.getByTestId(`science-mcq-${optIdx}`).click();
    await page.waitForTimeout(1200);
  }
  const stop = page.getByTestId("learning-stop-game");
  if (await stop.isVisible().catch(() => false)) {
    await stop.click();
    await page.waitForTimeout(2000);
  }
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveStudentId(supabase, login) {
  const { data, error } = await supabase
    .from("students")
    .select("id, login_username, full_name")
    .ilike("login_username", login)
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function verifyStudentDb(supabase, studentId, sinceIso) {
  const { data: sessions, error: sErr } = await supabase
    .from("learning_sessions")
    .select("id, subject, source, started_at, metadata")
    .eq("student_id", studentId)
    .eq("subject", "history")
    .gte("started_at", sinceIso)
    .order("started_at", { ascending: false });
  if (sErr) throw sErr;

  const sessionIds = (sessions || []).map((s) => s.id);
  let answers = [];
  if (sessionIds.length) {
    const { data, error } = await supabase
      .from("answers")
      .select("id, is_correct, answered_at, answer_payload, learning_session_id")
      .eq("student_id", studentId)
      .in("learning_session_id", sessionIds)
      .order("answered_at", { ascending: false });
    if (error) throw error;
    answers = data || [];
  }

  const countable = answers.filter((a) => {
    const p = a.answer_payload || {};
    return (
      p.subject === "history" &&
      p.source === "self_practice" &&
      p.evidenceCategory !== "learning_guided" &&
      p.afterStepByStep !== true
    );
  });

  const withParams = countable.filter((a) => {
    const params = a.answer_payload?.params || {};
    return params.topicKey && params.subtopicKey && params.skillId;
  });

  return {
    sessions: sessions?.length || 0,
    answers: answers.length,
    countable: countable.length,
    withParams: withParams.length,
    sampleParams: withParams.slice(0, 3).map((a) => a.answer_payload?.params),
    selfPracticeSessions: (sessions || []).filter((s) => s.source === "self_practice").length,
  };
}

async function getParentToken() {
  const email = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
  const password = process.env.E2E_PARENT_PASSWORD || "";
  if (!password) return { ok: false, reason: "missing E2E_PARENT_PASSWORD" };
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) return { ok: false, reason: "parent auth failed" };
  return { ok: true, token: json.access_token };
}

async function listStudents(token) {
  const res = await fetch(`${BASE}/api/parent/list-students`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || "list-students failed");
  return body.students || [];
}

async function fetchReportData(token, studentId, from, to) {
  const url = `${BASE}/api/parent/students/${encodeURIComponent(studentId)}/report-data?from=${from}&to=${to}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || `report-data ${res.status}`);
  return body;
}

async function runFreshPractice(browser, supabase) {
  const sinceIso = new Date().toISOString();
  const results = [];
  for (const st of STUDENTS) {
    const row = { leo: st.leo, pass: false };
    const ctx = await browser.newContext({ locale: "he-IL" });
    const page = await ctx.newPage();
    try {
      await studentLogin(page, st.leo, st.pin);
      await practiceHistory(page, st.topic, 10);
      const student = await resolveStudentId(supabase, st.login);
      if (!student?.id) throw new Error("student not found in DB");
      await sleep(8000);
      const db = await verifyStudentDb(supabase, student.id, sinceIso);
      row.studentId = student.id;
      row.db = db;
      row.pass =
        db.sessions > 0 &&
        db.answers > 0 &&
        db.countable >= 8 &&
        db.withParams >= 8 &&
        db.selfPracticeSessions > 0;
    } catch (e) {
      row.error = String(e.message || e);
    } finally {
      await ctx.close();
    }
    results.push(row);
  }
  return { pass: results.every((r) => r.pass), results, sinceIso };
}

async function runReportCopilotUi(browser, token, students) {
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
  const { ZERO_DATA_HISTORY_TOPIC_HE } = await import(
    pathToFileURL(join(ROOT, "utils/parent-copilot/history-scope-he.js")).href
  );

  const target =
    students.find((s) => String(s.login_username || "").toLowerCase() === "aaa11") ||
    students.find((s) => /AAA11/i.test(String(s.full_name || ""))) ||
    students[0];
  if (!target?.id) return { pass: false, reason: "no student" };

  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);

  await sleep(10_000);
  const raw = await fetchReportData(token, target.id, from, to);
  const v2 = await buildParentReportV2FromAggregate(raw, {
    studentName: target.full_name || "AAA11",
    fromDate: new Date(`${from}T00:00:00Z`),
    toDate: new Date(`${to}T23:59:59Z`),
  });
  const detailed = buildDetailedParentReportFromBaseReport(v2, { period: "month" });

  const historyTotal = Number(v2.summary?.historyQuestions ?? raw?.summary?.history?.total ?? 0);
  const subtopics = v2.historySubtopics || {};
  const subtopicWithQ = Object.values(subtopics).filter((r) => Number(r?.questions) > 0).length;

  const uiCtx = await browser.newContext({ locale: "he-IL" });
  const page = await uiCtx.newPage();
  const email = process.env.E2E_PARENT_EMAIL || "admin@admin.com";
  const password = process.env.E2E_PARENT_PASSWORD || "";
  await page.goto(`${BASE}/parent/login`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("parent-login-identifier").fill(email);
  await page.getByTestId("parent-login-secret").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/parent/, { timeout: 60_000 }).catch(() => {});
  await page.goto(
    `${BASE}/learning/parent-report?studentId=${encodeURIComponent(target.id)}&source=parent`,
    { waitUntil: "domcontentloaded", timeout: 90_000 },
  );
  await page.waitForTimeout(12_000);
  const uiText = await page.locator("body").innerText();
  await uiCtx.close();

  const uiHasHistory = uiText.includes("היסטוריה");
  const uiGeneric = uiText.includes(GENERIC_WEAKNESS_HE);

  const copilotResults = [];
  const sessionId = `history-scope-qa-${Date.now()}`;
  for (const utterance of COPILOT_PROMPTS) {
    const turn = parentCopilot.runParentCopilotTurn({
      audience: "parent",
      payload: detailed,
      utterance,
      sessionId,
    });
    const text = (turn.response?.answerBlocks || turn.answerBlocks || []).map((b) => b.textHe).join(" ");
    const mentionsWrongSubject = /אנגלית|מדעים|גאומטריה|מתמטיקה|חשבון/.test(text) && !/היסטוריה|רומא|הורדוס|מקב|אתונה|ספרטה/u.test(text);
    copilotResults.push({
      utterance,
      resolutionStatus: turn.response?.resolutionStatus || turn.resolutionStatus,
      scopeReason: turn.scopeMeta?.scopeReason || turn.response?.metadata?.scopeReason,
      fallbackUsed: turn.fallbackUsed,
      mentionsHistory: /היסטוריה|רומא|הורדוס|מקב|אתונה|ספרטה|hist_sub/i.test(text),
      zeroData: text.includes(ZERO_DATA_HISTORY_TOPIC_HE),
      mentionsWrongSubject,
      textSample: text.slice(0, 220),
    });
  }

  const copilotPass = copilotResults.every(
    (c) =>
      c.resolutionStatus === "resolved" &&
      !c.fallbackUsed &&
      !c.mentionsWrongSubject &&
      (c.mentionsHistory || c.zeroData),
  );

  return {
    pass:
      historyTotal > 0 &&
      subtopicWithQ > 0 &&
      uiHasHistory &&
      !uiGeneric &&
      copilotPass,
    historyTotal,
    subtopicWithQ,
    uiHasHistory,
    uiGeneric,
    copilotResults,
    copilotPass,
  };
}

async function main() {
  console.log("=== History Copilot Scope QA ===\n");
  const qaStart = new Date().toISOString();

  console.log(`Server ${BASE}...`);
  await ensureServer();

  const supabase = createServiceClient();
  const browser = await chromium.launch({ headless: true });

  const practice = await runFreshPractice(browser, supabase);
  section("fresh-practice-db", practice.pass, practice);

  const parentAuth = await getParentToken();
  let reportBlock = { pass: false, reason: parentAuth.reason };
  if (parentAuth.ok) {
    const students = await listStudents(parentAuth.token);
    try {
      reportBlock = await runReportCopilotUi(browser, parentAuth.token, students);
    } catch (e) {
      reportBlock = { pass: false, error: String(e.message || e) };
    }
  }
  section("report-ui-copilot", reportBlock.pass, reportBlock);

  await browser.close();

  const build = runStatic("build", "npm run build");
  section("build", build.pass, build);

  const audit = runStatic("audit-history-child-text", "node scripts/audit-history-child-text.mjs");
  section("audit-history-child-text", audit.pass, audit);

  const bookVerify = runStatic("verify-history-g6-book", "npm run verify:history-g6-book");
  section("verify-history-g6-book", bookVerify.pass, bookVerify);

  const diag = runStatic(
    "test-history-diagnostic-probe-e2e",
    "npm run test:history-diagnostic-probe-e2e",
  );
  section("test-history-diagnostic-probe-e2e", diag.pass, diag);

  report.qaStart = qaStart;
  report.finishedAt = new Date().toISOString();
  report.allPass = Object.values(report.sections).every((s) => s.pass);
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(report, null, 2));

  console.log("\n=== FINAL REPORT ===");
  for (const [k, v] of Object.entries(report.sections)) {
    console.log(`${v.pass ? "PASS" : "FAIL"}  ${k}`);
  }
  console.log(`\nOverall: ${report.allPass ? "PASS" : "FAIL"}`);
  console.log(`Report: ${join(OUT, "summary.json")}`);
  process.exit(report.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
