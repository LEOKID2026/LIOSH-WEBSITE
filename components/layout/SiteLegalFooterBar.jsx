import Link from "next/link";
import { LEGAL_FOOTER_LINKS } from "../../data/legal/sitePolicies.he";
import ConsentPreferencesLink from "../consent/ConsentPreferencesLink.jsx";

/**
 * Compact site chrome footer — copyright + single legal hub link from LEGAL_FOOTER_LINKS.
 */
export default function SiteLegalFooterBar({ isStudentBright = false }) {
  const textClass = isStudentBright ? "text-slate-500" : "text-white/55";
  const linkClass = isStudentBright
    ? "text-slate-600 hover:text-slate-800 underline underline-offset-2"
    : "text-white/70 hover:text-white underline underline-offset-2";

  const legalLink = LEGAL_FOOTER_LINKS[0];

  return (
    <div className={`max-w-6xl mx-auto px-3 py-1.5 sm:py-2 text-center ${textClass}`}>
      <p className="text-[10px] sm:text-xs leading-relaxed">
        © {new Date().getFullYear()} LEO K · משחקים ולמידה לילדים
        {legalLink ? (
          <>
            {" · "}
            <Link href={legalLink.href} className={linkClass}>
              {legalLink.label}
            </Link>
            {" · "}
            <ConsentPreferencesLink isStudentBright={isStudentBright} />
          </>
        ) : (
          <>
            {" · "}
            <ConsentPreferencesLink isStudentBright={isStudentBright} />
          </>
        )}
      </p>
    </div>
  );
}
