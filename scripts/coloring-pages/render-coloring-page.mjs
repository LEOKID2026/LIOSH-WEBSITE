/**
 * Compose a printable coloring page: line-art PNG + catalog display title (RTL Hebrew).
 * Title is rendered in a separate layer — not burned into line-art assets.
 *
 * Usage:
 *   node scripts/coloring-pages/render-coloring-page.mjs \
 *     --art tmp/coloring-pages-pilot/event_birthday-coloring-draft-raw.png \
 *     --title "קלף יום הולדת" \
 *     --out-a4 tmp/coloring-pages-pilot/event_birthday-coloring-a4.png \
 *     --out-preview tmp/coloring-pages-pilot/event_birthday-coloring-preview.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  COLORING_PAGE_HEIGHT_PX,
  COLORING_PAGE_TITLE_FONT_PX,
  COLORING_PAGE_WIDTH_PX,
  getColoringPageArtPlacement,
  getColoringPageIllustrationFitSize,
  getColoringPageTitleBox,
  getColoringPageTitleTextBaselineY,
} from "../../lib/coloring/coloring-page-layout.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_FONT = path.join(ROOT, "public/assets/coloring-pages/fonts/NotoSansHebrew-Variable.ttf");
const FALLBACK_FONT = path.join(ROOT, "tmp/coloring-pages-pilot/fonts/NotoSansHebrew-Variable.ttf");

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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} title
 * @param {{ width: number, height: number }} box
 * @param {string} fontPath
 */
function buildTitleLayerSvg(title, box, fontPath) {
  const fontBase64 = fs.readFileSync(fontPath).toString("base64");
  const fontSize = COLORING_PAGE_TITLE_FONT_PX;
  const cx = box.width / 2;
  const cy = getColoringPageTitleTextBaselineY();

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}">
  <defs>
    <style>
      @font-face {
        font-family: "NotoSansHebrewColoring";
        src: url("data:font/ttf;base64,${fontBase64}") format("truetype");
        font-weight: 600;
      }
    </style>
  </defs>
  <text
    x="${cx}"
    y="${cy}"
    font-family="NotoSansHebrewColoring, sans-serif"
    font-size="${fontSize}"
    font-weight="600"
    fill="#111111"
    text-anchor="middle"
    direction="rtl"
    unicode-bidi="plaintext"
    dominant-baseline="alphabetic"
  >${escapeXml(title)}</text>
</svg>`);
}

/**
 * Trim whitespace and scale line-art to fill illustration height (like leo_shoe_shopping).
 * @param {string} artPath
 * @param {{ width: number, height: number }} fitSize
 */
async function prepareLineArtForPage(artPath, fitSize) {
  let trimmedBuffer;
  try {
    trimmedBuffer = await sharp(artPath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .trim({ threshold: 12 })
      .png()
      .toBuffer();
  } catch {
    trimmedBuffer = await sharp(artPath)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
  }

  const meta = await sharp(trimmedBuffer).metadata();
  const artW = meta.width || 1;
  const artH = meta.height || 1;

  const placedH = fitSize.height;
  const scale = placedH / artH;
  let placedW = Math.round(artW * scale);

  let artBuffer = await sharp(trimmedBuffer)
    .resize(placedW, placedH, { fit: "fill" })
    .png()
    .toBuffer();

  if (placedW > fitSize.width) {
    const left = Math.round((placedW - fitSize.width) / 2);
    artBuffer = await sharp(artBuffer)
      .extract({ left, top: 0, width: fitSize.width, height: placedH })
      .png()
      .toBuffer();
    placedW = fitSize.width;
  }

  return { artBuffer, placedW, placedH };
}

/**
 * @param {{ artPath: string, title: string, fontPath?: string }} opts
 */
export async function renderColoringPage({ artPath, title, fontPath = (fs.existsSync(DEFAULT_FONT) ? DEFAULT_FONT : FALLBACK_FONT) }) {
  const titleBox = getColoringPageTitleBox();
  const fitSize = getColoringPageIllustrationFitSize();

  const { artBuffer, placedW, placedH } = await prepareLineArtForPage(artPath, fitSize);
  const { left: artLeft, top: artTop } = getColoringPageArtPlacement(placedW, placedH);

  const titleSvg = buildTitleLayerSvg(title, titleBox, fontPath);
  const titlePng = await sharp(titleSvg).png().toBuffer();

  const page = await sharp({
    create: {
      width: COLORING_PAGE_WIDTH_PX,
      height: COLORING_PAGE_HEIGHT_PX,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: artBuffer, left: artLeft, top: artTop },
      { input: titlePng, left: titleBox.x, top: titleBox.y },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return page;
}

async function main() {
  const args = parseArgs(process.argv);
  const artPath = path.resolve(ROOT, args.art || "");
  const title = args.title || "";
  const outA4 = path.resolve(ROOT, args["out-a4"] || "");
  const outPreview = args["out-preview"] ? path.resolve(ROOT, args["out-preview"]) : null;
  const fontPath = args.font ? path.resolve(ROOT, args.font) : DEFAULT_FONT;

  if (!artPath || !title || !outA4) {
    console.error("Required: --art --title --out-a4");
    process.exit(1);
  }
  if (!fs.existsSync(artPath)) {
    console.error(`Art not found: ${artPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(fontPath)) {
    console.error(`Font not found: ${fontPath}`);
    process.exit(1);
  }

  const page = await renderColoringPage({ artPath, title, fontPath });
  fs.mkdirSync(path.dirname(outA4), { recursive: true });
  fs.writeFileSync(outA4, page);

  if (outPreview) {
    await sharp(page)
      .resize(620, 877, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
      .png()
      .toFile(outPreview);
  }

  console.log(JSON.stringify({ ok: true, outA4, outPreview, title }, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
