import MixedHebrewMathText from "./MixedHebrewMathText";
import BookContentLine from "./BookContentLine";
import BookVerticalArithmetic from "./BookVerticalArithmetic";
import { classifyBookLine } from "../../lib/learning-book/book-line-classifier";
import { isVerticalArithmeticBlock } from "../../lib/learning-book/vertical-arithmetic-parse";
import {
  bookMathIsolateStyle,
  diagramTextSizeClass,
  isMathLikeText,
} from "../../lib/learning-book/book-math-display";
import {
  detectDiagramType,
  inferDiagramEquation,
  inferEquationFromObjectVisual,
  parseDiagramNumberRow,
  parseNumberLineTokens,
  parseObjectDiagramGroups,
  parsePlaceValueDiagram,
} from "../../lib/learning-book/diagram-detect";
import { stripStrayMarkdown } from "../../lib/learning-book/parse-inline-markdown";
import { useBookGradeTheme } from "./BookGradeThemeContext";

function Dot({ kind = "dot" }) {
  const theme = useBookGradeTheme().classes;
  if (kind === "cross") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 sm:h-5 sm:w-5"
        aria-hidden="true"
      >
        ✕
      </span>
    );
  }
  if (kind === "star") {
    return (
      <span className="text-xl text-amber-300 sm:text-2xl" aria-hidden="true">
        ★
      </span>
    );
  }
  return (
    <span
      className={`inline-block h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4 ${theme.diagramDot}`}
      aria-hidden="true"
    />
  );
}

function isNumberLineRow(line) {
  return /\d+\s*[-–\-]\s*\d+/.test(line) || /^…/.test(line);
}

function isJumpAnnotation(line) {
  if (isNumberLineRow(line)) return false;
  return (
    /^[↑↓←→_]/.test(line) ||
    /(?:^|\s)[↑↓←→]/.test(line) ||
    /_{2,}/.test(line)
  );
}

function NumberLineJump({ line }) {
  const theme = useBookGradeTheme().classes;
  const cleaned = line.replace(/^[\s_↑↓←→]+/, "").trim();
  const arrow = line.includes("←")
    ? "←"
    : line.includes("↓")
      ? "↓"
      : line.includes("↑")
        ? "↑"
        : "→";

  return (
    <div
      className="mx-auto mt-2 flex max-w-full flex-col items-center gap-1 text-center"
      dir="rtl"
    >
      <span
        className={`text-2xl font-bold sm:text-3xl ${theme.diagramAccentStrong}`}
        dir="ltr"
        style={bookMathIsolateStyle}
        aria-hidden="true"
      >
        {arrow}
      </span>
      {cleaned ? (
        <p className={`text-sm sm:text-base ${theme.diagramAccentMuted}`}>
          <MixedHebrewMathText text={cleaned.replace(/^[↑↓←→]\s*/, "")} />
        </p>
      ) : null}
    </div>
  );
}

function NumberLineDiagram({ lines }) {
  /** @type {{ row: string, jump?: string }[]} */
  const groups = [];
  let current = null;

  for (const line of lines) {
    if (isNumberLineRow(line)) {
      current = { row: line };
      groups.push(current);
      continue;
    }
    if (isJumpAnnotation(line) && current) {
      current.jump = line;
      current = null;
      continue;
    }
    if (isJumpAnnotation(line)) {
      groups.push({ row: "", jump: line });
    }
  }

  if (!groups.length) {
    return lines.map((line, i) =>
      isNumberLineRow(line) ? (
        <NumberLineRow key={i} line={line} />
      ) : null
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g, i) => (
        <div key={i} className="space-y-1">
          {g.row ? <NumberLineRow line={g.row} /> : null}
          {g.jump ? <NumberLineJump line={g.jump} /> : null}
        </div>
      ))}
    </div>
  );
}

