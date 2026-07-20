/**
 * Main-thread pipeline client — subject segmentation, then OpenCV worker.
 */

import { PROGRESS_PHASE } from "./constants.js";
import { computeWeightedPercent } from "./progress-weights.js";
import { computeQualityMetrics } from "./quality-metrics.js";
import { setActiveAbort, abortActiveProcessing } from "./memory-manager.client.js";
import { withPrivacyGuard } from "./privacy-guard.client.js";
import { segmentSubjectForColoring } from "./subject-segmentation.client.js";
import { requestHfLineArt } from "./hf-lineart.client.js";
import {
  prepareHfLineArtForColoringPage,
  prepareOpenCvLineArtForColoringPage,
} from "./line-art-postprocess.client.js";
import { WORKSHEET_UI_HE } from "../worksheets/worksheet-ui.he.js";

const OPENCV_INIT_TIMEOUT_MS = 20000;

/** Maps worker lifecycle status → visible progress before image processing. */
const INIT_STATUS_PERCENT = {
  worker_started: 1,
  opencv_loading: 4,
  opencv_ready: 10,
};

/** Client-side subject segmentation occupies 10–25% of overall progress. */
const SEGMENT_PERCENT_START = INIT_STATUS_PERCENT.opencv_ready;
const SEGMENT_PERCENT_SPAN = 15;
const WORKER_PERCENT_START = SEGMENT_PERCENT_START + SEGMENT_PERCENT_SPAN;

/** @type {Worker | null} */
let workerInstance = null;
/** @type {Promise<void> | null} */
let workerReadyPromise = null;

function scaleWorkerPercent(rawPercent) {
  const range = 100 - WORKER_PERCENT_START;
  return Math.round(WORKER_PERCENT_START + (rawPercent / 100) * range);
}

function resetWorkerState() {
  workerInstance = null;
  workerReadyPromise = null;
}

function attachWorkerDiagnostics(worker) {
  worker.addEventListener("error", (event) => {
    console.error("[coloring-upload] Worker error:", event.message, event.filename, event.lineno);
  });
  worker.addEventListener("messageerror", (event) => {
    console.error("[coloring-upload] Worker messageerror:", event);
  });
}

function createWorker() {
  if (typeof window === "undefined") throw new Error("Worker unavailable");
  const worker = new Worker(
    new URL("../../workers/coloring-upload/pipeline.worker.js", import.meta.url)
  );
  attachWorkerDiagnostics(worker);
  return worker;
}

function waitForWorkerReady(worker, onInitProgress) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("OPENCV_INIT_TIMEOUT"));
    }, OPENCV_INIT_TIMEOUT_MS);

    const onMessage = (event) => {
      const data = event.data;
      if (data?.type === "status") {
        const pct = INIT_STATUS_PERCENT[data.status];
        if (pct != null) onInitProgress?.(pct, data.status);
        return;
      }
      if (data?.type === "ready") {
        cleanup();
        resolve();
        return;
      }
      if (data?.type === "error") {
        cleanup();
        reject(new Error(data.message || "OPENCV_INIT_FAILED"));
      }
    };

    const onError = (event) => {
      cleanup();
      reject(new Error(event.message || "Worker failed to start"));
    };

    const onMessageError = () => {
      cleanup();
      reject(new Error("Worker message decode failed"));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onMessageError);
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onMessageError);
    onInitProgress?.(INIT_STATUS_PERCENT.worker_started, "worker_started");
    worker.postMessage({ type: "init" });
  });
}

function getWorker(onInitProgress) {
  if (!workerInstance) {
    workerInstance = createWorker();
    workerReadyPromise = waitForWorkerReady(workerInstance, onInitProgress);
  }
  return { worker: workerInstance, ready: workerReadyPromise };
}

/** OpenCV fallback always uses the detailed preset. */
export const COLORING_UPLOAD_OPENCV_PRESET = "detailed";

/**
 * @param {ImageData} rawLineArt
 * @param {"hf-lineart" | "opencv"} source
 */
async function finalizeUploadLineArt(rawLineArt, source) {
  if (source === "hf-lineart") {
    return prepareHfLineArtForColoringPage(rawLineArt);
  }
  return prepareOpenCvLineArtForColoringPage(rawLineArt);
}

/**
 * @param {ImageData} imageData
 * @param {{
 *   onProgress?: (percent: number, phase: string) => void,
 *   signal?: AbortSignal,
 *   weakDevice?: boolean,
 *   skipSegmentation?: boolean,
 *   skipHfLineArt?: boolean,
 *   hfTimeoutMs?: number,
 *   authHeader?: string | null,
 * }} opts
 */
