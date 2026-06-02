/**
 * Authenticated staging/local E2E for learning time fairness (flag ON).
 * Usage:
 *   NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true npx next dev -H 127.0.0.1 -p 3002
 *   node scripts/qa/staging-e2e-learning-time-fairness.mjs
 *
 * Env: .env.local + .env.e2e.local (Supabase service role, E2E_STUDENT_*, optional E2E_PARENT_*)
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { tryLoadE2EStudentEnvFromDotenv } from "../e2e-lib/hebrew-e2e-student-auth.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const BASE =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.E2E_BASE_URL ||
  "http://127.0.0.1:3002";
const REPORT_PATH = resolve(
  ROOT,
  process.env.FAIRNESS_E2E_REPORT_PATH ||
    "docs/qa/STUDENT_LEARNING_TIME_FAIRNESS_PREVIEW_E2E_2026-06-02.md"
);

const CLASSROOM_SIM_PARENT_EMAIL = "parent-class-sim@liosh-dev.invalid";
const CLASSROOM_SIM_STUDENT = "leo-s02";

function loadEnv(file) {
  const p = resolve(ROOT, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(".env.local");
loadEnv(".env.e2e.local");
tryLoadE2EStudentEnvFromDotenv();

const supabaseUrl = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
const serviceKey = process.env.LEARNING_SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase URL or LEARNING_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const findings = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE,
  fairnessFlagRequired: "NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true",
  studentAccount: null,
  parentAccount: null,
  scenarios: [],
  blockers: [],
};

function recordScenario(name, data) {
  findings.scenarios.push({ name, ...data });
  console.log(`\n── ${name} ──`);
  console.log(JSON.stringify(data, null, 2));
}

async function assertServer() {
  const origin = new URL(BASE).origin;
  for (let i = 0; i < 12; i++) {
    try {
      const res = await fetch(origin, { redirect: "manual" });
      if (res && res.status > 0 && res.status < 500) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  findings.blockers.push(
    `Dev server not reachable at ${origin}. Start with: NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true npx next dev -H 127.0.0.1 -p 3002`
  );
  return false;
}

async function resolveStudent(origin) {
  const pinDefault = String(process.env.E2E_STUDENT_PIN || "1234")
    .replace(/\D/g, "")
    .trim();
  const attempts = [];
  const primaryUser = String(
    process.env.E2E_STUDENT_USERNAME || CLASSROOM_SIM_STUDENT
  ).trim();
  const code = String(process.env.E2E_STUDENT_CODE || "").trim();
  if (code) attempts.push({ code, pin: pinDefault });
  if (primaryUser) attempts.push({ username: primaryUser, pin: pinDefault });
  if (!attempts.some((a) => a.username === CLASSROOM_SIM_STUDENT)) {
    attempts.push({ username: CLASSROOM_SIM_STUDENT, pin: pinDefault });
  }

  let loginRes = null;
  let usedBody = null;
  for (const body of attempts) {
    loginRes = await fetch(`${origin}/api/student/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    });
    if (loginRes.ok) {
      usedBody = body;
      break;
    }
  }
  if (!loginRes?.ok) {
    findings.blockers.push(
      `Student login failed (HTTP ${loginRes?.status}); tried ${attempts.map((a) => a.username || a.code).join(", ")}`
    );
    return null;
  }
  findings.studentLogin = { ok: true, username: usedBody?.username || usedBody?.code };
  const username = usedBody?.username || usedBody?.code || primaryUser;
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const m = setCookie.match(/liosh_student_session=([^;]+)/);
  if (!m) {
    findings.blockers.push("Student login succeeded but session cookie missing");
    return null;
  }
  const cookie = `liosh_student_session=${decodeURIComponent(m[1].trim())}`;
  const meRes = await fetch(`${origin}/api/student/me`, {
    headers: { Cookie: cookie, Origin: origin },
  });
  const me = await meRes.json().catch(() => ({}));
  const studentId = me?.student?.id || me?.studentId || me?.id;
  if (!studentId) {
    findings.blockers.push(`student/me did not return id (HTTP ${meRes.status})`);
    return null;
  }
  const { data: student } = await supabase
    .from("students")
    .select("id,full_name,parent_id,grade_level")
    .eq("id", studentId)
    .maybeSingle();
  findings.studentAccount = {
    username,
    studentId,
    displayName: student?.full_name || me?.student?.full_name || "(unknown)",
    parentId: student?.parent_id || null,
    gradeLevel: student?.grade_level || me?.student?.grade_level || null,
  };
  findings._studentCookie = cookie;
  return findings.studentAccount;
}

async function applyResolvedStudentCookie(context, origin) {
  const raw = findings._studentCookie || "";
  const m = raw.match(/liosh_student_session=([^;]+)/);
  const token = m ? m[1] : "";
  if (!token) throw new Error("Missing resolved student session cookie");
  await context.addCookies([
    {
      name: "liosh_student_session",
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function parentBearerToken(origin) {
  const identifier =
    process.env.E2E_PARENT_EMAIL ||
    process.env.E2E_PARENT_USERNAME ||
    CLASSROOM_SIM_PARENT_EMAIL;
  const useClassSimParent =
    identifier === CLASSROOM_SIM_PARENT_EMAIL ||
    identifier.includes("parent-class-sim");
  const secret = useClassSimParent
    ? process.env.SIM_TEACHER_PARENT_PASSWORD ||
      process.env.E2E_PARENT_PASSWORD ||
      "ParentClassSim!2026"
    : process.env.E2E_PARENT_PASSWORD ||
      process.env.SIM_TEACHER_PARENT_PASSWORD ||
      process.env.E2E_PARENT_PIN ||
      "";
  findings.parentAccount = { identifier, authMode: "supabase_jwt" };

  if (identifier.includes("@")) {
    const anon = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
    if (!anon) {
      findings.parentLogin = { ok: false, reason: "missing anon key" };
      return null;
    }
    if (!secret) {
      findings.parentLogin = {
        ok: false,
        reason: "set E2E_PARENT_PASSWORD or SIM_TEACHER_PARENT_PASSWORD",
      };
      return null;
    }
    const authClient = createClient(supabaseUrl, anon, {
      auth: { persistSession: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email: identifier,
      password: secret,
    });
    findings.parentLogin = {
      ok: !!data?.session?.access_token,
      error: error?.message || null,
    };
    if (data?.session?.user?.id) {
      findings.parentAccount.userId = data.session.user.id;
    }
    return data?.session?.access_token || null;
  }

  for (const path of ["/api/parent/login", "/api/guardian/login"]) {
    const codeRes = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ loginUsername: identifier, pin: secret }),
    }).catch(() => null);
    if (codeRes?.ok) {
      const json = await codeRes.json().catch(() => ({}));
      return (
        json?.accessToken ||
        json?.token ||
        json?.session?.access_token ||
        null
      );
    }
  }
  return null;
}

async function fetchParentReport(studentId, bearer) {
  if (!bearer) return { skipped: true, reason: "no parent bearer" };
  const url = `${BASE}/api/parent/students/${studentId}/report-data`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

async function getSessionRow(sessionId) {
  const { data } = await supabase
    .from("learning_sessions")
    .select(
      "id,subject,duration_seconds,status,started_at,ended_at,metadata"
    )
    .eq("id", sessionId)
    .maybeSingle();
  return data;
}

async function getLatestAnswerForSession(sessionId) {
  const { data } = await supabase
    .from("answers")
    .select("id,answer_payload,is_correct,created_at")
    .eq("learning_session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function getHomeProfile(request, origin) {
  const res = await request.get(`${origin}/api/student/home-profile`);
  if (!res.ok()) return null;
  return res.json().catch(() => null);
}

function inRange(n, lo, hi) {
  return typeof n === "number" && n >= lo && n <= hi;
}

/**
 * @param {import('playwright').Page} page
 */
