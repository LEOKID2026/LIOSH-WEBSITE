import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";

/**
 * Shown when guardian login returns guardian_multiple_students (409).
 */
export default function GuardianChildSelectForm({ students, busy, onSelect, bright = false }) {
  const T = getParentPortalTheme(bright);

  if (!students?.length) return null;

  return (
    <div className={`${T.guardianBox} space-y-3`}>
      <p className={T.guardianText}>לחשבון זה מקושרים מספר ילדים. בחרו את הילד/ה לצפייה בדוח:</p>
      <ul className="space-y-2">
        {students.map((s) => (
          <li key={s.studentId}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(s.studentId)}
              className={T.guardianBtn}
            >
              {s.studentFullNameMasked}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
