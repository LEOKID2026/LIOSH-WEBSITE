#!/usr/bin/env node
/**
 * One-off publish: copy approved workflow WebMs from pilot audit folders to public/,
 * generate posters, flip manifest assetKind for primary embeds only.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = join(root, "data", "help-center", "videos-manifest.json");

const WAVE = [
  {
    manifestId: "parent-report/report-overview/main",
    src: "qa-evidence-audit/parent-video-pilot/parent-report-ai",
  },
  { manifestId: "parents/add-students/main", src: "qa-evidence-audit/parent-video-pilot/add-students" },
  { manifestId: "students/student-login/main", src: "qa-evidence-audit/parent-video-pilot/student-login" },
  {
    manifestId: "parents/how-to-read-report/main",
    src: "qa-evidence-audit/parent-video-pilot/how-to-read-report",
  },
  { manifestId: "parents/parent-copilot/main", src: "qa-evidence-audit/parent-video-pilot/parent-copilot" },
  {
    manifestId: "students/student-home-tour/main",
    src: "qa-evidence-audit/student-video-pilot/student-home-tour",
  },
  {
    manifestId: "students/choose-subject-and-grade/main",
    src: "qa-evidence-audit/student-video-pilot/start-practice",
  },
  {
    manifestId: "subjects/math/main",
    src: "qa-evidence-audit/student-video-pilot/math-step-explanation",
  },
  {
    manifestId: "subjects/geometry/main",
    src: "qa-evidence-audit/student-video-pilot/geometry-step-explanation",
  },
  {
    manifestId: "students/hints-and-explanations/main",
    src: "qa-evidence-audit/student-video-pilot/wrong-answer-help",
  },
  {
    manifestId: "students/answering-questions/main",
    src: "qa-evidence-audit/student-video-pilot/streak-and-progress",
  },
  {
    manifestId: "students/daily-missions/main",
    src: "qa-evidence-audit/student-video-pilot/daily-missions-journey",
  },
  {
    manifestId: "students/coins-and-arcade/main",
    src: "qa-evidence-audit/student-video-pilot/games-arcade",
  },
];

function resolveFfmpeg() {
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

function extractPoster(ffmpeg, webmPath, jpgPath) {
  mkdirSync(dirname(jpgPath), { recursive: true });
  const r = spawnSync(
    ffmpeg,
    ["-y", "-ss", "3", "-i", webmPath, "-vframes", "1", "-q:v", "3", jpgPath],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    throw new Error(`ffmpeg poster failed for ${webmPath}: ${r.stderr || r.stdout}`);
  }
}

function main() {
  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg) {
    console.error("ffmpeg required for poster generation");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const copied = [];

  for (const { manifestId, src } of WAVE) {
    const entry = manifest.videos.find((v) => v.id === manifestId);
    if (!entry) {
      console.error(`Missing manifest entry: ${manifestId}`);
      process.exit(1);
    }

    for (const vp of ["desktop", "mobile"]) {
      const srcWebm = join(root, src, vp, "main.webm");
      if (!existsSync(srcWebm)) {
        console.error(`Missing source: ${srcWebm}`);
        process.exit(1);
      }
      const relWebm = entry.assets[vp].webm;
      const relPoster = entry.assets[vp].poster;
      const destWebm = join(root, "public", relWebm);
      const destPoster = join(root, "public", relPoster);
      mkdirSync(dirname(destWebm), { recursive: true });
      copyFileSync(srcWebm, destWebm);
      extractPoster(ffmpeg, destWebm, destPoster);
      copied.push(relWebm, relPoster);
    }

    entry.assetKind = "captured";
    entry.internalReview = {
      desktop: { status: "passed", reason: "workflow capture wave 2026-05-24" },
      mobile: { status: "passed", reason: "workflow capture wave 2026-05-24" },
    };
    const metaPath = join(root, src, "desktop", "capture-meta.json");
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, "utf8"));
        if (meta.decodedDurationSec) {
          entry.durationSecTarget = {
            desktop: Math.round(meta.decodedDurationSec),
            mobile: Math.round(meta.decodedDurationSec),
          };
        }
      } catch {
        /* optional */
      }
    }
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Published ${WAVE.length} workflows (${copied.length} files) to public/`);
  console.log("Manifest entries flipped to captured:");
  WAVE.forEach((w) => console.log(`  - ${w.manifestId}`));
}

main();
