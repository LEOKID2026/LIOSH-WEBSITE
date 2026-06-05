import Link from "next/link";
import { STUDENT_ACTIVITY_LAYOUT } from "../../lib/classroom-activities/student-activity-layout.client.js";

/**
 * Unified assigned-activity page shell — header, progress, card grid, footer.
 * Used by parent / teacher-individual / classroom scopes (single play page).
 *
 * @param {{
 *   title: string,
 *   subtitle: string,
 *   progressPct: number,
 *   visual: React.ReactNode,
 *   actions: React.ReactNode,
 *   footer?: React.ReactNode,
 *   singleColumn?: boolean,
 *   overlayTopRef?: React.RefObject<HTMLElement|null>,
 *   overlayWidthRef?: React.RefObject<HTMLElement|null>,
 * }} props
 */
export default function StudentAssignedActivityShell({
  title,
  subtitle,
  progressPct,
  visual,
  actions,
  footer = null,
  singleColumn = false,
  overlayTopRef,
  overlayWidthRef,
}) {
  const L = STUDENT_ACTIVITY_LAYOUT;

  return (
    <div className={L.page} dir="rtl" lang="he">
      <div ref={overlayTopRef}>
        <div className={L.headerRow} dir="ltr">
          <Link href="/student/home" className={L.backLink}>
            ← חזרה לבית
          </Link>
          <div className={L.titleBlock} dir="rtl">
            <h1 className={L.title}>{title}</h1>
            <p className={L.subtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={L.progressTrack} aria-hidden>
          <div className={L.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div ref={overlayWidthRef} className={L.card}>
        <div className={singleColumn ? "flex flex-col gap-3 min-w-0" : L.cardGrid}>
          <div
            className={singleColumn ? "min-w-0 overflow-visible" : L.questionStage}
            data-testid="activity-question-stage"
          >
            {visual}
          </div>
          <div className={L.actionsPanel} data-testid="activity-actions-panel">
            {actions}
          </div>
        </div>
      </div>

      {footer ? <div className={L.footerNav}>{footer}</div> : null}
    </div>
  );
}
