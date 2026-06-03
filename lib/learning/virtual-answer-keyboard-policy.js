/**
 * @param {{ subject?: string, hasTextInput?: boolean, isTouch?: boolean }} options
 */
export function resolveVirtualAnswerKeyboard(options = {}) {
  const subject = String(options.subject || "").toLowerCase();
  const hasTextInput = options.hasTextInput !== false;
  const isTouch = options.isTouch === true;

  if (!hasTextInput || !["math", "geometry"].includes(subject)) {
    return {
      enabled: false,
      layout: null,
      defaultOpen: false,
    };
  }

  return {
    enabled: true,
    layout: "numeric",
    defaultOpen: isTouch,
  };
}

/**
 * @param {string} subject
 */
export function isVirtualAnswerKeyboardSubject(subject) {
  const key = String(subject || "").toLowerCase();
  return key === "math" || key === "geometry";
}
