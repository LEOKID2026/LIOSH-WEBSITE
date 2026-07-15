import MixedHebrewMathText from "./MixedHebrewMathText";
import { bookMathIsolateStyle } from "../../lib/learning-book/book-math-display";
import {
  GEOMETRY_DIAGRAM_LABELS,
  isKnownGeometryDiagramType,
} from "../../lib/learning-book/geometry-diagram-registry";
import { useBookGradeTheme } from "./BookGradeThemeContext";

const TRIANGLE = "110,28 188,142 32,142";
const PARALLELOGRAM = "40,120 140,120 170,50 70,50";
const TRAPEZOID = "60,130 160,130 140,50 80,50";

function HebrewLabel({ text, x, y, anchor = "middle" }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="fill-current text-[11px] font-semibold sm:text-xs"
      dir="rtl"
    >
      {text}
    </text>
  );
}

function MathMeasure({ text, x, y }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className="fill-current text-[10px] font-semibold tabular-nums sm:text-[11px]"
      dir="ltr"
      style={bookMathIsolateStyle}
    >
      {text}
    </text>
  );
}

function VertexDot({ cx, cy, theme }) {
  return (
    <circle cx={cx} cy={cy} r={4.5} fill="currentColor" className={theme.diagramAccentStrong} />
  );
}

function DiagramSvg({ label, children, viewBox = "0 0 220 170" }) {
  return (
    <svg
      viewBox={viewBox}
      className="mx-auto h-auto w-full max-w-[280px]"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

function DashedPerimeterOutline({ points, theme }) {
  return (
    <polygon
      points={points}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeDasharray="7 5"
      className={theme.diagramAccentStrong}
    />
  );
}

function SolidShapeOutline({ points, theme, fillOpacity = 0.06 }) {
  return (
    <polygon
      points={points}
      fill="currentColor"
      fillOpacity={fillOpacity}
      stroke="currentColor"
      strokeWidth="2.5"
      className={theme.diagramAccent}
    />
  );
}

function TrianglePartsDiagram({ theme }) {
  return (
    <DiagramSvg label="משולש עם צלעות וקודקודים">
      <SolidShapeOutline points={TRIANGLE} theme={theme} fillOpacity={0} />
      <VertexDot cx={110} cy={28} theme={theme} />
      <VertexDot cx={188} cy={142} theme={theme} />
      <VertexDot cx={32} cy={142} theme={theme} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.side} x={110} y={14} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.vertex} x={110} y={48} />
    </DiagramSvg>
  );
}

function TrianglePerimeterDiagram({ theme }) {
  return (
    <DiagramSvg label="היקף משולש">
      <SolidShapeOutline points={TRIANGLE} theme={theme} fillOpacity={0.04} />
      <DashedPerimeterOutline points={TRIANGLE} theme={theme} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.perimeter} x={110} y={16} />
    </DiagramSvg>
  );
}

function TriangleHeightDiagram({ theme }) {
  return (
    <DiagramSvg label="גובה במשולש">
      <SolidShapeOutline points={TRIANGLE} theme={theme} />
      <line
        x1="110"
        y1="28"
        x2="110"
        y2="142"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5 4"
        className={theme.diagramAccentStrong}
      />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.height} x={126} y={88} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.base} x={110} y={158} />
    </DiagramSvg>
  );
}

function RightTriangleDiagram({ theme }) {
  return (
    <DiagramSvg label="משולש ישר זווית">
      <polygon
        points="40,140 170,140 40,50"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeWidth="2.5"
        className={theme.diagramAccent}
      />
      <rect
        x="40"
        y="120"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={theme.diagramAccentSoft}
      />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.rightAngle} x={110} y={24} />
    </DiagramSvg>
  );
}

function QuadrilateralPartsDiagram({ theme }) {
  return (
    <DiagramSvg label="מרובע עם צלעות וקודקודים">
      <SolidShapeOutline points="48,40 172,40 188,140 32,140" theme={theme} fillOpacity={0} />
      <VertexDot cx={48} cy={40} theme={theme} />
      <VertexDot cx={172} cy={40} theme={theme} />
      <VertexDot cx={188} cy={140} theme={theme} />
      <VertexDot cx={32} cy={140} theme={theme} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.side} x={110} y={28} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.vertex} x={48} y={56} />
    </DiagramSvg>
  );
}

