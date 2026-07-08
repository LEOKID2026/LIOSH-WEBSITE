import { DEFAULT_PROFILE_BACKGROUND_KEY } from "../../../lib/student-ui/profile-background-options.js";
import { resolveProfileBackgroundStyle } from "../../../lib/student-ui/profile-background.client.js";

/** @param {{ avatarEmoji?: string, avatarCustomDataUrl?: string, avatarBackgroundKey?: string, className?: string, sizeClass?: string, onClick?: () => void, ariaLabel?: string }} props */
export default function StudentLearningAvatar({
  avatarEmoji = "👤",
  avatarCustomDataUrl = "",
  avatarBackgroundKey = DEFAULT_PROFILE_BACKGROUND_KEY,
  className = "",
  sizeClass = "h-11 w-11 text-xl",
  onClick,
  ariaLabel = "פרופיל שחקן",
}) {
  const { background } = resolveProfileBackgroundStyle(avatarBackgroundKey);
  const interactive =
    "cursor-pointer transition hover:ring-2 hover:ring-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";

  const innerContent = avatarCustomDataUrl ? (
    <img src={avatarCustomDataUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <span className="leading-none">{avatarEmoji || "👤"}</span>
  );

  const shell = (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full p-[3px] shadow-sm ${sizeClass} ${className}`}
      style={{ background }}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/90 bg-white">
        {innerContent}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={interactive}>
        {shell}
      </button>
    );
  }

  return shell;
}
