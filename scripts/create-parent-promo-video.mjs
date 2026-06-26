#!/usr/bin/env node
/**
 * Parent promo video — capture real screenshots + export via admin video builder.
 * Run: node --env-file=.env.local --env-file=.env.e2e.local scripts/create-parent-promo-video.mjs
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, copyFileSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import {
  checkFfmpegAvailable,
  createEmptyProjectPayload,
  createVideoProject,
  exportVideoProjectMp4,
  saveMediaAsset,
  updateVideoProject,
  parseVideoProjectBody,
  VB_OUTPUTS_DIR,
} from "../lib/admin-server/admin-video-builder.server.js";
import { computePreviewTotalDurationSec } from "../lib/admin-portal/admin-video-builder-utils.js";
import { defaultSceneFields } from "../lib/admin-portal/admin-video-builder-catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE = (process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || "http://127.0.0.1:3001").replace(
  /\/$/,
  ""
);
const SCREENSHOT_DIR = join(ROOT, "public", "admin-video-assets", "uploads", "parent-promo");
const VOICEOVER_FILE = join(
  ROOT,
  "ElevenLabs_2026-06-26T14_39_02_Hope - Professional, Clear and Natural_pvc_sp100_s50_sb75_v3.mp3"
);
const OUTPUT_ALIAS = "leo-kids-parent-promo-draft-1.mp4";
const PROJECT_NAME = "סרטון הורים - טיוטה 1";

const FFMPEG_BIN =
  process.env.FFMPEG_BIN ||
  "C:\\Users\\ERAN YOSEF\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin";
if (existsSync(FFMPEG_BIN)) {
  process.env.PATH = `${FFMPEG_BIN};${process.env.PATH || ""}`;
}

function log(msg) {
  console.log(msg);
}

function ffprobeDuration(filePath) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
    { encoding: "utf8" }
  );
  if (r.status !== 0) return null;
  const n = Number(String(r.stdout).trim());
  return Number.isFinite(n) ? n : null;
}

function distributeDurations(totalSec, count) {
  const durations = [];
  let used = 0;
  for (let i = 0; i < count - 1; i++) {
    const d = Math.round((totalSec / count) * 100) / 100;
    durations.push(d);
    used += d;
  }
  durations.push(Math.round((totalSec - used) * 1000) / 1000);
  return durations;
}

async function waitForServer(maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/parents`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error(`Dev server not reachable at ${BASE}`);
}

async function loginParent(page) {
  const email =
    process.env.E2E_PARENT_EMAIL ||
    process.env.PARENT_PROMO_EMAIL ||
    "admin@admin.com";
  const password =
    process.env.E2E_PARENT_PASSWORD ||
    process.env.DEMO_PARENT_PASSWORD ||
    process.env.PARENT_PROMO_PASSWORD ||
    "";

  if (!password) throw new Error("Missing parent password (E2E_PARENT_PASSWORD)");

  await page.goto(`${BASE}/parent/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByPlaceholder("הקלידו אימייל או שם משתמש שקיבלתם מהמורה").fill(email);
  await page.getByPlaceholder("הקלידו סיסמה או קוד כניסה").fill(password);
  await page.locator("form").getByRole("button", { name: "כניסה" }).click();
  await page.waitForURL("**/parent/dashboard", { timeout: 30_000 });

  const policyApprove = page.getByRole("button", { name: "אישור והמשך" });
  if (await policyApprove.isVisible({ timeout: 4000 }).catch(() => false)) {
    await page.getByRole("checkbox").check({ force: true });
    await policyApprove.click();
  }
  await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ timeout: 20_000 });
  return email;
}

async function fetchParentStudents(accessToken) {
  const res = await fetch(`${BASE}/api/parent/list-students`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "list-students failed");
  return Array.isArray(body.students) ? body.students : [];
}

