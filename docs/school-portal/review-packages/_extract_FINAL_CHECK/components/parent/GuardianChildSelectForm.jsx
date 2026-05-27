/**
 * Shown when guardian login returns guardian_multiple_students (409).
 */
export default function GuardianChildSelectForm({ students, busy, onSelect }) {
  if (!students?.length) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-right space-y-3">
      <p className="text-sm text-amber-100">לחשבון זה מקושרים מספר ילדים. בחרו את הילד/ה לצפייה בדוח:</p>
      <ul className="space-y-2">
        {students.map((s) => (
          <li key={s.studentId}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(s.studentId)}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50 text-right"
            >
              {s.studentFullNameMasked}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
