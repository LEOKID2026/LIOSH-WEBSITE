/** Default geometry diagram coordinate space (legacy authoring bounds). */
export const GEOMETRY_DIAGRAM_BASE_VIEWBOX = {
  x: 0,
  y: 0,
  width: 360,
  height: 280,
};

export const GEOMETRY_DIAGRAM_BASE_VIEWBOX_STR = "0 0 360 280";

const MEASURABLE =
  "path, polygon, polyline, rect, circle, ellipse, line, text";

/**
 * Union bbox of rendered SVG primitives (shape + labels).
 * @param {SVGSVGElement | null | undefined} svgElement
 */
export function measureSvgContentBBox(svgElement) {
  if (!svgElement) return null;

  const nodes = svgElement.querySelectorAll(MEASURABLE);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  nodes.forEach((el) => {
    if (typeof el.getBBox !== "function") return;
    try {
      const b = el.getBBox();
      if (!Number.isFinite(b.width) || !Number.isFinite(b.height)) return;
      if (b.width <= 0 && b.height <= 0) return;
      found = true;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    } catch {
      /* getBBox can fail on detached/hidden nodes */
    }
  });

  if (!found) return null;

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

/**
 * Padding around content — smaller padding => larger apparent diagram.
 * @param {"mini" | "compact" | "expanded"} variant
 */
export function getGeometryDiagramFitPaddingRatio(variant = "compact") {
  if (variant === "expanded") return 0.06;
  if (variant === "mini") return 0.1;
  return 0.12;
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} bbox
 * @param {number} paddingRatio
 */
export function padGeometryDiagramViewBox(bbox, paddingRatio = 0.12) {
  const padX = bbox.width * paddingRatio;
  const padY = bbox.height * paddingRatio;
  return {
    x: bbox.x - padX,
    y: bbox.y - padY,
    width: bbox.width + padX * 2,
    height: bbox.height + padY * 2,
  };
}

/** @param {{ x: number, y: number, width: number, height: number }} vb */
export function geometryDiagramViewBoxString(vb) {
  return `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
}
