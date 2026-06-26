/**
 * Admin video builder — local JSON storage + media on disk.
 * MVP: data/admin-video-builder/ + public/admin-video-assets/
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  VB_ANIMATION_IDS,
  VB_BACKGROUND_IDS,
  VB_MEDIA_OVERLAY_IDS,
  VB_TEXT_ALIGN_IDS,
  VB_TEXT_SHADOW_IDS,
  VB_TEXT_SIZE_IDS,
  VB_ANIMATIONS,
  VB_MEDIA_OVERLAYS,
  VB_TEXT_SIZES,
  VB_TEXT_SHADOWS,
  VB_TRANSITION_IDS,
  VB_TEXT_BG_IDS,
  VB_FONT_IDS,
  VB_MEDIA_POSITION_IDS,
  VB_MEDIA_SCALE_IDS,
  VB_WATERMARK_POSITION_IDS,
  VB_EXPORT_QUALITY_IDS,
  VB_TRANSITIONS,
  VB_TEXT_BACKGROUNDS,
  VB_FONTS,
  VB_WATERMARK_POSITIONS,
  VB_MEDIA_SCALE_FACTOR,
  VB_MEDIA_POSITION_Y,
  VB_MEDIA_FIT_IDS,
  VB_MEDIA_CROP_Y,
  buildFfmpegBackgroundInput,
  ffmpegTextXExpr,
  hexToFfmpegColor,
  isValidHexColor,
  normalizeSceneStyle,
  normalizeProjectSettings,
  defaultSceneFields,
  defaultProjectFields,
  getExportDimensions,
  VB_ASPECT_RATIOS,
} from "../admin-portal/admin-video-builder-catalog.js";

export const VB_DATA_DIR = path.join(process.cwd(), "data", "admin-video-builder");
export const VB_PROJECTS_DIR = path.join(VB_DATA_DIR, "projects");
export const VB_INDEX_FILE = path.join(VB_DATA_DIR, "projects-index.json");
export const VB_MEDIA_INDEX_FILE = path.join(VB_DATA_DIR, "media-index.json");

export const VB_ASSETS_DIR = path.join(process.cwd(), "public", "admin-video-assets");
export const VB_UPLOADS_DIR = path.join(VB_ASSETS_DIR, "uploads");
export const VB_OUTPUTS_DIR = path.join(VB_ASSETS_DIR, "outputs");

const ADMIN_VIDEO_ASSETS_PREFIX = "admin-video-assets/";

/** @param {string} urlPath Public URL e.g. /admin-video-assets/uploads/foo.png */
export function resolveAdminVideoAssetPath(urlPath) {
  const rel = String(urlPath ?? "").replace(/^\/+/, "");
  if (!rel.startsWith(ADMIN_VIDEO_ASSETS_PREFIX)) return null;
  return path.join(VB_ASSETS_DIR, rel.slice(ADMIN_VIDEO_ASSETS_PREFIX.length));
}

export const VB_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const VB_ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
]);

export const VB_FFMPEG_UNAVAILABLE_HE =
  "ffmpeg לא מותקן או לא זמין במערכת. התקינ/י ffmpeg והוסיפ/י אותו ל-PATH כדי לייצא MP4.";

/** @param {unknown} raw */
export function sanitizeVideoProjectName(raw) {
  const name = String(raw ?? "").trim();
  if (!name) return { ok: false, code: "missing_name", message: "שם הסרטון חסר" };
  if (name.length > 120) return { ok: false, code: "name_too_long", message: "שם הסרטון ארוך מדי" };
  return { ok: true, name };
}

/** @param {unknown} raw */
export function parseAspectRatio(raw) {
  const ratio = String(raw ?? "16:9").trim();
  if (!VB_ASPECT_RATIOS[ratio]) {
    return { ok: false, code: "invalid_aspect_ratio", message: "יחס מסך לא תקין" };
  }
  return { ok: true, aspectRatio: ratio };
}

