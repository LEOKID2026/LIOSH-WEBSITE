import {
  COLORING_UPLOAD_MAX_FILE_BYTES,
  COLORING_UPLOAD_MAX_EDGE_PX,
  COLORING_UPLOAD_MIN_EDGE_PX,
} from "./constants.js";

const MIME_OK = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, messageHe: string }}
 */
export function validateColoringUploadFile(file) {
  if (!file || !(file instanceof File)) {
    return { ok: false, messageHe: "לא נבחר קובץ." };
  }
  if (file.size > COLORING_UPLOAD_MAX_FILE_BYTES) {
    return { ok: false, messageHe: "התמונה גדולה מדי. נסו תמונה עד 15 מגה." };
  }
  const type = String(file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const heicExt = ext === "heic" || ext === "heif";
  if (!MIME_OK.has(type) && !type.startsWith("image/") && !heicExt) {
    return { ok: false, messageHe: "סוג הקובץ לא נתמך. נסו JPG, PNG, WebP או HEIC." };
  }
  return { ok: true };
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {{ ok: true } | { ok: false, messageHe: string, warning?: boolean }}
 */
export function validateColoringUploadDimensions(width, height) {
  const w = Math.max(0, width | 0);
  const h = Math.max(0, height | 0);
  const longEdge = Math.max(w, h);
  if (longEdge > COLORING_UPLOAD_MAX_EDGE_PX) {
    return { ok: false, messageHe: "התמונה גדולה מדי. נסו תמונה קטנה יותר." };
  }
  if (Math.min(w, h) < COLORING_UPLOAD_MIN_EDGE_PX) {
    return { ok: true, warning: true };
  }
  return { ok: true };
}

/**
 * @param {File} file
 */
export function isHeicFile(file) {
  const type = String(file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    ext === "heic" ||
    ext === "heif"
  );
}
