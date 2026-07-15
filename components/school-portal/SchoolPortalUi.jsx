import Link from "next/link";
import {
  schoolActivityModeHe,
  schoolActivityStatusHe,
  schoolSubjectLabelHe,
  sanitizeActivityTitleHe,
} from "../../lib/school-portal/school-ui.he.js";

export const SCHOOL_CARD =
  "rounded-xl border border-white/15 bg-gradient-to-br from-black/30 to-black/10 shadow-sm";
export const SCHOOL_CARD_INNER = "p-4 sm:p-5";
export const SCHOOL_SECTION_TITLE = "text-base sm:text-lg font-bold text-right mb-1";
export const SCHOOL_SECTION_DESC = "text-sm text-white/55 text-right mb-4";

export function SchoolStatCard({ label, value, hint, accent = "amber" }) {
  const accentRing =
    accent === "emerald"
      ? "border-emerald-500/30"
      : accent === "sky"
        ? "border-sky-500/30"
        : accent === "violet"
          ? "border-violet-500/30"
          : "border-amber-500/30";

  return (
    <div className={`${SCHOOL_CARD} ${accentRing} ${SCHOOL_CARD_INNER} text-right min-w-0`}>
      <p className="text-xs text-white/50 mb-1 truncate">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold tabular-nums leading-none">{value ?? "-"}</p>
      {hint ? <p className="text-xs text-white/45 mt-2">{hint}</p> : null}
    </div>
  );
}

export function SchoolQuickActionCard({ href, title, description, icon }) {
  return (
    <Link
      href={href}
      className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} block text-right hover:border-amber-400/40 hover:bg-white/[0.04] transition-colors group min-w-0`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white group-hover:text-amber-200 transition-colors">
            {title}
          </p>
          <p className="text-sm text-white/55 mt-1 leading-relaxed">{description}</p>
        </div>
        {icon ? (
          <span
            className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 text-lg"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function SchoolSection({ title, description, children, action, ...rest }) {
  return (
    <section className={`${SCHOOL_CARD} overflow-hidden`} {...rest}>
      <div className="border-b border-white/10 px-4 sm:px-5 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-right">
          <h2 className={SCHOOL_SECTION_TITLE}>{title}</h2>
          {description ? <p className="text-sm text-white/55 mt-0.5">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function SchoolEmptyState({ title, hint }) {
  return (
    <div className="rounded-lg border border-dashed border-white/20 bg-black/20 px-4 py-8 text-center">
      <p className="text-white/80 font-medium">{title}</p>
      {hint ? <p className="text-sm text-white/50 mt-2 max-w-md mx-auto leading-relaxed">{hint}</p> : null}
    </div>
  );
}

export function SchoolAlertBanner({ children, tone = "amber" }) {
  const tones = {
    amber: "border-amber-500/35 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100",
    sky: "border-sky-500/35 bg-sky-500/10 text-sky-100",
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm text-right ${tones[tone] || tones.amber}`}>
      {children}
    </div>
  );
}

export function SchoolSubjectBadges({ subjects, max = 6 }) {
  if (!subjects?.length) {
    return <span className="text-white/45 text-xs">-</span>;
  }
  const unique = [...new Set(subjects)];
  const shown = unique.slice(0, max);
  const rest = unique.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {shown.map((s) => (
        <span
          key={s}
          className="inline-flex rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-white/80"
        >
          {schoolSubjectLabelHe(s)}
        </span>
      ))}
      {rest > 0 ? <span className="text-xs text-white/45 self-center">+{rest}</span> : null}
    </div>
  );
}

