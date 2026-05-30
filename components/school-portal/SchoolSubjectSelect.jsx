import PortalDarkSelect from "../platform-ui/PortalDarkSelect.jsx";
import { subjectSelectOptionsHe } from "../../lib/platform-ui/hebrew-display-labels.js";

/**
 * @param {{ value: string, onChange: (value: string) => void, id?: string, className?: string, disabled?: boolean }} props
 */
export default function SchoolSubjectSelect({ value, onChange, id, className = "", disabled = false }) {
  const options = subjectSelectOptionsHe();
  return (
    <PortalDarkSelect
      id={id}
      data-testid="school-subject-select-he"
      value={value}
      disabled={disabled}
      onChange={onChange}
      className={`min-w-[12rem] mt-1 ${className}`}
      options={options}
    />
  );
}
