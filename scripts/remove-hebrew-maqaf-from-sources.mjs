#!/usr/bin/env node
/**
 * Remove Hebrew maqaf (U+05BE "־") from user-facing source strings.
 * Rules:
 * 1. ל־ + Latin/digit → אל + space
 * 2. ב/ל/מ/כ/ה/ש/ו + ־ + Hebrew letter → join (no maqaf)
 * 3. Any remaining ־ → space
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAQAF = "\u05BE";

/** @param {string} text */
export function removeHebrewMaqaf(text) {
  if (!text.includes(MAQAF)) return text;
  let s = text;
  s = s.replace(/([בלמכהשו])־(?=[א-ת])/g, "$1");
  s = s.replace(/ל־/g, "אל ");
  s = s.replace(/־/g, " ");
  return s;
}

const EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".md", ".json", ".jsonl", ".he.js"]);

const EXCLUDE_DIR = new Set([
  "node_modules",
  ".next",
  "review-packages",
  "_handoff",
  "tmp",
  "qa-evidence-audit",
  "hebrew-owner-review",
  "test-results",
]);

const EXCLUDE_PATH_PARTS = [
  /[\\/]hebrew-copy-baseline[\\/]/,
  /[\\/]language-review[\\/]book-language-batch/,
  /[\\/]language-review[\\/]book-text-extract\.json$/,
  /[\\/]docs[\\/]qa[\\/]/,
  /[\\/]tests[\\/]/,
];

const INCLUDE_DOC_DRAFT = /[\\/]docs[\\/]learning-book[\\/].+[\\/]drafts[\\/].+\.md$/i;
const EXCLUDE_DOC_META =
  /[\\/]docs[\\/]learning-book[\\/].*(PLAN|AUDIT|REVIEW_PACK|SIGNOFF|VISIBLE_TEXT_EXPORT|README)\.md$/i;

/** @param {string} rel */
function shouldProcess(rel) {
  const norm = rel.replace(/\//g, path.sep);
  if (EXCLUDE_PATH_PARTS.some((re) => re.test(norm))) return false;

  const top = norm.split(path.sep)[0];
  if (!["pages", "components", "utils", "lib", "data", "scripts"].includes(top)) {
    if (INCLUDE_DOC_DRAFT.test(norm)) return !EXCLUDE_DOC_META.test(norm);
    return false;
  }

  if (top === "scripts" && !norm.startsWith(`scripts${path.sep}lib${path.sep}`)) {
    return false;
  }

  if (top === "data") {
    if (/[\\/]hebrew-copy-baseline[\\/]/.test(norm)) return false;
    if (/[\\/]language-review[\\/]book-language-batch/.test(norm)) return false;
    if (norm.endsWith("book-text-extract.json")) return false;
    if (/[\\/]curriculum-oracle[\\/]/.test(norm)) return false;
  }

  return true;
}

/** @param {string} dir */
function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (EXCLUDE_DIR.has(name)) continue;
    const abs = path.join(dir, name);
    const rel = path.relative(ROOT, abs);
    if (!shouldProcess(rel) && !fs.statSync(abs).isDirectory()) continue;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (name === "docs") {
        const lb = path.join(abs, "learning-book");
        if (fs.existsSync(lb)) walk(lb, out);
        continue;
      }
      if (shouldProcess(rel + path.sep) || ["pages", "components", "utils", "lib", "data", "scripts"].includes(name)) {
        walk(abs, out);
      }
      continue;
    }
    const ext = path.extname(name);
    if (!EXT.has(ext)) continue;
    if (!shouldProcess(rel)) continue;
    out.push(abs);
  }
  return out;
}

function main() {
  const roots = ["pages", "components", "utils", "lib", "data", path.join("scripts", "lib")];
  const files = [];
  for (const r of roots) {
    const abs = path.join(ROOT, r);
    if (fs.existsSync(abs)) walk(abs, files);
  }
  const lb = path.join(ROOT, "docs", "learning-book");
  if (fs.existsSync(lb)) walk(lb, files);

  let changedFiles = 0;
  let replacedCount = 0;

  for (const abs of [...new Set(files)].sort()) {
    const raw = fs.readFileSync(abs, "utf8");
    if (!raw.includes(MAQAF)) continue;
    const before = (raw.match(/\u05BE/g) || []).length;
    const next = removeHebrewMaqaf(raw);
    const after = (next.match(/\u05BE/g) || []).length;
    if (next !== raw) {
      fs.writeFileSync(abs, next, "utf8");
      changedFiles += 1;
      replacedCount += before - after;
      console.log(`${path.relative(ROOT, abs)} (${before - after} removed)`);
    }
  }

  console.log(`\nDone: ${replacedCount} maqaf chars removed across ${changedFiles} files.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
