/** Shared constants for local coloring upload tool. */

export const COLORING_UPLOAD_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const COLORING_UPLOAD_MAX_EDGE_PX = 4096;
export const COLORING_UPLOAD_MIN_EDGE_PX = 600;
export const COLORING_UPLOAD_PROCESS_MAX_EDGE = 1600;
export const COLORING_UPLOAD_PREVIEW_MAX_WIDTH = 620;
export const COLORING_UPLOAD_WEAK_DEVICE_MAX_EDGE = 1536;
export const COLORING_UPLOAD_CROP_MAX_EDGE = 2048;

export const OPENCV_SCRIPT_URL = "/wasm/opencv/opencv.js";

export const PROGRESS_PHASE = {
  HF_LINEART: "hf-lineart",
  STYLE_TRANSFER: "style-transfer",
  SEGMENT: "segment",
  LOAD: "load",
  PREP: "prep",
  PREPROCESS: "preprocess",
  LINES: "lines",
  METRICS: "metrics",
  OUTPUT: "output",
};

/** Alpha threshold when building the binary subject mask from segmentation output. */
export const SUBJECT_MASK_ALPHA_THRESHOLD = 128;

/** Chosen after eval — see scripts/coloring-upload/eval-heic-decoders.mjs */
export const HEIC_DECODER = "heic2any";
