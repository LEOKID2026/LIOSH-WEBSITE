/**
 * Browser client for /api/coloring-upload/line-art
 */

import { prepareImageForHfUpload, HF_UPLOAD_TOO_LARGE_HE } from "./prepare-hf-payload.client.js";

const HF_LINEART_API_PATH = "/api/coloring-upload/line-art";
export const HF_LINEART_CLIENT_TIMEOUT_MS = 95_000;

/**
 * @param {string} base64
 * @param {string} [mimeType]
 * @returns {Promise<ImageData>}
 */
async function base64ToImageData(base64, mimeType = "image/png") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas unavailable");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * @param {string} code
 * @param {string} [messageHe]
 */
function quotaErrorFromPayload(code, messageHe) {
  const err = new Error(code);
  err.name = "ColoringUploadQuotaError";
  /** @type {any} */ (err).code = code;
  /** @type {any} */ (err).messageHe = messageHe;
  return err;
}

/**
 * @param {ImageData} imageData
 * @param {{
 *   signal?: AbortSignal,
 *   timeoutMs?: number,
 *   authHeader?: string | null,
 * }} [opts]
 * @returns {Promise<{ lineArt: ImageData, quota?: { remaining: number, limit: number, resetAt?: string } }>}
 */
export async function requestHfLineArt(imageData, opts = {}) {
  if (typeof window === "undefined") {
    throw new Error("HF_LINEART_CLIENT_UNAVAILABLE");
  }

  let payload;
  try {
    payload = await prepareImageForHfUpload(imageData);
  } catch (err) {
    if (err instanceof Error && err.message === "HF_UPLOAD_PAYLOAD_TOO_LARGE") {
      throw quotaErrorFromPayload("payload_too_large", HF_UPLOAD_TOO_LARGE_HE);
    }
    throw err;
  }

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? HF_LINEART_CLIENT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (opts.signal) {
    if (opts.signal.aborted) {
      clearTimeout(timeout);
      throw new DOMException("Aborted", "AbortError");
    }
    opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    /** @type {Record<string, string>} */
    const headers = { "Content-Type": "application/json" };
    if (opts.authHeader) headers.Authorization = opts.authHeader;

    const res = await fetch(HF_LINEART_API_PATH, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        imageBase64: payload.base64,
        mimeType: payload.mimeType,
        width: payload.width,
        height: payload.height,
      }),
      signal: controller.signal,
    });

    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw quotaErrorFromPayload(body?.code || "rate_limited", body?.messageHe);
    }
    if (!res.ok || !body?.ok || !body?.imageBase64) {
      throw new Error(body?.code || "HF_LINEART_FAILED");
    }

    const lineArt = await base64ToImageData(body.imageBase64, body.mimeType || "image/webp");
    return { lineArt, quota: body.quota };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("HF_LINEART_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
