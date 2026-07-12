import { useEffect, useState } from "react";
import { useTouchPrimaryDevice } from "../../hooks/useTouchPrimaryDevice.js";
import { resolveVirtualAnswerKeyboard } from "../../lib/learning/virtual-answer-keyboard-policy.js";
import VirtualAnswerKeyboard from "./VirtualAnswerKeyboard.jsx";

const DESKTOP_INPUT_CLASS =
  "w-full px-4 py-4 rounded-lg bg-black/40 border border-white/20 text-white text-2xl font-bold text-center leading-none disabled:opacity-50";

const MOBILE_INPUT_CLASS =
  "w-full h-11 max-h-11 max-[420px]:h-9 max-[420px]:max-h-9 px-3 max-[420px]:px-2 py-0 rounded-lg bg-black/40 border border-white/20 text-white text-lg max-[420px]:text-base font-semibold text-center leading-none placeholder:text-white/35 placeholder:font-normal disabled:opacity-50 [appearance:textfield] overflow-hidden text-ellipsis whitespace-nowrap";

/**
 * Numeric answer input with optional on-screen keyboard (math / geometry only).
 * On mobile touch, the existing submit action can render in the keypad last row.
 */
export default function StudentNumericAnswerField({
  value,
  onChange,
  disabled = false,
  placeholder = "תשובה",
  testId,
  subject,
  onEnterSubmit,
  onSubmit,
  submitDisabled = false,
  submitTestId,
  submitLabel = "בדוק",
  submitTone = "green",
  className = "",
  inputClassName = "",
  autoFocus = false,
  suppressEmbeddedKeyboard = false,
  onInputFocus,
  embeddedKeyClassName,
  embeddedActionKeyClassName,
  embeddedClearKeyClassName,
  embeddedSubmitGreenClassName,
  embeddedSubmitBlueClassName,
  embeddedSpacerClassName,
  embeddedRowGapClassName,
  embeddedColGapClassName,
  embeddedKeyboardClassName,
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
  const showKeyboard =
    virtualEnabled && (policy.defaultOpen || keyboardOpen) && !suppressEmbeddedKeyboard;
  const inputReadOnly = virtualEnabled && isTouch && !disabled;
  const useCompactKeyboard = virtualEnabled && isTouch;
  const embedSubmitInKeyboard =
    useCompactKeyboard && typeof onSubmit === "function";

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
        useCompactKeyboard ? "gap-1.5 max-[420px]:gap-1" : "gap-2"
      } ${className}`}
      data-mobile-submit-embedded={embedSubmitInKeyboard ? "true" : undefined}
    >
      <div
        className={`w-full flex items-center justify-center gap-2 max-[420px]:gap-1.5 ${
          useCompactKeyboard ? "max-w-[280px] max-[420px]:max-w-[260px]" : "max-w-[300px]"
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
          onFocus={() => {
            onInputFocus?.();
          }}
          placeholder={placeholder}
          aria-label={placeholder === "תשובה" ? "תשובה לשאלה" : placeholder}
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
          className={
            embeddedKeyboardClassName ||
            (useCompactKeyboard ? "mt-0" : "mt-1")
          }
          keyClassName={embeddedKeyClassName}
          actionKeyClassName={embeddedActionKeyClassName || embeddedKeyClassName}
          clearKeyClassName={embeddedClearKeyClassName}
          submitClassName={
            submitTone === "blue"
              ? embeddedSubmitBlueClassName
              : embeddedSubmitGreenClassName
          }
          spacerClassName={embeddedSpacerClassName}
          rowGapClassName={embeddedRowGapClassName}
          colGapClassName={embeddedColGapClassName}
          submitButton={
            embedSubmitInKeyboard
              ? {
                  label: submitLabel,
                  onClick: onSubmit,
                  disabled: submitDisabled,
                  testId: submitTestId,
                }
              : null
          }
          submitTone={submitTone}
        />
      ) : null}
    </div>
  );
}

/** @returns {boolean} True when submit is rendered inside the compact mobile keypad. */
export function useMobileEmbeddedNumericSubmit(subject) {
  const isTouch = useTouchPrimaryDevice();
  const policy = resolveVirtualAnswerKeyboard({
    subject,
    hasTextInput: true,
    isTouch,
  });
  return policy.enabled && isTouch;
}