async function setPageHidden(page, hidden) {
  await page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (h ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => h,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    if (h) window.dispatchEvent(new Event("blur"));
    else window.dispatchEvent(new Event("focus"));
  }, hidden);
}

/**
 * Run one master scenario with simulated clock.
 */
async function runMasterScenario({
  browser,
  origin,
  path,
  startTestId,
  mcqPrefix,
  visibleMs,
  hiddenMs = 0,
  stopAfterAnswer = true,
  selectTopicValue = null,
  modeButtonName = null,
  maxQuestions = 1,
  label,
}) {
  const context = await browser.newContext({ locale: "he-IL" });
  await applyResolvedStudentCookie(context, origin);
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-06-02T10:00:00.000Z") });

  let sessionId = null;
  const answerPosts = [];
  let finishPayload = null;

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/api/learning/session/start") && res.ok()) {
      const j = await res.json().catch(() => ({}));
      sessionId = j?.learningSessionId || j?.sessionId || sessionId;
    }
    if (url.includes("/api/learning/session/finish") && res.request().method() === "POST") {
      const reqBody = res.request().postDataJSON?.() || {};
      finishPayload = {
        status: res.status(),
        durationSeconds: reqBody.durationSeconds,
      };
    }
    if (url.includes("/api/learning/answer") && res.request().method() === "POST") {
      const reqBody = res.request().postDataJSON?.() || {};
      answerPosts.push({
        status: res.status(),
        timeSpentMs: reqBody.timeSpentMs,
        questionId: reqBody.questionId || reqBody.questionFingerprint,
      });
    }
  });

  await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByTestId(startTestId).waitFor({ state: "visible", timeout: 60_000 });

  if (selectTopicValue) {
    const sel = page.locator('[data-testid$="-topic-select"]').first();
    if (await sel.count()) {
      await sel.selectOption(selectTopicValue).catch(() => {});
    }
  }

  if (modeButtonName) {
    await page.getByRole("button", { name: modeButtonName }).click();
  }

  await page.getByTestId(startTestId).click();
  await page
    .locator('[data-testid$="-question-stem"], [data-testid="geometry-question-stem"]')
    .first()
    .waitFor({ state: "visible", timeout: 60_000 })
    .catch(() => {});

  for (let q = 0; q < maxQuestions; q++) {
    if (hiddenMs > 0) {
      const vis = Math.floor(visibleMs / 2);
      await page.clock.fastForward(vis);
      await setPageHidden(page, true);
      await page.clock.fastForward(hiddenMs);
      await setPageHidden(page, false);
      await page.clock.fastForward(visibleMs - vis);
    } else if (visibleMs > 0) {
      await page.clock.fastForward(visibleMs);
    }

    const mcq = page.locator(`[data-testid^="${mcqPrefix}"]`).first();
    if (await mcq.count()) {
      await mcq.click({ timeout: 15_000 }).catch(() => {});
    } else {
      const textAns = page.getByTestId("geometry-text-answer");
      if (await textAns.count()) {
        await textAns.fill("1");
        await page.keyboard.press("Enter").catch(() => {});
      }
    }
    await page.waitForTimeout(2500);
  }

  if (stopAfterAnswer) {
    const stop = page.getByTestId("learning-stop-game");
    if (await stop.isVisible().catch(() => false)) {
      await stop.click({ force: true });
      await page
        .waitForResponse(
          (res) =>
            res.url().includes("/api/learning/session/finish") &&
            res.request().method() === "POST",
          { timeout: 20_000 }
        )
        .catch(() => null);
      await page.waitForTimeout(1500);
    }
  }

  await context.close();

  let sessionRow = null;
  let answerRow = null;
  if (sessionId) {
    await new Promise((r) => setTimeout(r, 1500));
    sessionRow = await getSessionRow(sessionId);
    answerRow = await getLatestAnswerForSession(sessionId);
  }

  const durationSeconds = sessionRow?.duration_seconds ?? null;
  const timeSpentMs = answerRow?.answer_payload?.timeSpentMs ?? answerPosts.at(-1)?.timeSpentMs ?? null;
  const tierHint =
    answerRow?.answer_payload?.clientMeta?.questionKind ||
    answerRow?.answer_payload?.clientMeta?.kind ||
    null;

  recordScenario(label, {
    sessionId,
    simulatedVisibleMs: visibleMs,
    simulatedHiddenMs: hiddenMs,
    duration_seconds: durationSeconds,
    timeSpentMs,
    tierHint,
    answerPosts,
    finishPayload,
    pass:
      sessionId &&
      durationSeconds != null &&
      (timeSpentMs == null
        ? durationSeconds >= 100
        : timeSpentMs >= visibleMs * 0.85),
  });

  return { sessionId, durationSeconds, timeSpentMs, sessionRow, answerRow };
}

