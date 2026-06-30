import React from "react";
import {
  studentDisplayLevelKeys,
  studentDisplayLevelLabel,
} from "../../lib/learning-client/student-display-level-practice.js";

/**
 * Student-facing display level selector (רגיל / מתקדם). Science: hidden (regular-only).
 */
export function StudentDisplayLevelSelect({
  subjectId,
  value,
  onChange,
  disabled = false,
  className = "",
  title,
}) {
  const keys = studentDisplayLevelKeys(subjectId);
  if (keys.length <= 1) return null;

  return (
    <select
      value={value}
      title={title || studentDisplayLevelLabel(value)}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className={className}
      data-testid="student-display-level-select"
    >
      {keys.map((dl) => (
        <option key={dl} value={dl}>
          {studentDisplayLevelLabel(dl)}
        </option>
      ))}
    </select>
  );
}

/**
 * Read-only label when only regular is available (science).
 */
export function StudentDisplayLevelRegularOnly({ className = "" }) {
  return (
    <span className={className} data-testid="student-display-level-regular-only">
      {studentDisplayLevelLabel("regular")}
    </span>
  );
}
