/**
 * Server-side Replicate style transfer for coloring-upload art styles.
 */

import Replicate from "replicate";

import { REPLICATE_STYLE_CONFIGS } from "./style-transfer-styles.server.js";
import { isReplicateStyleId } from "./style-transfer-styles.js";

export const REPLICATE_STYLE_TRANSFER_TIMEOUT_MS = 120_000;

/**
 * @param {unknown} output
 * @returns {string}
 */
export function resolveReplicateOutputUrl(output) {
  let item = output;
  if (Array.isArray(item)) {
    item = item.length > 1 ? item[item.length - 1] : item[0];
  }
  if (!item) throw new Error("REPLICATE_EMPTY_OUTPUT");

  if (item && typeof item === "object" && typeof item.url === "function") {
    return String(item.url());
  }
  if (typeof item === "string") return item;

  throw new Error("REPLICATE_UNEXPECTED_OUTPUT");
}

/**
 * @param {string} styleId
 * @param {Buffer} imageBuffer
 */
export async function generateReplicateStyleTransfer(styleId, imageBuffer) {
  if (!isReplicateStyleId(styleId)) {
    throw new Error("INVALID_STYLE");
  }

  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    throw new Error("REPLICATE_NOT_CONFIGURED");
  }

  const config = REPLICATE_STYLE_CONFIGS[styleId];
  const replicate = new Replicate({ auth: token });

  let output;
  try {
    output = await replicate.run(config.model, {
      input: config.buildInput(imageBuffer),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/402|insufficient credit|payment required/i.test(message)) {
      throw new Error("REPLICATE_INSUFFICIENT_CREDIT");
    }
    if (/429|rate limit|throttled/i.test(message)) {
      throw new Error("REPLICATE_RATE_LIMITED");
    }
    if (/404|not found/i.test(message)) {
      throw new Error("REPLICATE_MODEL_NOT_FOUND");
    }
    throw new Error("REPLICATE_UPSTREAM_FAILED");
  }

  const outputUrl = resolveReplicateOutputUrl(output);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(outputUrl, { signal: controller.signal });
    if (!res.ok) throw new Error("REPLICATE_DOWNLOAD_FAILED");
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.byteLength) throw new Error("REPLICATE_EMPTY_OUTPUT");
    return {
      buffer,
      mimeType: "image/png",
      source: `replicate-${styleId}`,
      outputUrl,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("REPLICATE_DOWNLOAD_TIMEOUT");
    }
    throw err instanceof Error && err.message.startsWith("REPLICATE_")
      ? err
      : new Error("REPLICATE_DOWNLOAD_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
