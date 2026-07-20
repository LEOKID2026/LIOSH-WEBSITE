/**
 * Temporary — compare Hugging Face line-art styles on a local image.
 *
 * Usage:
 *   node scripts/coloring-upload/test-hf-styles.mjs [imagePath]
 *
 * Requires HF_TOKEN or HUGGINGFACE_TOKEN in environment (optional for public space).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  generateHfLineArt,
  HF_LINEART_FILTER,
  HF_LINEART_LINE_STYLE,
  resetHfLineArtClientForTests,
} from "../../lib/coloring-upload/hf-lineart.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "tmp", "hf-style-tests");
const imagePath = process.argv[2] || path.join(ROOT, "omer.jpeg");
const HF_MAX_LONG_EDGE = 1600;

const STYLES = [
  {
    id: "1-complex-standard",
    lineStyle: "Complex Lines",
    filter: "📄 Standard",
    description: "Complex Lines + Standard Filter (current setup)",
  },
  {
    id: "2-simple-standard",
    lineStyle: "Simple Lines",
    filter: "📄 Standard",
    description: "Simple Lines + Standard Filter",
  },
  {
    id: "3-complex-contour",
    lineStyle: "Complex Lines",
    filter: "🗺️ Contour",
    description: "Complex Lines + Contour Filter",
  },
];

async function prepareInputBuffer(inputPath) {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const scale = HF_MAX_LONG_EDGE / Math.max(w, h);
  const targetW = Math.max(1, Math.round(w * Math.min(1, scale)));
  const targetH = Math.max(1, Math.round(h * Math.min(1, scale)));
  return sharp(inputPath)
    .resize(targetW, targetH, { fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer();
}

function extForMime(mimeType) {
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  return ".bin";
}

async function main() {
  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found: ${imagePath}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });
  resetHfLineArtClientForTests();

  const inputBuffer = await prepareInputBuffer(imagePath);
  const inputMeta = await sharp(inputBuffer).metadata();
  fs.writeFileSync(path.join(OUT, "00-input-resized.jpg"), inputBuffer);

  const results = [];

  for (const style of STYLES) {
    console.error(`Generating ${style.id} …`);
    const started = Date.now();
    const result = await generateHfLineArt(inputBuffer, {
      lineStyle: style.lineStyle,
      filter: style.filter,
      timeoutMs: 120_000,
    });
    const meta = await sharp(result.buffer).metadata();
    const ext = extForMime(result.mimeType);
    const outputPath = path.join(OUT, `${style.id}${ext}`);
    fs.writeFileSync(outputPath, result.buffer);

    results.push({
      id: style.id,
      description: style.description,
      lineStyle: style.lineStyle,
      filter: style.filter,
      elapsedMs: Date.now() - started,
      mimeType: result.mimeType,
      width: meta.width,
      height: meta.height,
      outputBytes: result.buffer.byteLength,
      output: outputPath,
    });
  }

  const report = {
    ok: true,
    source: imagePath,
    defaults: {
      lineStyle: HF_LINEART_LINE_STYLE,
      filter: HF_LINEART_FILTER,
    },
    input: {
      width: inputMeta.width,
      height: inputMeta.height,
      bytes: inputBuffer.byteLength,
      savedAs: path.join(OUT, "00-input-resized.jpg"),
    },
    savedTo: OUT,
    styles: results,
  };

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
