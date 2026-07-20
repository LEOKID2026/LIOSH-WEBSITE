/**
 * Client helpers for writing trace rendering.
 * @module lib/writing/writing-trace-render
 */

import { resolveWritingTraceAssetUrl } from "./writing-trace-asset-resolver.js";
import { isEnglishLetter, isHebrewLetter } from "./writing-constants.js";

/**
 * @param {string} char
 * @param {"print" | "script"} scriptStyle
 * @param {"he" | "en" | "mixed"} [language]
 * @returns {"he-print" | "he-script" | "en-upper" | "en-lower" | "digits" | null}
 */
export function glyphGroupForChar(char, scriptStyle, language = "he") {
  const ch = String(char || "");
  if (/^\d$/.test(ch)) return "digits";
  if (/^[A-Z]$/.test(ch)) return "en-upper";
  if (/^[a-z]$/.test(ch)) return "en-lower";
  if (isHebrewLetter(ch)) {
    return scriptStyle === "script" ? "he-script" : "he-print";
  }
  if (isEnglishLetter(ch)) {
    return ch === ch.toUpperCase() ? "en-upper" : "en-lower";
  }
  return null;
}

/**
 * @param {string} char
 * @param {"print" | "script"} scriptStyle
 * @param {"he" | "en" | "mixed"} [language]
 * @returns {string | null}
 */
export function fullTraceAssetForChar(char, scriptStyle, language = "he") {
  const lang = language === "en" ? "en" : "he";
  try {
    return resolveWritingTraceAssetUrl({
      language: lang,
      scriptStyle,
      character: char,
      traceRenderMode: "full_trace",
    });
  } catch {
    return null;
  }
}

/** Hebrew nikud / combining marks — render with preceding letter. */
export function isHebrewNikud(char) {
  return /[\u0591-\u05BD\u05BF-\u05C7]/.test(String(char || ""));
}

/**
 * Split word into trace segments (letter + optional nikud cluster).
 * @param {string} text
 * @returns {Array<{ type: "space" | "char", value: string }>}
 */
export function wordTraceSegments(text) {
  /** @type {Array<{ type: "space" | "char", value: string }>} */
  const out = [];
  const chars = [...String(text || "")];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (/\s/.test(ch)) {
      out.push({ type: "space", value: ch });
      continue;
    }
    let cluster = ch;
    while (i + 1 < chars.length && isHebrewNikud(chars[i + 1])) {
      i += 1;
      cluster += chars[i];
    }
    out.push({ type: "char", value: cluster });
  }
  return out;
}

/**
 * Base letter for asset lookup (strip nikud).
 * @param {string} cluster
 */
export function baseLetterForAsset(cluster) {
  const base = [...cluster].find((c) => !isHebrewNikud(c));
  return base || cluster.charAt(0);
}
