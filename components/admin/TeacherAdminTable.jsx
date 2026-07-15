import Link from "next/link";
import {
  ADMIN_COL_ACTIONS,
  ADMIN_COL_ACTIVE,
  ADMIN_COL_CLASSES,
  ADMIN_COL_DIRECT,
  ADMIN_COL_EMAIL,
  ADMIN_COL_INDIV_ACTIVITIES,
  ADMIN_COL_NAME,
  ADMIN_COL_PER_CLASS_CAP,
  ADMIN_COL_STUDENTS,
  ADMIN_COL_SCHOOL,
  ADMIN_MANAGE,
  ADMIN_NO_TEACHERS,
  adminAccountStatusHe,
  entitlementStatusLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";

function StatusBadge({ active, entitlementStatus }) {
  if (entitlementStatus === "pending") {
    return (
      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-sky-500/20 text-sky-200 border border-sky-400/30">
        {entitlementStatusLabelHe("pending")}
      </span>
    );
  }
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        active
          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
          : "bg-white/10 text-white/50 border border-white/15"
      }`}
    >
      {adminAccountStatusHe({ isAccountActive: active, isActive: active })}
    </span>
  );
}

function TeacherAdminMobileCard({ teacher: t }) {
  const active = t.isAccountActive !== false && t.isActive;

  return (
    <article className="rounded-xl border border-white/15 bg-black/25 p-4 text-right space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-base text-white min-w-0 break-words">
          {t.displayName || "-"}
        </h3>
        <StatusBadge active={active} entitlementStatus={t.entitlementStatus} />
      </div>

      <div>
        <p className="text-xs text-white/50 mb-0.5">{ADMIN_COL_EMAIL}</p>
        <p className="text-sm text-white/80 break-all leading-relaxed">{t.email || "-"}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-white/50 mb-0.5">{ADMIN_COL_CLASSES}</dt>
          <dd className="font-medium tabular-nums">{t.classCount ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/50 mb-0.5">{ADMIN_COL_STUDENTS}</dt>
          <dd className="font-medium tabular-nums">{t.totalActiveStudents ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/50 mb-0.5">{ADMIN_COL_DIRECT}</dt>
          <dd className="font-medium tabular-nums">{t.directStudentCount ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/50 mb-0.5">{ADMIN_COL_INDIV_ACTIVITIES}</dt>
          <dd className="font-medium tabular-nums">{t.individualActivityCount ?? 0}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-white/50 mb-0.5">{ADMIN_COL_SCHOOL}</dt>
          <dd className="font-medium">{t.schoolName || "-"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-white/50 mb-0.5">{ADMIN_COL_PER_CLASS_CAP}</dt>
          <dd className="font-medium tabular-nums">{t.quotas?.maxStudentsPerClass ?? "-"}</dd>
        </div>
      </dl>

      <Link
        href={`/admin/teachers/${t.teacherId}`}
        className="block w-full rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-sm font-bold px-4 py-2.5 text-center"
      >
        {ADMIN_MANAGE}
      </Link>
    </article>
  );
}

function TeacherAdminDesktopTable({ teachers }) {
  return (
    <section className="hidden md:block rounded-xl border border-white/15 bg-black/25 overflow-hidden w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm text-right table-fixed">
          <colgroup>
            <col className="w-[13%]" />
            <col />
            <col className="w-[4.25rem]" />
            <col className="w-[4.25rem]" />
            <col className="w-[4.25rem]" />
            <col className="w-[5rem]" />
            <col className="w-[5rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[6rem]" />
            <col className="w-[5.5rem]" />
          </colgroup>
          <thead className="bg-black/40 text-white/70 text-xs">
            <tr>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">{ADMIN_COL_NAME}</th>
              <th className="px-3 py-2.5 font-medium">{ADMIN_COL_EMAIL}</th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">{ADMIN_COL_SCHOOL}</th>
              <th className="px-2 py-2.5 font-medium text-center whitespace-nowrap">
                {ADMIN_COL_CLASSES}
              </th>
              <th className="px-2 py-2.5 font-medium text-center whitespace-nowrap">
                {ADMIN_COL_STUDENTS}
              </th>
              <th className="px-2 py-2.5 font-medium text-center whitespace-nowrap">
                {ADMIN_COL_DIRECT}
              </th>
              <th className="px-2 py-2.5 font-medium text-center whitespace-nowrap">
                {ADMIN_COL_INDIV_ACTIVITIES}
              </th>
              <th className="px-2 py-2.5 font-medium text-center whitespace-nowrap">
                {ADMIN_COL_PER_CLASS_CAP}
              </th>
              <th className="px-2 py-2.5 font-medium text-center whitespace-nowrap">
                {ADMIN_COL_ACTIVE}
              </th>
              <th className="px-3 py-2.5 font-medium whitespace-nowrap">{ADMIN_COL_ACTIONS}</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => {
              const active = t.isAccountActive !== false && t.isActive;
              const email = t.email || "-";
              return (
                <tr key={t.teacherId} className="border-t border-white/10 hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5 font-medium">
                    <span
                      className="block truncate"
                      title={t.displayName && t.displayName !== "-" ? t.displayName : undefined}
                    >
                      {t.displayName || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/80 min-w-[12rem]">
                    <span
                      className="block truncate max-w-[28rem] xl:max-w-[36rem] 2xl:max-w-none"
                      title={email !== "-" ? email : undefined}
                    >
                      {email}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/70 truncate max-w-[8rem]" title={t.schoolName || undefined}>
                    {t.schoolName || "-"}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums whitespace-nowrap">
                    {t.classCount ?? 0}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums whitespace-nowrap">
                    {t.totalActiveStudents ?? 0}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums whitespace-nowrap">
                    {t.directStudentCount ?? 0}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums whitespace-nowrap">
                    {t.individualActivityCount ?? 0}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums whitespace-nowrap">
                    {t.quotas?.maxStudentsPerClass ?? "-"}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <StatusBadge active={active} entitlementStatus={t.entitlementStatus} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/admin/teachers/${t.teacherId}`}
                      className="inline-flex rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5"
                    >
                      {ADMIN_MANAGE}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TeacherAdminTable({ teachers }) {
  if (!teachers?.length) {
    return <p className="text-white/60 text-sm text-right">{ADMIN_NO_TEACHERS}</p>;
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {teachers.map((t) => (
          <TeacherAdminMobileCard key={t.teacherId} teacher={t} />
        ))}
      </div>
      <TeacherAdminDesktopTable teachers={teachers} />
    </>
  );
}
