/**
 * Temporary — test Replicate image style transfer on a local photo.
 *
 * Generates stylized variants using REPLICATE_STYLE_CONFIGS from the server module.
 *
 * Usage:
 *   node --env-file=.env.local scripts/coloring-upload/test-replicate.mjs [imagePath]
 *   node --env-file=.env.local scripts/coloring-upload/test-replicate.mjs omer.jpeg --style=pencil
 *
 * Styles: comic, pencil, anime, pixar
 * Requires REPLICATE_API_TOKEN in environment.
 */
import fs from "node:fs/promises";
import path from "node:path";
import Replicate from "replicate";
import { loadProjectEnv, ROOT } from "../coloring-pages/load-env.mjs";
import { REPLICATE_STYLE_CONFIGS } from "../../lib/coloring-upload/style-transfer-styles.server.js";

const cliArgs = process.argv.slice(2);
const styleFilter = cliArgs.find((arg) => arg.startsWith("--style="))?.slice("--style=".length) ?? null;
const imagePath = cliArgs.find((arg) => !arg.startsWith("--")) || path.join(ROOT, "omer.jpeg");
const REPORT = path.join(ROOT, "tmp", "replicate-style-transfer-report.json");

const STYLE_IDS = Object.keys(REPLICATE_STYLE_CONFIGS);

/** @type {Record<string, string>} */
const STYLE_LABELS = {
  comic: "Comic / Graphic Novel",
  pencil: "Colored Pencil / Artistic Sketch",
  anime: "Anime",
  pixar: "Pixar / 3D Animation",
};

/** @type {Record<string, string>} */
const STYLE_OUTPUTS = {
  comic: path.join(ROOT, "tmp", "style-comic-v2.png"),
  pencil: path.join(ROOT, "tmp", "style-pencil.png"),
  anime: path.join(ROOT, "tmp", "style-anime.png"),
  pixar: path.join(ROOT, "tmp", "style-pixar.png"),
};

/** @type {Array<{ id: string, label: string, output: string }>} */
const STYLES = STYLE_IDS.map((id) => ({
  id,
  label: STYLE_LABELS[id] ?? id,
  output: STYLE_OUTPUTS[id] ?? path.join(ROOT, "tmp", `style-${id}.png`),
}));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    return { code: "MODEL_NOT_FOUND", status: 404, message: "Model not found on Replicate." };
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
 * @param {string} styleId
 */
function getStyleConfig(styleId) {
  const config = REPLICATE_STYLE_CONFIGS[styleId];
  if (!config) throw new Error(`Unknown style "${styleId}" — not in REPLICATE_STYLE_CONFIGS`);
  return config;
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
    console.error(`Unknown style "${styleFilter}". Use: ${STYLE_IDS.join(", ")}.`);
    process.exit(1);
  }

  const results = [];

  for (const style of stylesToRun) {
    const started = Date.now();
    const { model, buildInput } = getStyleConfig(style.id);
    const input = buildInput(imageBuffer);

    console.error(`Generating ${style.label} (${style.id}) via ${model.split(":")[0]} …`);

    try {
      const output = await runWithRetry(replicate, model, input);
      const writeInfo = await saveOutput(output, style.output);
      results.push({
        ok: true,
        id: style.id,
        label: style.label,
        model,
        input,
        output: style.output,
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
        model,
        input,
        output: style.output,
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
