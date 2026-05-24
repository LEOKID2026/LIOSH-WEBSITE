#!/usr/bin/env node
/** One-time wiring: insert videoBlock after first screenshot per article in content/*.js */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync as readManifest } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const contentDir = join(root, "data", "help-center", "content");
const manifest = JSON.parse(
  readManifest(join(root, "data", "help-center", "videos-manifest.json"), "utf8")
);
const slugSet = new Set(manifest.videos.map((v) => `${v.section}/${v.slug}`));

const SLUGS_NO_SCREENSHOT = {
  "parents/troubleshooting-login": '    videoBlock(S, "troubleshooting-login"),\n',
  "parents/privacy-and-data": '    videoBlock(S, "privacy-and-data"),\n',
  "students/hints-and-explanations":
    '    videoBlock(S, "hints-and-explanations"),\n',
  "students/tips-for-good-practice": '    videoBlock(S, "tips-for-good-practice"),\n',
};

for (const file of ["parents.js", "students.js", "parent-report.js", "subjects.js"]) {
  let t = readFileSync(join(contentDir, file), "utf8");
  if (!t.includes("videoBlock,")) {
    t = t.replace("screenshotBlock,", "screenshotBlock,\n  videoBlock,");
  }

  const lines = t.split("\n");
  const out = [];
  let section = file.replace(".js", "").replace("parent-report", "parent-report");
  if (file === "parents.js") section = "parents";
  if (file === "students.js") section = "students";
  if (file === "subjects.js") section = "subjects";

  let currentSlug = null;
  let videoInsertedForArticle = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const slugMatch = line.match(/^\s*slug:\s*"([^"]+)"/);
    if (slugMatch) {
      currentSlug = slugMatch[1];
      videoInsertedForArticle = false;
    }
    const subjMatch = line.match(/subjectArticle\(\s*"([^"]+)"/);
    if (subjMatch) {
      currentSlug = subjMatch[1];
      videoInsertedForArticle = false;
    }

    out.push(line);

    const shotLiteral = line.match(/screenshotBlock\(S,\s*"([^"]+)"/);
    const shotSlug = line.match(/screenshotBlock\(S,\s*slug,/);

    if (!videoInsertedForArticle && (shotLiteral || shotSlug)) {
      const slug = shotLiteral ? shotLiteral[1] : currentSlug;
      const key = `${section}/${slug}`;
      if (slugSet.has(key)) {
        const indent = line.match(/^(\s*)/)[1];
        const vb = shotSlug
          ? `${indent}videoBlock(S, slug),`
          : `${indent}videoBlock(S, "${slug}"),`;
        out.push(vb);
        videoInsertedForArticle = true;
      }
    }

    if (
      !videoInsertedForArticle &&
      currentSlug &&
      (line.match(/^\s*relatedLinks\(/) || line.match(/^\s*callout\(/)) &&
      SLUGS_NO_SCREENSHOT[`${section}/${currentSlug}`]
    ) {
      out.push(SLUGS_NO_SCREENSHOT[`${section}/${currentSlug}`].trimEnd());
      videoInsertedForArticle = true;
    }

    if (
      !videoInsertedForArticle &&
      currentSlug &&
      line.match(/^\s*disclaimerQuoteBlock\(\)/) &&
      section === "parent-report" &&
      currentSlug === "understanding-the-disclaimer"
    ) {
      /* video after screenshot below */
    }
  }

  writeFileSync(join(contentDir, file), out.join("\n"), "utf8");
  console.log(`Wired ${file}`);
}