/** @param {unknown} raw */
function parseScene(raw, index) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "invalid_scene", message: `סצנה ${index + 1} אינה תקינה` };
  }
  const s = /** @type {Record<string, unknown>} */ (raw);
  const title = String(s.title ?? "").slice(0, 200);
  const subtitle = String(s.subtitle ?? "").slice(0, 400);
  const durationSec = Number(s.durationSec);
  if (!Number.isFinite(durationSec) || durationSec < 1 || durationSec > 120) {
    return { ok: false, code: "invalid_duration", message: `משך סצנה ${index + 1} חייב להיות בין 1 ל-120 שניות` };
  }
  const bgType = String(s.bgType ?? "light");
  if (!VB_BACKGROUND_IDS.includes(bgType)) {
    return { ok: false, code: "invalid_bg", message: `סוג רקע בסצנה ${index + 1} אינו תקין` };
  }
  const animation = String(s.animation ?? "none");
  if (!VB_ANIMATION_IDS.includes(animation)) {
    return { ok: false, code: "invalid_animation", message: `אנימציה בסצנה ${index + 1} אינה תקינה` };
  }
  const titleSize = String(s.titleSize ?? "md");
  const subtitleSize = String(s.subtitleSize ?? "md");
  const textAlign = String(s.textAlign ?? "center");
  const textShadow = String(s.textShadow ?? "soft");
  const mediaOverlay = String(s.mediaOverlay ?? "none");
  if (!VB_TEXT_SIZE_IDS.includes(titleSize) || !VB_TEXT_SIZE_IDS.includes(subtitleSize)) {
    return { ok: false, code: "invalid_text_size", message: `גודל טקסט בסצנה ${index + 1} אינו תקין` };
  }
  if (!VB_TEXT_ALIGN_IDS.includes(textAlign)) {
    return { ok: false, code: "invalid_text_align", message: `יישור טקסט בסצנה ${index + 1} אינו תקין` };
  }
  if (!VB_TEXT_SHADOW_IDS.includes(textShadow)) {
    return { ok: false, code: "invalid_text_shadow", message: `צל טקסט בסצנה ${index + 1} אינו תקין` };
  }
  if (!VB_MEDIA_OVERLAY_IDS.includes(mediaOverlay)) {
    return { ok: false, code: "invalid_overlay", message: `שכבת כיסוי בסצנה ${index + 1} אינה תקינה` };
  }
  const titleColor = s.titleColor != null && isValidHexColor(s.titleColor) ? String(s.titleColor) : null;
  const subtitleColor =
    s.subtitleColor != null && isValidHexColor(s.subtitleColor) ? String(s.subtitleColor) : null;
  const transitionOut = String(s.transitionOut ?? "none");
  const textBg = String(s.textBg ?? "none");
  const fontFamily = String(s.fontFamily ?? "segoe");
  const mediaPosition = String(s.mediaPosition ?? "center");
  const mediaScale = String(s.mediaScale ?? "md");
  const mediaFit = String(s.mediaFit ?? "contain");
  const titleBold = Boolean(s.titleBold);
  if (!VB_TRANSITION_IDS.includes(transitionOut)) {
    return { ok: false, code: "invalid_transition", message: `מעבר בסצנה ${index + 1} אינו תקין` };
  }
  if (!VB_TEXT_BG_IDS.includes(textBg)) {
    return { ok: false, code: "invalid_text_bg", message: `רקע טקסט בסצנה ${index + 1} אינו תקין` };
  }
  if (!VB_FONT_IDS.includes(fontFamily)) {
    return { ok: false, code: "invalid_font", message: `גופן בסצנה ${index + 1} אינו תקין` };
  }
  if (!VB_MEDIA_POSITION_IDS.includes(mediaPosition) || !VB_MEDIA_SCALE_IDS.includes(mediaScale)) {
    return { ok: false, code: "invalid_media_layout", message: `פריסת מדיה בסצנה ${index + 1} אינה תקינה` };
  }
  if (!VB_MEDIA_FIT_IDS.includes(mediaFit)) {
    return { ok: false, code: "invalid_media_fit", message: `התאמת מדיה בסצנה ${index + 1} אינה תקינה` };
  }
  const mediaAssetId = s.mediaAssetId != null ? String(s.mediaAssetId).trim() || null : null;
  const id = s.id != null && String(s.id).trim() ? String(s.id).trim() : randomUUID();
  return {
    ok: true,
    scene: {
      id,
      title,
      subtitle,
      mediaAssetId,
      durationSec,
      bgType,
      animation,
      titleColor,
      subtitleColor,
      titleSize,
      subtitleSize,
      textAlign,
      textShadow,
      mediaOverlay,
      transitionOut,
      textBg,
      fontFamily,
      titleBold,
      mediaPosition,
      mediaScale,
      mediaFit,
    },
  };
}

/** @param {unknown} body */
export function parseVideoProjectBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_body", message: "גוף הבקשה אינו תקין" };
  }
  const b = /** @type {Record<string, unknown>} */ (body);
  const nameParsed = sanitizeVideoProjectName(b.name);
  if (!nameParsed.ok) return nameParsed;
  const ratioParsed = parseAspectRatio(b.aspectRatio);
  if (!ratioParsed.ok) return ratioParsed;

  const rawScenes = Array.isArray(b.scenes) ? b.scenes : [];
  /** @type {ReturnType<typeof parseScene>["scene"][]} */
  const scenes = [];
  for (let i = 0; i < rawScenes.length; i++) {
    const parsed = parseScene(rawScenes[i], i);
    if (!parsed.ok) return parsed;
    scenes.push(parsed.scene);
  }

  const voiceoverAssetId =
    b.voiceoverAssetId != null ? String(b.voiceoverAssetId).trim() || null : null;
  const settings = normalizeProjectSettings({
    voiceoverAssetId,
    backgroundMusicAssetId: b.backgroundMusicAssetId,
    voiceoverVolume: b.voiceoverVolume,
    backgroundMusicVolume: b.backgroundMusicVolume,
    watermarkAssetId: b.watermarkAssetId,
    watermarkPosition: b.watermarkPosition,
    exportQuality: b.exportQuality,
    defaultTransition: b.defaultTransition,
  });

  return {
    ok: true,
    payload: {
      name: nameParsed.name,
      aspectRatio: ratioParsed.aspectRatio,
      scenes,
      ...settings,
    },
  };
}

