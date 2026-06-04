/** Shared step-by-step metadata → place-value highlight mapping for vertical arithmetic. */

export const PLACE_VALUE_SUFFIXES = ["Units", "Tens", "Hundreds"];

export const PLACE_VALUE_LABELS = ["אחדות", "עשרות", "מאות"];

const PLACE_SUFFIX_BY_COLUMN = {
  0: "Units",
  1: "Tens",
  2: "Hundreds",
};

export function columnIndexFromHighlightSuffix(suffix) {
  if (suffix === "Units") return 0;
  if (suffix === "Tens") return 1;
  if (suffix === "Hundreds") return 2;
  return null;
}

export function resolveActiveColumnFromHighlights(highlights = []) {
  if (!Array.isArray(highlights)) return null;
  for (const suffix of PLACE_VALUE_SUFFIXES) {
    const inColumn =
      highlights.includes(`a${suffix}`) ||
      highlights.includes(`b${suffix}`) ||
      highlights.includes(`result${suffix}`);
    if (inColumn) return columnIndexFromHighlightSuffix(suffix);
  }
  return null;
}

export function getPlaceValueLabel(columnFromRight) {
  return PLACE_VALUE_LABELS[columnFromRight] ?? null;
}

export function hasColumnSpecificHighlights(highlights = []) {
  return PLACE_VALUE_SUFFIXES.some(
    (suffix) =>
      highlights.includes(`a${suffix}`) ||
      highlights.includes(`b${suffix}`) ||
      highlights.includes(`result${suffix}`)
  );
}

export function getCarryDigitAtColumn(carryDigits, columnFromRight, maxLen) {
  if (!Array.isArray(carryDigits) || maxLen <= 0) return " ";
  const idx = maxLen - 1 - columnFromRight;
  return carryDigits[idx] ?? " ";
}

export function shouldHighlightRowCell(highlights, row, columnFromRight, activeColumn = null) {
  const list = Array.isArray(highlights) ? highlights : [];
  if (list.length === 0) return false;

  const allKey =
    row === "a" ? "aAll" : row === "b" ? "bAll" : row === "result" ? "resultAll" : null;
  if (allKey && list.includes(allKey)) return true;

  if (!hasColumnSpecificHighlights(list)) return false;
  if (activeColumn == null || columnFromRight !== activeColumn) return false;

  const suffix = PLACE_SUFFIX_BY_COLUMN[activeColumn] ?? "Hundreds";
  return list.includes(`${row}${suffix}`);
}

export function getCarryHighlightColumns(activeColumn, step, carryDigits, maxLen) {
  const cols = new Set();
  if (activeColumn == null || !Array.isArray(carryDigits) || maxLen <= 0) return cols;

  if (getCarryDigitAtColumn(carryDigits, activeColumn, maxLen) === "1") {
    cols.add(activeColumn);
  }

  if (step?.carry && activeColumn + 1 < maxLen) {
    cols.add(activeColumn + 1);
  }

  return cols;
}

export function parseCarryRowFromPre(pre) {
  if (!pre || typeof pre !== "string") return null;
  const lines = pre.split("\n");
  const dashIdx = lines.findIndex((line) => /^-+$/.test(line.trim()));
  if (dashIdx < 2) return null;
  const topIdx = dashIdx - 2;
  if (topIdx <= 0) return null;
  const carryLine = lines[topIdx - 1];
  if (!carryLine || !carryLine.trim()) return null;
  if (!/[1]/.test(carryLine)) return null;
  return carryLine;
}

export function alignCarryToColumns(carryLine, maxLen) {
  if (!carryLine || maxLen <= 0) return [];
  const chars = carryLine.split("");
  const slice = chars.slice(-maxLen);
  while (slice.length < maxLen) slice.unshift(" ");
  return slice.map((ch) => (ch === "1" ? "1" : " "));
}

export function buildVerticalExerciseDigitLayout({ topValue, bottomValue, answerValue, isDecimal = false }) {
  const safeToFixed2 = (v) => (typeof v === "number" ? v.toFixed(2) : String(v ?? ""));
  const topStr = isDecimal ? safeToFixed2(topValue) : String(topValue);
  const bottomStr = isDecimal ? safeToFixed2(bottomValue) : String(bottomValue);
  const answerStr = isDecimal ? safeToFixed2(answerValue) : String(answerValue);
  const maxLen = Math.max(topStr.length, bottomStr.length, answerStr.length);
  return {
    maxLen,
    topDigits: topStr.padStart(maxLen, " ").split(""),
    bottomDigits: bottomStr.padStart(maxLen, " ").split(""),
    answerDigits: answerStr.padStart(maxLen, " ").split(""),
  };
}

export function resolveStepExerciseHighlight(step, layout, pre) {
  const highlights = Array.isArray(step?.highlights) ? [...step.highlights] : [];
  const activeColumn = resolveActiveColumnFromHighlights(highlights);
  const carryLine = parseCarryRowFromPre(pre);
  const carryDigits = alignCarryToColumns(carryLine, layout.maxLen);
  const carryHighlightColumns = getCarryHighlightColumns(
    activeColumn,
    step,
    carryLine ? carryDigits : null,
    layout.maxLen
  );
  const activeColumnLabel =
    activeColumn != null && !highlights.includes("aAll") && !highlights.includes("bAll")
      ? getPlaceValueLabel(activeColumn)
      : null;
  const revealDigits = typeof step?.revealDigits === "number" ? step.revealDigits : 0;

  return {
    stepId: step?.id ?? null,
    highlights,
    activeColumn,
    activeColumnLabel,
    carryDigits: carryLine ? carryDigits : null,
    carryHighlightColumns,
    revealDigits,
  };
}

export function buildStepCellHighlightState(step, layout, pre) {
  const meta = resolveStepExerciseHighlight(step, layout, pre);
  const { maxLen } = layout;
  const { highlights, activeColumn, carryHighlightColumns, revealDigits } = meta;

  const operandA = Array.from({ length: maxLen }, (_, idx) => {
    const columnFromRight = maxLen - idx - 1;
    return shouldHighlightRowCell(highlights, "a", columnFromRight, activeColumn);
  });
  const operandB = Array.from({ length: maxLen }, (_, idx) => {
    const columnFromRight = maxLen - idx - 1;
    return shouldHighlightRowCell(highlights, "b", columnFromRight, activeColumn);
  });
  const result = Array.from({ length: maxLen }, (_, idx) => {
    const columnFromRight = maxLen - idx - 1;
    const isVisible = columnFromRight < revealDigits;
    return (
      isVisible &&
      shouldHighlightRowCell(highlights, "result", columnFromRight, activeColumn)
    );
  });
  const carry = Array.from({ length: maxLen }, (_, idx) => {
    const columnFromRight = maxLen - idx - 1;
    return carryHighlightColumns.has(columnFromRight);
  });

  return {
    ...meta,
    operandA,
    operandB,
    result,
    carry,
  };
}

export function supportsPlaceValueStepExerciseView(effectiveOp, op, opSymbol) {
  return (
    effectiveOp === "addition" ||
    effectiveOp === "subtraction" ||
    (op === "decimals" && (opSymbol === "+" || opSymbol === "−"))
  );
}
