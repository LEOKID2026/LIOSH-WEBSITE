import { useState } from "react";
import {
  AUTH_PASSWORD_HIDE,
  AUTH_PASSWORD_HIDE_SHORT,
  AUTH_PASSWORD_SHOW,
  AUTH_PASSWORD_SHOW_SHORT,
} from "../../lib/auth/auth-password.he";

const DEFAULT_INPUT_CLASS =
  "w-full rounded bg-black/40 border border-white/20 px-3 py-2 pe-10";
const BRIGHT_INPUT_CLASS =
  "w-full rounded-lg bg-white border border-slate-300 px-3 py-2 pe-10 text-slate-900 shadow-sm";

export default function PasswordField({
  label,
  bright = false,
  labelClassName,
  wrapperClassName = "",
  inputClassName,
  value,
  onChange,
  id,
  name,
  testId,
  autoComplete,
  minLength,
  maxLength,
  required = false,
  placeholder,
  inputMode,
  showToggle = true,
  bare = false,
  disabled = false,
}) {
  const resolvedLabelClass = labelClassName || (bright ? "text-slate-700" : "text-white/80");
  const resolvedInputClass =
    inputClassName || (bright ? BRIGHT_INPUT_CLASS : DEFAULT_INPUT_CLASS);
  const toggleClass = bright
    ? "absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 px-1"
    : "absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/70 hover:text-white px-1";

  const [visible, setVisible] = useState(false);
  const inputId = id || testId;
  const toggleLabel = visible ? AUTH_PASSWORD_HIDE : AUTH_PASSWORD_SHOW;
  const toggleText = visible ? AUTH_PASSWORD_HIDE_SHORT : AUTH_PASSWORD_SHOW_SHORT;

  const field = (
    <div className={`relative ${wrapperClassName}`}>
      <input
        id={inputId}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        data-testid={testId}
        className={resolvedInputClass}
        disabled={disabled}
      />
      {showToggle ? (
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={toggleLabel}
          aria-pressed={visible}
          data-testid={testId ? `${testId}-toggle` : undefined}
          className={toggleClass}
        >
          {toggleText}
        </button>
      ) : null}
    </div>
  );

  if (bare) {
    return field;
  }

  return (
    <label className="block text-sm">
      {label ? <span className={resolvedLabelClass}>{label}</span> : null}
      <div className={label ? "mt-1" : ""}>{field}</div>
    </label>
  );
}
