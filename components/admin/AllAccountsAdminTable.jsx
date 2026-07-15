import Link from "next/link";
import { useMemo, useState } from "react";
import AdminUserDeleteSection from "./AdminUserDeleteSection.jsx";
import {
  ADMIN_COL_ACTIONS,
  ADMIN_COL_CLASSIFICATION,
  ADMIN_COL_CONFIRMED,
  ADMIN_COL_CREATED,
  ADMIN_COL_DELETABLE,
  ADMIN_COL_EMAIL,
  ADMIN_COL_FROZEN,
  ADMIN_COL_LAST_SIGN_IN,
  ADMIN_COL_LINKED,
  ADMIN_COL_PROTECTED,
  ADMIN_COL_USER_ID,
  ADMIN_MANAGE,
  ADMIN_NO,
  ADMIN_YES,
  accountClassificationsLabelHe,
  adminFormatDateHe,
  entitlementStatusLabelHe,
} from "../../lib/admin-portal/admin-ui.he.js";

/**
 * @param {{
 *   accounts: Array<object>,
 *   accessToken: string,
 *   fullDeleteConfigured?: boolean,
 *   onDeleted?: () => void,
 * }} props
 */
export default function AllAccountsAdminTable({
  accounts,
  accessToken,
  fullDeleteConfigured = false,
  onDeleted,
}) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (accounts || []).filter((row) => {
      if (classFilter !== "all" && !(row.classifications || []).includes(classFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        String(row.email || "").toLowerCase().includes(q) ||
        String(row.userId || "").toLowerCase().includes(q) ||
        String(row.linkedSummary || "").toLowerCase().includes(q)
      );
    });
  }, [accounts, query, classFilter]);

  const filterOptions = [
    ["all", "הכל"],
    ["platform_admin", "אדמין"],
    ["parent", "הורה"],
    ["private_teacher", "מורה פרטי"],
    ["school_manager", "מנהל בית ספר"],
    ["school_teacher", "מורה בית ספר"],
    ["school_operator", "צוות / מזכירות"],
    ["unlinked", "לא מקושר"],
    ["pending_confirmation", "ממתין לאימות"],
    ["qa_test", "חשבון בדיקה"],
  ];

  return (
    <div className="space-y-4" data-testid="all-accounts-table">
      <div className="flex flex-wrap gap-2 justify-end items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש דוא״ל / מזהה…"
          dir="ltr"
          className="rounded bg-black/40 border border-white/20 px-3 py-2 text-sm min-w-[12rem]"
          data-testid="all-accounts-search"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="rounded bg-black/40 border border-white/20 px-3 py-2 text-sm"
          data-testid="all-accounts-class-filter"
        >
          {filterOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-xs text-white/50">{filtered.length} / {accounts.length}</span>
      </div>

      <div className="hidden lg:block overflow-x-auto rounded-xl border border-white/15">
        <table className="w-full text-sm text-right min-w-[960px]">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_EMAIL}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_USER_ID}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_CLASSIFICATION}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_CONFIRMED}</th>
              <th className="px-3 py-3 font-medium">סטטוס</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_FROZEN}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_LINKED}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_CREATED}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_LAST_SIGN_IN}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_PROTECTED}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_DELETABLE}</th>
              <th className="px-3 py-3 font-medium">{ADMIN_COL_ACTIONS}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <AllAccountsRow
                key={row.userId}
                row={row}
                accessToken={accessToken}
                fullDeleteConfigured={fullDeleteConfigured}
                onDeleted={onDeleted}
                variant="desktop"
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {filtered.map((row) => (
          <AllAccountsRow
            key={row.userId}
            row={row}
            accessToken={accessToken}
            fullDeleteConfigured={fullDeleteConfigured}
            onDeleted={onDeleted}
            variant="mobile"
          />
        ))}
      </div>
    </div>
  );
}

function AllAccountsRow({
  row,
  accessToken,
  fullDeleteConfigured,
  onDeleted,
  variant,
}) {
  const actions = (
    <div className="flex flex-wrap gap-2 justify-end items-center">
      {row.manageUrl ? (
        <Link href={row.manageUrl} className="text-amber-300 hover:underline text-sm">
          {ADMIN_MANAGE}
        </Link>
      ) : null}
      {row.deletable && fullDeleteConfigured ? (
        <AdminUserDeleteSection
          accessToken={accessToken}
          userId={row.userId}
          targetEmail={row.email}
          variant="compact"
          triggerTestId="all-accounts-delete-trigger"
          onDeleted={onDeleted}
        />
      ) : null}
    </div>
  );

  if (variant === "mobile") {
    return (
      <article
        className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-2"
        data-testid="all-accounts-row"
        data-user-id={row.userId}
      >
        <p className="text-sm break-all" dir="ltr">
          {row.email || "-"}
        </p>
        <p className="text-xs text-white/45 font-mono" dir="ltr">
          {row.userId}
        </p>
        <p className="text-sm">{accountClassificationsLabelHe(row.classifications)}</p>
        <p className="text-xs text-white/60">
          {entitlementStatusLabelHe(row.statusSummary)} · {row.emailConfirmed ? ADMIN_YES : ADMIN_NO}{" "}
          אימות · {row.frozen ? "מוקפא" : "לא מוקפא"} · {row.isProtected ? "מוגן" : "לא מוגן"}
        </p>
        <p className="text-xs text-white/50">{row.linkedSummary}</p>
        {actions}
      </article>
    );
  }

  return (
    <tr className="border-t border-white/10 hover:bg-white/5" data-testid="all-accounts-row" data-user-id={row.userId}>
      <td className="px-3 py-3 break-all" dir="ltr">
        {row.email || "-"}
      </td>
      <td className="px-3 py-3 text-xs font-mono text-white/50" dir="ltr">
        {row.userId}
      </td>
      <td className="px-3 py-3 text-xs">
        {accountClassificationsLabelHe(row.classifications)}
      </td>
      <td className="px-3 py-3">{row.emailConfirmed ? ADMIN_YES : ADMIN_NO}</td>
      <td className="px-3 py-3">{entitlementStatusLabelHe(row.statusSummary)}</td>
      <td className="px-3 py-3">{row.frozen ? ADMIN_YES : ADMIN_NO}</td>
      <td className="px-3 py-3 text-xs text-white/70 max-w-[12rem]">{row.linkedSummary}</td>
      <td className="px-3 py-3 text-xs text-white/50 whitespace-nowrap">
        {adminFormatDateHe(row.createdAt)}
      </td>
      <td className="px-3 py-3 text-xs text-white/50 whitespace-nowrap">
        {adminFormatDateHe(row.lastSignInAt)}
      </td>
      <td className="px-3 py-3">{row.isProtected ? ADMIN_YES : ADMIN_NO}</td>
      <td className="px-3 py-3">{row.deletable ? ADMIN_YES : ADMIN_NO}</td>
      <td className="px-3 py-3">{actions}</td>
    </tr>
  );
}
