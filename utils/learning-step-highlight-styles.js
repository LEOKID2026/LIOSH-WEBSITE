/** Shared highlight styles for step-by-step exercise views. */

export const HIGHLIGHT_STYLE = {
  backgroundColor: "rgba(251, 191, 36, 0.15)",
  boxShadow: "inset 0 0 0 1px rgba(251, 191, 36, 0.45)",
};

export const OP_COL_WIDTH = "1rem";
export const DIGIT_COL_WIDTH = "1.5ch";

export function gridColumns(maxLen) {
  return `${OP_COL_WIDTH} repeat(${maxLen}, ${DIGIT_COL_WIDTH})`;
}
