import { useEffect, useState } from "react";
import { useTouchPrimaryDevice } from "../../hooks/useTouchPrimaryDevice.js";
import { resolveVirtualAnswerKeyboard } from "../../lib/learning/virtual-answer-keyboard-policy.js";
import VirtualAnswerKeyboard from "./VirtualAnswerKeyboard.jsx";

const DESKTOP_INPUT_CLASS =
  "w-full px-4 py-4 rounded-lg bg-black/40 border border-white/20 text-white text-2xl font-bold text-center leading-none disabled:opacity-50";

const MOBILE_INPUT_CLASS =
  "w-full h-11 max-h-11 px-3 py-0 rounded-lg bg-black/40 border border-white/20 text-white text-lg font-semibold text-center leading-none placeholder:text-white/35 placeholder:font-normal disabled:opacity-50 [appearance:textfield] overflow-hidden text-ellipsis whitespace-nowrap";

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
  const useCompactKeyboard = virtualEnabled && isTouch;

  const inputProps = virtualEnabled
    ? {
        inputMode: inputReadOnly ? "none" : "decimal",
        autoComplete: "off",
      }
    : {};

  const resolvedInputClass =
    inputClassName || (isTouch && virtualEnabled ? MOBILE_INPUT_CLASS : DESKTOP_INPUT_CLASS);

  return (
    <div
      className={`w-full flex flex-col items-center ${
        useCompactKeyboard ? "gap-1.5" : "gap-2"
      } ${className}`}
    >
      <div
        className={`w-full flex items-center justify-center gap-2 ${
          useCompactKeyboard ? "max-w-[280px]" : "max-w-[300px]"
        }`}
      >
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
          className={resolvedInputClass}
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
          compact={useCompactKeyboard}
          showClose={virtualEnabled && !isTouch}
          onClose={() => setKeyboardOpen(false)}
          className={useCompactKeyboard ? "mt-0" : "mt-1"}
        />
      ) : null}
    </div>
  );
}