export async function ensureVideoBuilderDirs() {
  await fs.mkdir(VB_PROJECTS_DIR, { recursive: true });
  await fs.mkdir(VB_UPLOADS_DIR, { recursive: true });
  await fs.mkdir(VB_OUTPUTS_DIR, { recursive: true });
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function projectFilePath(id) {
  return path.join(VB_PROJECTS_DIR, `${id}.json`);
}

/** @returns {Promise<Array<{ id: string, name: string, status: string, updatedAt: string, outputMp4Path: string | null, archived?: boolean }>>} */
export async function listVideoProjects(options = {}) {
  await ensureVideoBuilderDirs();
  const includeArchived = options.includeArchived === true;
  const index = await readJsonFile(VB_INDEX_FILE, []);
  const rows = Array.isArray(index) ? index : [];
  if (includeArchived) return rows;
  return rows.filter((p) => !p.archived);
}

function indexEntryFromProject(project, previous = {}) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    updatedAt: project.updatedAt,
    outputMp4Path: project.outputMp4Path ?? null,
    archived: Boolean(project.archived ?? previous.archived),
  };
}

/** @param {string} id */
export async function getVideoProject(id) {
  await ensureVideoBuilderDirs();
  const filePath = projectFilePath(id);
  if (!existsSync(filePath)) return { ok: false, code: "not_found", message: "הסרטון לא נמצא" };
  const project = await readJsonFile(filePath, null);
  if (!project) return { ok: false, code: "not_found", message: "הסרטון לא נמצא" };
  return { ok: true, project };
}

/** @param {ReturnType<typeof parseVideoProjectBody>["payload"]} payload */
export async function createVideoProject(payload) {
  await ensureVideoBuilderDirs();
  const id = randomUUID();
  const now = new Date().toISOString();
  const project = {
    id,
    ...payload,
    status: "draft",
    outputMp4Path: null,
    createdAt: now,
    updatedAt: now,
  };
  await writeJsonFile(projectFilePath(id), project);
  const index = await readJsonFile(VB_INDEX_FILE, []);
  const rows = Array.isArray(index) ? index : [];
  rows.unshift(indexEntryFromProject(project));
  await writeJsonFile(VB_INDEX_FILE, rows);
  return { ok: true, project };
}

/**
 * @param {string} id
 * @param {ReturnType<typeof parseVideoProjectBody>["payload"]} payload
 */
export async function updateVideoProject(id, payload) {
  const existing = await getVideoProject(id);
  if (!existing.ok) return existing;
  const now = new Date().toISOString();
  const project = {
    ...existing.project,
    ...payload,
    id,
    updatedAt: now,
  };
  await writeJsonFile(projectFilePath(id), project);
  const index = await readJsonFile(VB_INDEX_FILE, []);
  const rows = Array.isArray(index) ? index : [];
  const idx = rows.findIndex((p) => p.id === id);
  if (idx !== -1) {
    rows[idx] = indexEntryFromProject(project, rows[idx]);
    await writeJsonFile(VB_INDEX_FILE, rows);
  }
  return { ok: true, project };
}

/** @param {string} id @param {boolean} archived */
export async function setVideoProjectArchived(id, archived) {
  const existing = await getVideoProject(id);
  if (!existing.ok) return existing;
  const now = new Date().toISOString();
  const project = {
    ...existing.project,
    archived: Boolean(archived),
    updatedAt: now,
  };
  await writeJsonFile(projectFilePath(id), project);
  const index = await readJsonFile(VB_INDEX_FILE, []);
  const rows = Array.isArray(index) ? index : [];
  const idx = rows.findIndex((p) => p.id === id);
  if (idx !== -1) {
    rows[idx] = indexEntryFromProject(project, rows[idx]);
    await writeJsonFile(VB_INDEX_FILE, rows);
  }
  return { ok: true, project };
}

/** @param {string} id */
export async function deleteVideoProject(id) {
  const existing = await getVideoProject(id);
  if (!existing.ok) return existing;
  await fs.unlink(projectFilePath(id)).catch(() => {});
  const index = await readJsonFile(VB_INDEX_FILE, []);
  const rows = Array.isArray(index) ? index : [];
  await writeJsonFile(
    VB_INDEX_FILE,
    rows.filter((p) => p.id !== id)
  );
  if (existing.project.outputMp4Path) {
    const outputFile = resolveAdminVideoAssetPath(existing.project.outputMp4Path);
    if (outputFile) await fs.unlink(outputFile).catch(() => {});
  }
  return { ok: true };
}

/** @returns {Promise<Array<Record<string, unknown>>>} */
export async function listMediaAssets() {
  await ensureVideoBuilderDirs();
  const index = await readJsonFile(VB_MEDIA_INDEX_FILE, []);
  return Array.isArray(index) ? index : [];
}

function inferMediaType(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

function extFromMime(mimeType, originalFilename) {
  const map = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/webm": ".webm",
  };
  if (map[mimeType]) return map[mimeType];
  const ext = path.extname(originalFilename || "").toLowerCase();
  return ext || ".bin";
}

/**
 * @param {Buffer} buffer
 * @param {string | null} contentType
 * @param {string | null} originalFilename
 */
