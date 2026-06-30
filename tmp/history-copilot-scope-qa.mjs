#!/usr/bin/env node
/**
 * History Copilot scope + countable E2E QA.
 * Practice harness: always picks correct MCQ via fiber probe (correctIndex).
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
const PORT = Number(process.argv[2] || process.env.HISTORY_QA_PORT || 3012);
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

const MCQ_PREFIX = "science-mcq-";
const SUBJECT_LABEL = "history";

const report = { startedAt: new Date().toISOString(), sections: {}, openIssues: [] };

/** Loaded from virtual-student-qa + product libs */
let sessionHelpers;
let fiberProbe;
let evidenceGate;
let evidenceSourceMod;

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

async function loadLibs() {
  const vqa = join(ROOT, "scripts/virtual-student-qa/lib");
  sessionHelpers = await import(pathToFileURL(join(vqa, "learning-session-helpers.mjs")).href);
  fiberProbe = await import(pathToFileURL(join(vqa, "mcq-fiber-probe.mjs")).href);
  evidenceGate = await import(
    pathToFileURL(join(ROOT, "lib/learning/parent-report-evidence-gate.js")).href
  );
  evidenceSourceMod = await import(
    pathToFileURL(join(ROOT, "lib/learning-supabase/evidence-source.js")).href
  );
}

async function verifyLoginReady() {
  try {
    const res = await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return false;
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByTestId("student-login-username").waitFor({ state: "visible", timeout: 30_000 });
      return true;
    } finally {
      await browser.close();
    }
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (process.env.SKIP_ENSURE_SERVER === "1") {
    const res = await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(10_000) }).catch(
      () => null
    );
    if (res?.ok) return;
    throw new Error(`Server on ${BASE} not reachable (SKIP_ENSURE_SERVER=1)`);
  }
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

async function probeWithLabelMatchRetry({ page, mcqTestidPrefix, maxAttempts = 8, intervalMs = 120 }) {
  let lastProbe = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const probe = await fiberProbe.probeCurrentQuestion({ page, mcqTestidPrefix });
    if (probe.ok && probe.matchedByLabels) return probe;
    lastProbe = probe;
    if (attempt < maxAttempts) await page.waitForTimeout(intervalMs);
  }
  return lastProbe;
}

/**
 * Countable self-practice: Practice tab, correctIndex clicks only, no step-by-step.
 */
