/**
 * Shared helpers for standalone Ministry oracle build scripts only.
 * NOT imported by runtime, CI, or product code.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../..");

export const ORACLE_DIR = path.join(REPO_ROOT, "data/curriculum-oracle/v1");
export const PARTIAL_DIR = path.join(ORACLE_DIR, "partial");
export const TXT_DIR = path.join(REPO_ROOT, "תוכנית משרד החינוך קובצי TXT");
export const PDF_DIR = path.join(REPO_ROOT, "תוכנית משרד החינוך");

export const NULL_SEQUENCE = Object.freeze({
  sequence_index: null,
  sequence_group: null,
  prerequisite_row_ids: null,
  prerequisite_skill_ids: null,
  sequence_source_anchor: null,
  sequence_confidence: null,
  sequence_notes: null,
});

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readText(relOrAbs) {
  const p = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(REPO_ROOT, relOrAbs);
  return fs.readFileSync(p, "utf8");
}

export function readJson(relOrAbs) {
  return JSON.parse(readText(relOrAbs));
}

export function writeJson(relOrAbs, data) {
  const p = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(REPO_ROOT, relOrAbs);
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w\u0590-\u05FF]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toLowerCase()
    .slice(0, 80) || "topic";
}

export function gradeFromHebrewLetter(letter) {
  const map = { א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6 };
  return map[letter] ?? null;
}

export function makeRowId(subject, grade, ...parts) {
  const tail = parts.map((p) => slugify(p)).filter(Boolean).join(".");
  return `${subject}.g${grade}${tail ? `.${tail}` : ""}`;
}

export function makeSequence({
  sequence_index,
  sequence_group,
  prerequisite_row_ids = [],
  prerequisite_skill_ids = [],
  sequence_source_anchor,
  sequence_confidence,
  sequence_notes,
}) {
  return {
    sequence_index,
    sequence_group,
    prerequisite_row_ids,
    prerequisite_skill_ids,
    sequence_source_anchor,
    sequence_confidence,
    sequence_notes,
  };
}

export function writePartial(name, payload) {
  ensureDir(PARTIAL_DIR);
  writeJson(path.join(PARTIAL_DIR, `${name}.json`), payload);
}

export function assertNoInternalScaffold(rows, label) {
  for (const row of rows) {
    if (row.source_class === "internal_scaffold") {
      throw new Error(`${label}: internal_scaffold row ${row.row_id} must not enter ministry matrix`);
    }
  }
}
