import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";

/** @typedef {{ value: string, onChange: (next: string) => void }} ScratchpadActiveCell */

const ScratchpadVirtualInputContext = createContext(null);

/**
 * Routes shared virtual keyboard input to the focused scratchpad digit cell.
 */
export function ScratchpadVirtualInputProvider({ children, onActiveCellChange }) {
  const activeRef = useRef(null);

  const registerCell = useCallback(
    (cell) => {
      activeRef.current = cell;
      onActiveCellChange?.(cell);
    },
    [onActiveCellChange]
  );

  const clearCell = useCallback(() => {
    activeRef.current = null;
    onActiveCellChange?.(null);
  }, [onActiveCellChange]);

  const value = useMemo(
    () => ({ registerCell, clearCell }),
    [registerCell, clearCell]
  );

  return (
    <ScratchpadVirtualInputContext.Provider value={value}>
      {children}
    </ScratchpadVirtualInputContext.Provider>
  );
}

export function useScratchpadVirtualInput() {
  return useContext(ScratchpadVirtualInputContext);
}

/**
 * Read-only digit cell — operands from the question; not focusable or editable.
 */
export function ScratchpadDigitDisplay({
  value,
  className = "",
  "aria-label": ariaLabel,
}) {
  return (
    <div
      className={`flex items-center justify-center pointer-events-none select-none ${className}`}
      aria-label={ariaLabel}
      aria-readonly="true"
      data-scratchpad-digit-display="true"
    >
      {value || "\u00a0"}
    </div>
  );
}

/**
 * Single-digit scratchpad cell — registers as virtual keyboard target on focus.
 */
export function ScratchpadDigitInput({
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel,
  maxLength = 1,
  readOnlyOnTouch = true,
}) {
  const ctx = useScratchpadVirtualInput();
  const inputRef = useRef(null);
  const focusedRef = useRef(false);
  const touch =
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches;

  useEffect(() => {
    if (!focusedRef.current || !ctx?.registerCell) return;
    ctx.registerCell({ value, onChange });
  }, [ctx, value, onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode={touch && readOnlyOnTouch ? "none" : "numeric"}
      maxLength={maxLength}
      value={value}
      readOnly={Boolean(touch && readOnlyOnTouch)}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, maxLength);
        onChange(v);
      }}
      onFocus={() => {
        focusedRef.current = true;
        ctx?.registerCell?.({ value, onChange });
      }}
      onBlur={() => {
        focusedRef.current = false;
        window.setTimeout(() => {
          ctx?.clearCell?.();
        }, 120);
      }}
      className={className}
      aria-label={ariaLabel}
      data-scratchpad-digit="true"
    />
  );
}
