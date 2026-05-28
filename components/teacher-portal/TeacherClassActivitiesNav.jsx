import Link from "next/link";

/**
 * @param {{ classId: string, active?: 'class'|'activities'|'worksheets'|'discussion' }} props
 */
export default function TeacherClassActivitiesNav({ classId, active = "activities" }) {
  if (!classId) return null;
  const base = `/teacher/class/${encodeURIComponent(classId)}`;
  const linkClass = (key) =>
    key === active
      ? key === "worksheets"
        ? "px-3 py-1.5 rounded-lg border border-violet-400/40 bg-violet-500/10 text-violet-200"
        : key === "activities"
          ? "px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200"
          : key === "discussion"
            ? "px-3 py-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
            : "px-3 py-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
      : "px-3 py-1.5 rounded-lg border border-white/15 text-white/80 hover:bg-white/10";

  return (
    <nav className="flex flex-wrap gap-2 mb-6 text-sm" aria-label="ניווט כיתה">
      <Link href={base} className={linkClass("class")}>
        דוח כיתה
      </Link>
      <Link href={`${base}/activities`} className={linkClass("activities")}>
        פעילויות
      </Link>
      <Link href={`${base}/worksheets`} className={linkClass("worksheets")}>
        דפי עבודה
      </Link>
      <Link href={`${base}/discussion/new`} className={linkClass("discussion")}>
        דיון
      </Link>
    </nav>
  );
}
