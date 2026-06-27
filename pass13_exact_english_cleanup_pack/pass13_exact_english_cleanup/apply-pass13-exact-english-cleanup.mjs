/**
 * PASS 13 — Exact English cleanup.
 * Applies exact line/text replacements only in English books.
 * Does not touch other subjects.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const replacementsPathCandidates = [
  path.join(ROOT, "scripts", "pass13_exact_english_replacements.json"),
  path.join(ROOT, "pass13_exact_english_cleanup", "pass13_exact_english_replacements.json"),
  path.join(ROOT, "pass13_exact_english_replacements.json"),
];

const replacementsPath = replacementsPathCandidates.find((p) => fs.existsSync(p));
if (!replacementsPath) {
  console.error("Missing pass13_exact_english_replacements.json");
  process.exit(1);
}

const replacements = JSON.parse(fs.readFileSync(replacementsPath, "utf8"));

function pagePath(book, page) {
  const candidates = [
    path.join(ROOT, "exports", "audio-text", "books", "english", book, "pages", page),
    path.join(ROOT, "exports", "audio-text", "books", book, "pages", page),
  ];
  const existing = candidates.find((p) => fs.existsSync(p));
  if (!existing) {
    throw new Error(`Missing page file for ${book}/${page}. Tried:\n${candidates.join("\n")}`);
  }
  return existing;
}

const changed = new Set();
const applied = [];
const missing = [];

for (const item of replacements) {
  const p = pagePath(item.book, item.page);
  let text = fs.readFileSync(p, "utf8");
  if (!text.includes(item.from)) {
    missing.push({ file: path.relative(ROOT, p).replaceAll("\\", "/"), from: item.from });
    continue;
  }
  const next = text.split(item.from).join(item.to);
  if (next !== text) {
    fs.writeFileSync(p, next.endsWith("\n") ? next : `${next}\n`, "utf8");
    changed.add(path.relative(ROOT, p).replaceAll("\\", "/"));
    applied.push({ file: path.relative(ROOT, p).replaceAll("\\", "/"), from: item.from, to: item.to });
  }
}

const report = {
  appliedCount: applied.length,
  changedFileCount: changed.size,
  changedFiles: [...changed].sort(),
  missingCount: missing.length,
  missing,
};

const reportPath = path.join(ROOT, "exports", "audio-text", "pass13-exact-english-report.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify(report, null, 2));

if (missing.length) {
  console.error("Some replacements were not found. Do not continue without review.");
  process.exit(1);
}
