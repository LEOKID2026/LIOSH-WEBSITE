import { execSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const zip = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly-realistic/pdf-export/parent-report-q2e-monthly-realistic-pdfs.zip");
const tmp = await mkdtemp(path.join(os.tmpdir(), "zipx-"));
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
  { stdio: "pipe" }
);

for (const student of ["AAA1", "AAA2"]) {
  const pdf = path.join(tmp, student, `${student}_2026-04_short-report.pdf`);
  const buf = await readFile(pdf);
  const parser = new PDFParse({ data: buf });
  const t = await parser.getText();
  await parser.destroy?.();
  const text = String(t?.text || "");
  const idx = text.indexOf("זמן כולל");
  console.log(`\n=== ${student} bytes=${buf.length} ===`);
  console.log("83 count:", (text.match(/\b83\b/g) || []).length);
  console.log("42 count:", (text.match(/\b42\b/g) || []).length);
  console.log("240 count:", (text.match(/\b240\b/g) || []).length);
  console.log("336 count:", (text.match(/\b336\b/g) || []).length);
  console.log("inactivity:", text.includes("לא הייתה פעילות לאחרונה"));
  console.log("around זמן כולל:", text.slice(Math.max(0, idx - 30), idx + 180).replace(/\s+/g, " "));
  console.log("first 500:", text.slice(0, 500).replace(/\s+/g, " "));
}

await rm(tmp, { recursive: true, force: true });
