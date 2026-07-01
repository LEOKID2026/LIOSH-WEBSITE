import {
  PARENT_REPORT_DISCLAIMER_PARAGRAPHS_HE,
  PARENT_REPORT_DISCLAIMER_TITLE_HE,
} from "../data/legal/sitePolicies.he";

/**
 * הבהרה משפטית חינוכית — נוסח אחיד לדוח הורים, דוח מקיף (מלא/תקציר) והדפסה.
 * מקור נוסח: data/legal/sitePolicies.he.js
 */
export function ParentReportImportantDisclaimer() {
  return (
    <aside
      className="parent-report-important-disclaimer mt-5 md:mt-6 mb-1 rounded-lg border border-white/14 bg-white/[0.06] px-3 py-3 md:px-4 md:py-3.5 text-right shadow-none"
      dir="rtl"
      role="note"
    >
      <h2 className="parent-report-important-disclaimer-title text-sm font-extrabold text-white/90 mb-2 tracking-tight m-0">
        {PARENT_REPORT_DISCLAIMER_TITLE_HE}
      </h2>
      <div className="parent-report-important-disclaimer-body space-y-2 text-[0.8125rem] md:text-sm leading-relaxed text-white/76">
        {PARENT_REPORT_DISCLAIMER_PARAGRAPHS_HE.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="m-0">
            {paragraph}
          </p>
        ))}
      </div>
    </aside>
  );
}
