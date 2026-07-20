/**
 * Publish one card's line-art to public assets + render A4/preview.
 *
 * Usage:
 *   node scripts/coloring-pages/publish-card-assets.mjs --card event_birthday --art path/to/line-art.png
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { renderColoringPage } from "./render-coloring-page.mjs";
import { ROOT } from "./load-env.mjs";
import { COLORING_ASSET_BASE } from "../../lib/coloring/coloring-worksheet-types.js";

const CATALOG_IN = path.join(ROOT, "data/coloring/reward-cards-source-catalog.json");
const CATALOG_OUT = path.join(ROOT, "data/coloring/coloring-pages-catalog.json");
const PUBLIC_FONT = path.join(ROOT, "public/assets/coloring-pages/fonts/NotoSansHebrew-Variable.ttf");
const FALLBACK_FONT = path.join(ROOT, "tmp/coloring-pages-pilot/fonts/NotoSansHebrew-Variable.ttf");

const OUT = {
  lineArt: path.join(ROOT, "public/assets/coloring-pages/cards/line-art"),
  a4: path.join(ROOT, "public/assets/coloring-pages/cards/a4"),
  preview: path.join(ROOT, "public/assets/coloring-pages/cards/previews"),
};

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

function relPublic(abs) {
  return `/${path.relative(path.join(ROOT, "public"), abs).replace(/\\/g, "/")}`;
}

function loadCatalogCards() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_IN, "utf8"));
  return catalog.cards.filter((c) => c.isActive !== false);
}

function loadOrInitPublishedCatalog() {
  if (fs.existsSync(CATALOG_OUT)) {
    return JSON.parse(fs.readFileSync(CATALOG_OUT, "utf8"));
  }
  return { version: 1, assetBase: COLORING_ASSET_BASE, cards: [] };
}

/**
 * @param {string} cardKey
 * @param {string} artPath
 */
export async function publishCardAssets(cardKey, artPath) {
  const cards = loadCatalogCards();
  const card = cards.find((c) => c.cardKey === cardKey);
  if (!card) throw new Error(`Unknown card: ${cardKey}`);
  if (!fs.existsSync(artPath)) throw new Error(`Art not found: ${artPath}`);

  for (const dir of Object.values(OUT)) fs.mkdirSync(dir, { recursive: true });

  const lineArtOut = path.join(OUT.lineArt, `${cardKey}.png`);
  const a4Out = path.join(OUT.a4, `${cardKey}.png`);
  const previewOut = path.join(OUT.preview, `${cardKey}.png`);

  await sharp(artPath)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9 })
    .toFile(lineArtOut);

  const fontPath = fs.existsSync(PUBLIC_FONT) ? PUBLIC_FONT : FALLBACK_FONT;
  const page = await renderColoringPage({
    artPath: lineArtOut,
    title: card.displayNameHe,
    fontPath,
  });
  fs.writeFileSync(a4Out, page);
  await sharp(page)
    .resize(620, 877, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(previewOut);

  const published = loadOrInitPublishedCatalog();
  const entry = {
    cardKey,
    displayNameHe: card.displayNameHe,
    category: card.category,
    sourceImagePath: `tmp/coloring-pages-work/sources/${cardKey}.png`,
    lineArtPath: relPublic(lineArtOut),
    a4Path: relPublic(a4Out),
    previewPath: relPublic(previewOut),
  };
  const idx = published.cards.findIndex((c) => c.cardKey === cardKey);
  if (idx >= 0) published.cards[idx] = entry;
  else published.cards.push(entry);
  published.cards.sort((a, b) => a.cardKey.localeCompare(b.cardKey));
  published.count = published.cards.length;
  published.generatedAt = new Date().toISOString();
  published.missingLineArt = [];
  fs.writeFileSync(CATALOG_OUT, JSON.stringify(published, null, 2));

  return entry;
}

async function main() {
  const args = parseArgs(process.argv);
  const cardKey = args.card || "";
  const artPath = path.resolve(ROOT, args.art || "");
  if (!cardKey || !artPath) {
    console.error("Required: --card --art");
    process.exit(1);
  }
  const entry = await publishCardAssets(cardKey, artPath);
  console.log(JSON.stringify({ ok: true, entry }, null, 2));
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
