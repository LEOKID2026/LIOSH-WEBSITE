#!/usr/bin/env node
/**
 * Replace flat-page learning book audio from AUDIO.zip for hebrew/english G1–G2.
 * Run: node scripts/install-learning-book-flat-audio.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ZIP_PATH = path.join(ROOT, "AUDIO.zip");
const PUBLIC_AUDIO = path.join(ROOT, "public", "audio", "learning-books");

const BOOKS = [
  { slug: "hebrew-g1", expected: 224 },
  { slug: "hebrew-g2", expected: 161 },
  { slug: "english-g1", expected: 154 },
  { slug: "english-g2", expected: 182 },
];

/** Legacy section-based dirs to remove (same four books only). */
const LEGACY_DIRS = [
  path.join(PUBLIC_AUDIO, "hebrew", "g1"),
  path.join(PUBLIC_AUDIO, "hebrew", "g2"),
  path.join(PUBLIC_AUDIO, "english", "g1"),
  path.join(PUBLIC_AUDIO, "english", "g2"),
];

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`removed: ${path.relative(ROOT, dir)}`);
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function verifyBook(slug, expected) {
  const dir = path.join(PUBLIC_AUDIO, slug);
  const [subject, grade] = slug.split("-");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3")).sort();
  if (files.length !== expected) {
    throw new Error(`${slug}: expected ${expected} MP3s, got ${files.length}`);
  }

  const missing = [];
  for (let i = 1; i <= expected; i += 1) {
    const expectedName = `${subject}_${grade}_page_${pad3(i)}.mp3`;
    if (!files.includes(expectedName)) {
      missing.push(expectedName);
    }
  }
  if (missing.length) {
    throw new Error(`${slug}: missing files: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`);
  }

  console.log(`OK ${slug}: ${files.length} MP3s, 001–${pad3(expected)} complete`);
  return files;
}

if (!fs.existsSync(ZIP_PATH)) {
  console.error("AUDIO.zip not found at project root");
  process.exit(1);
}

fs.mkdirSync(PUBLIC_AUDIO, { recursive: true });

for (const legacy of LEGACY_DIRS) {
  rmDir(legacy);
}

for (const { slug } of BOOKS) {
  rmDir(path.join(PUBLIC_AUDIO, slug));
}

const extractDir = path.join(ROOT, "_audio_install_temp");
rmDir(extractDir);
fs.mkdirSync(extractDir, { recursive: true });

console.log("extracting AUDIO.zip…");
execSync(`tar -xf "${ZIP_PATH}" -C "${extractDir}"`, { stdio: "inherit" });

for (const { slug } of BOOKS) {
  const srcDir = path.join(extractDir, "AUDIO", slug);
  const destDir = path.join(PUBLIC_AUDIO, slug);
  if (!fs.existsSync(srcDir)) {
    throw new Error(`ZIP missing folder AUDIO/${slug}`);
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith(".mp3")) continue;
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
  console.log(`copied ${slug} → public/audio/learning-books/${slug}/`);
}

rmDir(extractDir);

console.log("\n--- verification ---");
for (const { slug, expected } of BOOKS) {
  verifyBook(slug, expected);
}

console.log("\ninstall-learning-book-flat-audio: done");