export async function runColoringPipelineWithHfFallback(imageData, opts = {}) {
  if (!opts.skipHfLineArt) {
    try {
      opts.onProgress?.(8, PROGRESS_PHASE.HF_LINEART);
      const hf = await requestHfLineArt(imageData, {
        signal: opts.signal,
        timeoutMs: opts.hfTimeoutMs,
        authHeader: opts.authHeader,
      });
      opts.onProgress?.(92, PROGRESS_PHASE.OUTPUT);
      const lineArt = await finalizeUploadLineArt(hf.lineArt, "hf-lineart");
      opts.onProgress?.(100, PROGRESS_PHASE.OUTPUT);
      return {
        lineArt,
        candidate: "hf-lineart",
        metrics: computeQualityMetrics(lineArt),
        usedSubjectMask: false,
        source: "hf-lineart",
        quota: hf.quota,
        hfFallback: false,
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (err instanceof Error && err.name === "ColoringUploadQuotaError") throw err;
      console.warn("[coloring-upload] HF line-art unavailable, using OpenCV fallback:", err);
      opts.onProgress?.(12, "hf-fallback");
    }
  }

  const result = await runColoringPipeline(imageData, COLORING_UPLOAD_OPENCV_PRESET, opts);
  const lineArt = await finalizeUploadLineArt(result.lineArt, "opencv");
  return { ...result, lineArt, source: "opencv", hfFallback: !opts.skipHfLineArt };
}

/**
 * @param {ImageData} imageData
 * @param {string} presetId
 * @param {{
 *   onProgress?: (percent: number, phase: string) => void,
 *   signal?: AbortSignal,
 *   weakDevice?: boolean,
 *   skipSegmentation?: boolean,
 * }} opts
 */
export async function runColoringPipeline(imageData, presetId, opts = {}) {
  return withPrivacyGuard(async () => {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const controller = new AbortController();
    setActiveAbort(controller);
    if (opts.signal) {
      opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const { worker, ready } = getWorker((pct, phase) => {
      opts.onProgress?.(pct, phase);
    });
    await ready;

    if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");

    let pipelineImageData = imageData;
    /** @type {Uint8ClampedArray | null} */
    let subjectMask = null;

    if (!opts.skipSegmentation) {
      const segmented = await segmentSubjectForColoring(imageData, {
        weakDevice: opts.weakDevice,
        signal: controller.signal,
        onProgress: (segProgress) => {
          opts.onProgress?.(
            SEGMENT_PERCENT_START + Math.round(segProgress * SEGMENT_PERCENT_SPAN),
            PROGRESS_PHASE.SEGMENT
          );
        },
      });
      pipelineImageData = segmented.isolatedImageData;
      subjectMask = segmented.subjectMask;
    }

    if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const phaseProgress = {
      [PROGRESS_PHASE.LOAD]: 0,
      [PROGRESS_PHASE.PREP]: 0,
      [PROGRESS_PHASE.PREPROCESS]: 0,
      [PROGRESS_PHASE.LINES]: 0,
      [PROGRESS_PHASE.METRICS]: 0,
      [PROGRESS_PHASE.OUTPUT]: 0,
    };

    const buffer = pipelineImageData.data.buffer.slice(0);
    const transferables = [buffer];
    /** @type {ArrayBuffer | undefined} */
    let maskBuffer;
    if (subjectMask) {
      maskBuffer = subjectMask.slice().buffer;
      transferables.push(maskBuffer);
    }

    const result = await new Promise((resolve, reject) => {
      const onAbort = () => {
        worker.postMessage({ type: "abort" });
        reject(new DOMException("Aborted", "AbortError"));
      };
      controller.signal.addEventListener("abort", onAbort);

      const handler = (event) => {
        const data = event.data;
        if (data.id && data.id !== id) return;

        if (data.type === "status") {
          const pct = INIT_STATUS_PERCENT[data.status];
          if (pct != null) opts.onProgress?.(pct, data.status);
          return;
        }

        if (data.type === "progress") {
          phaseProgress[data.phase] = data.phaseProgress;
          opts.onProgress?.(scaleWorkerPercent(computeWeightedPercent(phaseProgress)), data.phase);
          return;
        }
        if (data.type === "result") {
          worker.removeEventListener("message", handler);
          controller.signal.removeEventListener("abort", onAbort);
          const out = new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
          resolve({
            lineArt: out,
            candidate: data.candidate,
            metrics: computeQualityMetrics(out),
            usedSubjectMask: Boolean(data.usedSubjectMask),
          });
          return;
        }
        if (data.type === "error") {
          worker.removeEventListener("message", handler);
          controller.signal.removeEventListener("abort", onAbort);
          if (data.code === "BAD_RESULT") {
            reject(new Error("BAD_RESULT"));
          } else if (data.code === "OPENCV_INIT_FAILED") {
            reject(new Error("OPENCV_INIT_FAILED"));
          } else {
            reject(new Error(data.message || "PROCESS_FAILED"));
          }
        }
      };

      worker.addEventListener("message", handler);
      worker.postMessage(
        {
          type: "process",
          id,
          width: pipelineImageData.width,
          height: pipelineImageData.height,
          preset: presetId,
          buffer,
          maskBuffer,
          hasSubjectMask: Boolean(subjectMask),
        },
        transferables
      );
    });

    setActiveAbort(null);
    return result;
  });
}

export function terminatePipelineWorker() {
  abortActiveProcessing();
  if (workerInstance) {
    try {
      workerInstance.postMessage({ type: "abort" });
      workerInstance.terminate();
    } catch {
      /* ignore */
    }
    resetWorkerState();
  }
}

export function getPipelineErrorMessageHe(err) {
  if (err instanceof DOMException && err.name === "AbortError") return "";
  if (err instanceof Error) {
    if (err.name === "ColoringUploadQuotaError") {
      return /** @type {any} */ (err).messageHe || WORKSHEET_UI_HE.coloringUploadQuotaUser;
    }
    if (err.message === "HF_UPLOAD_PAYLOAD_TOO_LARGE" || err.message === "payload_too_large") {
      return WORKSHEET_UI_HE.coloringUploadPayloadTooLarge;
    }
    if (err.message === "OPENCV_INIT_TIMEOUT" || err.message === "OPENCV_INIT_FAILED") {
      return WORKSHEET_UI_HE.coloringUploadEngineFailed;
    }
    if (err.message === "BAD_RESULT") return WORKSHEET_UI_HE.coloringUploadBadResult;
  }
  return WORKSHEET_UI_HE.coloringUploadProcessFailed;
}
