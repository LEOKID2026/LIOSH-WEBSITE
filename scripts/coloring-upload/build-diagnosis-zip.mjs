/**
 * Build tmp/coloring-upload-diagnosis.zip for offline pipeline diagnosis.
 * Does NOT modify engine code.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE_REL = "public/rewards/cards/events/event_birthday.webp";
const SOURCE_PATH = path.join(ROOT, SOURCE_REL);
const LAST_PRESET = "simple";
const BASE = process.env.COLORING_DEBUG_BASE || "http://localhost:3002";
const STAGING = path.join(ROOT, "tmp", "coloring-upload-diagnosis-staging");
const ZIP_PATH = path.join(ROOT, "tmp", "coloring-upload-diagnosis.zip");

const CODE_FILES = [
  ["workers/coloring-upload/pipeline.worker.js", "code/pipeline.worker.js"],
  ["lib/coloring-upload/crop-math.js", "code/crop-math.js"],
  ["lib/coloring-upload/presets.js", "code/presets.js"],
  ["lib/coloring-upload/pipeline-client.client.js", "code/pipeline-client.client.js"],
  ["lib/coloring-upload/quality-metrics.js", "code/quality-metrics.js"],
  ["components/coloring-upload/ColoringUploadWizard.jsx", "code/ColoringUploadWizard.jsx"],
];

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function extractWorkerPresets() {
  const src = fs.readFileSync(
    path.join(ROOT, "workers/coloring-upload/pipeline.worker.js"),
    "utf8"
  );
  const start = src.indexOf("const PRESETS = {");
  const end = src.indexOf("};", start) + 2;
  const block = src.slice(start, end);
  const fn = new Function(`${block}; return PRESETS;`);
  return fn();
}

function extractWorkerConstants() {
  const src = fs.readFileSync(
    path.join(ROOT, "workers/coloring-upload/pipeline.worker.js"),
    "utf8"
  );
  const orderMatch = src.match(/const PRESET_CANDIDATE_ORDER = (\{[\s\S]*?\n\};)/);
  const orderFn = new Function(`return ${orderMatch[1].replace("const PRESET_CANDIDATE_ORDER = ", "").replace(/;$/, "")}`);
  return { PRESET_CANDIDATE_ORDER: orderFn() };
}

function bufferToRgba(buffer, width, height) {
  return { data: new Uint8ClampedArray(buffer), width, height };
}

function countConnectedComponentsRgba({ data, width, height }) {
  const visited = new Uint8Array(width * height);
  const areas = [];
  const stack = [];
  const isBlack = (idx) => data[idx * 4] < 128;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (visited[idx] || !isBlack(idx)) continue;
      let area = 0;
      stack.length = 0;
      stack.push(idx);
      visited[idx] = 1;
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
          if (visited[nidx] || !isBlack(nidx)) continue;
          visited[nidx] = 1;
          stack.push(nidx);
        }
      }
      areas.push(area);
    }
  }
  return areas;
}

function qualityMetricsFromRgba(rgba) {
  const { data, width, height } = rgba;
  const total = width * height;
  let black = 0;
  let borderBlack = 0;
  const border = Math.max(2, Math.round(Math.min(width, height) * 0.02));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i] >= 128) continue;
      black += 1;
      if (x < border || y < border || x >= width - border || y >= height - border) {
        borderBlack += 1;
      }
    }
  }
  const components = countConnectedComponentsRgba(rgba);
  const tinyComponents = components.filter((a) => a < 16).length;
  return {
    blackPixelRatio: total ? black / total : 0,
    lineDensity: total ? black / (width + height) : 0,
    componentCount: components.length,
    tinyComponentRatio: components.length ? tinyComponents / components.length : 0,
    largestBlackRegionRatio: components.length ? Math.max(...components) / total : 0,
    borderNoiseRatio: black ? borderBlack / black : 0,
  };
}

function validateCandidate(metrics, presetId) {
  const hasCentralSubject =
    metrics.centerBlackRatio >= 0.28 && metrics.blackPixelRatio >= 0.012;
  const emptyWhite = presetId === "simple" ? 0.965 : 0.94;
  if (metrics.whitePixelRatio > emptyWhite && !hasCentralSubject) return "too_empty";
  if (metrics.blackPixelRatio < 0.006) return "too_empty";
  if (metrics.largestBlackRatio < 0.035 && metrics.blackPixelRatio < 0.05 && !hasCentralSubject) {
    return "no_subject";
  }
  if (metrics.quadSkew > 0.78) return "corner_cluster";
  if (metrics.centerBlackRatio < 0.08 && metrics.blackPixelRatio < 0.09) return "no_center_lines";
  if (metrics.tinyComponentRatio > 0.9 && metrics.blackPixelRatio < 0.035) return "noise_only";
  if (metrics.tinyComponentRatio > 0.62 && metrics.blackPixelRatio < 0.16) return "noise_only";
  if (metrics.largestBlackRatio < 0.006 && metrics.blackPixelRatio < 0.07) return "no_subject";
  const darkCap = presetId === "simple" ? 0.5 : 0.44;
  if (metrics.blackPixelRatio > darkCap) return "too_dark";
  const fillCap = presetId === "simple" ? 0.45 : 0.38;
  if (metrics.largestBlackRatio > fillCap) return "large_black_fill";
  if (metrics.borderNoiseRatio > 0.62 && metrics.centerBlackRatio < 0.15) return "border_noise";
  return null;
}

function scoreCandidate(metrics) {
  let score = 100;
  score -= Math.abs(metrics.blackPixelRatio - 0.1) * 350;
  score -= metrics.borderNoiseRatio * 60;
  score -= Math.max(0, metrics.quadSkew - 0.45) * 80;
  score += metrics.centerBlackRatio * 40;
  score -= Math.max(0, metrics.largestBlackRatio - 0.2) * 120;
  if (metrics.blackPixelRatio > 0.28) score -= 80;
  return score;
}

function analyzeGrayCandidate(rgba) {
  const { data, width, height } = rgba;
  const total = width * height;
  let black = 0;
  let borderBlack = 0;
  let centerBlack = 0;
  const quadBlack = [0, 0, 0, 0];
  const border = Math.max(2, Math.round(Math.min(width, height) * 0.04));
  const cx0 = Math.floor(width * 0.25);
  const cx1 = Math.ceil(width * 0.75);
  const cy0 = Math.floor(height * 0.25);
  const cy1 = Math.ceil(height * 0.75);
  const mx = width / 2;
  const my = height / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const v = data[i];
      if (v >= 128) continue;
      black += 1;
      if (x < border || y < border || x >= width - border || y >= height - border) {
        borderBlack += 1;
      }
      if (x >= cx0 && x < cx1 && y >= cy0 && y < cy1) centerBlack += 1;
      const qi = (x < mx ? 0 : 1) + (y < my ? 0 : 2);
      quadBlack[qi] += 1;
    }
  }

  const qm = qualityMetricsFromRgba(rgba);
  const blackPixelRatio = black / total;
  const whitePixelRatio = 1 - blackPixelRatio;
  const borderNoiseRatio = black ? borderBlack / black : 0;
  const centerBlackRatio = black ? centerBlack / black : 0;
  const maxQuad = Math.max(...quadBlack);
  const quadSkew = black ? maxQuad / black : 1;

  return {
    blackPixelRatio,
    whitePixelRatio,
    lineDensity: qm.lineDensity,
    componentCount: qm.componentCount,
    tinyComponentRatio: qm.tinyComponentRatio,
    largestBlackRegionRatio: qm.largestBlackRegionRatio,
    largestBlackRatio: qm.largestBlackRegionRatio,
    borderNoiseRatio,
    centerBlackRatio,
    quadSkew,
  };
}

function pickCandidate(evaluated, order) {
  for (const method of order) {
    const item = evaluated.find((e) => e.name === method);
    if (item && !item.reject) return { chosen: item, reason: `primary_order:${method}` };
  }
  const fallback = evaluated
    .filter(
      (e) =>
        e.metrics.blackPixelRatio >= 0.01 &&
        (e.metrics.largestBlackRatio >= 0.02 || e.metrics.centerBlackRatio >= 0.22)
    )
    .sort((a, b) => b.score - a.score)[0];
  if (fallback) return { chosen: fallback, reason: `fallback:${fallback.name}` };
  return { chosen: null, reason: "none_passed" };
}

function selectionExplanation(evaluated, order, chosenName, workerCandidate) {
  const lines = [`worker_selected:${workerCandidate}`];
  for (const method of order) {
    const item = evaluated.find((e) => e.name === method);
    if (!item) continue;
    lines.push(
      `${method}: reject=${item.reject || "null"} score=${item.score.toFixed(2)} black=${item.metrics.blackPixelRatio.toFixed(4)}`
    );
  }
  if (chosenName && chosenName !== workerCandidate) {
    lines.push("note:diagnosis_pick_may_differ_from_worker_if_escalation_ran");
  }
  return lines.join("; ");
}

function dataUrlToBuffer(dataUrl) {
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function collectFromBrowser() {
  if (!fs.existsSync(SOURCE_PATH)) throw new Error(`Missing source image: ${SOURCE_PATH}`);

  const imageBytes = fs.readFileSync(SOURCE_PATH);
  const b64 = imageBytes.toString("base64");
  const mime = SOURCE_PATH.endsWith(".webp")
    ? "image/webp"
    : SOURCE_PATH.endsWith(".png")
      ? "image/png"
      : "image/jpeg";

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/practice/worksheets`, { waitUntil: "domcontentloaded", timeout: 60000 });

  const presets = ["simple", "balanced", "detailed"];
  const byPreset = {};

  for (const presetId of presets) {
    const result = await page.evaluate(
      async ({ b64Image, mimeType, presetId: pid }) => {
        const binary = atob(b64Image);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });
        const bitmap = await createImageBitmap(blob);

        const decodedCanvas = document.createElement("canvas");
        decodedCanvas.width = bitmap.width;
        decodedCanvas.height = bitmap.height;
        decodedCanvas.getContext("2d")?.drawImage(bitmap, 0, 0);

        const stageW = 640;
        const stageH = 480;
        const cropInset = 0.08;
        const stage = document.createElement("canvas");
        stage.width = stageW;
        stage.height = stageH;
        const ctx = stage.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, stageW, stageH);
        const scale = Math.min(stageW / bitmap.width, stageH / bitmap.height) * 0.95;
        ctx.save();
        ctx.translate(stageW / 2, stageH / 2);
        ctx.scale(scale, scale);
        ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
        ctx.restore();

        const x = Math.round(stageW * cropInset);
        const y = Math.round(stageH * cropInset);
        const w = Math.round(stageW * (1 - 2 * cropInset));
        const h = Math.round(stageH * (1 - 2 * cropInset));
        const cropData = ctx.getImageData(x, y, w, h);
        for (let i = 0; i < cropData.data.length; i += 4) {
          const a = cropData.data[i + 3] / 255;
          if (a >= 1) continue;
          cropData.data[i] = Math.round(cropData.data[i] * a + 255 * (1 - a));
          cropData.data[i + 1] = Math.round(cropData.data[i + 1] * a + 255 * (1 - a));
          cropData.data[i + 2] = Math.round(cropData.data[i + 2] * a + 255 * (1 - a));
          cropData.data[i + 3] = 255;
        }

        const maxEdge = 1280;
        const fitScale = Math.min(1, maxEdge / Math.max(cropData.width, cropData.height));
        const procW = Math.max(1, Math.round(cropData.width * fitScale));
        const procH = Math.max(1, Math.round(cropData.height * fitScale));
        const procCanvas = document.createElement("canvas");
        procCanvas.width = procW;
        procCanvas.height = procH;
        const pctx = procCanvas.getContext("2d");
        pctx.fillStyle = "#fff";
        pctx.fillRect(0, 0, procW, procH);
        const tmp = document.createElement("canvas");
        tmp.width = cropData.width;
        tmp.height = cropData.height;
        tmp.getContext("2d")?.putImageData(cropData, 0, 0);
        pctx.drawImage(tmp, 0, 0, procW, procH);
        const processData = pctx.getImageData(0, 0, procW, procH);

        const workerUrl = new URL(
          "/_next/static/chunks/_pages-dir-browser_workers_coloring-upload_pipeline_worker_js.js",
          location.origin
        ).href;

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
                  id: "diagnosis",
                  width: processData.width,
                  height: processData.height,
                  preset: pid,
                  debug: true,
                  buffer: processData.data.buffer,
                },
                [processData.data.buffer]
              );
            } else if (d.type === "result") {
              clearTimeout(timer);
              w.terminate();
              resolve(d);
            } else if (d.type === "error") {
              clearTimeout(timer);
              w.terminate();
              reject(new Error(d.message || "worker error"));
            }
          };
          w.onerror = (err) => reject(err);
          w.postMessage({ type: "init" });
        });

        const toStageDataUrl = (st) => {
          const c = document.createElement("canvas");
          c.width = st.width;
          c.height = st.height;
          c.getContext("2d")?.putImageData(
            new ImageData(new Uint8ClampedArray(st.buffer), st.width, st.height),
            0,
            0
          );
          return c.toDataURL("image/png");
        };

        const debugPngs = {};
        if (workerResult.debugStages) {
          for (const [key, st] of Object.entries(workerResult.debugStages)) {
            debugPngs[key] = toStageDataUrl(st);
          }
        }

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

        return {
          elapsedMs: Math.round(performance.now() - t0),
          candidate: workerResult.candidate,
          score: workerResult.score,
          sizes: {
            decoded: [bitmap.width, bitmap.height],
            cropped: [cropData.width, cropData.height],
            process: [processData.width, processData.height],
            result: [workerResult.width, workerResult.height],
          },
          pngs: {
            "01-decoded": decodedCanvas.toDataURL("image/png"),
            "02-cropped": tmp.toDataURL("image/png"),
            ...debugPngs,
            "08-selected-result": resultCanvas.toDataURL("image/png"),
          },
          stageBuffers: workerResult.debugStages
            ? Object.fromEntries(
                Object.entries(workerResult.debugStages).map(([key, st]) => [
                  key,
                  { width: st.width, height: st.height, buffer: Array.from(new Uint8ClampedArray(st.buffer)) },
                ])
              )
            : {},
        };
      },
      { b64Image: b64, mimeType: mime, presetId }
    );

    byPreset[presetId] = result;
  }

  await browser.close();
  return byPreset;
}

function saveStagePng(stagingDebugDir, name, dataUrl) {
  fs.writeFileSync(path.join(stagingDebugDir, `${name}.png`), dataUrlToBuffer(dataUrl));
}

function grayBufferToImageData(stage) {
  const { width, height, buffer } = stage;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = 0; i < buffer.length; i += 1, p += 4) {
    const v = buffer[i];
    rgba[p] = v;
    rgba[p + 1] = v;
    rgba[p + 2] = v;
    rgba[p + 3] = 255;
  }
  return new ImageData(rgba, width, height);
}

async function main() {
  console.log("Collecting pipeline data from browser...");
  const byPreset = await collectFromBrowser();
  const workerPresets = extractWorkerPresets();
  const { PRESET_CANDIDATE_ORDER } = extractWorkerConstants();

  rmDir(STAGING);
  fs.mkdirSync(path.join(STAGING, "source"), { recursive: true });
  fs.mkdirSync(path.join(STAGING, "debug"), { recursive: true });
  fs.mkdirSync(path.join(STAGING, "code"), { recursive: true });

  const last = byPreset[LAST_PRESET];
  for (const [name, url] of Object.entries(last.pngs)) {
    saveStagePng(path.join(STAGING, "debug"), name, url);
  }

  fs.copyFileSync(SOURCE_PATH, path.join(STAGING, "source", path.basename(SOURCE_PATH)));

  for (const [src, dest] of CODE_FILES) {
    fs.copyFileSync(path.join(ROOT, src), path.join(STAGING, dest));
  }

  const metricsReport = {
    sourceImage: SOURCE_REL,
    lastTestPreset: LAST_PRESET,
    capturedAt: new Date().toISOString(),
    note:
      "Candidate metrics computed from debug stage buffers via quality-metrics.js + worker validation/scoring replica. Worker may run quality escalation (simple→balanced, balanced→detailed) not fully reflected in per-candidate pre-escalation buffers.",
    presets: {},
  };

  for (const presetId of ["simple", "balanced", "detailed"]) {
    const run = byPreset[presetId];
    const order = PRESET_CANDIDATE_ORDER[presetId];
    const candidates = ["contour", "adaptive", "simplified"].map((name) => {
      const stageKey =
        name === "contour"
          ? "05-contour-candidate"
          : name === "adaptive"
            ? "06-adaptive-candidate"
            : "07-simplified-candidate";
      const stage = run.stageBuffers[stageKey];
      if (!stage) return { name, error: "missing_stage" };
      const rgba = bufferToRgba(stage.buffer, stage.width, stage.height);
      const metrics = analyzeGrayCandidate(rgba);
      const reject = validateCandidate(metrics, presetId);
      const score = scoreCandidate(metrics);
      return { name, metrics, reject, score };
    });

    const { chosen, reason } = pickCandidate(candidates, order);
    metricsReport.presets[presetId] = {
      workerElapsedMs: run.elapsedMs,
      workerSelectedCandidate: run.candidate,
      workerFinalScore: run.score,
      candidateOrder: order,
      diagnosisPick: chosen?.name || null,
      diagnosisPickReason: reason,
      selectionExplanation: selectionExplanation(candidates, order, chosen?.name, run.candidate),
      candidates: candidates.map((c) => ({
        name: c.name,
        reject: c.reject,
        score: c.score,
        metrics: c.metrics
          ? {
              blackPixelRatio: c.metrics.blackPixelRatio,
              lineDensity: c.metrics.lineDensity,
              componentCount: c.metrics.componentCount,
              tinyComponentRatio: c.metrics.tinyComponentRatio,
              largestBlackRegionRatio: c.metrics.largestBlackRegionRatio,
              borderNoiseRatio: c.metrics.borderNoiseRatio,
              centerBlackRatio: c.metrics.centerBlackRatio,
              whitePixelRatio: c.metrics.whitePixelRatio,
            }
          : null,
        error: c.error || null,
      })),
      finalResultMetrics: (() => {
        const url = run.pngs["08-selected-result"];
        if (!url) return null;
        const buf = dataUrlToBuffer(url);
        return { note: "see worker output PNG 08-selected-result.png" };
      })(),
    };
  }

  fs.writeFileSync(path.join(STAGING, "metrics.json"), JSON.stringify(metricsReport, null, 2));

  const presetParameters = {
    note: "Active processing parameters live in pipeline.worker.js PRESETS. lib/coloring-upload/presets.js is UI metadata and may differ.",
    workerPRESETS: workerPresets,
    libCOLORING_UPLOAD_PRESETS: (
      await import(pathToFileURL(path.join(ROOT, "lib/coloring-upload/presets.js")).href)
    ).COLORING_UPLOAD_PRESETS,
    PRESET_CANDIDATE_ORDER,
    presetLabelsHe: {
      simple: "קל לילדים",
      balanced: "מאוזן",
      detailed: "מפורט",
    },
  };
  fs.writeFileSync(
    path.join(STAGING, "preset-parameters.json"),
    JSON.stringify(presetParameters, null, 2)
  );

  fs.writeFileSync(
    path.join(STAGING, "README.txt"),
    [
      "Coloring upload pipeline diagnosis bundle",
      `Source: ${SOURCE_REL}`,
      `Last test preset: ${LAST_PRESET}`,
      "",
      "Contents:",
      "- source/ original upload",
      "- debug/ pipeline stage PNGs (01-08) for last preset",
      "- code/ files affecting output",
      "- metrics.json per-preset candidate metrics",
      "- preset-parameters.json worker + lib preset defs",
    ].join("\n")
  );

  const debugOut = path.join(ROOT, "tmp", "coloring-upload-debug");
  fs.mkdirSync(debugOut, { recursive: true });
  for (const [name, url] of Object.entries(last.pngs)) {
    saveStagePng(debugOut, name, url);
  }

  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);
  const stagingParent = path.dirname(STAGING);
  const stagingName = path.basename(STAGING);
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${stagingName}' -DestinationPath 'coloring-upload-diagnosis.zip' -Force"`,
    { cwd: stagingParent, stdio: "inherit" }
  );

  rmDir(STAGING);
  console.log(`Created: ${ZIP_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
