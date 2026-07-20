import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tests = [
  "presets.test.mjs",
  "progress-weights.test.mjs",
  "subject-mask.test.mjs",
  "depth-to-line-art.test.mjs",
  "hf-lineart.test.mjs",
  "coloring-upload-quota-window.test.mjs",
  "hf-lineart-api-validation.test.mjs",
  "style-transfer-api-validation.test.mjs",
  "replicate-style-transfer.test.mjs",
  "stylized-full-bleed.test.mjs",
  "quality-metrics.test.mjs",
  "input-validation.test.mjs",
  "a4-layout.test.mjs",
];

let failed = 0;
for (const file of tests) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], {
    stdio: "inherit",
    cwd: path.join(__dirname, "../.."),
  });
  if (r.status !== 0) failed += 1;
}
process.exit(failed ? 1 : 0);