export async function saveMediaAsset(buffer, contentType, originalFilename) {
  await ensureVideoBuilderDirs();
  if (!buffer?.length) {
    return { ok: false, code: "missing_file", message: "קובץ חסר" };
  }
  if (buffer.length > VB_MAX_UPLOAD_BYTES) {
    return { ok: false, code: "file_too_large", message: "הקובץ גדול מדי (מקסימום 50MB)" };
  }
  const mimeType = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (!VB_ALLOWED_MIME.has(mimeType)) {
    return { ok: false, code: "invalid_type", message: "סוג קובץ לא נתמך" };
  }
  const id = randomUUID();
  const ext = extFromMime(mimeType, originalFilename);
  const storedName = `${id}${ext}`;
  const diskPath = path.join(VB_UPLOADS_DIR, storedName);
  await fs.writeFile(diskPath, buffer);
  const url = `/admin-video-assets/uploads/${storedName}`;
  const asset = {
    id,
    filename: originalFilename || storedName,
    storedName,
    mimeType,
    type: inferMediaType(mimeType),
    url,
    sizeBytes: buffer.length,
    uploadedAt: new Date().toISOString(),
  };
  const index = await listMediaAssets();
  index.unshift(asset);
  await writeJsonFile(VB_MEDIA_INDEX_FILE, index);
  return { ok: true, asset };
}

/** @param {string} assetId */
export async function getMediaAssetById(assetId) {
  const assets = await listMediaAssets();
  return assets.find((a) => a.id === assetId) || null;
}

/** @param {string} assetId */
async function detachMediaAssetFromProjects(assetId) {
  const id = String(assetId);
  const projects = await listVideoProjects();
  const now = new Date().toISOString();
  for (const entry of projects) {
    const full = await getVideoProject(entry.id);
    if (!full.ok) continue;
    const project = full.project;
    let changed = false;
    /** @type {Record<string, unknown>} */
    const next = { ...project };
    if (String(next.voiceoverAssetId || "") === id) {
      next.voiceoverAssetId = null;
      changed = true;
    }
    if (String(next.backgroundMusicAssetId || "") === id) {
      next.backgroundMusicAssetId = null;
      changed = true;
    }
    if (String(next.watermarkAssetId || "") === id) {
      next.watermarkAssetId = null;
      changed = true;
    }
    if (Array.isArray(next.scenes)) {
      const scenes = next.scenes.map((scene) => {
        if (String(scene?.mediaAssetId || "") === id) {
          changed = true;
          return { ...scene, mediaAssetId: null };
        }
        return scene;
      });
      if (changed) next.scenes = scenes;
    }
    if (changed) {
      await writeJsonFile(projectFilePath(String(entry.id)), { ...next, updatedAt: now });
    }
  }
}

/** @param {string} assetId */
export async function deleteMediaAsset(assetId) {
  await ensureVideoBuilderDirs();
  const id = String(assetId || "").trim();
  if (!id) {
    return { ok: false, code: "missing_id", message: "מזהה קובץ חסר" };
  }
  const assets = await listMediaAssets();
  const asset = assets.find((a) => a.id === id);
  if (!asset) {
    return { ok: false, code: "not_found", message: "הקובץ לא נמצא" };
  }
  const storedName = String(asset.storedName || "");
  if (storedName) {
    const diskPath = path.join(VB_UPLOADS_DIR, storedName);
    await fs.unlink(diskPath).catch(() => {});
  }
  const nextIndex = assets.filter((a) => a.id !== id);
  await writeJsonFile(VB_MEDIA_INDEX_FILE, nextIndex);
  await detachMediaAssetFromProjects(id);
  return { ok: true, id };
}

/**
 * @param {Buffer} body
 * @param {string} boundary
 */
export function parseMultipartBuffer(body, boundary) {
  const delim = Buffer.from(`--${boundary}`);
  /** @type {{ name: string, filename?: string, contentType?: string, data: Buffer }[]} */
  const parts = [];
  let start = body.indexOf(delim);
  while (start !== -1) {
    const next = body.indexOf(delim, start + delim.length);
    const segment = body.subarray(start + delim.length, next === -1 ? body.length : next);
    const headerEnd = segment.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headerText = segment.subarray(0, headerEnd).toString("utf8");
      const data = segment.subarray(headerEnd + 4, Math.max(headerEnd + 4, segment.length - 2));
      const nameMatch = headerText.match(/name="([^"]+)"/);
      const filenameMatch = headerText.match(/filename="([^"]+)"/);
      const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);
      if (nameMatch) {
        parts.push({
          name: nameMatch[1],
          filename: filenameMatch ? filenameMatch[1] : undefined,
          contentType: typeMatch ? typeMatch[1].trim().toLowerCase() : undefined,
          data,
        });
      }
    }
    if (next === -1) break;
    start = next;
  }
  return parts;
}

