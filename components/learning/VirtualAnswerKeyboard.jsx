import {
  backspaceVirtualAnswer,
  clearVirtualAnswer,
  insertVirtualAnswerChar,
} from "../../lib/learning/virtual-answer-keyboard-insert.js";
import { getVirtualAnswerKeyboardRows } from "../../lib/learning/virtual-answer-keyboard-layouts.js";

/**
 * On-screen answer keyboard — inserts into existing answer state only.
 * Optional embedded submit button on compact mobile last row (not a duplicate logic path).
 *
 * @param {{
 *   layout?: "numeric" | "hebrew" | "english",
 *   value: string,
 *   onChange: (next: string) => void,
 *   disabled?: boolean,
 *   className?: string,
 *   onClose?: () => void,
 *   showClose?: boolean,
 *   compact?: boolean,
 *   submitButton?: { label?: string, onClick: () => void, disabled?: boolean, testId?: string } | null,
 *   submitTone?: "green" | "blue",
 *   keyClassName?: string,
 *   actionKeyClassName?: string,
 *   clearKeyClassName?: string,
 *   submitClassName?: string,
 *   closeButtonClassName?: string,
 * }} props
 */
export default function VirtualAnswerKeyboard({
  layout = "numeric",
  value,
  onChange,
  disabled = false,
  className = "",
  onClose,
  showClose = false,
  compact = false,
  submitButton = null,
  submitTone = "green",
  keyClassName = "",
  actionKeyClassName = "",
  clearKeyClassName = "",
  submitClassName = "",
  closeButtonClassName = "",
  rowGapClassName = "",
  colGapClassName = "",
  spacerClassName = "",
  variant = "default",
}) {
  const isMathMobile = variant === "mathMobile";
  const rows = getVirtualAnswerKeyboardRows(layout, { compact });
  if (!rows.length) return null;

  const handleKey = (keyDef) => {
    if (disabled || keyDef.spacer) return;
    if (keyDef.action === "backspace") {
      onChange(backspaceVirtualAnswer(value));
      return;
    }
    if (keyDef.action === "clear") {
      onChange(clearVirtualAnswer());
      return;
    }
    onChange(insertVirtualAnswerChar(value, keyDef.label === "−" ? "-" : keyDef.id));
  };

  const rowGapClass =
    rowGapClassName ||
    (isMathMobile ? "gap-2" : compact ? "gap-1.5 max-[420px]:gap-1" : "gap-1.5");
  const colGapClass =
    colGapClassName ||
    (isMathMobile ? "gap-2" : compact ? "gap-1.5 max-[420px]:gap-1" : "gap-1.5");
  const defaultKeyClass = compact
    ? isMathMobile
      ? "min-h-[52px] h-[52px] rounded-lg border border-white/20 bg-black/35 text-white text-2xl font-bold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-transform"
      : "min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-md border border-white/20 bg-black/35 text-white text-lg max-[420px]:text-base font-semibold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-transform"
    : "min-h-[44px] rounded-lg border border-white/20 bg-black/35 text-white text-lg font-bold active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-transform";
  const keyClass = keyClassName || defaultKeyClass;
  const actionKeyClass =
    actionKeyClassName ||
    (compact ? `${keyClass} text-sm${isMathMobile ? "" : " max-[420px]:text-sm"}` : keyClass);
  const defaultClearKeyClass = compact
    ? isMathMobile
      ? "min-h-[52px] h-[52px] rounded-lg border border-red-400/70 bg-red-600 text-white text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500 transition-transform"
      : "min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-md border border-red-400/70 bg-red-600 text-white text-sm font-semibold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500 transition-transform"
    : "min-h-[44px] rounded-lg border border-red-400/70 bg-red-600 text-white text-base font-bold active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500 transition-transform";
  const clearKeyClass = clearKeyClassName || defaultClearKeyClass;
  const defaultSubmitClass = compact
    ? submitTone === "blue"
      ? isMathMobile
        ? "col-span-3 min-h-[52px] h-[52px] rounded-lg border border-cyan-400/50 bg-cyan-500 text-black text-2xl font-bold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-transform"
        : "col-span-3 min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-md border border-cyan-400/50 bg-cyan-500 text-black text-base max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-transform"
      : isMathMobile
        ? "col-span-3 min-h-[52px] h-[52px] rounded-lg border border-emerald-400/40 bg-emerald-500/80 text-white text-2xl font-bold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-transform"
        : "col-span-3 min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-md border border-emerald-400/40 bg-emerald-500/80 text-white text-base max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-transform"
    : "";
  const submitClass = submitClassName || defaultSubmitClass;
  const spacerClass =
    spacerClassName ||
    (isMathMobile ? "h-[52px]" : compact ? "h-[46px] max-[420px]:h-[42px]" : "min-h-[44px]");
  const shellMaxWidthClass = isMathMobile
    ? "max-w-[min(100vw-1rem,380px)]"
    : compact
      ? "max-w-[320px] max-[420px]:max-w-[300px]"
      : "max-w-[300px]";
  const shellPaddingClass = isMathMobile ? "p-3" : compact ? "max-[420px]:p-1.5" : "";
  const closeBtnClass =
    closeButtonClassName ||
    "px-2 py-0.5 rounded-md text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10";

  return (
    <div
      data-testid="virtual-answer-keyboard"
      data-keyboard-variant={isMathMobile ? "mathMobile" : compact ? "compact" : "default"}
      className={`w-full ${shellMaxWidthClass} mx-auto select-none ${shellPaddingClass} ${className}`}
      dir="ltr"
      role="group"
      aria-label="מקלדת מספרים"
    >
      {showClose && onClose ? (
        <div className="flex justify-end mb-1">
          <button
            type="button"
            onClick={onClose}
            className={closeBtnClass}
            aria-label="סגור"
            title="סגור"
          >
            ✕
          </button>
        </div>
      ) : null}
      <div className={`flex flex-col ${rowGapClass}`}>
        {rows.map((row) => {
          const embedSubmit =
            compact && submitButton && row.id === "m-row-0-submit";

          return (
            <div key={row.id} className={`grid grid-cols-4 ${colGapClass}`}>
              {row.keys.map((keyDef) => {
                if (keyDef.spacer) {
                  return (
                    <span
                      key={keyDef.id}
                      className={spacerClass}
                      aria-hidden="true"
                    />
                  );
                }

                const spanClass =
                  keyDef.colSpan === 2
                    ? "col-span-2"
                    : keyDef.colSpan === 3
                      ? "col-span-3"
                      : "";
                const testId = keyDef.action
                  ? `virtual-key-${keyDef.action}`
                  : `virtual-key-${keyDef.id}`;
                const isAction =
                  keyDef.action === "backspace" || keyDef.action === "clear";
                const btnClass =
                  keyDef.action === "clear"
                    ? clearKeyClass
                    : isAction
                      ? actionKeyClass
                      : keyClass;

                return (
                  <button
                    key={keyDef.id}
                    type="button"
                    data-testid={testId}
                    disabled={disabled}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => handleKey(keyDef)}
                    aria-label={keyDef.ariaLabel || keyDef.label}
                    className={`${btnClass} ${spanClass}`}
                  >
                    {keyDef.label}
                  </button>
                );
              })}
              {embedSubmit ? (
                <button
                  type="button"
                  data-testid={submitButton.testId}
                  disabled={submitButton.disabled}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={submitButton.onClick}
                  className={submitClass}
                >
                  {submitButton.label || "בדוק"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
