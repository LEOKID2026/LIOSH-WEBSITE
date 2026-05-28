import React from "react";
import { inferGeometryDiagramLengthUnit } from "../../../utils/geometry-units";
import {
  scaleBaseToHeight,
  scaleLengthToWidth,
  scaleTrapezoid,
  scaleCircleRadius,
  scaleSquareSide,
  scaleParallelogram,
  scalePythagorasLegs,
  triangleVerticesFromSides,
} from "../../../utils/geometry-diagram-scale";
import {
  shapeTemplatePointsString,
  triangleLayoutFromAngles,
} from "../../../utils/geometry-diagram-layout";

const ST = {
  stroke: "#6ee7b7",
  strokeHi: "#fde047",
  strokeDim: "rgba(110, 231, 183, 0.32)",
  fillShape: "rgba(16, 185, 129, 0.14)",
  fillHi: "rgba(253, 224, 71, 0.18)",
  text: "#ecfdf5",
  textMuted: "rgba(236, 253, 245, 0.82)",
  dash: "#94a3b8",
};

const VB = "0 0 360 280";

function fmtLen(n, question) {
  const u = inferGeometryDiagramLengthUnit(question);
  return u ? `${n} ${u}` : String(n);
}

function useHL(active, emphasis, ...tokens) {
  const on = tokens.some((t) => {
    if (t === "length_width")
      return active === "length_width" || active === "formula";
    if (t === "base_height")
      return active === "base_height" || active === "formula";
    if (t === "bases_height")
      return active === "bases_height" || active === "formula";
    if (t === "all_sides") return active === "all_sides" || active === "formula";
    if (t === "legs") return active === "legs" || active === "formula";
    if (t === "squares_legs")
      return active === "squares_legs" || active === "legs" || active === "formula";
    if (t === "hyp") return active === "hyp" || active === "result";
    if (t === "leg_a") return active === "leg_a" || active === "missing_leg" || active === "formula";
    if (t === "leg_b") return active === "leg_b" || active === "missing_leg" || active === "formula";
    if (t === "given_two")
      return active === "given_two" || active === "angles_sum" || active === "formula";
    if (t === "third_angle")
      return active === "third_angle" || active === "result";
    if (t === "angles_compute")
      return active === "angles_compute" || active === "given_two" || active === "formula";
    return active === t;
  });
  const dim =
    emphasis === "neutral"
      ? false
      : emphasis === "formula" || emphasis === "angles_sum"
      ? false
      : !on && emphasis !== "result" && emphasis !== "third_angle";
  const hi =
    on &&
    emphasis !== "result" &&
    emphasis !== "third_angle" &&
    emphasis !== "hyp";
  const veryHi =
    emphasis === "result" ||
    emphasis === "third_angle" ||
    emphasis === "hyp" ||
    emphasis === "missing_leg";
  const lineHi = hi || (veryHi && on);
  return {
    stroke: dim ? ST.strokeDim : lineHi ? ST.strokeHi : ST.stroke,
    sw: lineHi ? 4 : emphasis === "formula" || emphasis === "angles_sum" ? 2.8 : 2.2,
    fill: hi || (veryHi && on) ? ST.fillHi : ST.fillShape,
  };
}

function SvgText({ x, y, children, variant = "caption", anchor = "middle" }) {
  const sizes = { label: 17, caption: 14, note: 12 };
  const weights = { label: 600, caption: 500, note: 500 };
  const muted = variant === "note" || variant === "caption";
  return (
    <text
      x={x}
      y={y}
      fill={muted && variant === "note" ? ST.textMuted : ST.text}
      fillOpacity={variant === "caption" ? 0.95 : 1}
      fontSize={sizes[variant] ?? 14}
      fontWeight={weights[variant] ?? 500}
      textAnchor={anchor}
      style={{ unicodeBidi: "plaintext", direction: "ltr" }}
    >
      {children}
    </text>
  );
}