/** @param {import('http').IncomingMessage} req */
export async function parseMediaUpload(req) {
  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.includes("multipart/form-data")) {
    return { ok: false, status: 400, code: "validation_failed", message: "נדרש multipart/form-data" };
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]).trim() : null;
  if (!boundary) {
    return { ok: false, status: 400, code: "validation_failed", message: "boundary חסר" };
  }
  const parts = parseMultipartBuffer(body, boundary);
  const filePart = parts.find((p) => p.name === "file" || p.name === "media");
  if (!filePart?.data?.length) {
    return { ok: false, status: 400, code: "validation_failed", message: "קובץ חסר (שדה file)" };
  }
  return {
    ok: true,
    buffer: filePart.data,
    contentType: filePart.contentType || null,
    originalFilename: filePart.filename || null,
  };
}

/** @returns {Promise<boolean>} */
export function checkFfmpegAvailable() {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"], { windowsHide: true });
    proc.on("error", () => resolve(false));
    proc.on("close", (code) => resolve(code === 0));
  });
}

function resolveFontPath(fontFamily, titleBold) {
  const key = VB_FONT_IDS.includes(String(fontFamily)) ? String(fontFamily) : "segoe";
  let font = VB_FONTS[key] || VB_FONTS.segoe;
  if (titleBold && key === "arial") font = { ...font, winPath: "C:/Windows/Fonts/arialbd.ttf" };
  if (existsSync(font.winPath)) return font.winPath;
  const fallbacks = ["C:/Windows/Fonts/segouib.ttf", "C:/Windows/Fonts/arial.ttf"];
  for (const p of fallbacks) {
    if (existsSync(p)) return p;
  }
  return null;
}

function formatFontFileForFfmpeg(fontPath) {
  const normalized = fontPath.replace(/\\/g, "/");
  if (process.platform === "win32") {
    return normalized.replace(/^([A-Za-z]):\//, "$1\\\\:/");
  }
  return normalized.replace(/:/g, "\\:");
}

/** @param {string} text */
function escapeFfmpegDrawtext(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\u2019")
    .slice(0, 200);
}

function runFfmpeg(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { cwd, windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(undefined);
      else reject(new Error(stderr.slice(-800) || `ffmpeg exited ${code}`));
    });
  });
}

/** H.264 + AAC settings compatible with Windows Media Player, browsers, and mobile. */
const FFMPEG_H264_OUT = [
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-profile:v",
  "high",
  "-level:v",
  "4.1",
  "-preset",
  "medium",
  "-crf",
  "20",
];

const FFMPEG_AAC_OUT = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"];

const FFMPEG_MP4_MUX = ["-movflags", "+faststart"];

/** @param {string} filePath */
async function probeHasAudioStream(filePath) {
  return new Promise((resolve) => {
    const proc = spawn(
      "ffprobe",
      ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", filePath],
      { windowsHide: true }
    );
    let out = "";
    proc.stdout.on("data", (d) => {
      out += d.toString();
    });
    proc.on("close", () => resolve(out.trim().includes("audio")));
    proc.on("error", () => resolve(false));
  });
}

/**
 * Final re-encode pass — guarantees yuv420p H.264 High@4.1 + AAC stereo + faststart.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {number} width
 * @param {number} height
 * @param {string} workDir
 */
async function finalizeCompatMp4(inputPath, outputPath, width, height, workDir) {
  const hasAudio = await probeHasAudioStream(inputPath);
  /** @type {string[]} */
  const args = [
    "-i",
    inputPath,
    "-vf",
    `scale=${width}:${height},format=yuv420p`,
    "-map",
    "0:v:0",
    ...FFMPEG_H264_OUT,
  ];
  if (hasAudio) {
    args.push("-map", "0:a:0", ...FFMPEG_AAC_OUT);
  } else {
    args.push("-an");
  }
  args.push(...FFMPEG_MP4_MUX, "-y", outputPath);
  await runFfmpeg(args, workDir);
}

/**
 * @param {Record<string, unknown>} scene
 * @param {string} outPath
 * @param {number} width
 * @param {number} height
 * @param {Record<string, unknown> | null} mediaAsset
 * @param {Record<string, unknown> | null} [watermarkAsset]
 */
