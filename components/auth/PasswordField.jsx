import { useState } from "react";
import {
  AUTH_PASSWORD_HIDE,
  AUTH_PASSWORD_HIDE_SHORT,
  AUTH_PASSWORD_SHOW,
  AUTH_PASSWORD_SHOW_SHORT,
} from "../../lib/auth/auth-password.he";

const DEFAULT_INPUT_CLASS =
  "w-full rounded bg-black/40 border border-white/20 px-3 py-2 pe-10";

export default function PasswordField({
  label,
  labelClassName = "text-white/80",
  wrapperClassName = "",
  inputClassName = DEFAULT_INPUT_CLASS,
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
}) {
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
        className={inputClassName}
      />
      {showToggle ? (
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={toggleLabel}
          aria-pressed={visible}
          data-testid={testId ? `${testId}-toggle` : undefined}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/70 hover:text-white px-1"
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
      {label ? <span className={labelClassName}>{label}</span> : null}
      <div className={label ? "mt-1" : ""}>{field}</div>
    </label>
  );
}
