#!/usr/bin/env node
/**
 * Restore flat english-g1/g2 TXT from nested backup after mistaken site→TXT sync.
 * Only copies pages where flat differs from nested backup.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const PILOT_SLUGS = ["english-g1", "english-g2", "hebrew-g1", "hebrew-g2"];

/** @type {[string, string, number, string][]} */
const BOOKS = [
  ["english", "g1", 154, "english-g1"],
  ["english", "g2", 182, "english-g2"],
  ["hebrew", "g1", 224, "hebrew-g1"],
  ["hebrew", "g2", 161, "hebrew-g2"],
];

function padPageNum(n) {
  return String(n).padStart(3, "0");
}

function normalizeText(s) {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** @type {object[]} */
const restored = [];

for (const [subject, grade, total, slug] of BOOKS) {
  const flatDir = path.join(ROOT, "exports/audio-text/books", slug, "pages");
  const nestDir = path.join(ROOT, "exports/audio-text/books", subject, slug, "pages");

  for (let i = 1; i <= total; i += 1) {
    const file = `page-${padPageNum(i)}.txt`;
    const flatPath = path.join(flatDir, file);
    const nestPath = path.join(nestDir, file);
    if (!fs.existsSync(nestPath)) {
      throw new Error(`Missing backup: ${nestPath}`);
    }
    const flat = fs.existsSync(flatPath) ? normalizeText(fs.readFileSync(flatPath, "utf8")) : "";
    const nest = normalizeText(fs.readFileSync(nestPath, "utf8"));
    if (flat !== nest) {
      fs.writeFileSync(flatPath, `${nest}\n`, "utf8");
      restored.push({ book: slug, pageNumber: i, file });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  reason: "Recover TXT after mistaken site→TXT sync (sync-pilot-audio-text-books.mjs)",
  pagesRestored: restored.length,
  restored,
};

fs.writeFileSync(
  path.join(ROOT, "exports/audio-text/pilot-txt-restore-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(`Restored ${restored.length} TXT pages from nested backup`);
for (const slug of PILOT_SLUGS) {
  const n = restored.filter((r) => r.book === slug).length;
  console.log(`  ${slug}: ${n}`);
}
