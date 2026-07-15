/** Long division step-by-step highlight mapping. */

export function computeDivisionSteps(dividend, divisor) {
  const divSteps = [];
  const divStr = String(dividend);
  let wNum = 0;
  let qPos = 0;
  let startPos = 0;

  for (let i = 0; i < divStr.length; i++) {
    if (wNum === 0) startPos = i;
    wNum = wNum * 10 + parseInt(divStr[i], 10);
    if (wNum >= divisor) {
      const qDig = Math.floor(wNum / divisor);
      const prod = qDig * divisor;
      const rem = wNum - prod;
      divSteps.push({
        pos: i,
        startPos,
        wNum,
        qDig,
        prod,
        rem,
        qPos: qPos++,
        wNumLen: String(wNum).length,
      });
      wNum = rem;
      startPos = rem > 0 ? i : i + 1;
    }
  }
  return divSteps;
}

export function parseDivisionPre(pre) {
  if (!pre || typeof pre !== "string") return null;
  const raw = pre.replace(/\u2066|\u2069/g, "");
  const lines = raw
    .split("\n")
    .map((line) => String(line || "").trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return null;

  let bodyIdx = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].includes("│")) {
      bodyIdx = i;
      break;
    }
  }
  if (bodyIdx < 0) return null;

  const baseLine = lines[bodyIdx] || "";
  const pipeIdx = baseLine.indexOf("│");
  if (pipeIdx < 0) return null;
  const dividend = baseLine.slice(0, pipeIdx).trim();
  const divisor = baseLine.slice(pipeIdx + 1).trim();
  const quotientLine =
    bodyIdx >= 2
      ? (lines[0] || "").trim()
      : bodyIdx === 1 && /^[\d.]+$/.test((lines[0] || "").trim())
        ? (lines[0] || "").trim()
        : "";
  return { dividend, divisor, quotientLine, workLines: lines.slice(bodyIdx + 1) };
}

/**
 * Map legacy division highlights to column indices.
 * @param {string[]} highlights
 * @param {number} dividendLen
 */
export function resolveDivisionHighlightKeys(highlights = [], dividendLen) {
  const set = new Set(highlights);
  const out = {
    quotientCols: new Set(),
    dividendCols: new Set(),
    divisorAll: set.has("bAll"),
    productStep: null,
    remainderStep: null,
    workingStep: null,
    resultAll: set.has("resultAll"),
  };

  highlights.forEach((key) => {
    const qMatch = key.match(/^result(\d+)$/);
    if (qMatch) out.quotientCols.add(Number(qMatch[1]));

    const aMatch = key.match(/^a(\d+)$/);
    if (aMatch) out.dividendCols.add(Number(aMatch[1]));

    const prodMatch = key.match(/^product(\d+)$/);
    if (prodMatch) out.productStep = Number(prodMatch[1]);

    const remMatch = key.match(/^remainder(\d+)$/);
    if (remMatch) out.remainderStep = Number(remMatch[1]);

    const wnMatch = key.match(/^workingNum(\d+)$/);
    if (wnMatch) out.workingStep = Number(wnMatch[1]);
  });

  return out;
}

export function enrichDivisionStepMetadata(step) {
  if (step?.type !== "division") return step;
  const highlights = Array.isArray(step.highlights) ? [...step.highlights] : [];
  const stepIndex = typeof step.stepIndex === "number" ? step.stepIndex : null;

  if (step.id?.includes("write") && stepIndex != null) {
    const pos = step.workingNumber != null ? String(step.workingNumber).length - 1 : stepIndex;
    return {
      ...step,
      exerciseView: "longDivision",
      highlights: [...new Set([...highlights, `quotientCol${step.quotientPosition ?? stepIndex}`, `dividendCol${stepIndex}`])],
    };
  }

  if (step.id?.includes("subtract") && stepIndex != null) {
    return {
      ...step,
      exerciseView: "longDivision",
      showWorkLines: true,
      workStepIndex: stepIndex,
    };
  }

  if (step.id?.includes("bring-down") && stepIndex != null) {
    return {
      ...step,
      exerciseView: "longDivision",
      showBringDown: true,
      workStepIndex: stepIndex,
    };
  }

  return { ...step, exerciseView: "longDivision" };
}

export function enrichDivisionSteps(steps) {
  if (!Array.isArray(steps)) return steps;
  return steps.map((s) => enrichDivisionStepMetadata(s));
}
