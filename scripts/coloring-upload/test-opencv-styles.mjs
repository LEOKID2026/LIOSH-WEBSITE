/**
 * Temporary — compare OpenCV line-art styles on a local image (no Hugging Face).
 *
 * Usage:
 *   node scripts/coloring-upload/test-opencv-styles.mjs [imagePath]
 *
 * Requires dev server on localhost:3002 (serves /wasm/opencv/opencv.js).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "tmp", "style-tests");
const imagePath = process.argv[2] || path.join(ROOT, "omer.jpeg");
const base = process.env.COLORING_DEBUG_BASE || "http://localhost:3002";

const STYLE_PRESETS = {
  standard: {
    label: "1-standard-line-art",
    preset: {
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
  },
  boldComic: {
    label: "2-bold-comic",
    preset: {
      bilateralDiameter: 9,
      bilateralSigmaColor: 80,
      bilateralSigmaSpace: 80,
      preBlurSize: 3,
      claheClipLimit: 2.5,
      useAdaptive: true,
      adaptiveBlockSize: 17,
      adaptiveC: 10,
      cannyLow: 55,
      cannyHigh: 140,
      lineThickness: 2,
      morphCloseKernel: 4,
      morphOpenKernel: 2,
      minAreaRatio: 0.00006,
    },
  },
  softSketch: {
    label: "3-soft-sketch",
    preset: {
      bilateralDiameter: 11,
      bilateralSigmaColor: 95,
      bilateralSigmaSpace: 95,
      preBlurSize: 7,
      claheClipLimit: 0.6,
      useAdaptive: false,
      adaptiveBlockSize: 15,
      adaptiveC: 6,
      cannyLow: 18,
      cannyHigh: 55,
      lineThickness: 0,
      morphCloseKernel: 1,
      morphOpenKernel: 0,
      minAreaRatio: 0.00004,
    },
  },
};

if (!fs.existsSync(imagePath)) {
  console.error(`Image not found: ${imagePath}`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

let workerSource = fs.readFileSync(
  path.join(ROOT, "workers/coloring-upload/pipeline.worker.js"),
  "utf8"
);

workerSource = workerSource.replace(
  'const preset = PRESETS[presetId] || PRESETS.balanced;',
  `const STYLE_PRESETS = ${JSON.stringify(
    Object.fromEntries(Object.entries(STYLE_PRESETS).map(([k, v]) => [k, v.preset])),
    null,
    2
  )};
  const preset = STYLE_PRESETS[presetId] || PRESETS[presetId] || PRESETS.balanced;`
);

const imageBytes = fs.readFileSync(imagePath);
const b64 = imageBytes.toString("base64");
const ext = path.extname(imagePath).toLowerCase();
const mime =
  ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${base}/practice/worksheets`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});

const results = [];

for (const [presetId, { label }] of Object.entries(STYLE_PRESETS)) {
  const output = await page.evaluate(
    async ({ b64Image, mimeType, presetKey, workerSrc, maxEdge }) => {
      const binary = atob(b64Image);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mimeType });
      const bitmap = await createImageBitmap(blob);

      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const inputCopy = new ImageData(new Uint8ClampedArray(imageData.data), w, h);

      const workerBlob = new Blob([workerSrc], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(workerBlob);

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
                id: presetKey,
                width: inputCopy.width,
                height: inputCopy.height,
                preset: presetKey,
                debug: false,
                buffer: inputCopy.data.buffer,
              },
              [inputCopy.data.buffer]
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
            reject(new Error(d.message || "worker error"));
          }
        };
        w.onerror = (err) => {
          clearTimeout(timer);
          reject(err);
        };
        w.postMessage({ type: "init" });
      });

      const outCanvas = document.createElement("canvas");
      outCanvas.width = workerResult.width;
      outCanvas.height = workerResult.height;
      outCanvas.getContext("2d")?.putImageData(
        new ImageData(
          new Uint8ClampedArray(workerResult.buffer),
          workerResult.width,
          workerResult.height
        ),
        0,
        0
      );

      return {
        presetKey,
        candidate: workerResult.candidate,
        size: [workerResult.width, workerResult.height],
        inputPng: canvas.toDataURL("image/png"),
        outputPng: outCanvas.toDataURL("image/png"),
      };
    },
    { b64Image: b64, mimeType: mime, presetKey: presetId, workerSrc: workerSource, maxEdge: 1280 }
  );

  const inputBuf = Buffer.from(output.inputPng.split(",")[1], "base64");
  const outputBuf = Buffer.from(output.outputPng.split(",")[1], "base64");
  const inputPath = path.join(OUT, `${label}-input.png`);
  const outputPath = path.join(OUT, `${label}.png`);

  if (presetId === "standard") {
    fs.writeFileSync(inputPath, inputBuf);
  }
  fs.writeFileSync(outputPath, outputBuf);

  results.push({
    style: label,
    presetId,
    candidate: output.candidate,
    size: output.size,
    output: outputPath,
  });
}

await browser.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      source: imagePath,
      savedTo: OUT,
      styles: results,
    },
    null,
    2
  )
);
