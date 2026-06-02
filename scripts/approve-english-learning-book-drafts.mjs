#!/usr/bin/env node
/**
 * Promote English learning-book draft pages for student exposure.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRAFT_SUFFIX = " `[DRAFT — not owner-approved]`";
let updated = 0;

for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
  const dir = path.join(ROOT, "docs/learning-book/english", grade, "drafts");
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    const filePath = path.join(dir, file);
    let raw = fs.readFileSync(filePath, "utf8");
    const before = raw;
    raw = raw.replaceAll(DRAFT_SUFFIX, "");
    raw = raw.replace(
      /\|\s*\*\*approval_status\*\*\s*\|\s*draft\s*\|/g,
      "| **approval_status** | approved |"
    );
    if (raw !== before) {
      fs.writeFileSync(filePath, raw, "utf8");
      updated++;
    }
  }
}

console.log(`approve-english-learning-book-drafts: updated ${updated} files`);
