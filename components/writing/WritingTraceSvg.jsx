/**
 * Inline SVG trace glyph — avoids broken <img> loads and print race conditions.
 */

import { useEffect, useState } from "react";
import {
  resolveWritingGlyphGroup,
  resolveWritingSvgAssetUrl,
  withWritingTraceAssetVersion,
} from "../../lib/writing/writing-trace-asset-resolver.js";
import { writingGlyphVisualScaleForGroup } from "../../lib/writing/writing-glyph-visual-scale.js";

/**
 * @param {{
 *   src: string,
 *   className?: string,
 *   character?: string,
 *   scriptStyle?: "print" | "script",
 *   language?: "he" | "en" | "mixed",
 *   traceRenderMode?: import("../../lib/writing/writing-worksheet-types.js").TraceRenderMode,
 *   mode?: "screen" | "print",
 * }} props
 */
export default function WritingTraceSvg({
  src,
  className = "",
  character,
  scriptStyle = "print",
  language = "he",
  traceRenderMode = "full_trace",
  mode = "screen",
}) {
  const [inlineSvg, setInlineSvg] = useState("");
  const [error, setError] = useState("");

  const resolvedSrc =
    resolveWritingSvgAssetUrl(src, {
      character,
      scriptStyle,
      language,
      traceRenderMode,
    }) || src;

  const versionedSrc = withWritingTraceAssetVersion(resolvedSrc);
  const glyphGroup = resolveWritingGlyphGroup({ character, scriptStyle, language });
  const usesVisualScale =
    traceRenderMode === "full_trace" || traceRenderMode === "faint_model";
  const visualScale = usesVisualScale
    ? writingGlyphVisualScaleForGroup(glyphGroup, traceRenderMode)
    : 1;
  const frameStyle = usesVisualScale
    ? { "--writing-glyph-visual-scale": String(visualScale) }
    : undefined;

  useEffect(() => {
    let cancelled = false;
    setInlineSvg("");
    setError("");

    if (!versionedSrc) {
      setError("Missing trace asset URL");
      return undefined;
    }

    fetch(versionedSrc, {
      cache: process.env.NODE_ENV === "development" ? "no-store" : "default",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} for ${versionedSrc}`);
        }
        const ct = res.headers.get("content-type") || "";
        if (ct && !ct.includes("svg")) {
          throw new Error(`Expected image/svg+xml, got ${ct} for ${versionedSrc}`);
        }
        return res.text();
      })
      .then((svgText) => {
        if (cancelled) return;
        const trimmed = String(svgText || "").trim();
        if (!trimmed.includes("<svg")) {
          throw new Error(`Invalid SVG payload for ${versionedSrc}`);
        }
        setInlineSvg(trimmed);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [versionedSrc]);

  if (error) {
    return (
      <span
        className={`writing-trace-error ${className}`.trim()}
        data-writing-trace-error="true"
        data-writing-trace-error-src={versionedSrc}
        data-writing-trace-error-message={error}
        title={error}
        role="img"
        aria-label={`שגיאת נכס עקיבה: ${error}`}
      >
        {process.env.NODE_ENV !== "production" ? `⚠ ${error}` : ""}
      </span>
    );
  }

  if (!inlineSvg) {
    return (
      <span
        className={`writing-trace-loading ${className}`.trim()}
        data-writing-trace-pending="true"
        data-writing-trace-src={versionedSrc}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      dir="ltr"
      className={`writing-glyph-frame ${className}`.trim()}
      data-writing-glyph-group={glyphGroup}
      data-trace-render-mode={traceRenderMode}
      style={frameStyle}
    >
      <span
        className="writing-trace-inline"
        data-writing-trace-ready="true"
        data-writing-trace-src={versionedSrc}
        data-writing-trace-mode={mode}
        dangerouslySetInnerHTML={{ __html: inlineSvg }}
      />
    </span>
  );
}
