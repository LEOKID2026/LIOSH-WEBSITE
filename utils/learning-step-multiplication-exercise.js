/** Multiplication step-by-step: parse pre + highlight state. */

import {
  columnIndexFromColumnHighlightKey,
  hasColumnIndexHighlights,
  resolveActiveColumnFromHighlights,
  shouldHighlightRowCell,
} from "./learning-step-vertical-exercise.js";

export function parseMultiplicationPre(pre) {
  if (!pre || typeof pre !== "string") return null;
  const raw = pre.replace(/\u2066|\u2069/g, "");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  if (lines.length < 3) return null;

  const topLine = lines[0];
  const opLine = lines[1];
  const dashIdx = lines.findIndex((l) => /^-+$/.test(l.trim()));
  if (dashIdx < 0) return null;

  const topMatch = topLine.trim();
  const opMatch = opLine.match(/[×x*]\s*(.+)/i);
  const bottomMatch = opMatch ? opMatch[1].trim() : opLine.replace(/[×x*]/, "").trim();
  const partialLines = lines.slice(dashIdx + 1);
  const secondDash = partialLines.findIndex((l) => /^-+$/.test(l.trim()));
  let partialRows = [];
  let sumRow = null;
  let inProgressRow = null;

  if (secondDash >= 0) {
    partialRows = partialLines.slice(0, secondDash).filter((l) => !/^-+$/.test(l.trim()));
    const afterSum = partialLines.slice(secondDash + 1);
    sumRow = afterSum[0]?.trim() || null;
  } else if (partialLines.length === 1) {
    sumRow = partialLines[0].trim();
  } else if (partialLines.length > 1) {
    partialRows = partialLines.slice(0, -1).filter((l) => !/^-+$/.test(l.trim()));
    inProgressRow = partialLines[partialLines.length - 1]?.trim();
    if (inProgressRow && !/\d/.test(inProgressRow.replace(/\s/g, ""))) {
      inProgressRow = null;
    }
  }

  const width = Math.max(
    topMatch.length,
    bottomMatch.length,
    ...partialRows.map((r) => r.length),
    sumRow?.length ?? 0,
    inProgressRow?.length ?? 0
  );

  const pad = (s) => String(s).padStart(width, " ");
  return {
    width,
    top: pad(topMatch),
    bottom: pad(bottomMatch),
    partialRows: partialRows.map(pad),
    inProgressRow: inProgressRow ? pad(inProgressRow) : null,
    sumRow: sumRow ? pad(sumRow) : null,
  };
}

/**
 * Derive column highlights from multiplication step id when missing.
 * @param {object} step
 */
export function enrichMultiplicationStepMetadata(step) {
  if (!step?.id) return step;
  const id = String(step.id);
  const highlights = Array.isArray(step.highlights) ? [...step.highlights] : [];

  const rowStart = id.match(/^row-(\d+)-start$/);
  if (rowStart) {
    const j = Number(rowStart[1]);
    return {
      ...step,
      exerciseView: "multiplication",
      activeMultiplierIndex: j,
      highlights: ["aAll", `bCol${j}`],
    };
  }

  const rowMul = id.match(/^row-(\d+)-mul-(\d+)$/);
  if (rowMul) {
    const j = Number(rowMul[1]);
    const i = Number(rowMul[2]);
    return {
      ...step,
      exerciseView: "multiplication",
      activeMultiplierIndex: j,
      activeColumn: i,
      highlights: [`aCol${i}`, `bCol${j}`],
    };
  }

  const sumCol = id.match(/^sum-col-(\d+)$/);
  if (sumCol) {
    const col = Number(sumCol[1]);
    return {
      ...step,
      exerciseView: "multiplication",
      activeColumn: col,
      highlights: [`resultCol${col}`, "partialAll"],
    };
  }

  if (id === "sum-start" || id.startsWith("row-") || id === "place-value" || id === "explain") {
    return { ...step, exerciseView: "multiplication", highlights: highlights.length ? highlights : ["aAll", "bAll"] };
  }

  if (id === "final" || id === "single-digit") {
    return { ...step, exerciseView: "multiplication", highlights: ["resultAll"] };
  }

  return { ...step, exerciseView: "multiplication" };
}

export function buildMultiplicationLayout(parsed) {
  if (!parsed) return null;
  const { width, top, bottom, partialRows, inProgressRow, sumRow } = parsed;
  return {
    width,
    topDigits: top.split(""),
    bottomDigits: bottom.split(""),
    partialRows: partialRows.map((r) => r.split("")),
    inProgressDigits: inProgressRow ? inProgressRow.split("") : null,
    sumDigits: sumRow ? sumRow.split("") : null,
  };
}

export function buildMultiplicationHighlightState(step, layout) {
  const highlights = Array.isArray(step?.highlights) ? step.highlights : [];
  const activeColumn = resolveActiveColumnFromHighlights(highlights);
  const activeMultiplierIndex =
    typeof step?.activeMultiplierIndex === "number" ? step.activeMultiplierIndex : null;

  const highlightRow = (rowKey, digits, rowIndex = null) =>
    digits.map((digit, idx) => {
      const columnFromRight = layout.width - idx - 1;
      if (!/\d/.test(digit)) return false;
      if (highlights.includes(`${rowKey}All`)) return true;
      if (rowKey === "partial" && highlights.includes("partialAll")) return true;
      if (activeMultiplierIndex != null && rowKey === "b") {
        if (highlights.includes(`bCol${activeMultiplierIndex}`)) {
          return columnFromRight === activeMultiplierIndex;
        }
      }
      if (hasColumnIndexHighlights(highlights)) {
        return shouldHighlightRowCell(highlights, rowKey === "partial" ? "result" : rowKey, columnFromRight, activeColumn);
      }
      return false;
    });

  return {
    top: highlightRow("a", layout.topDigits),
    bottom: highlightRow("b", layout.bottomDigits),
    partials: layout.partialRows.map((row, ri) => {
      const rowHighlights = highlightRow("partial", row, ri);
      if (activeMultiplierIndex === ri && highlights.includes("partialAll")) {
        return row.map((d) => /\d/.test(d));
      }
      return rowHighlights;
    }),
    inProgress: layout.inProgressDigits
      ? highlightRow("result", layout.inProgressDigits)
      : null,
    sum: layout.sumDigits ? highlightRow("result", layout.sumDigits) : null,
    revealDigits: typeof step?.revealDigits === "number" ? step.revealDigits : 0,
  };
}

export function enrichMultiplicationSteps(steps) {
  if (!Array.isArray(steps)) return steps;
  return steps.map((s) => enrichMultiplicationStepMetadata(s));
}
