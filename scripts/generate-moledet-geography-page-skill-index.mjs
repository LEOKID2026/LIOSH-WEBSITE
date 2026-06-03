#!/usr/bin/env node
/** Generate lib/learning-book/moledet-geography-page-skill-index.js from master scope. */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const { PAGE_CANDIDATES_BY_GRADE } = await import(
  pathToFileURL(
    path.join(ROOT, "scripts/lib/moledet-geography-master-scope-manifest.mjs")
  ).href
);

const grades = ["g2", "g3", "g4", "g5", "g6"];
/** @type {string[]} */
const blocks = [];

for (const grade of grades) {
  const pages = PAGE_CANDIDATES_BY_GRADE[grade] || [];
  const entries = pages.map(
    (p) =>
      `  ${JSON.stringify(p.page_id)}: { skillId: ${JSON.stringify(p.primary_skill_id)} }`
  );
  blocks.push(`export const MG_${grade.toUpperCase()}_PAGE_SKILLS = Object.freeze({\n${entries.join(",\n")}\n});`);
}

const out = `/** Generated — Moledet/Geography page skill index (G2–G6 active). */\n\n${blocks.join("\n\n")}\n`;

fs.writeFileSync(
  path.join(ROOT, "lib/learning-book/moledet-geography-page-skill-index.js"),
  out,
  "utf8"
);
console.log("wrote lib/learning-book/moledet-geography-page-skill-index.js");
