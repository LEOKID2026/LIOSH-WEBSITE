import Link from "next/link";

export const PORTAL_HOME_BACK_LABEL = "חזרה לדף הבית";

export function PortalHomeBackLink({ className = "", bright = false, homeHref = "/" }) {
  return (
    <Link
      href={homeHref}
      className={`text-sm font-semibold hover:underline ${
        bright ? "text-sky-700 hover:text-sky-900" : "text-amber-300"
      } ${className}`}
      data-testid="portal-home-back-link"
    >
      {PORTAL_HOME_BACK_LABEL}
    </Link>
  );
}

export default function PortalLoginHeading({
  title,
  subtitle,
  className = "",
  bright = false,
  homeHref = "/",
}) {
  return (
    <header className={`mb-3 md:mb-6 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3 md:gap-4">
        <div className="min-w-0">
          <h1
            className={`text-xl md:text-2xl font-bold leading-tight ${
              bright ? "text-slate-900" : ""
            }`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={`mt-1 md:mt-2 text-sm ${
                bright ? "text-slate-600" : "text-white/70"
              }`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        <PortalHomeBackLink bright={bright} homeHref={homeHref} className="shrink-0 pt-0.5 md:pt-1 text-xs md:text-sm" />
      </div>
    </header>
  );
}
