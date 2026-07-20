/**
 * Validate style-transfer API payload.
 */

import {
  isColoringUploadStyleId,
  isReplicateStyleId,
} from "./style-transfer-styles.js";
import { parseHfLineArtRequestBody } from "./hf-lineart-api-validation.server.js";

/**
 * @param {unknown} body
 */
export function parseStyleTransferRequestBody(body) {
  const imageParsed = parseHfLineArtRequestBody(body);
  if (!imageParsed.ok) return imageParsed;

  const style =
    typeof body?.style === "string" && body.style.trim()
      ? body.style.trim().toLowerCase()
      : "coloring";

  if (!isColoringUploadStyleId(style)) {
    return { ok: false, code: "invalid_style" };
  }

  if (!isReplicateStyleId(style)) {
    return { ok: false, code: "invalid_style" };
  }

  return {
    ok: true,
    style,
    buffer: imageParsed.buffer,
    mimeType: imageParsed.mimeType,
  };
}
