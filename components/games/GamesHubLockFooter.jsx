import {
  GUEST_GAME_LOCK_HINT_HE,
  GUEST_GAME_LOCK_LABEL_HE,
} from "../../lib/guest/constants.js";

/**
 * Child-friendly lock label for guest-locked hub games.
 */
export default function GamesHubLockFooter({
  ctaClass = "",
  label = GUEST_GAME_LOCK_LABEL_HE,
  hint = GUEST_GAME_LOCK_HINT_HE,
}) {
  return (
    <div className="mt-3 text-right">
      <span className={`${ctaClass} inline-flex items-center gap-1 opacity-90 cursor-not-allowed`}>
        🔒 {label}
      </span>
      {hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}
    </div>
  );
}
