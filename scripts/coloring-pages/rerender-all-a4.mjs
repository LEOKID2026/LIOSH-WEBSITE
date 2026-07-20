/**
 * Re-render all A4 + preview PNGs from existing public line-art (after layout fix).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { renderColoringPage } from "./render-coloring-page.mjs";
import { ROOT } from "./load-env.mjs";

const CATALOG = path.join(ROOT, "data/coloring/coloring-pages-catalog.json");
const FONT = path.join(ROOT, "public/assets/coloring-pages/fonts/NotoSansHebrew-Variable.ttf");
const FALLBACK_FONT = path.join(ROOT, "tmp/coloring-pages-pilot/fonts/NotoSansHebrew-Variable.ttf");

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));
  const fontPath = fs.existsSync(FONT) ? FONT : FALLBACK_FONT;
  let ok = 0;
  let skip = 0;

  for (const card of catalog.cards) {
    const lineArtAbs = path.join(ROOT, "public", card.lineArtPath.replace(/^\//, "").replace(/\//g, path.sep));
    const a4Abs = path.join(ROOT, "public", card.a4Path.replace(/^\//, "").replace(/\//g, path.sep));
    const previewAbs = path.join(ROOT, "public", card.previewPath.replace(/^\//, "").replace(/\//g, path.sep));

    if (!fs.existsSync(lineArtAbs)) {
      skip += 1;
      continue;
    }

    try {
      const page = await renderColoringPage({
        artPath: lineArtAbs,
        title: card.displayNameHe,
        fontPath,
      });
      fs.mkdirSync(path.dirname(a4Abs), { recursive: true });
      fs.writeFileSync(a4Abs, page);
      await sharp(page)
        .resize(620, 877, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
        .png()
        .toFile(previewAbs);
      ok += 1;
      if (ok % 20 === 0) process.stdout.write(`${ok}...`);
    } catch (err) {
      skip += 1;
      console.error(`skip ${card.cardKey}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(JSON.stringify({ rerendered: ok, skipped: skip, total: catalog.cards.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
