/**
 * הבהרה משפטית חינוכית — נוסח אחיד לדוח הורים, דוח מקיף (מלא/תקציר) והדפסה.
 * אין לשנות ניסוח כאן בלי לעדכן את כל ערוצי הדוח באותו נוסח.
 */
export function ParentReportImportantDisclaimer() {
  return (
    <aside
      className="parent-report-important-disclaimer mt-5 md:mt-6 mb-1 rounded-lg border border-white/14 bg-white/[0.06] px-3 py-3 md:px-4 md:py-3.5 text-right shadow-none"
      dir="rtl"
      role="note"
    >
      <h2 className="parent-report-important-disclaimer-title text-sm font-extrabold text-white/90 mb-2 tracking-tight m-0">
        הבהרה חשובה
      </h2>
      <div className="parent-report-important-disclaimer-body space-y-2 text-[0.8125rem] md:text-sm leading-relaxed text-white/76">
        <p className="m-0">
          הדוח, ההמלצות והתובנות במסמך זה נגזרות מתוך נתוני התרגול והשימוש במערכת.
        </p>
        <p className="m-0">
          הם נועדו לשמש{" "}
          <strong className="font-bold text-white/85">כלי עזר לימודי</strong>
          {" "}להורה ולילד/ה, ואינם מהווים אבחון חינוכי, דידקטי או מקצועי, ואינם מחליפים שיקול דעת של מורה, יועץ, איש חינוך או בעל מקצוע מוסמך.
        </p>
        <p className="m-0">
          במקרה של קושי מתמשך, פער לימודי משמעותי או צורך בהכוונה אישית, מומלץ להיוועץ במורה או באיש מקצוע מתאים.
        </p>
      </div>
    </aside>
  );
}
