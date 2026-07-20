/**
 * Quality metrics — warnings only, never hard-block output.
 */

/**
 * @param {ImageData} imageData — black lines on white
 */
export function computeQualityMetrics(imageData) {
  const { data, width, height } = imageData;
  const total = width * height;
  let black = 0;
  let borderBlack = 0;
  const border = Math.max(2, Math.round(Math.min(width, height) * 0.02));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const isBlack = lum < 128;
      if (isBlack) {
        black += 1;
        if (x < border || y < border || x >= width - border || y >= height - border) {
          borderBlack += 1;
        }
      }
    }
  }

  const blackPixelRatio = total ? black / total : 0;
  const borderNoiseRatio = black ? borderBlack / black : 0;

  const components = countConnectedComponents(imageData);
  const tinyComponents = components.filter((a) => a < 16).length;
  const tinyComponentRatio = components.length ? tinyComponents / components.length : 0;
  const largestBlackRegionRatio = components.length
    ? Math.max(...components) / total
    : 0;
  const lineDensity = total ? black / (width + height) : 0;

  const warnings = [];
  if (blackPixelRatio > 0.4) {
    warnings.push("התוצאה כהה מדי — נסו «קל לילדים» או חיתוך קרוב יותר.");
  } else if (blackPixelRatio < 0.01) {
    warnings.push("התוצאה דלילה מדי — נסו «מפורט».");
  }
  if (largestBlackRegionRatio > 0.25) {
    warnings.push("יש אזור כהה גדול — נסו ניקוי רקע או תיקון ידני.");
  }
  if (borderNoiseRatio > 0.35) {
    warnings.push("יש רעש בקצוות — נסו חיתוך או ניקוי רקע.");
  }

  return {
    blackPixelRatio,
    lineDensity,
    componentCount: components.length,
    largestBlackRegionRatio,
    tinyComponentRatio,
    borderNoiseRatio,
    warnings,
    isLikelyBad: blackPixelRatio > 0.45,
  };
}

/**
 * @param {ImageData} imageData
 * @returns {number[]}
 */
function countConnectedComponents(imageData) {
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const areas = [];

  /** @type {number[]} */
  const stack = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      const i = idx * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum >= 128) {
        visited[idx] = 1;
        continue;
      }
      let area = 0;
      stack.length = 0;
      stack.push(idx);
      visited[idx] = 1;
      while (stack.length) {
        const cur = stack.pop();
        area += 1;
        const cx = cur % width;
        const cy = (cur / width) | 0;
        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nidx = ny * width + nx;
          if (visited[nidx]) continue;
          const ni = nidx * 4;
          const nlum = 0.299 * data[ni] + 0.587 * data[ni + 1] + 0.114 * data[ni + 2];
          if (nlum < 128) {
            visited[nidx] = 1;
            stack.push(nidx);
          }
        }
      }
      areas.push(area);
    }
  }
  return areas;
}
