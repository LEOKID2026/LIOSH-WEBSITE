/**
 * Dark-theme native select — readable options in Chrome without hover.
 * @param {{
 *   id?: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   options: Array<{ value: string, label: string }>,
 *   disabled?: boolean,
 *   className?: string,
 *   "data-testid"?: string,
 * }} props
 */
export default function PortalDarkSelect({
  id,
  value,
  onChange,
  options,
  disabled = false,
  className = "",
  "data-testid": testId,
}) {
  return (
    <select
      id={id}
      data-testid={testId}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border border-white/20 bg-neutral-900 text-white px-3 py-2 text-sm text-right appearance-none cursor-pointer disabled:opacity-60 ${className}`}
      style={{ colorScheme: "dark" }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-neutral-900 text-white">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
