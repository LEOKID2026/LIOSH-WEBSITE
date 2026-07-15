import Link from "next/link";
import TeacherPortalShell from "./TeacherPortalShell";

export function TeacherReportLoading({ title, backHref, hint }) {
  return (
    <TeacherPortalShell backHref={backHref} title={title}>
      <div className="space-y-3" role="status" aria-live="polite">
        <p className="text-white/80">{hint || "הדוח נטען - זה עשוי לקחת כמה שניות."}</p>
        <div className="h-1.5 w-full max-w-xs rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-amber-400/80 animate-pulse" />
        </div>
      </div>
    </TeacherPortalShell>
  );
}

export function TeacherReportError({
  title,
  backHref,
  message,
  onRetry,
}) {
  return (
    <TeacherPortalShell backHref={backHref} title={title}>
      <p className="text-red-300 mb-4" role="alert">
        {message || "אירעה שגיאה בטעינת הדוח. רענן ונסה שוב."}
      </p>
      <div className="flex flex-wrap gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded bg-amber-500 text-black text-sm font-semibold px-4 py-2"
          >
            נסה שוב
          </button>
        ) : null}
        <Link
          href={backHref || "/teacher/dashboard"}
          className="rounded border border-white/25 text-sm px-4 py-2 hover:bg-white/10"
        >
          חזרה ללוח הבקרה
        </Link>
      </div>
    </TeacherPortalShell>
  );
}

export function TeacherReportForbidden({ title, backHref, message }) {
  return (
    <TeacherPortalShell backHref={backHref} title={title}>
      <p className="text-red-300" role="alert">
        {message || "אין לך הרשאה לצפות בדוח זה."}
      </p>
    </TeacherPortalShell>
  );
}
