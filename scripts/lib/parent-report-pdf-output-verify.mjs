/**
 * PDF / print-output verification — PASS or explicit FAIL (never silent skip).
 */

import assert from "node:assert/strict";

/**
 * @param {Buffer|Uint8Array} buf
 * @returns {Promise<{ text: string; method: string }>}
 */
export async function extractPdfTextFromBuffer(buf) {
  const data = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let lastErr = null;

  try {
    const mod = await import("pdf-parse");
    const fn = mod.default || mod;
    if (typeof fn === "function") {
      const parsed = await fn(data);
      const text = String(parsed?.text || "").trim();
      if (text.length >= 40) return { text, method: "pdf-parse-default" };
    }
  } catch (e) {
    lastErr = e;
  }

  try {
    const { PDFParse } = await import("pdf-parse");
    if (PDFParse) {
      const parser = new PDFParse({ data });
      try {
        const textResult = await parser.getText();
        const text = String(textResult?.text || "").trim();
        if (text.length >= 40) return { text, method: "pdf-parse-PDFParse" };
      } finally {
        await parser.destroy?.();
      }
    }
  } catch (e) {
    lastErr = e;
  }

  throw new Error(
    `PDF text extraction failed (${lastErr?.message || "no parser produced text"}). Use print DOM text fallback.`,
  );
}

/**
 * @param {string} printDomText
 * @param {string} label
 */
export function assertPrintDomIntegrity(printDomText, label) {
  const t = String(printDomText || "");
  assert.ok(t.length >= 200, `${label}: print DOM text too short (${t.length} chars)`);
  assert.ok(
    !/לאסוף עוד מידע לפני החלטה[\s\S]{0,60}367/u.test(t) && !/367[\s\S]{0,120}לאסוף עוד מידע/u.test(t),
    `${label}: must not pair high-volume (367) with collect-more-data wording`,
  );
  assert.ok(!t.includes("שאלה על הדוח"), `${label}: must not include Parent Copilot chat placeholder`);
}

/**
 * @param {{
 *   label: string;
 *   pdfBuffer?: Buffer|null;
 *   printDomText?: string|null;
 *   requirePdfBytes?: boolean;
 * }} args
 * @returns {Promise<{ pdfMethod: string|null; usedFallback: boolean }>}
 */
export async function verifyPdfOrPrintOutput(args) {
  const label = String(args.label || "pdf");
  const requirePdfBytes = args.requirePdfBytes === true;
  let pdfText = "";
  let pdfMethod = null;

  if (args.pdfBuffer && args.pdfBuffer.length > 0) {
    try {
      const extracted = await extractPdfTextFromBuffer(args.pdfBuffer);
      pdfText = extracted.text;
      pdfMethod = extracted.method;
      assertPrintDomIntegrity(pdfText, `${label} (pdf-bytes/${pdfMethod})`);
      return { pdfMethod, usedFallback: false };
    } catch (pdfErr) {
      if (!args.printDomText) {
        throw new Error(`${label}: PDF parse failed and no print DOM fallback — ${pdfErr.message}`);
      }
    }
  } else if (requirePdfBytes) {
    throw new Error(`${label}: PDF buffer missing (export required)`);
  }

  const dom = String(args.printDomText || "");
  if (!dom || dom.length < 200) {
    throw new Error(`${label}: no usable print DOM text for integrity check`);
  }
  assertPrintDomIntegrity(dom, `${label} (print-dom-fallback)`);
  return { pdfMethod, usedFallback: true };
}

/**
 * Collect parent-facing strings from detailed report (in-process print surrogate).
 * @param {unknown} detailed
 */
export function collectParentFacingTextBundle(detailed) {
  const parts = [];
  const es = detailed?.executiveSummary;
  if (es) {
    for (const k of [
      "headlineHe",
      "smartSummaryHe",
      "topImmediateParentActionHe",
      "strengthsSummaryHe",
      "focusSummaryHe",
    ]) {
      if (es[k]) parts.push(String(es[k]));
    }
    for (const k of ["topStrengthsAcrossHe", "topFocusAreasHe"]) {
      if (Array.isArray(es[k])) parts.push(...es[k].map(String));
    }
  }
  for (const sp of detailed?.subjectProfiles || []) {
    for (const row of sp?.topicOverviewRows || []) {
      parts.push(String(row.narrativeTitleHe || row.labelHe || row.displayName || ""));
      parts.push(String(row.overviewStatusHe || ""));
      parts.push(String(row.gradeRelationSublineHe || ""));
    }
    for (const tr of sp?.topicRecommendations || []) {
      parts.push(String(tr.narrativeTitleHe || tr.displayName || ""));
      parts.push(String(tr.gradeRelationSublineHe || ""));
      parts.push(String(tr.recommendedStepLabelHe || ""));
      const slots = tr?.contractsV1?.narrative?.textSlots;
      if (slots) {
        for (const s of Object.values(slots)) parts.push(String(s || ""));
      }
    }
    for (const r of [...(sp?.topStrengths || []), ...(sp?.topWeaknesses || [])]) {
      parts.push(String(r.displayName || r.labelHe || ""));
      parts.push(String(r.summaryHe || r.observationHe || ""));
    }
  }
  const hp = detailed?.homePlan?.itemsHe;
  if (Array.isArray(hp)) parts.push(...hp.map(String));
  return parts.filter(Boolean).join("\n");
}

export default {
  extractPdfTextFromBuffer,
  assertPrintDomIntegrity,
  verifyPdfOrPrintOutput,
  collectParentFacingTextBundle,
};
