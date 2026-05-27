import { subjectSelectOptionsHe } from "../../lib/platform-ui/hebrew-display-labels.js";

/**
 * @param {{ value: string, onChange: (value: string) => void, id?: string, className?: string, disabled?: boolean }} props
 */
export default function SchoolSubjectSelect({ value, onChange, id, className = "", disabled = false }) {
  const options = subjectSelectOptionsHe();
  return (
    <select
      data-testid="school-subject-select-he"
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`block mt-1 rounded-lg bg-black/40 border border-white/20 px-3 py-2 min-w-[12rem] text-right ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