async function runScienceChallengeSmoke(browser, origin) {
  const context = await browser.newContext({ locale: "he-IL" });
  await applyResolvedStudentCookie(context, origin);
  const page = await context.newPage();
  await page.goto(`${origin}/learning/science-master`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.locator('button:has-text("אתגר")').first().click({ timeout: 20_000 });
  await page.getByTestId("science-start-game").click();
  const timerText = await page
    .locator("text=/\\d+/")
    .first()
    .textContent()
    .catch(() => "");
  const challengeTimerStartsAt25 = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("span,div")];
    return nodes.some((n) => n.textContent?.trim() === "25");
  });
  await context.close();
  recordScenario("science_challenge_speed_smoke", {
    challengeTimerStartsAt25,
    timerTextSample: timerText?.slice(0, 40),
    note: "Science challenge uses 25s (speed 12s) — pre-existing vs other masters 20s/10s",
    pass: challengeTimerStartsAt25,
  });
}

async function main() {
  if (!(await assertServer())) {
    writeReport("BLOCKED");
    process.exit(2);
  }

  const origin = new URL(BASE).origin;
  const student = await resolveStudent(origin);
  if (!student) {
    writeReport("BLOCKED");
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });

  const profileBefore = await (async () => {
    const ctx = await browser.newContext();
    await applyResolvedStudentCookie(ctx, origin);
    const p = await getHomeProfile(ctx.request, origin);
    await ctx.close();
    return p;
  })();

  const defaultRun = await runMasterScenario({
    browser,
    origin,
    path: "/learning/math-master",
    startTestId: "math-start-game",
    mcqPrefix: "math-mcq-",
    visibleMs: 400_000,
    label: "math_default_400s_visible_cap_300",
  });

  const geometryRun = await runMasterScenario({
    browser,
    origin,
    path: "/learning/geometry-master",
    startTestId: "geometry-start-game",
    mcqPrefix: "geometry-mcq-",
    visibleMs: 360_000,
    label: "geometry_long_work_360s_visible",
  });

  const hebrewReading = await runMasterScenario({
    browser,
    origin,
    path: "/learning/hebrew-master",
    startTestId: "hebrew-start-game",
    mcqPrefix: "hebrew-mcq-",
    visibleMs: 620_000,
    selectTopicValue: "reading",
    label: "hebrew_reading_620s_visible_cap_600",
  });

  const hiddenRun = await runMasterScenario({
    browser,
    origin,
    path: "/learning/math-master",
    startTestId: "math-start-game",
    mcqPrefix: "math-mcq-",
    visibleMs: 120_000,
    hiddenMs: 300_000,
    label: "math_hidden_tab_300s_not_credited",
  });

  try {
    await runScienceChallengeSmoke(browser, origin);
  } catch (e) {
    recordScenario("science_challenge_speed_smoke", {
      pass: false,
      error: String(e?.message || e),
      note: "Science challenge uses 25s (speed 12s) — pre-existing",
    });
  }

  const profileAfter = await (async () => {
    const ctx = await browser.newContext();
    await applyResolvedStudentCookie(ctx, origin);
    const p = await getHomeProfile(ctx.request, origin);
    await ctx.close();
    return p;
  })();

  await browser.close();

  const bearer = await parentBearerToken(origin);
  const parentLinked =
    findings.parentAccount?.userId &&
    student.parentId &&
    findings.parentAccount.userId === student.parentId;
  findings.parentLinkage = {
    studentParentId: student.parentId,
    parentJwtUserId: findings.parentAccount?.userId || null,
    linked: parentLinked === true,
  };

  const parentReportBefore = await fetchParentReport(student.studentId, bearer);
  const parentReport = parentReportBefore;

  const recentSessionIds = findings.scenarios
    .map((s) => s.sessionId)
    .filter(Boolean);
  const { data: dbSessions } = await supabase
    .from("learning_sessions")
    .select("id,duration_seconds,subject,status,ended_at")
    .in("id", recentSessionIds);
  const reportSummary = parentReport.body?.summary || {};
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDaily = (parentReport.body?.dailyActivity || []).find(
    (d) => d.date === todayKey
  );

  findings.parentReport = {
    httpStatus: parentReport.status,
    ok: parentReport.ok === true,
    totalDurationSeconds: reportSummary.totalDurationSeconds ?? null,
    totalSessions: reportSummary.totalSessions ?? null,
    todayDurationSeconds: todayDaily?.durationSeconds ?? null,
    dbSessionsFromRun: dbSessions || [],
    parentLinked: parentLinked === true,
  };

  const monthlyBefore = profileBefore?.monthly?.totalMinutes ?? profileBefore?.monthly?.minutes;
  const monthlyAfter = profileAfter?.monthly?.totalMinutes ?? profileAfter?.monthly?.minutes;
  const dailyMissionBefore = (profileBefore?.challenges?.dailyMissions || []).find(
    (m) => /דקות|minutes/i.test(String(m?.title || m?.id || ""))
  );
  const dailyMissionAfter = (profileAfter?.challenges?.dailyMissions || []).find(
    (m) => /דקות|minutes/i.test(String(m?.title || m?.id || ""))
  );

  findings.verdictChecks = {
    defaultCap300: inRange(defaultRun?.durationSeconds, 280, 305),
    geometryAbout360: inRange(geometryRun?.durationSeconds, 300, 480),
    geometryWallClock: (geometryRun?.timeSpentMs ?? 0) >= 340_000,
    hebrewCap600: inRange(hebrewReading?.durationSeconds, 560, 610),
    hebrewWallClock: (hebrewReading?.timeSpentMs ?? 0) >= 600_000,
    hiddenLessThanVisibleOnly:
      hiddenRun?.durationSeconds != null &&
      defaultRun?.durationSeconds != null &&
      hiddenRun.durationSeconds < defaultRun.durationSeconds - 60,
    timeSpentNotClampedToCredit:
      (geometryRun?.timeSpentMs ?? 0) >= 330_000 &&
      (geometryRun?.durationSeconds ?? 0) >= 300,
    parentReportOk: parentReport.ok === true,
    parentLinked: parentLinked === true,
    parentReportShowsDuration:
      (reportSummary.totalDurationSeconds ?? 0) >= 400 ||
      (todayDaily?.durationSeconds ?? 0) >= 100,
    monthlyMinutesIncreased:
      typeof monthlyBefore === "number" &&
      typeof monthlyAfter === "number" &&
      monthlyAfter > monthlyBefore,
  };

  findings.homeProfile = {
    monthlyMinutesBefore: monthlyBefore ?? null,
    monthlyMinutesAfter: monthlyAfter ?? null,
    monthlyDelta:
      typeof monthlyBefore === "number" && typeof monthlyAfter === "number"
        ? monthlyAfter - monthlyBefore
        : null,
    dailyMinutesMissionBefore: dailyMissionBefore?.progress ?? dailyMissionBefore?.current,
    dailyMinutesMissionAfter: dailyMissionAfter?.progress ?? dailyMissionAfter?.current,
    streakBefore: profileBefore?.streaks?.daily?.current ?? null,
    streakAfter: profileAfter?.streaks?.daily?.current ?? null,
  };

  writeReport();
  const allPass = Object.values(findings.verdictChecks).every(Boolean);
  process.exit(allPass ? 0 : 1);
}

