#!/usr/bin/env node
/**
 * History parent-assigned activity E2E + topic coverage + report + Copilot.
 * Usage: node --env-file=.env.local --env-file=.env.e2e.local tmp/history-parent-activity-qa.mjs [port]
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.HISTORY_QA_PORT || 3012);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, "tmp", "history-parent-activity-qa-report");
mkdirSync(OUT, { recursive: true });

const ACTIVITY_STUDENTS = [
  { leo: "AAA1", login: "aaa1", pin: "1234", topic: "classical_greece" },
  { leo: "AAA7", login: "aaa7", pin: "1234", topic: "rome_jews" },
  { leo: "AAA11", login: "aaa11", pin: "1234", topic: "rome_jews" },
];

const TOPIC_SMOKE = [
  { leo: "AAA7", login: "aaa7", pin: "1234", topic: "classical_greece", count: 5 },
  { leo: "AAA11", login: "aaa11", pin: "1234", topic: "rome_jews", count: 5 },
];

const COPILOT_AFTER_ACTIVITY = [
  "איך הוא ברומא והיהודים?",
  "מה כדאי לתרגל ברומא והיהודים?",
  "מה קשה לו בהיסטוריה?",
];

const MCQ_PREFIX = "science-mcq-";
const report = { startedAt: new Date().toISOString(), sections: {}, openIssues: [] };

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

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function resolveStudentId(supabase, login) {
  const { data: codes } = await supabase
    .from("student_access_codes")
    .select("student_id")
    .eq("login_username", login.toLowerCase())
    .eq("is_active", true)
    .limit(1);
  const studentId = codes?.[0]?.student_id;
  if (!studentId) return null;
  const { data: row } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("id", studentId)
    .single();
  return row;
}

async function studentLogin(page, leo, pin) {
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("student-login-username").fill(leo);
  await page.getByTestId("student-login-pin").fill(pin);
  await Promise.all([
    page.waitForURL("**/student/home**", { timeout: 90_000 }),
    page.getByTestId("student-login-submit").click(),
  ]);
}

function reportWindow() {
  const to = new Date().toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  return { from: fromDate.toISOString().slice(0, 10), to };
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
  const romeTopic = raw?.subjects?.history?.topics?.rome_jews;
  return { historyTotal, subtopicWithQ, romeTopicAnswers: Number(romeTopic?.answers || 0), from, to, raw, v2 };
}

async function createParentHistoryActivity(token, studentId, topic, title) {
  const { generateActivityQuestionSetClient } = await import(
    pathToFileURL(join(ROOT, "lib/classroom-activities/generate-activity-questions-client.js")).href
  );
  const questionSet = await generateActivityQuestionSetClient({
    subject: "history",
    gradeLevel: "g6",
    topic,
    difficulty: "easy",
    count: 10,
  });
  if (!Array.isArray(questionSet) || questionSet.length < 10) {
    throw new Error(`question set too small for ${topic}`);
  }
  const res = await fetch(`${BASE}/api/parent/activities`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      studentId,
      title,
      subject: "history",
      topic,
      gradeLevel: "g6",
      difficultyLevel: "easy",
      mode: "guided_practice",
      questionCount: 10,
      questionSet,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.activityId) {
    throw new Error(body?.error || body?.message || `create failed ${res.status}`);
  }
  return { activityId: body.activityId, questionSet, title };
}

async function clickActivitySubmit(page) {
  const submit = page.getByTestId("activity-submit-answer").first();
  await submit.waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="activity-submit-answer"]');
    return btn && !btn.disabled;
  }, { timeout: 15_000 });
  await submit.click();
}

