import { Fragment, useEffect, useMemo, useState } from "react";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import { SCRATCHPAD_BRIGHT_CELLS } from "../../lib/student-ui/scratchpad-bright-cells-ui.client.js";
import {
  decomposeBaseTen,
  digitCount,
  numberToDigitCells,
} from "../../utils/math-scratchpad/extract-operands";
import {
  PAPER_GRID_NOTEBOOK,
  PAPER_GRID_PLACE_VALUE,
  buildPlaceValueOperandLayout,
  createEmptyPaperGrid,
  centerAlignDigitCells,
} from "../../utils/math-scratchpad/paper-grid-config";
import { ScratchpadDigitDisplay, ScratchpadDigitInput } from "./scratchpad-virtual-input";

const WORK_CELL_CLASS =
  "w-9 h-9 md:w-10 md:h-10 text-center text-base md:text-lg bg-white/10 rounded text-white";
const OPERAND_CELL_CLASS =
  "w-9 h-9 md:w-10 md:h-10 text-center text-base md:text-lg rounded text-white bg-sky-500/25 border border-sky-300/30";
const CARRY_CELL_CLASS =
  "w-9 h-9 md:w-10 md:h-10 text-center text-base md:text-lg bg-amber-500/15 border border-amber-300/30 rounded text-white";
/** Long-division structure lines only (not carry cells / fraction bars). */
const LONG_DIVISION_STRUCTURE_H = "border-t-2 border-red-500";
const LONG_DIVISION_STRUCTURE_V = "border-l-2 border-l-red-500";
const DIVISION_SEPARATOR_H = "border-t-2 border-amber-300";
const DIVISION_SEPARATOR_V = "border-l-2 border-l-amber-300";

const GROUP_COLORS_CLASSIC = [
  "bg-white/5 border-white/25",
  "bg-sky-400/70 border-sky-200",
  "bg-amber-400/70 border-amber-200",
  "bg-emerald-400/70 border-emerald-200",
  "bg-purple-400/70 border-purple-200",
];

const GROUP_COLORS_BRIGHT = [
  "bg-white border-sky-300",
  "bg-sky-300 border-sky-500",
  "bg-amber-200 border-amber-400",
  "bg-emerald-200 border-emerald-400",
  "bg-violet-200 border-violet-400",
];

