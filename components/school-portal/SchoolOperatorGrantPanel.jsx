import { operatorGrantLabel } from "../../lib/school-portal/operator-grant-labels.js";
import { ADMIN_YES, ADMIN_NO } from "../../lib/admin-portal/admin-ui.he.js";
import {
  SCHOOL_OPERATOR_GRANT_SECTION,
  SCHOOL_OPERATOR_NO_PERMISSIONS,
} from "../../lib/school-portal/school-ui.he";

function GrantToggle({ label, checked, disabled, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm py-2 border-b border-white/10 last:border-0">
      <span className="text-right flex-1">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0"
      />
    </label>
  );
}

function GrantReadOnly({ label, enabled }) {
  return (
    <li className="flex justify-between gap-3 text-sm py-1">
      <span>{label}</span>
      <span>{enabled ? ADMIN_YES : ADMIN_NO}</span>
    </li>
  );
}

/**
 * @param {{
 *   grants: { studentAccessAdmin?: boolean, studentDataViewer?: boolean },
 *   editable?: boolean,
 *   disabled?: boolean,
 *   onPatch?: (patch: { studentAccessAdmin?: boolean, studentDataViewer?: boolean }) => void,
 * }} props
 */
export default function SchoolOperatorGrantPanel({ grants, editable = false, disabled = false, onPatch }) {
  const g = grants || {};
  const hasAny = g.studentAccessAdmin === true || g.studentDataViewer === true;

  return (
    <div>
      <p className="text-xs text-white/50 mb-2">{SCHOOL_OPERATOR_GRANT_SECTION}</p>
      {editable && onPatch ? (
        <>
          <GrantToggle
            label={operatorGrantLabel("studentAccessAdmin")}
            checked={g.studentAccessAdmin === true}
            disabled={disabled}
            onChange={(v) => onPatch({ studentAccessAdmin: v })}
          />
          <GrantToggle
            label={operatorGrantLabel("studentDataViewer")}
            checked={g.studentDataViewer === true}
            disabled={disabled}
            onChange={(v) => onPatch({ studentDataViewer: v })}
          />
        </>
      ) : (
        <>
          {!hasAny ? (
            <p className="text-sm text-white/50">{SCHOOL_OPERATOR_NO_PERMISSIONS}</p>
          ) : (
            <ul className="space-y-0">
              <GrantReadOnly
                label={operatorGrantLabel("studentAccessAdmin")}
                enabled={g.studentAccessAdmin === true}
              />
              <GrantReadOnly
                label={operatorGrantLabel("studentDataViewer")}
                enabled={g.studentDataViewer === true}
              />
            </ul>
          )}
        </>
      )}
    </div>
  );
}
