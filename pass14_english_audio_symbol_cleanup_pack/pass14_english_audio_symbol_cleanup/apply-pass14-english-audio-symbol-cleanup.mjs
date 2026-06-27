/**
 * PASS 14 — English audio-symbol cleanup.
 * Applies exact replacements only from pass14_exact_english_replacements.json.
 * Supports english zip/repo layouts:
 * - exports/audio-text/books/english/<book>/pages/page-xxx.txt
 * - exports/audio-text/books/<book>/pages/page-xxx.txt
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BOOKS_ROOT = path.join(ROOT, "exports", "audio-text", "books");
const JSON_PATH = path.join(__dirname, "pass14_exact_english_replacements.json");

const replacements = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const changed = [];
const missing = [];

function resolvePath(relPath) {
  const normalized = relPath.replaceAll("\\", "/");
  const candidates = [
    path.join(BOOKS_ROOT, normalized),
    path.join(BOOKS_ROOT, normalized.replace(/^english\//, "")),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

for (const item of replacements) {
  const filePath = resolvePath(item.path);
  if (!fs.existsSync(filePath)) {
    missing.push({ path: item.path, reason: "file_not_found" });
    continue;
  }

  const before = fs.readFileSync(filePath, "utf8");
  if (!before.includes(item.from)) {
    missing.push({ path: item.path, reason: "from_not_found", from: item.from });
    continue;
  }

  const after = before.split(item.from).join(item.to);
  if (after !== before) {
    fs.writeFileSync(filePath, after.endsWith("\n") ? after : `${after}\n`, "utf8");
    const rel = path.relative(ROOT, filePath).replaceAll("\\", "/");
    if (!changed.includes(rel)) changed.push(rel);
  }
}

const report = {
  pass: "PASS 14 English audio-symbol cleanup",
  replacementsRequested: replacements.length,
  changedFileCount: changed.length,
  changedFiles: changed,
  missingCount: missing.length,
  missing,
};

const reportPath = path.join(ROOT, "exports", "audio-text", "pass14-english-audio-symbol-cleanup-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify(report, null, 2));
if (missing.length) process.exit(1);
