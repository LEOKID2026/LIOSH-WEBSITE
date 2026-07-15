import Link from "next/link";
import {
  ADMIN_COL_ACCOUNT_STATUS,
  ADMIN_COL_ACTIONS,
  ADMIN_COL_EMAIL,
  ADMIN_COL_PLAN,
  ADMIN_MANAGE,
  ADMIN_NO_PARENTS,
  parentListStatusLabelHe,
  planCodeLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";

/**
 * @param {{ parents: Array<{ parentUserId: string, email?: string|null, settings?: object|null, isOrphanUnlinked?: boolean }> }} props
 */
export default function ParentAdminTable({ parents }) {
  if (!parents?.length) {
    return <p className="text-white/60 text-sm text-right">{ADMIN_NO_PARENTS}</p>;
  }

  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-xl border border-white/15">
        <table className="w-full text-sm text-right">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">{ADMIN_COL_EMAIL}</th>
              <th className="px-4 py-3 font-medium">{ADMIN_COL_PLAN}</th>
              <th className="px-4 py-3 font-medium">{ADMIN_COL_ACCOUNT_STATUS}</th>
              <th className="px-4 py-3 font-medium">{ADMIN_COL_ACTIONS}</th>
            </tr>
          </thead>
          <tbody>
            {parents.map((p) => (
              <tr
                key={p.parentUserId}
                className="border-t border-white/10 hover:bg-white/5"
                data-testid={p.isOrphanUnlinked ? "parent-row-unlinked" : "parent-row"}
              >
                <td className="px-4 py-3 break-all" dir="ltr">
                  {p.email || "-"}
                </td>
                <td className="px-4 py-3">
                  {p.isOrphanUnlinked ? "-" : planCodeLabelHe(p.settings?.planCode)}
                </td>
                <td className="px-4 py-3">{parentListStatusLabelHe(p)}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/parents/${p.parentUserId}`}
                    className="text-amber-300 hover:underline"
                  >
                    {ADMIN_MANAGE}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {parents.map((p) => (
          <article
            key={p.parentUserId}
            className="rounded-xl border border-white/15 bg-black/25 p-4"
            data-testid={p.isOrphanUnlinked ? "parent-row-unlinked" : "parent-row"}
          >
            <p className="text-xs text-white/50 mb-1">{ADMIN_COL_EMAIL}</p>
            <p className="text-sm break-all mb-2" dir="ltr">
              {p.email || "-"}
            </p>
            <p className="text-sm text-white/70 mb-3">
              {ADMIN_COL_PLAN}:{" "}
              {p.isOrphanUnlinked ? "-" : planCodeLabelHe(p.settings?.planCode)} · {ADMIN_COL_ACCOUNT_STATUS}:{" "}
              {parentListStatusLabelHe(p)}
            </p>
            <Link
              href={`/admin/parents/${p.parentUserId}`}
              className="text-amber-300 text-sm hover:underline"
            >
              {ADMIN_MANAGE}
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
