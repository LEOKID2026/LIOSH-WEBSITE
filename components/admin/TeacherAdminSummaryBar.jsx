import {
  ADMIN_SUMMARY_ACTIVE_ACCOUNTS,
  ADMIN_SUMMARY_CLASSES,
  ADMIN_SUMMARY_LINKED_STUDENTS,
  ADMIN_SUMMARY_TEACHERS,
} from "../../lib/admin-portal/admin-ui.he.js";

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/30 px-3 py-3 sm:px-4 text-right min-w-0">
      <p className="text-[11px] sm:text-xs text-white/50 mb-1 leading-snug">{label}</p>
      <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function TeacherAdminSummaryBar({ teachers }) {
  const list = teachers || [];
  const activeCount = list.filter((t) => t.isAccountActive !== false && t.isActive).length;
  const studentTotal = list.reduce((sum, t) => sum + (Number(t.totalActiveStudents) || 0), 0);
  const classTotal = list.reduce((sum, t) => sum + (Number(t.classCount) || 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4 sm:gap-4 lg:gap-5">
      <SummaryCard label={ADMIN_SUMMARY_TEACHERS} value={list.length} />
      <SummaryCard label={ADMIN_SUMMARY_ACTIVE_ACCOUNTS} value={activeCount} />
      <SummaryCard label={ADMIN_SUMMARY_LINKED_STUDENTS} value={studentTotal} />
      <SummaryCard label={ADMIN_SUMMARY_CLASSES} value={classTotal} />
    </div>
  );
}
