import Link from "next/link";
import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";

/**
 * Shared entry / finish / error navigation — primary + games hub + home.
 * @param {{
 *   primaryLabel: string,
 *   onPrimary: () => void,
 *   primaryDisabled?: boolean,
 *   primaryBusy?: boolean,
 *   primaryBusyLabel?: string,
 *   compact?: boolean,
 *   gamesHubHref?: string,
 *   gamesHubLabel?: string,
 * }} props
 */
export default function SoloGameNavButtons({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryBusy = false,
  primaryBusyLabel = "טוען…",
  compact = false,
  gamesHubHref = "/game",
  gamesHubLabel = "חזרה למשחקים",
}) {
  const { SG, tokens: T } = useSoloGameShellUi();
  const minH = compact ? "min-h-[44px] landscape:min-h-[36px]" : "min-h-[48px]";
  const textSize = compact ? "landscape:px-3 landscape:py-2 landscape:text-sm" : "";
  const gamesBtn = T.ctaGames || T.ctaSecondary;

  return (
    <div className={`flex w-full flex-col gap-2 ${compact ? "landscape:gap-1.5" : "sm:gap-2.5"}`}>
      <button
        type="button"
        disabled={primaryDisabled || primaryBusy}
        onClick={onPrimary}
        className={`${T.ctaPrimary} ${minH} w-full justify-center ${textSize}`}
      >
        {primaryBusy ? primaryBusyLabel : primaryLabel}
      </button>
      <Link
        href={gamesHubHref}
        className={`${gamesBtn} ${minH} w-full flex items-center justify-center ${textSize}`}
      >
        {gamesHubLabel}
      </Link>
      <Link
        href="/student/home"
        className={`${SG.navHomeBtn} ${minH} w-full flex items-center justify-center ${textSize}`}
      >
        חזרה לעולם הילד
      </Link>
    </div>
  );
}