function useScratchpadCellTokens() {
  const { isBright } = useStudentTheme();
  const B = SCRATCHPAD_BRIGHT_CELLS;
  return {
    isBright,
    workCell: isBright ? B.workCell : WORK_CELL_CLASS,
    operandCell: isBright ? B.operandCell : OPERAND_CELL_CLASS,
    carryCell: isBright ? B.carryCell : CARRY_CELL_CLASS,
    tableCell: isBright ? B.tableCell : "border border-white/15 p-0.5",
    tableCellStrong: isBright ? B.tableCellStrong : "border border-white/20 p-0.5",
    carryTableCell: isBright ? B.carryTableCell : "border border-amber-300/20 p-0.5",
    headerCell: isBright
      ? B.headerCell
      : "border border-white/20 px-1 py-1 text-xs text-white/60 min-w-[2.25rem]",
    carryLabel: isBright
      ? B.carryLabel
      : "border-0 py-0.5 text-[10px] md:text-xs font-normal text-amber-200/70 text-end pe-1",
    resultSeparator: isBright ? B.resultSeparator : "border-t-2 border-white/35",
    divisionSeparatorH: isBright ? B.divisionSeparatorH : DIVISION_SEPARATOR_H,
    divisionSeparatorV: isBright ? B.divisionSeparatorV : DIVISION_SEPARATOR_V,
    longDivisionStructureH: isBright
      ? B.longDivisionStructureH
      : LONG_DIVISION_STRUCTURE_H,
    longDivisionStructureV: isBright
      ? B.longDivisionStructureV
      : LONG_DIVISION_STRUCTURE_V,
    exerciseText: isBright
      ? B.exerciseText
      : "text-center font-mono text-lg md:text-xl text-white/90 shrink-0",
    mutedTextXs: isBright ? B.mutedTextXs : "text-xs text-white/50",
    mutedTextSm: isBright ? B.mutedText : "text-sm text-white/50",
    labelText: isBright ? B.labelText : "text-sm font-bold text-white/80 font-mono",
    sectionTitle: isBright ? B.sectionTitle : "text-xs font-semibold text-white/70",
    sectionBox: isBright ? B.sectionBox : "rounded-lg border border-white/20 bg-white/5 p-3 min-h-[4rem]",
    sectionDashed: isBright
      ? B.sectionDashed
      : "min-h-[2.5rem] border border-dashed border-white/15 rounded",
    inlineInputLg: isBright
      ? `w-14 h-10 text-lg ${B.inlineInput}`
      : "w-14 h-10 text-center text-lg bg-white/10 rounded text-white",
    inlineInputMd: isBright
      ? `w-11 h-12 md:w-12 md:h-14 text-xl ${B.inlineInput}`
      : "w-11 h-12 md:w-12 md:h-14 text-center text-xl bg-white/10 rounded text-white",
    inlineInputSm: isBright
      ? `w-10 h-11 text-lg ${B.inlineInput}`
      : "w-10 h-11 text-center text-lg bg-white/10 rounded text-white",
    operatorSymbol: isBright
      ? B.operatorSymbol
      : "text-3xl md:text-4xl font-bold text-white/85 leading-none select-none",
    decimalDot: isBright ? B.decimalDot : "text-white/70 font-bold",
    ratioTh: isBright ? B.ratioTh : "border border-white/20 px-3 py-1 text-xs text-white/70",
    groupColors: isBright ? GROUP_COLORS_BRIGHT : GROUP_COLORS_CLASSIC,
    fracNumClass: isBright
      ? B.fracNumClass
      : "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold rounded text-white bg-sky-500/25 border border-sky-300/30",
    fracDenClass: isBright
      ? B.fracDenClass
      : "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold rounded text-white bg-sky-500/25 border border-sky-300/30",
    fracResultClass: isBright
      ? B.fracResultClass
      : "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold bg-white/10 rounded text-white",
    fracLine: isBright ? B.fracLine : "border-t-2 border-white/70",
    decimalOperandClass: isBright
      ? "w-9 h-10 md:w-10 md:h-11 text-center text-base rounded-md text-slate-900 bg-sky-100 border-2 border-sky-400 font-semibold tabular-nums"
      : "w-9 h-10 md:w-10 md:h-11 text-center text-base rounded text-white bg-sky-500/25 border border-sky-300/30",
    decimalResultClass: isBright ? B.workCell : "w-9 h-10 md:w-10 md:h-11 text-center text-base bg-white/10 rounded text-white",
    chipBtn: isBright
      ? "px-3 py-1 rounded-md bg-white border border-sky-200 text-sm text-slate-800 shadow-sm hover:bg-sky-50"
      : "px-3 py-1 rounded bg-white/10 text-sm",
    dividerBorder: isBright ? "border-t border-sky-200" : "border-t border-white/15",
    numberLineAxis: isBright ? "border-b-2 border-sky-400" : "border-b-2 border-white/40",
    operandBadge: isBright
      ? "px-2 py-1 rounded-md bg-sky-100 border-2 border-sky-400 text-slate-900 font-bold min-w-[2.5rem]"
      : "px-2 py-1 rounded bg-sky-500/25 border border-sky-300/30 min-w-[2.5rem]",
  };
}

function useCarryRow(cols, resetKey) {
  const [carryRow, setCarryRow] = useState(() => Array(cols).fill(""));

  useEffect(() => {
    setCarryRow(Array(cols).fill(""));
  }, [cols, resetKey]);

  return [carryRow, setCarryRow];
}

function PaperCarryRowFlex({ carryRow, setCarryRow }) {
  return (
    <div className="flex justify-end gap-1 w-full mb-1">
      {carryRow.map((cell, i) => (
        <ScratchpadDigitInput
          key={`carry-${i}`}
          value={cell}
          onChange={(v) => {
            setCarryRow((prev) => {
              const next = [...prev];
              next[i] = v;
              return next;
            });
          }}
          className={CARRY_CELL_CLASS}
          aria-label={`carry col ${i + 1}`}
          maxLength={1}
        />
      ))}
    </div>
  );
}

function PaperCarryRowTable({
  carryRow,
  setCarryRow,
  carryCellClass = CARRY_CELL_CLASS,
  tableCellClass = "border border-amber-300/20 p-0.5",
}) {
  return (
    <tr>
      {carryRow.map((cell, i) => (
        <td key={`carry-${i}`} className={tableCellClass}>
          <ScratchpadDigitInput
            value={cell}
            onChange={(v) => {
              setCarryRow((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              });
            }}
            className={carryCellClass}
            aria-label={`carry col ${i + 1}`}
            maxLength={1}
          />
        </td>
      ))}
    </tr>
  );
}

function PaperScrollShell({ children, fillParent = false }) {
  return (
    <div
      className={`w-full px-1 py-1 ${
        fillParent
          ? "min-h-0"
          : "max-h-[min(52vh,26rem)] overflow-y-auto overflow-x-auto overscroll-contain"
      }`}
      dir="ltr"
      onKeyDown={stopKeyBubble}
    >
      {children}
    </div>
  );
}

