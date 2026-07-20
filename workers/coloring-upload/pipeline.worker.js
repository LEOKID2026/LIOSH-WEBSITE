/* eslint-disable no-restricted-globals */
/**
 * Coloring upload pipeline worker — single-pass line art (OpenCV.js).
 */
/** @type {boolean} */
let cvReady = false;
/** @type {boolean} */
let aborted = false;
const PRESETS = {
  simple: {
    bilateralDiameter: 9,
    bilateralSigmaColor: 75,
    bilateralSigmaSpace: 75,
    preBlurSize: 3,
    claheClipLimit: 1.0,
    useAdaptive: false,
    adaptiveBlockSize: 21,
    adaptiveC: 9,
    cannyLow: 40,
    cannyHigh: 100,
    lineThickness: 0,
    morphCloseKernel: 2,
    morphOpenKernel: 0,
    minAreaRatio: 0.00008,
  },
  balanced: {
    bilateralDiameter: 9,
    bilateralSigmaColor: 75,
    bilateralSigmaSpace: 75,
    preBlurSize: 3,
    claheClipLimit: 1.0,
    useAdaptive: false,
    adaptiveBlockSize: 15,
    adaptiveC: 6,
    cannyLow: 45,
    cannyHigh: 110,
    lineThickness: 0,
    morphCloseKernel: 2,
    morphOpenKernel: 0,
    minAreaRatio: 0.00012,
  },
  detailed: {
    bilateralDiameter: 7,
    bilateralSigmaColor: 55,
    bilateralSigmaSpace: 55,
    preBlurSize: 0,
    claheClipLimit: 1.0,
    useAdaptive: false,
    adaptiveBlockSize: 11,
    adaptiveC: 4,
    cannyLow: 35,
    cannyHigh: 90,
    lineThickness: 0,
    morphCloseKernel: 2,
    morphOpenKernel: 0,
    minAreaRatio: 0.00008,
  },
};
const OPENCV_INIT_TIMEOUT_MS = 20000;
const OPENCV_SCRIPT_PATH = "/wasm/opencv/opencv.js";
function postStatus(status, extra = {}) {
  self.postMessage({ type: "status", status, ...extra });
}
async function loadOpenCV() {
  if (cvReady) return;
  postStatus("worker_started");
  postStatus("opencv_loading");
  const origin = self.location.origin;
  try {
    importScripts(origin + OPENCV_SCRIPT_PATH);
  } catch (err) {
    throw new Error(
      `OpenCV script load failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  let mod = self.cv;
  if (!mod) throw new Error("OpenCV failed to load");
  if (mod instanceof Promise) {
    mod = await Promise.race([
      mod,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("OpenCV runtime timeout")), OPENCV_INIT_TIMEOUT_MS);
      }),
    ]);
  } else if (!mod.Mat) {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("OpenCV runtime timeout")),
        OPENCV_INIT_TIMEOUT_MS
      );
      const finish = () => {
        clearTimeout(timeout);
        resolve(undefined);
      };
      if (mod.Mat) {
        finish();
        return;
      }
      const prev = mod.onRuntimeInitialized;
      mod.onRuntimeInitialized = () => {
        if (typeof prev === "function") prev();
        finish();
      };
    });
    mod = self.cv instanceof Promise ? await self.cv : self.cv;
  }
  if (!mod?.Mat) throw new Error("OpenCV runtime not ready");
  self.cv = mod;
  cvReady = true;
  postStatus("opencv_ready");
}
function reportProgress(phase, phaseProgress, id) {
  self.postMessage({ type: "progress", id, phase, phaseProgress });
}
function safeDelete(mat) {
  try {
    if (mat && !mat.isDeleted()) mat.delete();
  } catch {
    /* ignore */
  }
}
function flattenAlphaOnWhite(rgba) {
  const mat = rgba.clone();
  if (mat.channels() !== 4) return mat;
  for (let y = 0; y < mat.rows; y += 1) {
    for (let x = 0; x < mat.cols; x += 1) {
      const ptr = mat.ucharPtr(y, x);
      const a = ptr[3] / 255;
      if (a >= 1) continue;
      ptr[0] = Math.round(ptr[0] * a + 255 * (1 - a));
      ptr[1] = Math.round(ptr[1] * a + 255 * (1 - a));
      ptr[2] = Math.round(ptr[2] * a + 255 * (1 - a));
      ptr[3] = 255;
    }
  }
  return mat;
}
function imageDataToResizedRgbaMat(imageData, maxEdge) {
  const mat = cv.matFromImageData(imageData);
  const flattened = flattenAlphaOnWhite(mat);
  safeDelete(mat);
  const long = Math.max(flattened.cols, flattened.rows);
  if (long <= maxEdge) return flattened;
  const scale = maxEdge / long;
  const dsize = new cv.Size(
    Math.max(1, Math.round(flattened.cols * scale)),
    Math.max(1, Math.round(flattened.rows * scale))
  );
  const resized = new cv.Mat();
  cv.resize(flattened, resized, dsize, 0, 0, cv.INTER_AREA);
  safeDelete(flattened);
  return resized;
}
function subjectMaskToResizedMat(maskBuffer, width, height, targetCols, targetRows) {
  const mask = cv.matFromArray(height, width, cv.CV_8UC1, maskBuffer);
  if (mask.cols === targetCols && mask.rows === targetRows) return mask;
  const resized = new cv.Mat();
  cv.resize(mask, resized, new cv.Size(targetCols, targetRows), 0, 0, cv.INTER_NEAREST);
  safeDelete(mask);
  return resized;
}
/** Force background pixels to white before edge detection. */
function maskGrayToSubjectOnly(gray, subjectMask) {
  if (!subjectMask) return;
  for (let y = 0; y < gray.rows; y += 1) {
    for (let x = 0; x < gray.cols; x += 1) {
      if (subjectMask.ucharPtr(y, x)[0] < 128) gray.ucharPtr(y, x)[0] = 255;
    }
  }
}
/** Keep line art strictly inside the subject mask — background stays pure white. */
function maskLineArtToSubject(lines, subjectMask) {
  if (!subjectMask) return;
  for (let y = 0; y < lines.rows; y += 1) {
    for (let x = 0; x < lines.cols; x += 1) {
      if (subjectMask.ucharPtr(y, x)[0] < 128) lines.ucharPtr(y, x)[0] = 255;
    }
  }
}
/** Mild blur → CLAHE → light bilateral. */
function preprocessGray(gray, preset) {
  let work = gray;
  if (preset.preBlurSize > 0) {
    const blurred = new cv.Mat();
    const k = preset.preBlurSize | 1;
    cv.GaussianBlur(work, blurred, new cv.Size(k, k), 0);
    if (work !== gray) safeDelete(work);
    work = blurred;
  }
  const clahe = new cv.CLAHE(preset.claheClipLimit, new cv.Size(8, 8));
  const claheOut = new cv.Mat();
  clahe.apply(work, claheOut);
  clahe.delete();
  if (work !== gray) safeDelete(work);
  const smooth = new cv.Mat();
  cv.bilateralFilter(
    claheOut,
    smooth,
    preset.bilateralDiameter,
    preset.bilateralSigmaColor,
    preset.bilateralSigmaSpace
  );
  safeDelete(claheOut);
  return smooth;
}
/** Black lines on white (0 = ink). Erode expands black on white background. */
function thickenBlackLines(lines, thickness) {
  const iters = Math.max(0, Math.round(thickness));
  if (iters <= 0) return;
  const k = cv.Mat.ones(3, 3, cv.CV_8U);
  for (let i = 0; i < iters; i += 1) {
    cv.erode(lines, lines, k);
  }
  k.delete();
}
function countBlackPixels(binary) {
  let black = 0;
  for (let y = 0; y < binary.rows; y += 1) {
    for (let x = 0; x < binary.cols; x += 1) {
      if (binary.ucharPtr(y, x)[0] < 128) black += 1;
    }
  }
  return black;
}
function removeSmallComponents(binary, minArea) {
  const inverted = new cv.Mat();
  cv.bitwise_not(binary, inverted);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centroids = new cv.Mat();
  const n = cv.connectedComponentsWithStats(inverted, labels, stats, centroids, 8, cv.CV_32S);
  safeDelete(inverted);
  safeDelete(centroids);
  for (let i = 1; i < n; i += 1) {
    const area = stats.intAt(i, 4);
    if (area >= minArea) continue;
    const bx = stats.intAt(i, 0);
    const by = stats.intAt(i, 1);
    const bw = stats.intAt(i, 2);
    const bh = stats.intAt(i, 3);
    for (let y = by; y < by + bh; y += 1) {
      for (let x = bx; x < bx + bw; x += 1) {
        if (labels.intAt(y, x) === i) binary.ucharPtr(y, x)[0] = 255;
      }
    }
  }
  safeDelete(labels);
  safeDelete(stats);
}
function removeSmallComponentsSafe(binary, minArea) {
  const before = countBlackPixels(binary);
  if (before === 0) return;
  const backup = binary.clone();
  removeSmallComponents(binary, minArea);
  const after = countBlackPixels(binary);
  if (after === 0 || (before > 0 && after / before < 0.08)) {
    backup.copyTo(binary);
    if (minArea > 8) removeSmallComponents(binary, Math.max(8, Math.round(minArea * 0.3)));
  }
  safeDelete(backup);
}
function cleanBorderBackground(binary) {
  const h = binary.rows;
  const w = binary.cols;
  const total = w * h;
  const cx0 = Math.floor(w * 0.3);
  const cx1 = Math.ceil(w * 0.7);
  const cy0 = Math.floor(h * 0.3);
  const cy1 = Math.ceil(h * 0.7);
  const visited = new Uint8Array(total);
  const q = [];
  const enqueue = (x, y) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    if (binary.ucharPtr(y, x)[0] > 64) return;
    visited[idx] = 1;
    q.push(idx);
  };
  for (let x = 0; x < w; x += 1) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }
  let head = 0;
  let touchesCenter = false;
  while (head < q.length) {
    const idx = q[head++];
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) touchesCenter = true;
    if (x > 0) enqueue(x - 1, y);
    if (x < w - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < h - 1) enqueue(x, y + 1);
  }
  if (q.length / total > 0.12 && !touchesCenter) {
    for (let i = 0; i < q.length; i += 1) {
      const idx = q[i];
      binary.ucharPtr((idx / w) | 0, idx % w)[0] = 255;
    }
  }
}
function blankWhiteMat(rows, cols) {
  const out = new cv.Mat(rows, cols, cv.CV_8UC1);
  out.setTo(new cv.Scalar(255));
  return out;
}
/** White edges on black (255 = edge). */
function buildEdgeMap(smooth, preset) {
  if (preset.useAdaptive) {
    const block = preset.adaptiveBlockSize | 1;
    const adaptive = new cv.Mat();
    cv.adaptiveThreshold(
      smooth,
      adaptive,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      block,
      preset.adaptiveC
    );
    const eroded = new cv.Mat();
    const k = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.erode(adaptive, eroded, k);
    const edges = new cv.Mat();
    cv.subtract(adaptive, eroded, edges);
    k.delete();
    safeDelete(adaptive);
    safeDelete(eroded);
    return edges;
  }
  const edges = new cv.Mat();
  cv.Canny(smooth, edges, preset.cannyLow, preset.cannyHigh);
  return edges;
}
/** Morphological open on strokes removes isolated pixel dots. */
function removeSpeckleOpen(lines, kernelSize) {
  const size = Math.max(0, Math.round(kernelSize));
  if (size < 3) return;
  const before = countBlackPixels(lines);
  if (before === 0) return;
  const backup = lines.clone();
  const inverted = new cv.Mat();
  cv.bitwise_not(lines, inverted);
  const k = cv.Mat.ones(size | 1, size | 1, cv.CV_8U);
  cv.morphologyEx(inverted, inverted, cv.MORPH_OPEN, k);
  k.delete();
  cv.bitwise_not(inverted, lines);
  safeDelete(inverted);
  const after = countBlackPixels(lines);
  if (after === 0 || after < before * 0.05) {
    backup.copyTo(lines);
  }
  safeDelete(backup);
}
/** Bridge 1–2px gaps in strokes without global thickening (close on inverted lines). */
function closeLineGaps(lines, kernelSize) {
  const size = Math.max(0, Math.round(kernelSize));
  if (size <= 0) return;
  const inverted = new cv.Mat();
  cv.bitwise_not(lines, inverted);
  const k = cv.Mat.ones(size, size, cv.CV_8U);
  cv.morphologyEx(inverted, inverted, cv.MORPH_CLOSE, k);
  k.delete();
  cv.bitwise_not(inverted, lines);
  safeDelete(inverted);
}
function finalizeLineArt(lines, preset, totalPixels) {
  closeLineGaps(lines, preset.morphCloseKernel);
  thickenBlackLines(lines, preset.lineThickness);
  const minArea = Math.max(8, Math.round(totalPixels * preset.minAreaRatio));
  removeSmallComponentsSafe(lines, minArea);
  cleanBorderBackground(lines);
  return lines;
}
/** Single-pass: edges → black on white → open → thicken → cleanup. */
function extractLineArt(smooth, preset, totalPixels, subjectMask) {
  maskGrayToSubjectOnly(smooth, subjectMask);
  let edges = buildEdgeMap(smooth, preset);
  if (subjectMask) {
    cv.bitwise_and(edges, subjectMask, edges);
  }
  const lines = blankWhiteMat(smooth.rows, smooth.cols);
  cv.bitwise_not(edges, lines);
  safeDelete(edges);

  if (countBlackPixels(lines) < totalPixels * 0.002 && preset.useAdaptive) {
    const fallback = new cv.Mat();
    cv.Canny(smooth, fallback, preset.cannyLow, preset.cannyHigh);
    if (subjectMask) {
      cv.bitwise_and(fallback, subjectMask, fallback);
    }
    cv.bitwise_not(fallback, lines);
    safeDelete(fallback);
  }

  removeSpeckleOpen(lines, preset.morphOpenKernel);
  const finalized = finalizeLineArt(lines, preset, totalPixels);
  maskLineArtToSubject(finalized, subjectMask);
  return finalized;
}
function computeFilledBlackRegionRatio(mat) {
  const inverted = new cv.Mat();
  cv.bitwise_not(mat, inverted);
  const dist = new cv.Mat();
  cv.distanceTransform(inverted, dist, cv.DIST_L2, 3);
  safeDelete(inverted);
  let black = 0;
  let interior = 0;
  for (let y = 0; y < mat.rows; y += 1) {
    for (let x = 0; x < mat.cols; x += 1) {
      if (mat.ucharPtr(y, x)[0] >= 128) continue;
      black += 1;
      if (dist.floatAt(y, x) > 4.5) interior += 1;
    }
  }
  safeDelete(dist);
  return black ? interior / black : 0;
}
function analyzeLineArt(mat) {
  const total = mat.rows * mat.cols;
  let black = 0;
  let borderBlack = 0;
  let centerBlack = 0;
  const border = Math.max(2, Math.round(Math.min(mat.cols, mat.rows) * 0.04));
  const cx0 = Math.floor(mat.cols * 0.25);
  const cx1 = Math.ceil(mat.cols * 0.75);
  const cy0 = Math.floor(mat.rows * 0.25);
  const cy1 = Math.ceil(mat.rows * 0.75);
  for (let y = 0; y < mat.rows; y += 1) {
    for (let x = 0; x < mat.cols; x += 1) {
      const v = mat.ucharPtr(y, x)[0];
      if (v >= 128) continue;
      black += 1;
      if (x < border || y < border || x >= mat.cols - border || y >= mat.rows - border) {
        borderBlack += 1;
      }
      if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) centerBlack += 1;
    }
  }
  const blackPixelRatio = black / total;
  const filledBlackRegionRatio = computeFilledBlackRegionRatio(mat);
  return {
    blackPixelRatio,
    whitePixelRatio: 1 - blackPixelRatio,
    borderNoiseRatio: black ? borderBlack / black : 0,
    centerBlackRatio: black ? centerBlack / black : 0,
    filledBlackRegionRatio,
  };
}
function validateLineArt(metrics, presetId) {
  if (metrics.whitePixelRatio > 0.96 && metrics.blackPixelRatio < 0.008) return "too_empty";
  if (metrics.blackPixelRatio < 0.004) return "too_empty";
  if (metrics.filledBlackRegionRatio > 0.35) return "filled_blobs";
  const darkCap = presetId === "simple" ? 0.48 : 0.42;
  if (metrics.blackPixelRatio > darkCap) return "too_dark";
  if (metrics.borderNoiseRatio > 0.65 && metrics.centerBlackRatio < 0.12) return "border_noise";
  return null;
}
function matToRgbaImageData(gray) {
  const rgba = new cv.Mat();
  cv.cvtColor(gray, rgba, cv.COLOR_GRAY2RGBA);
  const img = new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows);
  safeDelete(rgba);
  return img;
}
function matToPngBuffer(mat) {
  const rgba = new cv.Mat();
  cv.cvtColor(mat, rgba, cv.COLOR_GRAY2RGBA);
  const copy = new Uint8ClampedArray(rgba.data);
  const buf = copy.buffer.slice(0);
  safeDelete(rgba);
  return { buffer: buf, width: mat.cols, height: mat.rows };
}
async function processImage(imageData, presetId, jobId, debug = false, subjectMaskBuffer = null) {
  aborted = false;
  const preset = PRESETS[presetId] || PRESETS.balanced;
  const maxEdge = 1280;
  const debugStages = {};
  const hasSubjectMask = subjectMaskBuffer instanceof ArrayBuffer && subjectMaskBuffer.byteLength > 0;
  reportProgress("load", 1, jobId);
  reportProgress("prep", 0.2, jobId);
  const rgba = imageDataToResizedRgbaMat(imageData, maxEdge);
  let subjectMask = null;
  if (hasSubjectMask) {
    subjectMask = subjectMaskToResizedMat(
      new Uint8Array(subjectMaskBuffer),
      imageData.width,
      imageData.height,
      rgba.cols,
      rgba.rows
    );
    if (debug) debugStages["03-subject-mask"] = matToPngBuffer(subjectMask);
  }
  reportProgress("prep", 1, jobId);
  reportProgress("preprocess", 0.1, jobId);
  const gray = new cv.Mat();
  cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
  safeDelete(rgba);
  if (debug) debugStages["03-grayscale"] = matToPngBuffer(gray);
  const smooth = preprocessGray(gray, preset);
  safeDelete(gray);
  if (debug) debugStages["04-normalized"] = matToPngBuffer(smooth);
  reportProgress("preprocess", 1, jobId);
  const totalPixels = smooth.rows * smooth.cols;
  reportProgress("lines", 0.2, jobId);
  const lines = extractLineArt(smooth, preset, totalPixels, subjectMask);
  safeDelete(smooth);
  safeDelete(subjectMask);
  if (debug) {
    debugStages["05-line-art"] = matToPngBuffer(lines);
    debugStages["08-selected-result"] = matToPngBuffer(lines);
  }
  reportProgress("lines", 1, jobId);
  const metrics = analyzeLineArt(lines);
  const reject = validateLineArt(metrics, presetId);
  reportProgress("metrics", 1, jobId);
  if (reject) {
    safeDelete(lines);
    const err = new Error("BAD_RESULT");
    err.details = [{ reject, metrics }];
    throw err;
  }
  reportProgress("output", 0.5, jobId);
  const result = matToRgbaImageData(lines);
  safeDelete(lines);
  reportProgress("output", 1, jobId);
  return {
    imageData: result,
    candidate: preset.useAdaptive ? "adaptive" : "canny",
    score: 0,
    metrics,
    usedSubjectMask: hasSubjectMask,
    debugStages: debug ? debugStages : undefined,
  };
}
self.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === "abort") {
      aborted = true;
      return;
    }
    if (msg.type === "init") {
      postStatus("worker_started");
      await loadOpenCV();
      self.postMessage({ type: "ready" });
      return;
    }
    if (msg.type === "process") {
      postStatus("worker_started");
      await loadOpenCV();
      const { id, width, height, preset, debug, maskBuffer, hasSubjectMask } = msg;
      const imageData = new ImageData(new Uint8ClampedArray(msg.buffer), width, height);
      const result = await processImage(
        imageData,
        preset || "balanced",
        id,
        Boolean(debug),
        hasSubjectMask ? maskBuffer : null
      );
      self.postMessage(
        {
          type: "result",
          id,
          width: result.imageData.width,
          height: result.imageData.height,
          candidate: result.candidate,
          score: result.score,
          usedSubjectMask: result.usedSubjectMask,
          buffer: result.imageData.data.buffer,
          debugStages: result.debugStages,
        },
        [result.imageData.data.buffer]
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({
      type: "error",
      id: msg?.id,
      code:
        message === "BAD_RESULT"
          ? "BAD_RESULT"
          : message.includes("OpenCV")
            ? "OPENCV_INIT_FAILED"
            : "PROCESS_FAILED",
      message,
      details: err instanceof Error && "details" in err ? err.details : undefined,
    });
  }
};
