import Link from "next/link";

export default function TeacherAdminTable({ teachers }) {
  if (!teachers?.length) {
    return <p className="text-white/60 text-sm">No teachers found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-white/15">
      <table className="w-full text-sm text-left">
        <thead className="bg-black/40 text-white/70">
          <tr>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Classes</th>
            <th className="px-3 py-2">Students</th>
            <th className="px-3 py-2">Direct</th>
            <th className="px-3 py-2">Indiv. acts</th>
            <th className="px-3 py-2">Per-class cap</th>
            <th className="px-3 py-2">Active</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.teacherId} className="border-t border-white/10 hover:bg-white/5">
              <td className="px-3 py-2">{t.email || "—"}</td>
              <td className="px-3 py-2">{t.displayName || "—"}</td>
              <td className="px-3 py-2">{t.classCount ?? 0}</td>
              <td className="px-3 py-2">{t.totalActiveStudents ?? 0}</td>
              <td className="px-3 py-2">{t.directStudentCount ?? "—"}</td>
              <td className="px-3 py-2">{t.individualActivityCount ?? "—"}</td>
              <td className="px-3 py-2">{t.quotas?.maxStudentsPerClass ?? "—"}</td>
              <td className="px-3 py-2">
                {t.isAccountActive !== false && t.isActive ? "yes" : "no"}
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/admin/teachers/${t.teacherId}`}
                  className="text-amber-300 font-semibold hover:underline"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
