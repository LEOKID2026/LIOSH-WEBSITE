import {
  SchoolReportActivityList,
  SchoolReportInsight,
  SchoolReportLabelList,
  SchoolReportSection,
} from "../school-portal/SchoolReportModalBody.jsx";
import { studentLearningStatusBadgeClass } from "../../lib/school-portal/school-ui.he.js";

export function ReportSummaryHeader({ header }) {
  if (!header) return null;
  return (
    <>
      {header.subtitle ? <p className="text-sm text-white/60 mb-3">{header.subtitle}</p> : null}
      {header.chips?.length ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {header.chips.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-xs"
            >
              <span className="text-white/45">{c.label}</span>
              <span className="font-semibold text-white">{c.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function ReportSummaryCards({ summaryCards }) {
  if (!summaryCards?.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
      {summaryCards.map((row) => (
        <div
          key={row.label}
          className="rounded-lg border border-white/15 bg-black/30 px-2.5 py-2.5 text-center min-w-0"
        >
          <p className="text-[11px] text-white/45 mb-0.5 leading-tight">{row.label}</p>
          <p className="text-base font-bold tabular-nums text-amber-200 break-words">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{ items: Array<{ id: string, label: string, badge?: string|number|null, disabled?: boolean }>, onSelect: (id: string) => void }} props
 */
export function ReportNavActionGrid({ items, onSelect }) {
  if (!items?.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          onClick={() => onSelect(item.id)}
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-right transition"
          data-testid={`report-nav-${item.id}`}
        >
          <span className="font-semibold text-amber-100 text-sm block">{item.label}</span>
          {item.badge != null && item.badge !== "" ? (
            <span className="text-xs text-white/50 mt-1 block">{item.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function LearningStatusBadge({ label }) {
  if (!label) return null;
  return (
    <span
      className={`inline-block text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full border leading-none ${studentLearningStatusBadgeClass(
        label
      )}`}
      data-testid="report-student-learning-status"
    >
      {label}
    </span>
  );
}

function RowActionButtons({ actions, onRowAction, item, studentReportLoading, onStudentReport }) {
  if (!actions?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      {actions.map((action) => {
        if (action.id === "student_report" && onStudentReport && action.studentId) {
          return (
            <button
              key={`${action.id}-${action.studentId}`}
              type="button"
              disabled={studentReportLoading}
              onClick={() => onStudentReport(action.studentId, item)}
              className="rounded-lg bg-amber-500 text-black text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
              data-testid={`report-open-student-${action.studentId}`}
            >
              {studentReportLoading ? "טוען…" : action.label || "דוח ילד/ה"}
            </button>
          );
        }
        if (!onRowAction) return null;
        return (
          <button
            key={`${action.id}-${action.classId || action.teacherId || action.label}`}
            type="button"
            onClick={() => onRowAction(action, item)}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-100 text-xs font-semibold px-3 py-1.5 hover:bg-amber-500/20"
            data-testid={
              action.id === "subject_report" && action.classId
                ? `report-open-subject-${action.classId}`
                : action.id === "teacher_card" && action.teacherId
                  ? `report-open-teacher-${action.teacherId}`
                  : undefined
            }
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

function StudentListSection({ section, studentActions, onRowAction, studentReportLoading, onStudentReport }) {
  const items = section.items || [];
  if (!items.length) {
    return (
      <p className="text-sm text-white/50 rounded-lg border border-dashed border-white/15 px-3 py-3">
        {section.empty}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id || item.studentId}
          className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          data-testid={item.studentId ? `report-student-row-${item.studentId}` : undefined}
        >
          <div className="min-w-0">
            <p className="font-medium text-white">{item.name || item.label}</p>
            {item.detail ? <p className="text-xs text-white/55 mt-0.5">{item.detail}</p> : null}
            {item.status && !item.learningStatusBadge ? (
              <p className="text-xs text-white/45 mt-0.5">{item.status}</p>
            ) : null}
            {item.subjects?.length ? (
              <p className="text-xs text-white/45 mt-0.5">{item.subjects.join(" · ")}</p>
            ) : null}
          </div>
          {item.actions?.length || item.learningStatusBadge ? (
            <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
              <LearningStatusBadge label={item.learningStatusBadge} />
              {item.actions?.length ? (
                <RowActionButtons
                  actions={item.actions}
                  onRowAction={onRowAction}
                  item={item}
                  studentReportLoading={studentReportLoading}
                  onStudentReport={onStudentReport}
                />
              ) : studentActions && item.studentId ? (
                studentActions(item)
              ) : null}
            </div>
          ) : studentActions && item.studentId ? (
            studentActions(item)
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SubjectRowsSection({ section, onRowAction }) {
  const items = section.items || [];
  if (!items.length) {
    return (
      <p className="text-sm text-white/50 rounded-lg border border-dashed border-white/15 px-3 py-3">
        {section.empty}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id || item.classId}
          className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          data-testid={item.classId ? `report-subject-row-${item.classId}` : undefined}
        >
          <div className="min-w-0">
            <p className="font-medium text-white">{item.label}</p>
            {item.detail ? <p className="text-xs text-white/55 mt-0.5">{item.detail}</p> : null}
            {item.status ? <p className="text-xs text-amber-200/90 mt-0.5">דיוק {item.status}</p> : null}
          </div>
          {item.actions?.length ? (
            <RowActionButtons actions={item.actions} onRowAction={onRowAction} item={item} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ActivityRowsSection({ section, onRowAction }) {
  const items = section.items || [];
  if (!items.length) {
    return (
      <p className="text-sm text-white/50 rounded-lg border border-dashed border-white/15 px-3 py-3">
        {section.empty}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-sm flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
          data-testid={item.id ? `report-activity-row-${item.id}` : undefined}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-white break-words">{item.title}</p>
              {item.date ? <span className="text-xs text-white/45 shrink-0">{item.date}</span> : null}
            </div>
            <p className="text-xs text-white/55 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
              {item.subject ? <span>{item.subject}</span> : null}
              {item.mode ? <span>· {item.mode}</span> : null}
              {item.status ? (
                <span className="rounded border border-white/15 px-1.5 py-0.5">{item.status}</span>
              ) : null}
              {item.meta ? <span>· {item.meta}</span> : null}
            </p>
          </div>
          {item.actions?.length ? (
            <RowActionButtons actions={item.actions} onRowAction={onRowAction} item={item} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * @param {{ section: { title?: string, empty?: string, items?: unknown[] }, variant?: string, studentActions?: (item: { studentId?: string }) => React.ReactNode, onDrilldownSelect?: (key: string) => void, onRowAction?: (action: object, item: object) => void, studentReportLoading?: boolean, onStudentReport?: (studentId: string, item: object) => void }} props
 */
export function ReportDetailSectionView({
  section,
  variant,
  studentActions,
  onDrilldownSelect,
  onRowAction,
  studentReportLoading = false,
  onStudentReport,
}) {
  if (!section) return <p className="text-sm text-white/50">אין נתונים להצגה.</p>;

  if (variant === "activities" && section.items?.some((i) => i.actions?.length)) {
    return (
      <SchoolReportSection title={section.title} empty={section.empty}>
        <ActivityRowsSection section={section} onRowAction={onRowAction} />
      </SchoolReportSection>
    );
  }

  if (variant === "activities") {
    return (
      <SchoolReportSection title={section.title} empty={section.empty}>
        <SchoolReportActivityList items={section.items} />
      </SchoolReportSection>
    );
  }

  if (variant === "subjects" && section.items?.some((i) => i.actions?.length)) {
    return (
      <SchoolReportSection title={section.title} empty={section.empty}>
        <SubjectRowsSection section={section} onRowAction={onRowAction} />
      </SchoolReportSection>
    );
  }

  if (variant === "students" || variant === "attention") {
    return (
      <StudentListSection
        section={section}
        studentActions={studentActions}
        onRowAction={onRowAction}
        studentReportLoading={studentReportLoading}
        onStudentReport={onStudentReport}
      />
    );
  }

  if (variant === "distribution" || variant === "focus") {
    const items = section.items || [];
    const preamble = section.preamble;
    if (!items.length && !preamble) {
      return (
        <p className="text-sm text-white/50 rounded-lg border border-dashed border-white/15 px-3 py-3">
          {section.empty}
        </p>
      );
    }
    return (
      <>
        {preamble ? (
          <p className="text-sm text-white/70 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3 mb-3">
            {preamble}
          </p>
        ) : null}
        {!items.length ? null : (
      <ul className="space-y-2">
        {items.map((item, i) => {
          const label = item.label || item.tier || item.name;
          const clickable = Boolean(item.drilldownKey && onDrilldownSelect);
          const Tag = clickable ? "button" : "div";
          const countText =
            item.count != null && item.count !== ""
              ? `${item.count} ילדים`
              : null;
          return (
            <li key={`${label}-${i}`}>
              <Tag
                type={clickable ? "button" : undefined}
                onClick={clickable ? () => onDrilldownSelect(item.drilldownKey) : undefined}
                aria-label={clickable ? `${label}${countText ? `, ${countText}` : ""}, פתח רשימה` : undefined}
                className={`w-full rounded-lg border bg-black/20 px-3 py-2.5 text-sm text-right ${
                  clickable
                    ? "border-amber-500/20 hover:bg-black/35 hover:border-amber-500/35 cursor-pointer transition"
                    : "border-white/10"
                }`}
                data-testid={item.drilldownKey ? `report-drilldown-${item.drilldownKey}` : undefined}
              >
                <span className="inline text-white/90 leading-snug">
                  {label}
                  {item.detail ? (
                    <>
                      <span className="text-white/45"> · </span>
                      <span className="text-white/65">{item.detail}</span>
                    </>
                  ) : null}
                  {countText ? (
                    <>
                      <span className="text-white/45"> · </span>
                      <span className="tabular-nums font-semibold text-amber-200">{countText}</span>
                    </>
                  ) : null}
                  {clickable ? (
                    <>
                      <span className="text-white/45"> · </span>
                      <span className="font-medium text-amber-200/90">פתח</span>
                    </>
                  ) : null}
                </span>
              </Tag>
            </li>
          );
        })}
      </ul>
        )}
      </>
    );
  }

  const listVariant = variant === "subjects" ? "subject" : "default";

  return (
    <SchoolReportSection title={section.title} empty={section.empty}>
      <SchoolReportLabelList items={section.items} variant={listVariant} />
    </SchoolReportSection>
  );
}

/**
 * Main report hub — summary + navigation only.
 */
export function ReportHubSummary({ viewModel, onNavigate }) {
  return (
    <div data-testid="report-hub-summary-ready">
      <ReportSummaryHeader header={viewModel.header} />
      <ReportSummaryCards summaryCards={viewModel.summaryCards} />
      <SchoolReportInsight text={viewModel.insight} />
      <ReportNavActionGrid items={viewModel.navigation || []} onSelect={onNavigate} />
    </div>
  );
}
