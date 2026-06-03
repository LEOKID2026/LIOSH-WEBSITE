import { Fragment, useEffect, useMemo, useState } from "react";
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
    if (
      (operation === "addition" || operation === "compare") &&
      a != null &&
      b != null
    ) {
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

function MultiplicationArrayWorkspace({ operands }) {
  const { a, b } = operands;
  const rows = Math.min(Math.max(0, Math.round(a ?? 0)), 12);
  const cols = Math.min(Math.max(0, Math.round(b ?? 0)), 12);
  const [marked, setMarked] = useState(() => new Set());

  useEffect(() => {
    setMarked(new Set());
  }, [rows, cols]);

  return (
    <div className="flex flex-col items-center gap-3" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className="text-sm font-bold text-white/80 font-mono">
        {a} × {b}
      </div>
      <div className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-1 justify-center">
            {Array.from({ length: cols }, (_, c) => {
              const key = `${r}-${c}`;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`array cell ${r + 1},${c + 1}`}
                  onClick={() =>
                    setMarked((prev) => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  className={`h-8 w-8 md:h-9 md:w-9 rounded border-2 ${
                    marked.has(key)
                      ? "bg-emerald-400/80 border-emerald-200"
                      : "bg-white/5 border-white/25"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const GROUP_COLORS = [
  "bg-white/5 border-white/25",
  "bg-sky-400/70 border-sky-200",
  "bg-amber-400/70 border-amber-200",
  "bg-emerald-400/70 border-emerald-200",
  "bg-purple-400/70 border-purple-200",
];

function DivisionGroupsWorkspace({ operands }) {
  const { a, b } = operands;
  const count = Math.min(Math.max(0, Math.round(a ?? 0)), 60);
  const [groups, setGroups] = useState(() => Array(count).fill(0));

  useEffect(() => {
    setGroups(Array(Math.min(Math.max(0, Math.round(a ?? 0)), 60)).fill(0));
  }, [a, b]);

  return (
    <div className="flex flex-col items-center gap-4" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className="flex gap-6 text-sm font-bold text-white/80 font-mono">
        <ScratchpadDigitDisplay value={String(a ?? "")} className="px-2 py-1 rounded bg-sky-500/25 border border-sky-300/30 min-w-[2.5rem]" aria-label="dividend" />
        <span className="text-white/50">÷</span>
        <ScratchpadDigitDisplay value={String(b ?? "")} className="px-2 py-1 rounded bg-sky-500/25 border border-sky-300/30 min-w-[2.5rem]" aria-label="divisor" />
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {groups.map((groupId, i) => (
          <button
            key={i}
            type="button"
            aria-label={`object ${i + 1} group ${groupId}`}
            onClick={() =>
              setGroups((prev) => {
                const next = [...prev];
                next[i] = (next[i] + 1) % GROUP_COLORS.length;
                return next;
              })
            }
            className={`h-8 w-8 rounded-full border-2 ${GROUP_COLORS[groupId]}`}
          />
        ))}
      </div>
      <p className="text-xs text-white/50 text-center" dir="rtl">
        לחצו לסימון קבוצות — ללא חלוקה אוטומטית
      </p>
    </div>
  );
}

function FractionStack({
  numerator,
  denominator,
  editable = false,
  missingDen = false,
  onNumeratorChange,
  onDenominatorChange,
}) {
  const operandNumClass =
    "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold rounded text-white bg-sky-500/25 border border-sky-300/30";
  const operandDenClass =
    "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold rounded text-white bg-sky-500/25 border border-sky-300/30";
  const resultCellClass =
    "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold bg-white/10 rounded text-white";

  const numValue = numerator == null ? "" : String(numerator);
  const denValue = denominator == null ? "" : String(denominator);

  return (
    <div className="inline-flex flex-col items-center justify-center min-w-[3rem]">
      {editable && !missingDen ? (
        <ScratchpadDigitInput
          value={numValue}
          onChange={onNumeratorChange}
          className={resultCellClass}
          aria-label="fraction numerator"
          maxLength={3}
        />
      ) : (
        <ScratchpadDigitDisplay
          value={numValue}
          className={operandNumClass}
          aria-label="fraction numerator"
        />
      )}
      <div className="w-full min-w-[2.75rem] border-t-2 border-white/70 my-1" aria-hidden />
      {editable || missingDen ? (
        <ScratchpadDigitInput
          value={denValue}
          onChange={onDenominatorChange}
          className={resultCellClass}
          aria-label="fraction denominator"
          maxLength={3}
        />
      ) : (
        <ScratchpadDigitDisplay
          value={denValue}
          className={operandDenClass}
          aria-label="fraction denominator"
        />
      )}
    </div>
  );
}

function FractionStripsWorkspace({ operands }) {
  const { fractionOperands = [], fractionOperator = null } = operands;
  const [resultNum, setResultNum] = useState("");
  const [resultDen, setResultDen] = useState("");

  const layoutKey = fractionOperands
    .map((f) => `${f.num}/${f.den}${f.missingDen ? "?" : ""}`)
    .join("|");

  useEffect(() => {
    setResultNum("");
    setResultDen("");
  }, [layoutKey, fractionOperator]);

  const secondMissingDen = fractionOperands[1]?.missingDen;
  const showEqualsResult = fractionOperands.length > 0 && !secondMissingDen;

  return (
    <div
      className="flex flex-col items-center justify-center w-full max-w-xl py-2"
      dir="ltr"
      onKeyDown={stopKeyBubble}
    >
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
        {fractionOperands.map((frac, index) => (
          <Fragment key={`${frac.num}-${frac.den}-${index}`}>
            {index > 0 && fractionOperator ? (
              <span className="text-3xl md:text-4xl font-bold text-white/85 leading-none select-none">
                {fractionOperator}
              </span>
            ) : null}
            <FractionStack
              numerator={frac.num}
              denominator={frac.missingDen ? null : frac.den}
              missingDen={Boolean(frac.missingDen)}
              editable={Boolean(frac.missingDen)}
              onDenominatorChange={frac.missingDen ? setResultDen : undefined}
            />
          </Fragment>
        ))}

        {showEqualsResult ? (
          <>
            <span className="text-3xl md:text-4xl font-bold text-white/85 leading-none select-none">
              =
            </span>
            <FractionStack
              numerator={resultNum}
              denominator={resultDen}
              editable
              onNumeratorChange={setResultNum}
              onDenominatorChange={setResultDen}
            />
          </>
        ) : null}

        {fractionOperands.length === 0 ? (
          <FractionStack
            numerator={resultNum}
            denominator={resultDen}
            editable
            onNumeratorChange={setResultNum}
            onDenominatorChange={setResultDen}
          />
        ) : null}
      </div>
    </div>
  );
}

function DecimalPlaceValueTableWorkspace({ operands }) {
  const intCols = 3;
  const fracCols = 2;

  const topInt = useMemo(
    () => numberToDigitCells(operands.a, intCols),
    [operands.a, intCols]
  );
  const topFrac = useMemo(() => {
    const n = operands.a;
    if (n == null || !Number.isFinite(n)) return Array(fracCols).fill("");
    const frac = Math.abs(n - Math.trunc(n));
    const fracStr = frac.toFixed(fracCols).slice(2);
    return fracStr.split("").slice(0, fracCols);
  }, [operands.a, fracCols]);
  const bottomInt = useMemo(
    () => numberToDigitCells(operands.b, intCols),
    [operands.b, intCols]
  );
  const bottomFrac = useMemo(() => {
    const n = operands.b;
    if (n == null || !Number.isFinite(n)) return Array(fracCols).fill("");
    const frac = Math.abs(n - Math.trunc(n));
    const fracStr = frac.toFixed(fracCols).slice(2);
    return fracStr.split("").slice(0, fracCols);
  }, [operands.b, fracCols]);
  const [resultInt, setResultInt] = useState(() => Array(intCols).fill(""));
  const [resultFrac, setResultFrac] = useState(() => Array(fracCols).fill(""));

  useEffect(() => {
    setResultInt(Array(intCols).fill(""));
    setResultFrac(Array(fracCols).fill(""));
  }, [operands.a, operands.b, intCols, fracCols]);

  const operandCellClass =
    "w-9 h-10 md:w-10 md:h-11 text-center text-base rounded text-white bg-sky-500/25 border border-sky-300/30";
  const resultCellClass =
    "w-9 h-10 md:w-10 md:h-11 text-center text-base bg-white/10 rounded text-white";

  function renderOperandRow(intCells, fracCells) {
    return (
      <tr>
        {intCells.map((cell, i) => (
          <td key={`i-${i}`} className="border border-white/20 p-1">
            <ScratchpadDigitDisplay value={cell} className={operandCellClass} aria-label={`int ${i + 1}`} />
          </td>
        ))}
        <td className="border border-white/20 p-1 text-white/70 font-bold">.</td>
        {fracCells.map((cell, i) => (
          <td key={`f-${i}`} className="border border-white/20 p-1">
            <ScratchpadDigitDisplay value={cell} className={operandCellClass} aria-label={`frac ${i + 1}`} />
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="overflow-x-auto" dir="ltr" onKeyDown={stopKeyBubble}>
      <table className="mx-auto border-collapse text-center">
        <tbody>
          {renderOperandRow(topInt, topFrac)}
          {renderOperandRow(bottomInt, bottomFrac)}
          <tr>
            {resultInt.map((cell, i) => (
              <td key={`ri-${i}`} className="border border-white/20 p-1">
                <ScratchpadDigitInput
                  value={cell}
                  onChange={(v) => {
                    setResultInt((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                  }}
                  className={resultCellClass}
                  aria-label={`result int ${i + 1}`}
                />
              </td>
            ))}
            <td className="border border-white/20 p-1 text-white/70 font-bold">.</td>
            {resultFrac.map((cell, i) => (
              <td key={`rf-${i}`} className="border border-white/20 p-1">
                <ScratchpadDigitInput
                  value={cell}
                  onChange={(v) => {
                    setResultFrac((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                  }}
                  className={resultCellClass}
                  aria-label={`result frac ${i + 1}`}
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PercentGridWorkspace() {
  const [cells, setCells] = useState(() => Array(100).fill(false));

  useEffect(() => {
    setCells(Array(100).fill(false));
  }, []);

  return (
    <div className="flex flex-col items-center gap-2" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className="grid grid-cols-10 gap-0.5 max-w-xs">
        {cells.map((filled, i) => (
          <button
            key={i}
            type="button"
            aria-label={`percent grid cell ${i + 1}`}
            onClick={() =>
              setCells((prev) => {
                const next = [...prev];
                next[i] = !next[i];
                return next;
              })
            }
            className={`h-6 w-6 md:h-7 md:w-7 rounded-sm border ${
              filled ? "bg-violet-400/80 border-violet-200" : "bg-white/5 border-white/25"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-white/50" dir="rtl">
        סמנו ריבועים — ללא חישוב אחוז
      </p>
    </div>
  );
}

function RatioTableWorkspace() {
  const rowCount = 4;
  const [rows, setRows] = useState(() =>
    Array.from({ length: rowCount }, () => ["", ""])
  );

  useEffect(() => {
    setRows(Array.from({ length: rowCount }, () => ["", ""]));
  }, []);

  return (
    <div className="overflow-x-auto" dir="rtl" onKeyDown={stopKeyBubble}>
      <table className="mx-auto border-collapse text-center">
        <thead>
          <tr>
            <th className="border border-white/20 px-3 py-1 text-xs text-white/70">צד א׳</th>
            <th className="border border-white/20 px-3 py-1 text-xs text-white/70">צד ב׳</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-white/20 p-1">
                  <ScratchpadDigitInput
                    value={cell}
                    onChange={(v) => {
                      setRows((prev) => {
                        const next = prev.map((r) => [...r]);
                        next[ri][ci] = v;
                        return next;
                      });
                    }}
                    className="w-14 h-10 text-center text-lg bg-white/10 rounded text-white"
                    aria-label={`ratio row ${ri + 1} col ${ci + 1}`}
                    maxLength={4}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualOrderWorkspace() {
  const slotCount = 8;
  const [cells, setCells] = useState(() => Array(slotCount).fill(""));

  useEffect(() => {
    setCells(Array(slotCount).fill(""));
  }, []);

  return (
    <div className="flex flex-col items-center gap-3" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {cells.map((cell, i) => (
          <ScratchpadDigitInput
            key={i}
            value={cell}
            onChange={(v) => {
              setCells((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            className="w-11 h-12 md:w-12 md:h-14 text-center text-xl bg-white/10 rounded text-white"
            aria-label={`order slot ${i + 1}`}
            maxLength={2}
          />
        ))}
      </div>
      <p className="text-xs text-white/50 text-center" dir="rtl">
        תיבות ריקות לסדר פעולות — ללא רמז לפעולה
      </p>
    </div>
  );
}

function WordProblemStructureBoard() {
  const calcSlots = 6;
  const [calcCells, setCalcCells] = useState(() => Array(calcSlots).fill(""));

  useEffect(() => {
    setCalcCells(Array(calcSlots).fill(""));
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full max-w-md" dir="rtl" onKeyDown={stopKeyBubble}>
      <section className="rounded-lg border border-white/20 bg-white/5 p-3 min-h-[4rem]">
        <h4 className="text-xs font-semibold text-white/70 mb-2">נתונים:</h4>
        <div className="min-h-[2.5rem] border border-dashed border-white/15 rounded" aria-hidden />
      </section>
      <section className="rounded-lg border border-white/20 bg-white/5 p-3 min-h-[4rem]">
        <h4 className="text-xs font-semibold text-white/70 mb-2">שאלה:</h4>
        <div className="min-h-[2.5rem] border border-dashed border-white/15 rounded" aria-hidden />
      </section>
      <section className="rounded-lg border border-white/20 bg-white/5 p-3">
        <h4 className="text-xs font-semibold text-white/70 mb-2">חישוב:</h4>
        <div className="flex flex-wrap gap-2 justify-center" dir="ltr">
          {calcCells.map((cell, i) => (
            <ScratchpadDigitInput
              key={i}
              value={cell}
              onChange={(v) => {
                setCalcCells((prev) => {
                  const next = [...prev];
                  next[i] = v;
                  return next;
                });
              }}
              className="w-10 h-11 text-center text-lg bg-white/10 rounded text-white"
              aria-label={`calculation slot ${i + 1}`}
              maxLength={3}
            />
          ))}
        </div>
      </section>
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
    case "blank_multiplication_array":
      return <MultiplicationArrayWorkspace operands={operands} />;
    case "blank_division_groups":
      return <DivisionGroupsWorkspace operands={operands} />;
    case "blank_fraction_strips":
      return <FractionStripsWorkspace operands={operands} />;
    case "blank_decimal_place_value_table":
      return <DecimalPlaceValueTableWorkspace operands={operands} />;
    case "blank_percent_grid":
      return <PercentGridWorkspace />;
    case "blank_ratio_table":
      return <RatioTableWorkspace />;
    case "manual_order_workspace":
      return <ManualOrderWorkspace />;
    case "word_problem_structure_board":
      return <WordProblemStructureBoard />;
    default:
      return null;
  }
}
