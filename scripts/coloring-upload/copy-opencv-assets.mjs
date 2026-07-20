import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = path.join(ROOT, "node_modules/@techstark/opencv-js/dist/opencv.js");
const destDir = path.join(ROOT, "public/wasm/opencv");
const dest = path.join(destDir, "opencv.js");

if (!fs.existsSync(src)) {
  console.error("opencv.js not found in node_modules");
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(JSON.stringify({ ok: true, dest, bytes: fs.statSync(dest).size }));
