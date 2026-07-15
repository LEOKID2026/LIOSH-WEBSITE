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
import {
  GEOMETRY_DIAGRAM_CSS,
  animatedStrokeProps,
} from "../../../utils/geometry-step-highlight-styles";
import { GEOMETRY_ANIMATION_PRESETS } from "../../../utils/geometry-step-types";
import IsometricSolidView from "./solids/IsometricSolidView";
import GeometryDiagramFitSvg from "./GeometryDiagramFitSvg";

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

function DiagramAnimationStyles() {
  return <style>{GEOMETRY_DIAGRAM_CSS}</style>;
}

function GridFillOverlay({ x, y, w, h, cols = 4, rows = 4, active = false }) {
  if (!active) return null;
  const cells = [];
  const safeCols = Math.max(1, Math.round(Number(cols) || 1));
  const safeRows = Math.max(1, Math.round(Number(rows) || 1));
  const cw = w / safeCols;
  const rh = h / safeRows;
  for (let r = 0; r < safeRows; r += 1) {
    for (let c = 0; c < safeCols; c += 1) {
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={x + c * cw}
          y={y + r * rh}
          width={cw}
          height={rh}
          fill="rgba(253, 224, 71, 0.12)"
          stroke="rgba(253, 224, 71, 0.35)"
          strokeWidth="1"
          className="geo-animate-grid"
          style={{ animationDelay: `${(r * safeCols + c) * 0.04}s` }}
        />
      );
    }
  }
  return <g>{cells}</g>;
}

function TracePerimeterRect({ x, y, w, h, active = false }) {
  if (!active) return null;
  const len = 2 * (w + h);
  const props = animatedStrokeProps(GEOMETRY_ANIMATION_PRESETS.tracePerimeter, len);
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill="none"
      stroke={ST.strokeHi}
      strokeWidth="3"
      {...props}
    />
  );
}

function PythagorasSquares({ x0, y0, x1, y1, x2, y2, a, b, active = false }) {
  if (!active) return null;
  const sqA = Math.min(48, a * 3);
  const sqB = Math.min(48, b * 3);
  return (
    <g>
      <rect
        x={x0 - sqA}
        y={(y0 + y2) / 2 - sqA / 2}
        width={sqA}
        height={sqA}
        fill="rgba(253, 224, 71, 0.14)"
        stroke={ST.strokeHi}
        strokeWidth="2"
        className="geo-animate-grid"
      />
      <rect
        x={(x0 + x1) / 2 - sqB / 2}
        y={y0}
        width={sqB}
        height={sqB}
        fill="rgba(253, 224, 71, 0.14)"
        stroke={ST.strokeHi}
        strokeWidth="2"
        className="geo-animate-grid"
        style={{ animationDelay: "0.15s" }}
      />
    </g>
  );
}

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
    if (t === "base")
      return active === "base" || active === "formula";
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

