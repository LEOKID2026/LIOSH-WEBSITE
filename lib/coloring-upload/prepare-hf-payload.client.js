/**
 * Compress cropped image for HF API upload — max long edge 1600px, JSON < 3.5MB.
 */

export const HF_UPLOAD_MAX_LONG_EDGE = 1600;
export const HF_UPLOAD_FALLBACK_LONG_EDGE = 1280;
export const HF_UPLOAD_MAX_JSON_BYTES = Math.floor(3.5 * 1024 * 1024);
export const HF_UPLOAD_INITIAL_QUALITY = 0.85;
export const HF_UPLOAD_MIN_QUALITY = 0.72;
export const HF_UPLOAD_TOO_LARGE_HE =
  "התמונה גדולה מדי לעיבוד. נסו תמונה אחרת או חיתוך קטן יותר.";

/**
 * @param {number} w
 * @param {number} h
 * @param {number} maxEdge
 */
function fitLongEdge(w, h, maxEdge) {
  const long = Math.max(w, h);
  if (long <= maxEdge) return { width: w, height: h };
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * @param {ImageData} imageData
 * @param {number} maxEdge
 * @returns {HTMLCanvasElement}
 */
function imageDataToCanvas(imageData, maxEdge) {
  const fit = fitLongEdge(imageData.width, imageData.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = fit.width;
  canvas.height = fit.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, fit.width, fit.height);
  const src = document.createElement("canvas");
  src.width = imageData.width;
  src.height = imageData.height;
  src.getContext("2d")?.putImageData(imageData, 0, 0);
  ctx.drawImage(src, 0, 0, fit.width, fit.height);
  src.width = 0;
  src.height = 0;
  return canvas;
}

/**
 * @param {string} base64
 * @param {string} mimeType
 */
function jsonPayloadBytes(base64, mimeType) {
  return new TextEncoder().encode(
    JSON.stringify({ imageBase64: base64, mimeType })
  ).length;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} quality
 * @returns {Promise<{ base64: string, mimeType: string, byteLength: number } | null>}
 */
function canvasToCompressedBase64(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          const comma = dataUrl.indexOf(",");
          const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
          resolve({ base64, mimeType, byteLength: blob.size });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * @param {ImageData} imageData
 * @returns {Promise<{ base64: string, mimeType: string, width: number, height: number, byteLength: number }>}
 */
export async function prepareImageForHfUpload(imageData) {
  const mimeCandidates = ["image/jpeg", "image/webp"];
  const edgeCandidates = [HF_UPLOAD_MAX_LONG_EDGE, HF_UPLOAD_FALLBACK_LONG_EDGE];
  const qualitySteps = [HF_UPLOAD_INITIAL_QUALITY, 0.8, 0.76, HF_UPLOAD_MIN_QUALITY];

  for (const maxEdge of edgeCandidates) {
    const canvas = imageDataToCanvas(imageData, maxEdge);
    try {
      for (const mimeType of mimeCandidates) {
        for (const quality of qualitySteps) {
          const encoded = await canvasToCompressedBase64(canvas, mimeType, quality);
          if (!encoded?.base64) continue;
          if (jsonPayloadBytes(encoded.base64, mimeType) <= HF_UPLOAD_MAX_JSON_BYTES) {
            return {
              base64: encoded.base64,
              mimeType,
              width: canvas.width,
              height: canvas.height,
              byteLength: encoded.byteLength,
            };
          }
        }
      }
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  throw new Error("HF_UPLOAD_PAYLOAD_TOO_LARGE");
}
