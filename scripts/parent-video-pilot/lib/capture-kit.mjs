/**
 * Shared helpers for parent-video-pilot captures (ffmpeg, frames, policy retry).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { ensureParentPolicyAccepted } from "../../help-center/parent-capture-session.mjs";

const require = createRequire(import.meta.url);

export function resolveFfmpegSync() {
  try {
    const p = require("@ffmpeg-installer/ffmpeg").path;
    if (p && existsSync(p)) return p;
  } catch {
    /* optional */
  }
  const w = spawnSync("where", ["ffmpeg"], { encoding: "utf8", shell: true });
  if (w.status === 0 && w.stdout.trim()) return w.stdout.trim().split(/\r?\n/)[0];
  return null;
}

export function encodeFramesToWebm(ffmpegPath, framesDir, outWebm, frameCount, fps, bitrate = "1.4M") {
  const pattern = join(framesDir, "frame_%05d.png").replace(/\\/g, "/");
  const out = outWebm.replace(/\\/g, "/");
  const r = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      pattern,
      "-frames:v",
      String(frameCount),
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      bitrate,
      "-deadline",
      "realtime",
      "-auto-alt-ref",
      "0",
      out,
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr || r.stdout}`);
}

export function ffprobeDuration(ffmpegPath, file) {
  let ffprobe;
  try {
    ffprobe = require("@ffprobe-installer/ffprobe").path;
  } catch {
    ffprobe = ffmpegPath.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  }
  if (!ffprobe || !existsSync(ffprobe)) return null;
  const r = spawnSync(
    ffprobe,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" }
  );
  return r.status === 0 ? parseFloat(r.stdout.trim()) : null;
}

export function hashFile(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

export function analyzeFrames(framesDir, frameCount) {
  const hashes = [];
  let whiteish = 0;
  for (let i = 0; i < frameCount; i++) {
    const p = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    hashes.push(hashFile(p));
    if (buf.length < 12_000) whiteish++;
  }
  const unique = new Set(hashes).size;
  const early = hashes.slice(0, Math.max(3, Math.floor(frameCount * 0.08)));
  const mid = hashes.slice(Math.floor(frameCount * 0.35), Math.floor(frameCount * 0.55));
  const late = hashes.slice(Math.floor(frameCount * 0.75));
  return {
    unique,
    whiteish,
    earlyChanged: new Set(early).size > 1,
    midChanged: new Set(mid).size > 1,
    lateChanged: new Set(late).size > 1,
  };
}

export async function ensurePolicyWithRetry(baseUrl, token, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      await ensureParentPolicyAccepted(baseUrl, token, () => {});
      return;
    } catch (e) {
      if (i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

export function runPreflightScript(rootDir, scriptRel, baseArg = "") {
  return spawnSync(
    `node --env-file=.env.local --env-file=.env.e2e.local ${scriptRel} ${baseArg}`.trim(),
    { encoding: "utf8", cwd: rootDir, shell: true }
  );
}
