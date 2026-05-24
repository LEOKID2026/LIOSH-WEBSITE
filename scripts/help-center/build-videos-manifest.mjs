#!/usr/bin/env node
/**
 * Build / validate data/help-center/videos-manifest.json (42 entries, dual viewport).
 */
import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const contentDir = join(root, "data", "help-center", "content");
const outPath = join(root, "data", "help-center", "videos-manifest.json");

const SECTION_BY_FILE = {
  "parents.js": "parents",
  "students.js": "students",
  "parent-report.js": "parent-report",
  "subjects.js": "subjects",
};

/** @returns {{ section: string, slug: string, title: string }[]} */
function loadArticlesFromContent() {
  const articles = [];
  for (const file of readdirSync(contentDir)) {
    if (!file.endsWith(".js")) continue;
    const section = SECTION_BY_FILE[file];
    if (!section) continue;
    const text = readFileSync(join(contentDir, file), "utf8");
    if (section === "subjects") {
      const re = /subjectArticle\(\s*"([^"]+)",\s*"([^"]+)"/g;
      let m;
      while ((m = re.exec(text))) {
        articles.push({
          section,
          slug: m[1],
          title: `מדריך ${m[2]}`,
        });
      }
      continue;
    }
    const re =
      /(?:baseArticle|studentArticle)\(\{\s*slug:\s*"([^"]+)",\s*[^]*?title:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(text))) {
      articles.push({ section, slug: m[1], title: m[2] });
    }
  }
  return articles;
}
import {
  audienceForSection,
  captureStepsFor,
  routeForVideo,
  waveForEntry,
} from "./video-routes.mjs";

function assetPaths(section, slug) {
  const base = `help-center/videos/${section}/${slug}`;
  const make = (vp) => ({
    webm: `${base}/${vp}/main.webm`,
    mp4: null,
    poster: `${base}/${vp}/main.jpg`,
    captionsHe: null,
  });
  return { desktop: make("desktop"), mobile: make("mobile") };
}

function buildEntry(article) {
  const { section, slug, title } = article;
  const wave = waveForEntry(section, slug);
  const route = routeForVideo({ section, slug });
  const durDesktop = wave === "A" ? 45 : 35;
  const durMobile = wave === "A" ? 50 : 40;
  return {
    id: `${section}/${slug}/main`,
    section,
    slug,
    audience: audienceForSection(section),
    title,
    viewports: ["desktop", "mobile"],
    wave,
    durationSecTarget: { desktop: durDesktop, mobile: durMobile },
    auth: route.auth,
    route: route.path,
    captureSteps: {
      desktop: captureStepsFor("desktop", section, slug),
      mobile: captureStepsFor("mobile", section, slug),
    },
    assets: assetPaths(section, slug),
    assetKind: "placeholder",
    internalReview: {
      desktop: {
        status: "excluded",
        reason: "placeholder scaffold — not a real article capture",
      },
      mobile: {
        status: "excluded",
        reason: "placeholder scaffold — not a real article capture",
      },
    },
    transcriptHe: null,
  };
}

function validateManifest(doc) {
  const errors = [];
  if (!Array.isArray(doc.videos) || doc.videos.length !== 42) {
    errors.push(`expected 42 videos, got ${doc.videos?.length ?? 0}`);
  }
  for (const v of doc.videos || []) {
    if (JSON.stringify(v.viewports) !== JSON.stringify(["desktop", "mobile"])) {
      errors.push(`${v.id}: viewports must be [desktop, mobile]`);
    }
    for (const vp of ["desktop", "mobile"]) {
      if (!v.assets?.[vp]?.webm) errors.push(`${v.id}: missing assets.${vp}.webm`);
      if (!v.assets?.[vp]?.poster) errors.push(`${v.id}: missing assets.${vp}.poster`);
      if (v.assets?.[vp]?.mp4 != null) errors.push(`${v.id}: mp4 must be null`);
      if (!Array.isArray(v.captureSteps?.[vp]) || !v.captureSteps[vp].length) {
        errors.push(`${v.id}: captureSteps.${vp} empty`);
      }
    }
  }
  return errors;
}

function main() {
  const articles = loadArticlesFromContent();
  if (articles.length !== 42) {
    console.error(`Expected 42 articles from content, got ${articles.length}`);
    process.exit(1);
  }
  const videos = articles.map(buildEntry).sort((a, b) => {
    const w = a.wave.localeCompare(b.wave);
    if (w !== 0) return w;
    return `${a.section}/${a.slug}`.localeCompare(`${b.section}/${b.slug}`, "he");
  });

  const doc = {
    version: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    assetKindDefault: "placeholder",
    publishPolicy: {
      allowPlaceholderInPublic: false,
      note: "Only assetKind=captured assets may be published and shown in Help Center UI.",
    },
    checksumWhitelist: { desktop: { webm: [], poster: [] }, mobile: { webm: [], poster: [] } },
    videos,
    publicPaths: videos.flatMap((v) => [
      v.assets.desktop.webm,
      v.assets.mobile.webm,
      v.assets.desktop.poster,
      v.assets.mobile.poster,
    ]),
  };

  const errors = validateManifest(doc);
  if (errors.length) {
    console.error("Manifest validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(`Wrote ${videos.length} video entries → ${outPath}`);
  console.log(`  Wave A: ${videos.filter((v) => v.wave === "A").length}`);
  console.log(`  Wave B: ${videos.filter((v) => v.wave === "B").length}`);
  console.log(`  publicPaths: ${doc.publicPaths.length} (${videos.length * 4})`);
}

main();
