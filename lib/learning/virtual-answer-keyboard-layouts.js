/** @typedef {{ id: string, label: string, ariaLabel?: string, colSpan?: number, action?: "backspace" | "clear", spacer?: boolean }} VirtualKeyboardKeyDef */

/** @typedef {{ id: string, keys: VirtualKeyboardKeyDef[] }} VirtualKeyboardRow */

/** @type {VirtualKeyboardRow[]} */
export const NUMERIC_VIRTUAL_KEYBOARD_ROWS = [
  {
    id: "row-789",
    keys: [
      { id: "7", label: "7" },
      { id: "8", label: "8" },
      { id: "9", label: "9" },
    ],
  },
  {
    id: "row-456",
    keys: [
      { id: "4", label: "4" },
      { id: "5", label: "5" },
      { id: "6", label: "6" },
    ],
  },
  {
    id: "row-123-actions",
    keys: [
      { id: "1", label: "1" },
      { id: "2", label: "2" },
      { id: "3", label: "3" },
    ],
  },
  {
    id: "row-0-separators",
    keys: [
      { id: "-", label: "−" },
      { id: ".", label: "." },
      { id: ",", label: "," },
      { id: "0", label: "0" },
    ],
  },
  {
    id: "row-edit",
    keys: [
      { id: "backspace", label: "⌫", ariaLabel: "מחק", action: "backspace" },
      { id: "clear", label: "נקה", action: "clear", colSpan: 2 },
    ],
  },
];

/** Compact 4×4 mobile layout — fewer rows, tighter vertical footprint. */
export const NUMERIC_VIRTUAL_KEYBOARD_ROWS_COMPACT = [
  {
    id: "m-row-789-bk",
    keys: [
      { id: "7", label: "7" },
      { id: "8", label: "8" },
      { id: "9", label: "9" },
      { id: "backspace", label: "⌫", ariaLabel: "מחק", action: "backspace" },
    ],
  },
  {
    id: "m-row-456-clear",
    keys: [
      { id: "4", label: "4" },
      { id: "5", label: "5" },
      { id: "6", label: "6" },
      { id: "clear", label: "נקה", action: "clear" },
    ],
  },
  {
    id: "m-row-123-dot",
    keys: [
      { id: "1", label: "1" },
      { id: "2", label: "2" },
      { id: "3", label: "3" },
      { id: ".", label: "." },
    ],
  },
  {
    id: "m-row-0-submit",
    keys: [{ id: "0", label: "0" }],
  },
];

/** Future layout — not wired yet. */
export const HEBREW_VIRTUAL_KEYBOARD_ROWS = [];

/** Future layout — not wired yet. */
export const ENGLISH_VIRTUAL_KEYBOARD_ROWS = [];

/**
 * @param {"numeric" | "hebrew" | "english"} layout
 * @param {{ compact?: boolean }} [options]
 * @returns {VirtualKeyboardRow[]}
 */
export function getVirtualAnswerKeyboardRows(layout, options = {}) {
  if (layout === "hebrew") return HEBREW_VIRTUAL_KEYBOARD_ROWS;
  if (layout === "english") return ENGLISH_VIRTUAL_KEYBOARD_ROWS;
  return options.compact
    ? NUMERIC_VIRTUAL_KEYBOARD_ROWS_COMPACT
    : NUMERIC_VIRTUAL_KEYBOARD_ROWS;
}
