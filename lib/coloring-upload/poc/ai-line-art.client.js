/**
 * PoC — client-side AI line-art via @huggingface/transformers (lazy-loaded).
 */

import {
  AI_LINE_ART_MODELS,
  DEFAULT_AI_LINE_ART_MODEL_KEY,
} from "./ai-line-art-models.js";
import { depthMapToLineArt } from "./depth-to-line-art.js";

/** @type {Promise<typeof import("@huggingface/transformers")> | null} */
let transformersPromise = null;
/** @type {import("@huggingface/transformers").DepthEstimationPipeline | null} */
let activePipeline = null;
/** @type {string | null} */
let activePipelineKey = null;

function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = import("@huggingface/transformers").then((mod) => {
      mod.env.allowLocalModels = false;
      mod.env.useBrowserCache = true;
      mod.env.allowRemoteModels = true;
      return mod;
    });
  }
  return transformersPromise;
}

/**
 * @param {string} modelKey
 * @param {{
 *   device?: 'webgpu' | 'wasm',
 *   onProgress?: (phase: string, detail?: string | number) => void,
 * }} [opts]
 */
async function getDepthPipeline(modelKey, opts = {}) {
  const config = AI_LINE_ART_MODELS[modelKey] || AI_LINE_ART_MODELS[DEFAULT_AI_LINE_ART_MODEL_KEY];
  const { pipeline } = await loadTransformers();

  if (activePipeline && activePipelineKey === modelKey) {
    return { pipeline: activePipeline, config };
  }

  if (activePipeline?.dispose) {
    try {
      activePipeline.dispose();
    } catch {
      /* ignore */
    }
  }

  opts.onProgress?.("model-load", `Loading ${config.label}…`);
  const device = opts.device === "webgpu" ? "webgpu" : "wasm";
  activePipeline = await pipeline(config.task, config.id, {
    device,
    dtype: "q8",
    progress_callback: (info) => {
      if (info?.status === "progress" && typeof info.progress === "number") {
        opts.onProgress?.("model-download", Math.round(info.progress));
      } else if (info?.status) {
        opts.onProgress?.("model-status", info.status);
      }
    },
  });
  activePipelineKey = modelKey;
  return { pipeline: activePipeline, config };
}

/**
 * @param {Blob | HTMLCanvasElement | HTMLImageElement | ImageData | string} imageSource
 * @param {{
 *   modelKey?: string,
 *   device?: 'webgpu' | 'wasm',
 *   edgeThreshold?: number,
 *   onProgress?: (phase: string, detail?: string | number) => void,
 * }} [opts]
 * @returns {Promise<{ lineArt: ImageData, modelKey: string, modelId: string, depthPreview?: ImageData }>}
 */
export async function runAiLineArtPoC(imageSource, opts = {}) {
  const modelKey = opts.modelKey || DEFAULT_AI_LINE_ART_MODEL_KEY;
  const { pipeline: depthPipeline, config } = await getDepthPipeline(modelKey, opts);

  opts.onProgress?.("inference", "Running AI depth model…");
  const result = await depthPipeline(imageSource);
  const depthImage = result?.depth;
  if (!depthImage) {
    throw new Error("AI model returned no depth map");
  }

  opts.onProgress?.("postprocess", "Converting depth → line art…");
  const lineArt = depthMapToLineArt(depthImage, { edgeThreshold: opts.edgeThreshold ?? 20 });

  let depthPreview = null;
  if (typeof ImageData !== "undefined" && depthImage.toCanvas) {
    const canvas = depthImage.toCanvas();
    const ctx = canvas.getContext("2d");
    if (ctx) depthPreview = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } else if (depthImage.data) {
    const rgba = new Uint8ClampedArray(depthImage.width * depthImage.height * 4);
    for (let i = 0, j = 0; i < depthImage.data.length; i += 1, j += 4) {
      const v = depthImage.data[i];
      rgba[j] = v;
      rgba[j + 1] = v;
      rgba[j + 2] = v;
      rgba[j + 3] = 255;
    }
    depthPreview = new ImageData(rgba, depthImage.width, depthImage.height);
  }

  return {
    lineArt,
    depthPreview,
    modelKey,
    modelId: config.id,
  };
}

export function disposeAiLineArtPoC() {
  if (activePipeline?.dispose) {
    try {
      activePipeline.dispose();
    } catch {
      /* ignore */
    }
  }
  activePipeline = null;
  activePipelineKey = null;
}

export { AI_LINE_ART_MODELS, DEFAULT_AI_LINE_ART_MODEL_KEY };
