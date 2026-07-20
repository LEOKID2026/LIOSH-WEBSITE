/**
 * Reference-guided coloring line-art generation (approved pilot method).
 * Uses Gemini image generation with source card as visual reference.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { loadAllProjectEnv, ROOT } from "./load-all-env.mjs";
import { COLORING_LINE_ART_PROMPT } from "../../lib/coloring/coloring-worksheet-types.js";

loadAllProjectEnv();

const SOURCE_DIR = path.join(ROOT, "tmp/coloring-pages-work/sources");
const OUT_DIR = path.join(ROOT, "tmp/coloring-pages-work/line-art-ai");
const PROGRESS_FILE = path.join(ROOT, "tmp/coloring-pages-work/ai-progress.json");

const GEMINI_MODEL = "gemini-2.0-flash-preview-image-generation";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * @returns {string}
 */
function getApiKey() {
  return (
    process.env.COLORING_LINE_ART_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  ).trim();
}

/**
 * @param {string} sourcePath
 * @param {string} cardKey
 */
async function generateWithGemini(sourcePath, cardKey) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY / GOOGLE_API_KEY for coloring line-art generation");
  }

  const sourceBytes = fs.readFileSync(sourcePath);
  const pngBuffer = await sharp(sourceBytes)
    .resize(1024, 1536, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: pngBuffer.toString("base64"),
            },
          },
          {
            text: `${COLORING_LINE_ART_PROMPT}\n\nReference card key (for identity only, do not render text): ${cardKey}.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(
    `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Gemini error (${cardKey}): ${data?.error?.message || res.statusText}`
    );
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error(`Gemini returned no image for ${cardKey}`);
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}

/**
 * Light cleanup of AI output — NOT source edge detection.
 * @param {Buffer} input
 */
async function cleanupAiLineArt(input) {
  return sharp(input)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .resize(1024, 1536, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: { r: 255, g: 255, b: 255 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Reject inverted / overly black outputs.
 * @param {string} outputPath
 */
async function validateLineArtQuality(outputPath) {
  const { data, info } = await sharp(outputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let dark = 0;
  let light = 0;
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 64) dark += 1;
    if (lum > 230) light += 1;
  }

  const darkRatio = dark / total;
  const lightRatio = light / total;
  if (darkRatio > 0.35) {
    throw new Error(`Rejected ${outputPath}: too much black (${(darkRatio * 100).toFixed(1)}%)`);
  }
  if (lightRatio < 0.45) {
    throw new Error(`Rejected ${outputPath}: background not white enough`);
  }
}

/**
 * @param {string} cardKey
 * @param {string} sourcePath
 * @param {string} outputPath
 * @param {number} [attempt]
 */
export async function generateLineArtForCard(cardKey, sourcePath, outputPath, attempt = 1) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const raw = await generateWithGemini(sourcePath, cardKey);
  const cleaned = await cleanupAiLineArt(raw);
  fs.writeFileSync(outputPath, cleaned);
  await validateLineArtQuality(outputPath);
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) return { done: {}, failed: {} };
  return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
}

function saveProgress(progress) {
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function main() {
  const catalog = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data/coloring/reward-cards-source-catalog.json"), "utf8")
  );
  const cards = catalog.cards.filter((c) => c.isActive !== false);
  const only = process.argv.includes("--only")
    ? process.argv[process.argv.indexOf("--only") + 1]
    : null;
  const force = process.argv.includes("--force");
  const maxRetries = 3;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const progress = loadProgress();

  for (const card of cards) {
    if (only && card.cardKey !== only) continue;
    const sourcePath = path.join(SOURCE_DIR, `${card.cardKey}.png`);
    const outputPath = path.join(OUT_DIR, `${card.cardKey}.png`);
    if (!fs.existsSync(sourcePath)) {
      progress.failed[card.cardKey] = "missing_source";
      continue;
    }
    if (fs.existsSync(outputPath) && !force && progress.done[card.cardKey]) {
      continue;
    }

    let lastErr = null;
    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        await generateLineArtForCard(card.cardKey, sourcePath, outputPath, attempt);
        progress.done[card.cardKey] = new Date().toISOString();
        delete progress.failed[card.cardKey];
        saveProgress(progress);
        process.stdout.write(".");
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (lastErr) {
      progress.failed[card.cardKey] = String(lastErr.message || lastErr);
      saveProgress(progress);
      process.stdout.write("x");
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(
    JSON.stringify(
      {
        done: Object.keys(progress.done).length,
        failed: Object.keys(progress.failed).length,
        outDir: OUT_DIR,
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
