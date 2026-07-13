import Link from "next/link";
import GameAudioSettingsButton from "../game-audio/GameAudioSettingsButton.jsx";

/**
 * Top bar for game hub pages — back and category badge on one row.
 * Theme toggle lives in the site header HUD (Layout).
 * @param {{ backHref: string, backLabel: string, badge: string, backBtnClass: string, badgeClass: string, showAudioSettings?: boolean }} props
 */
export default function GamesHubNavBar({
  backHref,
  backLabel,
  badge,
  backBtnClass,
  badgeClass,
  showAudioSettings = true,
}) {
  return (
    <div className="mb-3 md:mb-4 grid h-10 min-h-10 grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Link href={backHref} className={`${backBtnClass} justify-self-start`}>
        {backLabel}
      </Link>
      <p className={`${badgeClass} justify-self-center text-center leading-none`}>{badge}</p>
      <div className="justify-self-end">
        {showAudioSettings ? <GameAudioSettingsButton /> : <span aria-hidden="true" />}
      </div>
    </div>
  );
}