async function renderSceneSegment(scene, outPath, width, height, mediaAsset, watermarkAsset = null) {
  const styled = normalizeSceneStyle(scene);
  const duration = Number(styled.durationSec) || 5;
  const animation = VB_ANIMATIONS[styled.animation]?.exportKind || "none";
  const fontPath = resolveFontPath(styled.fontFamily, styled.titleBold);
  const title = escapeFfmpegDrawtext(String(styled.title || ""));
  const subtitle = escapeFfmpegDrawtext(String(styled.subtitle || ""));
  const titlePx = VB_TEXT_SIZES[styled.titleSize]?.titlePx || 56;
  const subtitlePx = VB_TEXT_SIZES[styled.subtitleSize]?.subtitlePx || 36;
  const titleColor = hexToFfmpegColor(styled.titleColor);
  const subtitleColor = hexToFfmpegColor(styled.subtitleColor);
  const xExpr = ffmpegTextXExpr(styled.textAlign);
  const shadow = VB_TEXT_SHADOWS[styled.textShadow] || VB_TEXT_SHADOWS.soft;
  const borderPart =
    shadow.borderw > 0 ? `:borderw=${shadow.borderw}:bordercolor=black@${shadow.borderAlpha}` : "";
  const scaleFactor = VB_MEDIA_SCALE_FACTOR[styled.mediaScale] || 0.65;
  const mediaMaxW = Math.round(width * scaleFactor);
  const overlayY = VB_MEDIA_POSITION_Y[styled.mediaPosition] || "-80";
  const isCover = styled.mediaFit === "cover";
  const cropY = VB_MEDIA_CROP_Y[styled.mediaPosition] || VB_MEDIA_CROP_Y.center;

  /** @type {string[]} */
  const filters = [];
  let inputArgs = buildFfmpegBackgroundInput(styled.bgType, width, height, duration);
  let inputCount = 1;
  let mediaBaseReady = false;

  if (mediaAsset?.type === "image" && mediaAsset.url) {
    const imgPath = resolveAdminVideoAssetPath(mediaAsset.url);
    if (imgPath && existsSync(imgPath)) {
      const imgStat = await fs.stat(imgPath).catch(() => null);
      if (imgStat && imgStat.size >= 500) {
        if (isCover) {
          inputArgs = ["-loop", "1", "-t", String(duration), "-i", imgPath];
          inputCount = 1;
          if (animation === "ken_burns") {
            const frames = Math.max(1, Math.round(duration * 25));
            filters.push(
              `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:(iw-ow)/2:${cropY},zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=25[base]`
            );
          } else {
            filters.push(
              `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:(iw-ow)/2:${cropY},fps=25[base]`
            );
          }
          mediaBaseReady = true;
        } else {
          inputArgs.push("-loop", "1", "-i", imgPath);
          if (animation === "ken_burns") {
            const frames = Math.max(1, Math.round(duration * 25));
            filters.push(
              `[${inputCount}:v]scale=${Math.round(mediaMaxW * 1.15)}:-1,zoompan=z='min(zoom+0.0008,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${mediaMaxW}x${Math.round(mediaMaxW * 0.75)}:fps=25[img]`
            );
          } else {
            filters.push(`[${inputCount}:v]scale='min(${mediaMaxW},iw)':-1[img]`);
          }
          filters.push(`[0:v][img]overlay=(W-w)/2:(H-h)/2${overlayY}[base]`);
          inputCount++;
        }
      }
    }
  } else if (mediaAsset?.type === "video" && mediaAsset.url) {
    const vidPath = resolveAdminVideoAssetPath(mediaAsset.url);
    if (vidPath && existsSync(vidPath)) {
      inputArgs = ["-stream_loop", "-1", "-i", vidPath];
      inputCount = 1;
      if (isCover) {
        filters.push(
          `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:(iw-ow)/2:${cropY},trim=duration=${duration},setpts=PTS-STARTPTS,fps=25[base]`
        );
      } else {
        filters.push(
          `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,trim=duration=${duration},setpts=PTS-STARTPTS[base]`
        );
      }
      mediaBaseReady = true;
    }
  }

  if (!mediaBaseReady && !filters.some((f) => f.includes("[base]"))) {
    filters.push(`[0:v]copy[base]`);
  }

  let videoLabel = filters.length ? "base" : "0:v";

  const overlayBox = VB_MEDIA_OVERLAYS[styled.mediaOverlay]?.ffmpegBox;
  if (overlayBox) {
    filters.push(`[${videoLabel}]drawbox=color=${overlayBox}:t=fill[ovl]`);
    videoLabel = "ovl";
  }

  if (animation === "fade") {
    filters.push(`[${videoLabel}]fade=t=in:st=0:d=0.6:alpha=1[anim]`);
    videoLabel = "anim";
  } else if (animation === "zoom") {
    const frames = Math.max(1, Math.round(duration * 25));
    const zw = Math.round(width / 2);
    const zh = Math.round(height / 2);
    filters.push(
      `[${videoLabel}]zoompan=z='min(zoom+0.0015,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${zw}x${zh}:fps=25,scale=${width}:${height}[anim]`
    );
    videoLabel = "anim";
  } else if (animation === "scale_pop") {
    const frames = Math.max(1, Math.round(duration * 25));
    const zw = Math.round(width / 2);
    const zh = Math.round(height / 2);
    filters.push(
      `[${videoLabel}]zoompan=z='min(zoom+0.004,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.min(frames, 40)}:s=${zw}x${zh}:fps=25,scale=${width}:${height}[anim]`
    );
    videoLabel = "anim";
  }

  const textBgBox = VB_TEXT_BACKGROUNDS[styled.textBg]?.ffmpegBox;
  if (textBgBox && title) {
    filters.push(`[${videoLabel}]drawbox=x=0:y=h*0.06:w=iw:h=h*0.22:color=${textBgBox}:t=fill[tbg]`);
    videoLabel = "tbg";
  }

  if (fontPath && title) {
    const fontEsc = formatFontFileForFfmpeg(fontPath);
    filters.push(
      `[${videoLabel}]drawtext=fontfile=${fontEsc}:text='${title}':fontsize=${titlePx}:fontcolor=${titleColor}${borderPart}:x=${xExpr}:y=h*0.12[txt1]`
    );
    videoLabel = "txt1";
    if (subtitle) {
      filters.push(
        `[${videoLabel}]drawtext=fontfile=${fontEsc}:text='${subtitle}':fontsize=${subtitlePx}:fontcolor=${subtitleColor}${borderPart}:x=${xExpr}:y=h*0.22[outv]`
      );
      videoLabel = "outv";
    }
  }

  if (watermarkAsset?.type === "image" && watermarkAsset.url) {
    const wmPath = resolveAdminVideoAssetPath(watermarkAsset.url);
    const wmStat = wmPath && existsSync(wmPath) ? await fs.stat(wmPath).catch(() => null) : null;
    if (wmStat && wmStat.size >= 100) {
      inputArgs.push("-loop", "1", "-i", wmPath);
      const wmPosKey = String(watermarkAsset.wmPosition || "top_right");
      const wmPos = VB_WATERMARK_POSITIONS[wmPosKey]?.overlay || "W-w-40:40";
      filters.push(`[${inputCount}:v]scale=120:-1[wm]`);
      filters.push(`[${videoLabel}][wm]overlay=${wmPos}[wmout]`);
      videoLabel = "wmout";
      inputCount++;
    }
  }

  const finalLabel = videoLabel;
  const filterComplex = filters.join(";");
  const args = [
    ...inputArgs,
    "-filter_complex",
    filterComplex,
    "-map",
    `[${finalLabel}]`,
    "-t",
    String(duration),
    ...FFMPEG_H264_OUT,
    "-r",
    "25",
    "-y",
    outPath,
  ];

  await runFfmpeg(args, path.dirname(outPath));
}

