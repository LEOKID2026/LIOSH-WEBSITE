/** @param {{ avatarEmoji?: string, avatarCustomDataUrl?: string, className?: string, sizeClass?: string, onClick?: () => void, ariaLabel?: string }} props */
export default function StudentLearningAvatar({
  avatarEmoji = "👤",
  avatarCustomDataUrl = "",
  className = "",
  sizeClass = "h-11 w-11 text-xl",
  onClick,
  ariaLabel = "פרופיל שחקן",
}) {
  const shell = `flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-sky-200 bg-white shadow-sm ${sizeClass} ${className}`;
  const interactive =
    "cursor-pointer transition hover:ring-2 hover:ring-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";

  const content = avatarCustomDataUrl ? (
    <img src={avatarCustomDataUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    <span>{avatarEmoji || "👤"}</span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${shell} ${interactive}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={shell} aria-hidden="true">
      {content}
    </div>
  );
}
