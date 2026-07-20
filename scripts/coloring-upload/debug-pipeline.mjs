/**
 * Debug pipeline using source worker (blob URL) + crop-math module import.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "tmp", "coloring-upload-debug");
const imagePath = process.argv[2] || path.join(ROOT, "public/rewards/cards/events/event_birthday.webp");
const preset = process.argv[3] || "simple";
const base = process.env.COLORING_DEBUG_BASE || "http://localhost:3002";

fs.mkdirSync(OUT, { recursive: true });

const workerSource = fs.readFileSync(
  path.join(ROOT, "workers/coloring-upload/pipeline.worker.js"),
  "utf8"
);

const imageBytes = fs.readFileSync(imagePath);
const b64 = imageBytes.toString("base64");
const mime = imagePath.endsWith(".webp") ? "image/webp" : "image/jpeg";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${base}/practice/worksheets`, { waitUntil: "domcontentloaded", timeout: 60000 });

const result = await page.evaluate(
  async ({ b64Image, mimeType, presetId, workerSrc }) => {
    const CROP_FRAME_INSET = 0.08;
    const computeFrameRect = (stageWidth, stageHeight, inset = CROP_FRAME_INSET) => {
      const frameX = Math.round(stageWidth * inset);
      const frameY = Math.round(stageHeight * inset);
      const frameWidth = Math.max(1, Math.round(stageWidth * (1 - 2 * inset)));
      const frameHeight = Math.max(1, Math.round(stageHeight * (1 - 2 * inset)));
      return { frameX, frameY, frameWidth, frameHeight };
    };
    const computeCropTransform = (params) => {
      const {
        stageWidth,
        stageHeight,
        sourceWidth,
        sourceHeight,
        userZoom = 1,
        panX = 0,
        panY = 0,
        rotationDeg = 0,
        fitMode = "contain",
        cropInset = CROP_FRAME_INSET,
      } = params;
      const frame = computeFrameRect(stageWidth, stageHeight, cropInset);
      const swap = Math.abs(rotationDeg % 180) === 90;
      const rot = { width: swap ? sourceHeight : sourceWidth, height: swap ? sourceWidth : sourceHeight };
      const baseScale =
        fitMode === "cover"
          ? Math.max(frame.frameWidth / rot.width, frame.frameHeight / rot.height)
          : Math.min(frame.frameWidth / rot.width, frame.frameHeight / rot.height);
      const effectiveScale = baseScale * userZoom;
      return {
        stageWidth,
        stageHeight,
        ...frame,
        sourceWidth,
        sourceHeight,
        baseScale,
        userZoom,
        effectiveScale,
        panX,
        panY,
        rotationDeg,
        fitMode,
      };
    };
    const renderCropStage = (ctx, source, transform) => {
      const { stageWidth, stageHeight, sourceWidth, sourceHeight, effectiveScale, panX, panY, rotationDeg } =
        transform;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, stageWidth, stageHeight);
      ctx.save();
      ctx.translate(stageWidth / 2 + panX, stageHeight / 2 + panY);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.scale(effectiveScale, effectiveScale);
      ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
      ctx.restore();
    };
    const extractCropImageData = (source, transform, maxEdge) => {
      const stage = document.createElement("canvas");
      stage.width = Math.round(transform.stageWidth);
      stage.height = Math.round(transform.stageHeight);
      const ctx = stage.getContext("2d");
      renderCropStage(ctx, source, transform);
      const cropped = ctx.getImageData(transform.frameX, transform.frameY, transform.frameWidth, transform.frameHeight);
      const fitScale = Math.min(1, maxEdge / Math.max(cropped.width, cropped.height));
      const w = Math.max(1, Math.round(cropped.width * fitScale));
      const h = Math.max(1, Math.round(cropped.height * fitScale));
      if (w === cropped.width && h === cropped.height) return cropped;
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const octx = out.getContext("2d");
      octx.fillStyle = "#fff";
      octx.fillRect(0, 0, w, h);
      const tmp = document.createElement("canvas");
      tmp.width = cropped.width;
      tmp.height = cropped.height;
      tmp.getContext("2d").putImageData(cropped, 0, 0);
      octx.drawImage(tmp, 0, 0, w, h);
      return octx.getImageData(0, 0, w, h);
    };
    const renderCropPreview = (previewCanvas, source, transform) => {
      const maxW = 280;
      const scale = Math.min(1, maxW / transform.frameWidth);
      previewCanvas.width = Math.max(1, Math.round(transform.frameWidth * scale));
      previewCanvas.height = Math.max(1, Math.round(transform.frameHeight * scale));
      const stage = document.createElement("canvas");
      stage.width = transform.stageWidth;
      stage.height = transform.stageHeight;
      renderCropStage(stage.getContext("2d"), source, transform);
      const pctx = previewCanvas.getContext("2d");
      pctx.fillStyle = "#fff";
      pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      pctx.drawImage(
        stage,
        transform.frameX,
        transform.frameY,
        transform.frameWidth,
        transform.frameHeight,
        0,
        0,
        previewCanvas.width,
        previewCanvas.height
      );
    };
    const binary = atob(b64Image);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const bitmap = await createImageBitmap(blob);

    const stageW = 640;
    const stageH = 480;
    const transform = computeCropTransform({
      stageWidth: stageW,
      stageHeight: stageH,
      sourceWidth: bitmap.width,
      sourceHeight: bitmap.height,
      userZoom: 1.25,
      panX: -60,
      panY: 35,
      rotationDeg: 0,
      fitMode: "contain",
    });

    const processData = extractCropImageData(bitmap, transform, 1280);
    const cropBytes = new Uint8ClampedArray(processData.data);
    const cropCopy = new ImageData(cropBytes, processData.width, processData.height);

    const previewCanvas = document.createElement("canvas");
    renderCropPreview(previewCanvas, bitmap, transform);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropCopy.width;
    cropCanvas.height = cropCopy.height;
    cropCanvas.getContext("2d")?.putImageData(cropCopy, 0, 0);
    const cropInputUrl = cropCanvas.toDataURL("image/png");

    const workerBlob = new Blob([workerSrc], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(workerBlob);

    const t0 = performance.now();
    const workerResult = await new Promise((resolve, reject) => {
      const w = new Worker(workerUrl);
      const timer = setTimeout(() => {
        w.terminate();
        reject(new Error("worker timeout"));
      }, 120000);
      w.onmessage = (e) => {
        const d = e.data;
        if (d.type === "ready") {
          w.postMessage(
            {
              type: "process",
              id: "debug",
              width: cropCopy.width,
              height: cropCopy.height,
              preset: presetId,
              debug: true,
              buffer: cropCopy.data.buffer,
            },
            [cropCopy.data.buffer]
          );
        } else if (d.type === "result") {
          clearTimeout(timer);
          w.terminate();
          URL.revokeObjectURL(workerUrl);
          resolve(d);
        } else if (d.type === "error") {
          clearTimeout(timer);
          w.terminate();
          URL.revokeObjectURL(workerUrl);
          reject(new Error((d.message || "worker error") + (d.details ? ` ${JSON.stringify(d.details)}` : "")));
        }
      };
      w.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
      w.postMessage({ type: "init" });
    });

    const elapsedMs = Math.round(performance.now() - t0);

    const toDataUrl = (canvas) => canvas.toDataURL("image/png");

    const resultCanvas = document.createElement("canvas");
    resultCanvas.width = workerResult.width;
    resultCanvas.height = workerResult.height;
    resultCanvas
      .getContext("2d")
      ?.putImageData(
        new ImageData(new Uint8ClampedArray(workerResult.buffer), workerResult.width, workerResult.height),
        0,
        0
      );

    let black = 0;
    const px = workerResult.width * workerResult.height;
    const arr = new Uint8ClampedArray(workerResult.buffer);
    for (let i = 0; i < arr.length; i += 4) if (arr[i] < 128) black += 1;

    const debugUrls = {};
    if (workerResult.debugStages) {
      for (const [key, stage] of Object.entries(workerResult.debugStages)) {
        const c = document.createElement("canvas");
        c.width = stage.width;
        c.height = stage.height;
        c.getContext("2d")?.putImageData(
          new ImageData(new Uint8ClampedArray(stage.buffer), stage.width, stage.height),
          0,
          0
        );
        debugUrls[key] = c.toDataURL("image/png");
      }
    }

    return {
      elapsedMs,
      candidate: workerResult.candidate,
      score: workerResult.score,
      evaluationSummary: workerResult.evaluationSummary,
      blackPixelRatio: black / px,
      cropSize: [cropCopy.width, cropCopy.height],
      pngs: {
        "02-crop-preview": toDataUrl(previewCanvas),
        "02-cropped-input": cropInputUrl,
        ...debugUrls,
        "08-selected-result": toDataUrl(resultCanvas),
      },
    };
  },
  { b64Image: b64, mimeType: mime, presetId: preset, workerSrc: workerSource }
);

function dataUrlToBuffer(dataUrl) {
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

for (const [name, url] of Object.entries(result.pngs)) {
  fs.writeFileSync(path.join(OUT, `${name}.png`), dataUrlToBuffer(url));
}

console.log(
  JSON.stringify(
    {
      imagePath,
      preset,
      elapsedMs: result.elapsedMs,
      candidate: result.candidate,
      score: result.score,
      evaluationSummary: result.evaluationSummary,
      blackPixelRatio: result.blackPixelRatio,
      cropSize: result.cropSize,
      savedTo: OUT,
    },
    null,
    2
  )
);

await browser.close();
