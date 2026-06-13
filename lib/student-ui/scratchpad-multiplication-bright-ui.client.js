/**
 * @deprecated Use scratchpad-bright-cells-ui.client.js — kept for import compatibility.
 */
export {
  SCRATCHPAD_BRIGHT_CELLS as SCRATCHPAD_MULTIPLICATION_BRIGHT,
} from "./scratchpad-bright-cells-ui.client.js";

/** @deprecated Bright cells apply to all scratchpad types when isBright. */
export function isMultiplicationBrightScratchpad(isBright, scratchpadType, operation) {
  if (!isBright) return false;
  if (operation === "multiplication") {
    return (
      scratchpadType === "blank_multiplication_array" ||
      scratchpadType === "blank_place_value_table"
    );
  }
  return Boolean(scratchpadType);
}
