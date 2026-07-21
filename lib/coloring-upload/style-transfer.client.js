/**
 * Browser client for /api/coloring-upload/style-transfer
 */

import { prepareImageForHfUpload, HF_UPLOAD_TOO_LARGE_HE } from "./prepare-hf-payload.client.js";
import { isReplicateStyleId } from "./style-transfer-styles.js";

const STYLE_TRANSFER_API_PATH = "/api/coloring-upload/style-transfer";
export const STYLE_TRANSFER_CLIENT_TIMEOUT_MS = 125_000;

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
 * @param {"comic" | "pencil" | "anime" | "pixar"} style
 * @param {{
 *   signal?: AbortSignal,
 *   timeoutMs?: number,
 *   authHeader?: string | null,
 * }} [opts]
 */
export async function requestStyleTransfer(imageData, style, opts = {}) {
  if (typeof window === "undefined") {
    throw new Error("STYLE_TRANSFER_CLIENT_UNAVAILABLE");
  }
  if (!isReplicateStyleId(style)) {
    throw new Error("INVALID_STYLE");
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
  const timeoutMs = opts.timeoutMs ?? STYLE_TRANSFER_CLIENT_TIMEOUT_MS;
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

    const res = await fetch(STYLE_TRANSFER_API_PATH, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({
        style,
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
      throw new Error(body?.code || "STYLE_TRANSFER_FAILED");
    }

    const image = await base64ToImageData(body.imageBase64, body.mimeType || "image/png");
    return {
      image,
      style: body.style || style,
      source: body.source || `replicate-${style}`,
      quota: body.quota,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("STYLE_TRANSFER_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
