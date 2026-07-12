import { formatMathHudNumber } from "../../utils/math-master-hud-number.client.js";

const HUD_GRID =
  "mx-auto grid grid-cols-8 gap-0.5 md:gap-1 lg:gap-1.5 mb-3 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl";

import StudentLearningAvatar from "../arcade/club/StudentLearningAvatar.jsx";

function HudCell({ MB, label, valueClass, children }) {
  return (
    <div className={MB.hudCell}>
      <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
        <div className={MB.hudLabel}>{label}</div>
      </div>
      <div className="flex flex-1 items-center justify-center min-h-0">
        <div className={valueClass} dir="ltr">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Shared 8-cell HUD row for all learning masters — matches math-master pilot.
 */
export default function LearningMasterHud({
  MB,
  controlsRef,
  topHud,
  lives,
  mode,
  gameActive,
  timeLeft,
  timerModes = ["challenge", "speed"],
  onAvatarClick,
  playerAvatar,
  playerAvatarImage,
  playerAvatarBackground = "sky",
  formatValue = formatMathHudNumber,
  className = "",
}) {
  const timerActive =
    gameActive && timerModes.includes(mode);
  const timerUrgent = timerActive && timeLeft <= 5;

  return (
    <div ref={controlsRef} className={`${HUD_GRID} ${className}`.trim()}>
      <HudCell MB={MB} label="ניקוד" valueClass={MB.hudValueScore}>
        {formatValue(topHud.score)}
      </HudCell>
      <HudCell MB={MB} label="רצף" valueClass={MB.hudValueStreak}>
        {formatValue(topHud.streak)}
      </HudCell>
      <HudCell MB={MB} label="כוכבים" valueClass={MB.hudValueStars}>
        {formatValue(topHud.stars)}
      </HudCell>
      <HudCell MB={MB} label="רמה" valueClass={MB.hudValueLevel}>
        {formatValue(topHud.level)}
      </HudCell>
      <HudCell MB={MB} label="✅" valueClass={MB.hudValueCorrect}>
        {formatValue(topHud.correct)}
      </HudCell>
      <HudCell MB={MB} label="חיים" valueClass={MB.hudValueLives}>
        {mode === "challenge" ? `${formatValue(lives)} ❤️` : "∞"}
      </HudCell>
      <div
        className={`rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] ${
          timerUrgent ? MB.hudTimerUrgent : MB.hudTimerNormal
        }`}
      >
        <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
          <div className={MB.hudLabel}>טיימר</div>
        </div>
        <div className="flex flex-1 items-center justify-center min-h-0">
          <div
            className={
              timerUrgent
                ? MB.hudTimerValueUrgent
                : timerActive
                  ? MB.hudTimerValueActive
                  : MB.hudTimerValueNormal
            }
          >
            {gameActive ? (timerActive ? (timeLeft ?? "--") : "∞") : "--"}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onAvatarClick}
        className={MB.hudAvatarBtn}
        title="פרופיל שחקן"
      >
        <div className="flex shrink-0 items-center justify-center mb-0.5 md:mb-1 md:min-h-[26px] lg:min-h-[28px] px-0.5">
          <div className={MB.hudLabel}>אווטר</div>
        </div>
        <div className="flex flex-1 items-center justify-center min-h-0">
          <StudentLearningAvatar
            avatarEmoji={playerAvatar}
            avatarCustomDataUrl={playerAvatarImage || ""}
            avatarBackgroundKey={playerAvatarBackground}
            sizeClass="h-6 w-6 text-sm md:h-7 md:w-7 md:text-base lg:h-8 lg:w-8 lg:text-lg"
            className="mx-auto"
          />
        </div>
      </button>
    </div>
  );
}