function resolveTransitionKey(scene, defaultTransition) {
  const key = String(scene.transitionOut || "none");
  if (key !== "none") return key;
  return String(defaultTransition || "none");
}

/** @param {string[]} segmentPaths @param {Array<Record<string, unknown>>} scenes */
async function mergeSegments(segmentPaths, scenes, defaultTransition, workDir, outPath) {
  const useXfade = segmentPaths.length > 1 && segmentPaths.some((_, i) => {
    if (i >= segmentPaths.length - 1) return false;
    const tr = resolveTransitionKey(scenes[i], defaultTransition);
    return tr !== "none" && VB_TRANSITIONS[tr]?.xfade;
  });

  if (!useXfade) {
    const concatListPath = path.join(workDir, "concat.txt");
    const concatContent = segmentPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    await fs.writeFile(concatListPath, concatContent, "utf8");
    await runFfmpeg(
      ["-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", "-y", outPath],
      workDir
    );
    return;
  }

  /** @type {string[]} */
  const inputArgs = [];
  segmentPaths.forEach((p) => {
    inputArgs.push("-i", p);
  });

  let cumulative = 0;
  let current = "0:v";
  /** @type {string[]} */
  const parts = [];
  for (let i = 1; i < segmentPaths.length; i++) {
    const trKey = resolveTransitionKey(scenes[i - 1], defaultTransition);
    const tr = VB_TRANSITIONS[trKey] || VB_TRANSITIONS.crossfade;
    const prevDur = Number(scenes[i - 1]?.durationSec) || 5;
    const offset = Math.max(0, cumulative + prevDur - tr.duration);
    const outLabel = i === segmentPaths.length - 1 ? "outv" : `xv${i}`;
    parts.push(
      `[${current}][${i}:v]xfade=transition=${tr.xfade}:duration=${tr.duration}:offset=${offset}[${outLabel}]`
    );
    current = outLabel;
    cumulative += prevDur - tr.duration;
  }

  await runFfmpeg(
    [
      ...inputArgs,
      "-filter_complex",
      parts.join(";"),
      "-map",
      "[outv]",
      ...FFMPEG_H264_OUT,
      "-r",
      "25",
      "-y",
      outPath,
    ],
    workDir
  );
}

async function probeDurationSec(filePath) {
  return new Promise((resolve) => {
    const proc = spawn(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath],
      { windowsHide: true }
    );
    let out = "";
    proc.stdout.on("data", (d) => {
      out += d.toString();
    });
    proc.on("close", () => {
      const n = Number.parseFloat(out.trim());
      resolve(Number.isFinite(n) ? n : 0);
    });
    proc.on("error", () => resolve(0));
  });
}