function PaperWorkGridRows({
  grid,
  setGrid,
  rowLabelPrefix = "work",
  workCellClass = WORK_CELL_CLASS,
  tableCellClass = "border border-white/15 p-0.5",
}) {
  return grid.map((row, ri) => (
    <tr key={`${rowLabelPrefix}-${ri}`}>
      {row.map((cell, ci) => (
        <td key={ci} className={tableCellClass}>
          <ScratchpadDigitInput
            value={cell}
            onChange={(v) => {
              setGrid((prev) => {
                const next = prev.map((r) => [...r]);
                next[ri][ci] = v;
                return next;
              });
            }}
            className={workCellClass}
            aria-label={`${rowLabelPrefix} row ${ri + 1} col ${ci + 1}`}
          />
        </td>
      ))}
    </tr>
  ));
}

function fractionBlockWidth(num, den, missingDen) {
  const nLen = numberToDigitCells(num, digitCount(num ?? 0)).length;
  if (missingDen) return Math.max(nLen, 1);
  const dLen = numberToDigitCells(den, digitCount(den ?? 0)).length;
  return Math.max(nLen, dLen, 1);
}

/**
 * @param {{ num: number, den: number, missingDen?: boolean }[]} fractionOperands
 * @param {string|null} fractionOperator
 * @param {number} cols
 */
function buildFractionExerciseLayout(fractionOperands, fractionOperator, cols) {
  if (!fractionOperands?.length) return null;

  const segments = [];
  fractionOperands.forEach((frac, index) => {
    if (index > 0 && fractionOperator) {
      segments.push({ type: "op", symbol: fractionOperator });
    }
    segments.push({ type: "frac", frac });
  });

  let totalLen = 0;
  for (const seg of segments) {
    if (seg.type === "op") totalLen += 1;
    else totalLen += fractionBlockWidth(seg.frac.num, seg.frac.den, seg.frac.missingDen);
  }

  const startCol = Math.max(0, Math.floor((cols - totalLen) / 2));
  const numRow = Array(cols).fill("");
  const lineRow = Array(cols).fill(false);
  const denRow = Array(cols).fill("");
  const denMissingAt = Array(cols).fill(false);

  let col = startCol;
  for (const seg of segments) {
    if (seg.type === "op") {
      numRow[col] = seg.symbol;
      col += 1;
      continue;
    }
    const { frac } = seg;
    const nCells = numberToDigitCells(frac.num, digitCount(frac.num ?? 0));
    const dCells = frac.missingDen
      ? [""]
      : numberToDigitCells(frac.den, digitCount(frac.den ?? 0));
    const w = Math.max(nCells.length, dCells.length, 1);
    const blockStart = col;

    const numStart = blockStart + Math.floor((w - nCells.length) / 2);
    nCells.forEach((c, i) => {
      numRow[numStart + i] = c;
    });

    const denStart = blockStart + Math.floor((w - dCells.length) / 2);
    dCells.forEach((c, i) => {
      const idx = denStart + i;
      denRow[idx] = c;
      if (frac.missingDen) denMissingAt[idx] = true;
    });

    for (let i = blockStart; i < blockStart + w; i++) {
      lineRow[i] = true;
    }
    col += w;
  }

  return { numRow, lineRow, denRow, denMissingAt };
}

function renderPartialLineCells(lineFlags, cols, keyPrefix, separatorClass = DIVISION_SEPARATOR_H) {
  const cells = [];
  let ci = 0;
  while (ci < cols) {
    if (lineFlags[ci]) {
      let span = 1;
      while (ci + span < cols && lineFlags[ci + span]) span += 1;
      cells.push(
        <td key={`${keyPrefix}-${ci}`} colSpan={span} className="p-0 border-0">
          <div className={separatorClass} />
        </td>
      );
      ci += span;
    } else {
      cells.push(
        <td key={`${keyPrefix}-pad-${ci}`} className="p-0 border-0" aria-hidden="true" />
      );
      ci += 1;
    }
  }
  return cells;
}

function stopKeyBubble(e) {
  if (e.key === "Enter" || e.key === "Escape") {
    e.stopPropagation();
  }
}

function NeutralDot({ marked, onClick, label }) {
  const C = useScratchpadCellTokens();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`h-8 w-8 rounded-full border-2 transition ${
        marked
          ? C.isBright
            ? "border-sky-400 bg-sky-100 line-through opacity-50"
            : "border-white/30 bg-transparent line-through opacity-40"
          : C.isBright
            ? "border-sky-400 bg-sky-300 hover:bg-sky-400"
            : "border-sky-300/70 bg-sky-400/80 hover:bg-sky-300"
      }`}
    />
  );
}

