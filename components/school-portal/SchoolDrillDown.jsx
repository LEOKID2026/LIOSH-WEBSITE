import Link from "next/link";
import {
  schoolActivityModeHe,
  schoolActivityStatusHe,
  schoolSubjectLabelHe,
  sanitizeActivityTitleHe,
  SCHOOL_BACK,
  studentLearningStatusBadgeClass,
} from "../../lib/school-portal/school-ui.he.js";
import { SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi.jsx";

export function SchoolLoadingBlock({ message = "טוען…" }) {
  return (
    <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right`} role="status" aria-live="polite">
      <p className="text-white/60 text-sm">{message}</p>
    </div>
  );
}

export function SchoolErrorBlock({ message, onRetry, retryLabel = "נסו שוב" }) {
  return (
    <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right`} role="alert">
      <p className="text-red-300 text-sm">{message}</p>
      {typeof onRetry === "function" ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold cursor-pointer"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

/**
 * @param {{ steps: Array<{ label: string, onClick?: () => void, active?: boolean }> }} props
 */
export function SchoolDrillBreadcrumb({ steps }) {
  if (!steps?.length) return null;
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-white/55" aria-label="ניווט שכבות">
      {steps.map((step, index) => (
        <span key={`${step.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden className="text-white/25">/</span> : null}
          {typeof step.onClick === "function" && !step.active ? (
            <button type="button" onClick={step.onClick} className="text-amber-300 hover:underline cursor-pointer">
              {step.label}
            </button>
          ) : (
            <span className={step.active ? "text-white font-medium" : undefined}>{step.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/**
 * @param {{ title: string, subtitle?: string|null, meta?: string|null, onClick?: () => void, href?: string, action?: import('react').ReactNode, selected?: boolean } & import('react').HTMLAttributes<HTMLElement>} props
 */
function BrowseStatusBadge({ prefix, label }) {
  if (!label) return null;
  return (
    <p className="text-xs mt-2">
      <span
        className={`inline-block font-medium px-2 py-0.5 rounded-full border leading-snug ${studentLearningStatusBadgeClass(
          label
        )}`}
      >
        {prefix}: {label}
      </span>
    </p>
  );
}

export function SchoolManagementCard({
  title,
  subtitle,
  meta,
  classStatusLabel = null,
  gradeStatusLabel = null,
  onClick,
  href,
  action,
  selected = false,
  ...rest
}) {
  const className = `${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right w-full min-w-0 transition-colors ${
    selected ? "border-amber-400/50 bg-amber-500/10" : "hover:border-amber-400/30 hover:bg-white/[0.03]"
  }`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white break-words">{title}</p>
          {subtitle ? <p className="text-sm text-white/55 mt-1">{subtitle}</p> : null}
          {meta ? <p className="text-xs text-white/45 mt-2">{meta}</p> : null}
          {gradeStatusLabel ? (
            <BrowseStatusBadge prefix="מצב שכבה" label={gradeStatusLabel} />
          ) : classStatusLabel ? (
            <BrowseStatusBadge prefix="מצב כיתה" label={classStatusLabel} />
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${className}`} {...rest}>
        {inner}
      </Link>
    );
  }

  if (typeof onClick === "function") {
    return (
      <button type="button" onClick={onClick} className={className} {...rest}>
        {inner}
      </button>
    );
  }

  return (
    <div className={className} {...rest}>
      {inner}
    </div>
  );
}

/**
 * @param {{ children: import('react').ReactNode, columns?: 1|2|3 }} props
 */
export function SchoolCardGrid({ children, columns = 2 }) {
  const gridClass =
    columns === 3
      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
      : columns === 1
        ? "grid grid-cols-1 gap-3"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4";
  return <div className={gridClass}>{children}</div>;
}

export function SchoolBackButton({ onClick, label = SCHOOL_BACK }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 text-sm text-amber-300 hover:underline text-right cursor-pointer"
    >
      {label}
    </button>
  );
}

/**
 * @param {{ cls: { classId?: string, subjectFocus?: string|null, teacherName?: string|null, memberCount?: number, activityCount?: number, name?: string|null }, onReport: () => void, reportLabel: string }} props
 */
export function SchoolSubjectClassCard({ cls, onReport, reportLabel }) {
  const subject = schoolSubjectLabelHe(cls.subjectFocus);
  return (
    <SchoolManagementCard
      title={subject}
      subtitle={`${cls.teacherName || "-"} · ${cls.memberCount ?? 0} ילדים`}
      meta={cls.activityCount != null ? `פעילויות: ${cls.activityCount}` : null}
      action={
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReport();
          }}
          className="rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 whitespace-nowrap"
        >
          {reportLabel}
        </button>
      }
    />
  );
}

/**
 * @param {{ activity: { id: string, title?: string, subject?: string, status?: string, teacherName?: string|null, className?: string|null, mode?: string } }} props
 */
export function SchoolActivityCard({ activity }) {
  const title = sanitizeActivityTitleHe(activity.title, activity.subject);
  const subject = schoolSubjectLabelHe(activity.subject);
  const teacher = activity.teacherName || "-";
  const className = activity.className || "-";
  const mode = schoolActivityModeHe(activity.mode);
  const status = schoolActivityStatusHe(activity.status);

  const statusStyles = {
    draft: "border-white/25 bg-white/10 text-white/70",
    active: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
    paused: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    closed: "border-white/20 bg-black/30 text-white/60",
    archived: "border-white/15 bg-black/40 text-white/45",
  };
  const statusKey = String(activity.status || "").toLowerCase();
  const badgeClass = statusStyles[statusKey] || statusStyles.draft;

  return (
    <li className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right min-w-0`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
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
        </div>
        <span className={`inline-flex shrink-0 self-start rounded-md border px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
          {status}
        </span>
      </div>
    </li>
  );
}

/**
 * @param {{ teacher: { teacherId: string, displayName?: string|null, role?: string, subjects?: string[], activeClassCount?: number, activeStudentLinkCount?: number, isActive?: boolean }, manageHref: string, manageLabel: string, roleLabel: string, allSubjectsLabel: string, inactiveLabel: string }} props
 */
export function SchoolTeacherCard({
  teacher,
  manageHref,
  manageLabel,
  roleLabel,
  allSubjectsLabel,
  inactiveLabel,
  staffCode,
  staffAccessStatus,
}) {
  const isManager = teacher.role === "school_admin";
  const uniqueSubjects = [...new Set(teacher.subjects || [])];
  const subjectText = isManager
    ? allSubjectsLabel
    : uniqueSubjects.length
      ? uniqueSubjects.map((s) => schoolSubjectLabelHe(s)).join(" · ")
      : "-";

  return (
    <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right min-w-0`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white break-words">{teacher.displayName || teacher.teacherId}</p>
          {!teacher.isActive ? <p className="text-xs text-red-300/90 mt-1">{inactiveLabel}</p> : null}
          <p className="text-sm text-white/55 mt-1">{roleLabel}</p>
          {staffCode ? (
            <p className="text-xs text-white/50 mt-1 font-mono" dir="ltr">
              {staffCode}
              {staffAccessStatus === "suspended" ? " · מושעה" : ""}
            </p>
          ) : null}
          <p className="text-sm text-white/70 mt-2 break-words">{subjectText}</p>
          <p className="text-xs text-white/45 mt-2">{teacher.activeClassCount ?? 0} כיתות פעילות</p>
        </div>
        <Link
          href={manageHref}
          className="shrink-0 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 whitespace-nowrap"
        >
          {manageLabel}
        </Link>
      </div>
    </div>
  );
}

/**
 * @param {{ student: { studentId: string, displayName?: string|null, gradeLevel?: string|null, physicalClassName?: string|null }, gradeLabel: string, onReport: () => void, reportLabel: string, onAccess?: () => void, accessLabel?: string, onDetails?: () => void, detailsLabel?: string, learningStatusBadge?: string|null }} props
 */
export function SchoolStudentCard({
  student,
  gradeLabel,
  onReport,
  reportLabel,
  onAccess,
  accessLabel,
  onDetails,
  detailsLabel,
  learningStatusBadge = null,
}) {
  const name = student.displayName || "ללא שם";
  const classLabel = student.physicalClassName || "-";
  return (
    <SchoolManagementCard
      title={name}
      subtitle={`${gradeLabel} · ${classLabel}`}
      action={
        <div className="flex flex-col items-end gap-1.5">
          {learningStatusBadge ? (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border leading-none ${studentLearningStatusBadgeClass(
                learningStatusBadge
              )}`}
              data-testid={`school-student-status-${student.studentId}`}
            >
              {learningStatusBadge}
            </span>
          ) : null}
          {onDetails ? (
            <button
              type="button"
              onClick={onDetails}
              className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-3 py-1.5 whitespace-nowrap"
              data-testid={`school-student-details-${student.studentId}`}
            >
              {detailsLabel}
            </button>
          ) : null}
          {onAccess ? (
            <button
              type="button"
              onClick={onAccess}
              className="rounded-lg border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 text-xs font-bold px-3 py-1.5 whitespace-nowrap"
              data-testid={`school-student-access-${student.studentId}`}
            >
              {accessLabel}
            </button>
          ) : null}
          {onReport ? (
            <button
              type="button"
              onClick={onReport}
              className="rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 whitespace-nowrap"
              data-testid={`school-student-report-${student.studentId}`}
            >
              {reportLabel}
            </button>
          ) : null}
        </div>
      }
    />
  );
}
