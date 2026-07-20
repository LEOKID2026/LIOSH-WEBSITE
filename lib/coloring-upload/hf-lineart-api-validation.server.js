/**
 * Validate HF line-art API payload — MIME + base64 size, no disk persistence.
 */

export const HF_API_MAX_JSON_BYTES = Math.floor(3.5 * 1024 * 1024);
export const HF_API_MAX_IMAGE_BYTES = Math.floor(3 * 1024 * 1024);

const MIME_OK = new Set(["image/jpeg", "image/webp", "image/png"]);

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * @param {unknown} body
 */
export function parseHfLineArtRequestBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid_body" };
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  if (!imageBase64) {
    return { ok: false, code: "missing_image" };
  }

  if (imageBase64.length > HF_API_MAX_JSON_BYTES) {
    return { ok: false, code: "payload_too_large" };
  }

  if (!BASE64_RE.test(imageBase64)) {
    return { ok: false, code: "invalid_base64" };
  }

  const mimeType = String(body.mimeType || "image/jpeg").toLowerCase();
  if (!MIME_OK.has(mimeType)) {
    return { ok: false, code: "invalid_mime" };
  }

  let buffer;
  try {
    buffer = Buffer.from(imageBase64, "base64");
  } catch {
    return { ok: false, code: "invalid_base64" };
  }

  if (!buffer.byteLength) {
    return { ok: false, code: "empty_image" };
  }

  if (buffer.byteLength > HF_API_MAX_IMAGE_BYTES) {
    return { ok: false, code: "payload_too_large" };
  }

  return {
    ok: true,
    imageBase64,
    buffer,
    mimeType,
  };
}

/**
 * @param {import("http").IncomingMessage} req
 */
export function estimateJsonBodyBytes(req) {
  const raw = req.body;
  if (typeof raw === "string") return Buffer.byteLength(raw, "utf8");
  if (Buffer.isBuffer(raw)) return raw.byteLength;
  try {
    return Buffer.byteLength(JSON.stringify(raw ?? {}), "utf8");
  } catch {
    return 0;
  }
}