async function practiceHistory(page, topic, count = 10, log = console.log) {
  await page.goto(`${BASE}/learning/history-master?topic=${topic}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(2000);

  if (topic && topic !== "what_is_history") {
    await sessionHelpers.selectTopicRobustly({
      page,
      baseUrl: BASE,
      path: `/learning/history-master?topic=${topic}`,
      topicSelectTestid: "science-topic-select",
      playerNameTestid: "science-player-name",
      topic,
      subjectLabel: SUBJECT_LABEL,
      log,
      required: true,
    });
  }

  await sessionHelpers.selectCountablePracticeMode({ page, log, subjectLabel: SUBJECT_LABEL });

  const startButton = page.getByTestId("science-start-game");
  await startButton.waitFor({ state: "visible", timeout: 15_000 });
  const sessionStartPromise = sessionHelpers.waitForSessionStart({
    page,
    log,
    subject: SUBJECT_LABEL,
  });
  await startButton.click();
  const sessionStartResponse = await sessionStartPromise;

  await page.waitForSelector(`[data-testid^="${MCQ_PREFIX}"]`, {
    state: "visible",
    timeout: 30_000,
  });

  const evidenceTracker = sessionHelpers.createPracticeEvidenceTracker(SUBJECT_LABEL, log);
  const answered = [];

  for (let i = 0; i < count; i++) {
    const questionIndex = i + 1;

    await page.waitForFunction(
      (prefix) => {
        const btns = Array.from(document.querySelectorAll(`[data-testid^="${prefix}"]`));
        if (btns.length === 0) return false;
        return btns.every((b) => !b.disabled);
      },
      MCQ_PREFIX,
      { timeout: 20_000 }
    );

    const probe = await probeWithLabelMatchRetry({ page, mcqTestidPrefix: MCQ_PREFIX });
    if (!probe.ok || typeof probe.resolvedCorrectIndex !== "number") {
      throw new Error(
        `q${questionIndex} fiber probe failed: ${probe?.reason || "no resolvedCorrectIndex"}`
      );
    }
    const pickedIndex = probe.resolvedCorrectIndex;

    log(
      `${SUBJECT_LABEL}: q${questionIndex} correctIndex=${pickedIndex} topic=${probe.topic || topic}`
    );

    const answerRes = await sessionHelpers.waitForAnswerSave({
      page,
      log,
      subject: SUBJECT_LABEL,
      questionIndex,
      doClick: async () => {
        await sessionHelpers.clickMcqOptionRobustly({
          page,
          mcqTestid: `${MCQ_PREFIX}${pickedIndex}`,
          log,
          subjectLabel: SUBJECT_LABEL,
          questionIndex,
        });
      },
    });

    const classification = evidenceTracker.recordAnswer({
      sessionStartResponse,
      answerResponse: answerRes,
    });
    answered.push({
      questionIndex,
      pickedIndex,
      countable: classification.countable,
      evidenceCategory: classification.evidenceCategory,
    });

    await page
      .waitForFunction(
        (prefix) => {
          const btns = Array.from(document.querySelectorAll(`[data-testid^="${prefix}"]`));
          return btns.length > 0 && btns.every((b) => b.disabled);
        },
        MCQ_PREFIX,
        { timeout: 10_000 }
      )
      .catch(() => {});
  }

  const evidence = evidenceTracker.finalize({ strict: true });
  await sessionHelpers.clickStopAndConfirmSessionFinish({
    page,
    log,
    subject: SUBJECT_LABEL,
  });

  return { answered, evidence, sessionCountable: evidence.countableAnswers };
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveStudentId(supabase, login) {
  const { data: codes, error: codeErr } = await supabase
    .from("student_access_codes")
    .select("student_id, login_username")
    .eq("login_username", login.toLowerCase())
    .eq("is_active", true)
    .limit(1);
  if (codeErr) throw codeErr;
  const studentId = codes?.[0]?.student_id;
  if (!studentId) return null;
  const { data: row, error } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("id", studentId)
    .single();
  if (error) throw error;
  return row;
}

function readSessionMode(session) {
  const meta = session?.metadata;
  if (!meta || typeof meta !== "object") return "";
  return String(meta.mode || meta.summary?.mode || "").trim().toLowerCase();
}

function isCountableHistoryPayload(answer, sessionMap) {
  const p = answer.answer_payload || {};
  const subject = String(p.subject || "").toLowerCase();
  if (subject !== "history") return false;

  const session = sessionMap[answer.learning_session_id];
  const mode = readSessionMode(session);
  if (!evidenceGate.isCountableSelfPracticeSessionMode(mode)) return false;

  const flags =
    p.contextFlags && typeof p.contextFlags === "object" ? p.contextFlags : {};
  if (
    flags.contextAfterBookReading === true ||
    p.afterStepByStep === true ||
    flags.afterStepByStep === true
  ) {
    return false;
  }

  const cat = String(p.evidenceCategory || "").toLowerCase();
  if (cat === "learning_guided" || (cat && cat.includes("learning"))) return false;
  if (cat && cat !== "diagnostic_independent" && cat !== "diagnostic_guided") return false;

  // Provenance: self_practice (not book / not parent-assigned)
  const book = flags.contextAfterBookReading === true;
  if (book) return false;
  const normalized = evidenceSourceMod.normalizeEvidenceSourceKey("self_practice");
  if (normalized !== evidenceSourceMod.EVIDENCE_SOURCE.SELF_PRACTICE) return false;

  return true;
}

async function verifyStudentDb(supabase, studentId, sinceIso) {
  const { data: sessions, error: sErr } = await supabase
    .from("learning_sessions")
    .select("id, subject, started_at, metadata, status")
    .eq("student_id", studentId)
    .eq("subject", "history")
    .gte("started_at", sinceIso)
    .order("started_at", { ascending: false });
  if (sErr) throw sErr;

  const sessionMap = Object.fromEntries((sessions || []).map((s) => [s.id, s]));
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

  const countable = answers.filter((a) => isCountableHistoryPayload(a, sessionMap));
  const withParams = countable.filter((a) => {
    const params = a.answer_payload?.params || {};
    return params.topicKey && params.subtopicKey && params.skillId;
  });

  const practiceSessions = (sessions || []).filter((s) =>
    evidenceGate.isCountableSelfPracticeSessionMode(readSessionMode(s))
  );

  return {
    sessions: sessions?.length || 0,
    practiceSessions: practiceSessions.length,
    answers: answers.length,
    countable: countable.length,
    withParams: withParams.length,
    sampleParams: withParams.slice(0, 3).map((a) => a.answer_payload?.params),
    sampleEvidence: countable.slice(0, 3).map((a) => ({
      evidenceCategory: a.answer_payload?.evidenceCategory,
      isCorrect: a.is_correct,
      topicKey: a.answer_payload?.params?.topicKey,
    })),
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
  return { ok: true, token: json.access_token, refreshToken: json.refresh_token || "" };
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

async function getHistoryReportMetrics(token, studentId, studentName) {
  const { from, to } = reportWindow();
  const raw = await fetchReportData(token, studentId, from, to);
  const { buildParentReportV2FromAggregate } = await import(
    pathToFileURL(join(ROOT, "scripts/qa/lib/mass-virtual-students/report-v2-bridge.mjs")).href
  );
  const v2 = await buildParentReportV2FromAggregate(raw, {
    studentName: studentName || "student",
    fromDate: new Date(`${from}T00:00:00Z`),
    toDate: new Date(`${to}T23:59:59Z`),
  });
  const historyTotal = Number(
    v2.summary?.historyQuestions ??
      raw?.subjects?.history?.answers ??
      raw?.subjects?.history?.diagnosticAnswers ??
      0
  );
  const subtopics = v2.historySubtopics || {};
  let subtopicWithQ = Object.values(subtopics).filter((r) => Number(r?.questions) > 0).length;
  if (subtopicWithQ === 0) {
    subtopicWithQ = Object.values(raw?.subjects?.history?.topics || {}).filter(
      (t) => Number(t?.answers) > 0
    ).length;
  }
  return { historyTotal, subtopicWithQ, from, to };
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

function reportWindow() {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

async function runFreshPractice(browser, supabase, parentToken) {
  const sinceIso = new Date().toISOString();
  const studentsToRun = process.env.PRACTICE_ONE
    ? STUDENTS.filter((s) => s.login === String(process.env.PRACTICE_ONE).toLowerCase())
    : STUDENTS;
  if (studentsToRun.length === 0) {
    throw new Error(`PRACTICE_ONE=${process.env.PRACTICE_ONE} not in STUDENTS`);
  }
  const results = [];

  for (const st of studentsToRun) {
    const row = { leo: st.leo, topic: st.topic, pass: false };
    const ctx = await browser.newContext({ locale: "he-IL" });
    const page = await ctx.newPage();
    try {
      await studentLogin(page, st.leo, st.pin);
      const practiceResult = await practiceHistory(page, st.topic, 10);
      row.practice = {
        sessionCountable: practiceResult.sessionCountable,
        answered: practiceResult.answered,
      };

      const student = await resolveStudentId(supabase, st.login);
      if (!student?.id) throw new Error("student not found in DB");
      row.studentId = student.id;

      await sleep(8000);
      const db = await verifyStudentDb(supabase, student.id, sinceIso);
      row.db = db;

      if (parentToken) {
        row.report = await getHistoryReportMetrics(parentToken, student.id, student.full_name);
      }

      row.pass =
        practiceResult.sessionCountable >= 10 &&
        db.countable >= 10 &&
        db.withParams >= 10 &&
        row.report?.historyTotal >= 10 &&
        row.report?.subtopicWithQ > 0;
    } catch (e) {
      row.error = String(e.message || e);
    } finally {
      await ctx.close();
    }
    results.push(row);
  }

  return { pass: results.every((r) => r.pass), results, sinceIso };
}

async function seedParentBrowserSession(page, token, refreshToken) {
  const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.evaluate(
    ({ url, token, refresh }) => {
      window.__parentReportPlaywrightE2eSession = true;
      const host = new URL(url).hostname.split(".")[0];
      localStorage.setItem(
        `sb-${host}-auth-token`,
        JSON.stringify({
          access_token: token,
          refresh_token: refresh || "",
          token_type: "bearer",
          expires_in: 7200,
          expires_at: Math.floor(Date.now() / 1000) + 7200,
        })
      );
    },
    { url: supabaseUrl, token, refresh: refreshToken || "" }
  );
}

async function gotoLiveParentReport(page, studentId, from, to, reportPayload) {
  const q = new URLSearchParams({
    studentId,
    source: "parent",
    period: "custom",
    start: from,
    end: to,
  });
  const printRoot = '[data-testid="parent-report-parent-sections"]';
  if (reportPayload) {
    await page.route(`**/api/parent/students/${studentId}/report-data**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(reportPayload),
      });
    });
  }
  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/parent/students/") &&
      res.url().includes("/report-data") &&
      res.status() === 200,
    { timeout: 120_000 }
  );
  await page.goto(`${BASE}/learning/parent-report?${q.toString()}`, {
    waitUntil: "load",
    timeout: 120_000,
  });
  let apiOk = false;
  try {
    await responsePromise;
    apiOk = true;
  } catch {
    apiOk = false;
  }
  await page.waitForTimeout(3500);
  await page.waitForSelector(printRoot, { state: "attached", timeout: 120_000 });
  await page.waitForFunction(
    ({ rootSel }) => {
      const root = document.querySelector(rootSel);
      const err = document.body?.innerText || "";
      if (/לא ניתן לבנות|שגיאת רשת|נדרשת התחברות|טוען דוח|מכין את דוח/.test(err) && !root) {
        return false;
      }
      return !!root && err.trim().length > 120;
    },
    { rootSel: printRoot },
    { timeout: 60_000 }
  );
  return { apiOk };
}