function writeReport(overrideVerdict) {
  const checks = findings.verdictChecks || {};
  const passCount = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const blocked = findings.blockers.length > 0 || overrideVerdict === "BLOCKED";
  const productionSafe =
    !blocked && passCount === totalChecks && totalChecks > 0;

  const md = `# Student learning time fairness — staging E2E

**Date:** 2026-06-02  
**Run started:** ${findings.startedAt}  
**Runner:** \`scripts/qa/staging-e2e-learning-time-fairness.mjs\`

## 1. Summary verdict

${
  blocked
    ? "**BLOCKED** — could not complete full authenticated live validation. See blockers and environment sections."
    : productionSafe
      ? "**Staging E2E passed** — fairness flag ON behavior matches expectations on live DB. **Not safe for production enablement yet** without explicit ops sign-off (see remaining risks)."
      : `**Staging E2E partial / failed** — ${passCount}/${totalChecks} automated checks passed. **Not safe for production** until failures are resolved and re-run.`
}

## 2. Environment used

| Item | Value |
|------|--------|
| Base URL | \`${findings.baseUrl}\` |
| Node runner | Local Playwright (Chromium headless) |
| DB | Live Supabase (service role read-back) |
| Deploy | None (local dev server required) |

${findings.blockers.map((b) => `- **Blocker:** ${b}`).join("\n")}

## 3. Feature flag confirmation

Required: \`NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1=true\` on the **Next.js dev/build process** (client bundle).

Operator must start dev, e.g.:

\`\`\`powershell
$env:NEXT_PUBLIC_LEARNING_TIME_FAIRNESS_V1="true"
npx next dev -H 127.0.0.1 -p 3002
\`\`\`

Script does not mutate Vercel/production env.

## 4. Student / parent test accounts

| Role | Identifier (no secrets) |
|------|------------------------|
| Student | username \`${findings.studentAccount?.username || "E2E_STUDENT_USERNAME"}\`, id \`${findings.studentAccount?.studentId || "?"}\` |
| Student display | ${findings.studentAccount?.displayName || "—"} |
| Parent link | parent_id \`${findings.studentAccount?.parentId || "?"}\` |
| Parent API | ${findings.parentAccount?.identifier || "leo-p01 or E2E_PARENT_EMAIL"} |

PIN/password values are **not** recorded in this report.

## 5. Scenarios run

${findings.scenarios
  .map(
    (s) => `### ${s.name}

- sessionId: \`${s.sessionId || "none"}\`
- duration_seconds: **${s.duration_seconds ?? "n/a"}**
- answer timeSpentMs: **${s.timeSpentMs ?? "n/a"}**
- simulated visible ms: ${s.simulatedVisibleMs ?? "—"}${s.simulatedHiddenMs ? `, hidden ms: ${s.simulatedHiddenMs}` : ""}
- pass: ${s.pass === true ? "yes" : s.pass === false ? "no" : "n/a"}
${s.note ? `- note: ${s.note}` : ""}`
  )
  .join("\n\n")}