function DiagramFrame({ children }) {
  return (
    <div className="w-full max-w-[min(100%,400px)] mx-auto mb-1 sm:mb-2 rounded-xl bg-emerald-950/50 border border-emerald-400/25 px-2 py-3 sm:px-3 sm:py-3.5 min-h-[min(42svh,260px)] sm:min-h-[280px] flex items-center justify-center shadow-inner shadow-black/15 ring-1 ring-emerald-500/10">
      <div className="w-full flex items-center justify-center [&>svg]:w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[min(42svh,300px)] sm:[&>svg]:max-h-[min(48svh,320px)]">
        {children}
      </div>
    </div>
  );
}

export default function GeometryExplanationDiagram({
  spec,
  emphasis = "neutral",
  question = null,
}) {
  if (!spec?.kind) return null;

  if (spec.kind === "shape_template") {
    const points = shapeTemplatePointsString(spec.template);
    if (!points) return null;
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <polygon
            points={points}
            fill={ST.fillShape}
            stroke={ST.stroke}
            strokeWidth={2.5}
          />
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "square") {
    if (spec.mode === "identify") {
      const points = shapeTemplatePointsString("square", { x: 180, y: 142 });
      return (
        <DiagramFrame>
          <svg viewBox={VB} className="block" aria-hidden>
            <polygon
              points={points}
              fill={ST.fillShape}
              stroke={ST.stroke}
              strokeWidth={2.5}
            />
          </svg>
        </DiagramFrame>
      );
    }
    const s = spec.side;
    const sz = scaleSquareSide(s);
    const cx = 180;
    const cy = 142;
    const half = sz / 2;
    const { stroke, sw, fill } = useHL(emphasis, emphasis, "side", "formula");
    const bottomY = cy + half;
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <rect
            x={cx - half}
            y={cy - half}
            width={sz}
            height={sz}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            rx="4"
          />
          <SvgText x={cx} y={bottomY + 18} variant="label">
            {fmtLen(s, question)}
          </SvgText>
          <SvgText x={cx + half + 14} y={cy + 5} variant="label" anchor="start">
            {fmtLen(s, question)}
          </SvgText>
          {spec.mode === "perimeter" && (
            <SvgText x={cx} y={cy - half - 12} variant="note">
              4 צלעות שוות
            </SvgText>
          )}
          {spec.mode === "volume" && (
            <SvgText x={cx} y={cy - half - 12} variant="note">
              שלושה ממדים שווים (צלע³)
            </SvgText>
          )}
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "rectangle") {
    if (spec.mode === "identify") {
      const points = shapeTemplatePointsString("rectangle", { x: 180, y: 128 });
      return (
        <DiagramFrame>
          <svg viewBox={VB} className="block" aria-hidden>
            <polygon
              points={points}
              fill={ST.fillShape}
              stroke={ST.stroke}
              strokeWidth={2.5}
            />
          </svg>
        </DiagramFrame>
      );
    }
    const L = spec.length;
    const Wd = spec.width;
    const { w: rw, h: rh } = scaleLengthToWidth(L, Wd);
    const cx = 180;
    const cy = 128;
    const left = cx - rw / 2;
    const right = cx + rw / 2;
    const top = cy - rh / 2;
    const bottom = cy + rh / 2;
    const isR = emphasis === "result";
    const isLw = emphasis === "length_width" || emphasis === "formula";
    const bottomStroke = isR ? ST.stroke : isLw ? ST.strokeHi : ST.strokeDim;
    const bottomSw = isLw ? 4 : isR ? 3 : 2.2;
    const leftStroke = isR ? ST.stroke : isLw ? ST.strokeHi : ST.strokeDim;
    const leftSw = isLw ? 4 : isR ? 3 : 2.2;
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <rect
            x={left}
            y={top}
            width={rw}
            height={rh}
            fill={isLw ? ST.fillHi : ST.fillShape}
            stroke={isR ? ST.stroke : ST.strokeDim}
            strokeWidth={isR ? 3 : 2}
            rx="3"
          />
          <line
            x1={left}
            y1={bottom}
            x2={right}
            y2={bottom}
            stroke={bottomStroke}
            strokeWidth={bottomSw}
          />
          <line
            x1={left}
            y1={top}
            x2={left}
            y2={bottom}
            stroke={leftStroke}
            strokeWidth={leftSw}
          />
          <SvgText x={cx} y={bottom + 20} variant="label">
            {fmtLen(L, question)} (אורך)
          </SvgText>
          <SvgText x={left - 10} y={cy + 4} variant="label" anchor="end">
            {fmtLen(Wd, question)}
          </SvgText>
          <SvgText x={left - 10} y={cy + 22} variant="caption" anchor="end">
            רוחב
          </SvgText>
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "triangle" && spec.mode === "area") {
    const b = spec.base;
    const h = spec.height;
    const { w: bw, h: bh } = scaleBaseToHeight(b, h);
    const baseY = 232;
    const cx = 180;
    const xL = cx - bw / 2;
    const xR = cx + bw / 2;
    const apexY = baseY - bh;
    const emph = emphasis;
    const baseHi = emph === "base_height" || emph === "formula";
    const heightHi = emph === "base_height" || emph === "formula";
    const isRes = emph === "result";
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <polygon
            points={`${cx},${apexY} ${xL},${baseY} ${xR},${baseY}`}
            fill={ST.fillShape}
            stroke={isRes ? ST.stroke : ST.strokeDim}
            strokeWidth={isRes ? 3.2 : 2.4}
          />
          <line
            x1={xL}
            y1={baseY}
            x2={xR}
            y2={baseY}
            stroke={isRes ? ST.stroke : baseHi ? ST.strokeHi : ST.strokeDim}
            strokeWidth={isRes ? 3.4 : baseHi ? 4 : 2.2}
          />
          <line
            x1={cx}
            y1={apexY}
            x2={cx}
            y2={baseY}
            stroke={ST.dash}
            strokeWidth={isRes ? 3 : heightHi ? 3.6 : 1.8}
            strokeDasharray="6 5"
          />
          <SvgText x={cx} y={baseY + 20} variant="label">
            בסיס {fmtLen(b, question)}
          </SvgText>
          <SvgText x={xL - 8} y={(apexY + baseY) / 2 + 5} variant="label" anchor="end">
            גובה {fmtLen(h, question)}
          </SvgText>
          <SvgText x={cx} y={Math.max(16, apexY - 14)} variant="note">
            הגובה ניצב לבסיס
          </SvgText>
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "parallelogram") {
    const b = spec.base;
    const h = spec.height;
    const { w, h: ph, skew } = scaleParallelogram(b, h);
    const cx = 180;
    const yb = 224;
    const xl = cx - w / 2;
    const xr = cx + w / 2;
    const yt = yb - ph;
    const bh = emphasis === "base_height" || emphasis === "formula";
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <polygon
            points={`${xl},${yb} ${xr},${yb} ${xr + skew},${yt} ${xl + skew},${yt}`}
            fill={ST.fillShape}
            stroke={emphasis === "result" ? ST.stroke : ST.strokeDim}
            strokeWidth="2.4"
          />
          <line
            x1={xl}
            y1={yb}
            x2={xr}
            y2={yb}
            stroke={bh ? ST.strokeHi : ST.stroke}
            strokeWidth={bh ? 4 : 2.4}
          />
          <line
            x1={xl + skew}
            y1={yt}
            x2={xl + skew}
            y2={yb}
            stroke={ST.dash}
            strokeWidth={bh ? 3.4 : 1.8}
            strokeDasharray="6 5"
          />
          <SvgText x={cx} y={yb + 20} variant="label">
            בסיס {fmtLen(b, question)}
          </SvgText>
          <SvgText x={xl + skew - 12} y={(yt + yb) / 2 + 5} variant="label" anchor="end">
            גובה {fmtLen(h, question)}
          </SvgText>
          <SvgText x={xr + skew + 18} y={(yt + yb) / 2} variant="note" anchor="start">
            מוסט ≠ גובה
          </SvgText>
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "trapezoid") {
    const b1 = spec.base1;
    const b2 = spec.base2;
    const ht = spec.height;
    const { bottomW, topW, h: vh } = scaleTrapezoid(b1, b2, ht);
    const cx = 180;
    const yb = 228;
    const yt = yb - vh;
    const xBl = cx - bottomW / 2;
    const xBr = cx + bottomW / 2;
    const xTl = cx - topW / 2;
    const xTr = cx + topW / 2;
    const tri = emphasis === "bases_height" || emphasis === "formula";
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <polygon
            points={`${xBl},${yb} ${xBr},${yb} ${xTr},${yt} ${xTl},${yt}`}
            fill={ST.fillShape}
            stroke={emphasis === "result" ? ST.stroke : ST.strokeDim}
            strokeWidth="2.4"
          />
          <line
            x1={xBl}
            y1={yb}
            x2={xBr}
            y2={yb}
            stroke={tri ? ST.strokeHi : ST.stroke}
            strokeWidth={tri ? 3.8 : 2.4}
          />
          <line
            x1={xTl}
            y1={yt}
            x2={xTr}
            y2={yt}
            stroke={tri ? ST.strokeHi : ST.stroke}
            strokeWidth={tri ? 3.8 : 2.4}
          />
          <line
            x1={xTl}
            y1={yt}
            x2={xTl}
            y2={yb}
            stroke={ST.dash}
            strokeWidth={tri ? 3.2 : 1.8}
            strokeDasharray="6 5"
          />
          <SvgText x={cx} y={yb + 20} variant="label">
            בסיס {fmtLen(b1, question)}
          </SvgText>
          <SvgText x={cx} y={yt - 10} variant="label">
            בסיס {fmtLen(b2, question)}
          </SvgText>
          <SvgText x={xTl - 8} y={(yt + yb) / 2 + 5} variant="label" anchor="end">
            גובה {fmtLen(ht, question)}
          </SvgText>
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "circle") {
    const r = spec.radius;
    const rad = scaleCircleRadius(r);
    const cx = 180;
    const cy = 138;
    const rim = emphasis === "rim";
    const radHi = emphasis === "radius" || emphasis === "formula";
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            r={rad}
            fill={ST.fillShape}
            stroke={rim ? ST.strokeHi : ST.stroke}
            strokeWidth={rim ? 4 : radHi ? 3.2 : 2.4}
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + rad}
            y2={cy}
            stroke={radHi ? ST.strokeHi : ST.strokeDim}
            strokeWidth={radHi ? 4 : 2}
          />
          <SvgText x={cx + rad * 0.45} y={cy - 12} variant="label">
            r = {fmtLen(r, question)}
          </SvgText>
          {spec.mode === "perimeter" && (
            <SvgText x={cx} y={cy - rad - 16} variant="note">
              היקף — סיבוב מלא על השפה
            </SvgText>
          )}
          {spec.mode === "area" && (
            <SvgText x={cx} y={cy - rad - 16} variant="note">
              שטח — הפנים של העיגול (לא הקו החיצוני בלבד)
            </SvgText>
          )}
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "triangle_perimeter") {
    const a = spec.side1;
    const b = spec.side2;
    const c = spec.side3;
    const all = emphasis === "all_sides" || emphasis === "formula";
    const pts = triangleVerticesFromSides(a, b, c);
    const xs = [pts.x0, pts.x1, pts.x2];
    const ys = [pts.y0, pts.y1, pts.y2];
    const minx = Math.min(...xs);
    const maxx = Math.max(...xs);
    const miny = Math.min(...ys);
    const maxy = Math.max(...ys);
    const tcx = (minx + maxx) / 2;
    const tcy = (miny + maxy) / 2;
    const targetX = 180;
    const targetY = 132;
    const tx = targetX - tcx;
    const ty = targetY - tcy;
    const x0 = pts.x0 + tx;
    const y0 = pts.y0 + ty;
    const x1 = pts.x1 + tx;
    const y1 = pts.y1 + ty;
    const x2 = pts.x2 + tx;
    const y2 = pts.y2 + ty;
    const m01x = (x0 + x1) / 2;
    const m01y = (y0 + y1) / 2 + 14;
    const m12x = (x1 + x2) / 2 + 12;
    const m12y = (y1 + y2) / 2;
    const m20x = (x2 + x0) / 2 - 12;
    const m20y = (y2 + y0) / 2;
    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <polygon
            points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`}
            fill={ST.fillShape}
            stroke={all || emphasis === "result" ? ST.strokeHi : ST.stroke}
            strokeWidth={all ? 4 : 2.8}
          />
          <SvgText x={m01x} y={m01y} variant="label">
            {fmtLen(a, question)}
          </SvgText>
          <SvgText x={m12x} y={m12y} variant="label" anchor="start">
            {fmtLen(b, question)}
          </SvgText>
          <SvgText x={m20x} y={m20y} variant="label" anchor="end">
            {fmtLen(c, question)}
          </SvgText>
          <SvgText x={180} y={Math.min(y0, y1, y2) - 12} variant="note">
            סכום שלוש הצלעות = היקף
          </SvgText>
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "triangle_angles") {
    const a1 = spec.angle1;
    const a2 = spec.angle2;
    const a3 = spec.angle3;
    const hideThird = spec.hideAngle3 === true;
    const revealThird =
      !hideThird || emphasis === "third_angle" || emphasis === "result";
    const g2 = emphasis === "given_two";
    const comp = emphasis === "angles_compute";
    const third = emphasis === "third_angle" || emphasis === "result";
    const sumRule = emphasis === "angles_sum" || emphasis === "formula";

    const triStroke = third ? ST.strokeHi : ST.stroke;
    const triSw = third ? 4 : 3;

    const v1 = g2 ? "label" : "caption";
    const v2 = g2 ? "label" : "caption";
    const v3 = third || hideThird ? "label" : "caption";
    const showInsideFormula = !hideThird && (sumRule || comp);

    const layout = triangleLayoutFromAngles(a1, a2, a3, {
      centerY: hideThird ? 138 : 132,
      labelInset: hideThird ? 44 : 38,
    });
    const labelA1 = layout.labels.angle1;
    const labelA2 = layout.labels.angle2;
    const labelA3 = layout.labels.angle3;

    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <polygon
            points={layout.pointsString}
            fill={third ? ST.fillHi : ST.fillShape}
            stroke={triStroke}
            strokeWidth={triSw}
          />
          <SvgText x={labelA1.x} y={labelA1.y} variant={v1}>
            {`${a1}°`}
          </SvgText>
          <SvgText x={labelA2.x} y={labelA2.y} variant={v2}>
            {`${a2}°`}
          </SvgText>
          <SvgText x={labelA3.x} y={labelA3.y} variant={v3}>
            {revealThird ? `${a3}°` : "?"}
          </SvgText>
          {showInsideFormula ? (
            <SvgText x="180" y="138" variant="label">
              סכום בפנים = 180°
            </SvgText>
          ) : null}
          {!hideThird ? (
            <SvgText x="180" y="22" variant="note">
              מחפשים את הזווית שלא נתונה
            </SvgText>
          ) : null}
          {!hideThird && sumRule ? (
            <SvgText x="180" y="272" variant="note">
              סכום זוויות במשולש = 180°
            </SvgText>
          ) : null}
        </svg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "pythagoras") {
    const { a, b, c, mode, which } = spec;
    const { w: legB, h: legA } = scalePythagorasLegs(a, b);
    const cx = 180;
    const yb = 218;
    const x0 = cx - legB / 2;
    const y0 = yb;
    const x1 = x0 + legB;
    const y1 = yb;
    const x2 = x0;
    const y2 = yb - legA;

    const isHyp = mode === "hyp";
    const emph = emphasis;

    const missA = which === "leg_a";
    const missB = which === "leg_b";

    const legStroke = (key) => {
      if (isHyp) {
        if (emph === "legs" || emph === "squares_legs" || emph === "formula")
          return ST.strokeHi;
        if (emph === "sum" || emph === "hyp") return ST.strokeDim;
        return ST.stroke;
      }
      if (emph === "missing_leg") {
        if (key === "a" && missA) return ST.strokeHi;
        if (key === "b" && missB) return ST.strokeHi;
        return ST.strokeDim;
      }
      if (emph === "rearrange" || emph === "squares_legs" || emph === "formula") {
        if (key === "a" && !missA) return ST.strokeHi;
        if (key === "b" && !missB) return ST.strokeHi;
        if (key === "c") return ST.strokeHi;
        return ST.strokeDim;
      }
      if (emph === "diff") return key === "c" ? ST.strokeHi : ST.stroke;
      return ST.stroke;
    };

    let hypStroke = ST.stroke;
    if (isHyp) {
      if (emph === "hyp" || emph === "sum" || emph === "result") hypStroke = ST.strokeHi;
      else if (emph === "legs" || emph === "squares_legs") hypStroke = ST.strokeDim;
    } else if (emph === "missing_leg" || emph === "diff") {
      hypStroke = ST.strokeDim;
    }

    const hypSw =
      emph === "hyp" ||
      emph === "result" ||
      (!isHyp && emph === "missing_leg")
        ? 4.2
        : 3;

    const u = inferGeometryDiagramLengthUnit(question);
    const uStr = u ? ` ${u}` : "";

    const revealSide = (key) =>
      !spec.hideSide ||
      spec.hideSide !== key ||
      emphasis === "result" ||
      emphasis === "hyp" ||
      emphasis === "missing_leg";

    const sideLabel = (key, val) => {
      if (!revealSide(key)) return `${key} = ?`;
      return `${key} = ${val}${uStr}`;
    };

    return (
      <DiagramFrame>
        <svg viewBox={VB} className="block" aria-hidden>
          <polygon
            points={`${x0},${y0} ${x1},${y1} ${x2},${y2}`}
            fill={ST.fillShape}
            stroke={ST.strokeDim}
            strokeWidth="1.5"
          />
          <line
            x1={x0}
            y1={y0}
            x2={x1}
            y2={y1}
            stroke={legStroke("b")}
            strokeWidth={emph === "formula" ? 3 : 3.6}
          />
          <line
            x1={x0}
            y1={y0}
            x2={x2}
            y2={y2}
            stroke={legStroke("a")}
            strokeWidth={emph === "formula" ? 3 : 3.6}
          />
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={hypStroke}
            strokeWidth={hypSw}
          />
          <path
            d={`M ${x0 + 16} ${y0} L ${x0 + 16} ${y0 - 16} L ${x0} ${y0 - 16}`}
            fill="none"
            stroke={ST.strokeHi}
            strokeWidth="2.2"
          />
          <SvgText x={x0 - 8} y={(y0 + y2) / 2 + 5} variant="label" anchor="end">
            {sideLabel("a", a)}
          </SvgText>
          <SvgText x={(x0 + x1) / 2} y={y0 + 22} variant="label">
            {sideLabel("b", b)}
          </SvgText>
          <SvgText x={(x1 + x2) / 2 + 10} y={(y1 + y2) / 2 - 4} variant="label">
            {sideLabel("c", c)}
          </SvgText>
          <SvgText x="180" y="20" variant="note">
            זווית ישרה — היתר נגדה הוא c
          </SvgText>
        </svg>
      </DiagramFrame>
    );
  }

  return null;
}
