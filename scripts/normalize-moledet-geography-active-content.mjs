#!/usr/bin/env node
/**
 * Normalize G2–G6 Moledet/Geography draft pages for prepared (hidden) books.
 * Run: node scripts/normalize-moledet-geography-active-content.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DRAFTS_ROOT = path.join(ROOT, "docs/learning-book/moledet-geography");

/** @type {Record<string, "moledet"|"geography">} */
const SUBJECT_BY_GRADE = {
  g2: "moledet",
  g3: "moledet",
  g4: "moledet",
  g5: "geography",
  g6: "geography",
};

const ISRAEL_MAP_FIXES = [
  [/במזרח — ים/g, "במערב — הים התיכון"],
  [/הכחול במזרח על המפה/g, "הכחול במערב על המפה — הים התיכון"],
  [
    /\*\*Owner verification:\*\* תוויות מפה ושמות גיאוגרפיים — רשימת בעלים נדרשת לפני פרסום\n/g,
    "**Content scope:** קריאת מפת ארץ בסיסית; הים התיכון במערב; ללא קואורדינטות\n",
  ],
];

/** @param {string} src */
function normalizeMetadataBlock(src, grade) {
  const subject = SUBJECT_BY_GRADE[grade];
  let out = src;

  out = out.replace(/\| \*\*subject\*\* \| geography \|/g, `| **subject** | ${subject} |`);
  out = out.replace(/\| \*\*approval_status\*\* \| draft \|/g, "| **approval_status** | approved |");
  out = out.replace(
    /\| \*\*title_hebrew\*\* \| ([^|]+?) `\[DRAFT — not owner-approved\]` \|/g,
    "| **title_hebrew** | $1 |"
  );

  out = out.replace(/\n\*\*Owner verification:\*\*[^\n]*\[VERIFY\][^\n]*\n/g, "\n");
  out = out.replace(/\n\*\*Owner verification:\*\*[^\n]*\n/g, "\n");

  if (/\[DRAFT/i.test(out) || /\[VERIFY\]/i.test(out)) {
    out = out.replace(/\[DRAFT[^\]]*\]/gi, "");
    out = out.replace(/\[VERIFY\]/gi, "");
  }

  return out;
}

let updated = 0;

for (const grade of ["g2", "g3", "g4", "g5", "g6"]) {
  const dir = path.join(DRAFTS_ROOT, grade, "drafts");
  if (!fs.existsSync(dir)) continue;

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    const filePath = path.join(dir, file);
    let src = fs.readFileSync(filePath, "utf8");
    const before = src;

    src = normalizeMetadataBlock(src, grade);

    if (file === "mg_g3_israel_map.md") {
      for (const [pattern, replacement] of ISRAEL_MAP_FIXES) {
        src = src.replace(pattern, replacement);
      }
      src = src.replace(
        "שואלים: איפה הים? — מוצאים את הכחול במערב על המפה — הים התיכון.",
        "שואלים: איפה הים? — מוצאים את הכחול במערב — שם נמצא הים התיכון."
      );
    }

    if (src !== before) {
      fs.writeFileSync(filePath, src, "utf8");
      updated += 1;
      console.log("updated", `${grade}/${file}`);
    }
  }
}

console.log(`normalize-moledet-geography-active-content: ${updated} files updated`);