export function SchoolActivityStatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const styles = {
    draft: "border-white/25 bg-white/10 text-white/70",
    active: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    paused: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    closed: "border-white/20 bg-black/30 text-white/60",
    archived: "border-white/15 bg-black/40 text-white/45",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${styles[key] || styles.draft}`}
    >
      {schoolActivityStatusHe(status)}
    </span>
  );
}

/**
 * @param {{ activity: { id: string, title?: string, subject?: string, status?: string, teacherName?: string|null, className?: string|null, mode?: string } }} props
 */
export function SchoolActivityRow({ activity }) {
  const title = sanitizeActivityTitleHe(activity.title, activity.subject);
  const subject = schoolSubjectLabelHe(activity.subject);
  const teacher = activity.teacherName || "-";
  const className = activity.className || "-";
  const mode = schoolActivityModeHe(activity.mode);
  const showReview = activity.status && activity.status !== "draft";

  return (
    <li className="rounded-lg border border-white/10 bg-black/25 px-3 sm:px-4 py-3 hover:bg-white/[0.03] transition-colors min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 text-right space-y-2">
          <p className="font-semibold text-white break-words">{title}</p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex justify-between sm:block gap-2">
              <dt className="text-white/45">מקצוע</dt>
              <dd className="text-white/85">{subject}</dd>
            </div>
            <div className="flex justify-between sm:block gap-2">
              <dt className="text-white/45">כיתה</dt>
              <dd className="text-white/85 break-words">{className}</dd>
            </div>
            <div className="flex justify-between sm:block gap-2">
              <dt className="text-white/45">מורה</dt>
              <dd className="text-white/85">{teacher}</dd>
            </div>
            <div className="flex justify-between sm:block gap-2">
              <dt className="text-white/45">סוג</dt>
              <dd className="text-white/85">{mode}</dd>
            </div>
          </dl>
          {showReview ? (
            <Link
              href={`/school/activities/${encodeURIComponent(activity.id)}/monitor`}
              className="inline-flex text-sm text-amber-300 hover:underline"
              data-testid="school-activity-review-link"
            >
              צפה בתשובות
            </Link>
          ) : null}
        </div>
        <SchoolActivityStatusBadge status={activity.status} />
      </div>
    </li>
  );
}

export function SchoolDataTable({ columns, children, emptyMessage }) {
  const hasRows = Boolean(children);
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[640px] text-sm text-right">
        <thead className="bg-black/40 text-white/65 text-xs">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 font-medium whitespace-nowrap ${col.className || ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-white/50">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SchoolTableRow({ children, onClick, className = "" }) {
  const Tag = onClick ? "tr" : "tr";
  return (
    <Tag
      onClick={onClick}
      className={`border-t border-white/10 hover:bg-white/[0.03] ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SchoolTableCell({ children, className = "" }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}

export function SchoolPageIntro({ title, subtitle }) {
  return (
    <div className="mb-6 text-right">
      <h2 className="text-lg sm:text-xl font-bold text-white/95">{title}</h2>
      {subtitle ? <p className="text-sm text-white/55 mt-1 max-w-3xl mr-0 ml-auto">{subtitle}</p> : null}
    </div>
  );
}

/** School-portal interactive controls: hand on hover, not-allowed when disabled. */
export const SCHOOL_PORTAL_BTN_CURSOR = "cursor-pointer disabled:cursor-not-allowed";

/** Refined thin scrollbar for modal/panel scroll areas (see globals.css). */
export const SCHOOL_PORTAL_MODAL_SCROLL_CLASS = "school-portal-modal-scroll";

export function SchoolPrimaryButton({ children, disabled, type = "button", onClick, className = "" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 disabled:opacity-60 min-h-[2.5rem] transition-colors ${SCHOOL_PORTAL_BTN_CURSOR} ${className}`}
    >
      {children}
    </button>
  );
}

export function SchoolSecondaryButton({ children, disabled, type = "button", onClick, className = "" }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 ${SCHOOL_PORTAL_BTN_CURSOR} ${className}`}
    >
      {children}
    </button>
  );
}

export function SchoolReportPreview({ loading, error, summary, onClose, closeLabel = "סגירה" }) {
  if (!loading && !error && !summary) return null;
  return (
    <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} mt-4 text-right`}>
      {loading ? <p className="text-white/60 text-sm">{loading}</p> : null}
      {error ? (
        <p className="text-red-300 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {summary ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{summary.title}</p>
            {typeof onClose === "function" ? (
              <button type="button" onClick={onClose} className="text-xs text-amber-300 hover:underline cursor-pointer">
                {closeLabel}
              </button>
            ) : null}
          </div>
          <p className="text-sm text-white/70">{summary.line}</p>
        </div>
      ) : null}
    </div>
  );
}