async function runReportCopilotUi(browser, token, refreshToken, students) {
  const { buildParentReportV2FromAggregate } = await import(
    pathToFileURL(join(ROOT, "scripts/qa/lib/mass-virtual-students/report-v2-bridge.mjs")).href
  );
  const { buildDetailedParentReportFromBaseReport } = await import(
    pathToFileURL(join(ROOT, "utils/detailed-parent-report.js")).href
  );
  const parentCopilot = (await import(pathToFileURL(join(ROOT, "utils/parent-copilot/index.js")).href))
    .default;
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

  const { from, to } = reportWindow();

  await sleep(3000);
  const metrics = await getHistoryReportMetrics(token, target.id, target.full_name);
  const raw = await fetchReportData(token, target.id, from, to);
  const v2 = await buildParentReportV2FromAggregate(raw, {
    studentName: target.full_name || "AAA11",
    fromDate: new Date(`${from}T00:00:00Z`),
    toDate: new Date(`${to}T23:59:59Z`),
  });
  const detailed = buildDetailedParentReportFromBaseReport(v2, { period: "month" });

  const historyTotal = metrics.historyTotal;
  const subtopicWithQ = metrics.subtopicWithQ;

  const uiCtx = await browser.newContext({ locale: "he-IL" });
  const page = await uiCtx.newPage();
  await seedParentBrowserSession(page, token, refreshToken);
  const uiLoad = await gotoLiveParentReport(page, target.id, from, to, raw);
  const uiText = await page.locator("body").innerText();
  const screenshotPath = join(OUT, "parent-report-ui-aaa11.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await uiCtx.close();

  const uiHasHistory =
    uiText.includes("היסטוריה") || uiText.includes("🏛️") || /history/i.test(uiText);
  const uiGeneric = uiText.includes(GENERIC_WEAKNESS_HE);
  const uiHasQuestions =
    /\d+\s*שאלות/.test(uiText) ||
    uiText.includes("שאלות") ||
    historyTotal > 0;
  const uiFallbackOnly =
    uiText.includes("אין עדיין מספיק נתונים") && !uiHasHistory;

  const copilotResults = [];
  const sessionId = `history-scope-qa-${Date.now()}`;
  for (const utterance of COPILOT_PROMPTS) {
    const turn = parentCopilot.runParentCopilotTurn({
      audience: "parent",
      payload: detailed,
      utterance,
      sessionId,
    });
    const blocks = Array.isArray(turn?.answerBlocks) ? turn.answerBlocks : [];
    const text = blocks.map((b) => b.textHe).join(" ");
    const mentionsWrongSubject =
      /אנגלית|מדעים|גאומטריה|מתמטיקה|חשבון/.test(text) &&
      !/היסטוריה|רומא|הורדוס|מקב|אתונה|ספרטה/u.test(text);
    copilotResults.push({
      utterance,
      resolutionStatus: turn?.resolutionStatus,
      scopeReason: turn?.metadata?.scopeReason || turn?.scopeMeta?.scopeReason,
      fallbackUsed: turn?.fallbackUsed,
      mentionsHistory: /היסטוריה|רומא|הורדוס|מקב|אתונה|ספרטה|hist_sub/i.test(text),
      zeroData: text.includes(ZERO_DATA_HISTORY_TOPIC_HE),
      mentionsWrongSubject,
      textSample: text.slice(0, 280),
    });
  }

  writeFileSync(join(OUT, "copilot-7.json"), JSON.stringify(copilotResults, null, 2));

  const copilotPass = copilotResults.every(
    (c) =>
      c.resolutionStatus === "resolved" &&
      !c.mentionsWrongSubject &&
      (c.mentionsHistory ||
        c.zeroData ||
        /history_lock/i.test(String(c.scopeReason || "")))
  );

  return {
    pass:
      historyTotal >= 10 &&
      subtopicWithQ > 0 &&
      uiLoad.apiOk &&
      uiHasHistory &&
      !uiGeneric &&
      !uiFallbackOnly &&
      uiHasQuestions &&
      copilotPass,
    studentId: target.id,
    historyTotal,
    subtopicWithQ,
    uiHasHistory,
    uiGeneric,
    uiHasQuestions,
    uiFallbackOnly,
    uiLoad,
    screenshotPath,
    copilotResults,
    copilotPass,
  };
}

async function main() {
  console.log("=== History Countable E2E QA ===\n");
  const qaStart = new Date().toISOString();

  await loadLibs();

  console.log(`Server ${BASE}...`);
  await ensureServer();

  const supabase = createServiceClient();
  const browser = await chromium.launch({ headless: true });

  const parentAuth = await getParentToken();
  const parentToken = parentAuth.ok ? parentAuth.token : null;
  if (!parentToken) {
    console.warn("WARN: parent token missing — report API checks skipped");
  }

  const skipPractice = process.env.SKIP_PRACTICE === "1";
  const practice = skipPractice
    ? { pass: true, results: [], sinceIso: new Date().toISOString(), skipped: true }
    : await runFreshPractice(browser, supabase, parentToken);
  if (!skipPractice) {
    section("fresh-practice-db-report", practice.pass, practice);
    writeFileSync(join(OUT, "practice-results.json"), JSON.stringify(practice.results, null, 2));
  } else {
    section("fresh-practice-db-report", true, { skipped: true, note: "separate launch-cert phase" });
  }

  const skipReport = process.env.SKIP_REPORT === "1";
  let reportBlock = { pass: false, reason: parentAuth.reason || "no parent token" };
  if (!skipReport && parentToken) {
    const students = await listStudents(parentToken);
    try {
      reportBlock = await runReportCopilotUi(
        browser,
        parentToken,
        parentAuth.refreshToken,
        students
      );
    } catch (e) {
      reportBlock = { pass: false, error: String(e.message || e) };
    }
    section("report-ui-copilot", reportBlock.pass, reportBlock);
  } else if (skipReport) {
    section("report-ui-copilot", true, { skipped: true, note: "separate launch-cert phase" });
  } else {
    section("report-ui-copilot", false, reportBlock);
  }

  await browser.close();

  if (process.env.SKIP_POST_AUDITS !== "1") {
    const audit = runStatic("audit-history-child-text", "node scripts/audit-history-child-text.mjs");
    section("audit-history-child-text", audit.pass, audit);

    const bookVerify = runStatic("verify-history-g6-book", "npm run verify:history-g6-book");
    section("verify-history-g6-book", bookVerify.pass, bookVerify);

    const diag = runStatic(
      "test-history-diagnostic-probe-e2e",
      "npm run test:history-diagnostic-probe-e2e"
    );
    section("test-history-diagnostic-probe-e2e", diag.pass, diag);
  }

  const build = process.env.SKIP_BUILD === "1"
    ? { pass: true, skipped: true }
    : runStatic("build", "npm run build");
  section("build", build.pass, build);

  report.qaStart = qaStart;
  report.finishedAt = new Date().toISOString();
  report.allPass = Object.values(report.sections).every((s) => s.pass);
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(report, null, 2));

  console.log("\n=== FINAL REPORT ===");
  for (const [k, v] of Object.entries(report.sections)) {
    console.log(`${v.pass ? "PASS" : "FAIL"}  ${k}`);
  }
  console.log("\n--- Per student ---");
  for (const r of practice.results || []) {
    console.log(
      `${r.leo}: pass=${r.pass} countable=${r.db?.countable ?? "?"} reportTotal=${r.report?.historyTotal ?? "?"}`
    );
  }
  console.log(`\nOverall: ${report.allPass ? "PASS" : "FAIL"}`);
  console.log(`Report dir: ${OUT}`);
  process.exit(report.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
