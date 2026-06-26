/**
 * Admin video builder — local JSON storage + media on disk.
 * MVP: data/admin-video-builder/ + public/admin-video-assets/
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

export const VB_DATA_DIR = path.join(process.cwd(), "data", "admin-video-builder");
export const VB_PROJECTS_DIR = path.join(VB_DATA_DIR, "projects");
export const VB_INDEX_FILE = path.join(VB_DATA_DIR, "projects-index.json");
export const VB_MEDIA_INDEX_FILE = path.join(VB_DATA_DIR, "media-index.json");

export const VB_ASSETS_DIR = path.join(process.cwd(), "public", "admin-video-assets");
export const VB_UPLOADS_DIR = path.join(VB_ASSETS_DIR, "uploads");
export const VB_OUTPUTS_DIR = path.join(VB_ASSETS_DIR, "outputs");

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

export const VB_ASPECT_RATIOS = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

export const VB_BG_COLORS = {
  light: "0xf5f5f5",
  colorful: "0x6366f1",
  dark: "0x1e1e2e",
};

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
  if (!["light", "colorful", "dark"].includes(bgType)) {
    return { ok: false, code: "invalid_bg", message: `סוג רקע בסצנה ${index + 1} אינו תקין` };
  }
  const animation = String(s.animation ?? "none");
  if (!["none", "fade", "zoom"].includes(animation)) {
    return { ok: false, code: "invalid_animation", message: `אנימציה בסצנה ${index + 1} אינה תקינה` };
  }
  const mediaAssetId = s.mediaAssetId != null ? String(s.mediaAssetId).trim() || null : null;
  const id = s.id != null && String(s.id).trim() ? String(s.id).trim() : randomUUID();
  return {
    ok: true,
    scene: { id, title, subtitle, mediaAssetId, durationSec, bgType, animation },
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

  return {
    ok: true,
    payload: {
      name: nameParsed.name,
      aspectRatio: ratioParsed.aspectRatio,
      scenes,
      voiceoverAssetId,
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

/** @returns {Promise<Array<{ id: string, name: string, status: string, updatedAt: string, outputMp4Path: string | null }>>} */
export async function listVideoProjects() {
  await ensureVideoBuilderDirs();
  const index = await readJsonFile(VB_INDEX_FILE, []);
  return Array.isArray(index) ? index : [];
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
  const index = await listVideoProjects();
  index.unshift({
    id,
    name: project.name,
    status: project.status,
    updatedAt: project.updatedAt,
    outputMp4Path: null,
  });
  await writeJsonFile(VB_INDEX_FILE, index);
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
  const index = await listVideoProjects();
  const idx = index.findIndex((p) => p.id === id);
  if (idx !== -1) {
    index[idx] = {
      id,
      name: project.name,
      status: project.status,
      updatedAt: project.updatedAt,
      outputMp4Path: project.outputMp4Path ?? null,
    };
    await writeJsonFile(VB_INDEX_FILE, index);
  }
  return { ok: true, project };
}

