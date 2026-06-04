/** Fraction step-by-step highlight mapping. */

const FRACTION_HIGHLIGHT_REGIONS = {
  fraction1: "frac1",
  fraction2: "frac2",
  denominator: "den",
  numerators: "num",
  commonDen: "common",
  convert1: "conv1",
  convert2: "conv2",
  simplify: "simp",
  mixed: "mixed",
  calculation: "calc",
  result: "result",
};

export function parseFractionPreLines(pre) {
  if (!pre || typeof pre !== "string") return [];
  return pre
    .replace(/\u2066|\u2069/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * @param {string} line
 * @param {string[]} highlights
 */
export function highlightFractionLine(line, highlights = []) {
  if (!line || !highlights.length) return [{ text: line, highlighted: false }];

  const regions = new Set(highlights.map((h) => FRACTION_HIGHLIGHT_REGIONS[h] || h));

  if (regions.has("frac1") || regions.has("frac2")) {
    const parts = line.split(/(\d+\/\d+)/g).filter(Boolean);
    return parts.map((part, idx) => {
      const isFrac = /^\d+\/\d+$/.test(part);
      let highlighted = false;
      if (isFrac) {
        const fracIdx = parts.slice(0, idx + 1).filter((p) => /^\d+\/\d+$/.test(p)).length;
        if (regions.has("frac1") && fracIdx === 1) highlighted = true;
        if (regions.has("frac2") && fracIdx === 2) highlighted = true;
      }
      return { text: part, highlighted };
    });
  }

  if (regions.has("den") || regions.has("num")) {
    return line.split(/(\d+\/\d+|\d+)/g).filter(Boolean).map((part) => {
      if (regions.has("den") && part.includes("/")) {
        const [, den] = part.split("/");
        return [
          { text: part.replace(/\/\d+$/, "/"), highlighted: false },
          { text: den, highlighted: true },
        ];
      }
      if (regions.has("num") && /^\d+$/.test(part)) {
        return { text: part, highlighted: true };
      }
      if (regions.has("den") && /\/(\d+)/.test(part)) {
        return { text: part, highlighted: part.includes("/") };
      }
      return { text: part, highlighted: regions.has("result") && part === line.trim() };
    }).flat();
  }

  const highlightAll = ["common", "conv1", "conv2", "simp", "mixed", "calc", "result"].some((r) =>
    regions.has(r)
  );
  if (highlightAll) {
    const numMatch = line.match(/\d+/g);
    if (numMatch?.length) {
      const target = numMatch[numMatch.length - 1];
      const idx = line.lastIndexOf(target);
      if (idx >= 0) {
        return [
          { text: line.slice(0, idx), highlighted: false },
          { text: target, highlighted: true },
          { text: line.slice(idx + target.length), highlighted: false },
        ].filter((p) => p.text.length > 0);
      }
    }
  }

  return [{ text: line, highlighted: false }];
}

export function enrichFractionStepMetadata(step) {
  if (step?.type !== "fractions") return step;
  return { ...step, exerciseView: "fraction" };
}

export function enrichFractionSteps(steps) {
  if (!Array.isArray(steps)) return steps;
  return steps.map((s) => enrichFractionStepMetadata(s));
}
