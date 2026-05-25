import Link from "next/link";

export default function TeacherClassActivitiesNav({ classId }) {
  if (!classId) return null;
  const base = `/teacher/class/${encodeURIComponent(classId)}`;
  return (
    <nav className="flex flex-wrap gap-2 mb-6 text-sm" aria-label="ניווט כיתה">
      <Link
        href={base}
        className="px-3 py-1.5 rounded-lg border border-white/15 text-white/80 hover:bg-white/10"
      >
        דוח כיתה
      </Link>
      <Link
        href={`${base}/activities`}
        className="px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200"
      >
        פעילויות
      </Link>
    </nav>
  );
}