function RectangleSidesDiagram({ theme }) {
  return (
    <DiagramSvg label="מלבן עם אורך ורוחב">
      <rect
        x="50"
        y="42"
        width="120"
        height="80"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className={theme.diagramAccent}
        rx="2"
      />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.length} x={110} y={32} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.width} x={28} y={86} anchor="end" />
    </DiagramSvg>
  );
}

function RectangleDiagonalDiagram({ theme }) {
  return (
    <DiagramSvg label="מלבן עם אלכסון">
      <rect
        x="50"
        y="42"
        width="120"
        height="80"
        fill="currentColor"
        fillOpacity="0.05"
        stroke="currentColor"
        strokeWidth="2.5"
        className={theme.diagramAccent}
        rx="2"
      />
      <line x1="50" y1="122" x2="170" y2="42" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className={theme.diagramAccentStrong} />
    </DiagramSvg>
  );
}

function SquareSidesDiagram({ theme }) {
  return (
    <DiagramSvg label="ריבוע עם צלעות">
      <rect
        x="60"
        y="38"
        width="100"
        height="100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className={theme.diagramAccent}
        rx="2"
      />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.side} x={110} y={28} />
    </DiagramSvg>
  );
}

function SquarePerimeterDiagram({ theme }) {
  return (
    <DiagramSvg label="היקף ריבוע">
      <rect
        x="60"
        y="38"
        width="100"
        height="100"
        fill="currentColor"
        fillOpacity="0.04"
        stroke="currentColor"
        strokeWidth="2"
        className={theme.diagramSecondary}
        rx="2"
      />
      <rect
        x="60"
        y="38"
        width="100"
        height="100"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="7 5"
        className={theme.diagramAccentStrong}
        rx="2"
      />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.perimeter} x={110} y={24} />
    </DiagramSvg>
  );
}

function SquareDiagonalDiagram({ theme }) {
  return (
    <DiagramSvg label="ריבוע עם אלכסון">
      <rect
        x="60"
        y="38"
        width="100"
        height="100"
        fill="currentColor"
        fillOpacity="0.05"
        stroke="currentColor"
        strokeWidth="2.5"
        className={theme.diagramAccent}
        rx="2"
      />
      <line x1="60" y1="138" x2="160" y2="38" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className={theme.diagramAccentStrong} />
    </DiagramSvg>
  );
}

function SquareAreaGridDiagram({ theme }) {
  const cells = [];
  const size = 4;
  const cell = 22;
  const originX = 62;
  const originY = 44;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={originX + col * cell}
          y={originY + row * cell}
          width={cell - 2}
          height={cell - 2}
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="1.5"
          className={theme.diagramAccent}
        />
      );
    }
  }
  return (
    <DiagramSvg label="שטח ריבוע - ריבועי יחידה">
      {cells}
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.area} x={110} y={24} />
      <MathMeasure text="4 × 4 = 16" x={110} y={156} />
    </DiagramSvg>
  );
}

function ParallelogramOutline({ theme, fillOpacity = 0.06 }) {
  return <SolidShapeOutline points={PARALLELOGRAM} theme={theme} fillOpacity={fillOpacity} />;
}

function ParallelogramHeightDiagram({ theme }) {
  return (
    <DiagramSvg label="גובה במקבילית">
      <ParallelogramOutline theme={theme} />
      <line x1="105" y1="50" x2="105" y2="120" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" className={theme.diagramAccentStrong} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.height} x={122} y={88} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.base} x={90} y={148} />
    </DiagramSvg>
  );
}

function ParallelogramAreaDiagram({ theme }) {
  return (
    <DiagramSvg label="שטח מקבילית">
      <ParallelogramOutline theme={theme} />
      <line x1="40" y1="120" x2="140" y2="120" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccentStrong} />
      <line x1="105" y1="50" x2="105" y2="120" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" className={theme.diagramAccentStrong} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.base} x={90} y={148} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.height} x={122} y={88} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.area} x={110} y={20} />
    </DiagramSvg>
  );
}

