import Link from "next/link";

export default function TeacherPortalShell({
  children,
  title,
  backHref,
  backLabel = "← חזרה ללוח הבקרה",
  schoolMembership = null,
}) {
  const showSchoolLink = schoolMembership?.isSchoolManager === true;
  const schoolLabel = schoolMembership?.schoolName;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl" lang="he">
      {(showSchoolLink || schoolLabel) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          {schoolLabel ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-amber-200">
              בית ספר: {schoolLabel}
            </span>
          ) : (
            <span />
          )}
          {showSchoolLink ? (
            <Link href="/school/dashboard" className="text-emerald-300 hover:underline font-medium">
              ניהול בית הספר
            </Link>
          ) : null}
        </div>
      )}
      {backHref ? (
        <a href={backHref} className="text-sm text-amber-300 hover:underline mb-4 inline-block">
          {backLabel}
        </a>
      ) : null}
      {title ? <h1 className="text-2xl font-bold mb-6">{title}</h1> : null}
      {children}
    </div>
  );
}
