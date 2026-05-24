export default function TeacherPortalShell({ children, title, backHref, backLabel = "← חזרה ללוח הבקרה" }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" dir="rtl" lang="he">
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
