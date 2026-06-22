import Link from "next/link";

/**
 * Top bar for game hub pages — back and category badge on one row.
 * Theme toggle lives in the site header HUD (Layout).
 * @param {{ backHref: string, backLabel: string, badge: string, backBtnClass: string, badgeClass: string }} props
 */
export default function GamesHubNavBar({ backHref, backLabel, badge, backBtnClass, badgeClass }) {
  return (
    <div className="mb-3 md:mb-4 grid h-8 min-h-8 grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Link href={backHref} className={`${backBtnClass} justify-self-start`}>
        {backLabel}
      </Link>
      <p className={`${badgeClass} justify-self-center text-center leading-none`}>{badge}</p>
      <span className="justify-self-end" aria-hidden="true" />
    </div>
  );
}
