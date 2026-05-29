/**
 * Centralized Hebrew/RTL helpers for teacher activity report PDF (jsPDF + autotable).
 * All visible PDF text must pass through these helpers — do not scatter RTL/font fixes.
 */

export const HEBREW_FONT_URL = "/fonts/NotoSansHebrew-Regular.ttf";
export const HEBREW_FONT_FILE = "NotoSansHebrew-Regular.ttf";
export const HEBREW_FONT_FAMILY = "NotoSansHebrew";

/** Teacher PDF export disabled — v1 jsPDF layout not product-ready. See docs/activity-reports/TEACHER_PDF_V2_REDESIGN_PLAN.md */
export const TEACHER_ACTIVITY_PDF_EXPORT_ENABLED = false;

let cachedHebrewFontBase64 = null;

/**
 * Normalize a cell value for PDF output (logical Hebrew order — no manual reversal).
 * @param {unknown} value
 */
export function formatPdfTextHe(value) {
  if (value == null || value === "") return "";
  return String(value);
}

/**
 * @param {unknown} value
 */
export function formatPdfCellHe(value) {
  return formatPdfTextHe(value);
}

/**
 * @param {Array<Array<unknown>>|null|undefined} rows
 */
export function formatPdfRowsHe(rows) {
  return (rows || []).map((row) => row.map((cell) => formatPdfCellHe(cell)));
}

/**
 * @param {Array<[unknown, unknown]>|null|undefined} kv
 */
export function formatPdfKvHe(kv) {
  return (kv || []).map(([label, value]) => [formatPdfCellHe(label), formatPdfCellHe(value)]);
}

/**
 * Load Hebrew font bytes as base64 (browser fetch or Node fs via injectable loader).
 * @param {{ readFontBase64?: () => Promise<string>|string }|null|undefined} [options]
 */
export async function loadHebrewPdfFontBase64(options = {}) {
  if (cachedHebrewFontBase64) return cachedHebrewFontBase64;

  if (options.readFontBase64) {
    cachedHebrewFontBase64 = await options.readFontBase64();
    return cachedHebrewFontBase64;
  }

  if (typeof window !== "undefined") {
    const res = await fetch(HEBREW_FONT_URL);
    if (!res.ok) {
      throw new Error("teacher_pdf_font_load_failed");
    }
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    cachedHebrewFontBase64 = btoa(binary);
    return cachedHebrewFontBase64;
  }

  throw new Error("teacher_pdf_font_loader_required");
}

/**
 * Register Noto Sans Hebrew and enable jsPDF RTL mode.
 * Requires setR2L(true) — jsPDF renders logical Hebrew LTR without it (reversed words).
 *
 * @param {import("jspdf").jsPDF} doc
 * @param {{ readFontBase64?: () => Promise<string>|string }|null|undefined} [options]
 */
export async function applyHebrewPdfDocumentSetup(doc, options = {}) {
  const fontB64 = await loadHebrewPdfFontBase64(options);
  doc.addFileToVFS(HEBREW_FONT_FILE, fontB64);
  doc.addFont(HEBREW_FONT_FILE, HEBREW_FONT_FAMILY, "normal");
  applyPdfHebrewContext(doc);
}

/**
 * Re-apply font + RTL on the active page (call after addPage and in autotable hooks).
 * @param {import("jspdf").jsPDF} doc
 */
export function applyPdfHebrewContext(doc) {
  doc.setFont(HEBREW_FONT_FAMILY, "normal");
  doc.setR2L(true);
}

/** Shared autotable styles — fontStyle must stay "normal" (bold variant is not embedded). */
export const PDF_AUTOTABLE_STYLES_HE = {
  font: HEBREW_FONT_FAMILY,
  fontStyle: "normal",
  fontSize: 9,
  halign: "right",
  cellPadding: 1.5,
  overflow: "linebreak",
};

export const PDF_AUTOTABLE_HEAD_STYLES_HE = {
  font: HEBREW_FONT_FAMILY,
  fontStyle: "normal",
  halign: "right",
  fillColor: [240, 240, 240],
  textColor: 20,
};

export const PDF_AUTOTABLE_BODY_STYLES_HE = {
  font: HEBREW_FONT_FAMILY,
  fontStyle: "normal",
};

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [textOptions]
 */
export function writePdfTextHe(doc, text, x, y, textOptions = {}) {
  applyPdfHebrewContext(doc);
  doc.text(formatPdfTextHe(text), x, y, textOptions);
}

/**
 * Default autotable hook — keeps RTL/font on every page autotable creates.
 * @param {import("jspdf").jsPDF} doc
 */
export function pdfAutotableDidDrawPageHe(doc) {
  applyPdfHebrewContext(doc);
}

/**
 * Reset font cache (tests only).
 */
export function resetHebrewPdfFontCacheForTests() {
  cachedHebrewFontBase64 = null;
}
