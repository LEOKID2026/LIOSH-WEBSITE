/**
 * Render all line-art assets to public/ + build coloring-pages-catalog.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderColoringPage } from "./render-coloring-page.mjs";
import { ROOT } from "./load-env.mjs";
import { COLORING_ASSET_BASE } from "../../lib/coloring/coloring-worksheet-types.js";

const CATALOG_IN = path.join(ROOT, "data/coloring/reward-cards-source-catalog.json");
const LINE_ART_DIR = path.join(ROOT, "tmp/coloring-pages-work/line-art-ai");
const LEGACY_LINE_ART_DIR = path.join(ROOT, "tmp/coloring-pages-work/line-art");
const PILOT_LINE_ART = path.join(ROOT, "tmp/coloring-pages-pilot/event_birthday-coloring-draft-raw.png");
const FONT = path.join(ROOT, "tmp/coloring-pages-pilot/fonts/NotoSansHebrew-Variable.ttf");
const PUBLIC_FONT = path.join(ROOT, "public/assets/coloring-pages/fonts/NotoSansHebrew-Variable.ttf");

const OUT = {
  lineArt: path.join(ROOT, "public/assets/coloring-pages/cards/line-art"),
  a4: path.join(ROOT, "public/assets/coloring-pages/cards/a4"),
  preview: path.join(ROOT, "public/assets/coloring-pages/cards/previews"),
};
const CATALOG_OUT = path.join(ROOT, "data/coloring/coloring-pages-catalog.json");

function relPublic(abs) {
  return `/${path.relative(path.join(ROOT, "public"), abs).replace(/\\/g, "/")}`;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_IN, "utf8"));
  const cards = catalog.cards.filter((c) => c.isActive !== false);

  fs.mkdirSync(path.dirname(PUBLIC_FONT), { recursive: true });
  if (fs.existsSync(FONT) && !fs.existsSync(PUBLIC_FONT)) {
    fs.copyFileSync(FONT, PUBLIC_FONT);
  }

  for (const dir of Object.values(OUT)) fs.mkdirSync(dir, { recursive: true });

  /** @type {Record<string, unknown>[]} */
  const entries = [];
  const missing = [];

  for (const card of cards) {
    const key = card.cardKey;
    let artPath = path.join(LINE_ART_DIR, `${key}.png`);
    if (!fs.existsSync(artPath)) {
      artPath = path.join(LEGACY_LINE_ART_DIR, `${key}.png`);
    }
    if (key === "event_birthday" && fs.existsSync(PILOT_LINE_ART)) {
      artPath = PILOT_LINE_ART;
    }
    if (!fs.existsSync(artPath)) {
      missing.push(key);
      continue;
    }

    const lineArtOut = path.join(OUT.lineArt, `${key}.png`);
    const a4Out = path.join(OUT.a4, `${key}.png`);
    const previewOut = path.join(OUT.preview, `${key}.png`);

    if (!fs.existsSync(lineArtOut) || process.argv.includes("--force-line-art")) {
      fs.copyFileSync(artPath, lineArtOut);
    }

    const page = await renderColoringPage({
      artPath: lineArtOut,
      title: card.displayNameHe,
      fontPath: fs.existsSync(PUBLIC_FONT) ? PUBLIC_FONT : FONT,
    });
    fs.writeFileSync(a4Out, page);

    await (await import("sharp")).default(a4Out)
      .resize(620, 877, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(previewOut);

    entries.push({
      cardKey: key,
      displayNameHe: card.displayNameHe,
      category: card.category,
      sourceImagePath: `tmp/coloring-pages-work/sources/${key}.png`,
      lineArtPath: relPublic(lineArtOut),
      a4Path: relPublic(a4Out),
      previewPath: relPublic(previewOut),
    });
  }

  fs.mkdirSync(path.dirname(CATALOG_OUT), { recursive: true });
  fs.writeFileSync(
    CATALOG_OUT,
    JSON.stringify(
      {
        version: 1,
        assetBase: COLORING_ASSET_BASE,
        generatedAt: new Date().toISOString(),
        count: entries.length,
        cards: entries.sort((a, b) => a.cardKey.localeCompare(b.cardKey)),
        missingLineArt: missing,
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      { rendered: entries.length, missing: missing.length, catalog: CATALOG_OUT },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
