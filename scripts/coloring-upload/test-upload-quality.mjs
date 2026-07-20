/**
 * One-shot HF output size probe — saves raw HF + post-processed + final A4 artifacts.
 * Usage: node scripts/coloring-upload/test-upload-quality.mjs [--input path/to/image.jpg]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { generateHfLineArt } from "../../lib/coloring-upload/hf-lineart.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "tmp/coloring-upload-quality-test");

function parseArgs(argv) {
  const out = { input: path.join(ROOT, "tmp/coloring-upload-debug/02-cropped-input.png") };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--input" && argv[i + 1]) {
      out.input = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return out;
}

async function resizeForHf(inputPath, longEdge) {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  const w = meta.width || 1;
  const h = meta.height || 1;
  const scale = longEdge / Math.max(w, h);
  const targetW = Math.max(1, Math.round(w * scale));
  const targetH = Math.max(1, Math.round(h * scale));
  return sharp(inputPath)
    .resize(targetW, targetH, { fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer();
}

async function probeInput(label, buffer) {
  const result = await generateHfLineArt(buffer, { timeoutMs: 120_000 });
  const meta = await sharp(result.buffer).metadata();
  return {
    label,
    inputBytes: buffer.byteLength,
    outputBytes: result.buffer.byteLength,
    mimeType: result.mimeType,
    width: meta.width,
    height: meta.height,
    buffer: result.buffer,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.input)) {
    console.error(`Input not found: ${args.input}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const probes = [];
  for (const edge of [512, 800, 1200, 1600]) {
    const buf = await resizeForHf(args.input, edge);
    const meta = await sharp(buf).metadata();
    probes.push(
      await probeInput(`longEdge_${edge}_in_${meta.width}x${meta.height}`, buf)
    );
  }

  const best = probes.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));
  fs.writeFileSync(path.join(OUT_DIR, "01-hf-raw-best.webp"), best.buffer);

  const report = {
    space: "awacke1/Image-to-Line-Drawings",
    resolutionParams: "none — only input image, line_style, filter_choice",
    probes: probes.map(({ label, inputBytes, outputBytes, mimeType, width, height }) => ({
      label,
      inputBytes,
      outputBytes,
      mimeType,
      width,
      height,
      megapixels: Number(((width * height) / 1_000_000).toFixed(3)),
    })),
    maxOutput: {
      width: best.width,
      height: best.height,
      label: best.label,
    },
  };

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
