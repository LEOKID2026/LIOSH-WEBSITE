/**
 * Hugging Face Space line-art generation (server-side only).
 * Space: awacke1/Image-to-Line-Drawings
 */

import { Client, handle_file } from "@gradio/client";

export const HF_LINEART_SPACE = "awacke1/Image-to-Line-Drawings";
export const HF_LINEART_PREDICT_API = "/predict";
export const HF_LINEART_LINE_STYLE = "Complex Lines";
export const HF_LINEART_FILTER = "📄 Standard";
export const HF_LINEART_DEFAULT_TIMEOUT_MS = 90_000;
export const HF_LINEART_MAX_INPUT_BYTES = 3 * 1024 * 1024;

/** @type {Promise<import("@gradio/client").Client> | null} */
let clientPromise = null;

/**
 * @param {number} ms
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 * @template T
 */
function withTimeout(ms, promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("HF_LINEART_TIMEOUT")), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function getHfToken() {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || undefined;
}

async function getGradioClient() {
  if (!clientPromise) {
    const token = getHfToken();
    clientPromise = Client.connect(HF_LINEART_SPACE, token ? { hf_token: token } : undefined);
  }
  return clientPromise;
}

/**
 * @param {Buffer | Blob | string} input
 * @returns {Buffer | Blob}
 */
function normalizeImageInput(input) {
  if (Buffer.isBuffer(input)) {
    if (input.byteLength > HF_LINEART_MAX_INPUT_BYTES) {
      throw new Error("HF_LINEART_INPUT_TOO_LARGE");
    }
    return input;
  }
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return input;
  }
  if (typeof input === "string") {
    const base64 = input.includes(",") ? input.split(",").pop() || "" : input;
    const buf = Buffer.from(base64, "base64");
    if (buf.byteLength > HF_LINEART_MAX_INPUT_BYTES) {
      throw new Error("HF_LINEART_INPUT_TOO_LARGE");
    }
    if (!buf.byteLength) throw new Error("HF_LINEART_INVALID_INPUT");
    return buf;
  }
  throw new Error("HF_LINEART_INVALID_INPUT");
}

/**
 * @param {{ url?: string, path?: string }} fileData
 * @returns {Promise<Buffer>}
 */
async function fetchGradioOutputBuffer(fileData) {
  const url = fileData?.url;
  if (!url || typeof url !== "string") {
    throw new Error("HF_LINEART_EMPTY_OUTPUT");
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HF_LINEART_OUTPUT_FETCH_${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.byteLength) throw new Error("HF_LINEART_EMPTY_OUTPUT");
  return buffer;
}

/**
 * Generate line art via the Hugging Face Gradio Space.
 *
 * @param {Buffer | Blob | string} imageInput Buffer, Blob, raw base64, or data URL
 * @param {{
 *   lineStyle?: string,
 *   filter?: string,
 *   timeoutMs?: number,
 * }} [opts]
 * @returns {Promise<{ buffer: Buffer, mimeType: string, lineStyle: string, filter: string }>}
 */
export async function generateHfLineArt(imageInput, opts = {}) {
  const normalized = normalizeImageInput(imageInput);
  const lineStyle = opts.lineStyle || HF_LINEART_LINE_STYLE;
  const filter = opts.filter || HF_LINEART_FILTER;
  const timeoutMs = opts.timeoutMs ?? HF_LINEART_DEFAULT_TIMEOUT_MS;

  const client = await getGradioClient();
  const prediction = client.predict(HF_LINEART_PREDICT_API, [
    handle_file(normalized),
    lineStyle,
    filter,
  ]);

  const result = await withTimeout(timeoutMs, prediction);
  const output = result?.data?.[0];
  if (!output) throw new Error("HF_LINEART_EMPTY_OUTPUT");

  const buffer = await fetchGradioOutputBuffer(output);
  return {
    buffer,
    mimeType: typeof output.mime_type === "string" ? output.mime_type : "image/webp",
    lineStyle,
    filter,
  };
}

export function resetHfLineArtClientForTests() {
  clientPromise = null;
}
