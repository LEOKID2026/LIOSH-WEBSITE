import React, { useLayoutEffect, useRef, useState } from "react";
import {
  GEOMETRY_DIAGRAM_BASE_VIEWBOX_STR,
  geometryDiagramViewBoxString,
  getGeometryDiagramFitPaddingRatio,
  measureSvgContentBBox,
  padGeometryDiagramViewBox,
} from "../../../utils/geometry-diagram-fit.client";

/**
 * SVG shell that crops empty margins and scales content to the frame.
 * @param {{
 *   variant?: "mini" | "compact" | "expanded",
 *   measureKey?: string,
 *   stepId?: string,
 *   className?: string,
 *   children: React.ReactNode,
 * }} props
 */
export default function GeometryDiagramFitSvg({
  variant = "compact",
  measureKey = "",
  stepId = "",
  className = "block w-full h-full",
  children,
}) {
  const svgRef = useRef(null);
  const [viewBox, setViewBox] = useState(GEOMETRY_DIAGRAM_BASE_VIEWBOX_STR);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const bbox = measureSvgContentBBox(svg);
    if (!bbox) {
      setViewBox(GEOMETRY_DIAGRAM_BASE_VIEWBOX_STR);
      return;
    }

    const padded = padGeometryDiagramViewBox(
      bbox,
      getGeometryDiagramFitPaddingRatio(variant)
    );
    setViewBox(geometryDiagramViewBoxString(padded));
  }, [variant, measureKey]);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      data-step-id={stepId || undefined}
    >
      {children}
    </svg>
  );
}
