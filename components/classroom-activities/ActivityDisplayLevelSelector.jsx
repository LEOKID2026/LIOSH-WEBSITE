import { useEffect } from "react";
import {
  activityDisplayLevelKeys,
  activityDisplayLevelLabelHe,
} from "../../lib/learning/activity-display-level.js";
import { isScienceSubjectId } from "../../lib/learning/display-level.js";

/**
 * Parent/teacher activity level selector — רגיל / מתקדם (science: regular only).
 */
export default function ActivityDisplayLevelSelector({
  subjectId,
  value = "regular",
  onChange,
  disabled = false,
  variant = "select",
  label = "רמה",
  className = "",
  inputClassName = "",
  name = "activity-display-level",
}) {
  const keys = activityDisplayLevelKeys(subjectId);

  useEffect(() => {
    if (isScienceSubjectId(subjectId) && value !== "regular") {
      onChange?.("regular");
    }
  }, [subjectId, value, onChange]);

  if (keys.length <= 1) {
    return (
      <div className={className} data-testid="activity-display-level-regular-only">
        {label ? <span className="block text-sm opacity-80 mb-1">{label}</span> : null}
        <span className={inputClassName || "text-sm"}>{activityDisplayLevelLabelHe("regular")}</span>
      </div>
    );
  }

  if (variant === "radio") {
    return (
      <fieldset className={className} data-testid="activity-display-level-selector">
        <legend className="block text-sm opacity-80 mb-1">{label}</legend>
        <div className="flex flex-wrap gap-3">
          {keys.map((dl) => (
            <label key={dl} className="flex items-center gap-1">
              <input
                type="radio"
                name={name}
                value={dl}
                checked={value === dl}
                onChange={() => onChange?.(dl)}
                disabled={disabled}
              />
              {activityDisplayLevelLabelHe(dl)}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <label className={`block text-sm ${className}`} data-testid="activity-display-level-selector">
      <span className="opacity-80">{label}</span>
      <select
        className={inputClassName}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      >
        {keys.map((dl) => (
          <option key={dl} value={dl}>
            {activityDisplayLevelLabelHe(dl)}
          </option>
        ))}
      </select>
    </label>
  );
}