function NumberLineRow({ line }) {
  const theme = useBookGradeTheme().classes;
  const tokens = parseNumberLineTokens(line);
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-0.5 gap-y-1 sm:gap-x-1"
      dir="ltr"
      style={bookMathIsolateStyle}
    >
      {tokens.map((tok, i) => (
        <span key={i} className="inline-flex items-center gap-x-0.5 sm:gap-x-1">
          {i > 0 && tok.type !== "ellipsis" && (
            <span className="px-0.5 text-sm text-[color:var(--book-text-muted)] sm:text-base">-</span>
          )}
          {tok.type === "num" ? (
            <span
              className={`min-w-[1.25rem] rounded-lg px-1 py-0.5 text-center text-sm font-bold tabular-nums sm:min-w-[1.5rem] sm:text-base ${
                tok.highlight
                  ? theme.diagramHighlightCell
                  : theme.diagramSecondary
              }`}
            >
              {tok.value}
            </span>
          ) : tok.type === "ellipsis" ? (
            <span className="px-1 text-[color:var(--book-text-muted)]">…</span>
          ) : (
            <span className="text-sm text-[color:var(--book-text)]">{tok.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

/** Unified RTL diagram rows: fixed label column, gap, consistent math/body column. */
const DIAGRAM_LINE_LAYOUT_CLASS = [
  "w-full",
  "[&_.book-mixed-line-body]:flex",
  "[&_.book-mixed-line-body]:w-full",
  "[&_.book-mixed-line-body]:max-w-full",
  "[&_.book-mixed-line-body]:flex-row",
  "[&_.book-mixed-line-body]:items-baseline",
  "[&_[data-book-label]]:w-[3rem]",
  "[&_[data-book-label]]:shrink-0",
  "[&_[data-book-label]]:text-right",
  "[&_[data-book-label-gap]]:w-[0.5em]",
  "[&_[data-book-label-gap]]:min-w-[0.5em]",
  "[&_[data-book-label-gap]]:shrink-0",
].join(" ");

function DiagramCodeLineRow({ children, dir = "rtl", className = "" }) {
  return (
    <div
      className={`book-diagram-line block ${DIAGRAM_LINE_LAYOUT_CLASS} ${className}`.trim()}
      data-book-diagram-line="true"
      dir={dir}
    >
      {children}
    </div>
  );
}

function DiagramEquationLine({ equation }) {
  const theme = useBookGradeTheme().classes;
  if (!equation) return null;
  return (
    <DiagramCodeLineRow dir="rtl" className={`mt-1 text-base font-bold sm:text-lg ${theme.diagramAccent}`}>
      <MixedHebrewMathText text={equation} />
    </DiagramCodeLineRow>
  );
}

function DiagramNumberRow({ numbers, equation }) {
  if (equation) {
    return <DiagramEquationLine equation={equation} />;
  }

  const columns = numbers.length;
  const gapClass =
    columns >= 3
      ? "gap-x-10 sm:gap-x-14"
      : columns === 2
        ? "gap-x-16 sm:gap-x-20"
        : "gap-x-8";

  return (
    <div className="space-y-2 text-center">
      <div
        className={`flex flex-wrap items-center justify-center ${gapClass}`}
        dir="ltr"
        style={bookMathIsolateStyle}
      >
        {numbers.map((n, i) => (
          <bdi
            key={i}
            className="inline-block min-w-[2rem] text-center text-base font-bold tabular-nums text-[color:var(--book-text)] sm:min-w-[2.5rem] sm:text-lg"
          >
            {n}
          </bdi>
        ))}
      </div>
      {equation ? (
        <p className="text-sm font-semibold text-[color:var(--book-accent)]/90 sm:text-base">
          <MixedHebrewMathText text={equation} />
        </p>
      ) : null}
    </div>
  );
}

function ObjectDiagram({ lines }) {
  const theme = useBookGradeTheme().classes;
  /** @type {string|null} */
  let lastVisualLine = null;

  return (
    <div className="space-y-4" dir="ltr" style={bookMathIsolateStyle}>
      {lines.map((line, li) => {
        const numberRow = parseDiagramNumberRow(line);
        if (numberRow) {
          if (inferEquationFromObjectVisual(lastVisualLine)) {
            return null;
          }
          const equation =
            inferDiagramEquation(lastVisualLine, numberRow) ||
            inferEquationFromObjectVisual(lastVisualLine);
          if (equation) {
            return <DiagramEquationLine key={li} equation={equation} />;
          }
          return (
            <DiagramNumberRow
              key={li}
              numbers={numberRow}
              equation={null}
            />
          );
        }

        if (/^[↑↓←→]/.test(line) || /^_/.test(line) || /↑/.test(line)) {
          return (
            <p
              key={li}
              className={`text-center text-sm sm:text-base ${theme.diagramAccentSoft}`}
            >
              <MixedHebrewMathText text={line.replace(/^[\s↑↓←→_]+/, "↑ ")} />
            </p>
          );
        }

        const groups = parseObjectDiagramGroups(line);
        const hasDots = groups.some((g) => g.type === "dots" || g.type === "cross");

        if (!hasDots) {
          return (
            <p key={li} className="text-center text-sm text-[color:var(--book-text)] sm:text-base">
              <MixedHebrewMathText text={line} />
            </p>
          );
        }

        lastVisualLine = line;
        const labelParts = line.split(/\s+←\s*/);
        const mainLine = labelParts[0];
        const tailLabel = labelParts.length > 1 ? `← ${labelParts.slice(1).join(" ← ")}` : null;
        const mainGroups = parseObjectDiagramGroups(mainLine);
        const equation = inferEquationFromObjectVisual(mainLine);

        return (
          <div key={li} className="space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4">
              {mainGroups.map((g, gi) => {
              if (g.type === "dots") {
                const isStar = g.value[0] === "★";
                return (
                  <span key={gi} className="inline-flex flex-wrap gap-1 sm:gap-1.5">
                    {g.value.map((_, di) => (
                      <Dot key={di} kind={isStar ? "star" : "dot"} />
                    ))}
                  </span>
                );
              }
              if (g.type === "cross") {
                return (
                  <span key={gi} className="inline-flex flex-wrap gap-1 sm:gap-1.5">
                    {g.value.map((_, di) => (
                      <Dot key={di} kind="cross" />
                    ))}
                  </span>
                );
              }
              if (g.type === "op") {
                return (
                  <span
                    key={gi}
                    className="px-1 text-xl font-black text-amber-600 sm:text-2xl"
                  >
                    {g.value}
                  </span>
                );
              }
              if (g.type === "num") {
                return (
                  <span
                    key={gi}
                    className="min-w-[1.5rem] text-center text-base font-bold tabular-nums text-[color:var(--book-text)] sm:text-lg"
                  >
                    {g.value}
                  </span>
                );
              }
              return (
                <span key={gi} className="text-xs text-[color:var(--book-text-muted)] sm:text-sm">
                  {g.value}
                </span>
              );
            })}
            </div>
            {tailLabel ? (
              <p className="text-center text-sm text-[color:var(--book-text-muted)] sm:text-base" dir="rtl">
                <MixedHebrewMathText text={tailLabel} />
              </p>
            ) : null}
            <DiagramEquationLine equation={equation} />
          </div>
        );
      })}
    </div>
  );
}

function CardsDiagram({ lines }) {
  const theme = useBookGradeTheme().classes;
  return (
    <div className="space-y-3" dir="rtl">
      {lines.map((line, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
          dir="ltr"
          style={bookMathIsolateStyle}
        >
          {line.split(/\s+/).map((part, pi) => {
            const inner = part.replace(/^\[/, "").replace(/\]$/, "").replace(/^●/, "");
            const active = part.includes("●") || part.includes("↑");
            return (
              <span
                key={pi}
                className={`rounded-xl border px-2 py-1.5 text-xs font-semibold sm:px-3 sm:py-2 sm:text-sm ${
                  active
                    ? theme.diagramHighlightBorder
                    : "border-[color:var(--book-divider)] bg-[color:var(--book-surface-soft)] text-[color:var(--book-text)]"
                }`}
              >
                {inner}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CoinsDiagram({ lines }) {
  /** @type {string|null} */
  let lastVisualLine = null;

  return (
    <div className="space-y-3" dir="ltr" style={bookMathIsolateStyle}>
      {lines.map((line, i) => {
        const numberRow = parseDiagramNumberRow(line);
        if (numberRow) {
          if (inferEquationFromObjectVisual(lastVisualLine)) {
            return null;
          }
          const equation =
            inferDiagramEquation(lastVisualLine, numberRow) ||
            inferEquationFromObjectVisual(lastVisualLine);
          if (equation) {
            return <DiagramEquationLine key={i} equation={equation} />;
          }
          return (
            <DiagramNumberRow key={i} numbers={numberRow} equation={null} />
          );
        }

        lastVisualLine = line;
        return (
          <div
            key={i}
            className="flex flex-wrap items-center justify-center gap-2 text-base font-semibold sm:text-lg"
          >
            <MixedHebrewMathText text={line} />
          </div>
        );
      })}
    </div>
  );
}

function FrameTextDiagram({ lines }) {
  return (
    <div className="space-y-2 rounded-xl border border-[color:var(--book-divider)] bg-[color:var(--book-surface-soft)] p-3 sm:p-4" dir="rtl">
      {lines.map((line, i) => (
        <DiagramCodeLineRow key={i} dir="rtl" className="text-right text-base sm:text-lg">
          <MixedHebrewMathText text={line} diagramLayout />
        </DiagramCodeLineRow>
      ))}
    </div>
  );
}

function PlaceValueDiagram({ parsed }) {
  const theme = useBookGradeTheme().classes;
  const { columns, equation } = parsed;

  return (
    <div className="space-y-3" dir="ltr" style={bookMathIsolateStyle}>
      <div
        className="mx-auto flex w-fit max-w-full flex-row items-stretch justify-center gap-2 sm:gap-3"
        role="table"
        aria-label="טבלת ערך מקום"
      >
        {columns.map((col, i) => (
          <div
            key={`${col.label}-${i}`}
            className={`flex min-w-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 sm:min-w-[5.5rem] sm:px-4 sm:py-4 ${theme.diagramColumn}`}
            role="cell"
          >
            <span
              className={`text-center text-sm font-semibold leading-snug sm:text-base ${theme.diagramColumnLabel}`}
              dir="rtl"
            >
              {col.label}
            </span>
            <span className="text-center text-2xl font-bold tabular-nums text-[color:var(--book-text)] sm:text-3xl">
              {col.digit}
            </span>
          </div>
        ))}
      </div>
      {equation ? (
        <p className={`text-center text-base font-bold sm:text-lg ${theme.diagramAccent}`}>
          = {equation}
        </p>
      ) : null}
    </div>
  );
}

function FrameDiagram({ lines }) {
  const theme = useBookGradeTheme().classes;
  const sizeClass = diagramTextSizeClass(lines.join("\n"));
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const cleaned = stripStrayMarkdown(line);
        if (/[\u0590-\u05FF]/.test(cleaned)) {
          return <MixedDiagramLine key={i} line={cleaned} sizeClass={sizeClass} />;
        }
        return (
          <DiagramCodeLineRow key={i} dir="ltr">
            <bdi
              dir="ltr"
              style={bookMathIsolateStyle}
              className={`font-medium tabular-nums ${theme.diagramSecondaryMuted} ${sizeClass}`}
            >
              {cleaned}
            </bdi>
          </DiagramCodeLineRow>
        );
      })}
    </div>
  );
}

function isMixedHebrewMathLine(line) {
  const text = stripStrayMarkdown(String(line || "").trim());
  return /[\u0590-\u05FF]/.test(text) && /\d/.test(text);
}

function isPureMathDiagramLine(line) {
  const text = stripStrayMarkdown(String(line || "").trim());
  if (!text) return false;
  if (/[\u0590-\u05FF]/.test(text)) return false;
  return isMathLikeText(text) || /^=?\s*\d/.test(text);
}

function MixedDiagramLine({ line, sizeClass = "" }) {
  const theme = useBookGradeTheme().classes;
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  const textSize = sizeClass || "text-base sm:text-lg";

  if (classifyBookLine(trimmed, { context: "diagram" }) === "place_value_equation") {
    return (
      <DiagramCodeLineRow dir="ltr" className={textSize}>
        <BookContentLine text={trimmed} context="diagram" />
      </DiagramCodeLineRow>
    );
  }

  if (isMixedHebrewMathLine(trimmed)) {
    return (
      <DiagramCodeLineRow dir="rtl" className={textSize}>
        <BookContentLine text={trimmed} context="diagram" />
      </DiagramCodeLineRow>
    );
  }

  if (isPureMathDiagramLine(trimmed)) {
    return (
      <DiagramCodeLineRow dir="rtl" className={textSize}>
        <BookContentLine text={trimmed} context="diagram" />
      </DiagramCodeLineRow>
    );
  }

  return (
    <DiagramCodeLineRow dir="rtl" className={`${textSize} ${theme.diagramSecondaryMuted}`}>
      <BookContentLine text={trimmed} context="diagram" />
    </DiagramCodeLineRow>
  );
}

function GenericDiagram({ content }) {
  if (isVerticalArithmeticBlock(content)) {
    return <BookVerticalArithmetic content={content} />;
  }

  const lines = String(content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const sizeClass = diagramTextSizeClass(content);

  return (
    <div className="space-y-1">
      {lines.map((line, i) => (
        <MixedDiagramLine key={i} line={line} sizeClass={sizeClass} />
      ))}
    </div>
  );
}

export default function BookDiagram({ content }) {
  const theme = useBookGradeTheme().classes;
  const lines = String(content || "")
    .split("\n")
    .map((l) => stripStrayMarkdown(l.trim()))
    .filter(Boolean);
  const kind = detectDiagramType(content);
  const placeValue = kind === "place_value" ? parsePlaceValueDiagram(content) : null;
  const verticalArithmetic = isVerticalArithmeticBlock(content);

  return (
    <div
      className={`my-4 rounded-2xl border px-3 py-5 sm:px-6 sm:py-6 ${theme.diagramPanel}`}
      role="img"
      aria-label="דוגמה"
    >
      {verticalArithmetic && <BookVerticalArithmetic content={content} />}
      {!verticalArithmetic && kind === "number_line" && <NumberLineDiagram lines={lines} />}
      {!verticalArithmetic && kind === "objects" && <ObjectDiagram lines={lines} />}
      {!verticalArithmetic && kind === "cards" && <CardsDiagram lines={lines} />}
      {!verticalArithmetic && kind === "coins" && <CoinsDiagram lines={lines} />}
      {!verticalArithmetic && kind === "frame_text" && <FrameTextDiagram lines={lines} />}
      {!verticalArithmetic && kind === "place_value" && placeValue && <PlaceValueDiagram parsed={placeValue} />}
      {!verticalArithmetic && kind === "frame" && <FrameDiagram lines={lines} />}
      {!verticalArithmetic && kind === "generic" && <GenericDiagram content={content} />}
    </div>
  );
}