/** @param {Record<string, unknown>} project */
async function attachAudioTracks(videoPath, project, workDir, outPath) {
  const settings = normalizeProjectSettings(project);
  const videoDur = await probeDurationSec(videoPath);
  if (videoDur <= 0) {
    await fs.copyFile(videoPath, outPath);
    return;
  }

  /** @type {string[]} */
  const inputs = ["-i", videoPath];
  /** @type {string[]} */
  const filters = [];
  let audioIdx = 1;
  /** @type {string[]} */
  const mixLabels = [];

  if (settings.voiceoverAssetId) {
    const voiceAsset = await getMediaAssetById(String(settings.voiceoverAssetId));
    const voicePath = voiceAsset?.url ? resolveAdminVideoAssetPath(voiceAsset.url) : null;
    if (voicePath && existsSync(voicePath)) {
      inputs.push("-i", voicePath);
      const vol = settings.voiceoverVolume / 100;
      filters.push(`[${audioIdx}:a]volume=${vol},apad=whole_dur=${videoDur}[va]`);
      mixLabels.push("[va]");
      audioIdx++;
    }
  }

  if (settings.backgroundMusicAssetId) {
    const musicAsset = await getMediaAssetById(String(settings.backgroundMusicAssetId));
    const musicPath = musicAsset?.url ? resolveAdminVideoAssetPath(musicAsset.url) : null;
    if (musicPath && existsSync(musicPath)) {
      inputs.push("-i", musicPath);
      const vol = settings.backgroundMusicVolume / 100;
      filters.push(
        `[${audioIdx}:a]volume=${vol},aloop=loop=-1:size=2e+09,atrim=duration=${videoDur}[ma]`
      );
      mixLabels.push("[ma]");
      audioIdx++;
    }
  }

  if (!mixLabels.length) {
    await fs.copyFile(videoPath, outPath);
    return;
  }

  if (mixLabels.length === 1) {
    await runFfmpeg(
      [
        ...inputs,
        "-filter_complex",
        filters.join(";"),
        "-map",
        "0:v",
        "-map",
        mixLabels[0],
        "-c:v",
        "copy",
        ...FFMPEG_AAC_OUT,
        "-y",
        outPath,
      ],
      workDir
    );
    return;
  }

  filters.push(`${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=2[aout]`);
  await runFfmpeg(
    [
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "0:v",
      "-map",
      "[aout]",
      "-c:v",
      "copy",
      ...FFMPEG_AAC_OUT,
      "-y",
      outPath,
    ],
    workDir
  );
}

/** @param {Record<string, unknown>} project */
export async function exportVideoProjectMp4(project) {
  const available = await checkFfmpegAvailable();
  if (!available) {
    return { ok: false, code: "ffmpeg_unavailable", message: VB_FFMPEG_UNAVAILABLE_HE };
  }

  const settings = normalizeProjectSettings(project);
  const dims = getExportDimensions(String(project.aspectRatio || "16:9"), settings.exportQuality);
  const { width, height } = dims;
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  if (!scenes.length) {
    return { ok: false, code: "no_scenes", message: "אין סצנות לייצוא" };
  }

  let watermarkAsset = null;
  if (settings.watermarkAssetId) {
    const wm = await getMediaAssetById(String(settings.watermarkAssetId));
    if (wm) watermarkAsset = { ...wm, wmPosition: settings.watermarkPosition };
  }

  const workDir = path.join(VB_DATA_DIR, "export-work", String(project.id));
  await fs.mkdir(workDir, { recursive: true });

  /** @type {string[]} */
  const segmentPaths = [];
  try {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      let mediaAsset = null;
      if (scene.mediaAssetId) {
        mediaAsset = await getMediaAssetById(String(scene.mediaAssetId));
      }
      const segPath = path.join(workDir, `scene_${i}.mp4`);
      await renderSceneSegment(scene, segPath, width, height, mediaAsset, watermarkAsset);
      segmentPaths.push(segPath);
    }

    const mergedPath = path.join(workDir, "merged.mp4");
    await mergeSegments(segmentPaths, scenes, settings.defaultTransition, workDir, mergedPath);

    const withAudioPath = path.join(workDir, "with-audio.mp4");
    await attachAudioTracks(mergedPath, project, workDir, withAudioPath);

    const finalPath = path.join(workDir, "final-compat.mp4");
    await finalizeCompatMp4(withAudioPath, finalPath, width, height, workDir);

    const outputName = `${project.id}.mp4`;
    const outputDisk = path.join(VB_OUTPUTS_DIR, outputName);
    await fs.copyFile(finalPath, outputDisk);
    const outputMp4Path = `/admin-video-assets/outputs/${outputName}`;

    const parsed = parseVideoProjectBody(project);
    if (parsed.ok) {
      const updated = await updateVideoProject(String(project.id), parsed.payload);
      if (updated.ok) {
        const fullProject = {
          ...updated.project,
          status: "exported",
          outputMp4Path,
          updatedAt: new Date().toISOString(),
        };
        await writeJsonFile(projectFilePath(String(project.id)), fullProject);
        const index = await readJsonFile(VB_INDEX_FILE, []);
        const rows = Array.isArray(index) ? index : [];
        const idx = rows.findIndex((p) => p.id === project.id);
        if (idx !== -1) {
          rows[idx] = indexEntryFromProject(
            { ...fullProject, status: "exported", outputMp4Path },
            rows[idx]
          );
          await writeJsonFile(VB_INDEX_FILE, rows);
        }
      }
    }

    return { ok: true, outputMp4Path, outputUrl: outputMp4Path };
  } catch (err) {
    return {
      ok: false,
      code: "export_failed",
      message: `יצוא נכשל: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Pure helpers for tests / preview timing — re-export from client-safe module */
export { computePreviewTotalDurationSec } from "../admin-portal/admin-video-builder-utils.js";

export function defaultScene() {
  return {
    id: randomUUID(),
    ...defaultSceneFields(),
  };
}

export function createEmptyProjectPayload(name = "סרטון חדש") {
  return {
    name,
    aspectRatio: "16:9",
    scenes: [defaultScene()],
    ...defaultProjectFields(),
  };
}
