/** @typedef {{ id: string, label: string, ariaLabel?: string, colSpan?: number, action?: "backspace" | "clear" }} VirtualKeyboardKeyDef */

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

/** Future layout — not wired yet. */
export const HEBREW_VIRTUAL_KEYBOARD_ROWS = [];

/** Future layout — not wired yet. */
export const ENGLISH_VIRTUAL_KEYBOARD_ROWS = [];

/**
 * @param {"numeric" | "hebrew" | "english"} layout
 * @returns {VirtualKeyboardRow[]}
 */
export function getVirtualAnswerKeyboardRows(layout) {
  if (layout === "hebrew") return HEBREW_VIRTUAL_KEYBOARD_ROWS;
  if (layout === "english") return ENGLISH_VIRTUAL_KEYBOARD_ROWS;
  return NUMERIC_VIRTUAL_KEYBOARD_ROWS;
}
