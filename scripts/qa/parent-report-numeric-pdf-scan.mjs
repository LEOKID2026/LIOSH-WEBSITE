#!/usr/bin/env node
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const matrixRoot = path.join(ROOT, "docs/qa/_artifacts/diagnostic-flags-pdf-comparison-matrix");
const afterDir = path.join(ROOT, "docs/qa/_artifacts/parent-report-numeric-sanity/after");

const scenarios = ["AAA4", "GATE-LOW", "SUBSKILL-FOCUS", "SUBSKILL-CONFLICT", "PROMOTE-STRONG"];
const modes = ["A", "B", "C", "D"];
const badPatterns = [/30602/, /5881/, /13141/, /36483/, /24902/];

async function parsePdfText(buf) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf });
  const textResult = await parser.getText();
  await parser.destroy?.();
  return String(textResult?.text || "");
}

async function main() {
  await mkdir(afterDir, { recursive: true });
  await mkdir(path.join(afterDir, "all-pdfs"), { recursive: true });

  const badPatternHits = [];
  const over300 = [];
  const insufficientSessions = [];
  const gateLowModeC = { minutes: [] };
  const subskillFocusModeC = { minutes: [] };

  for (const sc of scenarios) {
    for (const m of modes) {
      const pdfPath = path.join(matrixRoot, sc, `mode-${m}.pdf`);
      const text = await parsePdfText(await readFile(pdfPath));
      for (const re of badPatterns) {
        if (re.test(text)) badPatternHits.push({ scenario: sc, mode: m, pattern: re.source });
      }
      for (const match of text.matchAll(/(?:^|[\s'"])(\d{1,3})\s*דק|(?:^|[\s'"])דק[\s'"]*(\d{1,3})/gm)) {
        const n = Number(match[1] || match[2]);
        if (!Number.isFinite(n) || n <= 0 || n > 300) continue;
        if (sc === "GATE-LOW" && m === "C") gateLowModeC.minutes.push(n);
        if (sc === "SUBSKILL-FOCUS" && m === "C") subskillFocusModeC.minutes.push(n);
      }
      if (/אין מספיק מפגשים/.test(text)) {
        insufficientSessions.push({ scenario: sc, mode: m });
      }
      await copyFile(pdfPath, path.join(afterDir, "all-pdfs", `${sc}-mode-${m}.pdf`));
    }
  }

  await copyFile(path.join(matrixRoot, "GATE-LOW", "mode-C.pdf"), path.join(afterDir, "GATE-LOW-mode-C.pdf"));
  await copyFile(path.join(matrixRoot, "GATE-LOW", "mode-C.png"), path.join(afterDir, "GATE-LOW-mode-C.png"));
  await copyFile(path.join(matrixRoot, "SUBSKILL-FOCUS", "mode-C.pdf"), path.join(afterDir, "SUBSKILL-FOCUS-mode-C.pdf"));
  await copyFile(path.join(matrixRoot, "SUBSKILL-FOCUS", "mode-C.png"), path.join(afterDir, "SUBSKILL-FOCUS-mode-C.png"));

  const summary = {
    scannedAt: new Date().toISOString(),
    pdfCount: scenarios.length * modes.length,
    badPatternHits,
    minutesOver300: over300,
    insufficientSessionsPhrase: insufficientSessions,
    gateLowModeCMinutes: gateLowModeC.minutes.sort((a, b) => a - b),
    subskillFocusModeCMinutes: subskillFocusModeC.minutes.sort((a, b) => a - b),
    pass: badPatternHits.length === 0 && over300.length === 0,
  };

  await writeFile(path.join(afterDir, "pdf-numeric-scan.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.pass) process.exit(1);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});
