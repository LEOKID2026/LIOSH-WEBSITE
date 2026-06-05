/** Shared geometry step diagram highlight + animation styles. */

export const GEOMETRY_HIGHLIGHT_STYLE = {
  backgroundColor: "rgba(253, 224, 71, 0.12)",
  boxShadow: "inset 0 0 0 1px rgba(253, 224, 71, 0.4)",
};

export const SVG_ANIMATION = {
  drawDuration: "1.1s",
  pulseDuration: "1.4s",
  gridDuration: "0.8s",
  traceDuration: "1.6s",
};

export const GEOMETRY_DIAGRAM_CSS = `
@keyframes geo-draw-on {
  from { stroke-dashoffset: var(--geo-path-len, 400); }
  to { stroke-dashoffset: 0; }
}
@keyframes geo-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@keyframes geo-grid-fill {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes geo-rotate-ghost {
  from { transform: rotate(0deg); opacity: 0.35; }
  to { transform: rotate(var(--geo-rotate-deg, 90deg)); opacity: 0.85; }
}
.geo-animate-draw {
  animation: geo-draw-on var(--geo-draw-duration, 1.1s) ease-out forwards;
}
.geo-animate-pulse {
  animation: geo-pulse var(--geo-pulse-duration, 1.4s) ease-in-out infinite;
}
.geo-animate-grid {
  animation: geo-grid-fill var(--geo-grid-duration, 0.8s) ease-out forwards;
}
`;

export function animatedStrokeProps(preset, pathLength = 400) {
  if (preset === "drawPath" || preset === "drawHeight" || preset === "drawDiagonal" || preset === "tracePerimeter") {
    return {
      strokeDasharray: pathLength,
      strokeDashoffset: 0,
      className: "geo-animate-draw",
      style: { "--geo-path-len": pathLength, "--geo-draw-duration": SVG_ANIMATION.drawDuration },
    };
  }
  return {};
}