function OperandTenFrame({ value, label }) {
  const C = useScratchpadCellTokens();
  const filledCount = Math.min(Math.max(0, Math.round(value ?? 0)), 10);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={C.labelText}>{label}</span>
      <div className="grid grid-cols-5 gap-2" dir="ltr">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`h-10 w-10 rounded border-2 ${
              i < filledCount
                ? C.isBright
                  ? "bg-sky-400 border-sky-500"
                  : "bg-sky-400/90 border-sky-200"
                : C.isBright
                  ? "bg-white border-sky-300"
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
  const C = useScratchpadCellTokens();
  const { tens, ones } = decomposeBaseTen(value);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={C.labelText}>
        {opSymbol ? `${opSymbol} ${label}` : label}
      </span>
      <div className="flex flex-col gap-2 items-center">
        <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
          {Array.from({ length: tens }, (_, i) => (
            <div
              key={`t-${i}`}
              className={
                C.isBright
                  ? "h-10 w-24 rounded bg-amber-200 border-2 border-amber-400"
                  : "h-10 w-24 rounded bg-amber-500/70 border border-amber-200/50"
              }
              aria-hidden
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
          {Array.from({ length: ones }, (_, i) => (
            <div
              key={`o-${i}`}
              className={
                C.isBright
                  ? "h-8 w-8 rounded bg-amber-300 border-2 border-amber-500"
                  : "h-8 w-8 rounded bg-amber-400/80 border border-amber-100/50"
              }
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ObjectCounterWorkspace({ operands, operation }) {
  const C = useScratchpadCellTokens();
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
          <span className={C.labelText}>{group.label}</span>
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
  const C = useScratchpadCellTokens();
  const { a } = operands;
  const count = a ?? 0;
  const [marked, setMarked] = useState(() => new Set());

  useEffect(() => {
    setMarked(new Set());
  }, [count]);

  return (
    <div className="flex flex-col items-center gap-2" dir="ltr" onKeyDown={stopKeyBubble}>
      <span className={C.labelText}>{count}</span>
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
  const C = useScratchpadCellTokens();
  const { a, b, operation } = operands;
  const showSecond =
    operation === "addition" && b != null && Number.isFinite(b);

  return (
    <div className="flex flex-wrap gap-6 justify-center items-start" dir="ltr" onKeyDown={stopKeyBubble}>
      <OperandTenFrame value={a} label={a ?? ""} />
      {showSecond ? <OperandTenFrame value={b} label={b ?? ""} /> : null}
      <div className="flex flex-col items-center gap-2">
        <span className={C.mutedTextSm} dir="rtl">
          עבודה
        </span>
        <TenFrameWorkspaceEditable />
      </div>
    </div>
  );
}

function TenFrameWorkspaceEditable() {
  const C = useScratchpadCellTokens();
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
            filled
              ? C.isBright
                ? "bg-emerald-400 border-emerald-500"
                : "bg-emerald-400/80 border-emerald-200"
              : C.isBright
                ? "bg-white border-sky-300"
                : "bg-white/5 border-white/30"
          }`}
        />
      ))}
    </div>
  );
}

