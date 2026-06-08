import { execSync } from "node:child_process";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const zip = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly-realistic/pdf-export/parent-report-q2e-monthly-realistic-pdfs.zip");
const outDir = path.join(ROOT, "docs/qa/_artifacts/parent-report-q2e-monthly-realistic/pdf-export/independent-zip-verify");
await mkdir(outDir, { recursive: true });

const tmp = await mkdtemp(path.join(os.tmpdir(), "ziprender-"));
execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${tmp.replace(/'/g, "''")}' -Force"`,
  { stdio: "pipe" }
);

const pdfPath = path.join(tmp, "AAA1", "AAA1_2026-04_short-report.pdf");
const pngPath = path.join(outDir, "AAA1_short-report_page1_rendered.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
await page.goto(`file:///${pdfPath.replace(/\\/g, "/")}`, { waitUntil: "load", timeout: 60_000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: pngPath, fullPage: false });
await browser.close();
await rm(tmp, { recursive: true, force: true });
console.log("Rendered:", pngPath);
