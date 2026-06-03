import { parseVerticalArithmetic } from "../../lib/learning-book/vertical-arithmetic-parse";

const islandStyle = {
  direction: "ltr",
  unicodeBidi: "isolate",
};

function VerticalRow({ cells, kind }) {
  const weight =
    kind === "result" ? "font-bold text-white" : kind === "borrow" ? "text-amber-200/90 text-sm" : "text-white/90";

  return (
    <div className={`flex justify-center gap-x-3 tabular-nums sm:gap-x-4 ${weight}`}>
      {cells.map((cell, i) => (
        <span key={`${kind}-${i}`} className="inline-block min-w-[1.25rem] text-center sm:min-w-[1.5rem]">
          {cell}
        </span>
      ))}
    </div>
  );
}

export default function BookVerticalArithmetic({ content }) {
  const parsed = parseVerticalArithmetic(content);
  if (!parsed) return null;

  return (
    <div
      className="mx-auto w-fit max-w-full space-y-1 py-1 font-mono text-base sm:text-lg"
      dir="ltr"
      style={islandStyle}
      data-book-vertical-arithmetic="true"
    >
      {parsed.rows.map((row, i) => (
        <VerticalRow key={i} cells={row.cells} kind={row.kind} />
      ))}
    </div>
  );
}
