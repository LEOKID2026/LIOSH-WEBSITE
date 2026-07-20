/**
 * Style transfer presets for Replicate-backed art styles.
 */

const ADIRIK_LINEART_MODEL =
  "adirik/t2i-adapter-sdxl-lineart:a3d3e0bdeea4925a873179e55701e1091e4b4d7ddeee9a205b932d9de1d9f181";

const FLUX_KONTEXT_MODEL =
  "black-forest-labs/flux-kontext-pro:897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462";

const STYLIZED_BORDER_NEGATIVE =
  "border, frame, white border, margin, photo frame, cropped edges, padded, cropped head, cropped feet, cut off subject";

const STYLIZED_FRAMING_HINT =
  "full body shot, keep complete subject in frame, centered composition";

const COMIC_NEGATIVE =
  "pop art, halftone dots, ben-day dots, oversaturated, grainy, vintage comic, photorealistic, blurry, border, frame, white border, margin, photo frame, cropped edges, padded, cropped head, cropped feet, cut off subject";

/**
 * @param {{ prompt: string, negativePrompt?: string }} cfg
 */
function fluxEditPrompt(cfg) {
  if (!cfg.negativePrompt) return cfg.prompt;
  return `${cfg.prompt}. Avoid: ${cfg.negativePrompt}`;
}

/**
 * @param {string} prompt
 */
function withStylizedFraming(prompt) {
  return `${prompt}, ${STYLIZED_FRAMING_HINT}`;
}

/**
 * @param {Buffer} image
 * @param {string} prompt
 */
function buildFluxStyleInput(image, prompt) {
  return {
    input_image: image,
    prompt: fluxEditPrompt({
      prompt: withStylizedFraming(prompt),
      negativePrompt: STYLIZED_BORDER_NEGATIVE,
    }),
    aspect_ratio: "match_input_image",
    output_format: "png",
    safety_tolerance: 2,
    seed: 42,
  };
}

/** @type {Record<string, { model: string, buildInput: (image: Buffer) => object }>} */
export const REPLICATE_STYLE_CONFIGS = {
  comic: {
    model: ADIRIK_LINEART_MODEL,
    buildInput: (image) => ({
      image,
      prompt: withStylizedFraming(
        "modern graphic novel comic illustration, marvel comic style, preserve full image composition, full bleed, edge-to-edge illustration, clean bold ink outlines, dynamic vibrant shading, professional digital art"
      ),
      negative_prompt: COMIC_NEGATIVE,
      prompt_strength: 0.88,
      num_inference_steps: 30,
      guidance_scale: 8,
      seed: 42,
    }),
  },
  pencil: {
    model: FLUX_KONTEXT_MODEL,
    buildInput: (image) =>
      buildFluxStyleInput(
        image,
        "colored pencil sketch of the full image, wide shot, preserve full composition and all people/background, artistic illustration, textured paper effect, full bleed, edge-to-edge illustration"
      ),
  },
  poster: {
    model: FLUX_KONTEXT_MODEL,
    buildInput: (image) =>
      buildFluxStyleInput(
        image,
        "vector poster art, full scene illustration, minimal shading, clean flat shapes, stylish typography-free design, full bleed, edge-to-edge illustration"
      ),
  },
  pixar: {
    model: FLUX_KONTEXT_MODEL,
    buildInput: (image) =>
      buildFluxStyleInput(
        image,
        "3D animated movie character style, Pixar concept art, cute smooth rendering, soft cinematic lighting, detailed, vibrant, full bleed, edge-to-edge illustration"
      ),
  },
  watercolor: {
    model: FLUX_KONTEXT_MODEL,
    buildInput: (image) =>
      buildFluxStyleInput(
        image,
        "soft watercolor painting, artistic water splashes, delicate brush strokes, vibrant watercolor texture on paper, elegant illustration, full bleed, edge-to-edge"
      ),
  },
  anime: {
    model: FLUX_KONTEXT_MODEL,
    buildInput: (image) =>
      buildFluxStyleInput(
        image,
        "Studio Ghibli anime style, hand-drawn anime illustration, warm soft lighting, whimsical storybook aesthetic, detailed background, full bleed, edge-to-edge"
      ),
  },
  storybook: {
    model: FLUX_KONTEXT_MODEL,
    buildInput: (image) =>
      buildFluxStyleInput(
        image,
        "children's storybook illustration, whimsical gouache painting, cute and charming, rich textures, cozy fairytale vibe, full bleed, edge-to-edge"
      ),
  },
  pixel: {
    model: FLUX_KONTEXT_MODEL,
    buildInput: (image) =>
      buildFluxStyleInput(
        image,
        "16-bit pixel art, video game character sprite, vibrant colors, detailed retro pixelated style, full bleed, edge-to-edge"
      ),
  },
};
