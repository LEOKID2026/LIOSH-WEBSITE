import MixedHebrewMathText from "./MixedHebrewMathText";
import {
  bookMathIsolateStyle,
  diagramTextSizeClass,
} from "../../lib/learning-book/book-math-display";
import {
  detectDiagramType,
  parseNumberLineTokens,
  parseObjectDiagramGroups,
} from "../../lib/learning-book/diagram-detect";

function Dot({ kind = "dot" }) {
  if (kind === "cross") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500/25 text-xs font-bold text-red-300 sm:h-5 sm:w-5"
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
      className="inline-block h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)] sm:h-4 sm:w-4"
      aria-hidden="true"
    />
  );
}

function NumberLineRow({ line }) {
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
            <span className="px-0.5 text-sm text-white/35 sm:text-base">—</span>
          )}
          {tok.type === "num" ? (
            <span
              className={`min-w-[1.25rem] rounded-lg px-1 py-0.5 text-center text-sm font-bold tabular-nums sm:min-w-[1.5rem] sm:text-base ${
                tok.highlight
                  ? "bg-emerald-500/35 text-emerald-50 ring-1 ring-emerald-400/40"
                  : "text-violet-50"
              }`}
            >
              {tok.value}
            </span>
          ) : tok.type === "ellipsis" ? (
            <span className="px-1 text-white/50">…</span>
          ) : (
            <span className="text-sm text-white/70">{tok.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function ObjectDiagram({ lines }) {
  return (
    <div className="space-y-4" dir="ltr" style={bookMathIsolateStyle}>
      {lines.map((line, li) => {
        if (/^[↑↓←→]/.test(line) || /^_/.test(line) || /↑/.test(line)) {
          return (
            <p
              key={li}
              className="text-center text-sm text-emerald-200/80 sm:text-base"
            >
              <MixedHebrewMathText text={line.replace(/^[\s↑↓←→_]+/, "↑ ")} />
            </p>
          );
        }

        const groups = parseObjectDiagramGroups(line);
        const hasDots = groups.some((g) => g.type === "dots" || g.type === "cross");

        if (!hasDots && /^\d+$/.test(line.trim())) {
          return (
            <p
              key={li}
              className="text-center text-base font-bold tabular-nums text-white/80 sm:text-lg"
            >
              {line.trim()}
            </p>
          );
        }

        if (!hasDots) {
          return (
            <p key={li} className="text-center text-sm text-white/75 sm:text-base">
              <MixedHebrewMathText text={line} />
            </p>
          );
        }

        const labelParts = line.split(/\s+←\s*/);
        const mainLine = labelParts[0];
        const tailLabel = labelParts.length > 1 ? `← ${labelParts.slice(1).join(" ← ")}` : null;
        const mainGroups = parseObjectDiagramGroups(mainLine);

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
                    className="px-1 text-xl font-black text-amber-200 sm:text-2xl"
                  >
                    {g.value}
                  </span>
                );
              }
              if (g.type === "num") {
                return (
                  <span
                    key={gi}
                    className="min-w-[1.5rem] text-center text-base font-bold tabular-nums text-white/85 sm:text-lg"
                  >
                    {g.value}
                  </span>
                );
              }
              return (
                <span key={gi} className="text-xs text-white/55 sm:text-sm">
                  {g.value}
                </span>
              );
            })}
            </div>
            {tailLabel ? (
              <p className="text-center text-sm text-white/65 sm:text-base" dir="rtl">
                <MixedHebrewMathText text={tailLabel} />
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CardsDiagram({ lines }) {
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
                    ? "border-emerald-400/45 bg-emerald-500/25 text-emerald-50"
                    : "border-white/15 bg-white/8 text-white/85"
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
  return (
    <div className="space-y-3" dir="ltr" style={bookMathIsolateStyle}>
      {lines.map((line, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center justify-center gap-2 text-base font-semibold sm:text-lg"
        >
          <MixedHebrewMathText text={line} />
        </div>
      ))}
    </div>
  );
}

function FrameTextDiagram({ lines }) {
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4" dir="rtl">
      {lines.map((line, i) => (
        <p key={i} className="text-right text-base sm:text-lg">
          <MixedHebrewMathText text={line} />
        </p>
      ))}
    </div>
  );
}

function FrameDiagram({ lines }) {
  const sizeClass = diagramTextSizeClass(lines.join("\n"));
  return (
    <pre
      className={`m-0 max-w-full whitespace-pre-wrap break-words text-center font-medium text-violet-50/95 ${sizeClass}`}
      style={bookMathIsolateStyle}
      dir="ltr"
    >
      {lines.join("\n")}
    </pre>
  );
}

function GenericDiagram({ content }) {
  const sizeClass = diagramTextSizeClass(content);
  return (
    <pre
      className={`m-0 max-w-full whitespace-pre-wrap break-words text-center font-medium text-violet-50/95 ${sizeClass}`}
      style={bookMathIsolateStyle}
      dir="ltr"
    >
      {content}
    </pre>
  );
}

export default function BookDiagram({ content }) {
  const lines = String(content || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const kind = detectDiagramType(content);

  return (
    <div
      className="my-4 rounded-2xl border border-emerald-300/20 bg-gradient-to-b from-emerald-950/30 via-violet-950/25 to-[#1a1430]/80 px-3 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-6 sm:py-6"
      role="img"
      aria-label="דוגמה"
    >
      {kind === "number_line" && (
        <div className="space-y-3">
          {lines.map((line, i) =>
            /\d+\s*[—–\-]\s*\d+/.test(line) || /^…/.test(line) ? (
              <NumberLineRow key={i} line={line} />
            ) : (
              <p
                key={i}
                className="text-center text-sm text-emerald-200/85 sm:text-base"
                dir="ltr"
                style={bookMathIsolateStyle}
              >
                {line}
              </p>
            )
          )}
        </div>
      )}
      {kind === "objects" && <ObjectDiagram lines={lines} />}
      {kind === "cards" && <CardsDiagram lines={lines} />}
      {kind === "coins" && <CoinsDiagram lines={lines} />}
      {kind === "frame_text" && <FrameTextDiagram lines={lines} />}
      {kind === "frame" && <FrameDiagram lines={lines} />}
      {kind === "generic" && <GenericDiagram content={content} />}
    </div>
  );
}