function ParallelogramDiagonalDiagram({ theme }) {
  return (
    <DiagramSvg label="מקבילית עם אלכסון">
      <ParallelogramOutline theme={theme} />
      <line x1="40" y1="120" x2="170" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" className={theme.diagramAccentStrong} />
    </DiagramSvg>
  );
}

function TrapezoidOutline({ theme, fillOpacity = 0.06 }) {
  return <SolidShapeOutline points={TRAPEZOID} theme={theme} fillOpacity={fillOpacity} />;
}

function TrapezoidHeightDiagram({ theme }) {
  return (
    <DiagramSvg label="גובה בטרפז">
      <TrapezoidOutline theme={theme} />
      <line x1="110" y1="50" x2="110" y2="130" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" className={theme.diagramAccentStrong} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.height} x={126} y={92} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.base} x={110} y={152} />
    </DiagramSvg>
  );
}

function TrapezoidAreaDiagram({ theme }) {
  return (
    <DiagramSvg label="שטח טרפז">
      <TrapezoidOutline theme={theme} />
      <line x1="60" y1="130" x2="160" y2="130" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccentStrong} />
      <line x1="110" y1="50" x2="110" y2="130" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" className={theme.diagramAccentStrong} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.base} x={110} y={152} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.height} x={126} y={92} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.area} x={110} y={20} />
    </DiagramSvg>
  );
}

function RightAngleDiagram({ theme }) {
  return (
    <DiagramSvg label="זווית ישרה">
      <line x1="40" y1="130" x2="180" y2="130" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <line x1="40" y1="130" x2="40" y2="36" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <rect x="40" y="110" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" className={theme.diagramAccentSoft} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.rightAngle} x={110} y={24} />
    </DiagramSvg>
  );
}

function AngleBasicDiagram({ theme }) {
  return (
    <DiagramSvg label="זווית עם שתי קרניים">
      <line x1="110" y1="120" x2="36" y2="48" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <line x1="110" y1="120" x2="184" y2="48" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <VertexDot cx={110} cy={120} theme={theme} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.angle} x={110} y={28} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.vertex} x={110} y={140} />
    </DiagramSvg>
  );
}

function SymmetryLineDiagram({ theme }) {
  return (
    <DiagramSvg label="קו סימטריה">
      <SolidShapeOutline points={TRIANGLE} theme={theme} />
      <line x1="110" y1="22" x2="110" y2="148" stroke="currentColor" strokeWidth="2" strokeDasharray="6 5" className={theme.diagramAccentStrong} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.symmetryLine} x={110} y={14} />
    </DiagramSvg>
  );
}

function ParallelLinesDiagram({ theme }) {
  return (
    <DiagramSvg label="קווים מקבילים">
      <line x1="32" y1="58" x2="188" y2="58" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <line x1="32" y1="108" x2="188" y2="108" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.parallelLines} x={110} y={24} />
    </DiagramSvg>
  );
}

function CircleRadiusDiagram({ theme }) {
  return (
    <DiagramSvg label="מעגל עם רדיוס">
      <circle cx="110" cy="92" r="52" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <line x1="110" y1="92" x2="162" y2="92" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccentStrong} />
      <VertexDot cx={110} cy={92} theme={theme} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.radius} x={110} y={24} />
    </DiagramSvg>
  );
}

function CirclePerimeterDiagram({ theme }) {
  return (
    <DiagramSvg label="היקף מעגל">
      <circle cx="110" cy="92" r="52" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" className={theme.diagramSecondary} />
      <circle
        cx="110"
        cy="92"
        r="52"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="7 5"
        className={theme.diagramAccentStrong}
      />
      <line x1="110" y1="92" x2="152" y2="92" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <VertexDot cx={110} cy={92} theme={theme} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.perimeter} x={110} y={18} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.radius} x={168} y={96} />
    </DiagramSvg>
  );
}

function CircleAreaDiagram({ theme }) {
  return (
    <DiagramSvg label="שטח עיגול">
      <circle cx="110" cy="92" r="52" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccent} />
      <line x1="110" y1="92" x2="162" y2="92" stroke="currentColor" strokeWidth="2.5" className={theme.diagramAccentStrong} />
      <VertexDot cx={110} cy={92} theme={theme} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.area} x={110} y={18} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.radius} x={168} y={96} />
    </DiagramSvg>
  );
}

