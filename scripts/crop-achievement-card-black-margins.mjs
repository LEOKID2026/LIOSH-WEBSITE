/**
 * One-off: remove outer black margins from achievement card WebPs.
 * - Flood-fill pure black (rgb <= 12) connected to image borders → transparent
 * - Crop to opaque bounding box when edges become fully transparent
 * - Backup originals under public/rewards/cards/achievements/_before_crop/
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ROOT = path.join("public", "rewards", "cards", "achievements");
const SUBFOLDERS = ["general", "math", "language", "subjects"];
const BACKUP_ROOT = path.join(ROOT, "_before_crop");
const BLACK_THRESHOLD = 12;

function isPureBlack(r, g, b) {
  return r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD;
}

function floodOuterBlack(data, width, height, channels) {
  const visited = new Uint8Array(width * height);
  const stack = [];

  for (let x = 0; x < width; x++) {
    stack.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    stack.push([0, y], [width - 1, y]);
  }

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;
    const i = idx * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isPureBlack(r, g, b)) continue;
    visited[idx] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return visited;
}

function opaqueBounds(data, width, height, channels, outerBlack) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const i = idx * channels;
      const a = channels >= 4 ? data[i + 3] : 255;
      if (a === 0 || outerBlack[idx]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function processFile(absPath) {
  const relFromAchievements = path.relative(ROOT, absPath);
  const backupPath = path.join(BACKUP_ROOT, relFromAchievements);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });

  const inputBuffer = fs.readFileSync(absPath);
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, inputBuffer);
  }

  const { data, info } = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const outerBlack = floodOuterBlack(data, width, height, channels);

  let outerBlackCount = 0;
  for (let i = 0; i < outerBlack.length; i++) if (outerBlack[i]) outerBlackCount++;

  const out = Buffer.from(data);
  for (let idx = 0; idx < width * height; idx++) {
    if (!outerBlack[idx]) continue;
    const i = idx * channels;
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = 0;
  }

  const bounds = opaqueBounds(out, width, height, channels, outerBlack);
  if (!bounds) throw new Error("empty_after_processing");

  const trimmed =
    bounds.left > 0 ||
    bounds.top > 0 ||
    bounds.left + bounds.width < width ||
    bounds.top + bounds.height < height;

  let pipeline = sharp(out, { raw: { width, height, channels: 4 } });
  if (trimmed) {
    pipeline = pipeline.extract(bounds);
  }

  const outBuffer = await pipeline.webp({ quality: 92, effort: 4, alphaQuality: 100 }).toBuffer();
  const tempPath = `${absPath}.cropped.${process.pid}.webp`;
  fs.writeFileSync(tempPath, outBuffer);
  fs.rmSync(absPath, { force: true });
  fs.renameSync(tempPath, absPath);

  const meta = await sharp(outBuffer).metadata();
  const ratio = meta.width / meta.height;

  return {
    rel: relFromAchievements.replace(/\\/g, "/"),
    before: { width, height },
    after: { width: meta.width, height: meta.height },
    outerBlackPx: outerBlackCount,
    outerBlackPct: +((outerBlackCount / (width * height)) * 100).toFixed(2),
    trimmed,
    crop: trimmed ? bounds : null,
    ratio: +ratio.toFixed(4),
  };
}

async function main() {
  const results = [];
  for (const sub of SUBFOLDERS) {
    const dir = path.join(ROOT, sub);
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".webp"))) {
      const abs = path.join(dir, name);
      results.push(await processFile(abs));
    }
  }

  const changed = results.filter(
    (r) =>
      r.trimmed ||
      r.outerBlackPx > 0 ||
      r.before.width !== r.after.width ||
      r.before.height !== r.after.height
  );

  console.log(JSON.stringify({ total: results.length, changed: changed.length, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
