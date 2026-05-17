function normalizeText(text) {
  if (text == null) return "";
  return String(text).replace(/\s+/g, " ").trim();
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
} = {}) {
  const pressure = computePressure(text);
  const baseVw = pickViewportScale(pressure);

  const minPx = kind === "label" ? 16 : mobileMinPx;
  const maxPx = kind === "label" ? 30 : mobileMaxPx;
  const vw = kind === "label" ? Math.max(5.0, baseVw - 2.2) : baseVw;

  return {
    fontSize: `clamp(${minPx}px, ${vw.toFixed(2)}vw, ${maxPx}px)`,
    lineHeight: pressure > 70 ? 1.28 : 1.2,
    wordBreak: "break-word",
    overflowWrap: "break-word",
  };
}
