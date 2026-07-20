/**
 * Temporary — test Replicate image style transfer on a local photo.
 *
 * Generates three stylized variants (comic, pencil sketch, retro poster).
 *
 * Usage:
 *   node --env-file=.env.local scripts/coloring-upload/test-replicate.mjs [imagePath] [--style=comic|pencil|poster]
 *
 * Requires REPLICATE_API_TOKEN in environment.
 */
import fs from "node:fs/promises";
import path from "node:path";
import Replicate from "replicate";
import { loadProjectEnv, ROOT } from "../coloring-pages/load-env.mjs";

const cliArgs = process.argv.slice(2);
const styleFilter = cliArgs.find((arg) => arg.startsWith("--style="))?.slice("--style=".length) ?? null;
const imagePath = cliArgs.find((arg) => !arg.startsWith("--")) || path.join(ROOT, "omer.jpeg");
const REPORT = path.join(ROOT, "tmp", "replicate-style-transfer-report.json");

/** Image-to-image style transfer via Flux Kontext (prompt-driven edit). */
const STYLE_MODEL =
  "black-forest-labs/flux-kontext-pro:897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462";

/** @type {Array<{ id: string, label: string, output: string, prompt: string, negativePrompt?: string }>} */
const STYLES = [
  {
    id: "comic",
    label: "Comic / Graphic Novel",
    output: path.join(ROOT, "tmp", "style-comic-v2.png"),
    prompt:
      "modern graphic novel comic illustration, marvel comic style, preserve full image composition, clean bold ink outlines, dynamic vibrant shading, professional digital art",
    negativePrompt:
      "photorealistic, monochrome, blurry, distorted face, noise, pop art, halftone dots, ben-day dots, oversaturated, grainy, vintage comic",
  },
  {
    id: "pencil",
    label: "Colored Pencil / Artistic Sketch",
    output: path.join(ROOT, "tmp", "style-pencil.png"),
    prompt: "colored pencil sketch of the full image, wide shot, preserve full composition and all people/background, artistic illustration, textured paper effect",
  },
  {
    id: "poster",
    label: "Retro Poster",
    output: path.join(ROOT, "tmp", "style-poster.png"),
    prompt: "vector poster art, full scene illustration, minimal shading, clean flat shapes, stylish typography-free design",
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Flux Kontext has no negative_prompt field — fold avoid-list into the edit instruction.
 * @param {{ prompt: string, negativePrompt?: string }} style
 */
function buildEditPrompt(style) {
  if (!style.negativePrompt) return style.prompt;
  return `${style.prompt}. Avoid: ${style.negativePrompt}`;
}

/**
 * @param {unknown} err
 */
function describeReplicateError(err) {
  const message = err instanceof Error ? err.message : String(err);
  const status =
    err && typeof err === "object" && "response" in err && err.response
      ? err.response.status
      : undefined;

  if (status === 402 || /402|insufficient credit|payment required/i.test(message)) {
    return {
      code: "INSUFFICIENT_CREDIT",
      status: 402,
      message:
        "Replicate account has insufficient credit. Add billing at https://replicate.com/account/billing",
    };
  }

  if (status === 429 || /429|rate limit|throttled/i.test(message)) {
    const retryMatch = message.match(/retry_after[":\s]+(\d+)/i);
    return {
      code: "RATE_LIMITED",
      status: 429,
      retryAfterSec: retryMatch ? Number(retryMatch[1]) : undefined,
      message: "Replicate rate limit hit. Wait and retry, or add a payment method.",
    };
  }

  if (status === 404 || /404|not found/i.test(message)) {
    return { code: "MODEL_NOT_FOUND", status: 404, message: "Model or version not found on Replicate." };
  }

  return { code: "REQUEST_FAILED", status, message: message.split("\n")[0] };
}

/**
 * @param {Replicate} replicate
 * @param {string} model
 * @param {object} input
 * @param {{ maxAttempts?: number }} [opts]
 */
async function runWithRetry(replicate, model, input, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await replicate.run(model, { input });
    } catch (err) {
      const info = describeReplicateError(err);
      if (info.code === "INSUFFICIENT_CREDIT") throw Object.assign(err, { replicateInfo: info });
      if (info.code === "MODEL_NOT_FOUND") throw Object.assign(err, { replicateInfo: info });
      if (info.code !== "RATE_LIMITED" || attempt >= maxAttempts) {
        throw Object.assign(err, { replicateInfo: info });
      }

      const waitSec = info.retryAfterSec ?? attempt * 10;
      console.error(`  rate limited — waiting ${waitSec}s before retry ${attempt + 1}/${maxAttempts}`);
      await sleep(waitSec * 1000);
    }
  }

  throw new Error("Unexpected retry loop exit");
}

/**
 * @param {unknown} output
 * @param {string} dest
 */
async function saveOutput(output, dest) {
  let item = output;
  if (Array.isArray(item)) {
    item = item.length > 1 ? item[item.length - 1] : item[0];
  }
  if (!item) throw new Error("Empty model output");

  if (item && typeof item === "object" && typeof item.url === "function") {
    const res = await fetch(item.url());
    if (!res.ok) throw new Error(`Failed to download output: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
    return { bytes: buf.length, sourceUrl: String(item.url()) };
  }

  if (typeof item === "string") {
    const res = await fetch(item);
    if (!res.ok) throw new Error(`Failed to download output: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(dest, buf);
    return { bytes: buf.length, sourceUrl: item };
  }

  throw new Error(`Unexpected output type: ${typeof item}`);
}

/**
 * @param {Buffer} image
 * @param {{ prompt: string, negativePrompt?: string }} style
 */
function buildInput(image, style) {
  return {
    input_image: image,
    prompt: buildEditPrompt(style),
    aspect_ratio: "match_input_image",
    output_format: "png",
    safety_tolerance: 2,
    seed: 42,
  };
}

async function main() {
  loadProjectEnv(".env.local");

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.error("REPLICATE_API_TOKEN is not set. Add it to .env.local or use --env-file=.env.local");
    process.exit(1);
  }

  try {
    await fs.access(imagePath);
  } catch {
    console.error(`Image not found: ${imagePath}`);
    process.exit(1);
  }

  await fs.mkdir(path.join(ROOT, "tmp"), { recursive: true });

  const imageBuffer = await fs.readFile(imagePath);
  const replicate = new Replicate({ auth: token });

  const stylesToRun = styleFilter ? STYLES.filter((s) => s.id === styleFilter) : STYLES;
  if (styleFilter && stylesToRun.length === 0) {
    console.error(`Unknown style "${styleFilter}". Use: comic, pencil, or poster.`);
    process.exit(1);
  }

  const results = [];

  for (const style of stylesToRun) {
    const started = Date.now();
    console.error(`Generating ${style.label} (${style.id}) …`);

    try {
      const output = await runWithRetry(
        replicate,
        STYLE_MODEL,
        buildInput(imageBuffer, style)
      );
      const writeInfo = await saveOutput(output, style.output);
      results.push({
        ok: true,
        id: style.id,
        label: style.label,
        output: style.output,
        prompt: style.prompt,
        negativePrompt: style.negativePrompt ?? null,
        editPrompt: buildEditPrompt(style),
        elapsedMs: Date.now() - started,
        outputBytes: writeInfo.bytes,
        outputUrl: writeInfo.sourceUrl,
      });
      console.error(`  saved ${style.output} (${writeInfo.bytes} bytes)`);
    } catch (err) {
      const info = err?.replicateInfo ?? describeReplicateError(err);
      results.push({
        ok: false,
        id: style.id,
        label: style.label,
        output: style.output,
        prompt: style.prompt,
        negativePrompt: style.negativePrompt ?? null,
        editPrompt: buildEditPrompt(style),
        elapsedMs: Date.now() - started,
        ...info,
      });
      console.error(`  failed (${info.code}): ${info.message}`);

      if (info.code === "INSUFFICIENT_CREDIT") break;
    }
  }

  const report = {
    ok: results.every((r) => r.ok),
    source: imagePath,
    model: "black-forest-labs/flux-kontext-pro",
    version: STYLE_MODEL.split(":")[1],
    styles: results,
  };

  await fs.writeFile(REPORT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
