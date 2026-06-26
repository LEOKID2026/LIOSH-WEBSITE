#!/usr/bin/env node
/**
 * Owner flow smoke for admin video builder.
 * Run: node --env-file=.env.local scripts/admin-video-builder-owner-flow.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASE = (process.env.ROLE_BOUNDARY_TEST_BASE_URL || "http://localhost:3001").replace(/\/$/, "");
const OUTPUTS_DIR = join(ROOT, "public", "admin-video-assets", "outputs");

const report = {
  ffmpegDetected: false,
  mp4Created: false,
  outputFile: null,
  audioInVideo: null,
  hebrewOk: null,
  uiIssues: [],
  limitations: [],
};

function log(msg) {
  console.log(msg);
}

async function getAdminToken() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const email =
    process.env.ADMIN_PORTAL_EMAIL || process.env.E2E_ADMIN_EMAIL || "office@leo.com";
  const password =
    process.env.ADMIN_PORTAL_PASSWORD ||
    process.env.E2E_ADMIN_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    process.env.SCHOOL_SECURITY_TEST_PASSWORD ||
    "";
  if (!url || !anonKey || !password) throw new Error("Missing Supabase env or admin password");
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Admin auth failed: ${email}`);
  return json.access_token;
}

async function api(token, method, path, body, formData) {
  const headers = { Authorization: `Bearer ${token}` };
  let reqBody = body;
  if (formData) {
    reqBody = formData;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    reqBody = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: reqBody });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function checkFfmpegCli() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return r.status === 0;
}

function ffprobe(file) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", file],
    { encoding: "utf8" }
  );
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FABJOG9V3W5Q5AAAAAElFTkSuQmCC",
  "base64"
);

async function main() {
  report.ffmpegDetected = checkFfmpegCli();
  log(`[1] ffmpeg detected: ${report.ffmpegDetected}`);
  if (!report.ffmpegDetected) {
    report.limitations.push("ffmpeg לא ב-PATH — יש להוסיף bin של WinGet ל-PATH");
  }

  const ffmpegStatus = await fetch(`${BASE}/api/admin/video-builder/ffmpeg-status`).catch(() => null);
  if (ffmpegStatus?.ok) {
    const j = await ffmpegStatus.json();
    log(`[1b] API ffmpeg-status (no auth): ${j?.data?.available}`);
  }

  const token = await getAdminToken();
  const ffAuth = await api(token, "GET", "/api/admin/video-builder/ffmpeg-status");
  log(`[1c] API ffmpeg-status (admin): available=${ffAuth.json?.data?.available}`);
  report.ffmpegDetected = Boolean(ffAuth.json?.data?.available);

  const created = await api(token, "POST", "/api/admin/video-builder", {});
  assert.equal(created.status, 201, `create failed: ${JSON.stringify(created.json)}`);
  const projectId = created.json.data.project.id;

  const scenes = [
    {
      id: crypto.randomUUID(),
      title: "ברוכים הבאים ל-Leo",
      subtitle: "פלטפורמת למידה מהנה לילדים",
      mediaAssetId: null,
      durationSec: 4,
      bgType: "colorful",
      animation: "fade",
    },
    {
      id: crypto.randomUUID(),
      title: "למידה, משחקים ותגמולים",
      subtitle: "הכל במקום אחד",
      mediaAssetId: null,
      durationSec: 4,
      bgType: "dark",
      animation: "zoom",
    },
    {
      id: crypto.randomUUID(),
      title: "הצטרפו אלינו היום",
      subtitle: "Leo — לומדים עם חיוך",
      mediaAssetId: null,
      durationSec: 4,
      bgType: "light",
      animation: "none",
    },
  ];

  const form = new FormData();
  form.append("file", new Blob([PNG], { type: "image/png" }), "leo-logo-test.png");
  const mediaUp = await api(token, "POST", "/api/admin/video-builder/media", null, form);
  assert.equal(mediaUp.status, 201, `media upload failed: ${JSON.stringify(mediaUp.json)}`);
  const logoId = mediaUp.json.data.asset.id;
  scenes[0].mediaAssetId = logoId;

  const updated = await api(token, "PUT", `/api/admin/video-builder/${projectId}`, {
    name: "בדיקת Intro",
    aspectRatio: "16:9",
    scenes,
    voiceoverAssetId: null,
  });
  assert.equal(updated.status, 200, `update failed: ${JSON.stringify(updated.json)}`);
  log(`[2-3] Project ${projectId} with 3 scenes + logo`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();

  const email =
    process.env.ADMIN_PORTAL_EMAIL || process.env.E2E_ADMIN_EMAIL || "office@leo.com";
  const password =
    process.env.ADMIN_PORTAL_PASSWORD ||
    process.env.E2E_ADMIN_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    "";

  await page.goto(`${BASE}/teacher/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\//, { timeout: 30000 });

  await page.goto(`${BASE}/admin/video-builder/${projectId}`);
  await page.waitForSelector('input[value="בדיקת Intro"], input', { timeout: 15000 });

  const nameInput = page.locator('input').first();
  await nameInput.fill("בדיקת Intro");

  try {
    await page.getByRole("button", { name: "התחל הקלטה" }).click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "עצור" }).click({ timeout: 5000 });
    await page.getByRole("button", { name: "שמור הקלטה" }).click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    log("[4] Browser voiceover recorded and saved");
  } catch (e) {
    report.uiIssues.push(`הקלטת קריינות בדפדפן: ${e.message}`);
    const wavForm = new FormData();
    const wav = spawnSync(
      "ffmpeg",
      ["-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-y", "-"],
      { encoding: "buffer" }
    );
    if (wav.status === 0 && wav.stdout?.length) {
      wavForm.append("file", new Blob([wav.stdout], { type: "audio/wav" }), "voiceover-fallback.wav");
      const voiceUp = await api(token, "POST", "/api/admin/video-builder/media", null, wavForm);
      if (voiceUp.status === 201) {
        await api(token, "PUT", `/api/admin/video-builder/${projectId}`, {
          name: "בדיקת Intro",
          aspectRatio: "16:9",
          scenes,
          voiceoverAssetId: voiceUp.json.data.asset.id,
        });
        log("[4] Fallback: uploaded WAV voiceover via API");
      }
    }
  }

  await page.getByRole("button", { name: "שמירה" }).click();
  await page.waitForTimeout(1500);
  log("[5] Saved");

  try {
    await page.getByRole("button", { name: "הפעל תצוגה" }).click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    const sceneLabel = page.locator("text=/סצנה \\d+ \\/ 3/");
    await sceneLabel.waitFor({ timeout: 5000 });
    log("[6] Preview started");
    await page.getByRole("button", { name: "עצור" }).click({ timeout: 5000 }).catch(() => {});
  } catch (e) {
    report.uiIssues.push(`Preview: ${e.message}`);
  }

  if (report.ffmpegDetected) {
    await page.getByRole("button", { name: "צור סרטון MP4" }).click({ timeout: 10000 });
    await page.waitForTimeout(8000);
    const exportMsg = await page.locator("text=/נוצר בהצלחה|יצוא נכשל|ffmpeg/").first().textContent().catch(() => "");
    log(`[7] Export UI message: ${exportMsg}`);
    if (exportMsg?.includes("ffmpeg")) report.uiIssues.push(exportMsg);
  } else {
    const exp = await api(token, "POST", `/api/admin/video-builder/${projectId}/export`);
    log(`[7] Export API: ${exp.status} ${exp.json?.error?.message || exp.json?.data?.outputUrl || ""}`);
  }

  await browser.close();

  if (report.ffmpegDetected) {
    const expApi = await api(token, "POST", `/api/admin/video-builder/${projectId}/export`);
    if (expApi.status === 200) {
      report.outputFile = expApi.json.data.outputUrl?.replace(/^\//, "") || null;
      report.mp4Created = true;
    } else {
      report.limitations.push(expApi.json?.error?.message || "export API failed");
    }
  }

  const outputName = `${projectId}.mp4`;
  const outputPath = join(OUTPUTS_DIR, outputName);
  if (existsSync(outputPath)) {
    report.mp4Created = true;
    report.outputFile = `public/admin-video-assets/outputs/${outputName}`;
    const st = statSync(outputPath);
    log(`[8] Output exists: ${outputPath} (${st.size} bytes)`);

    const probe = ffprobe(outputPath);
    if (probe?.streams) {
      const types = probe.streams.map((s) => s.codec_type);
      report.audioInVideo = types.includes("audio");
      const dur = probe.streams.find((s) => s.codec_type === "video")?.duration;
      log(`[9] Streams: ${types.join(", ")} duration~${dur}s`);
      if (Number(dur) < 8 || Number(dur) > 20) {
        report.uiIssues.push(`משך סרטון חריג: ${dur}s (צפוי ~12s)`);
      }
    }
    report.hebrewOk = "not_verified_visually";
  }

  log("\n=== OWNER FLOW REPORT ===");
  log(`ffmpeg detected: ${report.ffmpegDetected}`);
  log(`MP4 created: ${report.mp4Created}`);
  log(`Output file: ${report.outputFile}`);
  log(`Audio in video: ${report.audioInVideo}`);
  log(`Hebrew: ${report.hebrewOk} (requires visual check of drawtext)`);
  log(`UI issues: ${report.uiIssues.length ? report.uiIssues.join("; ") : "none"}`);
  log(`Limitations: ${report.limitations.length ? report.limitations.join("; ") : "none"}`);

  await api(token, "DELETE", `/api/admin/video-builder/${projectId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
