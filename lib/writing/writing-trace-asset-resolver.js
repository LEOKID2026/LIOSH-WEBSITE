/**
 * Single resolver for public writing trace/outline/stroke asset URLs.
 * @module lib/writing/writing-trace-asset-resolver
 */

import { glyphAssetSlug } from "./glyph-asset-slugs.js";
import { isEnglishLetter, isHebrewLetter } from "./writing-constants.js";

const ASSET_ROOT = "/assets/writing";

/** Bump when trace/outline/stroke-path SVG bytes change (cache bust for fetch). */
export const WRITING_TRACE_ASSET_VERSION = "writing-trace-hebrew-print-v4";

/**
 * @param {string | null | undefined} url
 * @returns {string | null | undefined}
 */
export function withWritingTraceAssetVersion(url) {
  if (!url || typeof url !== "string") return url;
  if (url.includes(`v=${WRITING_TRACE_ASSET_VERSION}`)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${WRITING_TRACE_ASSET_VERSION}`;
}

/**
 * @param {{
 *   character: string,
 *   scriptStyle?: "print" | "script",
 *   language?: "he" | "en" | "mixed",
 * }} params
 * @returns {"he-print" | "he-script" | "en-upper" | "en-lower" | "digits"}
 */
export function resolveWritingGlyphGroup({ character, scriptStyle = "print", language = "he" }) {
  const ch = String(character || "").trim();
  if (/^\d$/.test(ch)) return "digits";
  if (/^[A-Z]$/.test(ch)) return "en-upper";
  if (/^[a-z]$/.test(ch)) return "en-lower";
  if (isHebrewLetter(ch)) {
    return scriptStyle === "script" ? "he-script" : "he-print";
  }
  if (isEnglishLetter(ch)) {
    return ch === ch.toUpperCase() ? "en-upper" : "en-lower";
  }
  if (language === "en") {
    return ch === ch.toUpperCase() ? "en-upper" : "en-lower";
  }
  throw new Error(`resolveWritingGlyphGroup: unsupported character "${ch}"`);
}

/**
 * @param {{
 *   language: "he" | "en" | "mixed",
 *   scriptStyle: "print" | "script",
 *   character: string,
 *   traceRenderMode: import("./writing-worksheet-types.js").TraceRenderMode,
 * }} params
 * @returns {string | null}
 */
export function resolveWritingTraceAssetUrl({ language, scriptStyle, character, traceRenderMode }) {
  if (!traceRenderMode || traceRenderMode === "faint_model") return null;

  /** @type {Record<string, string>} */
  const kindByMode = {
    full_trace: "full-trace",
    outline: "outline",
    stroke_path: "stroke-path",
  };
  const kind = kindByMode[traceRenderMode];
  if (!kind) return null;

  const lang = language === "en" ? "en" : "he";
  const group = resolveWritingGlyphGroup({ character, scriptStyle, language: lang });
  const slug = glyphAssetSlug(character);
  return withWritingTraceAssetVersion(`${ASSET_ROOT}/${kind}/${group}/${slug}.svg`);
}

/**
 * @param {{
 *   language?: "he" | "en" | "mixed",
 *   scriptStyle?: "print" | "script",
 *   character: string,
 *   group?: "he-print" | "he-script" | "en-upper" | "en-lower" | "digits",
 * }} params
 * @returns {string}
 */
export function resolveWritingStrokeOrderAssetUrl({ language = "he", scriptStyle = "print", character, group }) {
  const lang = language === "en" ? "en" : "he";
  const resolvedGroup = group || resolveWritingGlyphGroup({ character, scriptStyle, language: lang });
  const slug = glyphAssetSlug(character);
  return `${ASSET_ROOT}/stroke-order/${resolvedGroup}/${slug}.json`;
}

/**
 * Resolve a stored svgAssetId to a canonical public URL (guards legacy encoded paths).
 * @param {string | undefined} svgAssetId
 * @param {{
 *   language?: "he" | "en" | "mixed",
 *   scriptStyle?: "print" | "script",
 *   character?: string,
 *   traceRenderMode?: import("./writing-worksheet-types.js").TraceRenderMode,
 * }} fallback
 * @returns {string | null}
 */
export function resolveWritingSvgAssetUrl(svgAssetId, fallback = {}) {
  if (
    fallback.character &&
    fallback.traceRenderMode &&
    fallback.traceRenderMode !== "faint_model"
  ) {
    return resolveWritingTraceAssetUrl({
      language: fallback.language || "he",
      scriptStyle: fallback.scriptStyle || "print",
      character: fallback.character,
      traceRenderMode: fallback.traceRenderMode,
    });
  }
  if (!svgAssetId || typeof svgAssetId !== "string") return null;
  if (/%[0-9A-Fa-f]{2}/.test(svgAssetId)) {
    throw new Error(`Legacy percent-encoded svgAssetId is not allowed: ${svgAssetId}`);
  }
  return withWritingTraceAssetVersion(svgAssetId);
}
