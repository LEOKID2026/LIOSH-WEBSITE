function normalizeText(text) {
  if (text == null) return "";
  return String(text).replace(/\s+/g, " ").trim();
}

/** Child-friendly verbal question color (prose / reading stems). */
export const LEARNING_VERBAL_QUESTION_COLOR = "#173F5F";

/** Verbal question hierarchy — instruction / passage / final question. */
export const VERBAL_INSTRUCTION_COLOR = "#0F766E";
export const VERBAL_PASSAGE_COLOR = "#4338CA";
export const VERBAL_FINAL_QUESTION_COLOR = "#C2410C";
export const VERBAL_FINAL_QUESTION_PANEL_BG = "#FFF3E8";
export const VERBAL_FINAL_QUESTION_PANEL_BORDER = "#FDBA74";
export const VERBAL_PASSAGE_MAX_WIDTH = "92%";

/**
 * Visible character count for verbal stems — strips HTML, collapses whitespace.
 * @param {string} text
 */
export function measureVisibleQuestionTextLength(text) {
  const withoutTags = String(text ?? "").replace(/<[^>]+>/g, " ");
  return normalizeText(withoutTags).length;
}

/**
 * Mobile verbal question font size by visible length (18–22px).
 * @param {number} charCount
 */
export function getVerbalQuestionMobileFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  if (n <= 70) return 22;
  if (n <= 130) return 20;
  return 18;
}

/** Mobile instruction tier — secondary (15–16px). */
export function getVerbalInstructionMobileFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  return n <= 20 ? 16 : 15;
}

/** Mobile reading passage tier — primary (22–26px). */
export function getVerbalPassageMobileFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  if (n <= 110) return 26;
  if (n <= 190) return 24;
  return 22;
}

/** Mobile final question tier (20–21px). */
export function getVerbalFinalQuestionMobileFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  return n <= 70 ? 21 : 20;
}

/** Desktop instruction tier — subdued (17–18px). */
export function getVerbalInstructionDesktopFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  return n <= 24 ? 18 : 17;
}

/** Desktop reading passage tier — primary content (24–28px). */
export function getVerbalPassageDesktopFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  if (n <= 110) return 28;
  if (n <= 190) return 26;
  return 24;
}

/** Desktop final question tier (27–30px). */
export function getVerbalFinalQuestionDesktopFontSizePx(charCount) {
  const n = Math.max(0, Number(charCount) || 0);
  return n <= 90 ? 30 : 27;
}

/**
 * Hierarchy colors on bright stems; null preserves theme color on classic white text.
 * @param {"instruction" | "passage" | "finalQuestion"} tier
 * @param {string} className
 */
export function resolveVerbalHierarchyColor(tier, _className = "") {
  if (tier === "instruction") return VERBAL_INSTRUCTION_COLOR;
  if (tier === "passage") return VERBAL_PASSAGE_COLOR;
  if (tier === "finalQuestion") return VERBAL_FINAL_QUESTION_COLOR;
  return LEARNING_VERBAL_QUESTION_COLOR;
}

/** @param {string} text */
export function textPreservesLineBreaks(text) {
  return /[\r\n]/.test(String(text ?? ""));
}

/**
 * @param {{ text?: string, isMobileViewport?: boolean, color?: string|null, className?: string }} opts
 */
export function getVerbalInstructionStyle({
  text,
  isMobileViewport = false,
  color,
  className = "",
} = {}) {
  const charCount = measureVisibleQuestionTextLength(text);
  const style = {
    fontWeight: 700,
    lineHeight: 1.4,
  };
  const resolved =
    color === undefined
      ? resolveVerbalHierarchyColor("instruction", className)
      : color;
  if (resolved) style.color = resolved;
  if (isMobileViewport) {
    style.fontSize = `${getVerbalInstructionMobileFontSizePx(charCount)}px`;
  } else {
    style.fontSize = `${getVerbalInstructionDesktopFontSizePx(charCount)}px`;
  }
  return style;
}

/**
 * @param {{ text?: string, isMobileViewport?: boolean, color?: string|null, className?: string }} opts
 */
export function getVerbalPassageStyle({
  text,
  isMobileViewport = false,
  color,
  className = "",
} = {}) {
  const charCount = measureVisibleQuestionTextLength(text);
  const style = {
    fontWeight: 700,
    lineHeight: 1.45,
    maxWidth: VERBAL_PASSAGE_MAX_WIDTH,
    width: "100%",
    marginInline: "auto",
  };
  const resolved =
    color === undefined ? resolveVerbalHierarchyColor("passage", className) : color;
  if (resolved) style.color = resolved;
  if (textPreservesLineBreaks(text)) {
    style.whiteSpace = "pre-wrap";
  }
  if (isMobileViewport) {
    style.fontSize = `${getVerbalPassageMobileFontSizePx(charCount)}px`;
  } else {
    style.fontSize = `${getVerbalPassageDesktopFontSizePx(charCount)}px`;
  }
  return style;
}

/**
 * Panel wrapper class for the final verbal question (orange callout).
 */
export function getVerbalFinalQuestionPanelClassName() {
  return "inline-block w-fit max-w-[92%] mx-auto rounded-xl border px-3 py-2.5 md:px-4 md:py-3 text-center break-words overflow-wrap-anywhere";
}

