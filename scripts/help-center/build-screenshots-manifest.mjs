#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outPath = join(root, "data", "help-center", "screenshots-manifest.json");
const contentDir = join(root, "data", "help-center", "content");

const SECTION_BY_FILE = {
  "parents.js": "parents",
  "students.js": "students",
  "parent-report.js": "parent-report",
  "subjects.js": "subjects",
};

function collectPathsFromSource() {
  const paths = new Set();
  // screenshotBlock(S, "<slug>", "<region>", "<alt>")
  const blockRe = /screenshotBlock\(\s*S,\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g;
  const blockSlugVarRe = /screenshotBlock\(\s*S,\s*slug,\s*"([^"]+)",/g;
  const literalRe = /path:\s*`(\/help-center\/screenshots\/[^`]+)`/g;

  for (const file of readdirSync(contentDir)) {
    if (!file.endsWith(".js")) continue;
    const section = SECTION_BY_FILE[file];
    if (!section) continue;
    const text = readFileSync(join(contentDir, file), "utf8");

    let m;
    while ((m = blockRe.exec(text))) {
      const slug = m[1];
      const region = m[2];
      const base = `/help-center/screenshots/${section}/${slug}`;
      for (const vp of ["desktop", "mobile", "tablet"]) {
        paths.add(`${base}/${vp}/${region}.png`);
      }
    }
    if (section === "subjects") {
      while ((m = blockSlugVarRe.exec(text))) {
        const region = m[1];
        const slugRe = /subjectArticle\(\s*"([^"]+)"/g;
        let sm;
        while ((sm = slugRe.exec(text))) {
          const slug = sm[1];
          const base = `/help-center/screenshots/${section}/${slug}`;
          for (const vp of ["desktop", "mobile", "tablet"]) {
            paths.add(`${base}/${vp}/${region}.png`);
          }
        }
      }
    }
    while ((m = literalRe.exec(text))) {
      paths.add(m[1]);
      paths.add(m[1].replace("/desktop/", "/mobile/"));
      paths.add(m[1].replace("/desktop/", "/tablet/"));
    }
  }
  const subjectSlugs = [
    "math",
    "geometry",
    "english",
    "science",
    "hebrew",
    "moledet-geography",
  ];
  for (const slug of subjectSlugs) {
    for (const region of ["question", "explanation"]) {
      const base = `/help-center/screenshots/subjects/${slug}`;
      for (const vp of ["desktop", "mobile", "tablet"]) {
        paths.add(`${base}/${vp}/${region}.png`);
      }
    }
  }

  return [...paths].sort();
}

const paths = collectPathsFromSource();
const manifest = {
  version: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  publicPaths: paths.map((p) => p.replace(/^\//, "")),
};

writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${manifest.publicPaths.length} paths to ${outPath}`);
