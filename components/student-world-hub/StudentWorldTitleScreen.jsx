import { useState } from "react";
import StudentLearningAvatar from "../arcade/club/StudentLearningAvatar.jsx";
import StudentCopyLeoNumberChip from "../student/StudentCopyLeoNumberChip.jsx";
import StudentShareFriendsButton from "../student/StudentShareFriendsButton.jsx";
import StudentParentInviteModal from "../student/StudentParentInviteModal.jsx";
import StudentWorldScene from "./StudentWorldScene.jsx";
import StudentWorldGates from "./StudentWorldGates.jsx";
import StudentWorldDock from "./StudentWorldDock.jsx";

const chipBase =
  "rounded-lg border px-2.5 py-1.5 shadow-sm backdrop-blur-[6px]";

const chipGreeting = `${chipBase} border-emerald-200/55 bg-emerald-50/80`;
const chipCoins = `${chipBase} border-amber-200/60 bg-amber-100/75`;
const chipDiamonds = `${chipBase} border-sky-200/60 bg-sky-100/75`;
const chipLeoId = `${chipBase} border-violet-200/55 bg-violet-50/80 text-violet-900`;
const chipParentInvite = `${chipBase} border-amber-200/55 bg-amber-50/80 text-amber-900 hover:bg-amber-100/85 transition`;
const chipLogout = `${chipBase} border-rose-200/60 bg-rose-100/75 hover:bg-rose-200/65`;

const leoRowBottomClass =
  "bottom-[calc(2.75rem+1.75rem+0.625rem+env(safe-area-inset-bottom,0px))]";

const heroGreetingText = "font-extrabold text-[#F97316] drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]";
const heroPromptText =
  "font-semibold text-[#0F766E] drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)] md:font-bold";

/**
 * @param {{
 *   greetingHe: string,
 *   promptHe?: string,
 *   coinsDisplay: string,
 *   diamondsDisplay?: string,
 *   leoNumber?: string,
 *   leoNumberLabelHe?: string,
 *   avatarEmoji: string,
 *   avatarImage?: string | null,
 *   avatarBackgroundKey?: string,
 *   guestLockedPanelSet?: Set<string>,
 *   lockMessage?: string,
 *   logoutBusy?: boolean,
 *   onOpenPanel?: (panelId: string) => void,
 *   onOpenAvatar?: () => void,
 *   onLogout?: () => void,
 *   onLockedTap?: (message: string) => void,
 *   onSurpriseOpen?: () => void,
 *   surpriseOpeningLocked?: boolean,
 *   surpriseRefreshToken?: number,
 *   surpriseStatusOverride?: { ready?: boolean, pendingBoxCount?: number } | null,
 *   showParentInvite?: boolean,
 * }} props
 */