async function playActivityInBrowser(page, activityId, questionSet, title) {
  await page.goto(`${BASE}/student/home`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByText("פעילויות אישיות", { exact: false }).first().click();
  await sleep(1500);
  const dialog = page.getByRole("dialog");
  await dialog.getByText(title, { exact: false }).waitFor({ timeout: 30_000 });

  const activityUrl = `${BASE}/student/activity/${encodeURIComponent(activityId)}`;
  await page.goto(activityUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForResponse(
    (r) =>
      r.url().includes(`/api/student/activities/${activityId}/start`) &&
      r.request().method() === "POST",
    { timeout: 120_000 }
  ).catch(() => null);
  await page.waitForSelector('[data-testid="activity-answer-choices"]', {
    state: "visible",
    timeout: 90_000,
  });

  let answered = 0;
  for (let i = 0; i < questionSet.length; i++) {
    const q = questionSet[i];
    const correct = String(q.correctAnswer ?? "").trim();
    if (!correct) throw new Error(`q${i} missing correctAnswer`);
    const choiceList = Array.isArray(q.choices) ? q.choices.map(String) : [];

    await page.waitForFunction(
      () => {
        const btns = document.querySelectorAll('[data-testid="activity-answer-choices"] button');
        return btns.length > 0 && !btns[0].disabled;
      },
      { timeout: 30_000 }
    );

    const choices = page.locator('[data-testid="activity-answer-choices"] button');
    const count = await choices.count();
    let choiceIndex = choiceList.findIndex((c) => c.trim() === correct);
    if (choiceIndex < 0) {
      choiceIndex = choiceList.findIndex(
        (c) => c.includes(correct) || correct.includes(c.trim())
      );
    }
    if (choiceIndex >= 0 && choiceIndex < count) {
      await choices.nth(choiceIndex).click();
    } else {
      let clicked = false;
      for (let c = 0; c < count; c++) {
        const text = (await choices.nth(c).innerText()).trim();
        if (text === correct || text.includes(correct) || correct.includes(text)) {
          await choices.nth(c).click();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        await choices.filter({ hasText: correct }).first().click();
      }
    }

    const answerWait = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/student/activities/${activityId}/answer`) &&
        r.request().method() === "POST",
      { timeout: 25_000 }
    );
    await clickActivitySubmit(page);
    const answerRes = await answerWait;
    if (!answerRes.ok()) throw new Error(`answer HTTP ${answerRes.status()}`);
    answered += 1;

    if (i < questionSet.length - 1) {
      await sleep(1600);
      await page.waitForFunction(
        () => {
          const btns = document.querySelectorAll('[data-testid="activity-answer-choices"] button');
          return btns.length > 0 && !btns[0].disabled;
        },
        { timeout: 25_000 }
      );
    }
  }

  const finishBtn = page.getByRole("button", { name: /סיום והגשה/ });
  await finishBtn.waitFor({ state: "visible", timeout: 30_000 });
  await finishBtn.click();
  const confirm = page.getByRole("button", { name: /כן, סיום והגשה/ });
  await confirm.waitFor({ state: "visible", timeout: 15_000 });
  await confirm.click();
  await page.waitForFunction(
    () => /הגשת|הושלם|תוצאה|ציון/u.test(document.body?.innerText || ""),
    { timeout: 60_000 }
  );

  return { answered, uiVerified: true, viaBrowser: true };
}

async function verifyActivityDb(supabase, activityId, studentId, expectedTopic) {
  const { data: status } = await supabase
    .from("parent_activity_status")
    .select("status, answers_count, correct_count")
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .maybeSingle();

  const { data: attempts } = await supabase
    .from("parent_activity_attempts")
    .select("question_index, is_correct, question_snapshot, skill_key")
    .eq("activity_id", activityId)
    .eq("student_id", studentId);

  const rows = attempts || [];
  const withParams = rows.filter((a) => {
    const snap = a.question_snapshot || {};
    const params = snap.params || {};
    return (
      (snap.subject === "history" || params.subject === "history") &&
      (params.topicKey || snap.topic) &&
      (params.subtopicKey || snap.subtopic) &&
      (params.skillId || a.skill_key || snap.skillId)
    );
  });

  const parentAssignedEvidence = rows.every((a) => {
    const snap = a.question_snapshot || {};
    const cat = String(snap.evidenceCategory || "").toLowerCase();
    return cat && !cat.includes("learning_guided");
  });

  const topicMatch = rows.filter((a) => {
    const snap = a.question_snapshot || {};
    const tk = snap.params?.topicKey || snap.topic;
    return String(tk) === expectedTopic;
  });

  return {
    status: status?.status,
    answersCount: status?.answers_count,
    correctCount: status?.correct_count,
    attempts: rows.length,
    withParams: withParams.length,
    topicMatch: topicMatch.length,
    parentAssignedEvidence,
    pass:
      status?.status === "submitted" &&
      rows.length >= 10 &&
      withParams.length >= 10 &&
      topicMatch.length >= 10 &&
      parentAssignedEvidence,
    sample: withParams.slice(0, 2).map((a) => ({
      topicKey: a.question_snapshot?.params?.topicKey,
      subtopicKey: a.question_snapshot?.params?.subtopicKey,
      skillId: a.question_snapshot?.params?.skillId,
      evidenceCategory: a.question_snapshot?.evidenceCategory,
    })),
  };
}

async function verifyParentActivityApi(token, studentId, activityId) {
  const listRes = await fetch(
    `${BASE}/api/parent/activities?studentId=${encodeURIComponent(studentId)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const list = await listRes.json();
  const row = (list.activities || []).find((a) => a.id === activityId || a.activityId === activityId);
  const detailRes = await fetch(`${BASE}/api/parent/activities/${encodeURIComponent(activityId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const detail = await detailRes.json();
  return {
    listOk: listRes.ok && row?.studentStatus === "submitted",
    detailOk: detailRes.ok && (detail?.activity?.studentStatus === "submitted" || detail?.studentStatus === "submitted"),
    studentStatus: row?.studentStatus || detail?.studentStatus,
    answersCount: row?.answersCount ?? detail?.answersCount,
    listRow: row,
  };
}

async function runStudentActivityE2E(browser, supabase, parentToken, st) {
  const row = { leo: st.leo, topic: st.topic, pass: false };
  try {
    const student = await resolveStudentId(supabase, st.login);
    if (!student?.id) throw new Error("student not found");
    row.studentId = student.id;

    const title = `[QA hist] ${st.topic} ${Date.now()}`;
    const created = await createParentHistoryActivity(parentToken, student.id, st.topic, title);
    row.activityId = created.activityId;
    row.questionCount = created.questionSet.length;

    const ctx = await browser.newContext({ locale: "he-IL" });
    const page = await ctx.newPage();
    await studentLogin(page, st.leo, st.pin);
    const play = await playActivityInBrowser(page, created.activityId, created.questionSet, title);
    row.play = play;
    await ctx.close();

    await sleep(5000);
    row.db = await verifyActivityDb(supabase, created.activityId, student.id, st.topic);
    row.parentApi = await verifyParentActivityApi(parentToken, student.id, created.activityId);

    const metricsBefore = row.reportBefore;
    const { from, to } = reportWindow();
    const raw = await fetchReportData(parentToken, student.id, from, to);
    const histBefore = Number(raw?.subjects?.history?.answers || 0);
    row.report = {
      historyAnswers: histBefore,
      topicAnswers: Number(raw?.subjects?.history?.topics?.[st.topic]?.answers || 0),
      parentEvidence: raw?.subjects?.history?.topics?.[st.topic]?.evidenceSourceCounts?.parent_assigned_activity,
    };

    row.pass =
      play.answered >= 10 &&
      play.viaBrowser === true &&
      row.db.pass &&
      row.parentApi.listOk &&
      row.parentApi.detailOk &&
      row.report.topicAnswers >= 10;
  } catch (e) {
    row.error = String(e.message || e);
  }
  return row;
}

async function probeWithLabelMatchRetry(page, mcqTestidPrefix) {
  let last = null;
  for (let i = 0; i < 8; i++) {
    const probe = await fiberProbe.probeCurrentQuestion({ page, mcqTestidPrefix });
    if (probe.ok && probe.matchedByLabels) return probe;
    last = probe;
    await page.waitForTimeout(120);
  }
  return last;
}

async function practiceHistoryCountable(page, topic, count, log = console.log) {
  await page.goto(`${BASE}/learning/history-master?topic=${topic}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await sleep(2000);
  await sessionHelpers.selectTopicRobustly({
    page,
    baseUrl: BASE,
    path: `/learning/history-master?topic=${topic}`,
    topicSelectTestid: "science-topic-select",
    playerNameTestid: "science-player-name",
    topic,
    subjectLabel: "history",
    log,
    required: true,
  });
  await sessionHelpers.selectCountablePracticeMode({ page, log, subjectLabel: "history" });
  const startButton = page.getByTestId("science-start-game");
  await startButton.waitFor({ state: "visible", timeout: 15_000 });
  const sessionStartPromise = sessionHelpers.waitForSessionStart({ page, log, subject: "history" });
  await startButton.click();
  const sessionStartResponse = await sessionStartPromise;
  await page.waitForSelector(`[data-testid^="${MCQ_PREFIX}"]`, { state: "visible", timeout: 30_000 });

  const tracker = sessionHelpers.createPracticeEvidenceTracker("history", log);
  for (let i = 0; i < count; i++) {
    const questionIndex = i + 1;
    await page.waitForFunction(
      (prefix) => {
        const btns = Array.from(document.querySelectorAll(`[data-testid^="${prefix}"]`));
        return btns.length > 0 && btns.every((b) => !b.disabled);
      },
      MCQ_PREFIX,
      { timeout: 20_000 }
    );
    const probe = await probeWithLabelMatchRetry(page, MCQ_PREFIX);
    if (!probe.ok || typeof probe.resolvedCorrectIndex !== "number") {
      throw new Error(`probe failed q${questionIndex}`);
    }
    const answerRes = await sessionHelpers.waitForAnswerSave({
      page,
      log,
      subject: "history",
      questionIndex,
      doClick: async () => {
        await sessionHelpers.clickMcqOptionRobustly({
          page,
          mcqTestid: `${MCQ_PREFIX}${probe.resolvedCorrectIndex}`,
          log,
          subjectLabel: "history",
          questionIndex,
        });
      },
    });
    tracker.recordAnswer({ sessionStartResponse, answerResponse: answerRes });
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
  const evidence = tracker.finalize({ strict: true });
  await sessionHelpers.clickStopAndConfirmSessionFinish({ page, log, subject: "history" });
  return evidence.countableAnswers;
}

async function runTopicCoverageSmoke(browser, supabase, parentToken) {
  const results = [];
  for (const st of TOPIC_SMOKE) {
    const row = { leo: st.leo, topic: st.topic, pass: false };
    try {
      const student = await resolveStudentId(supabase, st.login);
      const ctx = await browser.newContext({ locale: "he-IL" });
      const page = await ctx.newPage();
      await studentLogin(page, st.leo, st.pin);
      const countable = await practiceHistoryCountable(page, st.topic, st.count);
      await ctx.close();
      row.countable = countable;

      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      const { data: sessions } = await supabase
        .from("learning_sessions")
        .select("id, metadata")
        .eq("student_id", student.id)
        .eq("subject", "history")
        .gte("started_at", since.toISOString());
      const sessionIds = (sessions || []).map((s) => s.id);
      let dbCountable = 0;
      if (sessionIds.length) {
        const { data: answers } = await supabase
          .from("answers")
          .select("answer_payload")
          .eq("student_id", student.id)
          .in("learning_session_id", sessionIds);
        dbCountable = (answers || []).filter((a) => {
          const p = a.answer_payload || {};
          const cat = String(p.evidenceCategory || "").toLowerCase();
          const tk = p.params?.topicKey;
          return (
            p.subject === "history" &&
            tk === st.topic &&
            (cat === "diagnostic_independent" || cat === "diagnostic_guided")
          );
        }).length;
      }
      row.dbCountable = dbCountable;
      const metrics = await getHistoryReportMetrics(parentToken, student.id, student.full_name);
      row.reportTopicAnswers = Number(metrics.raw?.subjects?.history?.topics?.[st.topic]?.answers || 0);
      row.pass = countable >= st.count && dbCountable >= st.count && row.reportTopicAnswers >= st.count;
    } catch (e) {
      row.error = String(e.message || e);
    }
    results.push(row);
  }
  return { pass: results.every((r) => r.pass), results };
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
  if (reportPayload) {
    await page.route(`**/api/parent/students/${studentId}/report-data**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(reportPayload),
      });
    });
  }
  await page.goto(`${BASE}/learning/parent-report?${q.toString()}`, {
    waitUntil: "load",
    timeout: 120_000,
  });
  await page.waitForSelector('[data-testid="parent-report-parent-sections"]', {
    state: "attached",
    timeout: 120_000,
  });
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return !t.includes("מכין את דוח") && t.includes("היסטוריה");
    },
    { timeout: 60_000 }
  );
}

async function runReportUiAndCopilot(browser, parentToken, refreshToken, studentId, studentName) {
  const metrics = await getHistoryReportMetrics(parentToken, studentId, studentName);
  const { buildDetailedParentReportFromBaseReport } = await import(
    pathToFileURL(join(ROOT, "utils/detailed-parent-report.js")).href
  );
  const detailed = buildDetailedParentReportFromBaseReport(metrics.v2, { period: "month" });
  const parentCopilot = (await import(pathToFileURL(join(ROOT, "utils/parent-copilot/index.js")).href))
    .default;
  const { GENERIC_WEAKNESS_HE } = await import(
    pathToFileURL(join(ROOT, "utils/diagnostic-labels-he.js")).href
  );

  const uiCtx = await browser.newContext({ locale: "he-IL" });
  const page = await uiCtx.newPage();
  await seedParentBrowserSession(page, parentToken, refreshToken);
  await gotoLiveParentReport(page, studentId, metrics.from, metrics.to, metrics.raw);
  const uiText = await page.locator("body").innerText();
  const screenshotPath = join(OUT, "parent-report-after-activity-aaa11.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await uiCtx.close();

  const copilotResults = [];
  const sessionId = `hist-parent-act-qa-${Date.now()}`;
  for (const utterance of COPILOT_AFTER_ACTIVITY) {
    const turn = parentCopilot.runParentCopilotTurn({
      audience: "parent",
      payload: detailed,
      utterance,
      sessionId,
    });
    const text = (turn?.answerBlocks || []).map((b) => b.textHe).join(" ");
    copilotResults.push({
      utterance,
      resolutionStatus: turn?.resolutionStatus,
      mentionsRome: /רומא|rome_jews|הורדוס/u.test(text),
      mentionsHistory: /היסטוריה/u.test(text),
      zeroData: /אין עדיין מספיק נתונים/u.test(text),
      wrongSubject: /אנגלית|מדעים|גאומטריה/u.test(text) && !/היסטוריה|רומא/u.test(text),
      textSample: text.slice(0, 280),
    });
  }
  writeFileSync(join(OUT, "copilot-after-activity.json"), JSON.stringify(copilotResults, null, 2));

  const copilotPass = copilotResults.every(
    (c) =>
      c.resolutionStatus === "resolved" &&
      !c.wrongSubject &&
      (c.mentionsRome || c.mentionsHistory || c.zeroData)
  );

  return {
    pass:
      metrics.historyTotal >= 10 &&
      metrics.romeTopicAnswers >= 10 &&
      uiText.includes("היסטוריה") &&
      !uiText.includes(GENERIC_WEAKNESS_HE) &&
      copilotPass,
    metrics,
    uiHasHistory: uiText.includes("היסטוריה"),
    screenshotPath,
    copilotResults,
    copilotPass,
  };
}

async function main() {
  console.log("=== History Parent Activity E2E QA ===\n");
  await loadLibs();

  if (process.env.SKIP_QA_AUDITS !== "1") {
    section("audit-history-child-text", runStatic("audit", "node scripts/audit-history-child-text.mjs").pass);
    section("verify-history-g6-book", runStatic("book", "npm run verify:history-g6-book").pass);
    section(
      "test-history-diagnostic-probe-e2e",
      runStatic("diag", "npm run test:history-diagnostic-probe-e2e").pass
    );
  }

  for (let attempt = 1; attempt <= 30; attempt++) {
    const res = await fetch(`${BASE}/student/login`, { signal: AbortSignal.timeout(15_000) }).catch(
      () => null
    );
    if (res?.ok) break;
    if (attempt === 30) {
      throw new Error(`Server ${BASE} not reachable — start next on ${PORT}`);
    }
    await sleep(2000);
  }

  const parentAuth = await getParentToken();
  if (!parentAuth.ok) throw new Error(parentAuth.reason);

  const supabase = createServiceClient();
  const browser = await chromium.launch({ headless: true });

  const activityResults = [];
  for (const st of ACTIVITY_STUDENTS) {
    console.log(`Activity E2E: ${st.leo} / ${st.topic}...`);
    const r = await runStudentActivityE2E(browser, supabase, parentAuth.token, st);
    activityResults.push(r);
    console.log(`  → pass=${r.pass} answered=${r.play?.answered} db=${r.db?.attempts}`);
  }
  section("parent-activity-e2e", activityResults.every((r) => r.pass), { results: activityResults });
  writeFileSync(join(OUT, "activity-results.json"), JSON.stringify(activityResults, null, 2));

  const aaa11 = await resolveStudentId(supabase, "aaa11");
  if (process.env.SKIP_REPORT_UI !== "1") {
    const reportUi = await runReportUiAndCopilot(
      browser,
      parentAuth.token,
      parentAuth.refreshToken,
      aaa11.id,
      aaa11.full_name
    );
    section("report-ui-after-activity", reportUi.pass, {
      metrics: reportUi.metrics,
      uiHasHistory: reportUi.uiHasHistory,
      copilotPass: reportUi.copilotPass,
      screenshotPath: reportUi.screenshotPath,
    });
  }

  const topicSmoke =
    process.env.SKIP_TOPIC_SMOKE === "1" || TOPIC_SMOKE.length === 0
      ? { pass: true, skipped: true, results: [] }
      : await runTopicCoverageSmoke(browser, supabase, parentAuth.token);
  section("topic-coverage-smoke", topicSmoke.pass, topicSmoke);

  await browser.close();

  const build = process.env.SKIP_FINAL_BUILD === "1"
    ? { pass: true, skipped: true, note: "build ran before QA" }
    : runStatic("build", "npm run build");
  section("build", build.pass, build);

  report.finishedAt = new Date().toISOString();
  report.allPass = Object.values(report.sections).every((s) => s.pass);
  writeFileSync(join(OUT, "summary.json"), JSON.stringify(report, null, 2));

  console.log("\n=== FINAL REPORT ===");
  for (const [k, v] of Object.entries(report.sections)) {
    console.log(`${v.pass ? "PASS" : "FAIL"}  ${k}`);
  }
  console.log(`\nOverall: ${report.allPass ? "PASS" : "FAIL"}`);
  console.log(`Artifacts: ${OUT}`);
  process.exit(report.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
