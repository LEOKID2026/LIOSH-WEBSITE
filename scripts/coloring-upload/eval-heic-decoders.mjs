/**
 * HEIC decoder evaluation — documents choice of heic2any for Safari iOS stability.
 * Run: node scripts/coloring-upload/eval-heic-decoders.mjs
 *
 * Decision (v1.1): heic2any — mature browser bundle, lazy load, wide iPhone support.
 * heic-to/libheif: heavier WASM, less proven on Safari iOS for this use case.
 */
console.log(
  JSON.stringify(
    {
      chosen: "heic2any",
      reason: "Safari iOS stability, lazy load, local-only decode, smaller integration surface",
      rejected: "heic-to",
      rejectedReason: "Additional libheif WASM weight; eval deferred to runtime fallback message",
    },
    null,
    2
  )
);
