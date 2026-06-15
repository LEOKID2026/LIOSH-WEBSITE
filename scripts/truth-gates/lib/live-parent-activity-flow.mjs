import { chromium } from "playwright";
import {
  assertNoParentActivitySeparateLabel,
  assertReportSurfaceParity,
  extractApiReportSnapshot,
  extractUiLikeSnapshot,
  extractUiSummaryFromPage,
} from "./report-field-extract.mjs";
import { extractPdfTextFromBuffer } from "../../lib/parent-report-pdf-output-verify.mjs";
import {
  defaultReportRange,
  fetchLiveReportData,
  getServiceSupabase,
  resolveParentBearer,
  resolveTruthGateStudent,
} from "./live-parent-report.mjs";
import { baseUrl, loadEnvFiles } from "./env.mjs";
import { buildStudentHomeView } from "../../../lib/learning-client/studentHomeDashboardClient.js";

loadEnvFiles();

const FORBIDDEN_PARENT_ACTIVITY_COPY = [
  /פעילות\s*מהורה/u,
  /פעילות\s*אישית\s*מהורה/u,
  /נשלח\s*מההורה/u,
  /בפעילות\s*שנשלחה\s*מההורה/u,
];

function fail(message) {
  throw new Error(message);
}

export function cleanOrigin() {
  return baseUrl().replace(/\/$/, "");
}

export function sampleQuestionSet(count, subject = "math", topic = "addition", gradeLevel = "g3") {
  return Array.from({ length: count }, (_, index) => {
    const left = index + 2;
    const right = 3;
    const answer = String(left + right);
    return {
      qk: `phase9-live-${Date.now()}-${index}`,
      question: `${left} + ${right} = __`,
      correctAnswer: answer,
      choices: [answer, String(left + right + 1), String(left + right + 2)],
      subject,
      topic,
      gradeLevel,
      difficulty: "easy",
      explanation: "בדיקת live truth gate.",
    };
  });
}

async function jsonFetch(url, options = {}) {
  const {
    step = "fetch",
    retryOnNetworkError = false,
    acceptAlreadyAnswered = false,
    ...fetchOptions
  } = options;
  let res;
  try {
    res = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
    });
  } catch (err) {
    if (retryOnNetworkError) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        res = await fetch(url, {
          ...fetchOptions,
          headers: {
            "Content-Type": "application/json",
            ...(fetchOptions.headers || {}),
          },
        });
      } catch (retryErr) {
        const code = retryErr?.cause?.code || retryErr?.code || err?.cause?.code || err?.code || "";
        throw new Error(
          `fetch failed at step=${step}; url=${url}; error=${retryErr?.message || String(retryErr)}${code ? `; code=${code}` : ""}; retry=true`
        );
      }
    } else {
      const code = err?.cause?.code || err?.code || "";
      throw new Error(
        `fetch failed at step=${step}; url=${url}; error=${err?.message || String(err)}${code ? `; code=${code}` : ""}`
      );
    }
  }
  const body = await res.json().catch(() => ({}));
  if (
    acceptAlreadyAnswered &&
    res.status === 409 &&
    String(body?.error || body?.code || "") === "question_already_answered"
  ) {
    return {
      status: res.status,
      ok: true,
      body: { ok: true, alreadyAnswered: true, originalStatus: 409 },
      headers: res.headers,
    };
  }
  return { status: res.status, ok: res.ok && body?.ok !== false, body, headers: res.headers };
}

