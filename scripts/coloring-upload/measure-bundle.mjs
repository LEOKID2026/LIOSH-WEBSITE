import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const opencv = path.join(ROOT, "public/wasm/opencv/opencv.js");
const nextStatic = path.join(ROOT, ".next/static");

function dirSizeBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(p);
    else total += fs.statSync(p).size;
  }
  return total;
}

const opencvBytes = fs.existsSync(opencv) ? fs.statSync(opencv).size : 0;
const staticBytes = dirSizeBytes(nextStatic);

console.log(
  JSON.stringify(
    {
      opencvJsBytes: opencvBytes,
      opencvJsMiB: +(opencvBytes / (1024 * 1024)).toFixed(2),
      nextStaticTotalMiB: +(staticBytes / (1024 * 1024)).toFixed(2),
      note: "OpenCV/heic2any load lazy on upload tab only — not in initial HTML bundle",
    },
    null,
    2
  )
);
