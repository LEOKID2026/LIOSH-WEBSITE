/**
 * Compact site chrome footer — copyright only (legal links live on /contact).
 */
export default function SiteLegalFooterBar({ isStudentBright = false }) {
  const textClass = isStudentBright ? "text-slate-500" : "text-white/55";

  return (
    <div className={`max-w-6xl mx-auto px-3 py-1 sm:py-1.5 text-center ${textClass}`}>
      <p className="text-[10px] sm:text-xs leading-tight">
        © {new Date().getFullYear()} LEO K · משחקים ולמידה לילדים
      </p>
    </div>
  );
}
