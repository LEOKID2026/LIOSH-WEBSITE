#!/usr/bin/env node
/**
 * Create 3 placeholder promo template videos (no screenshots, no logins).
 * Run: node scripts/create-promo-template-videos.mjs
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  checkFfmpegAvailable,
  createEmptyProjectPayload,
  createVideoProject,
  exportVideoProjectMp4,
  saveMediaAsset,
  updateVideoProject,
  parseVideoProjectBody,
  getVideoProject,
  listMediaAssets,
  VB_OUTPUTS_DIR,
  VB_UPLOADS_DIR,
  VB_MEDIA_INDEX_FILE,
} from "../lib/admin-server/admin-video-builder.server.js";
import { defaultSceneFields } from "../lib/admin-portal/admin-video-builder-catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FFMPEG_BIN =
  process.env.FFMPEG_BIN ||
  "C:\\Users\\ERAN YOSEF\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin";
if (existsSync(FFMPEG_BIN)) {
  process.env.PATH = `${FFMPEG_BIN};${process.env.PATH || ""}`;
}

const FONT = "C\\:/Windows/Fonts/segoeui.ttf";
const PARENT_AUDIO = join(
  ROOT,
  "ElevenLabs_2026-06-26T14_39_02_Hope - Professional, Clear and Natural_pvc_sp100_s50_sb75_v3.mp3"
);
const KIDS_AUDIO = join(
  ROOT,
  "ElevenLabs_2026-06-26T15_19_56_Hope - Professional, Clear and Natural_pvc_sp100_s50_sb75_v3.mp3"
);
const PARENT_PROJECT_ID = "3da4d4eb-31ba-4c45-864b-744f5d4656d1";
const PARENT_VOICEOVER_ASSET_ID = "e64d5ab3-b1d8-4112-9492-2586fcf36d51";

const report = {
  videos: [],
  issues: [],
};

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

function ffprobeStreams(filePath) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", filePath],
    { encoding: "utf8" }
  );
  if (r.status !== 0) return null;
  try {
    return JSON.parse(r.stdout || "{}").streams || [];
  } catch {
    return null;
  }
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function generatePlaceholderPng(outPath, { width, height, label, sceneNum }) {
  mkdirSync(dirname(outPath), { recursive: true });
  const num = pad2(sceneNum);
  const filter = [
    `drawtext=fontfile='${FONT}':text='${label}':fontsize=${width >= height ? 56 : 48}:fontcolor=white:borderw=2:bordercolor=black@0.5:x=(w-text_w)/2:y=(h-text_h)/2-30`,
    `drawtext=fontfile='${FONT}':text='${num}':fontsize=44:fontcolor=white:borderw=2:bordercolor=black@0.5:x=48:y=48`,
  ].join(",");
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=0x1e293b:s=${width}x${height}:d=1`,
      "-vf",
      filter,
      "-frames:v",
      "1",
      outPath,
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0 || !existsSync(outPath)) {
    throw new Error(`ffmpeg placeholder failed for ${outPath}: ${r.stderr?.slice(-400)}`);
  }
  const size = statSync(outPath).size;
  if (size < 500) throw new Error(`Placeholder too small: ${outPath}`);
  return outPath;
}

async function registerPromoFolderAsset(subdir, filename) {
  const diskPath = join(VB_UPLOADS_DIR, subdir, filename);
  assert.ok(existsSync(diskPath), `Missing ${diskPath}`);
  const sizeBytes = statSync(diskPath).size;
  assert.ok(sizeBytes >= 500, `Asset too small: ${diskPath}`);

  const url = `/admin-video-assets/uploads/${subdir.replace(/\\/g, "/")}/${filename}`;
  const assets = await listMediaAssets();
  const existing = assets.find((a) => a.url === url);
  if (existing) return existing;

  const asset = {
    id: randomUUID(),
    filename,
    storedName: `${subdir}/${filename}`,
    mimeType: "image/png",
    type: "image",
    url,
    sizeBytes,
    uploadedAt: new Date().toISOString(),
  };
  assets.unshift(asset);
  writeFileSync(VB_MEDIA_INDEX_FILE, JSON.stringify(assets, null, 2), "utf8");
  return asset;
}

function createPlaceholderSet(subdir, prefix, count, { width, height, label }) {
  const paths = [];
  for (let i = 1; i <= count; i++) {
    const filename = `${pad2(i)}-${prefix}.png`;
    const outPath = join(VB_UPLOADS_DIR, subdir, filename);
    generatePlaceholderPng(outPath, { width, height, label, sceneNum: i });
    paths.push({ filename, fullPath: outPath, subdir });
  }
  return paths;
}

async function ensureVoiceoverAsset(filePath) {
  const basename = filePath.split(/[/\\]/).pop();
  const assets = await listMediaAssets();
  const hit = assets.find((a) => a.filename === basename);
  if (hit) return hit;

  const buf = readFileSync(filePath);
  const saved = await saveMediaAsset(buf, "audio/mpeg", basename);
  assert.equal(saved.ok, true, saved.message);
  return saved.asset;
}

function sceneTemplateFromParent(parentScenes, index) {
  const ref = parentScenes[index] || parentScenes[parentScenes.length - 1];
  return {
    animation: ref.animation,
    durationSec: ref.durationSec,
  };
}

async function buildVideo({
  projectName,
  aspectRatio,
  voiceoverAssetId,
  placeholderPaths,
  sceneTemplates,
  outputAlias,
}) {
  const mediaAssets = [];
  for (const p of placeholderPaths) {
    const asset = await registerPromoFolderAsset(p.subdir, p.filename);
    mediaAssets.push(asset);
  }

  const uniqueUrls = new Set(mediaAssets.map((a) => a.url));
  assert.equal(uniqueUrls.size, mediaAssets.length, "Each scene must have a unique image file URL");

  const animations = ["fade", "zoom"];
  const scenes = placeholderPaths.map((p, i) => {
    const tpl = sceneTemplates[i] || {};
    return {
      id: randomUUID(),
      ...defaultSceneFields(),
      title: "",
      subtitle: "",
      mediaAssetId: mediaAssets[i].id,
      durationSec: tpl.durationSec ?? 4.74,
      bgType: "dark",
      animation: tpl.animation ?? animations[i % animations.length],
      mediaFit: "cover",
      mediaScale: "lg",
    };
  });

  const payload = createEmptyProjectPayload(projectName);
  payload.aspectRatio = aspectRatio;
  payload.scenes = scenes;
  payload.voiceoverAssetId = voiceoverAssetId;
  payload.defaultTransition = "crossfade";
  payload.exportQuality = "1080p";

  const created = await createVideoProject(payload);
  assert.equal(created.ok, true);

  const parsed = parseVideoProjectBody({ ...created.project, ...payload });
  assert.equal(parsed.ok, true);
  const updated = await updateVideoProject(created.project.id, parsed.payload);
  assert.equal(updated.ok, true);

  const project = { ...updated.project, scenes, voiceoverAssetId };
  const exported = await exportVideoProjectMp4(project);
  assert.equal(exported.ok, true, exported.message || "export failed");

  const srcMp4 = join(VB_OUTPUTS_DIR, `${created.project.id}.mp4`);
  const aliasPath = join(VB_OUTPUTS_DIR, outputAlias);
  copyFileSync(srcMp4, aliasPath);

  const duration = ffprobeDuration(aliasPath);
  const streams = ffprobeStreams(aliasPath) || [];
  const hasAudio = streams.some((s) => s.codec_type === "audio");
  const hasVideo = streams.some((s) => s.codec_type === "video");

  return {
    projectName,
    projectId: created.project.id,
    aspectRatio,
    outputAlias,
    outputPath: aliasPath,
    outputUrl: `/admin-video-assets/outputs/${outputAlias}`,
    durationSec: duration,
    sceneCount: scenes.length,
    imageDir: join(VB_UPLOADS_DIR, placeholderPaths[0].subdir),
    images: placeholderPaths.map((p) => ({
      filename: p.filename,
      fullPath: p.fullPath,
      url: `/admin-video-assets/uploads/${p.subdir.replace(/\\/g, "/")}/${p.filename}`,
      assetId: mediaAssets.find((a) => a.filename === p.filename)?.id,
    })),
    uniqueImageFiles: uniqueUrls.size,
    hasAudio,
    hasVideo,
    sceneDurations: scenes.map((s) => s.durationSec),
  };
}

async function main() {
  log("=== Promo template videos (placeholders only) ===");

  const ffmpegOk = await checkFfmpegAvailable();
  assert.ok(ffmpegOk, "ffmpeg not available");

  const parentProject = await getVideoProject(PARENT_PROJECT_ID);
  assert.equal(parentProject.ok, true, "Parent reference project missing");
  const parentScenes = parentProject.project.scenes || [];
  const parentSceneCount = parentScenes.length;
  const parentTemplates = parentScenes.map((s) => ({
    durationSec: s.durationSec,
    animation: s.animation,
  }));

  assert.ok(existsSync(PARENT_AUDIO), `Missing parent audio: ${PARENT_AUDIO}`);
  assert.ok(existsSync(KIDS_AUDIO), `Missing kids audio: ${KIDS_AUDIO}`);

  const kidsDuration = ffprobeDuration(KIDS_AUDIO);
  assert.ok(kidsDuration, "Could not read kids audio duration");
  const kidsSceneCount = 16;
  const kidsDurations = distributeDurations(kidsDuration, kidsSceneCount);
  const kidsTemplates = kidsDurations.map((durationSec, i) => ({
    durationSec,
    animation: parentTemplates[i]?.animation ?? (i % 2 === 0 ? "fade" : "zoom"),
  }));

  log(`Parent reference: ${parentSceneCount} scenes`);
  log(`Kids audio: ${kidsDuration.toFixed(2)}s → ${kidsSceneCount} scenes`);

  const kidsVoice = await ensureVoiceoverAsset(KIDS_AUDIO);

  // 1. Parent mobile 9:16
  log("\n[1/3] Parent mobile...");
  const parentMobilePaths = createPlaceholderSet("parent-mobile-promo", "parent-mobile-placeholder", parentSceneCount, {
    width: 1080,
    height: 1920,
    label: "להחלפה - מובייל",
  });
  const parentMobile = await buildVideo({
    projectName: "סרטון הורים מובייל - טיוטה 1",
    aspectRatio: "9:16",
    voiceoverAssetId: PARENT_VOICEOVER_ASSET_ID,
    placeholderPaths: parentMobilePaths,
    sceneTemplates: parentTemplates,
    outputAlias: "leo-kids-parent-mobile-promo-draft-1.mp4",
  });
  report.videos.push({ ...parentMobile, voiceoverFile: PARENT_AUDIO.split(/[/\\]/).pop() });

  // 2. Kids desktop 16:9
  log("\n[2/3] Kids desktop...");
  const kidsDesktopPaths = createPlaceholderSet("kids-desktop-promo", "kids-desktop-placeholder", kidsSceneCount, {
    width: 1920,
    height: 1080,
    label: "להחלפה - דסקטופ",
  });
  const kidsDesktop = await buildVideo({
    projectName: "סרטון ילדים דסקטופ - טיוטה 1",
    aspectRatio: "16:9",
    voiceoverAssetId: kidsVoice.id,
    placeholderPaths: kidsDesktopPaths,
    sceneTemplates: kidsTemplates,
    outputAlias: "leo-kids-kids-desktop-promo-draft-1.mp4",
  });
  report.videos.push({ ...kidsDesktop, voiceoverFile: KIDS_AUDIO.split(/[/\\]/).pop() });

  // 3. Kids mobile 9:16
  log("\n[3/3] Kids mobile...");
  const kidsMobilePaths = createPlaceholderSet("kids-mobile-promo", "kids-mobile-placeholder", kidsSceneCount, {
    width: 1080,
    height: 1920,
    label: "להחלפה - מובייל",
  });
  const kidsMobile = await buildVideo({
    projectName: "סרטון ילדים מובייל - טיוטה 1",
    aspectRatio: "9:16",
    voiceoverAssetId: kidsVoice.id,
    placeholderPaths: kidsMobilePaths,
    sceneTemplates: kidsTemplates,
    outputAlias: "leo-kids-kids-mobile-promo-draft-1.mp4",
  });
  report.videos.push({ ...kidsMobile, voiceoverFile: KIDS_AUDIO.split(/[/\\]/).pop() });

  log("\n=== REPORT ===");
  for (const v of report.videos) {
    log(`\nProject: ${v.projectName}`);
    log(`  ID: ${v.projectId}`);
    log(`  Aspect: ${v.aspectRatio}`);
    log(`  Voiceover: ${v.voiceoverFile}`);
    log(`  MP4: ${v.outputAlias} (${v.durationSec?.toFixed(2)}s)`);
    log(`  Scenes: ${v.sceneCount}`);
    log(`  Images dir: ${v.imageDir}`);
    log(`  Unique image files: ${v.uniqueImageFiles}`);
    log(`  Audio OK: ${v.hasAudio}, Video OK: ${v.hasVideo}`);
    log(`  Scene durations: ${v.sceneDurations.join(", ")}`);
    log("  Images:");
    for (const img of v.images) {
      log(`    ${img.fullPath}`);
    }
    if (!v.hasAudio || !v.hasVideo) {
      report.issues.push(`${v.projectName}: missing ${!v.hasVideo ? "video" : ""} ${!v.hasAudio ? "audio" : ""}`);
    }
  }

  if (report.issues.length) {
    log("\nIssues:");
    report.issues.forEach((i) => log(`  - ${i}`));
    process.exit(1);
  }

  log("\nAll 3 template videos exported successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
