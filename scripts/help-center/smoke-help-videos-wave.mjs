#!/usr/bin/env node
/** Smoke: primary help articles expose captured webm paths (SSR HTML or static props). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifest = JSON.parse(
  readFileSync(join(root, "data/help-center/videos-manifest.json"), "utf8")
);

function videoBlock(section, slug) {
  const entryId = `${section}/${slug}/main`;
  const entry = manifest.videos.find((v) => v.id === entryId);
  if (!entry || entry.assetKind !== "captured") return { src: null };
  const mapVp = (vp) => ({
    webm: `/${entry.assets[vp].webm}`,
  });
  return {
    sourcesByViewport: { desktop: mapVp("desktop"), mobile: mapVp("mobile") },
  };
}

const PRIMARY = [
  ["parent-report", "report-overview"],
  ["parents", "add-students"],
  ["students", "student-login"],
  ["parents", "how-to-read-report"],
  ["parents", "parent-copilot"],
  ["students", "student-home-tour"],
  ["students", "choose-subject-and-grade"],
  ["subjects", "math"],
  ["subjects", "geometry"],
  ["students", "hints-and-explanations"],
  ["students", "answering-questions"],
  ["students", "daily-missions"],
  ["students", "coins-and-arcade"],
];

const EXCLUDED = [
  ["parents", "create-parent-account"],
];

let ok = 0;
const errors = [];

for (const [section, slug] of PRIMARY) {
  const block = videoBlock(section, slug);
  const d = block.sourcesByViewport?.desktop?.webm;
  const m = block.sourcesByViewport?.mobile?.webm;
  if (!d?.includes(".webm") || !m?.includes(".webm")) {
    errors.push(`${section}/${slug}: missing sources (${d}, ${m})`);
    continue;
  }
  ok++;
}

for (const [section, slug] of EXCLUDED) {
  const block = videoBlock(section, slug);
  if (block.src !== null || block.sourcesByViewport?.desktop?.webm) {
    errors.push(`${section}/${slug}: should be dormant, got video sources`);
  }
}

const captured = manifest.videos.filter((v) => v.assetKind === "captured").length;
if (captured !== 13) errors.push(`Expected 13 captured manifest entries, got ${captured}`);

if (errors.length) {
  console.error("SMOKE FAILED:");
  errors.forEach((e) => console.error(" ", e));
  process.exit(1);
}
console.log(`SMOKE OK: ${ok}/13 primary videoBlocks resolve desktop+mobile webm; #2 dormant; manifest captured=${captured}`);
