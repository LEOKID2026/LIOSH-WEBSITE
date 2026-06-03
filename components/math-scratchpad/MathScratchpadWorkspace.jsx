import { useEffect, useMemo, useState } from "react";
import {
  decomposeBaseTen,
  digitCount,
  numberToDigitCells,
} from "../../utils/math-scratchpad/extract-operands";
import { ScratchpadDigitDisplay, ScratchpadDigitInput } from "./scratchpad-virtual-input";

function stopKeyBubble(e) {
  if (e.key === "Enter" || e.key === "Escape") {
    e.stopPropagation();
  }
}

function NeutralDot({ marked, onClick, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`h-8 w-8 rounded-full border-2 transition ${
        marked
          ? "border-white/30 bg-transparent line-through opacity-40"
          : "border-sky-300/70 bg-sky-400/80 hover:bg-sky-300"
      }`}
    />
  );
}

function OperandTenFrame({ value, label }) {
  const filledCount = Math.min(Math.max(0, Math.round(value ?? 0)), 10);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-bold text-white/80 font-mono">{label}</span>
      <div className="grid grid-cols-5 gap-2" dir="ltr">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`h-10 w-10 rounded border-2 ${
              i < filledCount
                ? "bg-sky-400/90 border-sky-200"
                : "bg-white/5 border-white/20"
            }`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function OperandBaseTenGroup({ value, label, opSymbol }) {
  const { tens, ones } = decomposeBaseTen(value);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-bold text-white/80 font-mono">
        {opSymbol ? `${opSymbol} ${label}` : label}
      </span>
      <div className="flex flex-col gap-2 items-center">
        <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
          {Array.from({ length: tens }, (_, i) => (
            <div
              key={`t-${i}`}
              className="h-10 w-24 rounded bg-amber-500/70 border border-amber-200/50"
              aria-hidden
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
          {Array.from({ length: ones }, (_, i) => (
            <div
              key={`o-${i}`}
              className="h-8 w-8 rounded bg-amber-400/80 border border-amber-100/50"
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ObjectCounterWorkspace({ operands, operation }) {
  const { a, b } = operands;
  const [marked, setMarked] = useState(() => new Set());

  useEffect(() => {
    setMarked(new Set());
  }, [a, b, operation]);

  const groups = useMemo(() => {
    if (operation === "addition" && a != null && b != null) {
      return [
        { id: "g1", count: a, label: String(a) },
        { id: "g2", count: b, label: String(b) },
      ];
    }
    if (a != null) return [{ id: "g1", count: a, label: String(a) }];
    return [];
  }, [a, b, operation]);

  return (
    <div className="flex flex-col gap-4" dir="ltr" onKeyDown={stopKeyBubble}>
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col items-center gap-2">
          <span className="text-sm font-bold text-white/80 font-mono">{group.label}</span>
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: group.count }, (_, i) => {
              const key = `${group.id}-${i}`;
              return (
                <NeutralDot
                  key={key}
                  label={`object ${i + 1}`}
                  marked={marked.has(key)}
                  onClick={() =>
                    setMarked((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function MovableObjectsWorkspace({ operands }) {
  const { a } = operands;
  const count = a ?? 0;
  const [marked, setMarked] = useState(() => new Set());

  useEffect(() => {
    setMarked(new Set());
  }, [count]);

  return (
    <div className="flex flex-col items-center gap-2" dir="ltr" onKeyDown={stopKeyBubble}>
      <span className="text-sm font-bold text-white/80 font-mono">{count}</span>
      <div className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: count }, (_, i) => (
          <NeutralDot
            key={i}
            label={`object ${i + 1}`}
            marked={marked.has(i)}
            onClick={() =>
              setMarked((prev) => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function TenFrameWorkspace({ operands }) {
  const { a, b, operation } = operands;
  const showSecond =
    operation === "addition" && b != null && Number.isFinite(b);

  return (
    <div className="flex flex-wrap gap-6 justify-center items-start" dir="ltr" onKeyDown={stopKeyBubble}>
      <OperandTenFrame value={a} label={a ?? ""} />
      {showSecond ? <OperandTenFrame value={b} label={b ?? ""} /> : null}
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-white/50" dir="rtl">
          עבודה
        </span>
        <TenFrameWorkspaceEditable />
      </div>
    </div>
  );
}

function TenFrameWorkspaceEditable() {
  const [cells, setCells] = useState(() => Array(10).fill(false));

  useEffect(() => {
    setCells(Array(10).fill(false));
  }, []);

  return (
    <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto" dir="ltr">
      {cells.map((filled, i) => (
        <button
          key={i}
          type="button"
          aria-label={`ten frame cell ${i + 1}`}
          onClick={() =>
            setCells((prev) => {
              const next = [...prev];
              next[i] = !next[i];
              return next;
            })
          }
          className={`h-10 w-10 rounded border-2 ${
            filled ? "bg-emerald-400/80 border-emerald-200" : "bg-white/5 border-white/30"
          }`}
        />
      ))}
    </div>
  );
}

function BaseTenBlocksWorkspace({ operands }) {
  const { a, b, operation } = operands;
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);

  useEffect(() => {
    setTens(0);
    setOnes(0);
  }, [a, b, operation]);

  const showSecond =
    (operation === "addition" || operation === "subtraction") &&
    b != null &&
    Number.isFinite(b);

  return (
    <div className="flex flex-col gap-6" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className="flex flex-wrap gap-8 justify-center items-start">
        <OperandBaseTenGroup value={a} label={a ?? ""} />
        {showSecond ? (
          <OperandBaseTenGroup
            value={b}
            label={b ?? ""}
            opSymbol={operation === "subtraction" ? "−" : "+"}
          />
        ) : null}
      </div>

      <div className="border-t border-white/15 pt-4 flex flex-col gap-3 items-center">
        <span className="text-sm text-white/50" dir="rtl">
          עבודה
        </span>
        <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
          {Array.from({ length: tens }, (_, i) => (
            <div
              key={`t-${i}`}
              className="h-10 w-24 rounded bg-emerald-500/60 border border-emerald-200/50"
              aria-hidden
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
          {Array.from({ length: ones }, (_, i) => (
            <div
              key={`o-${i}`}
              className="h-8 w-8 rounded bg-emerald-400/70 border border-emerald-100/50"
              aria-hidden
            />
          ))}
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            type="button"
            className="px-3 py-1 rounded bg-white/10 text-sm"
            onClick={() => setTens((n) => n + 1)}
          >
            +10
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-white/10 text-sm"
            onClick={() => setOnes((n) => n + 1)}
          >
            +1
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-white/10 text-sm"
            onClick={() => setTens((n) => Math.max(0, n - 1))}
          >
            −10
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-white/10 text-sm"
            onClick={() => setOnes((n) => Math.max(0, n - 1))}
          >
            −1
          </button>
        </div>
      </div>
    </div>
  );
}

function ManualNumberLineWorkspace({ operands }) {
  const { a, b } = operands;
  const maxVal = Math.max(a ?? 10, b ?? 10, 10);
  const tickCount = Math.min(Math.max(maxVal + 2, 11), 101);
  const [marks, setMarks] = useState(() => new Set());

  useEffect(() => {
    setMarks(new Set());
  }, [tickCount, a, b]);

  return (
    <div className="overflow-x-auto px-2" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className="flex items-end gap-1 min-w-max pb-6 border-b-2 border-white/40">
        {Array.from({ length: tickCount }, (_, i) => {
          const isOperandA = a != null && i === a;
          const isOperandB = b != null && i === b;
          const isOperand = isOperandA || isOperandB;
          return (
            <div key={i} className="flex flex-col items-center w-6 shrink-0">
              <span
                className={`text-[10px] font-mono mb-0.5 h-4 ${
                  isOperand ? "text-sky-200 font-bold" : "text-white/40"
                }`}
              >
                {isOperand ? i : ""}
              </span>
              <button
                type="button"
                className="flex flex-col items-center"
                onClick={() =>
                  setMarks((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
              >
                <div
                  className={`h-3 w-3 rounded-full mb-1 ${
                    marks.has(i) ? "bg-yellow-300" : "bg-transparent"
                  }`}
                />
                <div
                  className={`h-3 w-px ${isOperand ? "bg-sky-300/80" : "bg-white/50"}`}
                />
              </button>
              <span className="text-[10px] text-white/50 font-mono mt-0.5">{i}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-white/50 mt-2 text-center" dir="rtl">
        המספרים מסומנים בקו — לחצו לסימון עבודה
      </p>
    </div>
  );
}

function PlaceValueTableWorkspace({ operands }) {
  const cols = Math.max(digitCount(operands.a ?? 0), digitCount(operands.b ?? 0), 2);
  const labels = ["א", "ע", "מ", "אלף"].slice(0, cols).reverse();
  const topRow = useMemo(
    () => numberToDigitCells(operands.a, cols),
    [operands.a, cols]
  );
  const bottomRow = useMemo(
    () => numberToDigitCells(operands.b, cols),
    [operands.b, cols]
  );
  const [resultRow, setResultRow] = useState(() => Array(cols).fill(""));

  useEffect(() => {
    setResultRow(Array(cols).fill(""));
  }, [cols, operands.a, operands.b]);

  const operandCellClass =
    "w-10 h-10 md:w-12 md:h-12 text-center text-lg rounded text-white bg-sky-500/25 border border-sky-300/30";
  const resultCellClass =
    "w-10 h-10 md:w-12 md:h-12 text-center text-lg bg-white/10 rounded text-white";

  const tableRows = [
    { cells: topRow, editable: false, rowLabel: "operand top" },
    { cells: bottomRow, editable: false, rowLabel: "operand bottom" },
    { cells: resultRow, editable: true, rowLabel: "result" },
  ];

  return (
    <div className="overflow-x-auto" dir="ltr" onKeyDown={stopKeyBubble}>
      <table className="mx-auto border-collapse text-center">
        <thead>
          <tr>
            {labels.map((label) => (
              <th key={label} className="border border-white/20 px-2 py-1 text-xs text-white/70">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map(({ cells, editable, rowLabel }, ri) => (
            <tr key={rowLabel}>
              {cells.map((cell, ci) => (
                <td key={ci} className="border border-white/20 p-1">
                  {editable ? (
                    <ScratchpadDigitInput
                      value={cell}
                      onChange={(v) => {
                        setResultRow((prev) => {
                          const next = [...prev];
                          next[ci] = v;
                          return next;
                        });
                      }}
                      className={resultCellClass}
                      aria-label={`${rowLabel} column ${ci + 1}`}
                    />
                  ) : (
                    <ScratchpadDigitDisplay
                      value={cell}
                      className={operandCellClass}
                      aria-label={`${rowLabel} column ${ci + 1}`}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerticalLayoutWorkspace({ operands, variant }) {
  const { a, b } = operands;
  const cols = Math.max(digitCount(a ?? 0), digitCount(b ?? 0), 2);
  const topRow = useMemo(() => numberToDigitCells(a, cols), [a, cols]);
  const bottomRow = useMemo(() => numberToDigitCells(b, cols), [b, cols]);
  const [resultRow, setResultRow] = useState(() => Array(cols).fill(""));

  useEffect(() => {
    setResultRow(Array(cols).fill(""));
  }, [cols, variant, a, b]);

  const opSymbol = variant === "blank_vertical_subtraction" ? "−" : "+";
  const operandCellClass =
    "w-10 h-12 md:w-12 md:h-14 text-center text-xl rounded text-white bg-sky-500/25 border border-sky-300/30";
  const resultCellClass =
    "w-10 h-12 md:w-12 md:h-14 text-center text-xl bg-white/10 rounded text-white";

  return (
    <div className="flex flex-col items-end gap-1 font-mono" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className="flex justify-end gap-1 font-mono text-xl">
        {topRow.map((cell, i) => (
          <ScratchpadDigitDisplay
            key={`top-${i}`}
            value={cell}
            className={operandCellClass}
            aria-label={`top digit ${i + 1}`}
          />
        ))}
      </div>
      <div className="flex justify-end items-center gap-1">
        <span className="w-6 text-center text-white/80">{opSymbol}</span>
        {bottomRow.map((cell, i) => (
          <ScratchpadDigitDisplay
            key={`bottom-${i}`}
            value={cell}
            className={operandCellClass}
            aria-label={`bottom digit ${i + 1}`}
          />
        ))}
      </div>
      <div className="w-full border-t-2 border-white/50 my-1" />
      <div className="flex justify-end gap-1 font-mono text-xl">
        {resultRow.map((cell, i) => (
          <ScratchpadDigitInput
            key={`result-${i}`}
            value={cell}
            onChange={(v) => {
              setResultRow((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            className={resultCellClass}
            aria-label={`result digit ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{ type: string, operands: { a: number|null, b: number|null, operation: string|null } }} props
 */
export default function MathScratchpadWorkspace({ type, operands }) {
  switch (type) {
    case "object_counter":
      return (
        <ObjectCounterWorkspace
          operands={operands}
          operation={operands.operation || "addition"}
        />
      );
    case "movable_objects":
      return <MovableObjectsWorkspace operands={operands} />;
    case "ten_frame":
      return <TenFrameWorkspace operands={operands} />;
    case "base_ten_blocks":
      return <BaseTenBlocksWorkspace operands={operands} />;
    case "manual_number_line":
      return <ManualNumberLineWorkspace operands={operands} />;
    case "blank_place_value_table":
      return <PlaceValueTableWorkspace operands={operands} />;
    case "blank_vertical_addition":
      return (
        <VerticalLayoutWorkspace operands={operands} variant="blank_vertical_addition" />
      );
    case "blank_vertical_subtraction":
      return (
        <VerticalLayoutWorkspace operands={operands} variant="blank_vertical_subtraction" />
      );
    default:
      return null;
  }
}
