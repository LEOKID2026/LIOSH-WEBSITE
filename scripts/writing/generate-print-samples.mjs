/**
 * Generate representative A4 print sample payloads for visual QA.
 * Run: node scripts/writing/generate-print-samples.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getReadyWritingBySlug } from "../../lib/writing/writing-ready-catalog.js";
import {
  buildReadyWritingPayload,
  buildWritingPayloadFromRequest,
} from "../../lib/writing/writing-payload-build.server.js";
import { WRITING_REQUEST_DEFAULTS } from "../../lib/writing/writing-worksheet-types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "docs", "audits", "writing-print-samples");

/** @type {Array<{ label: string, slug?: string, request?: Record<string, unknown> }>} */
const SAMPLES = [
  { label: "he-print-letter", slug: "writing-he-aleph-trace-standard" },
  { label: "he-script-letter", slug: "writing-he-mem-trace-script" },
  { label: "he-final-letter", slug: "writing-he-final-kaf-trace" },
  { label: "en-upper-letter", slug: "writing-en-upper-A-trace" },
  { label: "en-lower-descender", slug: "writing-en-lower-g-trace" },
  { label: "digit", slug: "writing-num-5-trace" },
  { label: "hebrew-nikud-word", slug: "writing-he-words-animals-trace" },
  {
    label: "personal-name",
    request: {
      ...WRITING_REQUEST_DEFAULTS,
      writingCategory: "personal_text",
      customText: "דני",
      customTextKind: "first_name",
      tracingMode: "trace",
      traceRenderMode: "faint_model",
      includeNameField: true,
      pageOrientation: "portrait",
    },
  },
  { label: "prewriting", slug: "writing-pre-waves" },
  { label: "mixed-page", slug: "writing-mixed-he-en-combo" },
  { label: "portrait-sample", slug: "writing-he-group-aleph-he" },
  {
    label: "landscape-sample",
    slug: "writing-en-group-all-upper",
    requestOverride: { pageOrientation: "landscape" },
  },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

/** @type {Array<Record<string, unknown>>} */
const results = [];

for (const sample of SAMPLES) {
  try {
    let payload;
    if (sample.slug) {
      const entry = getReadyWritingBySlug(sample.slug);
      if (!entry) throw new Error(`slug not found: ${sample.slug}`);
      payload = buildReadyWritingPayload(entry);
      if (sample.requestOverride?.pageOrientation) {
        payload.pages = payload.pages.map((p) => ({
          ...p,
          orientation: sample.requestOverride.pageOrientation,
        }));
      }
    } else if (sample.request) {
      payload = buildWritingPayloadFromRequest(sample.request);
    } else {
      throw new Error("missing slug or request");
    }

    const outFile = path.join(OUT_DIR, `${sample.label}.json`);
    fs.writeFileSync(
      outFile,
      JSON.stringify({ label: sample.label, slug: sample.slug || null, payload }, null, 2)
    );
    results.push({
      label: sample.label,
      slug: sample.slug || "generated",
      ok: true,
      pages: payload.pages.length,
      orientation: payload.pages[0]?.orientation || "portrait",
      outFile,
    });
  } catch (err) {
    results.push({ label: sample.label, ok: false, error: String(err?.message || err) });
  }
}

fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify({ samples: results }, null, 2));
console.log(JSON.stringify({ ok: results.every((r) => r.ok), outDir: OUT_DIR, count: results.length }, null, 2));