function CubeBasicDiagram({ theme }) {
  return (
    <DiagramSvg label="קובייה">
      <polygon points="70,90 130,90 150,70 90,70" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <polygon points="70,90 70,130 130,130 130,90" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <polygon points="130,90 150,70 150,110 130,130" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2" className={theme.diagramAccentSoft} />
      <line x1="70" y1="90" x2="90" y2="70" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <line x1="130" y1="90" x2="150" y2="70" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <line x1="70" y1="130" x2="90" y2="110" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <line x1="130" y1="130" x2="150" y2="110" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
    </DiagramSvg>
  );
}

function BoxBasicDiagram({ theme }) {
  return (
    <DiagramSvg label="תיבה">
      <polygon points="52,96 148,96 168,72 72,72" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <polygon points="52,96 52,144 148,144 148,96" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <polygon points="148,96 168,72 168,120 148,144" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2" className={theme.diagramAccentSoft} />
      <line x1="52" y1="96" x2="72" y2="72" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <line x1="148" y1="96" x2="168" y2="72" stroke="currentColor" strokeWidth="2" className={theme.diagramAccent} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.length} x={100} y={64} />
      <HebrewLabel text={GEOMETRY_DIAGRAM_LABELS.width} x={182} y={108} />
    </DiagramSvg>
  );
}

const DIAGRAM_RENDERERS = Object.freeze({
  triangle_parts: TrianglePartsDiagram,
  triangle_perimeter: TrianglePerimeterDiagram,
  triangle_height: TriangleHeightDiagram,
  right_triangle: RightTriangleDiagram,
  quadrilateral_parts: QuadrilateralPartsDiagram,
  rectangle_sides: RectangleSidesDiagram,
  rectangle_diagonal: RectangleDiagonalDiagram,
  square_sides: SquareSidesDiagram,
  square_perimeter: SquarePerimeterDiagram,
  square_diagonal: SquareDiagonalDiagram,
  square_area_grid: SquareAreaGridDiagram,
  parallelogram_height: ParallelogramHeightDiagram,
  parallelogram_area: ParallelogramAreaDiagram,
  parallelogram_diagonal: ParallelogramDiagonalDiagram,
  trapezoid_height: TrapezoidHeightDiagram,
  trapezoid_area: TrapezoidAreaDiagram,
  right_angle: RightAngleDiagram,
  angle_basic: AngleBasicDiagram,
  symmetry_line: SymmetryLineDiagram,
  parallel_lines: ParallelLinesDiagram,
  circle_radius: CircleRadiusDiagram,
  circle_perimeter: CirclePerimeterDiagram,
  circle_area: CircleAreaDiagram,
  cube_basic: CubeBasicDiagram,
  box_basic: BoxBasicDiagram,
  area_grid: SquareAreaGridDiagram,
  perimeter_path: SquarePerimeterDiagram,
});

export default function GeometryDiagram({ type, options = {} }) {
  const theme = useBookGradeTheme().classes;
  const diagramType = String(type || "").trim();

  if (!isKnownGeometryDiagramType(diagramType)) {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div
          className={`my-4 rounded-xl border border-dashed px-4 py-3 text-center text-sm ${theme.diagramPanel}`}
          data-geometry-diagram-unknown={diagramType || "empty"}
        >
          [פיתוח] דיאגרמת גאומטריה לא מוכרת: {diagramType || "(ריק)"}
        </div>
      );
    }
    return null;
  }

  const Renderer = DIAGRAM_RENDERERS[diagramType];

  return (
    <figure
      data-geometry-diagram-type={diagramType}
      className={`my-4 w-full max-w-full overflow-hidden rounded-2xl border px-3 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-6 sm:py-6 ${theme.diagramPanel} ${theme.diagramAccent}`}
    >
      <Renderer theme={theme} />
      {options.caption === "1" || options.caption === "true" ? (
        options.label ? (
          <figcaption className="mt-3 text-center text-sm font-semibold sm:text-base" dir="rtl">
            <MixedHebrewMathText text={options.label} />
          </figcaption>
        ) : null
      ) : null}
    </figure>
  );
}