/** Inline styles for the final question panel shell. */
export function getVerbalFinalQuestionPanelStyle() {
  return {
    backgroundColor: VERBAL_FINAL_QUESTION_PANEL_BG,
    borderColor: VERBAL_FINAL_QUESTION_PANEL_BORDER,
  };
}

/**
 * @param {{ text?: string, isMobileViewport?: boolean, color?: string|null, className?: string }} opts
 */
export function getVerbalFinalQuestionStyle({
  text,
  isMobileViewport = false,
  color,
  className = "",
} = {}) {
  const charCount = measureVisibleQuestionTextLength(text);
  const style = {
    fontWeight: 800,
    lineHeight: 1.4,
  };
  const resolved =
    color === undefined
      ? resolveVerbalHierarchyColor("finalQuestion", className)
      : color;
  if (resolved) style.color = resolved;
  if (isMobileViewport) {
    style.fontSize = `${getVerbalFinalQuestionMobileFontSizePx(charCount)}px`;
  } else {
    style.fontSize = `${getVerbalFinalQuestionDesktopFontSizePx(charCount)}px`;
  }
  return style;
}

/**
 * Single verbal block (no reading passage split).
 * @param {{ text?: string, isMobileViewport?: boolean, color?: string|null, className?: string }} opts
 */
export function getVerbalSingleStyle({
  text,
  isMobileViewport = false,
  color,
  className = "",
} = {}) {
  const charCount = measureVisibleQuestionTextLength(text);
  const style = {
    fontWeight: 700,
    lineHeight: 1.5,
  };
  const resolved =
    color === undefined ? resolveVerbalQuestionTextColor(className) : color;
  if (resolved) style.color = resolved;
  if (isMobileViewport) {
    style.fontSize = `${getVerbalQuestionMobileFontSizePx(charCount)}px`;
  }
  return style;
}

/**
 * Style for verbal question / reading prose (not equations or numeric formulas).
 * Desktop: color, weight, line-height only. Mobile: also length-based font size.
 * @param {{ text?: string, isMobileViewport?: boolean, color?: string|null }} opts
 */
export function getVerbalQuestionProseStyle({
  text,
  isMobileViewport = false,
  color = LEARNING_VERBAL_QUESTION_COLOR,
} = {}) {
  const charCount = measureVisibleQuestionTextLength(text);
  const style = {
    fontWeight: 700,
    lineHeight: 1.5,
  };
  if (color) {
    style.color = color;
  }
  if (isMobileViewport) {
    style.fontSize = `${getVerbalQuestionMobileFontSizePx(charCount)}px`;
  }
  return style;
}

/** Use #173F5F on bright stems; keep theme color on classic white-text surfaces. */
export function resolveVerbalQuestionTextColor(className = "") {
  const c = String(className);
  if (/\btext-white\b/.test(c) && !/\btext-slate-\d/.test(c)) {
    return null;
  }
  return LEARNING_VERBAL_QUESTION_COLOR;
}

/** @param {"text" | "equation" | "mixed" | string} bodyKind */
export function isVerbalQuestionBodyKind(bodyKind) {
  return bodyKind === "text";
}

function computePressure(text) {
  const normalized = normalizeText(text);
  if (!normalized) return 0;

  const charCount = normalized.length;
  const words = normalized.split(" ").filter(Boolean);
  const wordCount = words.length;
  const longWordCount = words.filter((w) => w.length >= 10).length;
  const symbolCount = (normalized.match(/[=+\-*/÷×√()<>]/g) || []).length;

  return charCount + wordCount * 1.5 + longWordCount * 3 + symbolCount * 0.7;
}

function pickViewportScale(pressure) {
  if (pressure <= 20) return 10.6;
  if (pressure <= 36) return 9.3;
  if (pressure <= 58) return 8.1;
  if (pressure <= 84) return 7.1;
  return 6.2;
}

/** Compact sizing for numeric exercises — avoids oversized vw on short stems. */
export function getCompactEquationFontStyle({
  text,
  mobileMinPx = 16,
  mobileMaxPx = 28,
} = {}) {
  const pressure = computePressure(text);
  const vw = Math.min(5.2, pickViewportScale(pressure) * 0.52);

  return {
    fontSize: `clamp(${mobileMinPx}px, ${vw.toFixed(2)}vw, ${mobileMaxPx}px)`,
    lineHeight: 1.22,
    letterSpacing: "normal",
    wordSpacing: "normal",
    wordBreak: "normal",
    overflowWrap: "normal",
  };
}

export function getQuestionFontStyle({
  text,
  kind = "main",
  mobileMinPx = 22,
  mobileMaxPx = 42,
  vwScale = 1,
  maxVw,
} = {}) {
  const pressure = computePressure(text);
  const baseVw = pickViewportScale(pressure);

  const minPx = kind === "label" ? 16 : mobileMinPx;
  const maxPx = kind === "label" ? 30 : mobileMaxPx;
  const rawVw = kind === "label" ? Math.max(5.0, baseVw - 2.2) : baseVw;
  const scaledVw = rawVw * vwScale;
  const vw = maxVw != null ? Math.min(scaledVw, maxVw) : scaledVw;

  return {
    fontSize: `clamp(${minPx}px, ${vw.toFixed(2)}vw, ${maxPx}px)`,
    lineHeight: pressure > 70 ? 1.28 : 1.2,
    wordBreak: "break-word",
    overflowWrap: "break-word",
  };
}
