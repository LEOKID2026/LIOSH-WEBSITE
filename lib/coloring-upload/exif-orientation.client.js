/**
 * EXIF orientation — createImageBitmap first, manual JPEG EXIF fallback.
 */

/**
 * Read orientation tag (1–8) from JPEG buffer.
 * @param {ArrayBuffer} buffer
 * @returns {number}
 */
export function readJpegExifOrientation(buffer) {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1 && size >= 10) {
      const exifStart = offset + 4;
      if (
        view.getUint32(exifStart) === 0x45786966 &&
        view.getUint16(exifStart + 4) === 0x0000
      ) {
        const tiff = exifStart + 6;
        const little = view.getUint16(tiff) === 0x4949;
        const get16 = (o) => (little ? view.getUint16(o, true) : view.getUint16(o, false));
        const get32 = (o) => (little ? view.getUint32(o, true) : view.getUint32(o, false));
        const ifd0 = tiff + get32(tiff + 4);
        const entries = get16(ifd0);
        for (let i = 0; i < entries; i += 1) {
          const entry = ifd0 + 2 + i * 12;
          if (get16(entry) === 0x0112) {
            return get16(entry + 8) || 1;
          }
        }
      }
    }
    if (marker === 0xda || marker === 0xd9) break;
    offset += 2 + size;
  }
  return 1;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} source
 * @param {number} width
 * @param {number} height
 * @param {number} orientation
 */
export function drawWithExifOrientation(ctx, source, width, height, orientation) {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  switch (orientation) {
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0, width, height);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      ctx.drawImage(source, 0, 0, width, height);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      ctx.drawImage(source, 0, 0, width, height);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      ctx.drawImage(source, 0, 0, height, width);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      ctx.drawImage(source, 0, 0, height, width);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0, height, width);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      ctx.drawImage(source, 0, 0, height, width);
      break;
    default:
      ctx.drawImage(source, 0, 0, width, height);
  }
  ctx.restore();
}

/**
 * Load oriented bitmap from file/blob.
 * @param {Blob} blob
 * @param {ArrayBuffer} [rawBuffer]
 */
export async function loadOrientedImageBitmap(blob, rawBuffer) {
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    return bitmap;
  } catch {
    /* fallback below */
  }

  const buffer = rawBuffer || (await blob.arrayBuffer());
  const orientation = readJpegExifOrientation(buffer);
  const needsSwap = orientation >= 5 && orientation <= 8;
  const temp = await createImageBitmap(blob);
  const w = needsSwap ? temp.height : temp.width;
  const h = needsSwap ? temp.width : temp.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    temp.close();
    throw new Error("Canvas not supported");
  }
  drawWithExifOrientation(ctx, temp, temp.width, temp.height, orientation);
  temp.close();
  return createImageBitmap(canvas);
}

/**
 * @param {number} orientation
 * @param {number} w
 * @param {number} h
 */
export function orientedDimensions(orientation, w, h) {
  return orientation >= 5 && orientation <= 8 ? { width: h, height: w } : { width: w, height: h };
}
