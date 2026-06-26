/**
 * Archive old video-builder projects; keep parent draft-9 active.
 * Rebuilds projects-index.json from all project JSON files on disk.
 * Run: node scripts/admin-video-builder-archive-old-projects.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const INDEX = join(ROOT, "data/admin-video-builder/projects-index.json");
const PROJECTS = join(ROOT, "data/admin-video-builder/projects");

const KEEP_ACTIVE = new Set([
  "a9aad830-c5da-409e-bb0d-64945b180e67",
  "5fff740f-be30-42ca-9cbf-1fdb5920b93d",
]);

const OUTPUT_ALIASES = {
  "a9aad830-c5da-409e-bb0d-64945b180e67":
    "/admin-video-assets/outputs/leo-kids-parent-desktop-promo-draft-9.mp4",
  "5fff740f-be30-42ca-9cbf-1fdb5920b93d":
    "/admin-video-assets/outputs/leo-kids-parent-mobile-promo-draft-9.mp4",
};

const now = new Date().toISOString();
const report = { active: [], archived: [] };
const indexRows = [];

for (const file of readdirSync(PROJECTS).filter((f) => f.endsWith(".json"))) {
  const id = file.replace(/\.json$/, "");
  const project = JSON.parse(readFileSync(join(PROJECTS, file), "utf8"));
  const shouldArchive = !KEEP_ACTIVE.has(id);

  project.archived = shouldArchive;
  project.updatedAt = now;

  if (!shouldArchive && OUTPUT_ALIASES[id]) {
    project.outputMp4Path = OUTPUT_ALIASES[id];
  }

  writeFileSync(join(PROJECTS, file), JSON.stringify(project, null, 2), "utf8");

  const row = {
    id,
    name: project.name,
    status: project.status || "draft",
    updatedAt: now,
    outputMp4Path: project.outputMp4Path ?? null,
    archived: shouldArchive,
  };
  indexRows.push(row);

  if (shouldArchive) {
    report.archived.push({ id, name: project.name });
  } else {
    report.active.push({ id, name: project.name, outputMp4Path: row.outputMp4Path });
  }
}

indexRows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name, "he"));
writeFileSync(INDEX, JSON.stringify(indexRows, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