export async function loginStudent(origin) {
  const pin = String(process.env.E2E_STUDENT_PIN || "").replace(/\D/g, "").trim();
  const username = String(process.env.E2E_STUDENT_USERNAME || "").trim();
  const code = String(process.env.E2E_STUDENT_CODE || "").trim();
  if (!pin || pin.length !== 4 || (!username && !code)) {
    fail("missing E2E_STUDENT_USERNAME/E2E_STUDENT_CODE + E2E_STUDENT_PIN");
  }
  const body = code ? { code, pin } : { username, pin };
  const res = await jsonFetch(`${origin}/api/student/login`, {
    step: "student login",
    method: "POST",
    headers: { Origin: origin, Referer: `${origin}/student/login` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401) {
      fail(`CONFIG_BLOCKED: student login returned 401 for E2E_STUDENT_USERNAME=${username || "(code)"}; credentials rejected`);
    }
    if (res.status === 429) {
      fail("CONFIG_BLOCKED: student login returned 429; wait for or clear login rate limit");
    }
    fail(`student login failed HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 240)}`);
  }
  const setCookie = String(res.headers.get("set-cookie") || "");
  const match = setCookie.match(/liosh_student_session=([^;]+)/);
  if (!match) fail("student login did not set liosh_student_session cookie");
  return {
    cookie: `liosh_student_session=${decodeURIComponent(match[1])}`,
    student: res.body.student,
    credentialLabel: username || "E2E_STUDENT_CODE",
  };
}

export async function getCoinBalance(supabase, studentId) {
  let data;
  let error;
  try {
    ({ data, error } = await supabase
      .from("student_coin_balances")
      .select("balance")
      .eq("student_id", studentId)
      .maybeSingle());
  } catch (err) {
    throw new Error(`fetch failed at step=coin balance DB lookup; table=student_coin_balances; error=${err?.message || String(err)}`);
  }
  if (error) return null;
  return Number(data?.balance ?? 0);
}

export async function getCoinTxCount(supabase, studentId, idempotencyKey) {
  let count;
  let error;
  try {
    ({ count, error } = await supabase
      .from("coin_transactions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("idempotency_key", idempotencyKey));
  } catch (err) {
    throw new Error(`fetch failed at step=coin transaction DB lookup; table=coin_transactions; error=${err?.message || String(err)}`);
  }
  if (error) return null;
  return Number(count || 0);
}

export async function getHomeProfile(origin, cookie) {
  const res = await jsonFetch(`${origin}/api/student/home-profile`, {
    step: "dashboard home-profile",
    method: "GET",
    headers: { Cookie: cookie },
  });
  if (!res.ok) fail(`home-profile failed HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 240)}`);
  return res.body;
}

export async function getStudentMe(origin, cookie) {
  const res = await jsonFetch(`${origin}/api/student/me`, {
    step: "student me",
    method: "GET",
    headers: { Cookie: cookie },
  });
  if (!res.ok) return null;
  return res.body?.student || res.body || null;
}

export async function createParentActivity(origin, bearer, student, overrides = {}) {
  const subject = overrides.subject || "math";
  const topic = overrides.topic || "addition";
  const questionCount = overrides.questionCount || 3;
  const questionSet = overrides.questionSet || sampleQuestionSet(questionCount, subject, topic, student.gradeLevel || "g3");
  const res = await jsonFetch(`${origin}/api/parent/activities`, {
    step: "create parent activity",
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}`, Origin: origin },
    body: JSON.stringify({
      title: overrides.title || `[Phase9 live] ${new Date().toISOString()}`,
      studentId: student.id,
      subject,
      topic,
      mode: overrides.mode || "guided_practice",
      difficultyLevel: "easy",
      gradeLevel: student.gradeLevel || "g3",
      questionCount,
      questionSet,
    }),
  });
  if (!res.ok) fail(`parent activity create failed HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`);
  return { activityId: res.body.activityId, questionSet, subject, topic };
}

export async function startAnswerSubmitActivity(origin, cookie, activityId, questionSet, options = {}) {
  const answerCount = options.answerCount ?? Math.min(2, questionSet.length);
  const start = await jsonFetch(`${origin}/api/student/activities/${activityId}/start`, {
    step: "start activity",
    method: "POST",
    headers: { Cookie: cookie, Origin: origin },
    body: "{}",
  });
  if (!start.ok) fail(`student activity start failed HTTP ${start.status}: ${JSON.stringify(start.body).slice(0, 240)}`);

  const answers = [];
  for (let i = 0; i < answerCount; i += 1) {
    const q = questionSet[i];
    const correct = String(q.correctAnswer);
    const wrong = (q.choices || []).find((c) => String(c) !== correct) || `${correct}-wrong`;
    const selectedAnswer = i === 0 ? correct : String(wrong);
    const ans = await jsonFetch(`${origin}/api/student/activities/${activityId}/answer`, {
      step: `answer activity ${i}`,
      retryOnNetworkError: true,
      acceptAlreadyAnswered: true,
      method: "POST",
      headers: { Cookie: cookie, Origin: origin },
      body: JSON.stringify({
        questionIndex: i,
        selectedAnswer,
        rawTimeSpentMs: 120_000,
        creditedTimeMs: 120_000,
        timingStatus: "phase9_live_gate",
      }),
    });
    if (!ans.ok) fail(`student answer ${i} failed HTTP ${ans.status}: ${JSON.stringify(ans.body).slice(0, 240)}`);
    answers.push(ans.body);
  }

  const submit = await jsonFetch(`${origin}/api/student/activities/${activityId}/submit`, {
    step: "submit activity",
    method: "POST",
    headers: { Cookie: cookie, Origin: origin },
    body: "{}",
  });
  if (!submit.ok) fail(`student submit failed HTTP ${submit.status}: ${JSON.stringify(submit.body).slice(0, 240)}`);
  const retry = await jsonFetch(`${origin}/api/student/activities/${activityId}/submit`, {
    step: "submit activity retry",
    method: "POST",
    headers: { Cookie: cookie, Origin: origin },
    body: "{}",
  });
  if (!retry.ok) fail(`student submit retry failed HTTP ${retry.status}: ${JSON.stringify(retry.body).slice(0, 240)}`);
  return { start: start.body, answers, submit: submit.body, retry: retry.body, answerCount };
}

export async function buildLiveActivityScenario(options = {}) {
  const origin = cleanOrigin();
  const supabase = getServiceSupabase();
  if (!supabase) fail("missing live Supabase service role env");
  const auth = await resolveParentBearer(origin);
  if (!auth.token) fail(auth.reason || "parent auth failed");
  const student = await resolveTruthGateStudent(supabase, auth.userId, {
    origin,
    bearer: auth.token,
    studentUsername: process.env.E2E_STUDENT_USERNAME,
  });
  if (!student?.id) fail("could not resolve parent-linked truth gate student");
  const studentLogin = await loginStudent(origin);
  if (studentLogin.student?.id && studentLogin.student.id !== student.id) {
    fail(`student login id ${studentLogin.student.id} does not match parent-linked student ${student.id}`);
  }
  const range = defaultReportRange(7);
  const baselineReport = await fetchLiveReportData(origin, student.id, auth.token, range);
  if (!baselineReport.ok) fail(`baseline report-data failed HTTP ${baselineReport.status}`);
  const baselineHome = await getHomeProfile(origin, studentLogin.cookie);
  const baselineMe = await getStudentMe(origin, studentLogin.cookie);
  const baselineCoins = await getCoinBalance(supabase, student.id);

  const notStarted = await createParentActivity(origin, auth.token, student, {
    title: `[Phase9 live not-started] ${new Date().toISOString()}`,
    questionCount: 1,
    questionSet: sampleQuestionSet(1),
  });

  const created = await createParentActivity(origin, auth.token, student, options);
  const coinKey = `coin_parent_activity_${created.activityId}`;
  const beforeCoinTxCount = await getCoinTxCount(supabase, student.id, coinKey);
  const activityRun = await startAnswerSubmitActivity(origin, studentLogin.cookie, created.activityId, created.questionSet, {
    answerCount: options.answerCount ?? 2,
  });
  const afterReport = await fetchLiveReportData(origin, student.id, auth.token, range);
  if (!afterReport.ok) fail(`after report-data failed HTTP ${afterReport.status}`);
  const afterHome = await getHomeProfile(origin, studentLogin.cookie);
  const afterMe = await getStudentMe(origin, studentLogin.cookie);
  const afterCoins = await getCoinBalance(supabase, student.id);
  const afterCoinTxCount = await getCoinTxCount(supabase, student.id, coinKey);

  let attempts;
  let attemptsError;
  try {
    ({ data: attempts, error: attemptsError } = await supabase
      .from("parent_activity_attempts")
      .select("id, is_correct, question_index, question_snapshot, time_spent_ms")
      .eq("activity_id", created.activityId)
      .eq("student_id", student.id));
  } catch (err) {
    throw new Error(`fetch failed at step=attempts DB lookup; table=parent_activity_attempts; error=${err?.message || String(err)}`);
  }
  if (attemptsError) fail(`attempts lookup failed: ${attemptsError.message}`);

  return {
    origin,
    supabase,
    auth,
    student,
    studentLogin,
    range,
    baselineReport: baselineReport.body,
    afterReport: afterReport.body,
    baselineHome,
    afterHome,
    baselineMe,
    afterMe,
    baselineCoins,
    afterCoins,
    beforeCoinTxCount,
    afterCoinTxCount,
    coinKey,
    notStarted,
    created,
    activityRun,
    attempts: attempts || [],
  };
}

export function assertActivityIncludedInReport(scenario) {
  const subject = scenario.created.subject;
  const beforeSummary = scenario.baselineReport.summary || {};
  const afterSummary = scenario.afterReport.summary || {};
  const beforeSubject = scenario.baselineReport.subjects?.[subject] || {};
  const afterSubject = scenario.afterReport.subjects?.[subject] || {};
  const answered = scenario.activityRun.answerCount;
  const correct = scenario.attempts.filter((a) => a.is_correct === true).length;
  if (scenario.attempts.length !== answered) fail(`expected ${answered} attempts, got ${scenario.attempts.length}`);
  if (Number(afterSummary.totalAnswers || 0) < Number(beforeSummary.totalAnswers || 0) + answered) {
    fail("report summary totalAnswers did not include answered parent activity attempts");
  }
  if (Number(afterSubject.answers || 0) < Number(beforeSubject.answers || 0) + answered) {
    fail(`report subject ${subject} answers did not include parent activity attempts`);
  }
  if (Number(afterSubject.correct || 0) < Number(beforeSubject.correct || 0) + correct) {
    fail(`report subject ${subject} correct count did not include parent activity correct attempts`);
  }
}

export function assertDashboardUpdated(scenario) {
  const subject = scenario.created.subject;
  const before = scenario.baselineHome.derived || {};
  const after = scenario.afterHome.derived || {};
  const answered = scenario.activityRun.answerCount;
  if (Number(after.answersTotalAll || 0) < Number(before.answersTotalAll || 0) + answered) {
    fail("dashboard derived answersTotalAll did not include parent activity attempts");
  }
  const beforeSub = before.bySubject?.[subject] || {};
  const afterSub = after.bySubject?.[subject] || {};
  if (Number(afterSub.answersTotal || 0) < Number(beforeSub.answersTotal || 0) + answered) {
    fail(`dashboard subject ${subject} answers did not include parent activity attempts`);
  }
  if (Number(after.monthlyMinutesIsraelMonth || 0) <= Number(before.monthlyMinutesIsraelMonth || 0)) {
    fail("dashboard monthly minutes did not increase after credited parent activity time");
  }
}

export async function assertParentReportUiAndPdf(scenario) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();
  try {
    const origin = scenario.origin;
    await page.goto(`${origin}/parent/login`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("parent-login-identifier").fill(
      process.env.E2E_PARENT_EMAIL || process.env.E2E_PARENT_USERNAME || process.env.TRUTH_GATES_PARENT_EMAIL || ""
    );
    await page.getByTestId("parent-login-secret").fill(
      process.env.E2E_PARENT_PASSWORD || process.env.SIM_TEACHER_PARENT_PASSWORD || process.env.TRUTH_GATES_PARENT_PASSWORD || ""
    );
    await page.locator("form").getByRole("button", { name: "כניסה" }).click();
    await page.waitForURL("**/parent/dashboard", { timeout: 25_000 }).catch(() => null);
    const qs = new URLSearchParams({
      source: "parent",
      studentId: scenario.student.id,
      period: "custom",
      start: scenario.range.from,
      end: scenario.range.to,
    });
    const reportDataPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/parent/students/${scenario.student.id}/report-data`) &&
        res.request().method() === "GET" &&
        res.ok(),
      { timeout: 120_000 }
    );
    await page.goto(`${origin}/learning/parent-report?${qs}`, { waitUntil: "networkidle", timeout: 120_000 });
    const reportDataRes = await reportDataPromise;
    const apiSnap = extractApiReportSnapshot(await reportDataRes.json(), scenario.range);
    await page.locator("#parent-report-pdf").waitFor({ state: "visible", timeout: 90_000 });
    const uiText = await page.locator("#parent-report-pdf").innerText();
    assertNoParentActivitySeparateLabel(uiText, "PARENT_ACTIVITY_LIVE_PASS UI");
    for (const re of FORBIDDEN_PARENT_ACTIVITY_COPY) {
      if (re.test(uiText)) fail(`forbidden parent activity copy in UI: ${re}`);
    }
    const uiSnap = await extractUiSummaryFromPage(page);
    assertReportSurfaceParity(apiSnap, uiSnap, "PARENT_ACTIVITY_LIVE_PASS UI");
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    const { text: pdfText, method } = await extractPdfTextFromBuffer(pdfBuffer);
    assertNoParentActivitySeparateLabel(pdfText, "PARENT_ACTIVITY_LIVE_PASS PDF");
    for (const re of FORBIDDEN_PARENT_ACTIVITY_COPY) {
      if (re.test(pdfText)) fail(`forbidden parent activity copy in PDF: ${re}`);
    }
    const pdfSnap = extractUiLikeSnapshot(pdfText);
    assertReportSurfaceParity(apiSnap, pdfSnap, "PARENT_ACTIVITY_LIVE_PASS PDF");
    return { apiSnap, uiSnap, pdfSnap, pdfBytes: pdfBuffer.length, pdfParseMethod: method };
  } finally {
    await browser.close();
  }
}

export async function assertStudentDashboardUi(scenario) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "he-IL" });
  await context.addCookies([
    {
      name: "liosh_student_session",
      value: scenario.studentLogin.cookie.replace(/^liosh_student_session=/, ""),
      url: scenario.origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  async function openPanel(title) {
    await page.getByRole("button", { name: new RegExp(title, "u") }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 30_000 });
    const text = await dialog.innerText({ timeout: 30_000 });
    await dialog.getByRole("button", { name: "סגור" }).click();
    await dialog.waitFor({ state: "detached", timeout: 30_000 }).catch(async () => {
      await page.keyboard.press("Escape").catch(() => {});
    });
    return text;
  }

  async function collectDashboardModalTexts() {
    const titles = ["הנתונים שלי", "ההתקדמות שלי", "המשימות שלי", "פעילויות אישיות"];
    /** @type {Record<string, string>} */
    const texts = {};
    for (const title of titles) {
      texts[title] = await openPanel(title);
    }
    return texts;
  }

  try {
    await page.goto(`${scenario.origin}/student/home`, { waitUntil: "networkidle", timeout: 120_000 });
    const bodyText = await page.locator("body").innerText({ timeout: 60_000 });
    const me = scenario.afterMe || { id: scenario.student.id, full_name: scenario.student.full_name, grade_level: scenario.student.grade_level };
    const view = buildStudentHomeView({ student: me, homePayload: scenario.afterHome });
    if (!view) fail("could not build dashboard view model from live home-profile");
    const expectedQuestions = String(view.accountStats.questionsAnswered);
    const modalTexts = await collectDashboardModalTexts();
    if (!modalTexts["הנתונים שלי"]?.includes(expectedQuestions)) {
      fail(`student dashboard stats modal did not include server questions count ${expectedQuestions}`);
    }
    if (bodyText.includes("מטבעות: 0") && view.identity.coinBalanceState !== "realZero") {
      fail("student dashboard UI displayed misleading coin zero");
    }
    await page.evaluate(() => {
      localStorage.setItem("mleo_phase9_dashboard_truth_poison", JSON.stringify({ questionsAnswered: 999999, coins: 0 }));
      localStorage.setItem("LEO_PHASE9_DASHBOARD_TRUTH_POISON", JSON.stringify({ monthlyMinutes: 999999 }));
    });
    await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
    const poisonedText = await page.locator("body").innerText({ timeout: 60_000 });
    const poisonedModalTexts = await collectDashboardModalTexts();
    if (!poisonedModalTexts["הנתונים שלי"]?.includes(expectedQuestions)) {
      fail(`student dashboard stats modal stopped showing server questions count ${expectedQuestions} after localStorage poison`);
    }
    if (
      poisonedText.includes("999999") ||
      Object.values(poisonedModalTexts).some((text) => String(text || "").includes("999999"))
    ) {
      fail("student dashboard UI reflected poisoned localStorage value");
    }
    return {
      expectedQuestions,
      bodyLength: bodyText.length,
      poisonedBodyLength: poisonedText.length,
      modalsOpened: Object.keys(modalTexts),
      statsModalContainsQuestions: modalTexts["הנתונים שלי"]?.includes(expectedQuestions) === true,
    };
  } finally {
    await browser.close();
  }
}