async function getParentAccessToken(email, password) {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Missing Supabase env");
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Parent auth failed for ${email}`);
  return json.access_token;
}

async function loginStudent(page, account) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("בודקים חיבור...").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  if (page.url().includes("/student/home")) return;

  await page.getByPlaceholder("שם משתמש").fill(account.username);
  await page.getByPlaceholder("קוד כניסה").fill(account.pin);
  await page.getByRole("button", { name: /כניסה ללמידה|כניסה/ }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/student/") && !url.pathname.includes("/login"), {
    timeout: 45_000,
  });
  await page.waitForTimeout(1200);
}

async function gotoStudentPage(page, path) {
  const url = `${BASE}${path}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch (error) {
    if (!String(error?.message || error).includes("ERR_ABORTED")) throw error;
    await page.waitForURL((u) => u.pathname.startsWith("/student/"), { timeout: 30_000 }).catch(() => {});
    if (!page.url().includes(path.replace(/^\//, ""))) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    }
  }
  await page.waitForTimeout(1500);
}

async function captureScreenshot(page, filename) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const outPath = join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  const size = statSync(outPath).size;
  if (size < 500) throw new Error(`Screenshot too small: ${filename} (${size} bytes)`);
  return outPath;
}

async function captureAllScreenshots() {
  const password =
    process.env.E2E_PARENT_PASSWORD ||
    process.env.DEMO_PARENT_PASSWORD ||
    process.env.PARENT_PROMO_PASSWORD ||
    "";
  const email =
    process.env.E2E_PARENT_EMAIL ||
    process.env.PARENT_PROMO_EMAIL ||
    "admin@admin.com";

  const shots = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "he-IL",
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  log("[screenshots] 01 — דף נחיתה להורים");
  await page.goto(`${BASE}/parents`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  shots.push({ file: "01-parents-landing.png", path: await captureScreenshot(page, "01-parents-landing.png") });

  log("[screenshots] 02 — כניסת הורה");
  await page.goto(`${BASE}/parent/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  shots.push({ file: "02-parent-login.png", path: await captureScreenshot(page, "02-parent-login.png") });

  log("[screenshots] login parent + dashboard");
  await loginParent(page);
  shots.push({ file: "03-parent-dashboard.png", path: await captureScreenshot(page, "03-parent-dashboard.png") });

  const detailsBtn = page.getByRole("button", { name: "פרטים" }).first();
  const activityBtn = page.getByRole("button", { name: "פעילות" }).first();
  const hasChild = (await detailsBtn.count()) > 0;

  if (hasChild) {
    log("[screenshots] 04 — כרטיסי ילדים");
    shots.push({ file: "04-children-cards.png", path: await captureScreenshot(page, "04-children-cards.png") });
  }

  log("[screenshots] 05 — הוספת ילד");
  await page.getByRole("button", { name: "הוספת ילד" }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10_000 });
  await page.waitForTimeout(400);
  shots.push({ file: "05-add-child-modal.png", path: await captureScreenshot(page, "05-add-child-modal.png") });
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(400);

  let studentId = null;
  if (hasChild) {
    log("[screenshots] 06 — פרטי ילד");
    await detailsBtn.click();
    await page.getByRole("dialog").waitFor({ timeout: 10_000 });
    await page.waitForTimeout(500);
    shots.push({ file: "06-child-details.png", path: await captureScreenshot(page, "06-child-details.png") });
    await page.keyboard.press("Escape").catch(() => {});

    const token = await getParentAccessToken(email, password);
    const students = await fetchParentStudents(token);
    const active = students.filter((s) => s?.id && s.is_active !== false);
    studentId = active[0]?.id || null;

    if (studentId) {
      log("[screenshots] 07 — דוח הורים");
      await page.goto(
        `${BASE}/learning/parent-report?studentId=${encodeURIComponent(studentId)}&source=parent`,
        { waitUntil: "domcontentloaded", timeout: 60_000 }
      );
      await page.waitForTimeout(2500);
      shots.push({ file: "07-parent-report.png", path: await captureScreenshot(page, "07-parent-report.png") });

      log("[screenshots] 08 — דוח מפורט");
      await page.goto(
        `${BASE}/learning/parent-report-detailed?studentId=${encodeURIComponent(studentId)}&source=parent`,
        { waitUntil: "domcontentloaded", timeout: 60_000 }
      );
      await page.waitForTimeout(3000);
      shots.push({
        file: "08-parent-report-detailed.png",
        path: await captureScreenshot(page, "08-parent-report-detailed.png"),
      });

      log("[screenshots] 09 — שליחת פעילות");
      await page.goto(`${BASE}/parent/dashboard`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "דשבורד הורים" }).waitFor({ timeout: 15_000 });
      await activityBtn.click();
      await page.waitForTimeout(1200);
      shots.push({ file: "09-assign-activity.png", path: await captureScreenshot(page, "09-assign-activity.png") });
      await page.keyboard.press("Escape").catch(() => {});
    }
  }

  const studentAccount = resolveStudentAccount();
  log("[screenshots] 10–14 — פורטל ילד");
  await page.context().clearCookies();
  await page.goto(`${BASE}/student/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  shots.push({ file: "10-student-login.png", path: await captureScreenshot(page, "10-student-login.png") });

  await loginStudent(page, studentAccount);
  await gotoStudentPage(page, "/student/home");
  shots.push({ file: "11-student-home.png", path: await captureScreenshot(page, "11-student-home.png") });

  await gotoStudentPage(page, "/student/arcade");
  shots.push({ file: "12-student-arcade.png", path: await captureScreenshot(page, "12-student-arcade.png") });

  await gotoStudentPage(page, "/student/educational-games");
  shots.push({
    file: "13-student-educational-games.png",
    path: await captureScreenshot(page, "13-student-educational-games.png"),
  });

  await gotoStudentPage(page, "/learning/math-master");
  shots.push({ file: "14-student-learning.png", path: await captureScreenshot(page, "14-student-learning.png") });

  log("[screenshots] 15 — התקנת אפליקציה להורים");
  await page.context().clearCookies();
  await page.goto(`${BASE}/parent/install-app`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(800);
  shots.push({ file: "15-parent-install-app.png", path: await captureScreenshot(page, "15-parent-install-app.png") });

  log("[screenshots] 16 — סיום / CTA");
  await page.goto(`${BASE}/parents`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
  await page.waitForTimeout(600);
  shots.push({ file: "16-parents-cta.png", path: await captureScreenshot(page, "16-parents-cta.png") });

  await browser.close();
  return shots;
}

function resolveStudentAccount() {
  const raw = String(process.env.VIRTUAL_STUDENT_ACCOUNTS || "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const first = parsed[0];
      if (first?.username && first?.pin) {
        return { username: String(first.username), pin: String(first.pin).replace(/\D/g, "").slice(0, 4) };
      }
    } catch {
      /* fall through */
    }
  }
  const username = process.env.E2E_STUDENT_USERNAME || "ADMIN";
  const pin = String(process.env.E2E_STUDENT_PIN || "1234").replace(/\D/g, "").slice(0, 4);
  return { username, pin };
}

async function buildAndExportVideo(shots, audioDurationSec) {
  assert.ok(existsSync(VOICEOVER_FILE), `Voiceover missing: ${VOICEOVER_FILE}`);
  const ffmpegOk = await checkFfmpegAvailable();
  if (!ffmpegOk) throw new Error("ffmpeg not available — add to PATH");

  const voiceBuffer = readFileSync(VOICEOVER_FILE);
  const voiceSaved = await saveMediaAsset(voiceBuffer, "audio/mpeg", basename(VOICEOVER_FILE));
  assert.equal(voiceSaved.ok, true, voiceSaved.message);

  const mediaAssets = [];
  for (const shot of shots) {
    const buf = readFileSync(shot.path);
    const saved = await saveMediaAsset(buf, "image/png", shot.file);
    assert.equal(saved.ok, true, `${shot.file}: ${saved.message}`);
    mediaAssets.push(saved.asset);
  }

  const durations = distributeDurations(audioDurationSec, shots.length);
  const animations = ["fade", "zoom"];
  const scenes = shots.map((shot, i) => ({
    id: randomUUID(),
    ...defaultSceneFields(),
    title: "",
    subtitle: "",
    mediaAssetId: mediaAssets[i].id,
    durationSec: durations[i],
    bgType: "dark",
    animation: animations[i % animations.length],
    mediaFit: "cover",
    mediaScale: "lg",
    transitionOut: i < shots.length - 1 ? "none" : "none",
  }));

  const payload = createEmptyProjectPayload(PROJECT_NAME);
  payload.scenes = scenes;
  payload.voiceoverAssetId = voiceSaved.asset.id;
  payload.defaultTransition = "crossfade";
  payload.exportQuality = "1080p";

  const created = await createVideoProject(payload);
  assert.equal(created.ok, true);

  const parsed = parseVideoProjectBody({ ...created.project, ...payload });
  assert.equal(parsed.ok, true);
  const updated = await updateVideoProject(created.project.id, parsed.payload);
  assert.equal(updated.ok, true);

  const previewDur = computePreviewTotalDurationSec(scenes, payload.defaultTransition);
  log(`[video] scenes=${scenes.length} preview=${previewDur.toFixed(2)}s audio=${audioDurationSec.toFixed(2)}s`);

  const project = { ...updated.project, scenes, voiceoverAssetId: voiceSaved.asset.id };
  const exported = await exportVideoProjectMp4(project);
  assert.equal(exported.ok, true, exported.message || "export failed");

  const srcMp4 = join(VB_OUTPUTS_DIR, `${created.project.id}.mp4`);
  const aliasPath = join(VB_OUTPUTS_DIR, OUTPUT_ALIAS);
  copyFileSync(srcMp4, aliasPath);

  return {
    projectId: created.project.id,
    srcMp4,
    aliasPath,
    outputUrl: `/admin-video-assets/outputs/${OUTPUT_ALIAS}`,
    sceneDurations: durations,
    voiceAssetId: voiceSaved.asset.id,
    previewDur,
  };
}

async function main() {
  log("=== Parent promo video builder ===");
  log(`Base URL: ${BASE}`);
  log(`Voiceover: ${basename(VOICEOVER_FILE)}`);

  const audioDurationSec = ffprobeDuration(VOICEOVER_FILE);
  assert.ok(audioDurationSec, "Could not read voiceover duration");
  log(`Audio duration: ${audioDurationSec.toFixed(2)}s`);

  await waitForServer();
  log("Dev server OK");

  const shots = await captureAllScreenshots();
  log(`Captured ${shots.length} screenshots → ${SCREENSHOT_DIR}`);

  const result = await buildAndExportVideo(shots, audioDurationSec);

  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", result.aliasPath],
    { encoding: "utf8" }
  );
  const videoDur = Number(String(probe.stdout).trim());

  log("\n=== DONE ===");
  log(`Project: ${PROJECT_NAME}`);
  log(`Project ID: ${result.projectId}`);
  log(`Screenshots: ${shots.length}`);
  shots.forEach((s, i) => log(`  ${i + 1}. ${s.file}`));
  log(`Voiceover: ${basename(VOICEOVER_FILE)} (${audioDurationSec.toFixed(1)}s)`);
  log(`Scene durations (s): ${result.sceneDurations.join(", ")}`);
  log(`Preview total: ${result.previewDur.toFixed(2)}s`);
  log(`Output: ${result.aliasPath}`);
  log(`Watch: ${BASE}${result.outputUrl}`);
  log(`Video duration: ${Number.isFinite(videoDur) ? videoDur.toFixed(2) : "?"}s`);
  log(`Audio sync delta: ${Number.isFinite(videoDur) ? Math.abs(videoDur - audioDurationSec).toFixed(2) : "?"}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