function BaseTenBlocksWorkspace({ operands }) {
  const C = useScratchpadCellTokens();
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

      <div className={`${C.dividerBorder} pt-4 flex flex-col gap-3 items-center`}>
        <span className={C.mutedTextSm} dir="rtl">
          עבודה
        </span>
        <div className="flex flex-wrap gap-2 justify-center min-h-[48px]">
          {Array.from({ length: tens }, (_, i) => (
            <div
              key={`t-${i}`}
              className={
                C.isBright
                  ? "h-10 w-24 rounded bg-emerald-200 border-2 border-emerald-400"
                  : "h-10 w-24 rounded bg-emerald-500/60 border border-emerald-200/50"
              }
              aria-hidden
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
          {Array.from({ length: ones }, (_, i) => (
            <div
              key={`o-${i}`}
              className={
                C.isBright
                  ? "h-8 w-8 rounded bg-emerald-300 border-2 border-emerald-500"
                  : "h-8 w-8 rounded bg-emerald-400/70 border border-emerald-100/50"
              }
              aria-hidden
            />
          ))}
        </div>
        <div className="flex gap-2 justify-center flex-wrap">
          <button type="button" className={C.chipBtn} onClick={() => setTens((n) => n + 1)}>
            +10
          </button>
          <button type="button" className={C.chipBtn} onClick={() => setOnes((n) => n + 1)}>
            +1
          </button>
          <button type="button" className={C.chipBtn} onClick={() => setTens((n) => Math.max(0, n - 1))}>
            −10
          </button>
          <button type="button" className={C.chipBtn} onClick={() => setOnes((n) => Math.max(0, n - 1))}>
            −1
          </button>
        </div>
      </div>
    </div>
  );
}

function ManualNumberLineWorkspace({ operands }) {
  const C = useScratchpadCellTokens();
  const { a, b } = operands;
  const maxVal = Math.max(a ?? 10, b ?? 10, 10);
  const tickCount = Math.min(Math.max(maxVal + 2, 11), 101);
  const [marks, setMarks] = useState(() => new Set());

  useEffect(() => {
    setMarks(new Set());
  }, [tickCount, a, b]);

  return (
    <div className="overflow-x-auto px-2" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className={`flex items-end gap-1 min-w-max pb-6 ${C.numberLineAxis}`}>
        {Array.from({ length: tickCount }, (_, i) => {
          const isOperandA = a != null && i === a;
          const isOperandB = b != null && i === b;
          const isOperand = isOperandA || isOperandB;
          return (
            <div key={i} className="flex flex-col items-center w-6 shrink-0">
              <span
                className={`text-[10px] font-mono mb-0.5 h-4 ${
                  isOperand
                    ? C.isBright
                      ? "text-sky-800 font-bold"
                      : "text-sky-200 font-bold"
                    : C.isBright
                      ? "text-slate-400"
                      : "text-white/40"
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
                    marks.has(i)
                      ? C.isBright
                        ? "bg-amber-400 border border-amber-500"
                        : "bg-yellow-300"
                      : "bg-transparent"
                  }`}
                />
                <div
                  className={`h-3 w-px ${
                    isOperand
                      ? C.isBright
                        ? "bg-sky-500"
                        : "bg-sky-300/80"
                      : C.isBright
                        ? "bg-sky-300"
                        : "bg-white/50"
                  }`}
                />
              </button>
              <span className={`text-[10px] font-mono mt-0.5 ${C.isBright ? "text-slate-500" : "text-white/50"}`}>
                {i}
              </span>
            </div>
          );
        })}
      </div>
      <p className={`${C.mutedTextXs} mt-2 text-center`} dir="rtl">
        המספרים מסומנים בקו - לחצו לסימון עבודה
      </p>
    </div>
  );
}

function PlaceValueTableWorkspace({ operands, centerOperands = false, fillParent = false }) {
  const C = useScratchpadCellTokens();
  const fractionMode = operands.operation === "fractions";
  const { fractionOperands = [], fractionOperator = null } = operands;
  const spec = PAPER_GRID_PLACE_VALUE;
  const { topRow, bottomRow, headerLabels: labels } = useMemo(
    () =>
      buildPlaceValueOperandLayout(
        operands.a,
        operands.b,
        spec.cols,
        undefined,
        digitCount,
        numberToDigitCells
      ),
    [operands.a, operands.b, spec.cols]
  );
  const divisionExerciseRow = useMemo(() => {
    if (!centerOperands) return null;
    const dividendCells = numberToDigitCells(operands.a, digitCount(operands.a ?? 0));
    const divisorCells = numberToDigitCells(operands.b, digitCount(operands.b ?? 0));
    const blockLen = dividendCells.length + divisorCells.length;
    const blockStart = Math.max(0, Math.floor((spec.cols - blockLen) / 2));
    return {
      cells: centerAlignDigitCells([...dividendCells, ...divisorCells], spec.cols),
      dividerCol: blockStart + dividendCells.length,
      dividendStartCol: blockStart,
      dividendLen: dividendCells.length,
    };
  }, [operands.a, operands.b, spec.cols, centerOperands]);
  const fractionExerciseLayout = useMemo(() => {
    if (!fractionMode) return null;
    return buildFractionExerciseLayout(fractionOperands, fractionOperator, spec.cols);
  }, [fractionMode, fractionOperands, fractionOperator, spec.cols]);
  const [workGrid, setWorkGrid] = useState(() =>
    createEmptyPaperGrid(spec.workRows, spec.cols)
  );
  const resetKey = fractionMode
    ? `${fractionOperands.map((f) => `${f.num}/${f.den}${f.missingDen ? "?" : ""}`).join("|")}|${fractionOperator}`
    : `${operands.a}|${operands.b}`;
  const [carryRow, setCarryRow] = useCarryRow(spec.cols, resetKey);
  const [missingDenValue, setMissingDenValue] = useState("");

  useEffect(() => {
    setWorkGrid(createEmptyPaperGrid(spec.workRows, spec.cols));
  }, [spec.workRows, spec.cols, resetKey]);

  useEffect(() => {
    setMissingDenValue("");
  }, [resetKey]);

  return (
    <PaperScrollShell fillParent={fillParent}>
      <table className="mx-auto border-collapse text-center">
        {!fractionMode && (
          <thead>
            {!centerOperands && (
              <tr>
                {labels.map((label, i) => (
                  <th key={i} className={C.headerCell}>
                    {label}
                  </th>
                ))}
              </tr>
            )}
            <tr>
              <th colSpan={spec.cols} className={C.carryLabel} dir="rtl">
                {centerOperands ? "מנה" : "נשיאה"}
              </th>
            </tr>
          </thead>
        )}
        <tbody>
          {!fractionMode && (
            <PaperCarryRowTable
              carryRow={carryRow}
              setCarryRow={setCarryRow}
              carryCellClass={C.carryCell}
              tableCellClass={C.carryTableCell}
            />
          )}
          {fractionMode && fractionExerciseLayout ? (
            <>
              <tr>
                {fractionExerciseLayout.numRow.map((cell, ci) => (
                  <td key={`frac-num-${ci}`} className={C.tableCellStrong}>
                    <ScratchpadDigitDisplay
                      value={cell}
                      className={C.operandCell}
                      aria-label={`fraction numerator col ${ci + 1}`}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                {renderPartialLineCells(
                  fractionExerciseLayout.lineRow,
                  spec.cols,
                  "frac-line",
                  C.fracLine
                )}
              </tr>
              <tr>
                {fractionExerciseLayout.denRow.map((cell, ci) => (
                  <td key={`frac-den-${ci}`} className={C.tableCellStrong}>
                    {fractionExerciseLayout.denMissingAt[ci] ? (
                      <ScratchpadDigitInput
                        value={missingDenValue}
                        onChange={setMissingDenValue}
                        className={C.workCell}
                        aria-label="fraction denominator"
                        maxLength={3}
                      />
                    ) : (
                      <ScratchpadDigitDisplay
                        value={cell}
                        className={C.operandCell}
                        aria-label={`fraction denominator col ${ci + 1}`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            </>
          ) : fractionMode ? (
            <tr>
              <td colSpan={spec.cols} className={C.tableCellStrong}>
                <ScratchpadDigitDisplay
                  value="-"
                  className={`${C.operandCell} mx-auto`}
                  aria-label="fraction exercise"
                />
              </td>
            </tr>
          ) : null}
          {centerOperands && divisionExerciseRow ? (
            <>
              <tr>
                {(() => {
                  const lineCells = [];
                  let ci = 0;
                  while (ci < spec.cols) {
                    if (ci === divisionExerciseRow.dividendStartCol) {
                      lineCells.push(
                        <td
                          key={`line-${ci}`}
                          colSpan={divisionExerciseRow.dividendLen}
                          className="p-0 border-0"
                        >
                          <div
                            className={C.longDivisionStructureH}
                            data-testid="scratchpad-long-division-line-h"
                          />
                        </td>
                      );
                      ci += divisionExerciseRow.dividendLen;
                    } else {
                      lineCells.push(
                        <td key={`line-pad-${ci}`} className="p-0 border-0" aria-hidden="true" />
                      );
                      ci += 1;
                    }
                  }
                  return lineCells;
                })()}
              </tr>
              <tr>
                {divisionExerciseRow.cells.map((cell, ci) => (
                  <td
                    key={ci}
                    className={
                      ci === divisionExerciseRow.dividerCol
                        ? `border-t border-r border-b p-0.5 ${C.tableCellStrong} ${C.longDivisionStructureV}`
                        : C.tableCellStrong
                    }
                    data-testid={
                      ci === divisionExerciseRow.dividerCol
                        ? "scratchpad-long-division-line-v"
                        : undefined
                    }
                  >
                    <ScratchpadDigitDisplay
                      value={cell}
                      className={C.operandCell}
                      aria-label={`exercise col ${ci + 1}`}
                    />
                  </td>
                ))}
              </tr>
            </>
          ) : !fractionMode ? (
            [topRow, bottomRow].map((cells, ri) => (
              <tr key={`operand-${ri}`}>
                {cells.map((cell, ci) => (
                  <td key={ci} className={C.tableCellStrong}>
                    <ScratchpadDigitDisplay
                      value={cell}
                      className={C.operandCell}
                      aria-label={`operand row ${ri + 1} col ${ci + 1}`}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : null}
          {!centerOperands && !fractionMode ? (
            <tr>
              <td colSpan={spec.cols} className="py-1">
                <div className={C.resultSeparator} />
              </td>
            </tr>
          ) : null}
          <PaperWorkGridRows
            grid={workGrid}
            setGrid={setWorkGrid}
            rowLabelPrefix="place-value-work"
            workCellClass={C.workCell}
            tableCellClass={C.tableCell}
          />
        </tbody>
      </table>
    </PaperScrollShell>
  );
}

function MathNotebookGridWorkspace({
  operands,
  operatorSymbol,
  fillParent = false,
}) {
  const C = useScratchpadCellTokens();
  const { a, b } = operands;
  const spec = PAPER_GRID_NOTEBOOK;
  const [workGrid, setWorkGrid] = useState(() =>
    createEmptyPaperGrid(spec.workRows, spec.cols)
  );

  useEffect(() => {
    setWorkGrid(createEmptyPaperGrid(spec.workRows, spec.cols));
  }, [spec.workRows, spec.cols, a, b, operatorSymbol]);

  const left = a == null ? "?" : String(a);
  const right = b == null ? "?" : String(b);

  return (
    <PaperScrollShell fillParent={fillParent}>
      <div className="flex flex-col w-full gap-3">
        <p className={C.exerciseText} dir="ltr" aria-label="exercise">
          {left} {operatorSymbol} {right} = __
        </p>
        <table className="border-collapse mx-auto w-full min-w-max" dir="ltr">
          <tbody>
            <PaperWorkGridRows
              grid={workGrid}
              setGrid={setWorkGrid}
              rowLabelPrefix="notebook"
              workCellClass={C.workCell}
              tableCellClass={C.tableCell}
            />
          </tbody>
        </table>
      </div>
    </PaperScrollShell>
  );
}

function VerticalLayoutWorkspace({ operands, variant, fillParent = false }) {
  const operatorSymbol = variant === "blank_vertical_subtraction" ? "−" : "+";
  return (
    <MathNotebookGridWorkspace
      operands={operands}
      operatorSymbol={operatorSymbol}
      fillParent={fillParent}
    />
  );
}

function MultiplicationArrayWorkspace({ operands, fillParent = false }) {
  return (
    <MathNotebookGridWorkspace operands={operands} operatorSymbol="×" fillParent={fillParent} />
  );
}

function DivisionGroupsWorkspace({ operands }) {
  const C = useScratchpadCellTokens();
  const { a, b } = operands;
  const count = Math.min(Math.max(0, Math.round(a ?? 0)), 60);
  const [groups, setGroups] = useState(() => Array(count).fill(0));

  useEffect(() => {
    setGroups(Array(Math.min(Math.max(0, Math.round(a ?? 0)), 60)).fill(0));
  }, [a, b]);

  return (
    <div className="flex flex-col items-center gap-4" dir="ltr" onKeyDown={stopKeyBubble}>
      <div className={`flex gap-6 text-sm font-bold ${C.labelText}`}>
        <ScratchpadDigitDisplay value={String(a ?? "")} className={C.operandBadge} aria-label="dividend" />
        <span className={C.mutedTextSm}>÷</span>
        <ScratchpadDigitDisplay value={String(b ?? "")} className={C.operandBadge} aria-label="divisor" />
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
                next[i] = (next[i] + 1) % C.groupColors.length;
                return next;
              })
            }
            className={`h-8 w-8 rounded-full border-2 ${C.groupColors[groupId]}`}
          />
        ))}
      </div>
      <p className={`${C.mutedTextXs} text-center`} dir="rtl">
        לחצו לסימון קבוצות - ללא חלוקה אוטומטית
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
  const C = useScratchpadCellTokens();

  const numValue = numerator == null ? "" : String(numerator);
  const denValue = denominator == null ? "" : String(denominator);

  return (
    <div className="inline-flex flex-col items-center justify-center min-w-[3rem]">
      {editable && !missingDen ? (
        <ScratchpadDigitInput
          value={numValue}
          onChange={onNumeratorChange}
          className={C.fracResultClass}
          aria-label="fraction numerator"
          maxLength={3}
        />
      ) : (
        <ScratchpadDigitDisplay
          value={numValue}
          className={C.fracNumClass}
          aria-label="fraction numerator"
        />
      )}
      <div className={`w-full min-w-[2.75rem] ${C.fracLine} my-1`} aria-hidden />
      {editable || missingDen ? (
        <ScratchpadDigitInput
          value={denValue}
          onChange={onDenominatorChange}
          className={C.fracResultClass}
          aria-label="fraction denominator"
          maxLength={3}
        />
      ) : (
        <ScratchpadDigitDisplay
          value={denValue}
          className={C.fracDenClass}
          aria-label="fraction denominator"
        />
      )}
    </div>
  );
}

function FractionStripsWorkspace({ operands }) {
  const C = useScratchpadCellTokens();
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
              <span className={C.operatorSymbol}>{fractionOperator}</span>
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
            <span className={C.operatorSymbol}>=</span>
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
  const C = useScratchpadCellTokens();
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

  function renderOperandRow(intCells, fracCells) {
    return (
      <tr>
        {intCells.map((cell, i) => (
          <td key={`i-${i}`} className={C.tableCellStrong}>
            <ScratchpadDigitDisplay value={cell} className={C.decimalOperandClass} aria-label={`int ${i + 1}`} />
          </td>
        ))}
        <td className={`${C.tableCellStrong} ${C.decimalDot}`}>.</td>
        {fracCells.map((cell, i) => (
          <td key={`f-${i}`} className={C.tableCellStrong}>
            <ScratchpadDigitDisplay value={cell} className={C.decimalOperandClass} aria-label={`frac ${i + 1}`} />
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
              <td key={`ri-${i}`} className={C.tableCellStrong}>
                <ScratchpadDigitInput
                  value={cell}
                  onChange={(v) => {
                    setResultInt((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                  }}
                  className={C.decimalResultClass}
                  aria-label={`result int ${i + 1}`}
                />
              </td>
            ))}
            <td className={`${C.tableCellStrong} ${C.decimalDot}`}>.</td>
            {resultFrac.map((cell, i) => (
              <td key={`rf-${i}`} className={C.tableCellStrong}>
                <ScratchpadDigitInput
                  value={cell}
                  onChange={(v) => {
                    setResultFrac((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    });
                  }}
                  className={C.decimalResultClass}
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
  const C = useScratchpadCellTokens();
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
              filled ? "bg-violet-400 border-violet-500" : "bg-white border-sky-300"
            }`}
          />
        ))}
      </div>
      <p className={C.mutedTextXs} dir="rtl">
        סמנו ריבועים - ללא חישוב אחוז
      </p>
    </div>
  );
}

function RatioTableWorkspace() {
  const C = useScratchpadCellTokens();
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
            <th className={C.ratioTh}>צד א׳</th>
            <th className={C.ratioTh}>צד ב׳</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={C.tableCellStrong}>
                  <ScratchpadDigitInput
                    value={cell}
                    onChange={(v) => {
                      setRows((prev) => {
                        const next = prev.map((r) => [...r]);
                        next[ri][ci] = v;
                        return next;
                      });
                    }}
                    className={C.inlineInputLg}
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
  const C = useScratchpadCellTokens();
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
            className={C.inlineInputMd}
            aria-label={`order slot ${i + 1}`}
            maxLength={2}
          />
        ))}
      </div>
      <p className={`${C.mutedTextXs} text-center`} dir="rtl">
        תיבות ריקות לסדר פעולות - ללא רמז לפעולה
      </p>
    </div>
  );
}

function WordProblemStructureBoard() {
  const C = useScratchpadCellTokens();
  const calcSlots = 6;
  const [calcCells, setCalcCells] = useState(() => Array(calcSlots).fill(""));

  useEffect(() => {
    setCalcCells(Array(calcSlots).fill(""));
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full max-w-md" dir="rtl" onKeyDown={stopKeyBubble}>
      <section className={C.sectionBox}>
        <h4 className={`${C.sectionTitle} mb-2`}>נתונים:</h4>
        <div className={C.sectionDashed} aria-hidden />
      </section>
      <section className={C.sectionBox}>
        <h4 className={`${C.sectionTitle} mb-2`}>שאלה:</h4>
        <div className={C.sectionDashed} aria-hidden />
      </section>
      <section className={C.sectionBox}>
        <h4 className={`${C.sectionTitle} mb-2`}>חישוב:</h4>
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
              className={C.inlineInputSm}
              aria-label={`calculation slot ${i + 1}`}
              maxLength={3}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function isDivisionOperation(operation) {
  return operation === "division" || operation === "division_with_remainder";
}

/**
 * @param {{ type: string, operands: { a: number|null, b: number|null, operation: string|null }, embeddedInOverlay?: boolean }} props
 */
export default function MathScratchpadWorkspace({ type, operands, embeddedInOverlay = false }) {
  const fillParent = embeddedInOverlay;
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
      return (
        <PlaceValueTableWorkspace
          operands={operands}
          centerOperands={isDivisionOperation(operands.operation)}
          fillParent={fillParent}
        />
      );
    case "blank_vertical_addition":
      return (
        <VerticalLayoutWorkspace
          operands={operands}
          variant="blank_vertical_addition"
          fillParent={fillParent}
        />
      );
    case "blank_vertical_subtraction":
      return (
        <VerticalLayoutWorkspace
          operands={operands}
          variant="blank_vertical_subtraction"
          fillParent={fillParent}
        />
      );
    case "blank_multiplication_array":
      return <MultiplicationArrayWorkspace operands={operands} fillParent={fillParent} />;
    case "blank_division_groups":
      return <DivisionGroupsWorkspace operands={operands} />;
    case "blank_long_division_grid":
      return <PlaceValueTableWorkspace operands={operands} centerOperands fillParent={fillParent} />;
    case "blank_fraction_strips":
      return (
        <PlaceValueTableWorkspace
          operands={{ ...operands, operation: operands.operation || "fractions" }}
          fillParent={fillParent}
        />
      );
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
