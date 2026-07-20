/**
 * HEIC decode — heic2any chosen after eval (see scripts/coloring-upload/eval-heic-decoders.mjs).
 * Lazy-loaded only when HEIC file detected.
 */

let heicModulePromise = null;

async function loadHeic2Any() {
  if (!heicModulePromise) {
    heicModulePromise = import("heic2any");
  }
  const mod = await heicModulePromise;
  return mod.default || mod;
}

/**
 * @param {Blob} blob
 * @returns {Promise<Blob>}
 */
export async function decodeHeicToJpegBlob(blob) {
  const heic2any = await loadHeic2Any();
  const result = await heic2any({ blob, toType: "image/jpeg", quality: 0.92 });
  if (Array.isArray(result)) return /** @type {Blob} */ (result[0]);
  return /** @type {Blob} */ (result);
}

/**
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export async function decodeHeicFile(file) {
  try {
    return await decodeHeicToJpegBlob(file);
  } catch {
    throw new Error("HEIC_DECODE_FAILED");
  }
}
