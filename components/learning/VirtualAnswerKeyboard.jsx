import {
  backspaceVirtualAnswer,
  clearVirtualAnswer,
  insertVirtualAnswerChar,
} from "../../lib/learning/virtual-answer-keyboard-insert.js";
import { getVirtualAnswerKeyboardRows } from "../../lib/learning/virtual-answer-keyboard-layouts.js";

/**
 * On-screen answer keyboard — inserts into existing answer state only (no submit).
 *
 * @param {{
 *   layout?: "numeric" | "hebrew" | "english",
 *   value: string,
 *   onChange: (next: string) => void,
 *   disabled?: boolean,
 *   className?: string,
 *   onClose?: () => void,
 *   showClose?: boolean,
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
}) {
  const rows = getVirtualAnswerKeyboardRows(layout);
  if (!rows.length) return null;

  const handleKey = (keyDef) => {
    if (disabled) return;
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

  return (
    <div
      data-testid="virtual-answer-keyboard"
      className={`w-full max-w-[300px] mx-auto select-none ${className}`}
      dir="ltr"
      role="group"
      aria-label="מקלדת מספרים"
    >
      {showClose && onClose ? (
        <div className="flex justify-end mb-1">
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded-md text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10"
            aria-label="סגור"
            title="סגור"
          >
            ✕
          </button>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-4 gap-1.5">
            {row.keys.map((keyDef) => {
              const spanClass =
                keyDef.colSpan === 2
                  ? "col-span-2"
                  : keyDef.colSpan === 3
                    ? "col-span-3"
                    : "";
              const testId = keyDef.action
                ? `virtual-key-${keyDef.action}`
                : `virtual-key-${keyDef.id}`;
              return (
                <button
                  key={keyDef.id}
                  type="button"
                  data-testid={testId}
                  disabled={disabled}
                  onClick={() => handleKey(keyDef)}
                  aria-label={keyDef.ariaLabel || keyDef.label}
                  className={`min-h-[44px] rounded-lg border border-white/20 bg-black/35 text-white text-lg font-bold active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-transform ${spanClass}`}
                >
                  {keyDef.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
