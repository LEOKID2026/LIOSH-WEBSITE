import { useEffect, useState } from "react";
import { useTouchPrimaryDevice } from "../../hooks/useTouchPrimaryDevice.js";
import { resolveVirtualAnswerKeyboard } from "../../lib/learning/virtual-answer-keyboard-policy.js";
import VirtualAnswerKeyboard from "./VirtualAnswerKeyboard.jsx";

/**
 * Numeric answer input with optional on-screen keyboard (math / geometry only).
 * Does not render submit — parent keeps existing בדוק button.
 */
export default function StudentNumericAnswerField({
  value,
  onChange,
  disabled = false,
  placeholder = "תשובה",
  testId,
  subject,
  onEnterSubmit,
  className = "",
  inputClassName = "",
  autoFocus = false,
}) {
  const isTouch = useTouchPrimaryDevice();
  const policy = resolveVirtualAnswerKeyboard({
    subject,
    hasTextInput: true,
    isTouch,
  });
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    setKeyboardOpen(policy.defaultOpen);
  }, [policy.defaultOpen]);

  const virtualEnabled = policy.enabled;
  const showKeyboard = virtualEnabled && (policy.defaultOpen || keyboardOpen);
  const inputReadOnly = virtualEnabled && isTouch && !disabled;

  const inputProps = virtualEnabled
    ? {
        inputMode: inputReadOnly ? "none" : "decimal",
        autoComplete: "off",
      }
    : {};

  return (
    <div className={`w-full flex flex-col items-center gap-2 ${className}`}>
      <div className="w-full max-w-[300px] flex items-center justify-center gap-2">
        <input
          type="text"
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && typeof onEnterSubmit === "function") {
              e.preventDefault();
              onEnterSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={inputReadOnly}
          autoFocus={autoFocus && !inputReadOnly}
          dir="ltr"
          {...inputProps}
          className={
            inputClassName ||
            "w-full px-4 py-4 rounded-lg bg-black/40 border border-white/20 text-white text-2xl font-bold text-center disabled:opacity-50"
          }
        />
        {virtualEnabled && !isTouch ? (
          <button
            type="button"
            data-testid="virtual-keyboard-toggle"
            onClick={() => setKeyboardOpen((open) => !open)}
            disabled={disabled}
            title="מקלדת"
            aria-label="מקלדת"
            aria-expanded={showKeyboard}
            className="shrink-0 h-12 w-12 rounded-lg border border-white/20 bg-black/35 text-xl disabled:opacity-50 hover:bg-white/10"
          >
            ⌨️
          </button>
        ) : null}
      </div>
      {showKeyboard ? (
        <VirtualAnswerKeyboard
          layout={policy.layout || "numeric"}
          value={value}
          onChange={onChange}
          disabled={disabled}
          showClose={virtualEnabled && !isTouch}
          onClose={() => setKeyboardOpen(false)}
          className="mt-1"
        />
      ) : null}
    </div>
  );
}
