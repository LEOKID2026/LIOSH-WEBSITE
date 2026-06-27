#!/usr/bin/env node
/**
 * Install flat-page MP3s for science G1/G2, geometry G1/G2 (full), and math G2 (pilot pages 001–006).
 * Source folders at project root: science-g1/, science-g2/, geometry-g1/, geometry-g2/, math-g2/
 *
 * Run: node scripts/install-learning-book-stem-flat-audio.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_AUDIO = path.join(ROOT, "public", "audio", "learning-books");

/** @type {{ slug: string, srcDir: string, expected: number }[]} */
const BOOKS = [
  { slug: "science-g1", srcDir: path.join(ROOT, "science-g1"), expected: 42 },
  { slug: "science-g2", srcDir: path.join(ROOT, "science-g2"), expected: 49 },
  { slug: "geometry-g1", srcDir: path.join(ROOT, "geometry-g1"), expected: 21 },
  { slug: "geometry-g2", srcDir: path.join(ROOT, "geometry-g2"), expected: 21 },
  { slug: "math-g2", srcDir: path.join(ROOT, "math-g2"), expected: 6 },
];

function pad3(n) {
  return String(n).padStart(3, "0");
}

function verifyBook(slug, expected) {
  const [subject, grade] = slug.split("-");
  const dir = path.join(PUBLIC_AUDIO, slug);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp3")).sort();

  if (files.length !== expected) {
    throw new Error(`${slug}: expected ${expected} MP3s, got ${files.length}`);
  }

  for (let i = 1; i <= expected; i += 1) {
    const name = `${subject}_${grade}_page_${pad3(i)}.mp3`;
    if (!files.includes(name)) {
      throw new Error(`${slug}: missing ${name}`);
    }
    const st = fs.statSync(path.join(dir, name));
    if (st.size < 500) throw new Error(`${slug}: file too small: ${name}`);
  }

  console.log(`OK ${slug}: ${files.length} MP3s (001–${pad3(expected)})`);
}

fs.mkdirSync(PUBLIC_AUDIO, { recursive: true });

for (const { slug, srcDir, expected } of BOOKS) {
  const destDir = path.join(PUBLIC_AUDIO, slug);
  fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(srcDir)) {
    const mp3s = fs.readdirSync(srcDir).filter((f) => f.endsWith(".mp3")).sort();
    if (mp3s.length !== expected) {
      throw new Error(`${slug}: source has ${mp3s.length} MP3s, expected ${expected}`);
    }

    for (const file of mp3s) {
      fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }

    console.log(`copied ${slug} → public/audio/learning-books/${slug}/`);
    continue;
  }

  const installed = fs
    .readdirSync(destDir)
    .filter((f) => f.endsWith(".mp3")).length;
  if (installed === expected) {
    console.log(`skip ${slug}: no source folder; public already has ${installed} MP3s`);
    continue;
  }

  throw new Error(
    `Missing source folder: ${srcDir} (public has ${installed}/${expected} MP3s)`
  );
}

console.log("\n--- verification ---");
for (const { slug, expected } of BOOKS) {
  verifyBook(slug, expected);
}

console.log("\ninstall-learning-book-stem-flat-audio: done");
