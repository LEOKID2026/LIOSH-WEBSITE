/**
 * Style transfer presets for Replicate-backed art styles.
 */

const FLUX_KONTEXT_MODEL =
  "black-forest-labs/flux-kontext-pro:897a70f5a7dbd8a0611413b3b98cf417b45f266bd595c571a22947619d9ae462";

const STYLIZED_BORDER_NEGATIVE =
  "border, frame, white border, margin, photo frame, cropped edges, padded, cropped head, cropped feet, cut off subject, outpainting, expanded background, full body generation, extra legs, extra limbs, changed composition, zoomed out";

const STYLIZED_FRAMING_HINT =
  "maintain exact original image composition and crop, tight framing, preserve original subject boundaries, do not extend body or add missing limbs";

const IDENTITY_HINT =
  "preserving exact face, age, expression and identity of the child from the photo";

const COMIC_NEGATIVE = [
  STYLIZED_BORDER_NEGATIVE,
  "oversaturated colors",
  "neon skin",
  "yellow skin",
  "harsh halftone dots",
  "ben-day dots",
  "excessive noise",
  "ugly face distortion",
  "deep black shadows",
].join(", ");

/** @type {Record<string, string>} */
const FLUX_STYLE_PROMPTS = {
  comic:
    "modern comic book graphic novel style illustration, clean ink linework, natural soft skin tones, realistic vibrant lighting, subtle comic shading, clean background, high quality superhero comic art style",
  pencil:
    "colored pencil sketch, preserve exact crop and all visible people/background, artistic illustration, textured paper effect, full bleed, edge-to-edge illustration",
  anime:
    "Studio Ghibli anime style, hand-drawn anime illustration, warm soft lighting, whimsical storybook aesthetic, detailed background, full bleed, edge-to-edge",
  pixar:
    "3D animated movie character style, Pixar concept art, cute smooth rendering, soft cinematic lighting, detailed, vibrant, full bleed, edge-to-edge illustration",
};

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
  return `${prompt}, ${STYLIZED_FRAMING_HINT}, ${IDENTITY_HINT}`;
}

/**
 * @param {Buffer} image
 * @param {string} prompt
 * @param {string} [negativePrompt]
 */
function buildFluxStyleInput(image, prompt, negativePrompt = STYLIZED_BORDER_NEGATIVE) {
  return {
    input_image: image,
    prompt: fluxEditPrompt({
      prompt: withStylizedFraming(prompt),
      negativePrompt,
    }),
    aspect_ratio: "match_input_image",
    output_format: "png",
    safety_tolerance: 2,
    seed: 42,
  };
}

/** @type {Record<string, { model: string, buildInput: (image: Buffer) => object }>} */
export const REPLICATE_STYLE_CONFIGS = Object.fromEntries(
  Object.entries(FLUX_STYLE_PROMPTS).map(([styleId, prompt]) => [
    styleId,
    {
      model: FLUX_KONTEXT_MODEL,
      buildInput: (image) =>
        buildFluxStyleInput(image, prompt, styleId === "comic" ? COMIC_NEGATIVE : STYLIZED_BORDER_NEGATIVE),
    },
  ])
);
