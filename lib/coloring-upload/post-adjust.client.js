/**
 * Fast post-adjust on line-art ImageData (no full pipeline re-run).
 */

/**
 * @param {ImageData} src
 * @param {{ lineThickness?: number, detailLevel?: number, bgClean?: number, brightness?: number, contrast?: number }} adj
 */
export function applyPostAdjust(src, adj) {
  const out = new ImageData(src.width, src.height);
  out.data.set(src.data);

  const thickness = adj.lineThickness ?? 0;
  if (thickness !== 0) {
    dilateOrErode(out, thickness > 0 ? 1 : -1, Math.abs(thickness));
  }

  const detail = adj.detailLevel ?? 0;
  if (detail > 0) {
    removeSmallComponents(out, 8 + detail * 8);
  }

  const bg = adj.bgClean ?? 0;
  if (bg > 0) {
    morphOpen(out, bg);
  }

  const brightness = adj.brightness ?? 0;
  const contrast = adj.contrast ?? 0;
  if (brightness !== 0 || contrast !== 0) {
    adjustBrightnessContrast(out, brightness, contrast);
  }

  return out;
}

/**
 * @param {ImageData} img
 * @param {number} dir 1 dilate, -1 erode
 * @param {number} passes
 */
function dilateOrErode(img, dir, passes) {
  for (let p = 0; p < passes; p += 1) {
    const copy = new Uint8ClampedArray(img.data);
    const { width, height, data } = img;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        let black = false;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const i = ((y + dy) * width + (x + dx)) * 4;
            if (copy[i] < 128) black = true;
          }
        }
        const o = (y * width + x) * 4;
        const v = dir > 0 ? (black ? 0 : 255) : black && copy[o] < 128 ? 0 : copy[o] < 128 ? 0 : 255;
        data[o] = data[o + 1] = data[o + 2] = v;
        data[o + 3] = 255;
      }
    }
  }
}

/**
 * @param {ImageData} img
 * @param {number} minArea
 */
function removeSmallComponents(img, minArea) {
  const { width, height, data } = img;
  const labels = new Int32Array(width * height);
  let label = 1;
  const areas = new Map();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const i = idx * 4;
      if (data[i] >= 128 || labels[idx]) continue;
      let area = 0;
      /** @type {number[]} */
      const stack = [idx];
      labels[idx] = label;
      while (stack.length) {
        const cur = stack.pop();
        area += 1;
        const cx = cur % width;
        const cy = (cur / width) | 0;
        for (const [nx, ny] of [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nidx = ny * width + nx;
          if (labels[nidx]) continue;
          const ni = nidx * 4;
          if (data[ni] < 128) {
            labels[nidx] = label;
            stack.push(nidx);
          }
        }
      }
      areas.set(label, area);
      label += 1;
    }
  }

  for (let idx = 0; idx < width * height; idx += 1) {
    const l = labels[idx];
    if (!l) continue;
    const area = areas.get(l) || 0;
    if (area < minArea) {
      const i = idx * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
    }
  }
}

/** @param {ImageData} img @param {number} strength */
function morphOpen(img, strength) {
  dilateOrErode(img, -1, strength);
  dilateOrErode(img, 1, strength);
}

/** @param {ImageData} img @param {number} brightness @param {number} contrast */
function adjustBrightnessContrast(img, brightness, contrast) {
  const { data } = img;
  const b = brightness * 2;
  const c = 1 + contrast * 0.05;
  for (let i = 0; i < data.length; i += 4) {
    for (let cidx = 0; cidx < 3; cidx += 1) {
      let v = data[i + cidx];
      v = (v - 128) * c + 128 + b;
      data[i + cidx] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
}
