/**
 * Multi-step line art stylization — edges are intermediate; output is cleaned B/W line art.
 * Approved pilot used reference-guided AI; this pipeline is the offline batch fallback.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ROOT } from "./load-env.mjs";

const SOURCE_DIR = path.join(ROOT, "tmp/coloring-pages-work/sources");
const OUT_DIR = path.join(ROOT, "tmp/coloring-pages-work/line-art");

/**
 * @param {string} inputPath
 * @param {string} outputPath
 */
export async function stylizeSourceToLineArt(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata();
  const targetW = 1024;
  const targetH = 1536;
  const w = meta.width || targetW;
  const h = meta.height || targetH;
  const scale = Math.min(targetW / w, targetH / h);
  const rw = Math.max(1, Math.round(w * scale));
  const rh = Math.max(1, Math.round(h * scale));

  const base = sharp(inputPath)
    .resize(rw, rh, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .extend({
      top: Math.floor((targetH - rh) / 2),
      bottom: Math.ceil((targetH - rh) / 2),
      left: Math.floor((targetW - rw) / 2),
      right: Math.ceil((targetW - rw) / 2),
      background: { r: 255, g: 255, b: 255 },
    });

  const posterized = await base
    .clone()
    .modulate({ saturation: 0.85 })
    .linear(1.08, -12)
    .png()
    .toBuffer();

  const edges = await sharp(posterized)
    .greyscale()
    .blur(0.6)
    .convolve({
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
    })
    .normalize()
    .linear(1.35, -40)
    .threshold(168)
    .negate()
    .png()
    .toBuffer();

  const cleaned = await sharp(edges)
    .median(1)
    .threshold(210)
    .negate()
    .linear(1.2, -20)
    .threshold(128)
    .toColourspace("b-w")
    .png()
    .toBuffer();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await sharp(cleaned).png({ compressionLevel: 9 }).toFile(outputPath);
}

async function main() {
  const only = process.argv.includes("--only")
    ? process.argv[process.argv.indexOf("--only") + 1]
    : null;

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.endsWith(".png"))
    .filter((f) => !only || f.replace(/\.png$/, "") === only);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  let skip = 0;

  for (const file of files) {
    const key = file.replace(/\.png$/, "");
    const out = path.join(OUT_DIR, `${key}.png`);
    if (fs.existsSync(out) && !process.argv.includes("--force")) {
      skip += 1;
      continue;
    }
    await stylizeSourceToLineArt(path.join(SOURCE_DIR, file), out);
    ok += 1;
    if (ok % 10 === 0) process.stdout.write(`\n${ok}...`);
  }

  console.log(JSON.stringify({ ok, skip, total: files.length, outDir: OUT_DIR }, null, 2));
}

const isDirect = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirect || process.argv[1]?.includes("generate-line-art-stylize")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