export default function StudentWorldTitleScreen({
  greetingHe,
  promptHe = "מה עושים היום?",
  coinsDisplay,
  diamondsDisplay = "-",
  leoNumber = "",
  leoNumberLabelHe = "",
  avatarEmoji,
  avatarImage = null,
  avatarBackgroundKey = "sky",
  guestLockedPanelSet = new Set(),
  lockMessage = "",
  logoutBusy = false,
  onOpenPanel,
  onOpenAvatar,
  onLogout,
  onLockedTap,
  onSurpriseOpen,
  surpriseOpeningLocked = false,
  surpriseRefreshToken = 0,
  surpriseStatusOverride = null,
  showParentInvite = false,
}) {
  const [parentInviteOpen, setParentInviteOpen] = useState(false);

  const coinsLogout = (
    <div className="flex items-center gap-1.5">
      <div
        className={`${chipCoins} flex items-center gap-1 text-xs font-bold text-amber-900`}
        data-testid="student-world-home-coins"
      >
        <span aria-hidden>🪙</span>
        <span>{coinsDisplay}</span>
      </div>
      <div
        className={`${chipDiamonds} flex items-center gap-1 text-xs font-bold text-sky-900`}
        data-testid="student-world-home-diamonds"
      >
        <span aria-hidden>💎</span>
        <span>{diamondsDisplay}</span>
      </div>
      <button
        type="button"
        disabled={logoutBusy}
        onClick={() => onLogout?.()}
        className={`${chipLogout} text-[11px] font-semibold text-rose-800`}
        data-testid="student-world-home-logout"
      >
        {logoutBusy ? "יוצאים…" : "התנתקות"}
      </button>
    </div>
  );

  const mobileAvatarNode = (
    <div className="relative shrink-0" data-testid="student-world-home-avatar">
      <StudentLearningAvatar
        avatarEmoji={avatarEmoji}
        avatarCustomDataUrl={avatarImage || ""}
        avatarBackgroundKey={avatarBackgroundKey}
        onClick={onOpenAvatar}
        sizeClass="h-24 w-24 text-5xl border-2 border-white/80 shadow-md sm:h-[6.5rem] sm:w-[6.5rem] sm:text-[3.25rem]"
        ariaLabel="פתח את הפרופיל שלי"
      />
      <span className="pointer-events-none absolute -bottom-1 -left-2 text-3xl" aria-hidden>
        🦊
      </span>
    </div>
  );

  const desktopAvatarNode = (
    <div className="relative shrink-0" data-testid="student-world-home-avatar">
      <StudentLearningAvatar
        avatarEmoji={avatarEmoji}
        avatarCustomDataUrl={avatarImage || ""}
        avatarBackgroundKey={avatarBackgroundKey}
        onClick={onOpenAvatar}
        sizeClass="h-[6rem] w-[6rem] text-4xl border-2 border-sky-200 bg-white shadow-lg lg:h-[6.5rem] lg:w-[6.5rem] lg:text-5xl"
        ariaLabel="פתח את הפרופיל שלי"
      />
      <span className="pointer-events-none absolute -bottom-1 -left-2 text-3xl lg:text-4xl" aria-hidden>
        🦊
      </span>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <StudentWorldScene>
        <div
          className="relative flex h-full min-h-0 flex-1 flex-col"
          dir="rtl"
          data-testid="student-world-title-screen"
        >
        <header className="absolute inset-x-0 top-0 z-20 hidden items-start justify-between gap-2 p-3 md:flex md:p-4">
          <h1
            className={`${chipGreeting} max-w-[14rem] text-sm font-extrabold text-violet-900`}
            data-testid="student-world-home-greeting"
          >
            {greetingHe}
          </h1>
          {coinsLogout}
        </header>

        <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 md:hidden">
          <span
            className={`${chipGreeting} max-w-[10rem] truncate text-xs font-extrabold text-violet-900`}
            data-testid="student-world-home-greeting"
          >
            {greetingHe}
          </span>
          {coinsLogout}
        </header>

        {/* Desktop: תמונת פרופיל */}
        <div className="hidden flex-col items-center px-3 pt-10 text-center md:flex">
          <div className="relative">
            {desktopAvatarNode}
            <div className="absolute left-1/2 top-full mt-4 w-max max-w-[90vw] -translate-x-1/2 text-center">
              <p className={`text-lg lg:text-xl ${heroGreetingText}`}>
                {greetingHe}
              </p>
              <p className={`mt-1 text-base lg:text-lg ${heroPromptText}`}>
                {promptHe}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col items-center gap-1.5 px-3 pt-[min(14vh,6rem)] text-center -translate-y-10 md:hidden">
            {mobileAvatarNode}
            <p className={`text-xl sm:text-2xl ${heroGreetingText}`}>
              {greetingHe}
            </p>
            <p className={`text-lg sm:text-xl ${heroPromptText}`}>
              {promptHe}
            </p>
          </div>

          <div className="mt-auto flex w-full flex-col items-center gap-2 px-3 pb-[100px] pt-3 md:mt-0 md:flex-1 md:justify-center md:pb-20 md:pt-24 md:-translate-y-6">
            <StudentWorldGates />
            <StudentWorldDock
              guestLockedPanelSet={guestLockedPanelSet}
              lockMessage={lockMessage}
              onOpenPanel={onOpenPanel}
              onOpenAvatar={onOpenAvatar}
              onLockedTap={onLockedTap}
              onSurpriseOpen={onSurpriseOpen}
              surpriseOpeningLocked={surpriseOpeningLocked}
              surpriseRefreshToken={surpriseRefreshToken}
              surpriseStatusOverride={surpriseStatusOverride}
            />
          </div>
        </div>

        {leoNumberLabelHe ? (
          <div
            className={`absolute left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center justify-center gap-2 ${leoRowBottomClass}`}
          >
            <StudentShareFriendsButton variant="chip" label="שתף" />
            <StudentCopyLeoNumberChip
              leoNumber={leoNumber}
              label={leoNumberLabelHe}
              className={`${chipLeoId} whitespace-nowrap text-xs font-semibold transition hover:bg-violet-100/85`}
            />
            {showParentInvite ? (
              <button
                type="button"
                className={`${chipParentInvite} whitespace-nowrap text-xs font-semibold`}
                onClick={() => setParentInviteOpen(true)}
                data-testid="student-parent-invite-open"
              >
                הודעה להורה
              </button>
            ) : null}
          </div>
        ) : null}

        <StudentParentInviteModal open={parentInviteOpen} onClose={() => setParentInviteOpen(false)} />
      </div>
    </StudentWorldScene>
    </div>
  );
}
