/** @typedef {"insert" | "backspace" | "clear"} VirtualKeyboardActionKind */

export const VIRTUAL_ANSWER_KEYBOARD_MAX_LENGTH = 16;

/**
 * @param {string} value
 * @param {string} char
 * @param {{ maxLength?: number }} [options]
 */
export function insertVirtualAnswerChar(value, char, options = {}) {
  const maxLength = options.maxLength ?? VIRTUAL_ANSWER_KEYBOARD_MAX_LENGTH;
  const current = String(value ?? "");
  const nextChar = String(char ?? "");
  if (!nextChar || current.length >= maxLength) return current;

  if (nextChar === "-") {
    if (current.length > 0) return current;
    return "-";
  }

  if (nextChar === "." || nextChar === ",") {
    if (current.includes(".") || current.includes(",")) return current;
    if (current === "" || current === "-") return `${current}${nextChar}`;
    return current + nextChar;
  }

  if (/^\d$/.test(nextChar)) {
    return current + nextChar;
  }

  return current;
}

/**
 * @param {string} value
 */
export function backspaceVirtualAnswer(value) {
  const current = String(value ?? "");
  if (!current) return "";
  return current.slice(0, -1);
}

export function clearVirtualAnswer() {
  return "";
}
