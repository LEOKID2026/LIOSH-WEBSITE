/**
 * One-off browser verification for StudentSessionContext grade hydration.
 * Usage: node --env-file=.env.local --env-file=.env.e2e.local scripts/tests/verify-student-grade-session-browser.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3001";

const SUBJECTS = [
  { name: "math", path: "/learning/math-master", gradeSelect: '[data-testid="math-grade-select"]' },
  { name: "geometry", path: "/learning/geometry-master", gradeSelect: "select" },
  { name: "hebrew", path: "/learning/hebrew-master", gradeSelect: "select" },
  { name: "english", path: "/learning/english-master", gradeSelect: "select" },
  { name: "science", path: "/learning/science-master", gradeSelect: "select" },
  { name: "moledet", path: "/learning/moledet-geography-master", gradeSelect: "select" },
];

const WRONG_DEFAULTS = new Set(["3", "g3", "g5", "g1", "5", "1"]);

function normalizeGradeKey(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (/^g[1-6]$/.test(s)) return s;
  if (/^[1-6]$/.test(s)) return `g${s}`;
  const m = s.match(/grade[_\s-]*([1-6])/);
  if (m) return `g${m[1]}`;
  return s;
}

function gradeNumberFromKey(key) {
  const m = String(key).match(/^g?([1-6])$/i);
  return m ? Number(m[1]) : null;
}

async function studentLogin(page, username, pin) {
  const loginRes = await page.request.post(`${BASE}/api/student/login`, {
    data: { username, pin },
  });
  if (!loginRes.ok()) {
    const body = await loginRes.text().catch(() => "");
    throw new Error(`Login failed for ${username}: HTTP ${loginRes.status()} ${body.slice(0, 200)}`);
  }
  await page.goto(`${BASE}/student/home`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/student\/home/, { timeout: 30_000 });
}

async function studentLogout(page) {
  await page.goto(`${BASE}/student/home`, { waitUntil: "domcontentloaded" });
  const logoutBtn = page.getByRole("button", { name: /יציאה|התנתק/i });
  if (await logoutBtn.count()) {
    await logoutBtn.first().click({ force: true });
    await page.waitForURL(/student\/login/, { timeout: 20_000 }).catch(() => {});
  }
  await page.context().clearCookies();
}

async function fetchMeGrade(page) {
  const res = await page.request.get(`${BASE}/api/student/me`, {
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!json?.ok || !json?.student?.id) return null;
  return {
    studentId: String(json.student.id),
    gradeKey: normalizeGradeKey(json.student.grade_level),
    gradeLevelRaw: String(json.student.grade_level ?? ""),
  };
}

async function readGradeSelectValue(page, selector) {
  const sel = page.locator(selector).first();
  await sel.waitFor({ state: "visible", timeout: 30_000 });
  return String(await sel.inputValue());
}

async function pollForWrongGradeFlash(page, selector, expectedKey, ms = 2500) {
  const expectedNum = gradeNumberFromKey(expectedKey);
  const expectedG = expectedKey.startsWith("g") ? expectedKey : `g${expectedKey}`;
  const samples = [];
  const start = Date.now();
  while (Date.now() - start < ms) {
    const visible = await page.locator(selector).first().isVisible().catch(() => false);
    if (visible) {
      const val = await readGradeSelectValue(page, selector).catch(() => "");
      samples.push(val);
      const norm = normalizeGradeKey(val);
      if (val && norm !== expectedG && norm !== String(expectedNum)) {
        if (WRONG_DEFAULTS.has(val) || WRONG_DEFAULTS.has(norm)) {
          return { flash: true, val, expected: expectedG, samples };
        }
      }
    }
    await page.waitForTimeout(100);
  }
  return { flash: false, samples };
}

async function verifySubject(page, subj, meInfo, meCallsFromPage) {
  const meBefore = meCallsFromPage.count;
  await page.goto(`${BASE}${subj.path}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.body?.innerText?.includes("בודק התחברות תלמיד"),
    { timeout: 30_000 }
  ).catch(() => {});

  const flash = await pollForWrongGradeFlash(page, subj.gradeSelect, meInfo.gradeKey);
  const finalVal = await readGradeSelectValue(page, subj.gradeSelect);
  const finalNorm = normalizeGradeKey(finalVal);
  const expectedG = meInfo.gradeKey;
  const expectedNum = gradeNumberFromKey(expectedG);

  const gradeOk =
    finalNorm === expectedG ||
    finalVal === String(expectedNum) ||
    normalizeGradeKey(finalVal) === expectedG;

  const meAfter = meCallsFromPage.count;
  const pageMeCalls = meAfter - meBefore;
  const duplicateMe = pageMeCalls > 1;

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => !document.body?.innerText?.includes("טוען"),
    { timeout: 30_000 }
  ).catch(() => {});
  const afterReload = await readGradeSelectValue(page, subj.gradeSelect);
  const reloadNorm = normalizeGradeKey(afterReload);
  const reloadOk =
    reloadNorm === expectedG ||
    afterReload === String(expectedNum);

  return {
    subject: subj.name,
    gradeOk,
    reloadOk,
    flash,
    finalVal,
    afterReload,
    expected: expectedG,
    pageMeCalls,
    duplicateMe,
  };
}

async function runStudentCase(page, label, username, pin, meCallsFromPage) {
  console.log(`\n=== Student case: ${label} (${username}) ===`);
  await studentLogin(page, username, pin);
  const meInfo = await fetchMeGrade(page);
  if (!meInfo?.gradeKey) {
    throw new Error(`Could not resolve grade for ${username}`);
  }
  console.log(`Account grade: ${meInfo.gradeLevelRaw} -> ${meInfo.gradeKey} (id=${meInfo.studentId})`);

  const cacheKey = `liosh_student_grade_${meInfo.studentId}`;
  const cached = await page.evaluate((k) => localStorage.getItem(k), cacheKey);
  console.log(`localStorage ${cacheKey}: ${cached ?? "(empty)"}`);

  const results = [];
  for (const subj of SUBJECTS) {
    const r = await verifySubject(page, subj, meInfo, meCallsFromPage);
    results.push(r);
    console.log(
      `  ${subj.name}: gradeOk=${r.gradeOk} reloadOk=${r.reloadOk} flash=${r.flash.flash} gateMeCalls=${r.pageMeCalls} duplicate=${r.duplicateMe} final=${r.finalVal}`
    );
    if (r.flash.flash) {
      console.log(`    FLASH samples: ${r.flash.samples.join(", ")} expected ${r.expected}`);
    }
  }

  // SPA navigation between two subjects
  await page.goto(`${BASE}/learning/math-master`, { waitUntil: "domcontentloaded" });
  const mathVal = await readGradeSelectValue(page, SUBJECTS[0].gradeSelect);
  await page.goto(`${BASE}/learning/hebrew-master`, { waitUntil: "domcontentloaded" });
  const hebVal = await readGradeSelectValue(page, SUBJECTS[2].gradeSelect);
  const navOk =
    normalizeGradeKey(mathVal) === meInfo.gradeKey &&
    normalizeGradeKey(hebVal) === meInfo.gradeKey;
  console.log(`  nav math->hebrew: math=${mathVal} hebrew=${hebVal} ok=${navOk}`);

  return { meInfo, results, navOk, cacheKey, cached };
}

async function main() {
  const lowUser = process.env.VERIFY_LOW_GRADE_USER || "demo-g1s1-01";
  const lowPin = process.env.VERIFY_LOW_GRADE_PIN || "1234";
  const highUser = process.env.VERIFY_HIGH_GRADE_USER || "demo-g6s1-01";
  const highPin = process.env.VERIFY_HIGH_GRADE_PIN || "1234";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const meCallsFromPage = { count: 0 };
  page.on("request", (req) => {
    const url = req.url();
    if (!url.includes("/api/student/me")) return;
    const frame = req.frame();
    if (frame && frame === page.mainFrame()) {
      meCallsFromPage.count += 1;
    }
  });

  let lowCase;
  let highCase;
  try {
    lowCase = await runStudentCase(page, "low-grade", lowUser, lowPin, meCallsFromPage);
    await studentLogout(page);

    highCase = await runStudentCase(page, "high-grade", highUser, highPin, meCallsFromPage);
    await studentLogout(page);

    // Logout / different student regression
    await studentLogin(page, lowUser, lowPin);
    const afterRelogin = await fetchMeGrade(page);
    await page.goto(`${BASE}/learning/math-master`, { waitUntil: "domcontentloaded" });
    const reloginGrade = await readGradeSelectValue(page, SUBJECTS[0].gradeSelect);
    const reloginOk = normalizeGradeKey(reloginGrade) === afterRelogin?.gradeKey;
    console.log(`\n=== Logout/relogin regression ===`);
    console.log(`  relogin grade select=${reloginGrade} expected=${afterRelogin?.gradeKey} ok=${reloginOk}`);

    const noDuplicateMe = [...lowCase.results, ...highCase.results].every((r) => !r.duplicateMe);
    const noFlash = [...lowCase.results, ...highCase.results].every((r) => !r.flash.flash);
    const allGradeOk = [...lowCase.results, ...highCase.results].every((r) => r.gradeOk && r.reloadOk);

    const switchOk =
      lowCase.meInfo.studentId !== highCase.meInfo.studentId &&
      lowCase.meInfo.gradeKey !== highCase.meInfo.gradeKey;

    console.log("\n=== SUMMARY ===");
    console.log(`Low student grade: ${lowCase.meInfo.gradeKey}`);
    console.log(`High student grade: ${highCase.meInfo.gradeKey}`);
    console.log(`Student switch different grades: ${switchOk}`);
    console.log(`No wrong-grade flash: ${noFlash}`);
    console.log(`All subjects grade/reload ok: ${allGradeOk}`);
    console.log(`No duplicate page+gate /me (>1 per load): ${noDuplicateMe}`);
    console.log(`SPA nav ok (low): ${lowCase.navOk}`);
    console.log(`Relogin ok: ${reloginOk}`);

    if (!noDuplicateMe || !noFlash || !allGradeOk || !reloginOk) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