function DiagramFrame({ children, compact = false, embedded = false, mini = false, expanded = false }) {
  if (embedded) {
    return (
      <div
        className="w-full max-w-md mx-auto flex items-center justify-center py-0.5 overflow-visible [&>svg]:w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-48 sm:[&>svg]:max-h-52 lg:[&>svg]:max-h-56"
        data-testid="geometry-diagram-embedded"
      >
        {children}
      </div>
    );
  }
  if (expanded) {
    return (
      <div className="w-full mx-auto mb-0 rounded-xl bg-emerald-950/50 border border-emerald-400/25 px-1 py-1 sm:px-1.5 sm:py-1.5 min-h-[min(52svh,420px)] sm:min-h-[min(58svh,480px)] flex items-center justify-center shadow-inner shadow-black/15 ring-1 ring-emerald-500/10 overflow-hidden">
        <div className="w-full h-[min(50svh,400px)] sm:h-[min(56svh,460px)] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
          {children}
        </div>
      </div>
    );
  }
  /* mini — תצוגה מקדימה קומפקטית בזמן השאלה (לא משפיע על פריסת התשובה) */
  if (mini) {
    return (
      <div className="w-full max-w-[140px] sm:max-w-[180px] mx-auto mb-0 rounded-lg bg-emerald-950/50 border border-emerald-400/25 px-0.5 py-0 flex items-center justify-center shadow-inner shadow-black/10 ring-1 ring-emerald-500/10 overflow-hidden">
        <div className="w-full h-[min(88px,100px)] sm:h-[min(100px,120px)] max-h-[100px] sm:max-h-[120px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain">
          {children}
        </div>
      </div>
    );
  }
  if (compact) {
    return (
      <div className="w-full max-w-[min(100%,340px)] mx-auto mb-0 rounded-xl bg-emerald-950/50 border border-emerald-400/25 px-2 py-2 sm:px-2.5 sm:py-2.5 min-h-[140px] sm:min-h-[160px] flex items-center justify-center shadow-inner shadow-black/15 ring-1 ring-emerald-500/10 overflow-visible">
        <div className="w-full flex items-center justify-center overflow-visible [&>svg]:w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-48 sm:[&>svg]:max-h-52">
          {children}
        </div>
      </div>
    );
  }
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
  compact = false,
  embedded = false,
  mini = false,
  expanded = false,
  reveal = [],
  animationPreset = GEOMETRY_ANIMATION_PRESETS.none,
  stepId = "",
}) {
  if (!spec?.kind) return null;

  const frameProps = { compact, embedded, mini, expanded };
  const preset = animationPreset || GEOMETRY_ANIMATION_PRESETS.none;
  const fitVariant = expanded ? "expanded" : mini ? "mini" : "compact";
  const fitMeasureKey = `${spec.kind}|${spec.mode ?? ""}|${stepId}|${fitVariant}|${emphasis}|${preset}`;
  const showGrid = preset === GEOMETRY_ANIMATION_PRESETS.gridFill;
  const showTrace = preset === GEOMETRY_ANIMATION_PRESETS.tracePerimeter;
  const showHeightDraw = preset === GEOMETRY_ANIMATION_PRESETS.drawHeight;
  const showPulse = preset === GEOMETRY_ANIMATION_PRESETS.pulseRadius || preset === GEOMETRY_ANIMATION_PRESETS.pulseAngle;
  const showPythSq = preset === GEOMETRY_ANIMATION_PRESETS.pythagorasSquares;
  const showDiagonalDraw = preset === GEOMETRY_ANIMATION_PRESETS.drawDiagonal;
  const revealSet = new Set(Array.isArray(reveal) ? reveal : []);

  if (spec.kind === "shape_template") {
    const points = shapeTemplatePointsString(spec.template);
    if (!points) return null;
    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          <polygon
            points={points}
            fill={ST.fillShape}
            stroke={ST.stroke}
            strokeWidth={2.5}
          />
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "square") {
    if (spec.mode === "identify") {
      const points = shapeTemplatePointsString("square", { x: 180, y: 142 });
      return (
        <DiagramFrame {...frameProps}>
          <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
            <polygon
              points={points}
              fill={ST.fillShape}
              stroke={ST.stroke}
              strokeWidth={2.5}
            />
          </GeometryDiagramFitSvg>
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
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
          <GridFillOverlay
            x={cx - half}
            y={cy - half}
            w={sz}
            h={sz}
            cols={spec.gridCols ?? Math.min(6, Math.max(2, Math.round(s / 2)))}
            rows={spec.gridRows ?? Math.min(6, Math.max(2, Math.round(s / 2)))}
            active={(showGrid || spec.grid === true) && spec.mode === "area"}
          />
          <TracePerimeterRect
            x={cx - half}
            y={cy - half}
            w={sz}
            h={sz}
            active={showTrace && spec.mode === "perimeter"}
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
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "rectangle") {
    if (spec.mode === "identify") {
      const points = shapeTemplatePointsString("rectangle", { x: 180, y: 128 });
      return (
        <DiagramFrame {...frameProps}>
          <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
            <polygon
              points={points}
              fill={ST.fillShape}
              stroke={ST.stroke}
              strokeWidth={2.5}
            />
          </GeometryDiagramFitSvg>
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
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
          <GridFillOverlay
            x={left}
            y={top}
            w={rw}
            h={rh}
            cols={spec.gridCols ?? 4}
            rows={spec.gridRows ?? 3}
            active={showGrid || spec.grid === true}
          />
          <TracePerimeterRect x={left} y={top} w={rw} h={rh} active={showTrace} />
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
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "triangle" && (spec.mode === "area" || spec.mode === "height")) {
    const b = spec.base;
    const h = spec.height;
    const { w: bw, h: bh } = scaleBaseToHeight(b, h);
    const baseY = 232;
    const cx = 180;
    const xL = cx - bw / 2;
    const xR = cx + bw / 2;
    const apexY = baseY - bh;
    const emph = emphasis;
    const baseHi = emph === "base_height" || emph === "base" || emph === "formula";
    const heightHi = emph === "base_height" || emph === "formula";
    const isRes = emph === "result";
    const heightLabel = spec.hideHeight ? "גובה ?" : `גובה ${fmtLen(h, question)}`;
    const heightDrawProps =
      showHeightDraw && heightHi
        ? animatedStrokeProps(GEOMETRY_ANIMATION_PRESETS.drawHeight, bh + 40)
        : {};
    return (
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
            strokeDasharray={heightDrawProps.strokeDasharray || "6 5"}
            {...heightDrawProps}
            className={heightDrawProps.className || undefined}
          />
          <SvgText x={cx} y={baseY + 20} variant="label">
            בסיס {fmtLen(b, question)}
          </SvgText>
          <SvgText x={xL - 8} y={(apexY + baseY) / 2 + 5} variant="label" anchor="end">
            {heightLabel}
          </SvgText>
          <SvgText x={cx} y={Math.max(16, apexY - 14)} variant="note">
            הגובה ניצב לבסיס
          </SvgText>
        </GeometryDiagramFitSvg>
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
    const heightLabel = spec.hideHeight ? "גובה ?" : `גובה ${fmtLen(h, question)}`;
    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
            {heightLabel}
          </SvgText>
          <SvgText x={xr + skew + 18} y={(yt + yb) / 2} variant="note" anchor="start">
            מוסט ≠ גובה
          </SvgText>
        </GeometryDiagramFitSvg>
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
    const heightLabel = spec.hideHeight ? "גובה ?" : `גובה ${fmtLen(ht, question)}`;
    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
            {heightLabel}
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "parallel_lines") {
    const perp = spec.mode === "perpendicular";
    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          {perp ? (
            <>
              <line x1="72" y1="200" x2="288" y2="200" stroke={ST.stroke} strokeWidth="2.8" />
              <line x1="180" y1="220" x2="180" y2="72" stroke={ST.strokeHi} strokeWidth="2.8" />
              <rect
                x="168"
                y="188"
                width="18"
                height="18"
                fill="none"
                stroke={ST.strokeHi}
                strokeWidth="2"
              />
            </>
          ) : (
            <>
              <line x1="72" y1="108" x2="288" y2="108" stroke={ST.stroke} strokeWidth="2.8" />
              <line x1="72" y1="168" x2="288" y2="168" stroke={ST.strokeHi} strokeWidth="2.8" />
            </>
          )}
          <SvgText x="180" y="36" variant="note">
            {perp ? "ישרים מאונכים" : "ישרים מקבילים"}
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "symmetry") {
    const tpl = spec.template || "square";
    const cx = 180;
    const cy = 138;
    let points = shapeTemplatePointsString("square", { x: cx, y: cy });
    if (tpl === "rectangle") {
      points = shapeTemplatePointsString("rectangle", { x: cx, y: cy - 8 });
    } else if (tpl === "equilateral_triangle") {
      points = shapeTemplatePointsString("triangle_equilateral", { x: cx, y: cy + 12 });
    }
    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          {points ? (
            <polygon points={points} fill={ST.fillShape} stroke={ST.stroke} strokeWidth="2.5" />
          ) : null}
          <line
            x1={cx}
            y1="52"
            x2={cx}
            y2="228"
            stroke={ST.strokeHi}
            strokeWidth="2"
            strokeDasharray="7 5"
          />
          <SvgText x={cx} y="28" variant="note">
            ציר סימטרייה
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "diagonal") {
    const cx = 180;
    const cy = 132;
    if (spec.shape === "rectangle" || spec.shape === "parallelogram") {
      const L = typeof spec.side === "number" ? spec.side : 8;
      const Wd = typeof spec.width === "number" ? spec.width : 5;
      const { w: rw, h: rh } = scaleLengthToWidth(L, Wd);
      const left = cx - rw / 2;
      const right = cx + rw / 2;
      const top = cy - rh / 2;
      const bottom = cy + rh / 2;
      const skew = spec.shape === "parallelogram" ? rw * 0.18 : 0;
      const poly =
        spec.shape === "parallelogram"
          ? `${left},${bottom} ${right},${bottom} ${right + skew},${top} ${left + skew},${top}`
          : null;
      return (
        <DiagramFrame {...frameProps}>
          <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
            {poly ? (
              <polygon points={poly} fill={ST.fillShape} stroke={ST.stroke} strokeWidth="2.4" />
            ) : (
              <rect
                x={left}
                y={top}
                width={rw}
                height={rh}
                fill={ST.fillShape}
                stroke={ST.stroke}
                strokeWidth="2.4"
                rx="3"
              />
            )}
            <line
              x1={left}
              y1={bottom}
              x2={right + skew}
              y2={top}
              stroke={ST.strokeHi}
              strokeWidth="2.2"
              strokeDasharray="6 4"
            />
            <SvgText x={cx} y={bottom + 22} variant="label">
              {typeof spec.side === "number" ? fmtLen(spec.side, question) : "אורך"}
            </SvgText>
            <SvgText x={left - 10} y={cy + 4} variant="label" anchor="end">
              {typeof spec.width === "number" ? fmtLen(spec.width, question) : "רוחב"}
            </SvgText>
            {!spec.hideDiagonal ? (
              <SvgText x={cx + 20} y={cy - 8} variant="note" anchor="start">
                {spec.diagonal != null ? fmtLen(spec.diagonal, question) : "אלכסון"}
              </SvgText>
            ) : null}
          </GeometryDiagramFitSvg>
        </DiagramFrame>
      );
    }
    const s = typeof spec.side === "number" ? spec.side : 8;
    const sz = scaleSquareSide(s);
    const half = sz / 2;
    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          <rect
            x={cx - half}
            y={cy - half}
            width={sz}
            height={sz}
            fill={ST.fillShape}
            stroke={ST.stroke}
            strokeWidth="2.4"
            rx="4"
          />
          <line
            x1={cx - half}
            y1={cy + half}
            x2={cx + half}
            y2={cy - half}
            stroke={ST.strokeHi}
            strokeWidth="2.2"
            strokeDasharray="6 4"
          />
          <SvgText x={cx} y={cy + half + 20} variant="label">
            {typeof spec.side === "number" ? fmtLen(spec.side, question) : "צלע"}
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "tiling") {
    const cx = 180;
    const cy = 138;
    const tile = spec.tile || "square";
    let points = shapeTemplatePointsString("square", { x: cx, y: cy });
    if (tile === "triangle") {
      points = shapeTemplatePointsString("triangle_equilateral", { x: cx, y: cy + 10 });
    } else if (tile === "hexagon") {
      const r = 56;
      const hex = [];
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        hex.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      points = hex.join(" ");
    }
    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          {points ? (
            <polygon points={points} fill={ST.fillShape} stroke={ST.stroke} strokeWidth="2.5" />
          ) : null}
          <SvgText x={cx} y="28" variant="note">
            צורה לריצוף
          </SvgText>
        </GeometryDiagramFitSvg>
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
    const rimTraceProps = showTrace && rim ? animatedStrokeProps(GEOMETRY_ANIMATION_PRESETS.tracePerimeter, 2 * Math.PI * rad) : {};
    return (
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          <circle
            cx={cx}
            cy={cy}
            r={rad}
            fill={ST.fillShape}
            stroke={rim ? ST.strokeHi : ST.stroke}
            strokeWidth={rim ? 4 : radHi ? 3.2 : 2.4}
            className={showPulse && radHi ? "geo-animate-pulse" : undefined}
            {...rimTraceProps}
          />
          <line
            x1={cx}
            y1={cy}
            x2={cx + rad}
            y2={cy}
            stroke={radHi ? ST.strokeHi : ST.strokeDim}
            strokeWidth={radHi ? 4 : 2}
            className={showPulse && radHi ? "geo-animate-pulse" : undefined}
          />
          <SvgText x={cx + rad * 0.45} y={cy - 12} variant="label">
            r = {fmtLen(r, question)}
          </SvgText>
          {spec.mode === "perimeter" && (
            <SvgText x={cx} y={cy - rad - 16} variant="note">
              היקף - סיבוב מלא על השפה
            </SvgText>
          )}
          {spec.mode === "area" && (
            <SvgText x={cx} y={cy - rad - 16} variant="note">
              שטח - הפנים של העיגול (לא הקו החיצוני בלבד)
            </SvgText>
          )}
        </GeometryDiagramFitSvg>
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
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
        </GeometryDiagramFitSvg>
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
      hiddenAngle: hideThird ? "angle3" : null,
    });
    const labelA1 = layout.labels.angle1;
    const labelA2 = layout.labels.angle2;
    const labelA3 = layout.labels.angle3;

    return (
      <DiagramFrame {...frameProps}>
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
        </GeometryDiagramFitSvg>
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
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
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
            {...(emph === "hyp" || emph === "missing_leg"
              ? animatedStrokeProps(GEOMETRY_ANIMATION_PRESETS.drawPath, Math.hypot(x2 - x1, y2 - y1))
              : {})}
          />
          <PythagorasSquares
            x0={x0}
            y0={y0}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            a={a}
            b={b}
            active={showPythSq}
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
            זווית ישרה - היתר נגדה הוא c
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "solid_identify" || String(spec.kind).startsWith("solid_")) {
    const solidShape =
      spec.solidShape ||
      (spec.kind === "solid_box" ? "rectangular_prism" : spec.kind.replace("solid_", ""));
    return (
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <IsometricSolidView
          solidShape={solidShape}
          emphasis={emphasis}
          fitVariant={fitVariant}
          measureKey={fitMeasureKey}
        />
      </DiagramFrame>
    );
  }

  if (spec.kind === "transformation_translate") {
    const points = shapeTemplatePointsString(spec.template || "square", { x: 130, y: 142 });
    const ghostPoints = shapeTemplatePointsString(spec.template || "square", { x: 210, y: 142 });
    return (
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          {points ? (
            <polygon points={points} fill={ST.fillShape} stroke={ST.stroke} strokeWidth="2.4" />
          ) : null}
          {ghostPoints ? (
            <polygon
              points={ghostPoints}
              fill="rgba(253, 224, 71, 0.1)"
              stroke={ST.strokeHi}
              strokeWidth="2"
              strokeDasharray="6 4"
              className={preset === GEOMETRY_ANIMATION_PRESETS.translateGhost ? "geo-animate-grid" : undefined}
            />
          ) : null}
          <line x1="210" y1="142" x2="250" y2="142" stroke={ST.strokeHi} strokeWidth="3" markerEnd="url(#geo-arrow)" />
          <defs>
            <marker id="geo-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={ST.strokeHi} />
            </marker>
          </defs>
          <SvgText x="180" y="28" variant="note">
            הזזה - אותה צורה במיקום חדש
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "transformation_reflect") {
    const points = shapeTemplatePointsString(spec.template || "square", { x: 120, y: 142 });
    const mirrorPoints = shapeTemplatePointsString(spec.template || "square", { x: 240, y: 142 });
    return (
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          <line x1="180" y1="60" x2="180" y2="220" stroke={ST.strokeHi} strokeWidth="2" strokeDasharray="8 5" />
          {points ? (
            <polygon points={points} fill={ST.fillShape} stroke={ST.stroke} strokeWidth="2.4" />
          ) : null}
          {mirrorPoints ? (
            <polygon
              points={mirrorPoints}
              fill="rgba(253, 224, 71, 0.12)"
              stroke={ST.strokeHi}
              strokeWidth="2.4"
            />
          ) : null}
          <SvgText x="180" y="28" variant="note">
            שיקוף - תמונה מול קו המראה
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  if (spec.kind === "rotation_step") {
    const angle = spec.angle || 90;
    const points = shapeTemplatePointsString(spec.template || "square", { x: 180, y: 150 });
    return (
      <DiagramFrame {...frameProps}>
        <DiagramAnimationStyles />
        <GeometryDiagramFitSvg variant={fitVariant} measureKey={fitMeasureKey} stepId={stepId}>
          <circle cx="180" cy="150" r="4" fill={ST.strokeHi} />
          <path
            d="M 220 150 A 40 40 0 0 0 180 110"
            fill="none"
            stroke={ST.strokeHi}
            strokeWidth="2.5"
            className={preset === GEOMETRY_ANIMATION_PRESETS.rotateArc ? "geo-animate-draw" : undefined}
          />
          {points ? (
            <g
              style={{
                transformOrigin: "180px 150px",
                transform: `rotate(${angle}deg)`,
              }}
            >
              <polygon points={points} fill={ST.fillShape} stroke={ST.stroke} strokeWidth="2.4" />
            </g>
          ) : null}
          <SvgText x="180" y="28" variant="note">
            סיבוב {angle}° סביב נקודת מרכז
          </SvgText>
        </GeometryDiagramFitSvg>
      </DiagramFrame>
    );
  }

  return null;
}
