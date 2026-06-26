#!/usr/bin/env node
/** Create sample intro video via admin API. */
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "http://localhost:3001").replace(/\/$/, "");

async function getToken() {
  const url = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_LEARNING_SUPABASE_ANON_KEY;
  const email = process.env.ADMIN_PORTAL_EMAIL || process.env.E2E_ADMIN_EMAIL || "office@leo.com";
  const password =
    process.env.ADMIN_PORTAL_PASSWORD ||
    process.env.E2E_ADMIN_PASSWORD ||
    process.env.SCHOOL_QA_PASSWORD ||
    "";
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("Admin auth failed");
  return j.access_token;
}

async function api(token, method, path, body, form) {
  const headers = { Authorization: `Bearer ${token}` };
  let reqBody = form || (body ? JSON.stringify(body) : undefined);
  if (body && !form) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, { method, headers, body: reqBody });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB" +
  "nElEQVR4nO2bS0hUURzHf+feOffOjD5mHh9jY5qP0dJCCiKCFi1atIggiCBoE0QQBFq0aBFBQRC0" +
  "aNGiRYsWLVq0aNGiRYsW/Q8tWrRo0aJFixYtWrRo0aJFixYtWrRo0aJFixYtWrRo0aJFixYt" +
  "WrRo0aJFixb/AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8D/gH0" +
  "XkF8V5K5mgAAAABJRU5ErkJggg==",
  "base64"
);

function makeWav() {
  const r = spawnSync(
    "ffmpeg",
    ["-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-y", "-f", "wav", "-"],
    { encoding: "buffer" }
  );
  if (r.status !== 0) throw new Error("ffmpeg wav failed");
  return r.stdout;
}

async function main() {
  const token = await getToken();

  const ff = await api(token, "GET", "/api/admin/video-builder/ffmpeg-status");
  console.log("ffmpeg available:", ff.json?.data?.available);
  if (!ff.json?.data?.available) {
    console.error("Restart dev server with ffmpeg in PATH first.");
    process.exit(1);
  }

  const created = await api(token, "POST", "/api/admin/video-builder", {});
  assert.equal(created.status, 201);
  const id = created.json.data.project.id;

  const logoForm = new FormData();
  logoForm.append("file", new Blob([PNG], { type: "image/png" }), "leo-logo.png");
  const logo = await api(token, "POST", "/api/admin/video-builder/media", null, logoForm);
  assert.equal(logo.status, 201);

  const voiceForm = new FormData();
  voiceForm.append("file", new Blob([makeWav()], { type: "audio/wav" }), "voiceover.wav");
  const voice = await api(token, "POST", "/api/admin/video-builder/media", null, voiceForm);
  assert.equal(voice.status, 201);

  const scenes = [
    {
      id: crypto.randomUUID(),
      title: "ברוכים הבאים ל-Leo",
      subtitle: "פלטפורמת למידה מהנה לילדים",
      mediaAssetId: logo.json.data.asset.id,
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
      mediaAssetId: logo.json.data.asset.id,
      durationSec: 4,
      bgType: "light",
      animation: "none",
    },
  ];

  const saved = await api(token, "PUT", `/api/admin/video-builder/${id}`, {
    name: "בדיקת Intro",
    aspectRatio: "16:9",
    scenes,
    voiceoverAssetId: voice.json.data.asset.id,
  });
  assert.equal(saved.status, 200);
  console.log("Project saved:", id);

  const exp = await api(token, "POST", `/api/admin/video-builder/${id}/export`);
  if (exp.status !== 200) {
    console.error("Export failed:", exp.json?.error?.message || exp.status);
    process.exit(1);
  }

  const outUrl = exp.json.data.outputUrl;
  const outPath = join(ROOT, "public", outUrl.replace(/^\//, ""));
  assert.ok(existsSync(outPath));
  const size = statSync(outPath).size;
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", outPath],
    { encoding: "utf8" }
  );
  const streams = JSON.parse(probe.stdout || "{}").streams || [];
  console.log("\n=== Sample video ready ===");
  console.log("Name: בדיקת Intro");
  console.log("Project ID:", id);
  console.log("File:", outPath);
  console.log("Size:", size, "bytes");
  console.log("Streams:", streams.map((s) => s.codec_type).join(", "));
  console.log("Watch:", `${BASE}${outUrl}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