/** @param {string} id */
export async function deleteVideoProject(id) {
  const existing = await getVideoProject(id);
  if (!existing.ok) return existing;
  await fs.unlink(projectFilePath(id)).catch(() => {});
  const index = (await listVideoProjects()).filter((p) => p.id !== id);
  await writeJsonFile(VB_INDEX_FILE, index);
  if (existing.project.outputMp4Path) {
    const outputFile = path.join(process.cwd(), "public", existing.project.outputMp4Path.replace(/^\//, ""));
    await fs.unlink(outputFile).catch(() => {});
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

function resolveHebrewFontPath() {
  const candidates =
    process.platform === "win32"
      ? ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arial.ttf"]
      : process.platform === "darwin"
        ? ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/Library/Fonts/Arial.ttf"]
        : [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
          ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** @param {string} text */
function escapeFfmpegDrawtext(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "'\\''")
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

/**
 * @param {Record<string, unknown>} scene
 * @param {string} outPath
 * @param {number} width
 * @param {number} height
 * @param {Record<string, unknown> | null} mediaAsset
 */
async function renderSceneSegment(scene, outPath, width, height, mediaAsset) {
  const duration = Number(scene.durationSec) || 5;
  const bgKey = String(scene.bgType || "light");
  const bgColor = VB_BG_COLORS[bgKey] || VB_BG_COLORS.light;
  const animation = String(scene.animation || "none");
  const fontPath = resolveHebrewFontPath();
  const title = escapeFfmpegDrawtext(String(scene.title || ""));
  const subtitle = escapeFfmpegDrawtext(String(scene.subtitle || ""));

  /** @type {string[]} */
  const filters = [];
  let inputArgs = ["-f", "lavfi", "-i", `color=c=${bgColor}:s=${width}x${height}:d=${duration}`];
  let inputCount = 1;

  if (mediaAsset?.type === "image" && mediaAsset.url) {
    const imgPath = path.join(process.cwd(), "public", String(mediaAsset.url).replace(/^\//, ""));
    if (existsSync(imgPath)) {
      inputArgs.push("-loop", "1", "-i", imgPath);
      filters.push(`[${inputCount}:v]scale='min(${Math.round(width * 0.7)},iw)':-1[img]`);
      filters.push(`[0:v][img]overlay=(W-w)/2:(H-h)/2-80[base]`);
      inputCount++;
    }
  } else if (mediaAsset?.type === "video" && mediaAsset.url) {
    const vidPath = path.join(process.cwd(), "public", String(mediaAsset.url).replace(/^\//, ""));
    if (existsSync(vidPath)) {
      inputArgs = ["-stream_loop", "-1", "-i", vidPath];
      filters.push(
        `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,trim=duration=${duration},setpts=PTS-STARTPTS[base]`
      );
      inputCount = 0;
    }
  }

  let videoLabel = filters.length ? "base" : "0:v";
  if (!filters.some((f) => f.includes("[base]"))) {
    filters.push(`[0:v]copy[base]`);
    videoLabel = "base";
  }

  if (animation === "fade") {
    filters.push(`[${videoLabel}]fade=t=in:st=0:d=0.6:alpha=1[anim]`);
    videoLabel = "anim";
  } else if (animation === "zoom") {
    filters.push(
      `[${videoLabel}]scale=${width}:${height},zoompan=z='min(zoom+0.0008,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 25)}:s=${width}x${height}:fps=25[anim]`
    );
    videoLabel = "anim";
  }

  if (fontPath && title) {
    const fontEsc = fontPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    filters.push(
      `[${videoLabel}]drawtext=fontfile='${fontEsc}':text='${title}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h*0.12:borderw=2:bordercolor=black@0.4[txt1]`
    );
    videoLabel = "txt1";
    if (subtitle) {
      filters.push(
        `[${videoLabel}]drawtext=fontfile='${fontEsc}':text='${subtitle}':fontsize=36:fontcolor=white@0.95:x=(w-text_w)/2:y=h*0.22:borderw=1:bordercolor=black@0.3[outv]`
      );
      videoLabel = "outv";
    }
  }

  const finalLabel = videoLabel === "base" || videoLabel === "anim" ? videoLabel : videoLabel;
  const filterComplex = filters.join(";");
  const args = [
    ...inputArgs,
    "-filter_complex",
    filterComplex,
    "-map",
    `[${finalLabel}]`,
    "-t",
    String(duration),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "25",
    "-y",
    outPath,
  ];

  await runFfmpeg(args, path.dirname(outPath));
}

/** @param {Record<string, unknown>} project */
export async function exportVideoProjectMp4(project) {
  const available = await checkFfmpegAvailable();
  if (!available) {
    return { ok: false, code: "ffmpeg_unavailable", message: VB_FFMPEG_UNAVAILABLE_HE };
  }

  const ratio = VB_ASPECT_RATIOS[String(project.aspectRatio || "16:9")] || VB_ASPECT_RATIOS["16:9"];
  const { width, height } = ratio;
  const scenes = Array.isArray(project.scenes) ? project.scenes : [];
  if (!scenes.length) {
    return { ok: false, code: "no_scenes", message: "אין סצנות לייצוא" };
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
      await renderSceneSegment(scene, segPath, width, height, mediaAsset);
      segmentPaths.push(segPath);
    }

    const concatListPath = path.join(workDir, "concat.txt");
    const concatContent = segmentPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    await fs.writeFile(concatListPath, concatContent, "utf8");

    const mergedPath = path.join(workDir, "merged.mp4");
    await runFfmpeg(
      ["-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", "-y", mergedPath],
      workDir
    );

    let finalPath = mergedPath;
    if (project.voiceoverAssetId) {
      const voiceAsset = await getMediaAssetById(String(project.voiceoverAssetId));
      if (voiceAsset?.url) {
        const audioPath = path.join(process.cwd(), "public", String(voiceAsset.url).replace(/^\//, ""));
        if (existsSync(audioPath)) {
          const withAudioPath = path.join(workDir, "with-audio.mp4");
          await runFfmpeg(
            [
              "-i",
              mergedPath,
              "-i",
              audioPath,
              "-c:v",
              "copy",
              "-c:a",
              "aac",
              "-shortest",
              "-y",
              withAudioPath,
            ],
            workDir
          );
          finalPath = withAudioPath;
        }
      }
    }

    const outputName = `${project.id}.mp4`;
    const outputDisk = path.join(VB_OUTPUTS_DIR, outputName);
    await fs.copyFile(finalPath, outputDisk);
    const outputMp4Path = `/admin-video-assets/outputs/${outputName}`;

    const updated = await updateVideoProject(String(project.id), {
      name: String(project.name),
      aspectRatio: String(project.aspectRatio || "16:9"),
      scenes: project.scenes,
      voiceoverAssetId: project.voiceoverAssetId ?? null,
    });
    if (updated.ok) {
      const fullProject = {
        ...updated.project,
        status: "exported",
        outputMp4Path,
        updatedAt: new Date().toISOString(),
      };
      await writeJsonFile(projectFilePath(String(project.id)), fullProject);
      const index = await listVideoProjects();
      const idx = index.findIndex((p) => p.id === project.id);
      if (idx !== -1) {
        index[idx] = {
          id: String(project.id),
          name: fullProject.name,
          status: "exported",
          updatedAt: fullProject.updatedAt,
          outputMp4Path,
        };
        await writeJsonFile(VB_INDEX_FILE, index);
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
    title: "כותרת חדשה",
    subtitle: "טקסט משנה",
    mediaAssetId: null,
    durationSec: 5,
    bgType: "light",
    animation: "none",
  };
}

export function createEmptyProjectPayload(name = "סרטון חדש") {
  return {
    name,
    aspectRatio: "16:9",
    scenes: [defaultScene()],
    voiceoverAssetId: null,
  };
}
