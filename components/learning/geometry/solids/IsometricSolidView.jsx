import React from "react";
import GeometryDiagramFitSvg from "../GeometryDiagramFitSvg";

const ST = {
  stroke: "#6ee7b7",
  strokeHi: "#fde047",
  strokeDim: "rgba(110, 231, 183, 0.32)",
  fillFront: "rgba(16, 185, 129, 0.14)",
  fillSide: "rgba(16, 185, 129, 0.08)",
  fillTop: "rgba(253, 224, 71, 0.16)",
};

function hi(active, token, emphasis) {
  const on =
    emphasis === token ||
    (token === "faces" && (emphasis === "solid_faces" || emphasis === "formula")) ||
    (token === "silhouette" && emphasis === "solid_silhouette") ||
    (token === "vertices" && emphasis === "solid_vertices");
  const dim = emphasis !== "neutral" && emphasis !== "formula" && !on;
  return {
    stroke: dim ? ST.strokeDim : on ? ST.strokeHi : ST.stroke,
    sw: on ? 3.2 : 2.2,
    fill: on ? ST.fillTop : ST.fillFront,
  };
}

function CubeSolid({ emphasis = "neutral" }) {
  const f = hi(true, "faces", emphasis);
  return (
    <g>
      <polygon points="110,118 170,118 190,98 130,98" fill={ST.fillTop} stroke={f.stroke} strokeWidth={f.sw} />
      <polygon points="110,118 110,168 170,168 170,118" fill={ST.fillFront} stroke={f.stroke} strokeWidth={f.sw} />
      <polygon points="170,118 190,98 190,148 170,168" fill={ST.fillSide} stroke={f.stroke} strokeWidth={f.sw} />
    </g>
  );
}

function BoxSolid({ emphasis = "neutral" }) {
  const f = hi(true, "faces", emphasis);
  return (
    <g>
      <polygon points="88,122 192,122 212,96 108,96" fill={ST.fillTop} stroke={f.stroke} strokeWidth={f.sw} />
      <polygon points="88,122 88,176 192,176 192,122" fill={ST.fillFront} stroke={f.stroke} strokeWidth={f.sw} />
      <polygon points="192,122 212,96 212,150 192,176" fill={ST.fillSide} stroke={f.stroke} strokeWidth={f.sw} />
    </g>
  );
}

function CylinderSolid({ emphasis = "neutral" }) {
  const f = hi(true, "faces", emphasis);
  return (
    <g>
      <ellipse cx="150" cy="98" rx="52" ry="14" fill={ST.fillTop} stroke={f.stroke} strokeWidth={f.sw} />
      <rect x="98" y="98" width="104" height="72" fill={ST.fillFront} stroke="none" />
      <line x1="98" y1="98" x2="98" y2="170" stroke={f.stroke} strokeWidth={f.sw} />
      <line x1="202" y1="98" x2="202" y2="170" stroke={f.stroke} strokeWidth={f.sw} />
      <ellipse cx="150" cy="170" rx="52" ry="14" fill={ST.fillSide} stroke={f.stroke} strokeWidth={f.sw} />
    </g>
  );
}

function SphereSolid({ emphasis = "neutral" }) {
  const f = hi(true, "silhouette", emphasis);
  return (
    <g>
      <circle cx="150" cy="132" r="58" fill={ST.fillFront} stroke={f.stroke} strokeWidth={f.sw} />
      <ellipse cx="150" cy="132" rx="58" ry="18" fill="none" stroke={ST.strokeDim} strokeWidth="1.5" strokeDasharray="5 4" />
    </g>
  );
}

function PyramidSolid({ emphasis = "neutral" }) {
  const f = hi(true, "faces", emphasis);
  return (
    <g>
      <polygon points="70,168 230,168 150,88" fill={ST.fillFront} stroke={f.stroke} strokeWidth={f.sw} />
      <line x1="70" y1="168" x2="150" y2="88" stroke={f.stroke} strokeWidth={f.sw} />
      <line x1="230" y1="168" x2="150" y2="88" stroke={f.stroke} strokeWidth={f.sw} />
      <line x1="150" y1="88" x2="150" y2="168" stroke={ST.strokeDim} strokeWidth="1.5" strokeDasharray="4 4" />
    </g>
  );
}

function ConeSolid({ emphasis = "neutral" }) {
  const f = hi(true, "faces", emphasis);
  return (
    <g>
      <line x1="150" y1="82" x2="92" y2="172" stroke={f.stroke} strokeWidth={f.sw} />
      <line x1="150" y1="82" x2="208" y2="172" stroke={f.stroke} strokeWidth={f.sw} />
      <ellipse cx="150" cy="172" rx="58" ry="14" fill={ST.fillSide} stroke={f.stroke} strokeWidth={f.sw} />
    </g>
  );
}

const SOLID_RENDERERS = {
  cube: CubeSolid,
  rectangular_prism: BoxSolid,
  box: BoxSolid,
  cylinder: CylinderSolid,
  sphere: SphereSolid,
  pyramid: PyramidSolid,
  cone: ConeSolid,
};

export default function IsometricSolidView({
  solidShape = "cube",
  emphasis = "neutral",
  labels = null,
  fitVariant = "compact",
  measureKey = "",
}) {
  const key = String(solidShape || "cube").replace(/-/g, "_");
  const Renderer = SOLID_RENDERERS[key] || CubeSolid;
  return (
    <GeometryDiagramFitSvg
      variant={fitVariant}
      measureKey={measureKey || key}
      className="block w-full h-full"
    >
      <Renderer emphasis={emphasis} />
      {labels?.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={t.y}
          fill="#ecfdf5"
          fontSize="13"
          fontWeight="500"
          textAnchor={t.anchor || "middle"}
          style={{ unicodeBidi: "plaintext", direction: "ltr" }}
        >
          {t.text}
        </text>
      ))}
    </GeometryDiagramFitSvg>
  );
}
