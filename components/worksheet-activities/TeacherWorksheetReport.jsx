import Link from "next/link";
import { worksheetGradingStatusLabelHe } from "../../lib/worksheet-activities/worksheet-labels.client.js";

/**
 * @param {{ classId?: string, worksheetId: string, report: Record<string, unknown>, worksheetRouteBase?: string }} props
 */
export default function TeacherWorksheetReport({ classId, worksheetId, report, worksheetRouteBase }) {
  const base =
    worksheetRouteBase ||
    `/teacher/class/${encodeURIComponent(classId)}/worksheets/${encodeURIComponent(worksheetId)}`;
  const rows = Array.isArray(report.studentRows) ? report.studentRows : [];

  return (
    <div className="space-y-6 text-right">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="סה״כ ילדים" value={report.totalStudents} />
        <Stat label="פתחו PDF" value={report.pdfOpenedCount} />
        <Stat label="סיימו (PDF)" value={report.markedCompleteCount} />
        <Stat label="הגישו תשובות" value={report.digitalSubmittedCount} />
        <Stat label="ממתין לבדיקה" value={report.pendingReviewCount} />
        <Stat label="פורסם" value={report.publishedCount} />
        {report.classAveragePct != null ? (
          <Stat label="ממוצע כיתה" value={`${report.classAveragePct}%`} />
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm text-right">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="p-3">ילד/ה</th>
              <th className="p-3">פתח PDF</th>
              <th className="p-3">סיים</th>
              <th className="p-3">הגשה דיגיטלית</th>
              <th className="p-3">סטטוס</th>
              <th className="p-3">ציון</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId} className="border-t border-white/10">
                <td className="p-3 text-white">{row.studentName}</td>
                <td className="p-3 text-white/80">
                  {row.pdfOpenCount > 0 ? "✓" : "-"}
                </td>
                <td className="p-3 text-white/80">
                  {row.markedCompletedAt ? "✓" : "-"}
                </td>
                <td className="p-3 text-white/80">
                  {row.digitalSubmittedAt ? "✓" : "-"}
                </td>
                <td className="p-3 text-white/80">
                  {worksheetGradingStatusLabelHe(row.gradingStatus)}
                </td>
                <td className="p-3 text-white">
                  {row.gradingStatus === "published" && row.finalScorePct != null
                    ? `${row.finalScorePct}%`
                    : "-"}
                </td>
                <td className="p-3">
                  {report.worksheetMode !== "pdf_only" &&
                  row.digitalSubmittedAt &&
                  row.gradingStatus !== "published" ? (
                    <Link
                      href={`${base}/grade/${encodeURIComponent(row.studentId)}`}
                      className="text-amber-300 hover:underline"
                    >
                      בדיקה
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-xl font-bold text-white tabular-nums">{value ?? 0}</p>
    </div>
  );
}
