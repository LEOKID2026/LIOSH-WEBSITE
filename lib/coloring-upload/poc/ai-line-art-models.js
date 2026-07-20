/** PoC model registry — browser-ready Transformers.js vision models. */

export const AI_LINE_ART_MODELS = {
  "depth-anything-v2-small": {
    id: "onnx-community/depth-anything-v2-small",
    task: "depth-estimation",
    label: "Depth Anything V2 Small",
    description:
      "AI depth map → structural edge lines. Closest free browser model to HED-style boundaries (Xenova/hed is not published for Transformers.js).",
    approxMb: 25,
  },
  "depth-anything-v2-small-onnx": {
    id: "onnx-community/depth-anything-v2-small-ONNX",
    task: "depth-estimation",
    label: "Depth Anything V2 Small (ONNX)",
    description: "Alternate ONNX packaging of Depth Anything V2 Small.",
    approxMb: 25,
  },
};

export const DEFAULT_AI_LINE_ART_MODEL_KEY = "depth-anything-v2-small";
