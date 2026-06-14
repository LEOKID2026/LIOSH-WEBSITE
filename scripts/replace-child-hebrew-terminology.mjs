/**
 * Replace user-facing Hebrew "תלמיד/תלמידים" with "ילד/ה/ילדים".
 * Skips learning question banks and internal docs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "review-packages",
  "docs",
  ".cursor",
  "_handoff",
  "hebrew-owner-review",
  "qa-evidence-audit",
]);

const SKIP_FILE_PATTERNS = [
  /[\\/]data[\\/]hebrew-literacy-/,
  /[\\/]data[\\/]science-questions\.js$/,
  /[\\/]data[\\/]english-questions[\\/]/,
  /[\\/]data[\\/]curriculum-oracle[\\/]/,
  /[\\/]utils[\\/]/,
  /[\\/]data[\\/]hebrew-copy-baseline[\\/]/,
];

const EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".json", ".md"]);

const RULES = [
  ["פורטל תלמידים", "עולם הילדים"],
  ["מדריך לתלמידים", "מדריך לילדים"],
  ["סימולטור תלמידים", "סימולטור ילדים"],
  ["בודק התחברות תלמיד", "בודק התחברות ילד/ה"],
  ["התחברות תלמיד", "התחברות ילד/ה"],
  ["כניסת תלמיד", "כניסת ילד/ה"],
  ["כניסה לתלמיד", "כניסה לילד/ה"],
  ["חשבון התלמיד", "חשבון הילד/ה"],
  ["שם תלמיד:", "שם ילד/ה:"],
  ["שם תלמיד לא", "שם ילד/ה לא"],
  ["שם משתמש לתלמיד", "שם משתמש לילד/ה"],
  ["PIN לתלמיד", "PIN לילד/ה"],
  ["פרטי כניסת תלמיד", "פרטי כניסת ילד/ה"],
  ["כניסת התלמיד", "כניסת הילד/ה"],
  ["המלצה לתלמיד", "המלצה לילד/ה"],
  ["נדרשת התחברות תלמיד", "נדרשת התחברות ילד/ה"],
  ["נשלח לתלמיד", "נשלח לילד/ה"],
  ["פורסם לתלמיד", "פורסם לילד/ה"],
  ["בדיקת תלמיד", "בדיקת ילד/ה"],
  ["דוח תלמיד", "דוח ילד/ה"],
  ["מזהה תלמיד", "מזהה ילד/ה"],
  ["תשובת התלמיד", "תשובת הילד/ה"],
  ["יש להתחבר כתלמיד", "יש להתחבר כילד/ה"],
  ["כתלמיד", "כילד/ה"],
  ["לתלמידים", "לילדים"],
  ["התלמידים", "הילדים"],
  ["לתלמיד", "לילד/ה"],
  ["התלמיד", "הילד/ה"],
  ["תלמיד/ה", "ילד/ה"],
  ["תלמידים", "ילדים"],
  ["תלמידות", "ילדות"],
  ["תלמידי", "ילדי"],
  ["תלמידה", "ילדה"],
  ["תלמיד", "ילד/ה"],
];

function shouldSkipFile(absPath) {
  if (!EXT.has(path.extname(absPath))) return true;
  return SKIP_FILE_PATTERNS.some((re) => re.test(absPath.replace(/\//g, "\\")) || re.test(absPath));
}

function shouldSkipDir(absPath) {
  return SKIP_DIR_NAMES.has(path.basename(absPath));
}

function replaceText(text) {
  let out = text;
  for (const [from, to] of RULES) {
    out = out.split(from).join(to);
  }
  return out;
}

function walk(dir, changedFiles) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(abs)) continue;
      walk(abs, changedFiles);
      continue;
    }
    if (shouldSkipFile(abs)) continue;
    const before = fs.readFileSync(abs, "utf8");
    if (!before.includes("תלמיד")) continue;
    const after = replaceText(before);
    if (after !== before) {
      fs.writeFileSync(abs, after, "utf8");
      changedFiles.push(path.relative(ROOT, abs));
    }
  }
}

const targets = ["pages", "components", "lib", "data/help-center", "data/legal", "tests/e2e", "scripts/help-center"];
const changed = [];
for (const rel of targets) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) walk(abs, changed);
}

console.log(`Updated ${changed.length} files`);
for (const f of changed.sort()) console.log(f);
