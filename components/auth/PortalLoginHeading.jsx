import Link from "next/link";

export const PORTAL_HOME_BACK_LABEL = "חזרה לדף הבית";

export function PortalHomeBackLink({ className = "" }) {
  return (
    <Link
      href="/"
      className={`text-sm font-semibold text-amber-300 hover:underline ${className}`}
      data-testid="portal-home-back-link"
    >
      {PORTAL_HOME_BACK_LABEL}
    </Link>
  );
}

export default function PortalLoginHeading({ title, subtitle, className = "" }) {
  return (
    <header className={`mb-6 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-white/70 mt-2">{subtitle}</p> : null}
        </div>
        <PortalHomeBackLink className="shrink-0 pt-1" />
      </div>
    </header>
  );
}
