/**
 * Ingest agent-generated line-art files into public coloring assets.
 *
 * Usage:
 *   node scripts/coloring-pages/ingest-generated-batch.mjs --dir "C:/.../assets"
 *   node scripts/coloring-pages/ingest-generated-batch.mjs --map tmp/coloring-pages-work/batch-map.json
 *
 * batch-map.json: [{ "cardKey": "...", "artPath": "..." }]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publishCardAssets } from "./publish-card-assets.mjs";
import { ROOT } from "./load-env.mjs";

const PROGRESS_FILE = path.join(ROOT, "tmp/coloring-pages-work/generation-progress.json");
const LINE_ART_AI = path.join(ROOT, "tmp/coloring-pages-work/line-art-ai");

function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      out[key.slice(2)] = argv[i + 1] ?? "true";
      i += 1;
    }
  }
  return out;
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) return { done: {}, failed: {} };
  return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
}

function saveProgress(progress) {
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * @param {string} dir
 * @returns {Array<{ cardKey: string, artPath: string }>}
 */
function discoverFromDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith("-line-art.png"))
    .map((f) => ({
      cardKey: f.replace(/-line-art\.png$/, ""),
      artPath: path.join(dir, f),
    }));
}

async function main() {
  const args = parseArgs(process.argv);
  /** @type {Array<{ cardKey: string, artPath: string }>} */
  let items = [];
  if (args.map) {
    items = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.map), "utf8"));
  } else if (args.dir) {
    items = discoverFromDir(path.resolve(args.dir));
  } else {
    console.error("Required: --dir or --map");
    process.exit(1);
  }

  const progress = loadProgress();
  fs.mkdirSync(LINE_ART_AI, { recursive: true });

  for (const item of items) {
    try {
      const archivePath = path.join(LINE_ART_AI, `${item.cardKey}.png`);
      fs.copyFileSync(item.artPath, archivePath);
      await publishCardAssets(item.cardKey, archivePath);
      progress.done[item.cardKey] = new Date().toISOString();
      delete progress.failed[item.cardKey];
    } catch (err) {
      progress.failed[item.cardKey] = String(err instanceof Error ? err.message : err);
    }
  }

  saveProgress(progress);
  console.log(
    JSON.stringify(
      {
        ingested: items.length,
        done: Object.keys(progress.done).length,
        failed: Object.keys(progress.failed).length,
      },
      null,
      2
    )
  );
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
