import Link from "next/link";
import {
  ADMIN_COL_ACTIONS,
  ADMIN_MANAGE,
  ADMIN_SCHOOL_NO_SCHOOLS,
  ADMIN_SCHOOL_NAME,
  adminYesNoHe,
} from "../../lib/admin-portal/admin-ui.he.js";

export default function SchoolAdminTable({ schools }) {
  if (!schools?.length) {
    return <p className="text-white/60 text-sm text-right">{ADMIN_SCHOOL_NO_SCHOOLS}</p>;
  }

  return (
    <section className="rounded-xl border border-white/15 bg-black/25 overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm text-right">
          <thead className="bg-black/40 text-white/70 text-xs">
            <tr>
              <th className="px-3 py-2.5 font-medium">{ADMIN_SCHOOL_NAME}</th>
              <th className="px-3 py-2.5 font-medium">עיר</th>
              <th className="px-3 py-2.5 font-medium text-center">מורים</th>
              <th className="px-3 py-2.5 font-medium text-center">ילדים</th>
              <th className="px-3 py-2.5 font-medium text-center">פעיל</th>
              <th className="px-3 py-2.5 font-medium">{ADMIN_COL_ACTIONS}</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={s.schoolId} className="border-t border-white/10 hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 font-medium">{s.name}</td>
                <td className="px-3 py-2.5 text-white/70">{s.city || "-"}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{s.teacherCount ?? 0}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">
                  {s.enrolledStudentCount ?? 0}
                </td>
                <td className="px-3 py-2.5 text-center">{adminYesNoHe(s.isActive)}</td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/admin/schools/${s.schoolId}`}
                    className="inline-flex rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5"
                  >
                    {ADMIN_MANAGE}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