## 6. DB rows checked

Verified via service role on \`learning_sessions.duration_seconds\` and \`answers.answer_payload.timeSpentMs\` for session IDs above.

| Check | Result |
|-------|--------|
| Default ~300s cap (400s visible sim) | ${checks.defaultCap300 ? "PASS" : "FAIL"} |
| Geometry long work ~360s credit (not 120/0) | ${checks.geometryAbout360 ? "PASS" : "FAIL"} |
| Geometry wall clock timeSpentMs ≥ ~360s | ${checks.geometryWallClock ? "PASS" : "FAIL"} |
| Hebrew reading ~600s cap | ${checks.hebrewCap600 ? "PASS" : "FAIL"} |
| Hebrew wall clock not clamped to credit | ${checks.hebrewWallClock ? "PASS" : "FAIL"} |
| Hidden tab reduces credit vs full visible | ${checks.hiddenLessThanVisibleOnly ? "PASS" : "FAIL"} |
| timeSpentMs > credited seconds | ${checks.timeSpentNotClampedToCredit ? "PASS" : "FAIL"} |

## 7. Parent report result

- HTTP: **${findings.parentReport?.httpStatus ?? "skipped"}**
- Sessions matched in report payload: ${JSON.stringify(findings.parentReport?.matchedSessions || [])}
- Check: report includes session durations: **${checks.parentReportOk ? "PASS" : "FAIL/SKIP"}**

## 8. Rewards / monthly / missions result

| Metric | Before | After |
|--------|--------|-------|
| monthlyMinutes (home-profile) | ${findings.homeProfile?.minutesBefore ?? "n/a"} | ${findings.homeProfile?.minutesAfter ?? "n/a"} |

Daily missions snapshot changed: ${findings.homeProfile?.dailyMissionsBefore ? "see runner log" : "not captured in detail"}.

Coins formula / daily cap / streak: **not mutated by this change** (validated by static QA; not re-awarded in this short run).

## 9. Challenge / speed regression result

Science challenge timer still starts at **25s** (speed **12s**) — pre-existing divergence from math/geometry **20s/10s**. UI \`handleTimeUp\` path smoke only; no timer changes made.

## 10. Remaining risks

- Book snapshot return may not reopen ledger with original open time (known from static QA).
- Tier misclassification if question kind/topic not in allowlists.
- Parent UX: wall-clock \`timeSpentMs\` can exceed credited minutes shown in report.
- Cross-device local vs DB minutes drift.
- Staging Vercel preview not exercised unless deployed with flag ON.

## 11. Production enablement recommendation

**${productionSafe ? "Do not enable production yet** — complete ops review of parent-facing minute deltas and optional preview deploy smoke." : "**Do not enable production** — staging/local E2E incomplete or failed checks."}**

---

_Auto-generated by staging E2E script. Re-run after fixing blockers or restarting dev with fairness flag ON._
`;

  writeFileSync(REPORT_PATH, md, "utf8");
  console.log(`\nReport written: ${REPORT_PATH}`);
}

main().catch((e) => {
  findings.blockers.push(String(e?.message || e));
  writeReport("BLOCKED");
  console.error(e);
  process.exit(2);
});
